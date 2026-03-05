import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  GestureResponderEvent,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  BackHandler,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CatPaw } from '../components/CatPaw';
import { colors, radius, formatCount } from '../lib/theme';
import { t } from '../lib/i18n';
import { showRewardedAd } from '../lib/ads';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_DELIVERIES } from '../lib/mockData';

const MUSIC_PREF_KEY = 'nyong_bgmusic_enabled';

interface PawPrint {
  id: number;
  x: number;
  y: number;
  opacity: Animated.Value;
  scale: Animated.Value;
  rotation: number;
}

interface FloatingNumber {
  id: number;
  x: number;
  y: number;
  opacity: Animated.Value;
  translateY: Animated.Value;
  scale: Animated.Value;
  value: string;
  image?: any;
  isRainbow?: boolean;
}

const RAINBOW_COLORS = ['#FF4757', '#FF9F43', '#FFC312', '#2ECC71', '#00B4D8', '#A29BFE', '#E84393'];

interface Particle {
  id: number;
  x: number;
  y: number;
  opacity: Animated.Value;
  translateX: Animated.Value;
  translateY: Animated.Value;
  scale: Animated.Value;
  rotation: Animated.Value;
  emoji: string;
}

interface RainDrop {
  id: number;
  x: number;
  translateY: Animated.Value;
  translateX?: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  image: any;
}

const PARTICLE_EMOJIS = ['⭐', '💖', '✨', '🐾', '💗', '🌟'];

const RAIN_IMAGES = [
  require('../assets/nyong_glasses.png'),
  require('../assets/nyong_paw_adaptive.png'),
  require('../assets/nyong_wink.png'),
  require('../assets/nyong_wow.png'),
];
const PARTICLE_COUNT = 12;

const { width, height: screenHeight } = Dimensions.get('window');
const COUNTDOWN_TIME = 10;

const FALLBACK_CAT_IMAGES = [
  'https://placekitten.com/400/400',
  'https://placekitten.com/401/401',
  'https://placekitten.com/402/402',
];

