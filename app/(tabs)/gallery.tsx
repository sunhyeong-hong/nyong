import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ReceivedCat, Upload } from '../../types';

const { width } = Dimensions.get('window');
const imageSize = (width - 48) / 3;

type GalleryItem = (ReceivedCat | Upload) & { type: 'received' | 'uploaded' };

export default function GalleryScreen() {
  const { session, isTestMode, testUploads, testReceivedCats } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'received' | 'uploaded'>('all');

  useEffect(() => {
    if (isTestMode) {
      // 테스트 모드: testUploads와 testReceivedCats를 갤러리 아이템으로 변환
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

  const renderItem = ({ item }: { item: GalleryItem }) => {
    const imageUrl = getImageUrl(item);
    if (!imageUrl) return null;

    return (
      <TouchableOpacity
        style={styles.imageContainer}
        onPress={() => setSelectedImage(imageUrl)}
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
      </TouchableOpacity>
    );
  };

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

      {isLoading ? (
        <ActivityIndicator size="large" color="#FF6B9D" style={styles.loader} />
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

      <Modal visible={!!selectedImage} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
        >
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F7',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
  },
  filterButtonActive: {
    backgroundColor: '#FF6B9D',
    borderColor: '#FF6B9D',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
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
    color: '#333',
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  grid: {
    padding: 12,
  },
  imageContainer: {
    width: imageSize,
    height: imageSize,
    margin: 6,
    borderRadius: 8,
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
    backgroundColor: '#FF6B9D',
  },
  uploadedBadge: {
    backgroundColor: '#4CAF50',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: width,
    height: width,
  },
});
