import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Animated,
  Dimensions,
  GestureResponderEvent,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CatPaw } from '../components/CatPaw';
import { colors, radius } from '../lib/theme';
import { t } from '../lib/i18n';
import { showRewardedAd } from '../lib/ads';

interface PawPrint {
  id: number;
  x: number;
  y: number;
  opacity: Animated.Value;
  scale: Animated.Value;
  rotation: number;
}

const { width } = Dimensions.get('window');
const COUNTDOWN_TIME = 5;

const FALLBACK_CAT_IMAGES = [
  'https://placekitten.com/400/400',
  'https://placekitten.com/401/401',
  'https://placekitten.com/402/402',
];

export default function NotificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ catId?: string; catImage?: string }>();
  const { addReceivedCat, isTestMode, session } = useAuth();

  // catId는 이제 delivery.id로 사용됨
  const deliveryId = params.catId ? parseInt(params.catId, 10) : null;

  // URL 디코딩 후 유효한지 확인
  const decodedUrl = params.catImage ? decodeURIComponent(params.catImage) : null;
  const isValidImageUrl = decodedUrl && decodedUrl.startsWith('http');
  const catImage = isValidImageUrl
    ? decodedUrl
    : FALLBACK_CAT_IMAGES[Math.floor(Math.random() * FALLBACK_CAT_IMAGES.length)];

  // 디버깅용 로그
  console.log('=== Notification Screen Debug ===');
  console.log('params.catImage:', params.catImage);
  console.log('decodedUrl:', decodedUrl);
  console.log('isValidImageUrl:', isValidImageUrl);
  console.log('Final catImage:', catImage);

  const [countdown, setCountdown] = useState(COUNTDOWN_TIME);
  const [hits, setHits] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [pawPrints, setPawPrints] = useState<PawPrint[]>([]);

  // Unlock feature states
  const [isLocked, setIsLocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Extra feature states
  const [extraRemaining, setExtraRemaining] = useState(5);
  const [isLoadingExtra, setIsLoadingExtra] = useState(false);
  const [showExtraButton, setShowExtraButton] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const timerBarAnim = useRef(new Animated.Value(1)).current;
  const catContainerRef = useRef<View>(null);

  // Check if delivery is >1 hour old (locked)
  useEffect(() => {
    const checkLockStatus = async () => {
      if (!deliveryId || isTestMode) return;

      const { data: delivery } = await supabase
        .from('deliveries')
        .select('delivered_at')
        .eq('id', deliveryId)
        .single();

      if (delivery?.delivered_at) {
        const deliveredTime = new Date(delivery.delivered_at).getTime();
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        if (now - deliveredTime > oneHour) {
          setIsLocked(true);
        }
      }
    };

    checkLockStatus();
  }, [deliveryId, isTestMode]);

  // Fetch extra remaining count
  useEffect(() => {
    const fetchExtraCount = async () => {
      if (!session?.user?.id) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('extra_count_today, extra_count_date')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        const today = new Date().toISOString().split('T')[0];
        if (profile.extra_count_date === today) {
          setExtraRemaining(5 - (profile.extra_count_today || 0));
        } else {
          setExtraRemaining(5);
        }
      }
    };

    fetchExtraCount();
  }, [session?.user?.id]);

  useEffect(() => {
    // 타이머 바 애니메이션 (only start if not locked)
    if (!isLocked) {
      Animated.timing(timerBarAnim, {
        toValue: 0,
        duration: COUNTDOWN_TIME * 1000,
        useNativeDriver: false,
      }).start();
    }
  }, [isLocked]);

  useEffect(() => {
    if (countdown > 0 && !isFinished) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !isFinished) {
      setIsFinished(true);
    }
  }, [countdown, isFinished]);

  useEffect(() => {
    const saveAndShowExtra = async () => {
      if (!isFinished || isSaved) return;

      if (isTestMode) {
        addReceivedCat(deliveryId || Date.now(), catImage, hits);
      } else if (deliveryId && session?.user?.id) {
        // deliveries 테이블 상태 및 hits 업데이트
        await supabase
          .from('deliveries')
          .update({
            hits,
            status: 'received',
            received_at: new Date().toISOString(),
          })
          .eq('id', deliveryId);
      }

      setIsSaved(true);
      // Show extra button instead of navigating immediately
      setShowExtraButton(true);
    };

    saveAndShowExtra();
  }, [isFinished, isSaved, isTestMode, deliveryId, catImage, hits, session]);

  // Handle unlock ad
  const handleUnlock = async () => {
    setIsUnlocking(true);
    try {
      const result = await showRewardedAd('unlock');
      if (result.success && result.reward) {
        setIsLocked(false);
        // Start timer animation after unlock
        Animated.timing(timerBarAnim, {
          toValue: 0,
          duration: COUNTDOWN_TIME * 1000,
          useNativeDriver: false,
        }).start();
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  // Handle extra ad
  const handleExtra = async () => {
    if (extraRemaining <= 0) return;

    setIsLoadingExtra(true);
    try {
      const result = await showRewardedAd('extra');
      if (result.success && result.reward && session?.user?.id) {
        // Update extra count in profile
        const today = new Date().toISOString().split('T')[0];
        const newCount = 5 - extraRemaining + 1;

        await supabase
          .from('profiles')
          .update({
            extra_count_today: newCount,
            extra_count_date: today,
          })
          .eq('id', session.user.id);

        // Find another pending delivery
        const { data: pendingDeliveries } = await supabase
          .from('deliveries')
          .select('*, upload:uploads(*)')
          .eq('status', 'delivered')
          .eq('receiver_id', session.user.id)
          .is('received_at', null)
          .limit(1);

        if (pendingDeliveries && pendingDeliveries.length > 0) {
          const nextDelivery = pendingDeliveries[0];
          router.replace({
            pathname: '/notification',
            params: {
              catId: nextDelivery.id.toString(),
              catImage: encodeURIComponent(nextDelivery.upload?.image_url || ''),
            },
          });
        } else {
          // No more pending deliveries, go to gallery
          router.replace('/(tabs)/');
        }
      }
    } finally {
      setIsLoadingExtra(false);
    }
  };

  // Navigate to gallery
  const handleFinish = () => {
    router.replace('/(tabs)/');
  };

  const handlePunch = (event: GestureResponderEvent) => {
    if (isFinished) return;

    // 진동 피드백
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setHits(hits + 1);

    // 발바닥 이펙트 추가
    const { locationX, locationY } = event.nativeEvent;
    const newPaw: PawPrint = {
      id: Date.now() + Math.random(),
      x: locationX - 25,
      y: locationY - 25,
      opacity: new Animated.Value(1),
      scale: new Animated.Value(0),
      rotation: Math.random() * 60 - 30,
    };

    setPawPrints((prev) => [...prev, newPaw]);

    // 발바닥 애니메이션
    Animated.parallel([
      Animated.spring(newPaw.scale, {
        toValue: 1,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(newPaw.opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setPawPrints((prev) => prev.filter((p) => p.id !== newPaw.id));
    });

    // 고양이 이미지 애니메이션
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 25,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 25,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const timerBarWidth = timerBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* 타이머 바 - only show when not locked and not finished */}
      {!isFinished && !isLocked && (
        <View style={styles.timerSection}>
          <View style={styles.timerBarContainer}>
            <Animated.View
              style={[
                styles.timerBar,
                { width: timerBarWidth },
              ]}
            />
          </View>
          <Text style={styles.timerText}>{countdown}</Text>
        </View>
      )}

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.catContainer,
            {
              transform: [
                { scale: scaleAnim },
                { translateX: shakeAnim },
              ],
            },
          ]}
        >
          <Pressable
            onPress={handlePunch}
            disabled={isFinished || isLocked}
            style={styles.catPressable}
          >
            <Image
              source={{ uri: catImage }}
              style={styles.catImage}
              resizeMode="cover"
              onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
              onLoad={() => console.log('Image loaded successfully:', catImage)}
            />

            {/* Locked overlay with blur */}
            {isLocked && (
              <View style={styles.lockedOverlay}>
                <BlurView intensity={80} style={styles.blurView} tint="light" />
                <View style={styles.lockedContent}>
                  <Text style={styles.lockedEmoji}>{t().notification.sleepingEmoji}</Text>
                  <Text style={styles.lockedTitle}>{t().notification.sleepingTitle}</Text>
                  <TouchableOpacity
                    style={styles.unlockButton}
                    onPress={handleUnlock}
                    disabled={isUnlocking}
                  >
                    {isUnlocking ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={styles.unlockButtonText}>{t().notification.unlockButton}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 발바닥 이펙트 */}
            {pawPrints.map((paw) => (
              <Animated.View
                key={paw.id}
                style={[
                  styles.pawPrint,
                  {
                    left: paw.x,
                    top: paw.y,
                    opacity: paw.opacity,
                    transform: [
                      { scale: paw.scale },
                      { rotate: `${paw.rotation}deg` },
                    ],
                  },
                ]}
              >
                <CatPaw width={50} height={50} />
              </Animated.View>
            ))}
          </Pressable>
        </Animated.View>

        {/* Stats - only show when not locked */}
        {!isLocked && (
          <View style={styles.statsContainer}>
            <CatPaw width={32} height={32} />
            <Text style={styles.hitsText}>{hits}</Text>
            <Text style={styles.hitsLabel}>{t().notification.punchLabel}</Text>
          </View>
        )}

        {/* Extra button - show after completion */}
        {showExtraButton && (
          <View style={styles.extraContainer}>
            {extraRemaining > 0 ? (
              <TouchableOpacity
                style={styles.extraButton}
                onPress={handleExtra}
                disabled={isLoadingExtra}
              >
                {isLoadingExtra ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Text style={styles.extraButtonText}>{t().notification.extraButton}</Text>
                    <Text style={styles.extraRemainingText}>
                      {t().notification.extraRemaining.replace('{remaining}', extraRemaining.toString())}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.extraExhaustedText}>{t().notification.extraExhausted}</Text>
            )}
            <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
              <Text style={styles.finishButtonText}>{t().common.complete}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!isFinished && !isLocked && (
        <Text style={styles.instruction}>{t().notification.instruction}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  timerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 60,
    marginHorizontal: 20,
    gap: 12,
  },
  timerBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    width: 24,
    textAlign: 'center',
  },
  timerBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  catContainer: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: radius.xl,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  catImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  catPressable: {
    width: '100%',
    height: '100%',
  },
  pawPrint: {
    position: 'absolute',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    backgroundColor: colors.white,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.pill,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  hitsText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 12,
  },
  hitsLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  instruction: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  // Locked state styles
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  lockedContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  lockedEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  unlockButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.xl,
    minWidth: 180,
    alignItems: 'center',
  },
  unlockButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Extra button styles
  extraContainer: {
    marginTop: 30,
    alignItems: 'center',
    gap: 12,
  },
  extraButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.xl,
    minWidth: 240,
    alignItems: 'center',
  },
  extraButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  extraRemainingText: {
    color: colors.white,
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  extraExhaustedText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  finishButton: {
    backgroundColor: colors.white,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.xl,
    minWidth: 240,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  finishButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
