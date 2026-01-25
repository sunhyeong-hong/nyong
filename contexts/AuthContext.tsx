import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Profile, Upload, ReceivedCat } from '../types';
import { Session } from '@supabase/supabase-js';

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        fetchProfile(session.user.id).then(setProfile);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user?.id) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        } else {
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
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
