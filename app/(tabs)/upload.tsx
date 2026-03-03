import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  Dimensions,
  ScrollView,
  FlatList,
  BackHandler,
  RefreshControl,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Profile, Nyong, Upload } from '../../types';
import { colors, radius, formatCount } from '../../lib/theme';
import { verifyCatImage } from '../../lib/openai';
import { generateEmbedding, matchCat } from '../../lib/catMatcher';
import { t, format } from '../../lib/i18n';
import { CatPaw } from '../../components/CatPaw';
import { Toast } from '../../components/Toast';
import { MOCK_MY_NYONGS, MOCK_UPLOADS } from '../../lib/mockData';
import { PinchableImage } from '../../components/PinchableImage';

const { width, height } = Dimensions.get('window');


export default function UploadScreen() {
  const router = useRouter();
  const { nyongId } = useLocalSearchParams<{ nyongId?: string }>();
  const { session, profile, isTestMode, addTestUpload, refreshProfile } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [tag, setTag] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showNyongPhoto, setShowNyongPhoto] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 뇽 매칭 관련 상태
  const [myNyongs, setMyNyongs] = useState<Nyong[]>([]);
  const [selectedNyong, setSelectedNyong] = useState<Nyong | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<{ success: boolean; message: string } | null>(null);

  // 선택된 뇽의 업로드 히스토리
  const [nyongUploads, setNyongUploads] = useState<Upload[]>([]);
  const [alreadyUploadedToday, setAlreadyUploadedToday] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'hits'>('recent');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [viewerHeight, setViewerHeight] = useState(height);

  const showToast = (message: string) => setToast({ visible: true, message });

  useEffect(() => {
    if (isTestMode) {
      setMyNyongs(MOCK_MY_NYONGS);
      setSelectedNyong(MOCK_MY_NYONGS[0]);
      setNyongUploads(MOCK_UPLOADS);
      setIsLoading(false);
      return;
    }
    if (session?.user?.id) {
      fetchMyNyongs();
      setIsLoading(false);
    }
  }, [session, isTestMode]);

  useEffect(() => {
    if (selectedIndex === null) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedIndex(null);
      return true;
    });
    return () => handler.remove();
  }, [selectedIndex]);

  // Android 뒤로가기: 사진 미리보기 → 사진 선택으로 되돌아가기
  useEffect(() => {
    if (!selectedImage) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedImage(null);
      setTag('');
      setMatchResult(null);
      setErrorMessage(null);
      return true;
    });
    return () => handler.remove();
  }, [selectedImage]);

  // Android 뒤로가기: 뇽 선택 상태 → 뇽 선택 해제
  useEffect(() => {
    if (!selectedNyong || selectedImage) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      cancelNyongSelection();
      return true;
    });
    return () => handler.remove();
  }, [selectedNyong, selectedImage]);

  // 화면 포커스될 때 뇽 목록 새로고침
  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id && !isTestMode) {
        fetchMyNyongs();
      }
    }, [session, isTestMode])
  );

  // nyongId 파라미터가 있으면 해당 뇽 자동 선택
  useEffect(() => {
    if (nyongId && myNyongs.length > 0) {
      const targetNyong = myNyongs.find((n) => n.id.toString() === nyongId);
      if (targetNyong) {
        handleSelectNyong(targetNyong);
      }
    }
  }, [nyongId, myNyongs]);

  const onRefresh = useCallback(async () => {
    if (!session?.user?.id || isTestMode) return;
    setIsRefreshing(true);
    try {
      await fetchMyNyongs();
      if (selectedNyong) await fetchNyongUploads(selectedNyong.id);
    } finally {
      setIsRefreshing(false);
    }
  }, [session, isTestMode, selectedNyong]);

  // 내 뇽 목록 불러오기
  const fetchMyNyongs = async () => {
    try {
      const { data, error } = await supabase
        .from('nyongs')
        .select('*')
        .eq('owner_id', session?.user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyNyongs(data || []);
    } catch (error) {
      // silent
    }
  };

  // 선택된 뇽의 업로드 불러오기
  const fetchNyongUploads = async (nyongId: number) => {
    try {
      // RPC 사용: SECURITY DEFINER로 RLS 우회하여 정확한 hits 합산
      const { data } = await supabase.rpc('get_nyong_uploads', {
        target_nyong_id: nyongId,
      });

      setNyongUploads(data || []);

      // 오늘 이미 업로드했는지 체크
      const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
      const todayKstStart = new Date(`${kstDate}T00:00:00+09:00`).getTime();
      const uploadedToday = (data || []).some(
        (u: any) => new Date(u.uploaded_at).getTime() >= todayKstStart
      );
      setAlreadyUploadedToday(uploadedToday);
    } catch {
      setNyongUploads([]);
      setAlreadyUploadedToday(false);
    }
  };

  // 뇽 선택 시 업로드 히스토리 불러오기
  const handleSelectNyong = (nyong: Nyong) => {
    setSelectedNyong(nyong);
    setAlreadyUploadedToday(false);
    setSelectedImage(null);
    setErrorMessage(null);
    fetchNyongUploads(nyong.id);
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

      if (!verification.isSafe) {
        setErrorMessage(t().upload.errorUnsafeContent);
        return;
      }

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

    // 뇽이 등록되어 있는데 선택 안 한 경우
    if (myNyongs.length > 0 && !selectedNyong) {
      setErrorMessage(t().upload.errorSelectNyong);
      return;
    }

    setIsUploading(true);
    setMatchResult(null);

    try {
      // 테스트 모드
      if (isTestMode) {
        const mockUpload = {
          id: Date.now(),
          user_id: '00000000-0000-0000-0000-000000000000',
          image_url: selectedImage,
          hits: 0,
          uploaded_at: new Date().toISOString(),
        };
        addTestUpload(mockUpload);
        setSelectedImage(null);
        setSelectedNyong(null);
        setIsUploading(false);
        return;
      }

      // 실제 업로드
      if (!session?.user?.id) return;

      // 뇽 매칭 검증 (등록된 뇽이 있고 임베딩이 있을 때만)
      if (selectedNyong && selectedNyong.front_embedding && selectedNyong.front_embedding.length > 0) {
        setIsMatching(true);
        try {
          // 업로드할 이미지의 base64 변환 (하이브리드 매칭용)
          const imgResponse = await fetch(selectedImage);
          const imgBlob = await imgResponse.blob();
          const uploadedBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(imgBlob);
          });

          // 업로드할 이미지의 임베딩 생성
          const uploadedEmbedding = await generateEmbedding(selectedImage);

          // 선택한 뇽과 매칭
          const matchData = await matchCat(
            uploadedEmbedding,
            uploadedBase64,
            [{
              id: selectedNyong.id,
              features: selectedNyong.features,
              front_embedding: selectedNyong.front_embedding,
              embeddings: selectedNyong.embeddings || [],
            }]
          );

          if (!matchData.isMatch && matchData.confidence < 30) {
            // 확실히 다른 고양이일 때만 차단 (털색/품종이 완전히 다른 경우)
            setMatchResult({
              success: false,
              message: format(t().upload.matchFail, { name: selectedNyong.name }),
            });
            setIsMatching(false);
            setIsUploading(false);
            return;
          }

          setMatchResult({
            success: true,
            message: format(t().upload.matchSuccess, { name: selectedNyong.name }),
          });
        } catch (matchError) {
          // 매칭 에러 시 업로드 허용 (사용자 불이익 방지)
          console.warn('Cat matching error, allowing upload:', matchError);
        } finally {
          setIsMatching(false);
        }
      }

      // KST 기준 오늘 자정 (UTC)
      const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
      const todayKstStart = new Date(`${kstDate}T00:00:00+09:00`).toISOString();
      const today = kstDate; // last_upload_date용

      // 1. 뇽 ID별 하루 1회 업로드 체크 (KST 기준)
      if (selectedNyong) {
        const { data: todayUpload } = await supabase
          .from('uploads')
          .select('id')
          .eq('nyong_id', selectedNyong.id)
          .gte('uploaded_at', todayKstStart)
          .limit(1)
          .single();

        if (todayUpload) {
          setAlreadyUploadedToday(true);
          setSelectedImage(null);
          setIsUploading(false);
          return;
        }
      }

      // 2. 이미지 압축 후 업로드
      // 최대 1200px, quality 0.82 → 원본 대비 5~10% 크기, 육안 차이 없음
      const isWebBlob = Platform.OS === 'web' || selectedImage.startsWith('blob:');
      const fileName = `${session.user.id}/${Date.now()}.jpg`;
      const contentType = 'image/jpeg';

      let uploadError;

      if (Platform.OS === 'web') {
        // 웹: 압축 없이 blob 그대로 업로드
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        const result = await supabase.storage
          .from('uploads')
          .upload(fileName, blob, { contentType });
        uploadError = result.error;
      } else {
        // 네이티브: 리사이즈 + JPEG 압축
        const compressed = await ImageManipulator.manipulateAsync(
          selectedImage,
          [{ resize: { width: 1200 } }],
          { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
        );
        const base64 = await FileSystem.readAsStringAsync(compressed.uri, {
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

      if (!urlData?.publicUrl) throw new Error('Storage URL 생성 실패');

      // 3. uploads 테이블에 저장하고 ID 받기
      const { data: uploadData, error: dbError } = await supabase
        .from('uploads')
        .insert({
          user_id: session.user.id,
          image_url: urlData.publicUrl,
          tag: tag.trim() || null,
          nyong_id: selectedNyong?.id || null,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 뇽 업로드 카운트 증가
      if (selectedNyong) {
        await supabase
          .from('nyongs')
          .update({ upload_count: selectedNyong.upload_count + 1 })
          .eq('id', selectedNyong.id);
      }

      // 뇽 포인트 +1 (마일스톤 보너스 포함)
      const { data: milestoneBonus } = await supabase.rpc('grant_upload_point', { uploader_uuid: session.user.id });

      // 4. 업로더 last_upload_date 업데이트
      await supabase
        .from('profiles')
        .update({ last_upload_date: today })
        .eq('id', session.user.id);

      showToast(t().upload.uploadSuccessMessage);
      setAlreadyUploadedToday(true);

      if (milestoneBonus && milestoneBonus > 0) {
        const totalUploads = Math.round((milestoneBonus / 10) * 50);
        setTimeout(() => {
          showToast(format(t().points.milestoneMessage, { count: totalUploads, bonus: milestoneBonus }));
        }, 2200);
      }

      setSelectedImage(null);
      setTag('');
      // 업로드 후 히스토리 및 카운트 갱신
      if (selectedNyong) {
        fetchNyongUploads(selectedNyong.id);
      }
      fetchMyNyongs();
      refreshProfile();
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
    setSelectedNyong(null);
    setMatchResult(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  const sortedNyongUploads = [...nyongUploads].sort((a, b) => {
    if (sortBy === 'hits') return b.hits - a.hits;
    return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
  });

  // 뇽 선택 취소
  const cancelNyongSelection = () => {
    setSelectedNyong(null);
    setSelectedImage(null);
    setNyongUploads([]);
    setSortBy('recent');
    setSelectedIndex(null);
    setTag('');
    setErrorMessage(null);
    setMatchResult(null);
  };

  // 뇽 삭제
  const handleDeleteNyong = async (nyong: Nyong) => {
    try {
      // 1. 배달 건 존재 체크
      const { data: uploads } = await supabase
        .from('uploads')
        .select('id')
        .eq('nyong_id', nyong.id);

      if (uploads && uploads.length > 0) {
        const uploadIds = uploads.map((u: { id: number }) => u.id);
        const { count } = await supabase
          .from('deliveries')
          .select('id', { count: 'exact', head: true })
          .in('upload_id', uploadIds);

        if (count && count > 0) {
          Alert.alert(t().common.error, t().idCard.deleteHasDeliveries);
          return;
        }
      }

      // 2. 확인 다이얼로그
      Alert.alert(
        t().idCard.deleteConfirmTitle,
        format(t().idCard.deleteConfirmMessage, { name: nyong.name }),
        [
          { text: t().common.cancel, style: 'cancel' },
          {
            text: t().idCard.deleteButton,
            style: 'destructive',
            onPress: async () => {
              try {
                // storage에서 사진 삭제
                const extractPath = (url: string) => {
                  const match = url.match(/\/uploads\/(.+)$/);
                  return match ? match[1] : null;
                };
                const paths = [
                  extractPath(nyong.front_photo_url),
                  ...nyong.photo_urls.map(extractPath),
                ].filter(Boolean) as string[];

                if (paths.length > 0) {
                  await supabase.storage.from('uploads').remove(paths);
                }

                // uploads 삭제
                if (uploads && uploads.length > 0) {
                  await supabase
                    .from('uploads')
                    .delete()
                    .eq('nyong_id', nyong.id);
                }

                // nyong 삭제
                await supabase
                  .from('nyongs')
                  .delete()
                  .eq('id', nyong.id);

                showToast(format(t().idCard.deleteSuccess, { name: nyong.name }));
                cancelNyongSelection();
                fetchMyNyongs();
              } catch (error) {
                console.error('Delete nyong error:', error);
                Alert.alert(t().common.error, t().upload.errorUploadFailed);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Check deliveries error:', error);
    }
  };

  // 풀스크린 이미지 뷰어
  if (selectedIndex !== null) {
    return (
      <View
        style={styles.fullscreenContainer}
        onLayout={(e) => setViewerHeight(e.nativeEvent.layout.height)}
      >
        <FlatList
          data={sortedNyongUploads}
          scrollEnabled={!isPinching}
          renderItem={({ item }) => (
            <View style={[styles.fullscreenPage, { height: viewerHeight }]}>
              <View style={styles.fullscreenImageWrapper}>
                <PinchableImage
                  source={{ uri: item.image_url }}
                  style={styles.fullscreenImage}
                  contentFit="contain"
                  onPinchActive={setIsPinching}
                />
                <View style={styles.fullscreenInfoContainer}>
                  <Text style={styles.fullscreenPunchText}>
                    {item.tag && <Text style={styles.fullscreenTag}>#{item.tag} </Text>}
                    <Text>{format(t().upload.hits, { count: item.hits })}</Text>
                  </Text>
                </View>
              </View>
            </View>
          )}
          keyExtractor={(item) => `fs-${item.id}`}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          initialScrollIndex={selectedIndex}
          getItemLayout={(_, index) => ({
            length: viewerHeight,
            offset: viewerHeight * index,
            index,
          })}
        />
        <TouchableOpacity
          style={styles.fullscreenClose}
          onPress={() => setSelectedIndex(null)}
        >
          <Text style={styles.fullscreenCloseText}>{'\u00D7'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
  <>
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.uploadSection}>
        {/* 1. 뇽이 없으면 등록 안내 */}
        {myNyongs.length === 0 && !isLoading ? (
          <View style={styles.noNyongContainer}>
            <Image
              source={require('../../assets/nyong_churu.png')}
              style={styles.noNyongImage}
            />
            <Text style={styles.noNyongTitle}>
              {(() => {
                const nickname = profile?.nickname || '집사';
                const parts = t().upload.noNyongTitle.split('{nickname}');
                return (
                  <>
                    {parts[0]}
                    <Text style={{ color: colors.primary }}>{nickname}</Text>
                    {parts[1]}
                  </>
                );
              })()}
            </Text>
            <Text style={styles.noNyongDescription}>
              {t().upload.noNyongDescription}
            </Text>
            <TouchableOpacity
              style={styles.registerNyongButtonLarge}
              onPress={() => router.push('/nyong-register')}
            >
              <Text style={styles.registerNyongButtonText}>{t().upload.registerNyongButton}</Text>
            </TouchableOpacity>
          </View>
        ) : !selectedNyong ? (
          /* 2. 뇽 선택 화면 - 먼저 어떤 뇽인지 선택 */
          <View style={styles.nyongSelectionContainer}>
            <View style={styles.greetingRow}>
              <Image source={require('../../assets/nyong_jump.png')} style={styles.greetingImage} />
              <Text style={styles.nyongSelectionTitle}>{t().upload.greeting}</Text>
              {profile && !isTestMode && (
                <TouchableOpacity
                  style={styles.pointsBadge}
                  onPress={() => router.push('/upload-calendar')}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.pointsBadgeText} numberOfLines={1} maxFontSizeMultiplier={1.0}>
                    {format(t().points.currentPoints, { count: profile.nyong_points ?? 0 })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {myNyongs.map((nyong) => (
              <View key={nyong.id} style={styles.nyongCardItem}>
                <TouchableOpacity
                  style={styles.idCard}
                  onPress={() => handleSelectNyong(nyong)}
                  activeOpacity={0.8}
                >
                  {/* 워터마크 */}
                  <View style={styles.idCardWatermark}>
                    <CatPaw width={180} height={180} />
                  </View>

                  {/* 헤더 */}
                  <View style={styles.idCardHeader}>
                    <View style={styles.idCardHeaderIcon}>
                      <CatPaw width={20} height={20} />
                    </View>
                    <Text style={styles.idCardHeaderText}>{t().idCard.subtitle}</Text>
                    <Text style={styles.idCardHeaderArrow}>→</Text>
                  </View>

                  {/* 바디 */}
                  <View style={styles.idCardBody}>
                    <View style={styles.idCardPhotoFrame}>
                      <Image
                        source={{ uri: nyong.front_photo_url }}
                        style={styles.idCardPhoto}
                      />
                    </View>
                    <View style={styles.idCardInfoSection}>
                      <View style={styles.idCardInfoRow}>
                        <Text style={styles.idCardInfoLabel}>{t().idCard.nameLabel}</Text>
                        <Text style={styles.idCardInfoValue}>{nyong.name}</Text>
                      </View>
                      <View style={styles.idCardInfoRow}>
                        <Text style={styles.idCardInfoLabel}>{t().idCard.birthdayLabel}</Text>
                        <Text style={styles.idCardInfoValue}>
                          {nyong.birthday ? nyong.birthday.replace(/-/g, '.') : t().idCard.noBirthday}
                        </Text>
                      </View>
                      <View style={styles.idCardInfoRow}>
                        <Text style={styles.idCardInfoLabel}>{t().idCard.genderLabel}</Text>
                        <Text style={styles.idCardInfoValue}>
                          {nyong.gender === 'male' ? t().idCard.genderMale
                            : nyong.gender === 'female' ? t().idCard.genderFemale
                            : t().idCard.genderUnknown}
                        </Text>
                      </View>
                      <View style={styles.idCardInfoRow}>
                        <Text style={styles.idCardInfoLabel}>{t().idCard.personalityLabel}</Text>
                        <Text style={styles.idCardInfoValue} numberOfLines={1}>
                          {nyong.personality || t().idCard.noPersonality}
                        </Text>
                      </View>
                      <View style={styles.idCardInfoRow}>
                        <Text style={styles.idCardInfoLabel}>{t().idCard.regDateLabel}</Text>
                        <Text style={styles.idCardInfoValue}>
                          {new Date(nyong.created_at).toISOString().slice(0, 10).replace(/-/g, '.')}
                        </Text>
                      </View>
                      <View style={styles.idCardCitizenNoRow}>
                        <Text style={styles.idCardCitizenNoLabel}>{t().idCard.citizenNoLabel}</Text>
                        <Text style={styles.idCardCitizenNoValue}>
                          NYONG-{String(nyong.id).padStart(6, '0')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* 푸터 */}
                  <View style={styles.idCardFooter}>
                    <View style={styles.idCardFooterLine} />
                    <View style={styles.idCardFooterRow}>
                      <Text style={styles.idCardIssuedBy}>{t().idCard.issuedBy}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            ))}

            {/* 새 뇽 등록 버튼 */}
            <TouchableOpacity
              style={styles.addNyongButton}
              onPress={() => router.push('/nyong-register')}
            >
              <Text style={styles.addNyongIcon}>+</Text>
              <Text style={styles.addNyongText}>{t().upload.addNyong}</Text>
            </TouchableOpacity>

          </View>
        ) : selectedImage ? (
          /* 3. 사진 미리보기 + 업로드 확인 */
          <View style={styles.previewContainer}>
            {/* 선택된 뇽 표시 */}
            <View style={styles.selectedNyongBadge}>
              <Image
                source={{ uri: selectedNyong.front_photo_url }}
                style={styles.selectedNyongBadgePhoto}
              />
              <Text style={styles.selectedNyongBadgeName}>{selectedNyong.name}</Text>
            </View>

            <Image
              source={{ uri: selectedImage }}
              style={styles.previewImage}
              contentFit="cover"
            />

            {/* 매칭 결과 */}
            {matchResult && (
              <View style={[styles.matchResult, !matchResult.success && styles.matchResultError]}>
                <Text style={styles.matchResultText}>{matchResult.message}</Text>
              </View>
            )}

            {/* 매칭 중 */}
            {isMatching && (
              <View style={styles.matchingIndicator}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={styles.matchingText}>{t().upload.verifying}</Text>
              </View>
            )}

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
                disabled={isUploading || isMatching}
              >
                <Text style={styles.cancelButtonText}>{t().common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmUpload}
                disabled={isUploading || isMatching}
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
          /* 4. 사진 선택 화면 - 뇽 선택 후 사진 선택 */
          <View style={styles.photoPickContainer}>
            {/* 뇽 헤더 행 */}
            <View style={styles.nyongProfileHeader}>
              <TouchableOpacity
                style={styles.backToSelectionButton}
                onPress={cancelNyongSelection}
              >
                <Text style={styles.backToSelectionText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.nyongProfileName}>{selectedNyong.name}</Text>
              <TouchableOpacity
                onPress={() => router.push(`/nyong-register?nyongId=${selectedNyong.id}`)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.nyongCardActionText} maxFontSizeMultiplier={1.0}>{t().idCard.editButton}</Text>
              </TouchableOpacity>
              <Text style={styles.nyongCardActionDivider} maxFontSizeMultiplier={1.0}>|</Text>
              <TouchableOpacity
                onPress={() => handleDeleteNyong(selectedNyong)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.nyongCardActionText, styles.nyongCardDeleteText]} maxFontSizeMultiplier={1.0}>{t().idCard.deleteButton}</Text>
              </TouchableOpacity>
            </View>

            {/* 뇽 정보 카드 */}
            <View style={styles.nyongProfileCard}>
              <View style={styles.nyongProfileCardRow}>
                <TouchableOpacity onPress={() => setShowNyongPhoto(true)} activeOpacity={0.8}>
                  <Image
                    source={{ uri: selectedNyong.front_photo_url }}
                    style={styles.nyongProfilePhoto}
                  />
                </TouchableOpacity>
                <View style={styles.nyongProfileCardBody}>
                  <View style={styles.nyongProfileStats}>
                    <View style={styles.nyongStatItem}>
                      <Text style={styles.nyongStatValue} maxFontSizeMultiplier={1.3}>{formatCount(selectedNyong.upload_count)}</Text>
                      <Text style={styles.nyongStatLabel} maxFontSizeMultiplier={1.2}>{t().upload.statUploads}</Text>
                    </View>
                    <View style={styles.nyongStatDivider} />
                    <View style={styles.nyongStatItem}>
                      <Text style={styles.nyongStatValue} maxFontSizeMultiplier={1.3}>{formatCount(nyongUploads.reduce((sum, u) => sum + (u.hits || 0), 0))}</Text>
                      <Text style={styles.nyongStatLabel} maxFontSizeMultiplier={1.2}>{t().upload.statPunches}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* 사진 선택 버튼 */}
            <TouchableOpacity
              style={[styles.pickButton, alreadyUploadedToday && styles.pickButtonDisabled]}
              onPress={pickAndVerify}
              disabled={isVerifying || alreadyUploadedToday}
            >
              {isVerifying ? (
                <View style={styles.loadingContent}>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <Text style={styles.loadingText}>{t().upload.verifying}</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonIcon} maxFontSizeMultiplier={1.0}>+</Text>
                  <Text style={[styles.buttonText, alreadyUploadedToday && styles.buttonTextDisabled]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                    {alreadyUploadedToday
                      ? t().upload.errorAlreadyUploaded
                      : format(t().upload.pickPhoto, { name: selectedNyong.name })}
                  </Text>
                  {!alreadyUploadedToday && <Text style={styles.buttonPointBadge} maxFontSizeMultiplier={1.0}>+1P</Text>}
                </View>
              )}
            </TouchableOpacity>

            {!alreadyUploadedToday && <Text style={styles.deliveryHint}>오늘 올린 사진은 내일부터 배달됩니다</Text>}

            {/* 업로드 히스토리 */}
            {nyongUploads.length > 0 && (
              <View style={styles.nyongUploadHistory}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle}>{format(t().upload.historyTitle, { name: selectedNyong.name })}</Text>
                  <View style={styles.sortButtons}>
                    <TouchableOpacity
                      style={[styles.sortButton, sortBy === 'recent' && styles.sortButtonActive]}
                      onPress={() => setSortBy('recent')}
                    >
                      <Text style={[styles.sortButtonText, sortBy === 'recent' && styles.sortButtonTextActive]} maxFontSizeMultiplier={1.0}>
                        {t().upload.sortRecent}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sortButton, sortBy === 'hits' && styles.sortButtonActive]}
                      onPress={() => setSortBy('hits')}
                    >
                      <Text style={[styles.sortButtonText, sortBy === 'hits' && styles.sortButtonTextActive]} maxFontSizeMultiplier={1.0}>
                        {t().upload.sortHits}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {sortedNyongUploads.map((upload, index) => {
                  const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
                  const todayKstStart = new Date(`${kstDate}T00:00:00+09:00`).getTime();
                  const isPending = new Date(upload.uploaded_at).getTime() >= todayKstStart;
                  return (
                    <TouchableOpacity
                      key={upload.id}
                      style={styles.uploadItem}
                      onPress={() => setSelectedIndex(index)}
                    >
                      <Image
                        source={{ uri: upload.image_url }}
                        style={styles.uploadImage}
                        contentFit="cover"
                      />
                      <View style={styles.uploadInfo}>
                        <Text style={styles.uploadDate}>{formatDate(upload.uploaded_at)}</Text>
                        <Text style={styles.uploadHitsRow}>
                          {upload.tag && <Text style={styles.uploadTag}>#{upload.tag} </Text>}
                          <Text style={[styles.uploadHits, isPending && styles.uploadHitsPending]}>
                            {isPending ? t().upload.pendingDelivery : format(t().upload.hits, { count: upload.hits })}
                          </Text>
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {errorMessage && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}
      </View>

    </ScrollView>
    <Toast
      visible={toast.visible}
      message={toast.message}
      onHide={() => setToast({ visible: false, message: '' })}
    />
    {/* 뇽 사진 크게보기 */}
    <Modal visible={showNyongPhoto} transparent animationType="fade" onRequestClose={() => setShowNyongPhoto(false)}>
      <TouchableOpacity style={styles.photoModalOverlay} activeOpacity={1} onPress={() => setShowNyongPhoto(false)}>
        <PinchableImage
          source={{ uri: selectedNyong?.front_photo_url }}
          style={styles.photoModalImage}
          contentFit="contain"
        />
      </TouchableOpacity>
    </Modal>
  </>
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
  pointsBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pointsBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    gap: 6,
  },
  pickButtonDisabled: {
    borderColor: colors.textMuted,
    borderStyle: 'solid',
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonIcon: {
    fontSize: 20,
    color: colors.primary,
  },
  buttonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: colors.textMuted,
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
  matchResult: {
    marginTop: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
  matchResultError: {
    backgroundColor: colors.errorLight,
  },
  matchResultText: {
    fontSize: 13,
    color: colors.text,
    textAlign: 'center',
  },
  matchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  matchingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  noNyongContainer: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  noNyongImage: {
    width: 160,
    height: 160,
    marginBottom: 16,
  },
  noNyongTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  noNyongDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  registerNyongButtonLarge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.pill,
  },
  registerNyongButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  tagInput: {
    width: 200,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    marginTop: 12,
    fontSize: 16,
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
    paddingVertical: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  confirmButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: colors.border,
  },
  confirmButtonText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  // 뇽 선택 화면 스타일
  nyongSelectionContainer: {
    alignItems: 'center',
    width: '100%',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 0,
  },
  greetingImage: {
    width: 144,
    height: 144,
    marginTop: -30,
    marginBottom: -16,
    marginLeft: -10,
    marginRight: -20,
  },
  nyongSelectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  nyongCardItem: {
    width: '100%',
    marginBottom: 16,
  },
  addNyongButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: 6,
  },
  addNyongIcon: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  addNyongText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  // 선택된 뇽 배지 (미리보기용)
  selectedNyongBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    marginBottom: 12,
    gap: 8,
  },
  selectedNyongBadgePhoto: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  selectedNyongBadgeName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  // 뇽 프로필 헤더
  nyongProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
    alignSelf: 'stretch',
  },
  nyongProfileCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 16,
    marginBottom: 16,
    alignSelf: 'stretch',
  },
  nyongProfileCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nyongProfilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  nyongProfileCardBody: {
    flex: 1,
  },
  nyongCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nyongCardActionText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  nyongCardActionDivider: {
    fontSize: 12,
    color: colors.border,
  },
  nyongCardDeleteText: {
    color: colors.textTertiary,
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalImage: {
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: radius.xl,
  },
  nyongProfileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  nyongProfileStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nyongStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  nyongStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  nyongStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  nyongStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  buttonPointBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  // 사진 선택 화면 (뇽 선택 후)
  photoPickContainer: {
    alignItems: 'center',
    width: '100%',
  },
  backToSelectionButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  backToSelectionText: {
    fontSize: 24,
    color: colors.text,
  },
  // ID 카드 (인라인)
  idCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  idCardWatermark: {
    position: 'absolute',
    bottom: 20,
    right: -20,
    opacity: 0.04,
  },
  idCardHeader: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 10,
  },
  idCardHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  idCardHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 1.5,
  },
  idCardHeaderArrow: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.6)',
  },
  idCardBody: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  idCardPhotoFrame: {
    width: 100,
    height: 120,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    overflow: 'hidden',
  },
  idCardPhoto: {
    width: '100%',
    height: '100%',
  },
  idCardInfoSection: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  idCardInfoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  idCardInfoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    width: 42,
  },
  idCardInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  idCardCitizenNoRow: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  idCardCitizenNoLabel: {
    fontSize: 9,
    color: colors.textTertiary,
  },
  idCardCitizenNoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  idCardFooter: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  idCardFooterLine: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 8,
  },
  idCardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  idCardIssuedBy: {
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },
  idCardActionLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idCardActionLinkText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  idCardActionDivider: {
    fontSize: 11,
    color: colors.border,
  },
  idCardDeleteLinkText: {
    color: colors.textTertiary,
  },
  deliveryHint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 8,
    textAlign: 'center',
  },
  // 뇽 업로드 히스토리
  nyongUploadHistory: {
    width: '100%',
    marginTop: 24,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
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
  uploadHitsPending: {
    color: colors.primary,
  },
  // 풀스크린 이미지 뷰어
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenPage: {
    width: width,
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
