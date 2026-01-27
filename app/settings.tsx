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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { colors, radius } from '../lib/theme';
import { TimePicker } from '../components/TimePicker';

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, signOut, refreshProfile } = useAuth();

  const [nickname, setNickname] = useState('');
  const [useExclusion, setUseExclusion] = useState(false);
  const [exclusionStart, setExclusionStart] = useState('00:00');
  const [exclusionEnd, setExclusionEnd] = useState('08:00');
  const [isSaving, setIsSaving] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || '');
      setUseExclusion(profile.use_exclusion || false);
      setExclusionStart(profile.exclusion_start || '00:00');
      setExclusionEnd(profile.exclusion_end || '08:00');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert('오류', '닉네임을 입력해주세요.');
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
        .eq('id', profile?.id);

      if (error) throw error;

      await refreshProfile();
      Alert.alert('성공', '설정이 저장되었습니다.');
      router.back();
    } catch (error: any) {
      Alert.alert('오류', error.message || '저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/onboarding');
          },
        },
      ]
    );
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
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>프로필</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>닉네임</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="닉네임을 입력하세요"
            maxLength={20}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>알람 설정</Text>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>알람 제외 시간 사용</Text>
            <Text style={styles.switchDescription}>
              설정한 시간에는 알람이 오지 않습니다
            </Text>
          </View>
          <Switch
            value={useExclusion}
            onValueChange={setUseExclusion}
            trackColor={{ false: colors.switchTrackOff, true: colors.primaryLight }}
            thumbColor={useExclusion ? colors.primary : '#f4f3f4'}
          />
        </View>

        {useExclusion && (
          <View style={styles.timeContainer}>
            <View style={styles.timeInput}>
              <Text style={styles.label}>시작 시간</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={styles.timeButtonText}>{exclusionStart}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.timeInput}>
              <Text style={styles.label}>종료 시간</Text>
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

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.saveButtonText}>저장</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>로그아웃</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>뇽 v1.0.0</Text>
      </View>

      <Modal visible={showStartPicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>시작 시간</Text>
            <TimePicker
              initialHour={startTime.hour}
              initialMinute={startTime.minute}
              onTimeChange={(hour, minute) => {
                setExclusionStart(
                  `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
                );
              }}
            />
            <TouchableOpacity
              style={styles.pickerDoneButton}
              onPress={() => setShowStartPicker(false)}
            >
              <Text style={styles.pickerDoneText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showEndPicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>종료 시간</Text>
            <TimePicker
              initialHour={endTime.hour}
              initialMinute={endTime.minute}
              onTimeChange={(hour, minute) => {
                setExclusionEnd(
                  `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
                );
              }}
            />
            <TouchableOpacity
              style={styles.pickerDoneButton}
              onPress={() => setShowEndPicker(false)}
            >
              <Text style={styles.pickerDoneText}>확인</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 12,
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
    backgroundColor: colors.primary,
    marginHorizontal: 20,
    marginTop: 30,
    paddingVertical: 16,
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  signOutButton: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: radius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.switchTrackOff,
  },
  signOutButtonText: {
    color: colors.textTertiary,
    fontSize: 16,
  },
  footer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  footerText: {
    fontSize: 12,
    color: colors.textDisabled,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 24,
    width: 300,
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
});
