import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Alert,
  Platform,
  TextInput,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Upload, Profile } from '../../types';
import { colors, radius } from '../../lib/theme';
import { verifyCatImage } from '../../lib/openai';
import { sendPushNotification, isInExclusionTime } from '../../lib/notifications';
import { t, format } from '../../lib/i18n';
import { CatPaw } from '../../components/CatPaw';

const { width } = Dimensions.get('window');

// 수신 가능한 사용자 찾기
async function findEligibleReceiver(senderId: string): Promise<Profile | null> {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const { data: candidates } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', senderId)
    .or(`last_receive_date.is.null,last_receive_date.lt.${today}`);

  if (!candidates || candidates.length === 0) return null;

  // 알람 제외 시간 필터링
  const available = candidates.filter((user) => {
    if (!user.use_exclusion) return true;
    return !isInExclusionTime(currentTime, user.exclusion_start, user.exclusion_end);
  });

  if (available.length === 0) return null;

  // 랜덤 선택
  return available[Math.floor(Math.random() * available.length)];
}

export default function UploadScreen() {
  const { session, isTestMode, testUploads, addTestUpload } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [tag, setTag] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'hits'>('recent');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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
      // uploads와 deliveries 조인해서 hits 합산
      const { data, error } = await supabase
        .from('uploads')
        .select('*, deliveries(hits)')
        .eq('user_id', session?.user?.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      // deliveries의 hits 합산
      const uploadsWithHits = (data || []).map((upload) => ({
        ...upload,
        hits: upload.deliveries?.reduce((sum: number, d: { hits: number }) => sum + (d.hits || 0), 0) || 0,
      }));

      setUploads(uploadsWithHits);
    } catch (error) {
      console.log('Error fetching uploads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 사진 선택 + AI 검증
  const pickAndVerify = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const imageUri = result.assets[0].uri;
    setIsVerifying(true);
    setErrorMessage(null);
    setSelectedImage(null);

    try {
      const verification = await verifyCatImage(imageUri);

      if (!verification.isCat) {
        setErrorMessage(t().upload.errorNotCat);
        return;
      }

      // 검증 성공 → 미리보기 표시
      setSelectedImage(imageUri);
    } catch (error) {
      console.error('Verification error:', error);
      setErrorMessage(t().upload.errorVerifyFailed);
    } finally {
      setIsVerifying(false);
    }
  };

  // 실제 업로드
  const confirmUpload = async () => {
    if (!selectedImage) return;

    setIsUploading(true);

    try {
      // 테스트 모드
      if (isTestMode) {
        const mockUpload: Upload = {
          id: Date.now(),
          user_id: 'test-admin-id',
          image_url: selectedImage,
          hits: 0,
          uploaded_at: new Date().toISOString(),
        };
        addTestUpload(mockUpload);
        setSelectedImage(null);
        setIsUploading(false);
        return;
      }

      // 실제 업로드
      if (!session?.user?.id) return;

      const today = new Date().toISOString().split('T')[0];

      // 1. 하루 1회 업로드 체크
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('last_upload_date')
        .eq('id', session.user.id)
        .single();

      if (myProfile?.last_upload_date === today) {
        setErrorMessage(t().upload.errorAlreadyUploaded);
        setIsUploading(false);
        return;
      }

      // 2. 이미지 업로드 (플랫폼별 처리)
      // 웹에서는 blob URL이므로 확장자를 jpg로 고정
      const isWebBlob = Platform.OS === 'web' || selectedImage.startsWith('blob:');
      const fileExt = isWebBlob ? 'jpg' : (selectedImage.split('.').pop() || 'jpg');
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
      const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

      let uploadError;

      if (Platform.OS === 'web') {
        // 웹: fetch로 blob 가져오기
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        const result = await supabase.storage
          .from('uploads')
          .upload(fileName, blob, { contentType });
        uploadError = result.error;
      } else {
        // 네이티브: FileSystem으로 base64 읽기
        const base64 = await FileSystem.readAsStringAsync(selectedImage, {
          encoding: 'base64',
        });
        const result = await supabase.storage
          .from('uploads')
          .upload(fileName, decode(base64), { contentType });
        uploadError = result.error;
      }

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName);

      // 3. uploads 테이블에 저장하고 ID 받기
      const { data: uploadData, error: dbError } = await supabase
        .from('uploads')
        .insert({
          user_id: session.user.id,
          image_url: urlData.publicUrl,
          tag: tag.trim() || null,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 4. 수신자 찾기
      const receiver = await findEligibleReceiver(session.user.id);

      // 5. 배송 기록 생성
      await supabase.from('deliveries').insert({
        upload_id: uploadData.id,
        sender_id: session.user.id,
        receiver_id: receiver?.id || null,
        status: receiver ? 'delivered' : 'pending',
        delivered_at: receiver ? new Date().toISOString() : null,
      });

      // 6. 업로더 last_upload_date 업데이트
      await supabase
        .from('profiles')
        .update({ last_upload_date: today })
        .eq('id', session.user.id);

      // 7. 수신자 있으면 푸시 발송 + 날짜 업데이트
      if (receiver) {
        await supabase
          .from('profiles')
          .update({ last_receive_date: today })
          .eq('id', receiver.id);

        if (receiver.push_token) {
          await sendPushNotification(receiver.push_token, {
            title: t().push.title,
            body: t().push.body,
            data: { imageUrl: urlData.publicUrl },
          });
        }

        Alert.alert(t().upload.deliverySuccessTitle, t().upload.deliverySuccessMessage);
      } else {
        Alert.alert(t().upload.deliveryPendingTitle, t().upload.deliveryPendingMessage);
      }

      setSelectedImage(null);
      setTag('');
      fetchUploads();
    } catch (error) {
      console.error('Upload error:', error);
      setErrorMessage(t().upload.errorUploadFailed);
    } finally {
      setIsUploading(false);
    }
  };

  const cancelUpload = () => {
    setSelectedImage(null);
    setTag('');
    setErrorMessage(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  const sortedUploads = [...(isTestMode ? testUploads : uploads)].sort((a, b) => {
    if (sortBy === 'hits') {
      return b.hits - a.hits;
    }
    return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
  });

  const renderUploadItem = ({ item, index }: { item: Upload; index: number }) => (
    <TouchableOpacity
      style={styles.uploadItem}
      onPress={() => setSelectedIndex(index)}
    >
      <Image
        source={{ uri: item.image_url }}
        style={styles.uploadImage}
        resizeMode="cover"
      />
      <View style={styles.uploadInfo}>
        <Text style={styles.uploadDate}>{formatDate(item.uploaded_at)}</Text>
        <Text style={styles.uploadHitsRow}>
          {item.tag && <Text style={styles.uploadTag}>#{item.tag} </Text>}
          <Text style={styles.uploadHits}>{format(t().upload.hits, { count: item.hits })}</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderFullscreenItem = ({ item }: { item: Upload }) => (
    <View style={styles.fullscreenPage}>
      <View style={styles.fullscreenImageWrapper}>
        <Image
          source={{ uri: item.image_url }}
          style={styles.fullscreenImage}
          resizeMode="contain"
        />
        <View style={styles.fullscreenInfoContainer}>
          <CatPaw width={22} height={22} />
          <Text style={styles.fullscreenPunchText}>
            {item.tag && <Text style={styles.fullscreenTag}>#{item.tag} </Text>}
            <Text>{format(t().upload.hits, { count: item.hits })}</Text>
          </Text>
        </View>
      </View>
    </View>
  );

  // 상세 보기 모드
  if (selectedIndex !== null) {
    return (
      <View style={styles.fullscreenContainer}>
        <FlatList
          data={sortedUploads}
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
      <View style={styles.uploadSection}>
        {/* 미리보기 상태 */}
        {selectedImage ? (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: selectedImage }}
              style={styles.previewImage}
              resizeMode="cover"
            />
            <TextInput
              style={styles.tagInput}
              placeholder={t().upload.tagPlaceholder}
              placeholderTextColor={colors.textSecondary}
              value={tag}
              onChangeText={(text) => setTag(text.slice(0, 20))}
              maxLength={20}
            />
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelUpload}
                disabled={isUploading}
              >
                <Text style={styles.cancelButtonText}>{t().common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>{t().upload.uploadButton}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* 사진 선택 버튼 */
          <TouchableOpacity
            style={styles.pickButton}
            onPress={pickAndVerify}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <View style={styles.loadingContent}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={styles.loadingText}>{t().upload.verifying}</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonIcon}>+</Text>
                <Text style={styles.buttonText}>{t().upload.button}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {errorMessage && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}
      </View>

      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>{t().upload.historyTitle}</Text>
          {sortedUploads.length > 0 && (
            <View style={styles.sortButtons}>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'recent' && styles.sortButtonActive]}
                onPress={() => setSortBy('recent')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'recent' && styles.sortButtonTextActive]}>{t().upload.sortRecent}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'hits' && styles.sortButtonActive]}
                onPress={() => setSortBy('hits')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'hits' && styles.sortButtonTextActive]}>{t().upload.sortHits}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : sortedUploads.length === 0 ? (
          <Text style={styles.emptyText}>{t().upload.emptyHistory}</Text>
        ) : (
          <FlatList
            data={sortedUploads}
            renderItem={renderUploadItem}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
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
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    alignItems: 'center',
  },
  buttonIcon: {
    fontSize: 48,
    color: colors.primary,
  },
  buttonText: {
    fontSize: 16,
    color: colors.primary,
    marginTop: 8,
    fontWeight: '600',
  },
  loadingContent: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  previewContainer: {
    alignItems: 'center',
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: radius.xl,
  },
  tagInput: {
    width: 200,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    marginTop: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
  },
  previewActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  confirmButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  historySection: {
    flex: 1,
    paddingTop: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  sortButtonActive: {
    backgroundColor: colors.primary,
  },
  sortButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  sortButtonTextActive: {
    color: colors.white,
    fontWeight: '600',
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
    paddingBottom: 20,
  },
  uploadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 10,
  },
  uploadImage: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
  },
  uploadInfo: {
    flex: 1,
    marginLeft: 12,
  },
  uploadDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  uploadHitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  uploadTag: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  uploadHits: {
    fontSize: 14,
    color: colors.textSecondary,
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
