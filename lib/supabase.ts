import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// SecureStore는 2048바이트 초과 시 저장 실패
// → 초과하면 청크로 분할 저장 (세션 JWT 토큰이 2048바이트 초과하는 경우 많음)
const CHUNK_SIZE = 1800; // 여유있게 1800바이트씩

async function secureStoreGet(key: string): Promise<string | null> {
  const chunkCount = await SecureStore.getItemAsync(`${key}__chunks`);
  if (chunkCount) {
    // 청크로 분할 저장된 값 조합
    const n = parseInt(chunkCount, 10);
    let result = '';
    for (let i = 0; i < n; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}__${i}`);
      if (chunk == null) return null;
      result += chunk;
    }
    return result;
  }
  return SecureStore.getItemAsync(key);
}

async function secureStoreSet(key: string, value: string): Promise<void> {
  if (value.length <= CHUNK_SIZE) {
    // 기존 청크 잔재 제거
    await SecureStore.deleteItemAsync(`${key}__chunks`);
    await SecureStore.setItemAsync(key, value);
  } else {
    // 기존 단일 값 제거
    await SecureStore.deleteItemAsync(key);
    const chunks = Math.ceil(value.length / CHUNK_SIZE);
    await SecureStore.setItemAsync(`${key}__chunks`, String(chunks));
    for (let i = 0; i < chunks; i++) {
      await SecureStore.setItemAsync(
        `${key}__${i}`,
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      );
    }
  }
}

async function secureStoreRemove(key: string): Promise<void> {
  const chunkCount = await SecureStore.getItemAsync(`${key}__chunks`);
  if (chunkCount) {
    const n = parseInt(chunkCount, 10);
    for (let i = 0; i < n; i++) {
      await SecureStore.deleteItemAsync(`${key}__${i}`);
    }
    await SecureStore.deleteItemAsync(`${key}__chunks`);
  }
  await SecureStore.deleteItemAsync(key);
}

// supabaseUrl/supabaseAnonKey를 adapter보다 먼저 선언 (preRefreshIfExpired에서 사용)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Supabase _initialize() 전에 만료된 토큰을 미리 갱신
// → _callRefreshToken() hang 원천 차단
// AbortController는 RN에서 fetch를 실제로 중단하지 못하는 경우가 있어
// Promise.race + setTimeout reject 방식으로 5초 타임아웃 구현
async function preRefreshIfExpired(key: string, stored: string): Promise<string | null> {
  let session: any;
  try {
    session = JSON.parse(stored);
  } catch {
    return stored;
  }
  if (!session?.refresh_token || !session?.expires_at) {
    return stored;
  }
  const remaining = session.expires_at * 1000 - Date.now();
  const isExpired = remaining < 30_000;
  if (!isExpired) return stored;

  try {
    const data = await Promise.race<any>([
      (async () => {
        const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({ refresh_token: session.refresh_token }),
        });
        if (!response.ok) throw new Error(`Refresh HTTP ${response.status}`);
        return response.json();
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('pre-refresh timeout')), 5000)
      ),
    ]);

    const newSession = JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      token_type: data.token_type || 'bearer',
      user: data.user ?? session.user,
    });
    await secureStoreSet(key, newSession);
    return newSession;
  } catch (error) {
    const isAuthError =
      error instanceof Error &&
      error.message.startsWith('Refresh HTTP') &&
      parseInt(error.message.replace('Refresh HTTP ', ''), 10) >= 400;
    if (isAuthError) {
      await secureStoreRemove(key);
      return null;
    }
    return stored;
  }
}

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return Promise.resolve(localStorage.getItem(key));
    }
    const stored = await secureStoreGet(key);
    if (!stored) return null;
    if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
      return preRefreshIfExpired(key, stored);
    }
    return stored;
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return secureStoreSet(key, value);
  },
  removeItem: (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return Promise.resolve();
    }
    return secureStoreRemove(key);
  },
};

// AbortController는 RN에서 TCP 연결을 실제로 끊지 못함
// → Promise.race + setTimeout reject 방식이 더 신뢰성 있음
// auth 토큰 갱신은 preRefreshIfExpired에서 별도 처리
// 이 타임아웃은 PostgREST 쿼리 hang 방지용
const fetchWithTimeout = (url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> =>
  Promise.race<Response>([
    fetch(url as RequestInfo, options),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('supabase fetch timeout')), 10000)
    ),
  ]);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: fetchWithTimeout,
  },
});
