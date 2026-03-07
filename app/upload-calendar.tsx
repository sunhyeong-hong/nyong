import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { colors, radius } from '../lib/theme';
import { t, format } from '../lib/i18n';
import UploadCalendar from '../components/UploadCalendar';
import { Toast } from '../components/Toast';

const { width: screenWidth } = Dimensions.get('window');

export default function UploadCalendarScreen() {
  const router = useRouter();
  const { session, profile, refreshProfile } = useAuth();
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });

  if (!session?.user?.id) return null;

  const points = profile?.nyong_points ?? 0;
  const canRedeem = points >= 100;

  const handleRedeem = async () => {
    const cleaned = phoneNumber.replace(/[^0-9]/g, '');
    if (cleaned.length < 10 || cleaned.length > 11) {
      Alert.alert(t().common.error, t().points.errorInvalidPhone);
      return;
    }

    setIsRedeeming(true);
    try {
      const userId = profile?.id || session?.user?.id;
      const { data: success, error } = await supabase.rpc('redeem_points', {
        redeemer_uuid: userId,
        phone: cleaned,
      });
      if (error) throw error;
      if (!success) {
        Alert.alert(t().common.error, t().points.errorNotEnough);
        return;
      }

      await refreshProfile();
      setShowRedeemModal(false);
      setPhoneNumber('');
      setToast({ visible: true, message: t().points.redeemSuccess });
    } catch (error: any) {
      Alert.alert(t().common.error, t().points.errorRedeemFailed);
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t().points.sectionTitle}</Text>
        <Text style={styles.pointsText}>
          {format(t().points.currentPoints, { count: points })}
        </Text>
      </View>

      <UploadCalendar userId={session.user.id} />

      <Text style={styles.description}>{t().points.description}</Text>
      <TouchableOpacity onPress={() => Linking.openURL('https://link.coupang.com/a/dY2W5D')}>
        <Text style={styles.rewardHighlight}>{t().points.rewardHighlight}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.redeemButton, !canRedeem && styles.redeemButtonDisabled]}
        onPress={() => setShowRedeemModal(true)}
        disabled={!canRedeem}
      >
        <Text style={[styles.redeemButtonText, !canRedeem && styles.redeemButtonTextDisabled]}>
          {t().points.redeemButton}
        </Text>
      </TouchableOpacity>

      <Modal visible={showRedeemModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{t().points.redeemTitle}</Text>
            <Text style={styles.modalDescription}>{t().points.redeemDescription}</Text>
            <TextInput
              style={styles.modalInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder={t().points.phonePlaceholder}
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
              maxLength={13}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => { setShowRedeemModal(false); setPhoneNumber(''); }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>{t().common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleRedeem}
                disabled={isRedeeming}
              >
                {isRedeeming ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.modalButtonText}>{t().common.confirm}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Toast
        visible={toast.visible}
        message={toast.message}
        onHide={() => setToast({ visible: false, message: '' })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 24,
    color: colors.text,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    minWidth: 40,
    textAlign: 'right',
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  rewardHighlight: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 12,
    textDecorationLine: 'underline' as const,
  },
  redeemButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.xl,
    alignItems: 'center',
    marginTop: 20,
  },
  redeemButtonDisabled: {
    backgroundColor: colors.border,
  },
  redeemButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  redeemButtonTextDisabled: {
    color: colors.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 24,
    width: Math.min(300, screenWidth - 60),
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInput: {
    width: '100%',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: colors.border,
  },
  modalConfirmButton: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
