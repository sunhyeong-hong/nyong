import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Animated,
  Alert,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { colors, radius, formatCount } from '../lib/theme';
import { Upload, Nyong } from '../types';
import { PinchableImage } from '../components/PinchableImage';
import { t } from '../lib/i18n';

const { width, height } = Dimensions.get('window');
const GRID_PADDING = 20;
const PHOTO_GAP = 8;
const PHOTO_SIZE = (width - GRID_PADDING * 2 - PHOTO_GAP * 2) / 3;

const RANK_LABELS = ['1등', '2등', '3등'];

function RollingPuncher({ items }: { items: { nickname: string; totalHits: number }[] }) {
  const [index, setIndex] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      // 위로 올라가며 사라짐
      Animated.parallel([
        Animated.timing(translateY, { toValue: -14, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        // 아래에서 시작 위치로 리셋 후 다음 항목으로
        translateY.setValue(14);
        setIndex((prev) => (prev + 1) % items.length);
        // 아래에서 위로 올라오며 나타남
        Animated.parallel([
          Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]).start();
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [items.length]);

  const item = items[index];
  return (
    <View style={rollingStyles.container}>
      <Animated.Text style={[rollingStyles.text, { opacity, transform: [{ translateY }] }]}>
        {RANK_LABELS[index]} {item.nickname}님 {item.totalHits}뇽펀치
      </Animated.Text>
    </View>
  );
}

const rollingStyles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
});

export default function NyongGalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { nyongId } = useLocalSearchParams<{ nyongId: string }>();
  const [nyong, setNyong] = useState<Nyong | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewerHeight, setViewerHeight] = useState(height);
  const fullscreenListRef = useRef<FlatList>(null);
  const [topPunchers, setTopPunchers] = useState<Record<number, { nickname: string; totalHits: number }[]>>({});
  const [showProfilePhoto, setShowProfilePhoto] = useState(false);

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

  useFocusEffect(
    useCallback(() => {
      if (nyongId) {
        fetchNyongAndUploads();
      }
    }, [nyongId])
  );

  useEffect(() => {
    if (selectedIndex === null) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedIndex(null);
      return true;
    });
    return () => handler.remove();
  }, [selectedIndex]);

  // viewerHeight가 확정된 후 선택한 사진으로 스크롤
  useEffect(() => {
    if (selectedIndex !== null && viewerHeight > 0) {
      requestAnimationFrame(() => {
        fullscreenListRef.current?.scrollToIndex({ index: selectedIndex, animated: false });
      });
    }
  }, [selectedIndex, viewerHeight]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchNyongAndUploads();
    } finally {
      setIsRefreshing(false);
    }
  }, [nyongId]);

  const fetchNyongAndUploads = async () => {
    try {
      // 뇽 정보 가져오기
      const { data: nyongData, error: nyongError } = await supabase
        .from('nyongs')
        .select('*')
        .eq('id', nyongId)
        .single();

      if (nyongError) throw nyongError;

      // 해당 뇽의 업로드 사진들 + hits 합산 (RPC로 RLS 우회)
      const { data: uploadsData, error: uploadsError } = await supabase.rpc(
        'get_nyong_uploads',
        { target_nyong_id: parseInt(nyongId), delivered_only: true }
      );

      if (uploadsError) throw uploadsError;

      const fetchedUploads = uploadsData || [];
      setUploads(fetchedUploads);

      // 각 사진별 최다 뇽펀치 유저 조회
      const punchers: Record<number, { nickname: string; totalHits: number }[]> = {};
      await Promise.all(
        fetchedUploads.map(async (u: Upload) => {
          const { data } = await supabase.rpc('get_top_puncher', { target_upload_id: u.id });
          if (data && data.length > 0) {
            punchers[u.id] = data.map((d: { nickname: string; total_hits: number }) => ({
              nickname: d.nickname,
              totalHits: Number(d.total_hits),
            }));
          }
        })
      );
      setTopPunchers(punchers);

      // uploads에서 실제 hits 합산하여 nyong stats 보정
      const calculatedTotalHits = fetchedUploads.reduce((sum: number, u: { hits: number }) => sum + (u.hits || 0), 0);
      const calculatedMonthlyHits = fetchedUploads.reduce((sum: number, u: { monthly_hits?: number }) => sum + (u.monthly_hits || 0), 0);
      if (nyongData) {
        setNyong({
          ...nyongData,
          total_hits: calculatedTotalHits,
          monthly_hits: calculatedMonthlyHits,
          upload_count: fetchedUploads.length,
        });
      }
    } catch (error) {
      console.error('Failed to fetch nyong gallery:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPhotoItem = ({ item, index }: { item: Upload; index: number }) => (
    <TouchableOpacity
      style={styles.photoItem}
      onPress={() => setSelectedIndex(index)}
      onLongPress={() => handleReport(item.id)}
      delayLongPress={500}
    >
      <Image
        source={{ uri: item.image_url }}
        style={styles.photoImage}
        contentFit="cover"
      />
      {item.hits > 0 && (
        <View style={styles.hitsOverlay}>
          <Text style={styles.hitsOverlayText}>{formatCount(item.hits)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );


  // 전체화면 모드
  if (selectedIndex !== null) {
    return (
      <View
        style={styles.fullscreenContainer}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          setViewerHeight(h);
        }}
      >
        <FlatList
          ref={fullscreenListRef}
          data={uploads}
          scrollEnabled={!isPinching}
          renderItem={({ item }) => (
            <View style={[styles.fullscreenPage, { height: viewerHeight }]}>
              <PinchableImage
                source={{ uri: item.image_url }}
                style={styles.fullscreenImage}
                contentFit="contain"
                onPinchActive={setIsPinching}
              />
              <View style={styles.fullscreenInfo}>
                <Text style={styles.fullscreenHits}>
                  {item.tag ? (
                    <>
                      <Text style={styles.fullscreenTag}>#{item.tag}</Text>
                      {` ${item.hits}뇽펀치 받았어요!`}
                    </>
                  ) : (
                    `${item.hits}뇽펀치 받았어요!`
                  )}
                </Text>
              </View>
              {topPunchers[item.id]?.length > 0 && (
                <RollingPuncher items={topPunchers[item.id]} />
              )}
            </View>
          )}
          keyExtractor={(item) => `fs-${item.id}`}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({
            length: viewerHeight,
            offset: viewerHeight * index,
            index,
          })}
        />
        <TouchableOpacity
          style={[styles.fullscreenClose, { top: insets.top + 12 }]}
          onPress={() => setSelectedIndex(null)}
        >
          <Text style={styles.fullscreenCloseText}>×</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{nyong?.name || '뇽'} 갤러리</Text>
        <View style={styles.backButton} />
      </View>

      {/* 뇽 정보 카드 */}
      {nyong && (
        <View style={styles.nyongCard}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setShowProfilePhoto(true)}>
            <Image
              source={{ uri: nyong.front_photo_url }}
              style={styles.nyongPhoto}
            />
          </TouchableOpacity>
          <View style={styles.nyongInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.nyongName}>{nyong.name}</Text>
              <TouchableOpacity
                style={styles.idCardButton}
                onPress={() => router.push(`/nyong-id-card?nyongId=${nyongId}`)}
              >
                <Text style={styles.idCardButtonText}>ID 카드 보기</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCount(nyong.upload_count)}</Text>
                <Text style={styles.statLabel}>업로드</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCount(nyong.total_hits)}</Text>
                <Text style={styles.statLabel}>총 뇽펀치</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCount(nyong.monthly_hits)}</Text>
                <Text style={styles.statLabel}>이번 달</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 프로필 사진 원본보기 */}
      {nyong && (
        <Modal visible={showProfilePhoto} transparent animationType="fade" onRequestClose={() => setShowProfilePhoto(false)}>
          <TouchableOpacity style={styles.profileModal} activeOpacity={1} onPress={() => setShowProfilePhoto(false)}>
            <TouchableOpacity style={styles.profileCloseButton} onPress={() => setShowProfilePhoto(false)}>
              <Text style={styles.profileCloseText}>✕</Text>
            </TouchableOpacity>
            <Image
              source={{ uri: nyong.front_photo_url }}
              style={styles.profileModalImage}
              contentFit="contain"
            />
          </TouchableOpacity>
        </Modal>
      )}

      {/* 사진 그리드 */}
      {uploads.length > 0 ? (
        <FlatList
          data={uploads}
          renderItem={renderPhotoItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={3}
          contentContainerStyle={styles.photoGrid}
          columnWrapperStyle={styles.photoRow}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Image
            source={require('../assets/nyong_fish.png')}
            style={styles.emptyImage}
            contentFit="contain"
          />
          <Text style={styles.emptyText}>아직 업로드된 사진이 없어요</Text>
          {nyong?.owner_id === session?.user?.id && (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => router.push(`/(tabs)/upload?nyongId=${nyongId}`)}
            >
              <Text style={styles.uploadButtonText}>첫 사진 올리기</Text>
            </TouchableOpacity>
          )}
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: colors.text,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  nyongCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: radius.xl,
  },
  nyongPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  nyongInfo: {
    flex: 1,
  },
  nameRow: {
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  idCardButton: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  idCardButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  photoGrid: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 20,
    gap: PHOTO_GAP,
  },
  photoRow: {
    gap: PHOTO_GAP,
  },
  photoItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  hitsOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overlayMedium,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
    gap: 4,
  },
  hitsOverlayText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyImage: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  uploadButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.xl,
  },
  uploadButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // 전체화면 스타일
  fullscreenContainer: {
    flex: 1,
    backgroundColor: colors.fullscreenBg,
  },
  fullscreenPage: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: width,
    height: width,
  },
  fullscreenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overlayMedium,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    marginTop: 24,
    gap: 8,
  },
  fullscreenHits: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  fullscreenTag: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  fullscreenClose: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseText: {
    fontSize: 20,
    color: colors.whiteTranslucent,
    fontWeight: '500',
    marginTop: -1,
  },
  profileModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCloseText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  profileModalImage: {
    width: width,
    height: height,
  },
});
