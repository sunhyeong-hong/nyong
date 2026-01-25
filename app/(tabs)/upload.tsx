import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Upload } from '../../types';

export default function UploadScreen() {
  const { session, isTestMode, testUploads, addTestUpload } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isTestMode) {
      setIsLoading(false);
      return;
    }
    if (session?.user?.id) {
      fetchUploads();
    }
  }, [session, isTestMode]);

  const fetchUploads = async () => {
    try {
      const { data, error } = await supabase
        .from('uploads')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setUploads(data || []);
    } catch (error) {
      console.log('Error fetching uploads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const uploadImage = async () => {
    if (!selectedImage) return;

    // 테스트 모드에서는 로컬에서만 시뮬레이션
    if (isTestMode) {
      setIsUploading(true);
      // 업로드 시뮬레이션
      setTimeout(() => {
        const mockUpload: Upload = {
          id: Date.now(),
          user_id: 'test-admin-id',
          image_url: selectedImage,
          hits: 0,
          uploaded_at: new Date().toISOString(),
        };
        addTestUpload(mockUpload);
        Alert.alert('성공', '고양이 사진이 업로드되었습니다! (테스트 모드)');
        setSelectedImage(null);
        setIsUploading(false);
      }, 1000);
      return;
    }

    if (!session?.user?.id) return;

    setIsUploading(true);
    try {
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      const fileExt = selectedImage.split('.').pop() || 'jpg';
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('uploads').insert({
        user_id: session.user.id,
        image_url: urlData.publicUrl,
      });

      if (dbError) throw dbError;

      Alert.alert('성공', '고양이 사진이 업로드되었습니다!');
      setSelectedImage(null);
      fetchUploads();
    } catch (error) {
      console.log('Upload error:', error);
      Alert.alert('오류', '업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const renderUploadItem = ({ item }: { item: Upload }) => (
    <View style={styles.uploadItem}>
      <Image
        source={{ uri: item.image_url }}
        style={styles.uploadImage}
        resizeMode="cover"
      />
      <View style={styles.uploadInfo}>
        <Text style={styles.uploadHits}>{item.hits} 터치</Text>
        <Text style={styles.uploadDate}>
          {new Date(item.uploaded_at).toLocaleDateString('ko-KR')}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.uploadSection}>
        <TouchableOpacity style={styles.pickButton} onPress={pickImage}>
          {selectedImage ? (
            <Image
              source={{ uri: selectedImage }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderIcon}>+</Text>
              <Text style={styles.placeholderText}>사진 선택</Text>
            </View>
          )}
        </TouchableOpacity>

        {selectedImage && (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={uploadImage}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.uploadButtonText}>업로드</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>업로드 기록</Text>
        {isLoading ? (
          <ActivityIndicator color="#FF6B9D" style={styles.loader} />
        ) : (isTestMode ? testUploads : uploads).length === 0 ? (
          <Text style={styles.emptyText}>아직 업로드한 사진이 없어요</Text>
        ) : (
          <FlatList
            data={isTestMode ? testUploads : uploads}
            renderItem={renderUploadItem}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.uploadList}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F7',
  },
  uploadSection: {
    padding: 20,
    alignItems: 'center',
  },
  pickButton: {
    width: 200,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FF6B9D',
    borderStyle: 'dashed',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
    color: '#FF6B9D',
  },
  placeholderText: {
    fontSize: 16,
    color: '#FF6B9D',
    marginTop: 8,
  },
  uploadButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 20,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  historySection: {
    flex: 1,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  loader: {
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  uploadList: {
    paddingHorizontal: 20,
  },
  uploadItem: {
    marginRight: 12,
    alignItems: 'center',
  },
  uploadImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  uploadInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  uploadHits: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B9D',
  },
  uploadDate: {
    fontSize: 12,
    color: '#666',
  },
});
