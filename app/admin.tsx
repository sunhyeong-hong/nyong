import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Cat } from '../types';

export default function AdminScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [cats, setCats] = useState<Cat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'hits'>('date');

  useEffect(() => {
    if (!profile?.is_admin) {
      Alert.alert('권한 없음', '관리자만 접근할 수 있습니다.');
      router.back();
      return;
    }
    fetchCats();
  }, [profile, filter, sortBy]);

  const fetchCats = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('cats').select('*');

      if (filter === 'active') {
        query = query.eq('is_active', true);
      } else if (filter === 'inactive') {
        query = query.eq('is_active', false);
      }

      if (sortBy === 'date') {
        query = query.order('deployed_at', { ascending: false });
      } else {
        query = query.order('total_hits', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      setCats(data || []);
    } catch (error) {
      console.log('Error fetching cats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadCat = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    setIsUploading(true);
    try {
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const fileName = `cats/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('cats')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('cats')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('cats').insert({
        image_url: urlData.publicUrl,
        is_active: true,
      });

      if (dbError) throw dbError;

      Alert.alert('성공', '고양이가 추가되었습니다.');
      fetchCats();
    } catch (error) {
      console.log('Upload error:', error);
      Alert.alert('오류', '업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleCatStatus = async (cat: Cat) => {
    try {
      const { error } = await supabase
        .from('cats')
        .update({ is_active: !cat.is_active })
        .eq('id', cat.id);

      if (error) throw error;
      fetchCats();
    } catch (error) {
      Alert.alert('오류', '상태 변경에 실패했습니다.');
    }
  };

  const renderCatItem = ({ item }: { item: Cat }) => (
    <View style={styles.catItem}>
      <Image source={{ uri: item.image_url }} style={styles.catImage} />
      <View style={styles.catInfo}>
        <Text style={styles.catStats}>
          배포: {item.distributed_count} | 터치: {item.total_hits}
        </Text>
        <Text style={styles.catDate}>
          {new Date(item.deployed_at).toLocaleDateString('ko-KR')}
        </Text>
      </View>
      <TouchableOpacity
        style={[
          styles.statusButton,
          item.is_active ? styles.activeButton : styles.inactiveButton,
        ]}
        onPress={() => toggleCatStatus(item)}
      >
        <Text style={styles.statusButtonText}>
          {item.is_active ? '활성' : '비활성'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleUploadCat}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.uploadButtonText}>+ 고양이 추가</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <View style={styles.filterGroup}>
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, filter === f && styles.filterActive]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f && styles.filterTextActive,
                ]}
              >
                {f === 'all' ? '전체' : f === 'active' ? '활성' : '비활성'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.sortGroup}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'date' && styles.sortActive]}
            onPress={() => setSortBy('date')}
          >
            <Text
              style={[
                styles.sortText,
                sortBy === 'date' && styles.sortTextActive,
              ]}
            >
              날짜순
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'hits' && styles.sortActive]}
            onPress={() => setSortBy('hits')}
          >
            <Text
              style={[
                styles.sortText,
                sortBy === 'hits' && styles.sortTextActive,
              ]}
            >
              터치순
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#FF6B9D" size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={cats}
          renderItem={renderCatItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>등록된 고양이가 없습니다</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F7',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  uploadButton: {
    backgroundColor: '#FF6B9D',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  filters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fff',
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  filterActive: {
    backgroundColor: '#FF6B9D',
  },
  filterText: {
    fontSize: 13,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  sortGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sortActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B9D',
  },
  sortText: {
    fontSize: 13,
    color: '#888',
  },
  sortTextActive: {
    color: '#FF6B9D',
    fontWeight: '600',
  },
  loader: {
    marginTop: 40,
  },
  list: {
    padding: 16,
  },
  catItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  catImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  catInfo: {
    flex: 1,
    marginLeft: 12,
  },
  catStats: {
    fontSize: 14,
    color: '#333',
  },
  catDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeButton: {
    backgroundColor: '#4CAF50',
  },
  inactiveButton: {
    backgroundColor: '#999',
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
  },
});
