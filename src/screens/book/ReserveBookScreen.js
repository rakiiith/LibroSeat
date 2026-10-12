import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '../../theme/theme';
import { createReservation } from '../../services/reservationService';
import { supabase } from '../../supabase/supabaseClient';

export default function ReserveBookScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const book = route?.params?.book;

  async function handleConfirm() {
    if (!book) {
      setError('Book details missing. Please go back and try again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error('You must be logged in to reserve a book.');

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      await createReservation('book', book.id, user.id, dueDate.toISOString());
      setSuccess(true);
    } catch (e) {
      console.warn('Reserve book error:', e);
      setError(e.message || 'Could not complete reservation. Please try again.');
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
          <Text style={styles.successTitle}>Book Reserved!</Text>
          <Text style={styles.successSub}>
            Your hold has been placed successfully. You have 48 hours to collect this book from the circulation desk.
          </Text>
          <View style={styles.bookCard}>
            <Text style={styles.bookCardTitle}>{book?.title}</Text>
            <Text style={styles.bookCardAuthor}>{book?.author || 'Unknown Author'}</Text>
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
        <Text style={styles.title}>Confirm Reservation</Text>
        <Text style={styles.subtitle}>You are about to place a hold on:</Text>

        <View style={styles.card}>
          <Text style={styles.bookTitle}>{book?.title}</Text>
          <Text style={styles.bookAuthor}>{book?.author || 'Author info unavailable'}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            📚 You will have 48 hours to collect this book from the circulation desk before the hold expires.
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
            <Text style={styles.confirmBtnText}>Confirm Reservation</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.white, padding: spacing.lg, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg
  },
  bookTitle: { ...typography.h2, color: colors.text, marginBottom: 4 },
  bookAuthor: { ...typography.body, color: colors.textMuted },
  infoBox: { backgroundColor: '#F3F4F6', padding: spacing.md, borderRadius: radius.sm, marginBottom: spacing.md },
  infoText: { fontSize: 13, color: '#4B5563', lineHeight: 20 },
  errorBox: { backgroundColor: '#FEE2E2', padding: spacing.md, borderRadius: radius.sm },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  footer: {
    padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.white, gap: spacing.sm
  },
  cancelBtn: {
    paddingVertical: 14, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, alignItems: 'center'
  },
  cancelBtnText: { color: colors.textMuted, fontWeight: '600', fontSize: 15 },
  confirmBtn: {
    paddingVertical: 14, borderRadius: radius.md,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center'
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
  bookCard: {
    backgroundColor: colors.white, padding: spacing.lg, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, width: '100%', marginBottom: spacing.xl
  },
  bookCardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  bookCardAuthor: { fontSize: 14, color: colors.textMuted },
  doneBtn: {
    backgroundColor: colors.primary, paddingVertical: 14,
    paddingHorizontal: spacing.xl * 2, borderRadius: radius.md
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});
