import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../lib/theme';
import { t, format } from '../lib/i18n';

interface NotificationBannerProps {
  visible: boolean;
  catImage: string;
  nickname?: string;
  nyongName?: string;
  onPress: () => void;
  onDismiss: () => void;
}

export function NotificationBanner({
  visible,
  catImage,
  nickname,
  nyongName,
  onPress,
  onDismiss,
}: NotificationBannerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-150)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(translateY, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.banner}
        activeOpacity={0.9}
        onPress={onPress}
      >
        <Image source={{ uri: catImage }} style={styles.thumbnail} />
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {nickname && nyongName
              ? format(t().push.title, { nickname, nyongName })
              : t().banner.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {nyongName
              ? format(t().push.body, { nyongName })
              : t().banner.subtitle}
          </Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
          <Text style={styles.closeText} maxFontSizeMultiplier={1.0}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  subtitle: {
    fontSize: 13,
    color: colors.whiteSubtle,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.whiteOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 20,
    color: colors.white,
    fontWeight: '500',
    marginTop: -1,
  },
});
