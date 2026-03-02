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

  useEffect(() => {
    if (isTestMode) {
      setTopNyongs(MOCK_TOP_NYONGS);
      setIsLoading(false);
      return;
    }
    fetchTopNyongs();
  }, [isTestMode]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { data } = await supabase.rpc('get_top_nyongs', { limit_count: 5 });
      setTopNyongs(data || []);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const fetchTopNyongs = async () => {
    try {
      const { data, error } = await supabase.rpc('get_top_nyongs', {
        limit_count: 5,
      });

      if (error) throw error;
      setTopNyongs(data || []);
    } catch (error) {
      console.error('Failed to fetch top nyongs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '\u{1F451}';
      case 2:
        return '\u{1F948}';
      case 3:
        return '\u{1F949}';
      default:
        return `${rank}`;
    }
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
        <Text style={styles.headerTitle}>{format(t().hallOfFame.headerTitle, { month: new Date().getMonth() + 1 })}</Text>
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
                    source={{ uri: first.front_photo_url }}
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
                  <View style={styles.hitsRow}>
                    <CatPaw width={16} height={16} />
                    <Text style={styles.firstHitsText}>
                      {format(t().hallOfFame.monthlyHits, { count: formatCount(first.monthly_hits) })}
                    </Text>
                  </View>
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
                    source={{ uri: item.front_photo_url }}
                    style={styles.photo}
                  />
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankEmoji}>{getRankEmoji(rank)}</Text>
                  </View>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.hitsRow}>
                    <CatPaw width={14} height={14} />
                    <Text style={styles.hitsText}>
                      {format(t().hallOfFame.monthlyHits, { count: formatCount(item.monthly_hits) })}
                    </Text>
                  </View>
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
      <Text style={styles.rewardInfo}>{t().hallOfFame.rewardInfo}</Text>
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
    marginBottom: -12,
    gap: 0,
  },
  headerImage: {
    width: 120,
    height: 120,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
    textAlign: 'center',
    marginRight: 20,
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
    width: 32,
    height: 32,
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
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  rankEmoji: {
    fontSize: 18,
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
  rewardInfo: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 30,
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
