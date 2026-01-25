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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, signOut, refreshProfile } = useAuth();

  const [nickname, setNickname] = useState('');
  const [useExclusion, setUseExclusion] = useState(false);
  const [exclusionStart, setExclusionStart] = useState('00:00');
  const [exclusionEnd, setExclusionEnd] = useState('08:00');
  const [isSaving, setIsSaving] = useState(false);

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
            trackColor={{ false: '#ddd', true: '#FFB6C1' }}
            thumbColor={useExclusion ? '#FF6B9D' : '#f4f3f4'}
          />
        </View>

        {useExclusion && (
          <View style={styles.timeContainer}>
            <View style={styles.timeInput}>
              <Text style={styles.label}>시작 시간</Text>
              <TextInput
                style={styles.input}
                value={exclusionStart}
                onChangeText={setExclusionStart}
                placeholder="00:00"
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.timeInput}>
              <Text style={styles.label}>종료 시간</Text>
              <TextInput
                style={styles.input}
                value={exclusionEnd}
                onChangeText={setExclusionEnd}
                placeholder="08:00"
                keyboardType="numbers-and-punctuation"
              />
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
          <ActivityIndicator color="#fff" />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F7',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
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
    color: '#333',
  },
  switchDescription: {
    fontSize: 12,
    color: '#888',
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
  saveButton: {
    backgroundColor: '#FF6B9D',
    marginHorizontal: 20,
    marginTop: 30,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  signOutButton: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  signOutButtonText: {
    color: '#888',
    fontSize: 16,
  },
  footer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  footerText: {
    fontSize: 12,
    color: '#bbb',
  },
});
