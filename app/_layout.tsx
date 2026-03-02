import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { NativeModules } from 'react-native';

export default function RootLayout() {
  useEffect(() => {
    if (NativeModules.RNGoogleMobileAdsModule) {
      const { default: MobileAds, MaxAdContentRating } = require('react-native-google-mobile-ads');
      MobileAds()
        .setRequestConfiguration({
          maxAdContentRating: MaxAdContentRating.T,
        })
        .then(() => MobileAds().initialize())
        .catch(() => {});
    }
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
