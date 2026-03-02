import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { colors, radius } from '../lib/theme';
import { t, format } from '../lib/i18n';
import {
  extractCatFeatures,
  generateEmbedding,
  generateEmbeddingFromText,
} from '../lib/catMatcher';
import { verifyCatImage } from '../lib/openai';
import { CatPaw } from '../components/CatPaw';
import { BirthdayPicker } from '../components/BirthdayPicker';

const { width: screenWidth } = Dimensions.get('window');

export default function NyongRegisterScreen() {
  const router = useRouter();
  const { nyongId } = useLocalSearchParams<{ nyongId?: string }>();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const isEditMode = !!nyongId;

  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState<string | null>(null);
  const [gender, setGender] = useState<'male' | 'female' | 'unknown' | null>(null);
  const [personality, setPersonality] = useState('');
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [originalFrontPhoto, setOriginalFrontPhoto] = useState<string | null>(null);
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([]);
  const [originalAdditionalPhotos, setOriginalAdditionalPhotos] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');

  // 수정 모드: 기존 데이터 로드
  useEffect(() => {
    if (isEditMode && nyongId) {
      fetchNyongData(parseInt(nyongId));
    }
  }, [nyongId]);

  const fetchNyongData = async (id: number) => {
    try {
      const { data, error } = await supabase
        .from('nyongs')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setName(data.name);
      setBirthday(data.birthday || null);
      setGender(data.gender || null);
      setPersonality(data.personality || '');
      setFrontPhoto(data.front_photo_url);
      setOriginalFrontPhoto(data.front_photo_url);
      setAdditionalPhotos(data.photo_urls || []);
      setOriginalAdditionalPhotos(data.photo_urls || []);
    } catch (error) {
      console.error('Fetch nyong error:', error);
    }
  };

  // 이미지 선택
  const pickImage = async (isMainPhoto: boolean) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    const uri = result.assets[0].uri;

    if (isMainPhoto) {
      // 정면 사진 검증
      setIsAnalyzing(true);
      setAnalysisStep('정면 사진 확인 중...');

      try {
        // 고양이인지 + 얼굴 보이는지 + 안전한 사진인지 한번에 확인
        const catResult = await verifyCatImage(uri);
        if (!catResult.isSafe) {
          Alert.alert(t().common.error, t().nyongRegister.errorUnsafeContent);
          setIsAnalyzing(false);
          return;
        }
        if (!catResult.isCat) {
          Alert.alert(t().common.error, t().nyongRegister.errorNotCat);
          setIsAnalyzing(false);
          return;
        }
        if (!catResult.isFrontFacing) {
          Alert.alert(t().common.error, t().nyongRegister.errorNotFrontFacing);
          setIsAnalyzing(false);
          return;
        }

        setFrontPhoto(uri);
      } catch (error) {
        console.error('Photo verification error:', error);
        Alert.alert(t().common.error, t().upload.errorVerifyFailed);
      } finally {
        setIsAnalyzing(false);
        setAnalysisStep('');
      }
    } else {
      // 추가 사진 (최대 4장)
      if (additionalPhotos.length >= 4) {
        return;
      }

      setIsAnalyzing(true);
      setAnalysisStep('사진 확인 중...');
      try {
        const catResult = await verifyCatImage(uri);
        if (!catResult.isSafe) {
          Alert.alert(t().common.error, t().nyongRegister.errorUnsafeContent);
          return;
        }
        if (!catResult.isCat) {
          Alert.alert(t().common.error, t().nyongRegister.errorNotCat);
          return;
        }
        setAdditionalPhotos([...additionalPhotos, uri]);
      } catch (error) {
        console.error('Additional photo verification error:', error);
        Alert.alert(t().common.error, t().upload.errorVerifyFailed);
      } finally {
        setIsAnalyzing(false);
        setAnalysisStep('');
      }
    }
  };

  // 추가 사진 삭제
  const removeAdditionalPhoto = (index: number) => {
    setAdditionalPhotos(additionalPhotos.filter((_, i) => i !== index));
  };

  // Base64 변환
  const getBase64 = async (uri: string): Promise<string> => {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      return await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    }
  };

  // 이미지 업로드
  const uploadImage = async (uri: string, fileName: string): Promise<string> => {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error } = await supabase.storage
        .from('uploads')
        .upload(fileName, blob, { contentType: 'image/jpeg' });
      if (error) throw error;
    } else {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const { error } = await supabase.storage
        .from('uploads')
        .upload(fileName, decode(base64), { contentType: 'image/jpeg' });
      if (error) throw error;
    }

    const { data } = supabase.storage.from('uploads').getPublicUrl(fileName);
    return data.publicUrl;
  };

  // 사진이 로컬 파일인지 (새로 선택한 사진인지)
  const isLocalFile = (uri: string) => !uri.startsWith('http');

  // 뇽 등록/수정
  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert(t().common.error, t().nyongRegister.errorNoName);
      return;
    }

    if (!frontPhoto) {
      Alert.alert(t().common.error, t().nyongRegister.errorNoPhoto);
      return;
    }

    if (!session?.user?.id) {
      Alert.alert(t().common.error, '세션이 만료되었습니다. 다시 로그인해주세요.');
      return;
    }

    setIsRegistering(true);

    try {
      const userId = session.user.id;
      const timestamp = Date.now();
      const frontPhotoChanged = isLocalFile(frontPhoto);

      let frontPhotoUrl = frontPhoto;
      let features = null;
      let frontEmbedding = null;

      // 정면 사진이 변경된 경우에만 업로드 + AI 분석
      if (frontPhotoChanged) {
        setAnalysisStep('사진 업로드 중...');
        const frontFileName = `${userId}/${timestamp}_front.jpg`;
        frontPhotoUrl = await uploadImage(frontPhoto, frontFileName);

        setAnalysisStep('AI가 뇽의 특징을 분석 중...');
        const frontBase64 = await getBase64(frontPhoto);
        features = await extractCatFeatures(frontBase64);

        setAnalysisStep('뇽 ID 생성 중...');
        // features를 텍스트로 변환하여 임베딩 생성 (GPT 호출 절약)
        const featuresText = Object.entries(features).map(([k, v]) => `${k}: ${v}`).join(', ');
        frontEmbedding = await generateEmbeddingFromText(featuresText);
      }

      // 추가 사진 처리
      const photoUrls: string[] = [];
      const embeddings: number[][] = [];
      for (let i = 0; i < additionalPhotos.length; i++) {
        if (isLocalFile(additionalPhotos[i])) {
          const fileName = `${userId}/${timestamp}_${i + 1}.jpg`;
          const url = await uploadImage(additionalPhotos[i], fileName);
          photoUrls.push(url);
          const emb = await generateEmbedding(url);
          embeddings.push(emb);
        } else {
          photoUrls.push(additionalPhotos[i]);
          // 기존 사진의 임베딩은 유지 (DB에서 가져올 수 없으므로 빈 배열)
        }
      }

      if (isEditMode && nyongId) {
        // 수정 모드
        setAnalysisStep(t().nyongRegister.updating);
        const updateData: Record<string, any> = {
          name: name.trim(),
          birthday: birthday || null,
          gender: gender || null,
          personality: personality.trim() || null,
          photo_urls: photoUrls,
        };

        if (frontPhotoChanged) {
          updateData.front_photo_url = frontPhotoUrl;
          updateData.features = features;
          updateData.front_embedding = frontEmbedding;
        }

        if (embeddings.length > 0) {
          updateData.embeddings = embeddings;
        }

        const { error } = await supabase
          .from('nyongs')
          .update(updateData)
          .eq('id', parseInt(nyongId));

        if (error) throw error;

        router.replace(`/nyong-id-card?nyongId=${nyongId}`);
      } else {
        // 등록 모드
        if (!features || !frontEmbedding) {
          throw new Error('Missing AI analysis data');
        }

        setAnalysisStep('뇽 등록 완료 중...');
        const { data, error } = await supabase
          .from('nyongs')
          .insert({
            owner_id: userId,
            name: name.trim(),
            birthday: birthday || null,
            gender: gender || null,
            personality: personality.trim() || null,
            front_photo_url: frontPhotoUrl,
            photo_urls: photoUrls,
            features,
            front_embedding: frontEmbedding,
            embeddings,
          })
          .select()
          .single();

        if (error) throw error;

        // 첫 뇽 등록 포인트 보너스
        const { data: granted } = await supabase.rpc('grant_first_nyong_bonus', {
          owner_uuid: userId,
        });
        if (granted && granted > 0) {
          Alert.alert('+10 뇽포인트!', t().nyongRegister.pointsBonus);
        }

        router.replace(`/nyong-id-card?nyongId=${data.id}`);
      }
    } catch (error) {
      console.error('Register/update error:', error);
      Alert.alert(
        t().common.error,
        isEditMode ? t().nyongRegister.errorUpdateFailed : t().nyongRegister.errorRegisterFailed
      );
    } finally {
      setIsRegistering(false);
      setAnalysisStep('');
    }
  };

  const isLoading = isAnalyzing || isRegistering;

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
      {/* 상단 뒤로가기 */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backArrow}>
        <Text style={styles.backArrowText}>←</Text>
      </TouchableOpacity>

      {/* 헤더 */}
      <View style={styles.header}>
        <Image
          source={require('../assets/nyong_paw.png')}
          style={styles.headerImage}
          contentFit="contain"
        />
        <Text style={styles.title}>{isEditMode ? t().nyongRegister.editTitle : t().nyongRegister.title}</Text>
        {!isEditMode && <Text style={styles.subtitle}>{t().nyongRegister.subtitle}</Text>}
        {!isEditMode && <Text style={styles.promoText}>{t().nyongRegister.pointsPromo}</Text>}
      </View>

      {/* 뇽 이름 */}
      <View style={styles.section}>
        <Text style={styles.label}>{t().nyongRegister.nameLabel}<Text style={styles.requiredStar}> *</Text></Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t().nyongRegister.namePlaceholder}
          placeholderTextColor={colors.textTertiary}
          maxLength={20}
        />
      </View>

      {/* 생일 */}
      <View style={styles.section}>
        <Text style={styles.label}>{t().nyongRegister.birthdayLabel}</Text>
        <Text style={styles.description}>{t().nyongRegister.birthdayPlaceholder}</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowBirthdayPicker(true)}
          disabled={isLoading}
        >
          <Text style={[styles.dateButtonText, !birthday && { color: colors.textTertiary }]}>
            {birthday ? birthday.slice(0, 7).replace(/-/g, '.') : 'YYYY . MM'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 성별 */}
      <View style={styles.section}>
        <Text style={styles.label}>{t().nyongRegister.genderLabel}</Text>
        <View style={styles.genderRow}>
          {(['male', 'female', 'unknown'] as const).map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.genderChip, gender === g && styles.genderChipActive]}
              onPress={() => setGender(g)}
              disabled={isLoading}
            >
              <Text style={[styles.genderChipText, gender === g && styles.genderChipTextActive]}>
                {g === 'male' ? t().nyongRegister.genderMale : g === 'female' ? t().nyongRegister.genderFemale : t().nyongRegister.genderUnknown}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 성격 */}
      <View style={styles.section}>
        <Text style={styles.label}>{t().nyongRegister.personalityLabel}</Text>
        <TextInput
          style={styles.personalityInput}
          placeholder={t().nyongRegister.personalityPlaceholder}
          placeholderTextColor={colors.textTertiary}
          value={personality}
          onChangeText={(text) => setPersonality(text.slice(0, 30))}
          maxLength={30}
          editable={!isLoading}
        />
      </View>

      {/* 정면 사진 */}
      <View style={styles.section}>
        <Text style={styles.label}>{t().nyongRegister.frontPhotoLabel}<Text style={styles.requiredStar}> *</Text></Text>
        <Text style={styles.description}>{t().nyongRegister.frontPhotoDesc}</Text>

        {frontPhoto ? (
          <TouchableOpacity
            style={[styles.mainPhotoBox, styles.mainPhotoBoxFilled]}
            onPress={() => pickImage(true)}
            disabled={isLoading}
          >
            <Image source={{ uri: frontPhoto }} style={styles.mainPhoto} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.addPhotoButton}
            onPress={() => pickImage(true)}
            disabled={isLoading}
          >
            <Text style={styles.mainAddIcon}>+</Text>
            <Text style={styles.mainAddText}>{t().nyongRegister.addPhoto}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 추가 사진 */}
      <View style={styles.section}>
        <Text style={styles.label}>{t().nyongRegister.additionalPhotos}</Text>
        <Text style={styles.description}>{t().nyongRegister.additionalPhotosDesc}</Text>

        <View style={styles.additionalPhotosRow}>
          {additionalPhotos.map((photo, index) => (
            <TouchableOpacity
              key={index}
              style={styles.additionalPhotoBox}
              onPress={() => removeAdditionalPhoto(index)}
            >
              <Image source={{ uri: photo }} style={styles.additionalPhoto} />
              <View style={styles.removeButton}>
                <Text style={styles.removeButtonText}>×</Text>
              </View>
            </TouchableOpacity>
          ))}

          {additionalPhotos.length < 4 && (
            <TouchableOpacity
              style={styles.addPhotoBox}
              onPress={() => pickImage(false)}
              disabled={isLoading}
            >
              <Text style={styles.addPhotoIcon}>+</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 분석 상태 */}
      {isLoading && (
        <View style={styles.loadingSection}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{analysisStep || t().nyongRegister.analyzing}</Text>
        </View>
      )}

      {/* 등록 버튼 */}
      <TouchableOpacity
        style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
        onPress={handleRegister}
        disabled={isLoading}
      >
        <Text style={styles.registerButtonText}>
          {isRegistering
            ? (isEditMode ? t().nyongRegister.updating : t().nyongRegister.registering)
            : (isEditMode ? t().nyongRegister.updateButton : t().nyongRegister.registerButton)}
        </Text>
      </TouchableOpacity>

      <Modal visible={showBirthdayPicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>{t().nyongRegister.birthdayLabel}</Text>
            <BirthdayPicker
              initialYear={2022}
              initialMonth={1}
              onDateChange={(y, m) => {
                setBirthday(`${y}-${m.toString().padStart(2, '0')}-01`);
              }}
            />
            <TouchableOpacity
              style={styles.pickerDoneButton}
              onPress={() => setShowBirthdayPicker(false)}
            >
              <Text style={styles.pickerDoneText}>{t().common.confirm}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerImage: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  promoText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  requiredStar: {
    color: colors.primary,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mainPhotoBox: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  mainPhotoBoxFilled: {},
  mainPhoto: {
    width: '100%',
    height: '100%',
  },
  addPhotoButton: {
    height: 120,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainAddIcon: {
    fontSize: 36,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  mainAddText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  additionalPhotosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  additionalPhotoBox: {
    width: 80,
    height: 80,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  additionalPhoto: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.overlayMedium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  addPhotoBox: {
    width: 80,
    height: 80,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoIcon: {
    fontSize: 32,
    color: colors.textSecondary,
  },
  loadingSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  registerButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    marginTop: 16,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  dateButton: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  genderChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderChipText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  genderChipTextActive: {
    color: colors.white,
  },
  personalityInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.white,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: colors.overlayDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 24,
    width: Math.min(320, screenWidth - 48),
    alignItems: 'center',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  pickerDoneButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 48,
    paddingVertical: 12,
    borderRadius: radius.xl,
    marginTop: 16,
  },
  pickerDoneText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  backArrow: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  backArrowText: {
    fontSize: 24,
    color: colors.text,
  },
});
