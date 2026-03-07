import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { colors, radius } from '../lib/theme';
import { TimePicker } from '../components/TimePicker';
import { Toast } from '../components/Toast';
import { t, format } from '../lib/i18n';
import { sendPushNotification } from '../lib/notifications';
import { useBgm, PLAYLIST } from '../contexts/BgmContext';

const { width: screenWidth } = Dimensions.get('window');

export default function SettingsScreen() {
  const router = useRouter();
  const { session, profile, signOut, deleteAccount, refreshProfile, sendTestNotification, isTestMode } = useAuth();
  const insets = useSafeAreaInsets();
  const isAdmin = profile?.is_admin || profile?.nickname === 'admin';
  const { isBgmOn, setBgmOn, currentTrackIndex, enabledTracks, toggleTrack, selectTrack } = useBgm();

  const [nickname, setNickname] = useState('');
  const [useExclusion, setUseExclusion] = useState(false);
  const [exclusionStart, setExclusionStart] = useState('00:00');
  const [exclusionEnd, setExclusionEnd] = useState('08:00');
  const [isSaving, setIsSaving] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });


  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || '');
      setUseExclusion(profile.use_exclusion ?? true);
      setExclusionStart(profile.exclusion_start || '00:00');
      setExclusionEnd(profile.exclusion_end || '06:00');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert(t().common.error, t().settings.errorEmptyNickname);
      return;
    }
    if (!/^[가-힣a-zA-Z0-9\s]+$/.test(nickname.trim())) {
      Alert.alert(t().common.error, t().onboarding.errorInvalidNickname);
      return;
    }

    const userId = profile?.id || session?.user?.id;
    if (!userId) {
      Alert.alert(t().common.error, t().settings.errorSessionExpired);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nickname: nickname.trim(),
          use_exclusion: useExclusion,
          exclusion_start: exclusionStart,
          exclusion_end: exclusionEnd,
        })
        .eq('id', userId);

      if (error) throw error;

      await refreshProfile();
      setToast({ visible: true, message: t().settings.saveSuccess });
    } catch (error: any) {
      Alert.alert(t().common.error, error.message || t().settings.errorSaveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      t().settings.logoutTitle,
      t().settings.logoutMessage,
      [
        { text: t().common.cancel, style: 'cancel' },
        {
          text: t().settings.logout,
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t().settings.deleteAccountTitle,
      t().settings.deleteAccountMessage,
      [
        { text: t().common.cancel, style: 'cancel' },
        {
          text: t().settings.deleteAccountConfirm,
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              router.replace('/onboarding');
            } catch (error: any) {
              Alert.alert(t().common.error, error.message || t().settings.deleteAccountError);
            }
          },
        },
      ]
    );
  };

  // 테스트: 뇽펀치 화면으로 바로 이동
  const handleTestPush = () => {
    // test mode: mock delivery 첫번째 항목 사용 (매옹이 #코롬하다냥)
    const mockDelivery = isTestMode ? require('../lib/mockData').MOCK_DELIVERIES[0] : null;
    const testImage = mockDelivery?.upload?.image_url || 'https://cdn2.thecatapi.com/images/0XYvRd7oD.jpg';
    const testCatId = mockDelivery?.id?.toString() || '0';
    router.dismiss(); // 설정 모달 닫기
    setTimeout(() => {
      router.push({
        pathname: '/notification',
        params: {
          catId: testCatId,
          catImage: encodeURIComponent(testImage),
        },
      });
    }, 300);
  };

  const parseTime = (timeStr: string) => {
    const parts = timeStr.split(':');
    return {
      hour: parseInt(parts[0] || '0', 10),
      minute: parseInt(parts[1] || '0', 10),
    };
  };

  const startTime = parseTime(exclusionStart);
  const endTime = parseTime(exclusionEnd);

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t().settings.profileSection}</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t().settings.nicknameLabel}</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder={t().settings.nicknamePlaceholder}
            maxLength={20}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t().settings.alarmSection}</Text>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>{t().settings.exclusionToggle}</Text>
            <Text style={styles.switchDescription}>
              {t().settings.exclusionDescription}
            </Text>
          </View>
          <Switch
            value={useExclusion}
            onValueChange={setUseExclusion}
            trackColor={{ false: colors.switchTrackOff, true: colors.primaryLight }}
            thumbColor={useExclusion ? colors.primary : colors.switchThumbOff}
          />
        </View>

        {useExclusion && (
          <View style={styles.timeContainer}>
            <View style={styles.timeInput}>
              <Text style={styles.label}>{t().settings.startTime}</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={styles.timeButtonText}>{exclusionStart}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.timeInput}>
              <Text style={styles.label}>{t().settings.endTime}</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={styles.timeButtonText}>{exclusionEnd}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t().settings.bgmSection}</Text>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchDescription}>
              {t().settings.bgmDescription}
            </Text>
          </View>
          <Switch
            value={isBgmOn}
            onValueChange={setBgmOn}
            trackColor={{ false: colors.switchTrackOff, true: colors.primaryLight }}
            thumbColor={isBgmOn ? colors.primary : colors.switchThumbOff}
          />
        </View>
        <View style={styles.playlistContainer}>
          {PLAYLIST.map((track, index) => {
            const isPlaying = isBgmOn && currentTrackIndex === index;
            const isEnabled = enabledTracks[index];
            const isDisabled = !isBgmOn;
            return (
              <View key={index} style={styles.trackItem}>
                <TouchableOpacity onPress={() => toggleTrack(index)} hitSlop={8} disabled={isDisabled}>
                  <View style={[styles.checkbox, isEnabled && !isDisabled && styles.checkboxActive, isEnabled && isDisabled && styles.checkboxDisabled]}>
                    {isEnabled && <Text style={[styles.checkmark, isDisabled && styles.checkmarkDisabled]}>✓</Text>}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.trackTitleArea}
                  onPress={() => selectTrack(index)}
                  activeOpacity={0.6}
                  disabled={isDisabled}
                >
                  <Text style={[styles.trackTitle, (isDisabled || !isEnabled) && styles.trackTitleDisabled]}>
                    {t().settings[track.titleKey]}
                  </Text>
                  {isPlaying && <Text style={styles.nowPlaying}>♪</Text>}
                </TouchableOpacity>
                <Text style={[styles.trackDuration, (isDisabled || !isEnabled) && styles.trackDurationDisabled]}>
                  {track.duration}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 뇽 포인트 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t().points.sectionTitle}</Text>
        <TouchableOpacity style={styles.pointsRow} onPress={() => router.push('/upload-calendar')} activeOpacity={0.7}>
          <Text style={styles.pointsLabel}>{t().points.balance}</Text>
          <View style={styles.pointsRight}>
            <Text style={styles.pointsValue}>
              {format(t().points.currentPoints, { count: profile?.nyong_points ?? 0 })}
            </Text>
            <Text style={styles.pointsArrow}>{'›'}</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.pointsDescription}>{t().points.description}</Text>
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.saveButtonText}>{t().common.save}</Text>
        )}
      </TouchableOpacity>

      {isAdmin && (
        <View style={styles.adminRow}>
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => router.push('/admin')}
          >
            <Text style={styles.adminButtonText}>{t().settings.adminPage}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.testPushButton}
            onPress={handleTestPush}
          >
            <Text style={styles.testPushButtonText}>테스트 푸시</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOutText}>{t().settings.logout}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDeleteAccount}>
          <Text style={styles.deleteAccountText}>{t().settings.deleteAccount}</Text>
        </TouchableOpacity>
        <Text style={styles.footerText}>{t().settings.version}</Text>
      </View>

      <Modal visible={showStartPicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>{t().settings.startTime}</Text>
            <TimePicker
              initialHour={startTime.hour}
              onTimeChange={(hour) => {
                setExclusionStart(`${hour.toString().padStart(2, '0')}:00`);
              }}
            />
            <TouchableOpacity
              style={styles.pickerDoneButton}
              onPress={() => setShowStartPicker(false)}
            >
              <Text style={styles.pickerDoneText}>{t().common.confirm}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showEndPicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>{t().settings.endTime}</Text>
            <TimePicker
              initialHour={endTime.hour}
              onTimeChange={(hour) => {
                setExclusionEnd(`${hour.toString().padStart(2, '0')}:00`);
              }}
            />
            <TouchableOpacity
              style={styles.pickerDoneButton}
              onPress={() => setShowEndPicker(false)}
            >
              <Text style={styles.pickerDoneText}>{t().common.confirm}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  section: {
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: radius.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    color: colors.text,
  },
  switchDescription: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  timeInput: {
    flex: 1,
  },
  timeButton: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: radius.xl,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  adminRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    gap: 8,
  },
  adminButton: {
    flex: 1,
    backgroundColor: colors.adminButton,
    paddingVertical: 10,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  adminButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  testPushButton: {
    flex: 1,
    backgroundColor: colors.testButton,
    paddingVertical: 10,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  testPushButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 30,
    gap: 12,
  },
  signOutText: {
    fontSize: 13,
    color: colors.textTertiary,
    textDecorationLine: 'underline',
  },
  deleteAccountText: {
    fontSize: 12,
    color: colors.textDisabled,
    textDecorationLine: 'underline',
  },
  footerText: {
    fontSize: 12,
    color: colors.textDisabled,
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
    width: Math.min(300, screenWidth - 60),
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
  playlistContainer: {
    marginTop: 14,
    gap: 4,
  },
  trackItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  trackTitleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxDisabled: {
    backgroundColor: colors.textDisabled,
    borderColor: colors.textDisabled,
  },
  checkmark: {
    color: colors.white,
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: -1,
  },
  checkmarkDisabled: {
    color: colors.white,
  },
  trackTitle: {
    fontSize: 14,
    color: colors.text,
  },
  trackTitleDisabled: {
    color: colors.textDisabled,
  },
  nowPlaying: {
    fontSize: 13,
    color: colors.primary,
  },
  trackDuration: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  trackDurationDisabled: {
    color: colors.textDisabled,
  },
  // 뇽 포인트
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pointsLabel: {
    fontSize: 16,
    color: colors.text,
  },
  pointsRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  pointsArrow: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  pointsDescription: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 14,
    lineHeight: 18,
  },
});
