import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { CatPaw } from '../components/CatPaw';

const { width } = Dimensions.get('window');
const COUNTDOWN_TIME = 10; // 테스트를 위해 10초로 설정

const FALLBACK_CAT_IMAGES = [
  'https://placekitten.com/400/400',
  'https://placekitten.com/401/401',
  'https://placekitten.com/402/402',
];

export default function NotificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ catId?: string; catImage?: string }>();
  const { addReceivedCat, isTestMode } = useAuth();

  const catId = params.catId ? parseInt(params.catId, 10) : Date.now();
  const catImage = params.catImage || FALLBACK_CAT_IMAGES[Math.floor(Math.random() * FALLBACK_CAT_IMAGES.length)];

  const [countdown, setCountdown] = useState(COUNTDOWN_TIME);
  const [hits, setHits] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (countdown > 0 && !isFinished) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !isFinished) {
      setIsFinished(true);
    }
  }, [countdown, isFinished]);

  // 종료 시 결과 저장
  useEffect(() => {
    if (isFinished && !isSaved && isTestMode) {
      addReceivedCat(catId, catImage, hits);
      setIsSaved(true);
    }
  }, [isFinished, isSaved, isTestMode, catId, catImage, hits]);

  const handlePunch = () => {
    if (isFinished) return;

    setHits(hits + 1);

    // 스케일 애니메이션
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // 흔들림 애니메이션
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 25,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 25,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{countdown}</Text>
          <Text style={styles.timerLabel}>초</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.catContainer,
            {
              transform: [
                { scale: scaleAnim },
                { translateX: shakeAnim },
              ],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePunch}
            disabled={isFinished}
          >
            <Image
              source={{ uri: catImage }}
              style={styles.catImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.statsContainer}>
          <CatPaw width={32} height={32} color="#FF6B9D" />
          <Text style={styles.hitsText}>{hits}</Text>
          <Text style={styles.hitsLabel}>뇽펀치!</Text>
        </View>

        {isFinished && (
          <View style={styles.resultContainer}>
            <CatPaw width={60} height={60} color="#FF6B9D" />
            <Text style={styles.resultTitle}>시간 종료!</Text>
            <Text style={styles.resultText}>
              총 {hits}번의 뇽펀치를 날렸어요!
            </Text>
            <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
              <Text style={styles.doneButtonText}>확인</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!isFinished && (
        <Text style={styles.instruction}>고양이를 터치해서 뇽펀치!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  closeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  timerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  timerLabel: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  catContainer: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  catImage: {
    width: '100%',
    height: '100%',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  hitsText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginLeft: 12,
  },
  hitsLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  instruction: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  resultContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 245, 247, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginTop: 16,
  },
  resultText: {
    fontSize: 18,
    color: '#333',
    marginTop: 12,
  },
  doneButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 30,
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
  },
});
