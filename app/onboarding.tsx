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
import { supabase } from '../lib/supabase';
import { CatPaw } from '../components/CatPaw';
import { useAuth } from '../contexts/AuthContext';

export default function OnboardingScreen() {
  const router = useRouter();
  const { setTestMode } = useAuth();
  const [step, setStep] = useState<'welcome' | 'signup' | 'nickname'>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('오류', '이메일과 비밀번호를 입력해주세요.');
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
        setStep('nickname');
      }
    } catch (error: any) {
      Alert.alert('오류', error.message || '회원가입에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    // 테스트용 admin 로그인
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
      Alert.alert('오류', error.message || '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetNickname = async () => {
    if (!nickname.trim()) {
      Alert.alert('오류', '닉네임을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('사용자를 찾을 수 없습니다.');

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        nickname: nickname.trim(),
        use_exclusion: false,
        exclusion_start: '00:00',
        exclusion_end: '08:00',
        is_admin: false,
      });

      if (error) throw error;
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('오류', error.message || '프로필 설정에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'welcome') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <CatPaw width={120} height={120} color="#FF6B9D" />
          <Text style={styles.title}>뇽</Text>
          <Text style={styles.subtitle}>랜덤 고양이 알람</Text>
          <Text style={styles.description}>
            하루에 한 번, 랜덤한 시간에{'\n'}
            귀여운 고양이가 찾아옵니다!
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setStep('signup')}
          >
            <Text style={styles.primaryButtonText}>시작하기</Text>
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
          <CatPaw width={80} height={80} color="#FF6B9D" />
          <Text style={styles.stepTitle}>닉네임 설정</Text>
          <Text style={styles.stepDescription}>
            다른 사용자에게 보여질 이름이에요
          </Text>

          <TextInput
            style={styles.input}
            placeholder="닉네임"
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
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>완료</Text>
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
        <CatPaw width={80} height={80} color="#FF6B9D" />
        <Text style={styles.stepTitle}>로그인 / 회원가입</Text>

        <TextInput
          style={styles.input}
          placeholder="이메일"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="비밀번호"
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
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>로그인</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleSignUp}
          disabled={isLoading}
        >
          <Text style={styles.secondaryButtonText}>회원가입</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setStep('welcome')}>
          <Text style={styles.backText}>뒤로가기</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F7',
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
    color: '#FF6B9D',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
  },
  description: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 30,
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
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
  primaryButton: {
    backgroundColor: '#FF6B9D',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B9D',
  },
  secondaryButtonText: {
    color: '#FF6B9D',
    fontSize: 18,
    fontWeight: '600',
  },
  backText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
