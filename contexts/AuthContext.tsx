import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Profile, Upload, ReceivedCat, Delivery } from '../types';
import { Session } from '@supabase/supabase-js';
import { registerForPushNotifications } from '../lib/notifications';

export interface IncomingCat {
  id: number;
  image_url: string;
  from_user?: string;
  nyongName?: string;
}

export interface PendingNotification {
  catId: string;
  catImage: string;
}

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isTestMode: boolean;
  testUploads: Upload[];
  incomingCat: IncomingCat | null;
  pendingNotification: PendingNotification | null;
  testReceivedCats: ReceivedCat[];
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setTestMode: (enabled: boolean) => Promise<void>;
  addTestUpload: (upload: Upload) => void;
  sendTestNotification: () => void;
  clearIncomingCat: () => void;
  clearPendingNotification: () => void;
  pendingOpenNyongId: number | null;
  setPendingOpenNyongId: (id: number | null) => void;
  addReceivedCat: (catId: number, imageUrl: string, hits: number) => void;
  checkPendingDeliveries: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TEST_ADMIN_PROFILE: Profile = {
  id: '00000000-0000-0000-0000-000000000000',  // Valid UUID format for test mode
  nickname: '관리자',
  use_exclusion: true,
  exclusion_start: '00:00',
  exclusion_end: '06:00',
  is_admin: true,
  created_at: new Date().toISOString(),
  push_token: null,
  nyong_points: 0,
};

