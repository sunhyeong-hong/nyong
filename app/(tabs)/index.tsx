import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  BackHandler,
  RefreshControl,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Delivery } from '../../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../../lib/theme';
import { NotificationBanner } from '../../components/NotificationBanner';
import { t, format } from '../../lib/i18n';
import { showRewardedAd } from '../../lib/ads';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications } from '../../lib/notifications';
import { MOCK_DELIVERIES } from '../../lib/mockData';
import { PinchableImage } from '../../components/PinchableImage';

const { width, height } = Dimensions.get('window');
const GRID_PADDING = 12;
const IMAGE_GAP = 6;
const imageSize = (width - GRID_PADDING * 2 - IMAGE_GAP * 2) / 3;

interface NyongGroup {
  nyongId: number | null;
  nyongName: string;
  frontPhotoUrl: string | null;
  photoCount: number;
  deliveries: Delivery[];
}

export default function GalleryScreen() {
  const router = useRouter();
  const { openNyongId } = useLocalSearchParams<{ openNyongId?: string }>();
  const insets = useSafeAreaInsets();
  const { session, profile, isLoading, isTestMode, testReceivedCats, incomingCat, clearIncomingCat, pendingNotification, clearPendingNotification, pendingOpenNyongId, setPendingOpenNyongId } = useAuth();
  const [items, setItems] = useState<Delivery[]>([]);
  const [isPinching, setIsPinching] = useState(false);
  const [isLoadingCats, setIsLoadingCats] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<'latest' | 'punch' | 'name'>('latest');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [notifGranted, setNotifGranted] = useState(true);
  const [viewerHeight, setViewerHeight] = useState(height);
  const [selectedNyongGroup, setSelectedNyongGroup] = useState<NyongGroup | null>(null);
  const [nyongExtraStatus, setNyongExtraStatus] = useState<{ usedToday: number; availablePhotos: number } | null>(null);
  const [isLoadingNyongExtra, setIsLoadingNyongExtra] = useState(false);
  const PAGE_SIZE = 30;

  const handleReport = (uploadId: number) => {
    const reasons = [
      { key: 'inappropriate', label: t().report.inappropriate },
      { key: 'violence', label: t().report.violence },
      { key: 'spam', label: t().report.spam },
      { key: 'other', label: t().report.other },
    ] as const;

    Alert.alert(
      t().report.title,
      undefined,
      [
        ...reasons.map((r) => ({
          text: r.label,
          onPress: async () => {
            try {
              await supabase.from('content_reports').insert({
                reporter_id: session?.user?.id,
                target_type: 'upload',
                target_id: uploadId,
                reason: r.key,
              });
              Alert.alert('', t().report.success);
            } catch {
              Alert.alert('', t().report.error);
            }
          },
        })),
        { text: t().common.cancel, style: 'cancel' },
      ]
    );
  };

  useEffect(() => {
    if (!isLoading && !session && !isTestMode) {
      router.replace('/onboarding');
      return;
    }
    if (!isLoading && session && profile && (!profile.nickname || profile.nickname === '뇽집사')) {
      router.replace('/nickname-setup');
      return;
    }
  }, [session, profile, isLoading, isTestMode]);

  // 앱이 완전히 종료된 상태에서 알림 탭으로 실행된 경우
  // AuthContext에서 pendingNotification을 설정하고, 여기서 네비게이터가 준비된 후 이동
  useEffect(() => {
    if (pendingNotification && !isLoading && session) {
      clearPendingNotification();
      router.push({
        pathname: '/notification',
        params: {
          catId: pendingNotification.catId,
          catImage: pendingNotification.catImage,
        },
      });
    }
  }, [pendingNotification, isLoading, session]);

  useEffect(() => {
    if (isTestMode) {
      setItems(MOCK_DELIVERIES);
      setIsLoadingCats(false);
      return;
    }
    if (session?.user?.id) {
      fetchDeliveries();
    } else if (!isLoading) {
      setIsLoadingCats(false);
    }
  }, [session, isTestMode, isLoading]);

  // 화면 복귀 시 갤러리 갱신
  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id && !isTestMode) {
        fetchDeliveries();
      }
      // 서브갤러리 복귀 시 nyongExtra 상태 리프레시
      if (selectedNyongGroup?.nyongId && session?.user?.id) {
        supabase.rpc('get_nyong_extra_status', {
          receiver_uuid: session.user.id,
          target_nyong_id: selectedNyongGroup.nyongId,
        }).then(({ data }) => {
          if (data && data.length > 0) {
            setNyongExtraStatus({ usedToday: data[0].used_today, availablePhotos: data[0].available_photos });
          }
        });
      }
    }, [session, isTestMode, selectedNyongGroup?.nyongId])
  );

  // 알림 권한 상태 확인
  useFocusEffect(
    useCallback(() => {
      Notifications.getPermissionsAsync().then(({ status }) => {
        setNotifGranted(status === 'granted');
      });
    }, [])
  );

  const handleEnableNotif = async () => {
    if (!session?.user?.id) return;
    await registerForPushNotifications(session.user.id);
    const { status } = await Notifications.getPermissionsAsync();
    setNotifGranted(status === 'granted');
  };

  const onRefresh = useCallback(async () => {
    if (!session?.user?.id || isTestMode) return;
    setIsRefreshing(true);
    try {
      const { data } = await supabase
        .from('deliveries')
        .select(`*, upload:uploads(*, nyong:nyongs(*))`)
        .eq('receiver_id', session.user.id)
        .in('status', ['delivered', 'received'])
        .order('delivered_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);
      setItems(data || []);
      setHasMore((data?.length ?? 0) === PAGE_SIZE);
    } finally {
      setIsRefreshing(false);
    }
  }, [session, isTestMode]);

  const fetchDeliveries = async () => {
    setIsLoadingCats(true);
    try {
      const { data } = await supabase
        .from('deliveries')
        .select(`*, upload:uploads(*, nyong:nyongs(*))`)
        .eq('receiver_id', session?.user?.id)
        .in('status', ['delivered', 'received'])
        .order('delivered_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);

      setItems(data || []);
      setHasMore((data?.length ?? 0) === PAGE_SIZE);
    } catch {
      // silent
    } finally {
      setIsLoadingCats(false);
    }
  };

  const fetchMoreDeliveries = async () => {
    if (!session?.user?.id || isLoadingMore || !hasMore || sortMode !== 'latest') return;
    setIsLoadingMore(true);
    try {
      const { data } = await supabase
        .from('deliveries')
        .select(`*, upload:uploads(*, nyong:nyongs(*))`)
        .eq('receiver_id', session.user.id)
        .in('status', ['delivered', 'received'])
        .order('delivered_at', { ascending: false })
        .range(items.length, items.length + PAGE_SIZE - 1);

      if (data && data.length > 0) {
        setItems((prev) => [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch {
      // silent
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (selectedIndex === null) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedIndex(null);
      return true;
    });
    return () => handler.remove();
  }, [selectedIndex]);

  useEffect(() => {
    if (selectedNyongGroup === null) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedNyongGroup(null);
      return true;
    });
    return () => handler.remove();
  }, [selectedNyongGroup]);

  useEffect(() => {
    if (sortMode !== 'name') setSelectedNyongGroup(null);
  }, [sortMode]);

  // 서브갤러리 진입 시 뇽별 한장 더 받기 상태 조회
  useEffect(() => {
    if (!selectedNyongGroup?.nyongId || !session?.user?.id) {
      setNyongExtraStatus(null);
      return;
    }
    supabase.rpc('get_nyong_extra_status', {
      receiver_uuid: session.user.id,
      target_nyong_id: selectedNyongGroup.nyongId,
    }).then(({ data }) => {
      if (data && data.length > 0) {
        setNyongExtraStatus({ usedToday: data[0].used_today, availablePhotos: data[0].available_photos });
      }
    });
  }, [selectedNyongGroup?.nyongId, session?.user?.id]);

  const sortedItems = useMemo(() => {
    if (sortMode === 'latest') return items;
    if (sortMode === 'punch') {
      return [...items].sort((a, b) => (b.hits || 0) - (a.hits || 0));
    }
    // name
    return [...items].sort((a, b) => {
      const nameA = a.upload?.nyong?.name || '';
      const nameB = b.upload?.nyong?.name || '';
      return nameA.localeCompare(nameB, 'ko');
    });
  }, [items, sortMode]);

  const groupedByNyong = useMemo(() => {
    if (sortMode !== 'name') return [];
    const groups = new Map<number | null, NyongGroup>();
    items.forEach((item) => {
      const nyong = item.upload?.nyong;
      const key = nyong?.id ?? null;
      if (!groups.has(key)) {
        groups.set(key, {
          nyongId: key,
          nyongName: nyong?.name ?? t().gallery.groupOther,
          frontPhotoUrl: nyong?.front_photo_url ?? null,
          photoCount: 0,
          deliveries: [],
        });
      }
      const group = groups.get(key)!;
      group.photoCount += 1;
      group.deliveries.push(item);
    });
    return Array.from(groups.values()).sort((a, b) => {
      if (a.nyongId === null) return 1;
      if (b.nyongId === null) return -1;
      return a.nyongName.localeCompare(b.nyongName, 'ko');
    });
  }, [items, sortMode]);

  // 뇽펀치 후 복귀 시 selectedNyongGroup 데이터 동기화
  useEffect(() => {
    if (selectedNyongGroup && sortMode === 'name') {
      const updated = groupedByNyong.find(g => g.nyongId === selectedNyongGroup.nyongId);
      if (updated && updated.photoCount !== selectedNyongGroup.photoCount) {
        setSelectedNyongGroup(updated);
      }
    }
  }, [groupedByNyong]);

  // openNyongId 파라미터로 진입 시 해당 뇽 서브갤러리 자동 열기
  const [pendingNyongId, setPendingNyongId] = useState<number | null>(null);

  useEffect(() => {
    if (openNyongId) {
      const targetId = parseInt(openNyongId, 10);
      setPendingNyongId(targetId);
      setSortMode('name');
      router.setParams({ openNyongId: undefined as any });
    }
  }, [openNyongId]);

  // notification에서 handleFinish → setPendingOpenNyongId 후 router.back()으로 돌아왔을 때
  useFocusEffect(
    useCallback(() => {
      if (pendingOpenNyongId) {
        const targetId = pendingOpenNyongId;
        setPendingOpenNyongId(null);
        setPendingNyongId(targetId);
        setSortMode('name');
      }
    }, [pendingOpenNyongId])
  );

  useEffect(() => {
    if (pendingNyongId && groupedByNyong.length > 0) {
      const targetGroup = groupedByNyong.find(g => g.nyongId === pendingNyongId);
      if (targetGroup) {
        setSelectedNyongGroup(targetGroup);
      }
      setPendingNyongId(null);
    }
  }, [pendingNyongId, groupedByNyong]);

  const handleNotificationPress = () => {
    if (incomingCat) {
      clearIncomingCat();
      router.push({
        pathname: '/notification',
        params: { catId: incomingCat.id, catImage: encodeURIComponent(incomingCat.image_url) },
      });
    }
  };

  const getImageUrl = (item: Delivery) => {
    if (item.upload) {
      return item.upload.image_url;
    }
    return null;
  };

  const getHits = (item: Delivery) => {
    return item.hits || 0;
  };

  // 1시간 이상 지났는데 아직 안 본 배달은 잠김
  const isItemLocked = (item: Delivery) => {
    if (item.status === 'received') return false;
    if (item.received_at) return false;
    if (!item.delivered_at) return false;
    const deliveredTime = new Date(item.delivered_at).getTime();
    return Date.now() - deliveredTime > 60 * 60 * 1000;
  };

  const handleNyongExtra = async () => {
    if (!selectedNyongGroup?.nyongId || !session?.user?.id || !nyongExtraStatus) return;
    if (nyongExtraStatus.usedToday >= 2 || nyongExtraStatus.availablePhotos <= 0) return;

    const isFree = nyongExtraStatus.usedToday === 0;
    setIsLoadingNyongExtra(true);
    try {
      if (!isFree) {
        const adResult = await showRewardedAd('nyong_extra');
        if (!adResult.success || !adResult.reward) return;
      }
      const { data, error } = await supabase.rpc('get_nyong_extra_delivery', {
        receiver_uuid: session.user.id,
        target_nyong_id: selectedNyongGroup.nyongId,
      });
      if (error || !data || data.length === 0) {
        if (!error) setNyongExtraStatus(prev => prev ? { ...prev, availablePhotos: 0 } : null);
        return;
      }
      setNyongExtraStatus(prev => prev ? {
        usedToday: prev.usedToday + 1,
        availablePhotos: prev.availablePhotos - 1,
      } : null);
      router.push({
        pathname: '/notification',
        params: {
          catId: data[0].delivery_id.toString(),
          catImage: encodeURIComponent(data[0].image_url || ''),
          nyongExtraId: selectedNyongGroup.nyongId.toString(),
          nyongExtraName: selectedNyongGroup.nyongName,
        },
      });
    } finally {
      setIsLoadingNyongExtra(false);
    }
  };

  const handleItemPress = async (item: Delivery, index: number) => {
    if (isUnlocking) return; // 광고 진행 중 다른 아이템 탭 차단
    if (isItemLocked(item)) {
      // 잠긴 항목 → 광고 확인 후 해제
      Alert.alert(
        t().notification.sleepingTitle,
        '',
        [
          { text: '아니요', style: 'cancel' },
          {
            text: t().notification.unlockButton,
            onPress: async () => {
              setIsUnlocking(true);
              try {
                const result = await showRewardedAd('unlock');
                if (result.success && result.reward) {
                  router.push({
                    pathname: '/notification',
                    params: {
                      catId: item.id.toString(),
                      catImage: encodeURIComponent(getImageUrl(item) || ''),
                      preUnlocked: 'true',
                    },
                  });
                }
              } finally {
                setIsUnlocking(false);
              }
            },
          },
        ]
      );
      return;
    } else if (item.status === 'delivered' && !item.received_at) {
      // 아직 안 본 배달 → 바로 뇽펀치 화면으로
      router.push({
        pathname: '/notification',
        params: {
          catId: item.id.toString(),
          catImage: encodeURIComponent(getImageUrl(item) || ''),
        },
      });
    } else {
      // 이미 본 배달 → 풀스크린 갤러리
      setSelectedIndex(index);
    }
  };

  // 서브갤러리에서 "+" 카드 표시 여부
  const showExtraPlusCard = selectedNyongGroup?.nyongId != null && nyongExtraStatus != null;
  const isNyongExtraNoPhotos = nyongExtraStatus != null && nyongExtraStatus.availablePhotos <= 0;
  const isNyongExtraUsedUp = nyongExtraStatus != null && nyongExtraStatus.usedToday >= 2;
  const isNyongExtraDisabled = isNyongExtraNoPhotos || isNyongExtraUsedUp;

  const subGalleryData: (Delivery | null)[] = selectedNyongGroup
    ? [...selectedNyongGroup.deliveries, ...(showExtraPlusCard ? [null] : [])]
    : [];

  const renderItem = ({ item, index }: { item: Delivery | null; index: number }) => {
    // "+" 카드 (서브갤러리 마지막)
    if (item === null) {
      return (
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={handleNyongExtra}
          disabled={isLoadingNyongExtra || isNyongExtraDisabled}
          activeOpacity={0.7}
        >
          <View style={[styles.plusCard, isNyongExtraDisabled && { opacity: 0.5 }]}>
            {isLoadingNyongExtra ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : isNyongExtraNoPhotos ? (
              <Text style={styles.plusCardText}>{t().gallery.nyongExtraNoPhotos.replace('{name}', selectedNyongGroup?.nyongName || '')}</Text>
            ) : isNyongExtraUsedUp ? (
              <Text style={styles.plusCardText}>{t().gallery.nyongExtraTomorrow}</Text>
            ) : nyongExtraStatus && nyongExtraStatus.usedToday > 0 ? (
              <>
                <Text style={styles.plusCardIcon}>+</Text>
                <Text style={styles.plusCardText} numberOfLines={2}>
                  {t().gallery.nyongExtraButtonAd.replace('{name}', selectedNyongGroup?.nyongName || '')}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.plusCardIcon}>+</Text>
                <Text style={styles.plusCardText} numberOfLines={2}>
                  {selectedNyongGroup?.nyongName} {t().gallery.nyongExtraButton}
                </Text>
              </>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    const imageUrl = getImageUrl(item);
    if (!imageUrl) return null;

    const locked = isItemLocked(item);
    const unseen = item.status === 'delivered' && !item.received_at && !locked;
    const nyongName = item.upload?.nyong?.name;
    const tag = item.upload?.tag;
    const label = [nyongName, tag ? `#${tag}` : null].filter(Boolean).join(' ');

    return (
      <TouchableOpacity
        style={styles.imageContainer}
        onPress={() => handleItemPress(item, index)}
        onLongPress={() => item.upload?.id && handleReport(item.upload.id)}
        delayLongPress={500}
      >
        <Image
          source={{ uri: imageUrl }}
          style={[styles.image, locked && styles.imageLocked]}
          contentFit="cover"
          blurRadius={locked ? 15 : 0}
        />
        {locked && (
          <View style={styles.lockedOverlay}>
            {item.delivered_at && (
              <Text style={styles.lockedDate}>
                {(() => {
                  const d = new Date(new Date(item.delivered_at).getTime() + 9 * 60 * 60 * 1000);
                  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
                })()}
              </Text>
            )}
            <Text style={styles.lockedIcon}>🔒</Text>
          </View>
        )}
        {unseen && (
          <View style={styles.unseenBadge}>
            <Text style={styles.unseenText}>NEW</Text>
          </View>
        )}
        {!locked && !!label && (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={styles.itemInfoOverlay}
          >
            <Text style={styles.itemLabel} numberOfLines={1}>
              {label}
            </Text>
          </LinearGradient>
        )}
      </TouchableOpacity>
    );
  };

  const renderNyongCard = ({ item }: { item: NyongGroup }) => {
    const representativeImage = item.frontPhotoUrl || item.deliveries[0]?.upload?.image_url;
    const countText = t().gallery.groupPhotoCount.replace('{count}', String(item.photoCount));
    const label = `${item.nyongName} ${countText}`;

    const stacked = item.photoCount >= 2;

    return (
      <View style={styles.stackWrapper}>
        {stacked && (
          <>
            <View style={[styles.imageContainer, styles.stackCard, styles.stackCard2]} />
            <View style={[styles.imageContainer, styles.stackCard, styles.stackCard1]} />
          </>
        )}
        <TouchableOpacity
          style={[styles.imageContainer, stacked && styles.stackMain]}
          onPress={() => setSelectedNyongGroup(item)}
          activeOpacity={0.8}
        >
          {representativeImage ? (
            <Image
              source={{ uri: representativeImage }}
              style={styles.image}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.image, { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 32, color: colors.textMuted }}>?</Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={styles.itemInfoOverlay}
          >
            <Text style={styles.itemLabel} numberOfLines={1}>{label}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFullscreenItem = ({ item }: { item: Delivery }) => {
    const imageUrl = getImageUrl(item);
    const hits = getHits(item);
    const tag = item.upload?.tag;
    const nyongName = item.upload?.nyong?.name;
    const dateStr = item.delivered_at
      ? (() => { const d = new Date(item.delivered_at); return `'${String(d.getFullYear()).slice(2)} ${d.getMonth() + 1} ${d.getDate()}`; })()
      : null;

    if (!imageUrl) return <View style={[styles.fullscreenPage, { height: viewerHeight }]} />;

    // 표시할 대상 이름 조합: 뇽이름 #태그
    const hasTarget = nyongName || tag;
    const targetText = [
      nyongName,
      tag ? `#${tag}` : null,
    ].filter(Boolean).join(' ');

    return (
      <View style={[styles.fullscreenPage, { height: viewerHeight }]}>
        <View style={styles.fullscreenImageWrapper}>
          <View style={styles.fullscreenImageFrame}>
            <PinchableImage
              source={{ uri: imageUrl }}
              style={styles.fullscreenImageFill}
              contentFit="cover"
              onPinchActive={setIsPinching}
            />
            {dateStr && (
              <Text style={styles.filmDate}>{dateStr}</Text>
            )}
          </View>
          {hits > 0 && (
            <View style={styles.fullscreenInfoContainer}>
              <Text style={styles.fullscreenPunchText}>
                {hasTarget ? (
                  <>
                    <Text style={styles.fullscreenTag}>{targetText}</Text>
                    {`에게 ${hits}뇽펀치를 날렸어요!`}
                  </>
                ) : (
                  `${hits}뇽펀치를 날렸어요!`
                )}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (selectedIndex !== null) {
    const fullscreenData = selectedNyongGroup ? selectedNyongGroup.deliveries : sortedItems;
    return (
      <View
        style={styles.fullscreenContainer}
        onLayout={(e) => setViewerHeight(e.nativeEvent.layout.height)}
      >
        <FlatList
          data={fullscreenData}
          renderItem={renderFullscreenItem}
          keyExtractor={(item) => `fs-${item.id}`}
          pagingEnabled
          scrollEnabled={!isPinching}
          showsVerticalScrollIndicator={false}
          initialScrollIndex={selectedIndex}
          getItemLayout={(_, index) => ({
            length: viewerHeight,
            offset: viewerHeight * index,
            index,
          })}
        />
        <TouchableOpacity
          style={[styles.fullscreenClose, { top: insets.top + 8 }]}
          onPress={() => setSelectedIndex(null)}
        >
          <Text style={styles.fullscreenCloseText}>{'\u00D7'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NotificationBanner
        visible={!!incomingCat}
        catImage={incomingCat?.image_url || ''}
        nickname={profile?.nickname}
        nyongName={incomingCat?.nyongName}
        onPress={handleNotificationPress}
        onDismiss={clearIncomingCat}
      />
      {isLoadingCats || (!session && !isTestMode) ? (
        // 세션 없으면 onboarding 리다이렉트 중 — 빈 화면 대신 스피너 유지
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : sortMode === 'name' && !selectedNyongGroup ? (
        <FlatList
          key="card-grid"
          data={groupedByNyong}
          renderItem={renderNyongCard}
          keyExtractor={(item) => `nyong-${item.nyongId ?? 'other'}`}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Image
                source={require('../../assets/nyong_hi.png')}
                style={styles.emptyImage}
                contentFit="contain"
              />
              <Text style={styles.emptyText}>
                {(() => {
                  const nickname = profile?.nickname || '집사';
                  const parts = t().gallery.emptyMessage.split('{nickname}');
                  return (
                    <>
                      {parts[0]}
                      <Text style={{ color: colors.primary, fontWeight: '600' }}>{nickname}</Text>
                      {parts[1]}
                    </>
                  );
                })()}
              </Text>
              {!notifGranted && (
                <TouchableOpacity style={styles.notifButton} onPress={handleEnableNotif}>
                  <Text style={styles.notifButtonText}>{t().gallery.emptyNotifButton}</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          ListHeaderComponent={
            groupedByNyong.length > 0 ? (
              <>
                <View style={styles.sortBar}>
                  {(['latest', 'punch', 'name'] as const).map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.sortChip, sortMode === mode && styles.sortChipActive]}
                      onPress={() => setSortMode(mode)}
                    >
                      <Text style={[styles.sortChipText, sortMode === mode && styles.sortChipTextActive]}>
                        {mode === 'latest' ? t().gallery.sortLatest : mode === 'punch' ? t().gallery.sortPunch : t().gallery.sortName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.extraGuideBanner}>
                  <Text style={styles.extraGuideText}>{t().gallery.nyongExtraGuide}</Text>
                </View>
              </>
            ) : null
          }
        />
      ) : (
        <FlatList
          key="photo-grid"
          data={selectedNyongGroup ? subGalleryData : sortedItems}
          renderItem={renderItem}
          keyExtractor={(item) => item ? `${item.id}` : 'plus-card'}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          onEndReached={sortMode === 'latest' ? fetchMoreDeliveries : undefined}
          onEndReachedThreshold={0.3}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Image
                source={require('../../assets/nyong_hi.png')}
                style={styles.emptyImage}
                contentFit="contain"
              />
              <Text style={styles.emptyText}>
                {(() => {
                  const nickname = profile?.nickname || '집사';
                  const parts = t().gallery.emptyMessage.split('{nickname}');
                  return (
                    <>
                      {parts[0]}
                      <Text style={{ color: colors.primary, fontWeight: '600' }}>{nickname}</Text>
                      {parts[1]}
                    </>
                  );
                })()}
              </Text>
              {!notifGranted && (
                <TouchableOpacity style={styles.notifButton} onPress={handleEnableNotif}>
                  <Text style={styles.notifButtonText}>{t().gallery.emptyNotifButton}</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          ListHeaderComponent={
            selectedNyongGroup ? (
              <View>
                <View style={styles.subGalleryTitleRow}>
                  <TouchableOpacity style={styles.subGalleryBackBtn} onPress={() => setSelectedNyongGroup(null)}>
                    <Text style={styles.subGalleryBackText}>{'←'}</Text>
                  </TouchableOpacity>
                  <Text style={styles.subGalleryTitle}>{selectedNyongGroup.nyongName} 갤러리</Text>
                  <View style={styles.subGalleryBackBtn} />
                </View>
                <View style={styles.subGalleryCard}>
                  {selectedNyongGroup.frontPhotoUrl && (
                    <Image source={{ uri: selectedNyongGroup.frontPhotoUrl }} style={styles.subGalleryPhoto} />
                  )}
                  {selectedNyongGroup.nyongId && (
                    <TouchableOpacity
                      style={styles.subGalleryIdCard}
                      onPress={() => router.push(`/nyong-id-card?nyongId=${selectedNyongGroup.nyongId}`)}
                    >
                      <Text style={styles.subGalleryIdCardText}>ID 카드</Text>
                    </TouchableOpacity>
                  )}
                  <View style={{ flex: 1 }} />
                  <View style={styles.subGalleryRow}>
                    <Text style={styles.subGalleryName}>{selectedNyongGroup.nyongName}</Text>
                    <Text style={styles.subGalleryStatText}>
                      <Text style={styles.subGalleryStatValue}>{selectedNyongGroup.photoCount}</Text>
                      {' 받음'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : sortedItems.length > 0 ? (
              <View style={styles.sortBar}>
                {(['latest', 'punch', 'name'] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.sortChip, sortMode === mode && styles.sortChipActive]}
                    onPress={() => setSortMode(mode)}
                  >
                    <Text style={[styles.sortChipText, sortMode === mode && styles.sortChipTextActive]}>
                      {mode === 'latest' ? t().gallery.sortLatest : mode === 'punch' ? t().gallery.sortPunch : t().gallery.sortName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyImage: {
    width: 160,
    height: 160,
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  notifButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.xl,
  },
  notifButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  sortChipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  grid: {
    padding: GRID_PADDING,
    gap: IMAGE_GAP,
  },
  gridRow: {
    gap: IMAGE_GAP,
  },
  subGalleryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subGalleryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  subGalleryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.xl,
  },
  subGalleryBackBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subGalleryBackText: {
    fontSize: 22,
    color: colors.text,
    fontWeight: '600',
  },
  subGalleryPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
  },
  subGalleryInfo: {
    flex: 1,
  },
  subGalleryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  subGalleryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  subGalleryStatText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  subGalleryStatValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
  },
  subGalleryIdCard: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  subGalleryIdCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  nyongExtraBtn: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    marginLeft: 6,
  },
  nyongExtraBtnDisabled: {
    backgroundColor: colors.surface,
  },
  nyongExtraBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  nyongExtraBtnTextDisabled: {
    color: colors.textMuted,
  },
  plusCard: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primaryBg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusCardIcon: {
    fontSize: 28,
    color: colors.textMuted,
    fontWeight: '300',
  },
  plusCardText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  extraGuideBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
  },
  extraGuideText: {
    fontSize: 13,
    color: colors.primary,
    textAlign: 'center',
  },
  stackWrapper: {
    width: imageSize,
    height: imageSize,
  },
  stackCard: {
    position: 'absolute',
    backgroundColor: colors.textMuted,
  },
  stackCard1: {
    top: 2,
    left: 2,
    transform: [{ rotate: '2deg' }],
  },
  stackCard2: {
    top: 4,
    left: -1,
    transform: [{ rotate: '-3deg' }],
  },
  stackMain: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  imageContainer: {
    width: imageSize,
    height: imageSize,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageLocked: {
    opacity: 0.6,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedDate: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 4,
  },
  lockedIcon: {
    fontSize: 28,
  },
  unseenBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unseenText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
    paddingBottom: 8,
    paddingHorizontal: 8,
    justifyContent: 'flex-end',
  },
  itemLabel: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: colors.fullscreenBg,
  },
  fullscreenPage: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImageWrapper: {
    width: width,
    alignItems: 'center',
  },
  fullscreenImage: {
    width: width,
    height: width,
  },
  fullscreenImageFrame: {
    width: width,
    height: width,
    overflow: 'hidden',
  },
  fullscreenImageFill: {
    ...StyleSheet.absoluteFillObject,
  },
  filmDate: {
    position: 'absolute',
    bottom: 14,
    right: 16,
    color: '#ff6a2a',
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(255, 80, 0, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    letterSpacing: 1,
  },
  fullscreenInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overlayMedium,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    marginTop: 24,
    gap: 8,
  },
  fullscreenPunchText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  fullscreenTag: {
    color: colors.primary,
    fontWeight: '700',
  },
  fullscreenClose: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseText: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginTop: -1,
  },
});
