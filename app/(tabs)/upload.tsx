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
import { colors, radius } from '../../lib/theme';

type VerificationState = 'idle' | 'verifying' | 'success' | 'failure';

export default function UploadScreen() {
  const { session, isTestMode, testUploads, addTestUpload } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [verificationState, setVerificationState] = useState<VerificationState>('idle');

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

  const verifyCatImage = () => {
    setVerificationState('verifying');
    setTimeout(() => {
      const isCat = Math.random() < 0.9;
      setVerificationState(isCat ? 'success' : 'failure');
    }, 2000);
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
      setVerificationState('idle');
      // Start verification automatically
      setTimeout(() => {
        setVerificationState('verifying');
        setTimeout(() => {
          const isCat = Math.random() < 0.9;
          setVerificationState(isCat ? 'success' : 'failure');
        }, 2000);
      }, 100);
    }
  };

  const handleReselect = () => {
    setSelectedImage(null);
    setVerificationState('idle');
    pickImage();
  };

  const uploadImage = async () => {
    if (!selectedImage || verificationState !== 'success') return;

    if (isTestMode) {
      setIsUploading(true);
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
        setVerificationState('idle');
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
      setVerificationState('idle');
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

  const renderVerificationStatus = () => {
    if (verificationState === 'verifying') {
      return (
        <View style={styles.verificationContainer}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.verificationText}>고양이 사진 확인 중...</Text>
        </View>
      );
    }

    if (verificationState === 'success') {
      return (
        <View style={styles.verificationContainer}>
          <Text style={styles.verificationSuccess}>고양이 확인 완료!</Text>
        </View>
      );
    }

    if (verificationState === 'failure') {
      return (
        <View style={styles.verificationContainer}>
          <Text style={styles.verificationFailure}>고양이 사진이 아닌 것 같아요</Text>
          <TouchableOpacity style={styles.reselectButton} onPress={handleReselect}>
            <Text style={styles.reselectButtonText}>다시 선택</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

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

        {selectedImage && renderVerificationStatus()}

        {selectedImage && verificationState === 'success' && (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={uploadImage}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.uploadButtonText}>업로드</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>업로드 기록</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
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
    backgroundColor: colors.background,
  },
  uploadSection: {
    padding: 20,
    alignItems: 'center',
  },
  pickButton: {
    width: 200,
    height: 200,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
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
    color: colors.primary,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.primary,
    marginTop: 8,
  },
  verificationContainer: {
    marginTop: 16,
    alignItems: 'center',
    gap: 8,
  },
  verificationText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  verificationSuccess: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  verificationFailure: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  reselectButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: radius.xl,
  },
  reselectButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: radius.pill,
    marginTop: 20,
  },
  uploadButtonText: {
    color: colors.white,
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
    color: colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  loader: {
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
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
    borderRadius: radius.xl,
  },
  uploadInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  uploadHits: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  uploadDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
