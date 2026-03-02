import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    },
  });
} catch (error) {
  // Expo Go에서 알림 핸들러 미지원
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  // 웹에서는 푸시 알림 건너뛰기
  if (Platform.OS === 'web') {
    return null;
  }

  if (!Device.isDevice) {
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: projectId ?? undefined
    })).data;

    if (!token) return null;

    // Save token to Supabase
    await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);

    return token;
  } catch (error: any) {
    // Expo Go에서 푸시 알림 미지원 (SDK 53+)
    return null;
  }
}

interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotification(
  pushToken: string,
  notification: PushNotificationData
): Promise<boolean> {
  const message = {
    to: pushToken,
    sound: 'default',
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    return result.data?.status === 'ok';
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return false;
  }
}

export function isInExclusionTime(
  currentTime: string,
  exclusionStart: string,
  exclusionEnd: string
): boolean {
  const current = timeToMinutes(currentTime);
  const start = timeToMinutes(exclusionStart);
  const end = timeToMinutes(exclusionEnd);

  // Handle overnight exclusion (e.g., 22:00 - 08:00)
  if (start > end) {
    return current >= start || current < end;
  }

  return current >= start && current < end;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
