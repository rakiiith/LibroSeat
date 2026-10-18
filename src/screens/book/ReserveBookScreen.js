import React, { useMemo, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { PrimaryButton } from '../../components/UIKit';
import { reserveBook } from './bookService';

function formatIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, count) {
  const result = new Date(date);
  result.setDate(result.getDate() + count);
  return result;
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && formatIso(date) === value;
}

export default function ReserveBookScreen({ route, navigation }) {
  const book = route?.params?.book;
  const dates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return { today: formatIso(today), pickup: formatIso(addDays(today, 2)) };
  }, []);
  const [reservationDate, setReservationDate] = useState(dates.today);
  const [pickupBefore, setPickupBefore] = useState(dates.pickup);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!book) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.title}>Book information is missing.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const datesValid =
    isValidIsoDate(reservationDate) &&
    isValidIsoDate(pickupBefore) &&
    reservationDate >= dates.today &&
    pickupBefore >= reservationDate;

  const handleConfirm = async () => {
    if (!confirmed || !datesValid || busy) return;

    setBusy(true);
    setErrorMessage('');
    try {
      const reservation = await reserveBook({
        bookId: book.id,
        reservationDate,
        pickupBefore,
      });
      if (!reservation) {
        throw new Error('Supabase did not return the saved reservation. Please try again.');
      }
      navigation.navigate('BookConfirmation', { book, reservation });
    } catch (error) {
      setErrorMessage(error?.message || 'Could not save the reservation. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>‹  Reserve Book</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.title}>{book.title || 'Untitled book'}</Text>
          <Text style={styles.author}>{book.author || 'Unknown author'}</Text>
          <Text style={styles.category}>{book.category || 'Book reservation'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Reservation dates</Text>
        <DateField
          label="Reservation date (YYYY-MM-DD)"
          value={reservationDate}
          minimum={dates.today}
          onChangeText={setReservationDate}
        />
        <DateField
          label="Pickup before (YYYY-MM-DD)"
          value={pickupBefore}
          minimum={reservationDate || dates.today}
          onChangeText={setPickupBefore}
        />
        {!datesValid ? (
          <Text style={styles.validation}>
            Enter valid dates. Reservation must be today or later, and pickup must be on or after it.
          </Text>
        ) : null}

        <TouchableOpacity
          accessibilityRole="checkbox"
          accessibilityState={{ checked: confirmed }}
          style={styles.checkRow}
          onPress={() => {
            setConfirmed((value) => !value);
            setErrorMessage('');
          }}
        >
          <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
            {confirmed ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.confirmText}>I confirm that I want to reserve this book.</Text>
        </TouchableOpacity>

        {errorMessage ? (
          <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>
        ) : null}

        <PrimaryButton
          title={busy ? 'Saving reservation…' : 'Confirm Reservation'}
          onPress={handleConfirm}
          disabled={!confirmed || !datesValid || busy}
          loading={busy}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function DateField({ label, value, minimum, onChangeText }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === 'web' ? (
        React.createElement('input', {
          type: 'date',
          'aria-label': label,
          value,
          min: minimum,
          onChange: (event) => onChangeText(event.target.value),
          style: {
            width: '100%',
            height: 48,
            boxSizing: 'border-box',
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            padding: '0 12px',
            color: colors.text,
            fontSize: 14,
          },
        })
      ) : (
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          style={styles.input}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  backButton: { alignSelf: 'flex-start', marginBottom: spacing.lg },
  backText: { ...typography.subtitle, fontSize: 18 },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { ...typography.title, fontSize: 21 },
  author: { ...typography.muted, marginTop: spacing.xs },
  category: { ...typography.muted, marginTop: spacing.sm },
  sectionTitle: { ...typography.subtitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  field: { marginBottom: spacing.md },
  label: { ...typography.muted, marginBottom: spacing.xs },
  input: {
    height: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    color: colors.text,
  },
  validation: { ...typography.muted, color: colors.danger, marginBottom: spacing.md },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: colors.white, fontWeight: '700' },
  confirmText: { ...typography.body, flex: 1 },
  error: { ...typography.body, color: colors.danger, marginBottom: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
});
