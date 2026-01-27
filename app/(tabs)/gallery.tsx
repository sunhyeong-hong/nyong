import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ReceivedCat, Upload } from '../../types';
import { colors, radius } from '../../lib/theme';

const { width, height: screenHeight } = Dimensions.get('window');
const imageSize = (width - 48) / 3;

type GalleryItem = (ReceivedCat | Upload) & { type: 'received' | 'uploaded' };

export default function GalleryScreen() {
  const { session, isTestMode, testUploads, testReceivedCats } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'received' | 'uploaded'>('all');

  useEffect(() => {
    if (isTestMode) {
      const results: GalleryItem[] = [];

      if (filter === 'all' || filter === 'received') {
        const receivedItems: GalleryItem[] = testReceivedCats.map((cat) => ({
          ...cat,
          type: 'received' as const,
        }));
        results.push(...receivedItems);
      }

      if (filter === 'all' || filter === 'uploaded') {
        const uploadItems: GalleryItem[] = testUploads.map((upload) => ({
          ...upload,
          type: 'uploaded' as const,
        }));
        results.push(...uploadItems);
      }

      setItems(results);
      setIsLoading(false);
      return;
    }
    if (session?.user?.id) {
      fetchGalleryItems();
    }
  }, [session, filter, isTestMode, testUploads, testReceivedCats]);

  const fetchGalleryItems = async () => {
    setIsLoading(true);
    try {
      const results: GalleryItem[] = [];

      if (filter === 'all' || filter === 'received') {
        const { data: receivedData } = await supabase
          .from('received_cats')
          .select(`*, cat:cats(*)`)
          .eq('user_id', session?.user?.id)
          .order('received_at', { ascending: false });

        if (receivedData) {
          results.push(
            ...receivedData.map((item) => ({ ...item, type: 'received' as const }))
          );
        }
      }

      if (filter === 'all' || filter === 'uploaded') {
        const { data: uploadData } = await supabase
          .from('uploads')
          .select('*')
          .eq('user_id', session?.user?.id)
          .order('uploaded_at', { ascending: false });

        if (uploadData) {
          results.push(
            ...uploadData.map((item) => ({ ...item, type: 'uploaded' as const }))
          );
        }
      }

      setItems(results);
    } catch (error) {
      console.log('Error fetching gallery:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getImageUrl = (item: GalleryItem) => {
    if (item.type === 'received' && 'cat' in item && item.cat) {
      return item.cat.image_url;
    }
    if (item.type === 'uploaded' && 'image_url' in item) {
      return item.image_url;
    }
    return null;
  };

  const getHits = (item: GalleryItem) => {
    return item.hits || 0;
  };

  const uploadedItems = items.filter((i) => i.type === 'uploaded');
  const totalUploadCount = uploadedItems.length;
  const totalUploadHits = uploadedItems.reduce((sum, i) => sum + getHits(i), 0);

  const renderItem = ({ item, index }: { item: GalleryItem; index: number }) => {
    const imageUrl = getImageUrl(item);
    if (!imageUrl) return null;

    return (
      <TouchableOpacity
        style={styles.imageContainer}
        onPress={() => setSelectedIndex(index)}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
        <View
          style={[
            styles.badge,
            item.type === 'received' ? styles.receivedBadge : styles.uploadedBadge,
          ]}
        >
          <Text style={styles.badgeText}>
            {item.type === 'received' ? 'R' : 'U'}
          </Text>
        </View>
        {getHits(item) > 0 && (
          <View style={styles.hitsOverlay}>
            <Text style={styles.hitsOverlayText}>{getHits(item)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFullscreenItem = ({ item }: { item: GalleryItem }) => {
    const imageUrl = getImageUrl(item);
    if (!imageUrl) return <View style={styles.fullscreenPage} />;

    return (
      <View style={styles.fullscreenPage}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.fullscreenImage}
          resizeMode="contain"
        />
        <View style={styles.fullscreenOverlay}>
          <View style={[
            styles.fullscreenBadge,
            item.type === 'received' ? styles.receivedBadge : styles.uploadedBadge,
          ]}>
            <Text style={styles.fullscreenBadgeText}>
              {item.type === 'received' ? '받은 고양이' : '업로드'}
            </Text>
          </View>
          {getHits(item) > 0 && (
            <Text style={styles.fullscreenHits}>{getHits(item)} 뇽펀치</Text>
          )}
        </View>
      </View>
    );
  };

  if (selectedIndex !== null) {
    return (
      <View style={styles.fullscreenContainer}>
        <FlatList
          data={items}
          renderItem={renderFullscreenItem}
          keyExtractor={(item) => `fs-${item.type}-${item.id}`}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          initialScrollIndex={selectedIndex}
          getItemLayout={(_, index) => ({
            length: screenHeight,
            offset: screenHeight * index,
            index,
          })}
        />
        <TouchableOpacity
          style={styles.fullscreenClose}
          onPress={() => setSelectedIndex(null)}
        >
          <Text style={styles.fullscreenCloseText}>×</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        {(['all', 'received', 'uploaded'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f === 'all' ? '전체' : f === 'received' ? '받은 고양이' : '업로드'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filter === 'uploaded' && items.length > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalUploadCount}</Text>
            <Text style={styles.summaryLabel}>총 업로드</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalUploadHits}</Text>
            <Text style={styles.summaryLabel}>총 뇽펀치</Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>아직 갤러리가 비어있어요</Text>
          <Text style={styles.emptySubText}>고양이를 받거나 업로드해보세요!</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          numColumns={3}
          contentContainerStyle={styles.grid}
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
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: radius.xl,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  grid: {
    padding: 12,
  },
  imageContainer: {
    width: imageSize,
    height: imageSize,
    margin: 6,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receivedBadge: {
    backgroundColor: colors.primary,
  },
  uploadedBadge: {
    backgroundColor: colors.success,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  hitsOverlay: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hitsOverlayText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Fullscreen vertical swipe viewer
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenPage: {
    width: width,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: width,
    height: width,
  },
  fullscreenOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fullscreenBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.xl,
  },
  fullscreenBadgeText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  fullscreenHits: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  fullscreenClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseText: {
    fontSize: 24,
    color: colors.white,
    fontWeight: 'bold',
  },
});
