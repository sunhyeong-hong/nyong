import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Linking, Modal, NativeModules, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const [needsUpdate, setNeedsUpdate] = useState(false);

  useEffect(() => {
    // Android: app_config.min_android_version_code 와 현재 versionCode 비교
    // iOS: 앱스토어 정식 출시 후 App Store ID 확보 시 min_ios_build_number 컬럼 추가 + itms-apps 링크로 동일하게 구현
    if (Platform.OS === 'android') {
      supabase
        .from('app_config')
        .select('min_android_version_code')
        .single()
        .then(({ data }) => {
          if (!data) return;
          const current = Constants.expoConfig?.android?.versionCode ?? 0;
          if (current < data.min_android_version_code) {
            setNeedsUpdate(true);
          }
        });
    }
  }, []);

  useEffect(() => {
    const initAds = async () => {
      // iOS: ATT 권한 요청 (광고 추적 허용)
      if (Platform.OS === 'ios') {
        try {
          const { requestTrackingPermissionsAsync } = require('expo-tracking-transparency');
          await requestTrackingPermissionsAsync();
        } catch {}
      }

      if (NativeModules.RNGoogleMobileAdsModule) {
        const { default: MobileAds, MaxAdContentRating } = require('react-native-google-mobile-ads');
        await MobileAds()
          .setRequestConfiguration({
            maxAdContentRating: MaxAdContentRating.T,
          });
        await MobileAds().initialize();
      }
    };
    initAds().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <Modal visible={needsUpdate} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.emoji}>🐱</Text>
            <Text style={styles.title}>업데이트가 필요해요</Text>
            <Text style={styles.desc}>더 나은 뇽파민을 위해{'\n'}최신 버전으로 업데이트해 주세요!</Text>
            <TouchableOpacity style={styles.button} onPress={() => Linking.openURL('market://details?id=com.nyong.app')}>
              <Text style={styles.buttonText}>업데이트하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="notification"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal'
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            presentation: 'modal'
          }}
        />
        <Stack.Screen
          name="nickname-setup"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: true,
            title: '설정',
            presentation: 'modal'
          }}
        />
        <Stack.Screen
          name="nyong-id-card"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="admin"
          options={{
            headerShown: true,
            title: '관리자',
          }}
        />
      </Stack>
      </AuthProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  desc: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#E88B99',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
