import React, { useState, useEffect, useRef } from 'react';
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
  ScrollView,
  BackHandler,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { colors, radius } from '../lib/theme';
import { t, format } from '../lib/i18n';

const RESEND_COOLDOWN = 60;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidPassword(pw: string): boolean {
  if (pw.length < 5 || pw.length > 20) return false;
  let types = 0;
  if (/[a-zA-Z]/.test(pw)) types++;
  if (/[0-9]/.test(pw)) types++;
  if (/[^a-zA-Z0-9]/.test(pw)) types++;
  return types >= 2;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { setTestMode, refreshProfile } = useAuth();
  const [step, setStep] = useState<'welcome' | 'signup' | 'verify'>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 쿨다운 타이머
  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [resendCooldown > 0]);

  // Android 뒤로가기: 온보딩 스텝 내 뒤로가기 처리
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'verify') {
        setStep('signup');
        setOtpCode('');
        return true;
      }
      if (step === 'signup') {
        setStep('welcome');
        return true;
      }
      return true; // welcome: 루트 — 모달 dismiss 방지
    });
    return () => handler.remove();
  }, [step]);

  const openPrivacyPolicy = () => {
    WebBrowser.openBrowserAsync('https://github.com/sunhyeong-hong/nyong/blob/main/privacy-policy.md');
  };

  const handleGoogleSignIn = async () => {
    if (!agreedToPrivacy) {
      Alert.alert(t().common.error, t().onboarding.errorPrivacyRequired);
      return;
    }
    setIsLoading(true);
    try {
      const redirectUrl = 'nyongpamin://google-auth';

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
    if (!EMAIL_REGEX.test(email)) {
      Alert.alert(t().common.error, t().onboarding.errorInvalidEmail);
      return;
    }
    if (!isValidPassword(password)) {
      Alert.alert(t().common.error, t().onboarding.errorInvalidPassword);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // 이미 가입된 이메일인 경우 identities가 빈 배열
      if (data.user?.identities?.length === 0) {
        Alert.alert(t().common.error, t().onboarding.errorAlreadyRegistered);
        return;
      }

      if (data.user) {
        setOtpCode('');
        setResendCooldown(RESEND_COOLDOWN);
        setStep('verify');
      }
    } catch (error: any) {
      Alert.alert(t().common.error, error.message || t().onboarding.errorSignup);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      Alert.alert(t().common.error, t().onboarding.errorInvalidOtp);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'signup',
      });

      if (error) throw error;

      if (data.user) {
        // 기본 프로필 생성 후 설정 화면으로 이동
        await supabase.from('profiles').upsert({
          id: data.user.id,
          nickname: '뇽집사',
          use_exclusion: true,
          exclusion_start: '00:00',
          exclusion_end: '06:00',
          is_admin: false,
        });
        await refreshProfile();
        router.replace('/nickname-setup');
      }
    } catch (error: any) {
      Alert.alert(t().common.error, error.message || t().onboarding.errorInvalidOtp);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;
      setResendCooldown(RESEND_COOLDOWN);
    } catch (error: any) {
      Alert.alert(t().common.error, error.message || t().onboarding.errorResendFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert(t().common.error, t().onboarding.errorEmptyFields);
      return;
    }

    // admin 테스트 모드는 검증 스킵
    if (email === 'admin' && password === 'admin') {
      setIsLoading(true);
      await setTestMode(true);
      setIsLoading(false);
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


  if (step === 'welcome') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Image
            source={require('../assets/nyong_text.png')}
            style={{ width: 220, height: 220 }}
            contentFit="contain"
          />
          {t().onboarding.appTagline ? (
            <Text style={styles.subtitle}>{t().onboarding.appTagline}</Text>
          ) : null}
          <Text style={styles.description}>
            {t().onboarding.appDescription}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          {/* 개인정보처리방침 동의 */}
          <View style={styles.privacyRow}>
            <TouchableOpacity
              style={[styles.checkbox, agreedToPrivacy && styles.checkboxChecked]}
              onPress={() => setAgreedToPrivacy(!agreedToPrivacy)}
            >
              {agreedToPrivacy && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            <Text style={styles.privacyText}>{t().onboarding.privacyAgree}</Text>
            <TouchableOpacity onPress={openPrivacyPolicy}>
              <Text style={styles.privacyLink}>{t().onboarding.privacyLink}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.googleButton, !agreedToPrivacy && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={isLoading || !agreedToPrivacy}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.googleButtonText}>{t().onboarding.googleLogin}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (!agreedToPrivacy) {
                Alert.alert(t().common.error, t().onboarding.errorPrivacyRequired);
                return;
              }
              setStep('signup');
            }}
          >
            <Text style={styles.emailLoginLink}>{t().onboarding.emailLogin}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (step === 'verify') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.content}>
            <Image
              source={require('../assets/nyong_fish.png')}
              style={styles.stepImage}
              contentFit="contain"
            />
            <Text style={styles.stepTitle}>{t().onboarding.verifyTitle}</Text>
            <Text style={styles.stepDescription}>
              {format(t().onboarding.verifyDescription, { email })}
            </Text>

            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder={t().onboarding.verifyPlaceholder}
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              textAlign="center"
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, otpCode.length !== 6 && styles.buttonDisabled]}
              onPress={handleVerifyOtp}
              disabled={isLoading || otpCode.length !== 6}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>{t().onboarding.verifyButton}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResendOtp}
              disabled={resendCooldown > 0 || isLoading}
            >
              <Text style={[styles.resendText, resendCooldown > 0 && styles.resendTextDisabled]}>
                {resendCooldown > 0
                  ? format(t().onboarding.resendCooldown, { seconds: resendCooldown })
                  : t().onboarding.resendButton}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setStep('signup'); setOtpCode(''); }}>
              <Text style={styles.backText}>{t().common.back}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.content}>
          <Image
            source={require('../assets/nyong_fish.png')}
            style={styles.stepImage}
            contentFit="contain"
          />
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 8,
  },
  description: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 28,
  },
  stepImage: {
    width: 120,
    height: 120,
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
    textAlign: 'center',
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
  otpInput: {
    fontSize: 28,
    letterSpacing: 8,
    fontWeight: '700',
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
  buttonDisabled: {
    opacity: 0.5,
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
  resendText: {
    color: colors.primary,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  resendTextDisabled: {
    color: colors.textTertiary,
  },
  backText: {
    color: colors.textTertiary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  privacyText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  privacyLink: {
    fontSize: 12,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