const TEST_CAT_IMAGES = [
  'https://placekitten.com/400/400',
  'https://placekitten.com/401/401',
  'https://placekitten.com/402/402',
  'https://placekitten.com/403/403',
  'https://placekitten.com/404/404',
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTestMode, setIsTestMode] = useState(false);
  const [testUploads, setTestUploads] = useState<Upload[]>([]);
  const [incomingCat, setIncomingCat] = useState<IncomingCat | null>(null);
  const [pendingNotification, setPendingNotification] = useState<PendingNotification | null>(null);
  const [testReceivedCats, setTestReceivedCats] = useState<ReceivedCat[]>([]);
  const [pendingOpenNyongId, setPendingOpenNyongId] = useState<number | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return null;
    }
    return data as Profile;
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      const profileData = await fetchProfile(session.user.id);
      setProfile(profileData);
    }
  };

  // 앱 실행 시 놓친 알림 확인 (서버에서 이미 delivered 상태로 배송됨)
  const checkPendingDeliveries = async () => {
    if (!session?.user?.id || isTestMode) return;

    // 내게 배송됐지만 아직 확인하지 않은 오늘 배달만 알림 (과거 배달은 갤러리에서 잠금으로 표시)
    const todayKst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
    const todayStart = new Date(`${todayKst}T00:00:00+09:00`).toISOString();
    const { data: unreadDeliveries } = await supabase
      .from('deliveries')
      .select('*, upload:uploads(*, nyong:nyongs(name))')
      .eq('receiver_id', session.user.id)
      .eq('status', 'delivered')
      .is('received_at', null)
      .gte('delivered_at', todayStart)
      .order('delivered_at', { ascending: false })
      .limit(1);

    if (!unreadDeliveries || unreadDeliveries.length === 0) {
      return;
    }

    const delivery = unreadDeliveries[0];
    const uploadData = delivery.upload;

    // 인앱 알림 표시
    setIncomingCat({
      id: delivery.id,
      image_url: uploadData?.image_url || '',
      from_user: '익명의 집사',
      nyongName: uploadData?.nyong?.name || undefined,
    });
  };

  useEffect(() => {
    // 안전장치: 10초 후에도 onAuthStateChange가 안 불리면 로컬 세션 초기화
    const loadingTimeout = setTimeout(() => {
      setSession(null);
      setProfile(null);
      setIsLoading(false);
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        clearTimeout(loadingTimeout);
        setSession(session);
        setIsLoading(false);

        if (session?.user?.id) {
          // setTimeout(0)으로 콜백을 즉시 반환 → initializePromise 해결 후 실행
          // onAuthStateChange 콜백 안에서 supabase 쿼리 시 getSession() → await initializePromise 데드락 발생
          const userId = session.user.id;
          setTimeout(async () => {
            try {
              let profileData = await fetchProfile(userId);

              // 프로필이 없으면 기본 프로필 생성 (Google 로그인 첫 진입 등)
              if (!profileData) {
                await supabase.from('profiles').upsert({
                  id: userId,
                  nickname: '뇽집사',
                  use_exclusion: true,
                  exclusion_start: '00:00',
                  exclusion_end: '06:00',
                  is_admin: false,
                });
                profileData = await fetchProfile(userId);
              }

              setProfile(profileData);
              registerForPushNotifications(userId);
            } catch {
              setProfile(null);
            }
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // 웹이 아닐 때만 알림 리스너 등록
    if (Platform.OS !== 'web') {
      try {
        // 알림 수신 리스너 (앱이 포그라운드일 때)
        notificationListener.current = Notifications.addNotificationReceivedListener(
          (notification) => {
            const data = notification.request.content.data;
            // FCM(Android)은 data 값을 문자열로 변환 → != null 체크
            if (data?.deliveryId != null && data?.imageUrl) {
              setIncomingCat({
                id: Number(data.deliveryId),
                image_url: String(data.imageUrl),
                from_user: '익명의 집사',
                nyongName: data.nyongName ? String(data.nyongName) : undefined,
              });
            }
          }
        );

        // 알림 탭 리스너 (백그라운드에서 알림 클릭 시)
        responseListener.current = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            const data = response.notification.request.content.data;
            // FCM(Android)은 data 값을 문자열로 변환 → != null 체크
            if (data?.deliveryId != null && data?.imageUrl) {
              router.push({
                pathname: '/notification',
                params: {
                  catId: String(data.deliveryId),
                  catImage: encodeURIComponent(String(data.imageUrl)),
                },
              });
            }
          }
        );

        // 앱이 완전히 종료된 상태에서 알림 탭으로 실행된 경우
        // router.push를 여기서 직접 호출하면 네비게이터가 아직 준비 안 됨
        // → pendingNotification state에 저장, index.tsx에서 마운트 후 네비게이션
        Notifications.getLastNotificationResponseAsync().then((response) => {
          if (response) {
            const data = response.notification.request.content.data;
            // FCM(Android)은 data 값을 문자열로 변환 → != null 체크
            if (data?.deliveryId != null && data?.imageUrl) {
              setPendingNotification({
                catId: String(data.deliveryId),
                catImage: encodeURIComponent(String(data.imageUrl)),
              });
            }
          }
        });
      } catch (error) {
        // Expo Go에서 푸시 알림 미지원 (SDK 53+)
      }
    }

    // 앱이 백그라운드→포그라운드 복귀 시 세션 갱신
    const appStateListener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
      notificationListener.current?.remove();
      responseListener.current?.remove();
      appStateListener.remove();
    };
  }, []);

  const signOut = async () => {
    if (isTestMode) {
      setIsTestMode(false);
      setProfile(null);
      return;
    }
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const deleteAccount = async () => {
    await supabase.rpc('delete_account');
    setSession(null);
    setProfile(null);
  };

  const setTestMode = async (enabled: boolean) => {
    setIsTestMode(enabled);
    if (enabled) {
      // 테스트 모드에서도 푸시 토큰 등록 시도
      let pushToken: string | null = null;
      try {
        // 테스트 모드용 토큰 등록 (DB 저장 없이 토큰만 가져오기)
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus === 'granted' && Platform.OS !== 'web') {
          const Constants = require('expo-constants').default;
          const projectId = Constants.expoConfig?.extra?.eas?.projectId;
          pushToken = (await Notifications.getExpoPushTokenAsync({
            projectId: projectId ?? undefined
          })).data;
        }
      } catch (error) {
        // silent
      }

      setProfile({
        ...TEST_ADMIN_PROFILE,
        push_token: pushToken,
      });
      setIsLoading(false);
    } else {
      setProfile(null);
      setTestUploads([]);
    }
  };

  const addTestUpload = (upload: Upload) => {
    setTestUploads((prev) => [upload, ...prev]);
  };

  const sendTestNotification = () => {
    const randomImage = TEST_CAT_IMAGES[Math.floor(Math.random() * TEST_CAT_IMAGES.length)];
    setIncomingCat({
      id: Date.now(),
      image_url: randomImage,
      from_user: '익명의 집사',
    });
  };

  const clearIncomingCat = () => {
    setIncomingCat(null);
  };

  const clearPendingNotification = () => {
    setPendingNotification(null);
  };

  const addReceivedCat = (catId: number, imageUrl: string, hits: number) => {
    const newReceivedCat: ReceivedCat = {
      id: Date.now(),
      user_id: '00000000-0000-0000-0000-000000000000',
      cat_id: catId,
      hits,
      received_at: new Date().toISOString(),
      cat: {
        id: catId,
        image_url: imageUrl,
        deployed_at: new Date().toISOString(),
        distributed_count: 1,
        total_hits: hits,
        is_active: true,
      },
    };
    setTestReceivedCats((prev) => [newReceivedCat, ...prev]);
  };

  // 로그인 후 대기열 체크
  useEffect(() => {
    if (session?.user?.id && profile && !isTestMode) {
      checkPendingDeliveries();
    }
  }, [session?.user?.id, profile, isTestMode]);

  return (
    <AuthContext.Provider value={{
      session,
      profile,
      isLoading,
      isTestMode,
      testUploads,
      incomingCat,
      pendingNotification,
      testReceivedCats,
      signOut,
      deleteAccount,
      refreshProfile,
      setTestMode,
      addTestUpload,
      sendTestNotification,
      clearIncomingCat,
      clearPendingNotification,
      pendingOpenNyongId,
      setPendingOpenNyongId,
      addReceivedCat,
      checkPendingDeliveries,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
