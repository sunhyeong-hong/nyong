import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { Profile, Upload, ReceivedCat, Delivery } from '../types';
import { Session } from '@supabase/supabase-js';
import { registerForPushNotifications } from '../lib/notifications';

export interface IncomingCat {
  id: number;
  image_url: string;
  from_user?: string;
}

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isTestMode: boolean;
  testUploads: Upload[];
  incomingCat: IncomingCat | null;
  testReceivedCats: ReceivedCat[];
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setTestMode: (enabled: boolean) => void;
  addTestUpload: (upload: Upload) => void;
  sendTestNotification: () => void;
  clearIncomingCat: () => void;
  addReceivedCat: (catId: number, imageUrl: string, hits: number) => void;
  checkPendingDeliveries: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TEST_ADMIN_PROFILE: Profile = {
  id: 'test-admin-id',
  nickname: '관리자',
  use_exclusion: false,
  exclusion_start: '00:00',
  exclusion_end: '08:00',
  is_admin: true,
  created_at: new Date().toISOString(),
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
  const [testReceivedCats, setTestReceivedCats] = useState<ReceivedCat[]>([]);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.log('Profile fetch error:', error);
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
    console.log('=== checkPendingDeliveries START ===');
    console.log('session?.user?.id:', session?.user?.id);
    console.log('isTestMode:', isTestMode);

    if (!session?.user?.id || isTestMode) return;

    // 내게 배송됐지만 아직 확인하지 않은 알림 찾기
    const { data: unreadDeliveries } = await supabase
      .from('deliveries')
      .select('*, upload:uploads(*)')
      .eq('receiver_id', session.user.id)
      .eq('status', 'delivered')
      .is('received_at', null)
      .order('delivered_at', { ascending: false })
      .limit(1);

    console.log('unread deliveries found:', unreadDeliveries?.length);

    if (!unreadDeliveries || unreadDeliveries.length === 0) {
      console.log('No unread deliveries, returning');
      return;
    }

    const delivery = unreadDeliveries[0];
    const uploadData = delivery.upload;

    console.log('=== Found unread delivery ===');
    console.log('delivery.id:', delivery.id);
    console.log('image_url:', uploadData?.image_url);

    // 인앱 알림 표시
    setIncomingCat({
      id: delivery.id,
      image_url: uploadData?.image_url || '',
      from_user: '익명의 집사',
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        fetchProfile(session.user.id).then(setProfile);
        // 푸시 토큰 등록
        registerForPushNotifications(session.user.id);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user?.id) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
          // 푸시 토큰 등록
          registerForPushNotifications(session.user.id);
        } else {
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    // 웹이 아닐 때만 알림 리스너 등록
    if (Platform.OS !== 'web') {
      // 알림 수신 리스너 (앱이 포그라운드일 때)
      notificationListener.current = Notifications.addNotificationReceivedListener(
        (notification) => {
          const data = notification.request.content.data;
          if (data?.deliveryId && data?.imageUrl) {
            setIncomingCat({
              id: data.deliveryId as number,
              image_url: data.imageUrl as string,
              from_user: '익명의 집사',
            });
          }
        }
      );

      // 알림 탭 리스너 (백그라운드에서 알림 클릭 시)
      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data = response.notification.request.content.data;
          if (data?.deliveryId && data?.imageUrl) {
            setIncomingCat({
              id: data.deliveryId as number,
              image_url: data.imageUrl as string,
              from_user: '익명의 집사',
            });
          }
        }
      );
    }

    return () => {
      subscription.unsubscribe();
      notificationListener.current?.remove();
      responseListener.current?.remove();
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

  const setTestMode = (enabled: boolean) => {
    setIsTestMode(enabled);
    if (enabled) {
      setProfile(TEST_ADMIN_PROFILE);
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

  const addReceivedCat = (catId: number, imageUrl: string, hits: number) => {
    const newReceivedCat: ReceivedCat = {
      id: Date.now(),
      user_id: 'test-admin-id',
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
      testReceivedCats,
      signOut,
      refreshProfile,
      setTestMode,
      addTestUpload,
      sendTestNotification,
      clearIncomingCat,
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
