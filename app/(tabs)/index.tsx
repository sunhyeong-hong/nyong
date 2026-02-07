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
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Delivery } from '../../types';
import { colors, radius } from '../../lib/theme';
import { NotificationBanner } from '../../components/NotificationBanner';
import { CatPaw } from '../../components/CatPaw';
import { t, format } from '../../lib/i18n';

const { width, height: screenHeight } = Dimensions.get('window');
const imageSize = (width - 48) / 3;

export default function GalleryScreen() {
  const router = useRouter();
  const { session, profile, isLoading, isTestMode, testReceivedCats, incomingCat, clearIncomingCat } = useAuth();
  const [items, setItems] = useState<Delivery[]>([]);
  const [isLoadingCats, setIsLoadingCats] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && !session && !isTestMode) {
      router.replace('/onboarding');
      return;
    }
    if (!isLoading && session && profile && !profile.nickname) {
      router.replace('/settings');
      return;
    }
  }, [session, profile, isLoading, isTestMode]);

  useEffect(() => {
    if (isTestMode) {
      setIsLoadingCats(false);
      return;
    }
    if (session?.user?.id) {
      fetchDeliveries();
    }
  }, [session, isTestMode]);

  const fetchDeliveries = async () => {
    setIsLoadingCats(true);
    try {
      const { data } = await supabase
        .from('deliveries')
        .select(`*, upload:uploads(*)`)
        .eq('receiver_id', session?.user?.id)
        .eq('status', 'delivered')
        .gt('hits', 0)
        .order('delivered_at', { ascending: false });

      console.log('=== fetchDeliveries Result ===');
      console.log('data count:', data?.length);
      console.log('data:', JSON.stringify(data, null, 2));
      setItems(data || []);
    } catch (error) {
      console.log('Error fetching gallery:', error);
    } finally {
      setIsLoadingCats(false);
    }
  };

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
    console.log('=== getHits Debug ===');
    console.log('item:', JSON.stringify(item, null, 2));
    console.log('item.hits:', item.hits);
    return item.hits || 0;
  };

  const renderItem = ({ item, index }: { item: Delivery; index: number }) => {
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
        {getHits(item) > 0 && (
          <View style={styles.hitsOverlay}>
            <CatPaw width={16} height={16} />
            <Text style={styles.hitsOverlayText}>{getHits(item)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFullscreenItem = ({ item }: { item: Delivery }) => {
    const imageUrl = getImageUrl(item);
    const hits = getHits(item);
    const tag = item.upload?.tag;

    if (!imageUrl) return <View style={styles.fullscreenPage} />;

    return (
      <View style={styles.fullscreenPage}>
        <View style={styles.fullscreenImageWrapper}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
          {hits > 0 && (
            <View style={styles.fullscreenInfoContainer}>
              <CatPaw width={22} height={22} />
              <Text style={styles.fullscreenPunchText}>
                {tag && <Text style={styles.fullscreenTag}>#{tag}</Text>}
                {tag ? `에게 ${hits}뇽펀치를 날렸어요!` : `${hits}뇽펀치를 날렸어요!`}
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
    return (
      <View style={styles.fullscreenContainer}>
        <FlatList
          data={items}
          renderItem={renderFullscreenItem}
          keyExtractor={(item) => `fs-${item.id}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={selectedIndex}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
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
      <NotificationBanner
        visible={!!incomingCat}
        catImage={incomingCat?.image_url || ''}
        onPress={handleNotificationPress}
        onDismiss={clearIncomingCat}
      />
      {isLoadingCats ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t().gallery.emptyTitle}</Text>
          <Text style={styles.emptySubText}>{t().gallery.emptySubtitle}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.id}`}
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
  hitsOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radius.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hitsOverlayText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenPage: {
    width: width,
    height: '100%',
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
  fullscreenInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    top: 56,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginTop: -1,
  },
});
