import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/theme';
import BookCover from '../../components/BookCover';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BookConfirmationScreen({ route, navigation }) {
  const { book, reservation } = route?.params || {};
  const reservationCode =
    reservation?.reservation_code || reservation?.reservationCode || reservation?.id || '—';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.successIcon}>
          <Text style={styles.tick}>✓</Text>
        </View>
        <Text style={styles.heading}>Reservation Confirmed!</Text>
        <Text style={styles.subtitle}>Your book has been successfully reserved.</Text>

        <View style={styles.card}>
          <View style={styles.bookOverview}>
            <BookCover book={book} style={styles.bookCover} />
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle}>{reservation?.book_title || book?.title || 'Book'}</Text>
              <Text style={styles.author}>{reservation?.book_author || book?.author || 'Unknown author'}</Text>
            </View>
          </View>
          <Detail label="Reservation code" value={reservationCode} />
          <Detail label="Reservation date" value={formatDate(reservation?.reservation_date)} />
          <Detail label="Pickup before" value={formatDate(reservation?.pickup_before)} />
          {book?.shelf ? <Detail label="Shelf" value={book.shelf} /> : null}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          style={styles.primary}
          onPress={() => navigation.navigate('MyReservations')}
        >
          <Text style={styles.primaryText}>View My Reservations</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.secondary}
          onPress={() => navigation.popToTop()}
        >
          <Text style={styles.secondaryText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Detail({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  successIcon: {
    width: 88,
    height: 88,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 44,
    backgroundColor: colors.success + '18',
  },
  tick: { color: colors.success, fontSize: 42, fontWeight: '700' },
  heading: { ...typography.title, textAlign: 'center', marginTop: spacing.md },
  subtitle: { ...typography.muted, textAlign: 'center', marginTop: spacing.xs },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  bookTitle: { ...typography.subtitle, fontSize: 19 },
  bookOverview: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  bookCover: { width: 64, height: 86, marginRight: spacing.md },
  bookInfo: { flex: 1 },
  author: { ...typography.muted, marginTop: spacing.xs },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  label: { ...typography.muted },
  value: { ...typography.body, textAlign: 'right', flexShrink: 1, marginLeft: spacing.md },
  primary: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    marginTop: spacing.xl,
  },
  primaryText: { color: colors.white, fontWeight: '600', fontSize: 15 },
  secondary: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    marginTop: spacing.sm,
  },
  secondaryText: { ...typography.body, fontWeight: '600' },
});
