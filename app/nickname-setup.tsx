import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { colors, radius } from '../lib/theme';
import { t } from '../lib/i18n';

// 한글, 영문, 숫자, 공백만 허용
const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9\s]+$/;

export default function NicknameSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, profile, refreshProfile } = useAuth();
  const [nickname, setNickname] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleStart = async () => {
    if (!nickname.trim()) {
      Alert.alert(t().common.error, t().settings.errorEmptyNickname);
      return;
    }
    if (!NICKNAME_REGEX.test(nickname.trim())) {
      Alert.alert(t().common.error, t().onboarding.errorInvalidNickname);
      return;
    }

    const userId = profile?.id || session?.user?.id;
    if (!userId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nickname: nickname.trim() })
        .eq('id', userId);

      if (error) throw error;

      await refreshProfile();
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(t().common.error, error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <Image
          source={require('../assets/nyong_hi.png')}
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.title}>{t().nicknameSetup.title}</Text>
        <Text style={styles.subtitle}>{t().nicknameSetup.subtitle}</Text>

        <TextInput
          style={styles.input}
          placeholder={t().nicknameSetup.placeholder}
          placeholderTextColor={colors.textMuted}
          value={nickname}
          onChangeText={setNickname}
          maxLength={20}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleStart}
        />
        <Text style={styles.hint}>{t().nicknameSetup.hint}</Text>

        <TouchableOpacity
          style={[styles.button, (!nickname.trim() || isSaving) && styles.buttonDisabled]}
          onPress={handleStart}
          disabled={!nickname.trim() || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>{t().nicknameSetup.button}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  image: {
    width: 140,
    height: 140,
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  input: {
    width: '100%',
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 32,
  },
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