export default function NotificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ catId?: string; catImage?: string; preUnlocked?: string; nyongExtraId?: string; nyongExtraName?: string }>();
  const { addReceivedCat, isTestMode, session, profile, setPendingOpenNyongId } = useAuth();

  // catId는 이제 delivery.id로 사용됨
  const deliveryId = params.catId ? parseInt(params.catId, 10) : null;
  const preUnlocked = params.preUnlocked === 'true';
  const nyongExtraId = params.nyongExtraId ? parseInt(params.nyongExtraId, 10) : null;
  const nyongExtraName = params.nyongExtraName || null;

  // URL 디코딩 후 유효한지 확인
  const decodedUrl = params.catImage ? decodeURIComponent(params.catImage) : null;
  const isValidImageUrl = decodedUrl && decodedUrl.startsWith('http');
  const mockImage = isTestMode
    ? (deliveryId ? MOCK_DELIVERIES.find(d => d.id === deliveryId) : MOCK_DELIVERIES[0])?.upload?.image_url
    : null;
  const catImage = isValidImageUrl
    ? decodedUrl
    : mockImage || FALLBACK_CAT_IMAGES[Math.floor(Math.random() * FALLBACK_CAT_IMAGES.length)];

  const [countdown, setCountdown] = useState(COUNTDOWN_TIME);
  const [hits, setHits] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [pawPrints, setPawPrints] = useState<PawPrint[]>([]);
  const [showHint, setShowHint] = useState(true);

  // 뇽 정보 상태
  const [nyongId, setNyongId] = useState<number | null>(null);
  const [uploadId, setUploadId] = useState<number | null>(null);
  const [nyongName, setNyongName] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [deliveredAt, setDeliveredAt] = useState<string | null>(null);
  const [topPuncher, setTopPuncher] = useState<{ nickname: string; totalHits: number } | null>(null);

  // Unlock feature states
  const [isLocked, setIsLocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [rainDrops, setRainDrops] = useState<RainDrop[]>([]);
  const [showCrown, setShowCrown] = useState(false);
  const [isMyTop, setIsMyTop] = useState(false);
  const topPuncherBounce = useRef(new Animated.Value(1)).current;
  const crownOpacity = useRef(new Animated.Value(0)).current;
  const crownScale = useRef(new Animated.Value(0.5)).current;
  const crownTranslateY = useRef(new Animated.Value(-500)).current;
  const crownSparkle = useRef(new Animated.Value(1)).current;

  // Extra feature states
  const [extraRemaining, setExtraRemaining] = useState(4);
  const [isLoadingExtra, setIsLoadingExtra] = useState(false);
  const [isPoolExhausted, setIsPoolExhausted] = useState(false);

  // 뇽별 한장 더 받기 states (nyongExtraId가 있을 때만 활성)
  const [nyongExtraStatus, setNyongExtraStatus] = useState<{ usedToday: number; availablePhotos: number } | null>(null);

  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const timerBarAnim = useRef(new Animated.Value(1)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isMusicOn, setIsMusicOn] = useState(true);
  const musicStarted = useRef(false);
  const shouldAutoPlayMusic = useRef(false); // 타이머 시작 시 true

  // Android 뒤로가기: 펀치 중엔 차단, 힌트/완료 상태에서만 종료 허용
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showHint || isFinished) {
        handleFinish();
        return true;
      }
      return true; // 펀치 중/잠금 중: 차단 (hits 보호)
    });
    return () => handler.remove();
  }, [showHint, isFinished, nyongExtraId, nyongId]);

  // 배경음악 로드만 (재생은 첫 뇽펀치 시 시작)
  useEffect(() => {
    const loadMusic = async () => {
      try {
        const saved = await AsyncStorage.getItem(MUSIC_PREF_KEY);
        const enabled = saved === null ? true : saved === 'true';
        setIsMusicOn(enabled);
        if (!enabled) return;
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: false, staysActiveInBackground: false });
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/nyong_punchsong.mp3'),
          { shouldPlay: false, isLooping: true, volume: 0.6 }
        );
        soundRef.current = sound;
        // 타이머가 이미 시작됐으면 바로 재생
        if (shouldAutoPlayMusic.current && !musicStarted.current) {
          musicStarted.current = true;
          sound.playAsync().catch(() => {});
        }
      } catch (_) {}
    };
    loadMusic();
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  const toggleMusic = async () => {
    const next = !isMusicOn;
    setIsMusicOn(next);
    await AsyncStorage.setItem(MUSIC_PREF_KEY, String(next));
    if (next) {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: false, staysActiveInBackground: false });
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/nyong_punchsong.mp3'),
          { shouldPlay: musicStarted.current, isLooping: true, volume: 0.6 }
        );
        soundRef.current = sound;
      } catch (_) {}
    } else {
      await soundRef.current?.unloadAsync();
      soundRef.current = null;
    }
  };

  // 뇽별 한장 더 받기 상태 조회
  useEffect(() => {
    if (!nyongExtraId || !session?.user?.id) return;
    supabase.rpc('get_nyong_extra_status', {
      receiver_uuid: session.user.id,
      target_nyong_id: nyongExtraId,
    }).then(({ data }) => {
      if (data && data.length > 0) {
        setNyongExtraStatus({ usedToday: data[0].used_today, availablePhotos: data[0].available_photos });
      }
    });
  }, [nyongExtraId, session?.user?.id]);

  // 뇽 정보 및 잠금 상태 확인
  useEffect(() => {
    const fetchDeliveryInfo = async () => {
      // 테스트 모드 → mock 데이터에서 delivery 찾기
      if (isTestMode) {
        const mockDelivery = deliveryId
          ? MOCK_DELIVERIES.find(d => d.id === deliveryId)
          : MOCK_DELIVERIES[0];
        setNyongName(mockDelivery?.upload?.nyong?.name || '짜장');
        setTag(mockDelivery?.upload?.tag || '꽃보다짜장');
        setTopPuncher({ nickname: '뇽파민러', totalHits: 342 });
        return;
      }
      if (!deliveryId || deliveryId === 0) {
        setNyongName('테스트뇽');
        setTag('테스트');
        return;
      }

      const { data: delivery, error } = await supabase
        .from('deliveries')
        .select('delivered_at, upload_id, upload:uploads(tag, nyong_id, nyong:nyongs(name))')
        .eq('id', deliveryId)
        .single();

      if (delivery) {
        // 잠금 상태 확인
        let locked = false;
        if (delivery.delivered_at) {
          setDeliveredAt(delivery.delivered_at);
          const deliveredTime = new Date(delivery.delivered_at).getTime();
          const now = Date.now();
          const oneHour = 60 * 60 * 1000;

          if (!preUnlocked && now - deliveredTime > oneHour) {
            setIsLocked(true);
            locked = true;
          }
        }

        // upload_id 저장
        if (delivery.upload_id) {
          setUploadId(delivery.upload_id);
        }

        // 뇽 이름, 태그, ID 설정
        const uploadData = delivery.upload as { tag?: string; nyong_id?: number; nyong?: { name?: string } } | null;
        if (uploadData?.tag) {
          setTag(uploadData.tag);
        }
        if (uploadData?.nyong_id) {
          setNyongId(uploadData.nyong_id);
        }
        if (uploadData?.nyong?.name) {
          setNyongName(uploadData.nyong.name);
        }
      }
    };

    fetchDeliveryInfo();
  }, [deliveryId, isTestMode]);

  // 최다 뇽펀치 유저 조회
  useEffect(() => {
    const fetchTopPuncher = async () => {
      if (!uploadId) return;
      const { data } = await supabase.rpc('get_top_puncher', { target_upload_id: uploadId });
      if (data && data.length > 0) {
        setTopPuncher({ nickname: data[0].nickname, totalHits: Number(data[0].total_hits) });
      }
    };
    fetchTopPuncher();
  }, [uploadId]);

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
        const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]; // KST
        if (profile.extra_count_date === today) {
          setExtraRemaining(4 - (profile.extra_count_today || 0));
        } else {
          setExtraRemaining(4);
        }
      }
    };

    fetchExtraCount();
  }, [session?.user?.id]);

  useEffect(() => {
    // 타이머 바 애니메이션 (첫 펀치 후 + 잠금 아닐 때만)
    if (!isLocked && !showHint) {
      Animated.timing(timerBarAnim, {
        toValue: 0,
        duration: COUNTDOWN_TIME * 1000,
        useNativeDriver: false,
      }).start();
      // 배경음악 시작 (sound 로드보다 먼저 실행될 수 있어서 ref로 처리)
      shouldAutoPlayMusic.current = true;
      if (isMusicOn && soundRef.current && !musicStarted.current) {
        musicStarted.current = true;
        soundRef.current.playAsync().catch(() => {});
      }
    }
  }, [isLocked, showHint]);

  useEffect(() => {
    if (isLocked || showHint) return; // 잠금 or 첫 펀치 전엔 카운트다운 정지
    if (countdown > 0 && !isFinished) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !isFinished) {
      setIsFinished(true);
    }
  }, [countdown, isFinished, isLocked, showHint]);

  useEffect(() => {
    const saveAndShowExtra = async () => {
      if (!isFinished || isSaved) return;

      if (isTestMode) {
        addReceivedCat(deliveryId || Date.now(), catImage, hits);
      } else if (deliveryId && session?.user?.id) {
        await supabase.rpc('record_delivery_hits', {
          delivery_id: deliveryId,
          hit_count: hits,
        });
      }

      // 타이머 종료 후 1등 체크
      const myNickname = profile?.nickname;
      if (myNickname && (!topPuncher || hits > topPuncher.totalHits)) {
        setIsMyTop(true);
        topPuncherBounce.setValue(0);
        Animated.spring(topPuncherBounce, {
          toValue: 1,
          friction: 3,
          tension: 300,
          useNativeDriver: true,
        }).start();
      }

      setIsSaved(true);
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
        setCountdown(COUNTDOWN_TIME); // 카운트다운 10초 리셋
        timerBarAnim.setValue(1); // 타이머 바 리셋
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

  // Handle extra - 오늘의 뇽 하나 더 받기 (처음 2회 무료, 3~5회 광고)
  const handleExtra = async () => {
    if (extraRemaining <= 0 || !session?.user?.id) return;

    const isFree = extraRemaining >= 3; // 4,3 → 무료 (1번째, 2번째)

    setIsLoadingExtra(true);
    try {
      // 3번째부터 광고 필요
      if (!isFree) {
        const adResult = await showRewardedAd('extra');
        if (!adResult.success || !adResult.reward) return;
      }

      // 배달 날짜 기준으로 업로드 풀 날짜 계산
      // Edge Function은 배달 당일 기준 "어제 KST" 업로드를 사용하므로
      // 하나 더보기도 동일한 풀을 사용해야 함
      const referenceTime = deliveredAt ? new Date(deliveredAt).getTime() : Date.now();
      const deliveredKst = new Date(referenceTime + 9 * 60 * 60 * 1000);
      const poolDate = new Date(deliveredKst.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const yesterdayStart = new Date(`${poolDate}T00:00:00+09:00`).toISOString();
      const yesterdayEnd = new Date(`${poolDate}T23:59:59.999+09:00`).toISOString();

      // SECURITY DEFINER RPC로 RLS 우회: 미배달 사진 중 랜덤 선택 + 배달 레코드 생성
      const { data: extraData, error: extraError } = await supabase.rpc('get_extra_delivery', {
        receiver_uuid: session.user.id,
        p_yesterday_start: yesterdayStart,
        p_yesterday_end: yesterdayEnd,
      });

      if (extraError) {
        // 네트워크/서버 오류: count 변경 없이 버튼 유지 (재시도 가능)
        console.error('[handleExtra] RPC error:', extraError);
        return;
      }

      if (extraData && extraData.length > 0) {
        // RPC 성공 후에만 count 업데이트
        const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
        const newCount = 5 - extraRemaining;
        await supabase
          .from('profiles')
          .update({ extra_count_today: newCount, extra_count_date: today })
          .eq('id', session.user.id);

        setExtraRemaining(extraRemaining - 1);
        router.replace({
          pathname: '/notification',
          params: {
            catId: extraData[0].delivery_id.toString(),
            catImage: encodeURIComponent(extraData[0].image_url || ''),
          },
        });
      } else {
        // 풀 고갈: 오늘 더 볼 뇽 없음 (count 증가 안 함)
        setIsPoolExhausted(true);
      }
    } finally {
      setIsLoadingExtra(false);
    }
  };

  // Handle nyong-specific extra - 뇽별 한장 더 받기
  const handleNyongExtra = async () => {
    if (!nyongExtraId || !nyongExtraName || !session?.user?.id) return;
    if (!nyongExtraStatus || nyongExtraStatus.usedToday >= 2 || nyongExtraStatus.availablePhotos <= 0) return;

    setIsLoadingExtra(true);
    try {
      // 뇽별 한장 더는 항상 광고 필요 (첫 무료는 index.tsx에서 이미 사용)
      const adResult = await showRewardedAd('nyong_extra');
      if (!adResult.success || !adResult.reward) return;

      const { data, error } = await supabase.rpc('get_nyong_extra_delivery', {
        receiver_uuid: session.user.id,
        target_nyong_id: nyongExtraId,
      });

      if (error) {
        console.error('[handleNyongExtra] RPC error:', error);
        return;
      }

      if (data && data.length > 0) {
        setNyongExtraStatus(prev => prev ? { ...prev, usedToday: prev.usedToday + 1, availablePhotos: prev.availablePhotos - 1 } : prev);
        router.replace({
          pathname: '/notification',
          params: {
            catId: data[0].delivery_id.toString(),
            catImage: encodeURIComponent(data[0].image_url || ''),
            nyongExtraId: nyongExtraId.toString(),
            nyongExtraName: nyongExtraName,
          },
        });
      } else {
        setNyongExtraStatus(prev => prev ? { ...prev, availablePhotos: 0 } : prev);
      }
    } finally {
      setIsLoadingExtra(false);
    }
  };

  // Navigate to gallery — 모달을 정상 dismiss (스택 이중 쌓기 방지)
  const handleFinish = () => {
    // 카운트다운 끝나기 전에 나가면 hits=0으로 received 처리 (인앱 알림 재발 방지)
    if (!isFinished && deliveryId && session?.user?.id) {
      supabase.rpc('record_delivery_hits', {
        delivery_id: deliveryId,
        hit_count: hits,
      }).then(() => {});
    }
    const targetNyongId = nyongExtraId ?? nyongId;
    if (targetNyongId) {
      setPendingOpenNyongId(targetNyongId);
    }
    router.back();
  };

  // 뇽 비 이펙트 (100 배수)
  const triggerNyongRain = () => {
    const newDrops: RainDrop[] = [];
    const dropCount = 30;
    for (let i = 0; i < dropCount; i++) {
      const drop: RainDrop = {
        id: Date.now() + Math.random() + i,
        x: Math.random() * (width - 70),
        translateY: new Animated.Value(-80 - Math.random() * 200),
        opacity: new Animated.Value(1),
        scale: new Animated.Value(0.5 + Math.random() * 0.7),
        image: RAIN_IMAGES[i % RAIN_IMAGES.length],
      };
      newDrops.push(drop);
      const delay = i * 60 + Math.random() * 60;
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(drop.translateY, {
            toValue: screenHeight + 120,
            duration: 900 + Math.random() * 600,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(1100),
            Animated.timing(drop.opacity, {
              toValue: 0,
              duration: 350,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start(() => {
        setRainDrops(prev => prev.filter(d => d.id !== drop.id));
      });
    }
    setRainDrops(prev => [...prev, ...newDrops]);
  };

  // 뇽 폭발 이펙트 (200 배수) - 왕 고양이 중심으로 이미지 뿜어져 나옴
  const triggerNyongExplosion = () => {
    const newDrops: RainDrop[] = [];
    const dropCount = 40;
    // rainDrop 스타일의 top:0 기준이므로, translateY 초기값으로 중앙 Y 보정
    const startX = width / 2 - 35;
    const startY = screenHeight / 2 - 35; // top:0에서 화면 중앙까지 오프셋

    for (let i = 0; i < dropCount; i++) {
      const angle = (i / dropCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const distance = 130 + Math.random() * 180;
      const drop: RainDrop = {
        id: Date.now() + Math.random() + i,
        x: startX,
        translateY: new Animated.Value(startY), // 고양이 중심 Y에서 시작
        translateX: new Animated.Value(0),
        opacity: new Animated.Value(1),
        scale: new Animated.Value(0.2),
        image: RAIN_IMAGES[i % RAIN_IMAGES.length],
      };
      newDrops.push(drop);
      const delay = Math.random() * 80;
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(drop.translateX!, {
            toValue: Math.cos(angle) * distance,
            duration: 900 + Math.random() * 400,
            useNativeDriver: true,
          }),
          Animated.timing(drop.translateY, {
            toValue: startY + Math.sin(angle) * distance, // 중앙 기준으로 방사
            duration: 900 + Math.random() * 400,
            useNativeDriver: true,
          }),
          Animated.spring(drop.scale, {
            toValue: 0.7 + Math.random() * 0.5,
            friction: 4,
            tension: 80,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(650),
            Animated.timing(drop.opacity, {
              toValue: 0,
              duration: 450,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start(() => {
        setRainDrops(prev => prev.filter(d => d.id !== drop.id));
      });
    }
    setRainDrops(prev => [...prev, ...newDrops]);
  };

  // 뇽 킹 이펙트 (200 배수) - 중앙에서 커지며 화면 가득 채우고 사라짐
  const triggerCrown = () => {
    setShowCrown(true);
    crownOpacity.setValue(0);
    crownScale.setValue(1);
    crownTranslateY.setValue(0);
    crownSparkle.setValue(1);

    // 1단계: 번쩍번쩍 등장 (strobe flash)
    Animated.sequence([
      Animated.timing(crownOpacity, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(crownOpacity, { toValue: 0, duration: 55, useNativeDriver: true }),
      Animated.timing(crownOpacity, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(crownOpacity, { toValue: 0, duration: 55, useNativeDriver: true }),
      Animated.timing(crownOpacity, { toValue: 1, duration: 55, useNativeDriver: true }),
    ]).start(() => {
      // 2단계: 잠깐 머문 뒤 화면 가득 채우며 fade out
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(crownScale, {
            toValue: 5,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(crownOpacity, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
        ]).start(() => setShowCrown(false));
      }, 400);
    });
  };

  const handlePunch = (event: GestureResponderEvent) => {
    if (isFinished) return;

    // 첫 터치 시 힌트 → 원래 문구로 전환
    if (showHint) {
      setShowHint(false);
    }

    const newHits = hits + 1;

    // 진동 피드백 - 마일스톤마다 더 강한 진동
    if (newHits % 10 === 0) {
      // 10, 20, 30... 뇽펀치마다 성공 진동
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (newHits % 5 === 0) {
      // 5, 15, 25... 뇽펀치마다 강한 진동
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      // 일반 뇽펀치 진동
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setHits(newHits);

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

    // 특수 이펙트 (100, 200 배수)
    if (newHits % 200 === 0) {
      triggerCrown();
      triggerNyongExplosion();
    } else if (newHits % 100 === 0) {
      triggerNyongRain();
    }

    // 마일스톤 체크
    let floatingValue = '+1';
    let floatingImage = null;
    let isMilestone = false;

    let isRainbow = false;
    if (newHits % 200 === 0) {
      floatingValue = `${newHits}뇽펀치신강림!!`;
      floatingImage = require('../assets/nyong_king.png');
      isMilestone = true;
      isRainbow = true;
    } else if (newHits % 100 === 0) {
      floatingValue = `${newHits}뇽펀치!`;
      floatingImage = require('../assets/nyong_wow.png');
      isMilestone = true;
      isRainbow = true;
    } else if (newHits % 50 === 0) {
      floatingValue = '뇽신강림!!!';
      floatingImage = require('../assets/nyong_punch.png');
      isMilestone = true;
    } else if (newHits % 40 === 0) {
      floatingValue = '뇽파민 폭발!!!';
      floatingImage = require('../assets/nyong_jump.png');
      isMilestone = true;
    } else if (newHits % 30 === 0) {
      floatingValue = '더빠르게뇽펀치!';
      floatingImage = require('../assets/nyong_twinkle.png');
      isMilestone = true;
    } else if (newHits % 20 === 0) {
      floatingValue = '멈추지마라냥!!';
      floatingImage = require('../assets/nyong_heart.png');
      isMilestone = true;
    } else if (newHits % 10 === 0) {
      floatingValue = '폭풍뇽펀치!';
      floatingImage = require('../assets/nyong_fun.png');
      isMilestone = true;
    }

    // 숫자(+이미지) 떠오르는 이펙트
    const floatingNum: FloatingNumber = {
      id: Date.now() + Math.random(),
      x: isMilestone ? (width / 2) - 80 : locationX - 10,
      y: isMilestone ? width * 0.55 : locationY - 15,
      opacity: new Animated.Value(1),
      translateY: new Animated.Value(0),
      scale: new Animated.Value(isMilestone ? 0.3 : 0.8),
      value: floatingValue,
      image: floatingImage,
      isRainbow,
    };

    setFloatingNumbers((prev) => [...prev, floatingNum]);

    // 숫자 떠오르는 애니메이션 (마일스톤은 더 크고 오래)
    Animated.parallel([
      Animated.timing(floatingNum.translateY, {
        toValue: isMilestone ? -120 : -40,
        duration: isMilestone ? 1000 : 500,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(floatingNum.scale, {
          toValue: isMilestone ? 1.8 : 1.0,
          friction: isMilestone ? 4 : 3,
          useNativeDriver: true,
        }),
        Animated.timing(floatingNum.scale, {
          toValue: isMilestone ? 1.2 : 0.6,
          duration: isMilestone ? 300 : 150,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(isMilestone ? 700 : 300),
        Animated.timing(floatingNum.opacity, {
          toValue: 0,
          duration: isMilestone ? 300 : 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setFloatingNumbers((prev) => prev.filter((n) => n.id !== floatingNum.id));
    });

    // 마일스톤 파티클 폭발
    if (isMilestone) {
      const centerX = width / 2;
      const centerY = width / 2;
      const newParticles: Particle[] = [];

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
        const distance = 120 + Math.random() * 80;
        const particle: Particle = {
          id: Date.now() + Math.random() + i,
          x: centerX - 12,
          y: centerY - 12,
          opacity: new Animated.Value(1),
          translateX: new Animated.Value(0),
          translateY: new Animated.Value(0),
          scale: new Animated.Value(0),
          rotation: new Animated.Value(0),
          emoji: PARTICLE_EMOJIS[Math.floor(Math.random() * PARTICLE_EMOJIS.length)],
        };
        newParticles.push(particle);

        Animated.parallel([
          Animated.timing(particle.translateX, {
            toValue: Math.cos(angle) * distance,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(particle.translateY, {
            toValue: Math.sin(angle) * distance - 30,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.spring(particle.scale, {
              toValue: 1.2,
              friction: 4,
              useNativeDriver: true,
            }),
            Animated.timing(particle.scale, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(particle.rotation, {
            toValue: Math.random() * 4 - 2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(500),
            Animated.timing(particle.opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          setParticles((prev) => prev.filter((p) => p.id !== particle.id));
        });
      }

      setParticles((prev) => [...prev, ...newParticles]);
    }

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
        toValue: 0.94,
        duration: 30,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // 흔들림 애니메이션
    const shakeIntensity = 4;
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: shakeIntensity,
        duration: 20,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -shakeIntensity,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: shakeIntensity / 2,
        duration: 30,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 20,
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
      {/* 타이머 바 + 음악 토글 */}
      <View style={[styles.timerSection, { marginTop: insets.top + 12 }]}>
        {showHint && !isLocked ? (
          <TouchableOpacity onPress={handleFinish} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'←'}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity onPress={toggleMusic} style={styles.musicToggle}>
              <Ionicons
                name={isMusicOn ? 'volume-high' : 'volume-mute'}
                size={22}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {!isFinished && !isLocked && (
              <>
                <View style={styles.timerBarContainer}>
                  <Animated.View
                    style={[
                      styles.timerBar,
                      { width: timerBarWidth },
                    ]}
                  />
                </View>
                <Text style={styles.timerText}>{countdown}</Text>
              </>
            )}
          </>
        )}
      </View>

      <View style={styles.content}>
        {/* Stats / Hint */}
        {!isLocked && (
          <View style={styles.statsContainer}>
            {showHint ? (
              <Text style={styles.hitsText}>
                내가 맘에 든다면 <Text style={styles.hitsHighlight}>사진을 터치해 뇽펀치</Text>를 날려달라냥!
              </Text>
            ) : (
              <Text style={styles.hitsText}>
                <Text style={styles.hitsHighlight}>{nyongName}</Text>
                {tag ? <Text style={styles.hitsTag}> #{tag}</Text> : null}
                에게 <Text style={styles.hitsHighlight}>{formatCount(hits)}</Text> 뇽펀치를 날렸어요!
              </Text>
            )}
          </View>
        )}

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
              contentFit="cover"
              onError={() => {}}
              onLoad={() => {}}
            />

            {/* Locked overlay with blur */}
            {isLocked && (
              <View style={styles.lockedOverlay}>
                <BlurView intensity={80} style={styles.blurView} tint="light" />
                <View style={styles.lockedContent}>
                  <Image
                    source={require('../assets/nyong_sleep.png')}
                    style={styles.lockedImage}
                    contentFit="contain"
                  />
                  <Text style={styles.lockedTitle}>{t().notification.sleepingTitle}</Text>
                  <TouchableOpacity
                    style={styles.unlockButton}
                    onPress={handleUnlock}
                    disabled={isUnlocking}
                  >
                    {isUnlocking ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={styles.unlockButtonText} numberOfLines={1} maxFontSizeMultiplier={1.3}>{t().notification.unlockButton}</Text>
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

            {/* 떠오르는 숫자 + 마일스톤 이미지 이펙트 */}
            {floatingNumbers.map((num) => (
              <Animated.View
                key={num.id}
                style={[
                  styles.floatingNumber,
                  {
                    left: num.x,
                    top: num.y,
                    opacity: num.opacity,
                    transform: [
                      { translateY: num.translateY },
                      { scale: num.scale },
                    ],
                  },
                ]}
              >
                {num.image && (
                  <Image
                    source={num.image}
                    style={styles.milestoneImage}
                    contentFit="contain"
                  />
                )}
                {num.isRainbow ? (
                  <Text style={[styles.floatingNumberText, styles.milestoneNumberText]}>
                    {num.value.split('').map((char, i) => (
                      <Text key={i} style={{ color: RAINBOW_COLORS[i % RAINBOW_COLORS.length] }}>
                        {char}
                      </Text>
                    ))}
                  </Text>
                ) : (
                  <Text style={[
                    styles.floatingNumberText,
                    num.image && styles.milestoneNumberText,
                  ]}>{num.value}</Text>
                )}
              </Animated.View>
            ))}

            {/* 마일스톤 파티클 */}
            {particles.map((p) => (
              <Animated.Text
                key={p.id}
                style={[
                  styles.particle,
                  {
                    left: p.x,
                    top: p.y,
                    opacity: p.opacity,
                    transform: [
                      { translateX: p.translateX },
                      { translateY: p.translateY },
                      { scale: p.scale },
                      { rotate: p.rotation.interpolate({
                          inputRange: [-2, 2],
                          outputRange: ['-360deg', '360deg'],
                        })
                      },
                    ],
                  },
                ]}
              >
                {p.emoji}
              </Animated.Text>
            ))}
          </Pressable>
        </Animated.View>

        {/* 최다 뇽펀치 1등 + Extra + 완료 버튼 (스크롤 가능) */}
        {isFinished && (
          <ScrollView
            style={styles.bottomScrollView}
            contentContainerStyle={styles.bottomScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
        {(topPuncher || isMyTop) && (
          <Animated.View style={[styles.topPuncherContainer, { transform: [{ scale: topPuncherBounce }] }]}>
            <Text style={styles.topPuncherText}>
              👑 현재 1등 {isMyTop ? (isTestMode ? '냥집사' : profile?.nickname) : topPuncher?.nickname}님 {formatCount(isMyTop ? hits : topPuncher?.totalHits ?? 0)}뇽펀치
            </Text>
          </Animated.View>
        )}

        {isSaved && (
          <View style={styles.extraContainer}>
            {nyongExtraId && nyongExtraName ? (
              // 뇽별 한장 더 받기 버튼
              nyongExtraStatus && nyongExtraStatus.usedToday < 2 && nyongExtraStatus.availablePhotos > 0 ? (
                <TouchableOpacity
                  style={styles.extraButton}
                  onPress={handleNyongExtra}
                  disabled={isLoadingExtra}
                >
                  {isLoadingExtra ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.extraButtonText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                      {t().gallery.nyongExtraButtonAd.replace('{name}', nyongExtraName)}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <Text style={styles.extraExhaustedText}>
                  {nyongExtraStatus && nyongExtraStatus.availablePhotos <= 0
                    ? t().gallery.nyongExtraNoPhotos.replace('{name}', nyongExtraName)
                    : t().gallery.nyongExtraExhausted}
                </Text>
              )
            ) : (
              // 기존 오늘의 뇽 하나 더 받기 (오늘 배달분만 표시)
              (() => {
                const isToday = deliveredAt && (() => {
                  const todayKst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
                  const deliveredKst = new Date(new Date(deliveredAt).getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
                  return todayKst === deliveredKst;
                })();
                if (!isToday) return null; // 과거 배달은 더보기 영역 숨김
                if (!isPoolExhausted && extraRemaining > 0) {
                  return (
                    <TouchableOpacity
                      style={styles.extraButton}
                      onPress={handleExtra}
                      disabled={isLoadingExtra}
                    >
                      {isLoadingExtra ? (
                        <ActivityIndicator color={colors.white} />
                      ) : (
                        <>
                          <Text style={styles.extraButtonText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                            {extraRemaining >= 3
                              ? t().notification.extraButtonFree
                              : t().notification.extraButton}
                          </Text>
                          <Text style={styles.extraRemainingText} maxFontSizeMultiplier={1.3}>
                            {t().notification.extraRemaining.replace('{remaining}', extraRemaining.toString())}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  );
                }
                return (
                  <Text style={styles.extraExhaustedText}>
                    {isPoolExhausted
                      ? t().notification.extraPoolEmpty
                      : t().notification.extraExhausted}
                  </Text>
                );
              })()
            )}
            <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
              <Text style={styles.finishButtonText} numberOfLines={1} maxFontSizeMultiplier={1.3}>{t().notification.finishButton}</Text>
            </TouchableOpacity>
          </View>
        )}
          </ScrollView>
        )}
      </View>

      {/* 뇽 비 이펙트 */}
      {rainDrops.map(drop => (
        <Animated.View
          key={drop.id}
          pointerEvents="none"
          style={[
            styles.rainDrop,
            {
              left: drop.x,
              opacity: drop.opacity,
              transform: [
                { translateY: drop.translateY },
                ...(drop.translateX ? [{ translateX: drop.translateX }] : []),
                { scale: drop.scale },
              ],
            },
          ]}
        >
          <Image source={drop.image} style={styles.rainDropImage} contentFit="contain" />
        </Animated.View>
      ))}

      {/* 뇽 크라운 이펙트 */}
      {showCrown && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.crownOverlay,
            {
              opacity: crownOpacity,
              transform: [
                { translateY: crownTranslateY },
                { scale: crownScale },
              ],
            },
          ]}
        >
          <Image
            source={require('../assets/nyong_king.png')}
            style={styles.crownImage}
            contentFit="contain"
          />
        </Animated.View>
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
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 22,
    color: colors.textSecondary,
  },
  musicToggle: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 80,
    alignItems: 'center',
  },
  catContainer: {
    width: width,
    height: width,
    overflow: 'hidden',
  },
  catImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.placeholder,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hintIcon: {
    width: 40,
    height: 40,
  },
  catPressable: {
    width: '100%',
    height: '100%',
  },
  pawPrint: {
    position: 'absolute',
  },
  floatingNumber: {
    position: 'absolute',
    zIndex: 10,
    alignItems: 'center',
  },
  floatingNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    textShadowColor: colors.whiteTranslucent,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  milestoneNumberText: {
    fontSize: 36,
    color: colors.primary,
  },
  milestoneImage: {
    width: 72,
    height: 72,
    marginBottom: -4,
  },
  particle: {
    position: 'absolute',
    fontSize: 24,
    zIndex: 15,
  },
  statsContainer: {
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 12,
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  hitsHighlight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  hitsTag: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  topPuncherContainer: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  topPuncherText: {
    fontSize: 13,
    color: colors.textSecondary,
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
  lockedImage: {
    width: 120,
    height: 120,
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
  bottomScrollView: {
    maxHeight: 200,
  },
  bottomScrollContent: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  // Extra button styles
  resultMessage: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  extraContainer: {
    marginTop: 20,
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
    paddingVertical: 12,
    alignItems: 'center',
  },
  finishButtonText: {
    color: colors.textTertiary,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  // 뇽 비 스타일
  rainDrop: {
    position: 'absolute',
    top: 0,
    zIndex: 100,
  },
  rainDropImage: {
    width: 70,
    height: 70,
  },
  // 뇽 크라운 스타일
  crownOverlay: {
    position: 'absolute',
    zIndex: 200,
    left: width * 0.025,
    top: screenHeight / 2 - (width * 0.95) / 2,
  },
  crownImage: {
    width: width * 0.95,
    height: width * 0.95,
  },
  // 뇽 정보 스타일
  nyongInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  nyongName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  nyongTag: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
});
