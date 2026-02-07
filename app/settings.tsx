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
import { t } from '../lib/i18n';

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, signOut, refreshProfile } = useAuth();
  const isAdmin = profile?.is_admin || profile?.nickname === 'admin';

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
      Alert.alert(t().common.error, t().settings.errorEmptyNickname);
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
      Alert.alert(t().common.success, t().settings.saveSuccess);
      router.back();
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
            thumbColor={useExclusion ? colors.primary : '#f4f3f4'}
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

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.saveButtonText}>{t().common.save}</Text>
        )}
      </TouchableOpacity>

      {isAdmin && (
        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => router.push('/admin')}
        >
          <Text style={styles.adminButtonText}>{t().settings.adminPage}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>{t().settings.logout}</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t().settings.version}</Text>
      </View>

      <Modal visible={showStartPicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>{t().settings.startTime}</Text>
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
  adminButton: {
    backgroundColor: colors.adminButton,
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  adminButtonText: {
    color: colors.white,
    fontSize: 16,
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
