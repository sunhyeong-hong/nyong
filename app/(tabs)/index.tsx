import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { CatPaw } from '../../components/CatPaw';
import { NotificationBanner } from '../../components/NotificationBanner';
import { supabase } from '../../lib/supabase';
import { ReceivedCat, Cat } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
  const {
    session,
    profile,
    isLoading,
    isTestMode,
    incomingCat,
    testReceivedCats,
    sendTestNotification,
    clearIncomingCat,
  } = useAuth();
  const [todayCat, setTodayCat] = useState<Cat | null>(null);
  const [recentCats, setRecentCats] = useState<ReceivedCat[]>([]);
  const [isLoadingCats, setIsLoadingCats] = useState(true);

  useEffect(() => {
    if (!isLoading && !session && !isTestMode) {
      router.replace('/onboarding');
    }
  }, [session, isLoading, isTestMode]);

  useEffect(() => {
    if (session?.user?.id && !isTestMode) {
      fetchReceivedCats();
    } else if (isTestMode) {
      setIsLoadingCats(false);
    }
  }, [session, isTestMode]);

  // 테스트 모드에서 testReceivedCats가 업데이트되면 todayCat도 업데이트
  useEffect(() => {
    if (isTestMode && testReceivedCats.length > 0) {
      setTodayCat(testReceivedCats[0].cat || null);
    }
  }, [isTestMode, testReceivedCats]);

  const fetchReceivedCats = async () => {
    try {
      const { data, error } = await supabase
        .from('received_cats')
        .select(`
          *,
          cat:cats(*)
        `)
        .eq('user_id', session?.user?.id)
        .order('received_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentCats(data || []);
      if (data && data.length > 0) {
        setTodayCat(data[0].cat);
      }
    } catch (error) {
      console.log('Error fetching cats:', error);
    } finally {
      setIsLoadingCats(false);
    }
  };

  const handleTestNotification = () => {
    sendTestNotification();
  };

  const handleNotificationPress = () => {
    if (incomingCat) {
      clearIncomingCat();
      router.push({
        pathname: '/notification',
        params: { catId: incomingCat.id, catImage: incomingCat.image_url },
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B9D" />
      </View>
    );
  }

  const displayRecentCats = isTestMode ? testReceivedCats : recentCats;

  return (
    <View style={styles.wrapper}>
      <NotificationBanner
        visible={!!incomingCat}
        catImage={incomingCat?.image_url || ''}
        onPress={handleNotificationPress}
        onDismiss={clearIncomingCat}
      />
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>안녕하세요, {profile?.nickname || '뇽'}!</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.settingsText}>설정</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mainCard}>
        <CatPaw width={80} height={80} color="#FF6B9D" />
        <Text style={styles.waitingText}>다음 뇽을 기다리는 중...</Text>
        <Text style={styles.subText}>알람이 오면 고양이를 터치하세요!</Text>

        <TouchableOpacity
          style={styles.testButton}
          onPress={handleTestNotification}
        >
          <Text style={styles.testButtonText}>테스트 알림 받기</Text>
        </TouchableOpacity>
      </View>

      {todayCat && (
        <View style={styles.todaySection}>
          <Text style={styles.sectionTitle}>오늘의 고양이</Text>
          <Image
            source={{ uri: todayCat.image_url }}
            style={styles.todayCatImage}
            resizeMode="cover"
          />
        </View>
      )}

      {displayRecentCats.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>최근 받은 고양이</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {displayRecentCats.map((item) => (
              <View key={item.id} style={styles.recentCatItem}>
                {item.cat && (
                  <Image
                    source={{ uri: item.cat.image_url }}
                    style={styles.recentCatImage}
                    resizeMode="cover"
                  />
                )}
                <Text style={styles.hitsText}>{item.hits} 번 터치</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {profile?.is_admin && (
        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => router.push('/admin')}
        >
          <Text style={styles.adminButtonText}>관리자 페이지</Text>
        </TouchableOpacity>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#FFF5F7',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsButton: {
    padding: 8,
  },
  settingsText: {
    fontSize: 16,
    color: '#FF6B9D',
  },
  mainCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  waitingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  subText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  testButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  testButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  todaySection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  todayCatImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  recentSection: {
    paddingLeft: 20,
    marginBottom: 20,
  },
  recentCatItem: {
    marginRight: 12,
  },
  recentCatImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  hitsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  adminButton: {
    backgroundColor: '#333',
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  adminButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
