import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, radius } from '../lib/theme';
import { t } from '../lib/i18n';
import { CatPaw } from '../components/CatPaw';
import type { Nyong } from '../types';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 48;

export default function NyongIdCardScreen() {
  const { nyongId } = useLocalSearchParams<{ nyongId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [nyong, setNyong] = useState<Nyong | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNyong();
  }, [nyongId]);

  const fetchNyong = async () => {
    if (!nyongId) return;
    try {
      const { data, error } = await supabase
        .from('nyongs')
        .select('*')
        .eq('id', parseInt(nyongId))
        .single();
      if (error) throw error;
      setNyong(data);
    } catch (error) {
      console.error('Fetch nyong error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const citizenNo = nyong ? `NYONG-${String(nyong.id).padStart(6, '0')}` : '';

  const formattedBirthday = nyong?.birthday
    ? nyong.birthday.replace(/-/g, '.')
    : t().idCard.noBirthday;

  const genderText = nyong?.gender
    ? nyong.gender === 'male'
      ? t().idCard.genderMale
      : nyong.gender === 'female'
        ? t().idCard.genderFemale
        : t().idCard.genderUnknown
    : t().idCard.genderUnknown;

  const personalityText = nyong?.personality || t().idCard.noPersonality;

  const formattedRegDate = nyong
    ? new Date(nyong.created_at).toISOString().slice(0, 10).replace(/-/g, '.')
    : '';

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!nyong) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{t().common.error}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>{t().common.back}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {/* 뒤로가기 */}
      <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { top: insets.top + 12 }]}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      {/* 카드 */}
      <View style={styles.card}>
        {/* 워터마크 */}
        <View style={styles.watermark}>
          <CatPaw width={180} height={180} />
        </View>

        {/* 헤더 */}
        <View style={styles.cardHeader}>
          <View style={styles.headerIcon}>
            <CatPaw width={20} height={20} />
          </View>
          <Text style={styles.cardHeaderText}>{t().idCard.subtitle}</Text>
        </View>

        {/* 바디 */}
        <View style={styles.cardBody}>
          {/* 사진 */}
          <View style={styles.photoFrame}>
            <Image
              source={{ uri: nyong.front_photo_url }}
              style={styles.photo}
            />
          </View>

          {/* 정보 */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t().idCard.nameLabel}</Text>
              <Text style={styles.infoValue}>{nyong.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t().idCard.birthdayLabel}</Text>
              <Text style={styles.infoValue}>{formattedBirthday}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t().idCard.genderLabel}</Text>
              <Text style={styles.infoValue}>{genderText}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t().idCard.personalityLabel}</Text>
              <Text style={styles.infoValue}>{personalityText}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t().idCard.regDateLabel}</Text>
              <Text style={styles.infoValue}>{formattedRegDate}</Text>
            </View>
            <View style={styles.citizenNoRow}>
              <Text style={styles.citizenNoLabel}>{t().idCard.citizenNoLabel}</Text>
              <Text style={styles.citizenNoValue}>{citizenNo}</Text>
            </View>
          </View>
        </View>

        {/* 푸터 */}
        <View style={styles.cardFooter}>
          <View style={styles.footerLine} />
          <Text style={styles.issuedBy}>{t().idCard.issuedBy}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  backLink: {
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  watermark: {
    position: 'absolute',
    bottom: 20,
    right: -20,
    opacity: 0.04,
  },

  // Header
  cardHeader: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 10,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 1.5,
  },

  // Body
  cardBody: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  photoFrame: {
    width: 100,
    height: 120,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  infoSection: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    width: 42,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  citizenNoRow: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  citizenNoLabel: {
    fontSize: 9,
    color: colors.textTertiary,
  },
  citizenNoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },

  // Footer
  cardFooter: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  footerLine: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 8,
  },
  issuedBy: {
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // Back button
  backButton: {
    position: 'absolute',
    left: 20,
    top: 0,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 24,
    color: colors.text,
  },
});
