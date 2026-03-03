import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { NativeModules, Platform } from 'react-native';

export default function RootLayout() {
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
