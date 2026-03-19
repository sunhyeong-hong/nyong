import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, radius, formatCount } from '../../lib/theme';
import { t, format } from '../../lib/i18n';
import { Nyong } from '../../types';
import { CatPaw } from '../../components/CatPaw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { MOCK_TOP_NYONGS } from '../../lib/mockData';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_PADDING = 20;
const CARD_WIDTH = (width - CARD_PADDING * 2 - CARD_GAP) / 2;
const FULL_WIDTH = width - CARD_PADDING * 2;

export default function HallOfFameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isTestMode } = useAuth();
  const [topNyongs, setTopNyongs] = useState<Nyong[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    if (isTestMode) {
      setTopNyongs(MOCK_TOP_NYONGS);
      setIsLoading(false);
      return;
    }
    // 캐시 먼저 보여주고 서버에서 갱신
    AsyncStorage.getItem(`hall_of_fame_${timeRange}`).then((raw) => {
      if (raw) {
        setTopNyongs(JSON.parse(raw));
        setIsLoading(false);
      }
      fetchTopNyongs(timeRange);
    }).catch(() => fetchTopNyongs(timeRange));
  }, [isTestMode, timeRange]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { data } = await supabase.rpc('get_top_nyongs', { limit_count: 5, time_range: timeRange });
      setTopNyongs(data || []);
    } finally {
      setIsRefreshing(false);
    }
  }, [timeRange]);

  const fetchTopNyongs = async (range: string) => {
    try {
      const { data, error } = await supabase.rpc('get_top_nyongs', {
        limit_count: 5,
        time_range: range,
      });

      if (error) throw error;
      setTopNyongs(data || []);
      AsyncStorage.setItem(`hall_of_fame_${range}`, JSON.stringify(data || [])).catch(() => {});
    } catch (error) {
      console.error('Failed to fetch top nyongs:', error);
      // 오프라인이면 캐시 데이터 유지
    } finally {
      setIsLoading(false);
    }
  };

  const getHeaderTitle = () => {
    switch (timeRange) {
      case 'daily':
        return t().hallOfFame.headerTitleDaily;
      case 'weekly':
        return t().hallOfFame.headerTitleWeekly;
      default:
        return format(t().hallOfFame.headerTitle, { month: new Date().getMonth() + 1 });
    }
  };

  const getPhotoUrl = (item: Nyong) =>
    timeRange === 'daily' ? (item.top_upload_photo_url ?? item.front_photo_url) : item.front_photo_url;

  const FILTERS = [
    { key: 'daily' as const, label: t().hallOfFame.filterDaily },
    { key: 'weekly' as const, label: t().hallOfFame.filterWeekly },
    { key: 'monthly' as const, label: t().hallOfFame.filterMonthly },
  ];

  const PAW_IMAGES: Record<number, any> = {
    2: require('../../assets/paw_2.png'),
    3: require('../../assets/paw_3.png'),
    4: require('../../assets/paw_4.png'),
    5: require('../../assets/paw_5.png'),
  };


  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
      {/* 헤더 */}
      <View style={styles.headerSection}>
        <Image
          source={require('../../assets/nyong_punch.png')}
          style={styles.headerImage}
          contentFit="contain"
        />
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterTab, timeRange === f.key && styles.filterTabActive]}
                onPress={() => {
                  if (timeRange !== f.key) {
                    setTimeRange(f.key);
                  }
                }}
              >
                <Text style={[styles.filterTabText, timeRange === f.key && styles.filterTabTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {topNyongs.length > 0 ? (
        <View style={styles.grid}>
          {/* 1등: 풀너비 */}
          {topNyongs.length > 0 && (() => {
            const first = topNyongs[0];
            return (
              <TouchableOpacity
                key={first.id}
                style={styles.firstCard}
                onPress={() => router.push(`/nyong-gallery?nyongId=${first.id}`)}
              >
                <View style={styles.photoWrapper}>
                  <Image
                    source={{ uri: getPhotoUrl(first) }}
                    style={styles.firstPhoto}
                  />
                  <View style={styles.firstRankBadge}>
                    <Image
                      source={require('../../assets/crown.png')}
                      style={styles.firstCrownImage}
                      contentFit="contain"
                    />
                  </View>
                </View>
                <View style={styles.firstCardInfo}>
                  <Text style={styles.firstName} numberOfLines={1}>{first.name}</Text>
                  <Text style={styles.firstHitsText}>
                    {format(t().hallOfFame.monthlyHits, { count: formatCount(first.monthly_hits) })}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })()}
          {/* 2등~: 2열 */}
          {topNyongs.slice(1).map((item, index) => {
            const rank = index + 2;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => router.push(`/nyong-gallery?nyongId=${item.id}`)}
              >
                <View style={styles.photoWrapper}>
                  <Image
                    source={{ uri: getPhotoUrl(item) }}
                    style={styles.photo}
                  />
                  <View style={styles.rankBadge}>
                    <Image
                      source={PAW_IMAGES[rank]}
                      style={styles.rankPawImage}
                      contentFit="contain"
                    />
                  </View>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.hitsText}>
                    {format(t().hallOfFame.monthlyHits, { count: formatCount(item.monthly_hits) })}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Image
            source={require('../../assets/nyong_crown.png')}
            style={styles.emptyImage}
            contentFit="contain"
          />
          <Text style={styles.emptyText}>{t().hallOfFame.empty}</Text>
        </View>
      )}
      {timeRange === 'monthly' && (
        <View style={styles.rewardInfoCard}>
          <Text style={styles.rewardInfo}>{t().hallOfFame.rewardInfo}</Text>
        </View>
      )}
    </ScrollView>
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
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: CARD_PADDING,
    paddingTop: 0,
    marginBottom: -20,
    gap: 0,
  },
  headerImage: {
    width: 120,
    height: 120,
  },
  headerRight: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.white,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: CARD_PADDING,
    gap: CARD_GAP,
  },
  firstCard: {
    width: FULL_WIDTH,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  firstPhoto: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  firstRankBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  firstCrownImage: {
    width: 36,
    height: 36,
  },
  firstCardInfo: {
    padding: 14,
    alignItems: 'center',
  },
  firstName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  firstHitsText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  photoWrapper: {
    position: 'relative',
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
  },
  rankBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
  },
  rankPawImage: {
    width: 45,
    height: 45,
  },
  cardInfo: {
    padding: 12,
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  hitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hitsText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  rewardInfoCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginHorizontal: CARD_PADDING,
    marginTop: 8,
    marginBottom: 30,
    padding: 14,
  },
  rewardInfo: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
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
});
