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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Cat } from '../types';
import { colors, radius } from '../lib/theme';
import { CalendarPicker } from '../components/CalendarPicker';
import { Toast } from '../components/Toast';

export default function AdminScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [cats, setCats] = useState<Cat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'distributed' | 'hits'>('date');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const isAdmin = profile?.is_admin || profile?.nickname === 'admin';

  useEffect(() => {
    if (!isAdmin) {
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
      } else if (sortBy === 'hits') {
        query = query.order('total_hits', { ascending: false });
      } else {
        query = query.order('distributed_count', { ascending: false });
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

  const getFilteredCats = () => {
    if (!selectedDate) return cats;
    return cats.filter((cat) => {
      const catDate = new Date(cat.deployed_at).toISOString().split('T')[0];
      return catDate === selectedDate;
    });
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

      setToast({ visible: true, message: '고양이가 추가되었습니다.' });
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

  const displayedCats = getFilteredCats();

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
    <>
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleUploadCat}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color={colors.white} size="small" />
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
          {([
            { key: 'date', label: '시간순' },
            { key: 'distributed', label: '배포수순' },
            { key: 'hits', label: '터치순' },
          ] as const).map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.sortButton, sortBy === s.key && styles.sortActive]}
              onPress={() => setSortBy(s.key)}
            >
              <Text
                style={[
                  styles.sortText,
                  sortBy === s.key && styles.sortTextActive,
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.dateFilterRow}>
        <TouchableOpacity
          style={[styles.dateButton, showCalendar && styles.dateButtonActive]}
          onPress={() => setShowCalendar(!showCalendar)}
        >
          <Text style={[styles.dateButtonText, showCalendar && styles.dateButtonTextActive]}>
            {selectedDate || '날짜 선택'}
          </Text>
        </TouchableOpacity>
        {selectedDate && (
          <TouchableOpacity
            style={styles.clearDateButton}
            onPress={() => {
              setSelectedDate(null);
              setShowCalendar(false);
            }}
          >
            <Text style={styles.clearDateText}>초기화</Text>
          </TouchableOpacity>
        )}
      </View>

      {showCalendar && (
        <View style={styles.calendarContainer}>
          <CalendarPicker
            selectedDate={selectedDate}
            onDateSelect={(date) => {
              setSelectedDate(date);
              setShowCalendar(false);
            }}
          />
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={displayedCats}
          renderItem={renderCatItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>등록된 고양이가 없습니다</Text>
          }
        />
      )}
    </View>
    <Toast
      visible={toast.visible}
      message={toast.message}
      onHide={() => setToast({ visible: false, message: '' })}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  filters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: colors.white,
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.xl,
    backgroundColor: colors.filterBg,
  },
  filterActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
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
    borderBottomColor: colors.primary,
  },
  sortText: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  sortTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.xl,
    backgroundColor: colors.filterBg,
  },
  dateButtonActive: {
    backgroundColor: colors.primaryLight,
  },
  dateButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  dateButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  clearDateButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearDateText: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  calendarContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  loader: {
    marginTop: 40,
  },
  list: {
    padding: 16,
  },
  catItem: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  catImage: {
    width: 60,
    height: 60,
    borderRadius: radius.xl,
  },
  catInfo: {
    flex: 1,
    marginLeft: 12,
  },
  catStats: {
    fontSize: 14,
    color: colors.text,
  },
  catDate: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.xl,
  },
  activeButton: {
    backgroundColor: colors.success,
  },
  inactiveButton: {
    backgroundColor: colors.inactive,
  },
  statusButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textTertiary,
    marginTop: 40,
  },
});
