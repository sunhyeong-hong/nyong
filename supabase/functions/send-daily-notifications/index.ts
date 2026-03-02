// Supabase Edge Function: 매 시간 실행되어 랜덤 사용자에게 푸시 알림 발송
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface Profile {
  id: string;
  push_token: string;
  nickname: string;
  use_exclusion: boolean;
  exclusion_start: string;
  exclusion_end: string;
  last_receive_date: string | null;
}

interface Upload {
  id: number;
  user_id: string;
  image_url: string;
  tag: string | null;
  nyong_id: number | null;
  nyong?: { name: string } | null;
}

Deno.serve(async (req) => {
  try {
    // CORS 처리
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // KST 기준 오늘 날짜 및 시간 계산
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const today = kstNow.toISOString().split('T')[0]; // KST YYYY-MM-DD
    const currentHour = kstNow.getUTCHours();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${kstNow.getUTCMinutes().toString().padStart(2, '0')}`;

    console.log(`[${new Date().toISOString()}] Starting notification job for ${today} (KST), current time: ${currentTime}`);

    // 1. 어제 업로드된 이미지 풀 가져오기 (KST 기준)
    // 어제 업로드된 사진을 오늘 배달 → 업로드 시간 관계없이 균등하게 배달 기회 부여
    const yesterday = new Date(kstNow.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const yesterdayStart = new Date(`${yesterday}T00:00:00+09:00`).toISOString();
    const yesterdayEnd = new Date(`${yesterday}T23:59:59.999+09:00`).toISOString();

    const { data: uploads, error: uploadsError } = await supabase
      .from('uploads')
      .select('id, user_id, image_url, tag, nyong_id, nyong:nyongs(name)')
      .gte('uploaded_at', yesterdayStart)
      .lte('uploaded_at', yesterdayEnd);

    if (uploadsError) {
      console.error('Error fetching uploads:', uploadsError);
      throw uploadsError;
    }

    if (!uploads || uploads.length === 0) {
      console.log('No uploads yesterday, skipping');
      return new Response(JSON.stringify({ message: 'No uploads yesterday' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${uploads.length} uploads from yesterday (${yesterday})`);

    // 2. 아직 오늘 알림을 받지 않은 사용자 찾기
    const { data: eligibleUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, push_token, nickname, use_exclusion, exclusion_start, exclusion_end, last_receive_date')
      .not('push_token', 'is', null);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    // 오늘 이미 배달된 수신자 목록 (deliveries 테이블 기준 — last_receive_date보다 신뢰성 높음)
    const todayStart = new Date(`${today}T00:00:00+09:00`).toISOString();
    const { data: todayDeliveries } = await supabase
      .from('deliveries')
      .select('receiver_id')
      .gte('delivered_at', todayStart);

    const alreadyDeliveredToday = new Set(
      (todayDeliveries || []).map((d: { receiver_id: string }) => d.receiver_id)
    );

    // 오늘 받지 않은 사용자만 필터링
    const usersToNotify = (eligibleUsers as Profile[]).filter((user) => {
      // 이미 오늘 받았으면 제외 (deliveries 테이블 기준)
      if (alreadyDeliveredToday.has(user.id)) return false;

      // 방해금지 시간 체크
      if (user.use_exclusion) {
        if (isInExclusionTime(currentTime, user.exclusion_start, user.exclusion_end)) {
          return false;
        }
      }

      return true;
    });

    console.log(`Found ${usersToNotify.length} eligible users`);

    if (usersToNotify.length === 0) {
      return new Response(JSON.stringify({ message: 'No eligible users' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. 이번 시간에 알림 보낼 사용자 랜덤 선택
    // 시간대별 확률 조정: 출퇴근 시간 높음, 하루 끝나기 전 모두 발송
    // 방해금지 시간은 사용자별로 이미 필터링됨 (usersToNotify에서 제외)
    const hour = currentHour; // KST (already calculated above)
    let notifyProbability: number;

    if (hour >= 23) {
      // 밤 11시 이후: 오늘 못 받은 사용자 전부 발송 (당일 수신 보장)
      notifyProbability = 1.0;
    } else if (hour >= 8 && hour < 10) {
      // 출근 시간 (오전 8-10시): 25% 확률 ⭐
      notifyProbability = 0.25;
    } else if (hour >= 10 && hour < 17) {
      // 낮 시간 (오전 10시~오후 5시): 25% 확률
      notifyProbability = 0.25;
    } else if (hour >= 17 && hour < 19) {
      // 퇴근 시간 (오후 5-7시): 25% 확률 ⭐
      notifyProbability = 0.25;
    } else if (hour >= 19 && hour < 23) {
      // 저녁~밤 (오후 7-11시): 15% 확률
      notifyProbability = 0.15;
    } else {
      // 새벽 (오전 0시~8시): 5% 확률
      notifyProbability = 0.05;
    }

    console.log(`Hour: ${hour}, Notify probability: ${notifyProbability}`);
    const selectedUsers = usersToNotify.filter(() => Math.random() < notifyProbability);

    console.log(`Selected ${selectedUsers.length} users to notify this hour`);

    const results = [];

    // 4. 각 사용자에게 알림 발송
    for (const user of selectedUsers) {
      // 자신이 올린 것 제외한 업로드 중 랜덤 선택
      const availableUploads = uploads.filter((u) => u.user_id !== user.id);

      if (availableUploads.length === 0) {
        console.log(`No available uploads for user ${user.id}`);
        continue;
      }

      const selectedUpload = availableUploads[Math.floor(Math.random() * availableUploads.length)];

      // 배송 기록 생성
      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .insert({
          upload_id: selectedUpload.id,
          sender_id: selectedUpload.user_id,
          receiver_id: user.id,
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (deliveryError) {
        console.error(`Error creating delivery for user ${user.id}:`, deliveryError);
        continue;
      }

      // 사용자의 last_receive_date 업데이트
      await supabase
        .from('profiles')
        .update({ last_receive_date: today })
        .eq('id', user.id);

      // 푸시 알림 발송
      try {
        const nyongName = selectedUpload.nyong?.name || '뇽';
        const pushResult = await sendPushNotification(user.push_token, {
          title: `${user.nickname}님, 오늘은 ${nyongName}에게 간택당했다냥`,
          body: `${nyongName}에게 뇽펀치 하러가기`,
          data: {
            deliveryId: delivery.id,
            imageUrl: selectedUpload.image_url,
            nyongName,
          },
        });

        results.push({
          userId: user.id,
          deliveryId: delivery.id,
          success: pushResult.success,
        });

        console.log(`Sent notification to user ${user.id}, delivery ${delivery.id}`);
      } catch (pushError) {
        console.error(`Push error for user ${user.id}:`, pushError);
        results.push({
          userId: user.id,
          deliveryId: delivery.id,
          success: false,
          error: String(pushError),
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Notifications sent',
        totalEligible: usersToNotify.length,
        selected: selectedUsers.length,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-daily-notifications:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function sendPushNotification(
  pushToken: string,
  notification: { title: string; body: string; data?: Record<string, unknown> }
): Promise<{ success: boolean }> {
  const message = {
    to: pushToken,
    sound: 'default',
    title: notification.title,
    body: notification.body,
    data: notification.data,
  };

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  const result = await response.json();

  if (result.data?.[0]?.status === 'error') {
    throw new Error(result.data[0].message);
  }

  return { success: true };
}

function isInExclusionTime(current: string, start: string, end: string): boolean {
  const currentMinutes = timeToMinutes(current);
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  // 자정을 넘기는 경우 (예: 22:00 ~ 08:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
