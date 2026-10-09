import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '../../theme/theme';
import { createSeatReservation } from '../../services/seatReservationService';
import { supabase } from '../../supabase/supabaseClient';

function showAlert(title, message) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
}

export default function SelectSeatScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { seat, date, slot } = route.params || {};

  async function handleConfirm() {
    if (!seat || !date || !slot) {
      setError('Missing booking details. Please go back and try again.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error('You must be logged in to book a seat.');

      await createSeatReservation(seat.id, user.id, date, slot);
      setSuccess(true);
    } catch (e) {
      console.warn('Booking error:', e);
      setError(e.message || 'Could not complete seat booking. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successSub}>
            Your seat has been reserved. Remember to check in within 15 minutes of your session start time.
          </Text>
          <View style={styles.successDetail}>
            <Text style={styles.successDetailLabel}>Seat</Text>
            <Text style={styles.successDetailValue}>Carrel {seat?.seat_number}</Text>
          </View>
          <View style={styles.successDetail}>
            <Text style={styles.successDetailLabel}>Date</Text>
            <Text style={styles.successDetailValue}>{date}</Text>
          </View>
          <View style={styles.successDetail}>
            <Text style={styles.successDetailLabel}>Time</Text>
            <Text style={styles.successDetailValue}>{slot?.label}</Text>
          </View>
          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.popToTop()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>Confirm Seat Booking</Text>
        <Text style={styles.subtitle}>Please review your reservation details:</Text>

        <View style={styles.card}>
          <Text style={styles.seatNum}>Carrel {seat?.seat_number}</Text>
          <Text style={styles.roomName}>{seat?.zone || 'General'}</Text>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>{slot?.label}</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ⏱ You must check in within 15 minutes of your session start time, otherwise this seat will be automatically released and marked as a No-Show.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={loading}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, loading && styles.btnDisabled]}
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.confirmBtnText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.lg },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.white, padding: spacing.lg, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, alignItems: 'center'
  },
  seatNum: { fontSize: 22, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  roomName: { ...typography.body, color: colors.textMuted, marginBottom: spacing.md },
  divider: { height: 1, backgroundColor: colors.border, width: '100%', marginBottom: spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 8 },
  detailLabel: { color: colors.textMuted, fontWeight: '600' },
  detailValue: { color: colors.text, fontWeight: '700' },
  infoBox: { backgroundColor: '#FFFBEB', padding: spacing.md, borderRadius: radius.sm, marginBottom: spacing.md },
  infoText: { fontSize: 13, color: '#92400E', lineHeight: 20 },
  errorBox: { backgroundColor: '#FEE2E2', padding: spacing.md, borderRadius: radius.sm },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white, gap: spacing.sm },
  cancelBtn: {
    paddingVertical: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center'
  },
  cancelBtnText: { color: colors.textMuted, fontWeight: '600', fontSize: 15 },
  confirmBtn: {
    paddingVertical: 14, borderRadius: radius.md, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center'
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.6 },

  // Success state
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  successIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#D1FAE5',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg
  },
  successIconText: { fontSize: 36, color: '#059669' },
  successTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  successSub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  successDetail: {
    flexDirection: 'row', justifyContent: 'space-between', width: '100%',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border
  },
  successDetailLabel: { color: colors.textMuted, fontSize: 14 },
  successDetailValue: { color: colors.text, fontWeight: '700', fontSize: 14 },
  doneBtn: {
    marginTop: spacing.xl, backgroundColor: colors.primary, paddingVertical: 14,
    paddingHorizontal: spacing.xl * 2, borderRadius: radius.md
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});
