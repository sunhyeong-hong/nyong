import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../lib/supabase';
import { CatPaw } from '../components/CatPaw';
import { useAuth } from '../contexts/AuthContext';
import { colors, radius } from '../lib/theme';
import { t } from '../lib/i18n';

export default function OnboardingScreen() {
  const router = useRouter();
  const { setTestMode } = useAuth();
  const [step, setStep] = useState<'welcome' | 'signup' | 'nickname'>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // Expo Go에서는 native redirect 사용
      const redirectUrl = makeRedirectUri({
        native: 'nyong://',
      });

      console.log('Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'success' && result.url) {
          // URL에서 access_token과 refresh_token 추출
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) throw sessionError;
            router.replace('/(tabs)');
          }
        }
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      Alert.alert(t().common.error, error.message || t().onboarding.errorGoogleLogin);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert(t().common.error, t().onboarding.errorEmptyFields);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        setPendingUserId(data.user.id);
        setStep('nickname');
      }
    } catch (error: any) {
      Alert.alert(t().common.error, error.message || t().onboarding.errorSignup);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert(t().common.error, t().onboarding.errorEmptyFields);
      return;
    }

    if (email === 'admin' && password === 'admin') {
      setTestMode(true);
      router.replace('/(tabs)');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(t().common.error, error.message || t().onboarding.errorLogin);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetNickname = async () => {
    if (!nickname.trim()) {
      Alert.alert(t().common.error, t().onboarding.errorEmptyNickname);
      return;
    }

    setIsLoading(true);
    try {
      // 세션이 있으면 세션의 user 사용, 없으면 pendingUserId 사용
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || pendingUserId;

      if (!userId) throw new Error(t().onboarding.errorUserNotFound);

      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        nickname: nickname.trim(),
        use_exclusion: false,
        exclusion_start: '00:00',
        exclusion_end: '08:00',
        is_admin: false,
      });

      if (error) throw error;

      // 이메일 확인이 필요한 경우 안내
      if (!user) {
        Alert.alert(
          t().onboarding.signupSuccessTitle,
          t().onboarding.signupSuccessMessage,
          [{ text: t().common.confirm, onPress: () => setStep('signup') }]
        );
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert(t().common.error, error.message || t().onboarding.errorProfileSetup);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'welcome') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <CatPaw width={120} height={120} />
          <Text style={styles.title}>{t().onboarding.appName}</Text>
          <Text style={styles.subtitle}>{t().onboarding.appTagline}</Text>
          <Text style={styles.description}>
            {t().onboarding.appDescription}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.googleButtonText}>{t().onboarding.googleLogin}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setStep('signup')}
          >
            <Text style={styles.emailLoginLink}>{t().onboarding.emailLogin}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (step === 'nickname') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <CatPaw width={80} height={80} />
          <Text style={styles.stepTitle}>{t().onboarding.nicknameTitle}</Text>
          <Text style={styles.stepDescription}>
            {t().onboarding.nicknameDescription}
          </Text>

          <TextInput
            style={styles.input}
            placeholder={t().onboarding.nicknamePlaceholder}
            value={nickname}
            onChangeText={setNickname}
            autoFocus
            maxLength={20}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSetNickname}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>{t().common.complete}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <CatPaw width={80} height={80} />
        <Text style={styles.stepTitle}>{t().onboarding.loginTitle}</Text>

        <TextInput
          style={styles.input}
          placeholder={t().onboarding.emailPlaceholder}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder={t().onboarding.passwordPlaceholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>{t().onboarding.loginButton}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleSignUp}
          disabled={isLoading}
        >
          <Text style={styles.secondaryButtonText}>{t().onboarding.signupButton}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setStep('welcome')}>
          <Text style={styles.backText}>{t().common.back}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 8,
  },
  description: {
    fontSize: 16,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 24,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 30,
  },
  input: {
    width: '100%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  buttonContainer: {
    paddingHorizontal: 40,
    paddingBottom: 50,
    gap: 12,
  },
  googleButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  googleButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  emailLoginLink: {
    color: colors.textTertiary,
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.white,
    paddingVertical: 16,
    borderRadius: radius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  backText: {
    color: colors.textTertiary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
