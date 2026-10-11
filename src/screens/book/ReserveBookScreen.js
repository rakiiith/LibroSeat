import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, PrimaryButton } from '../../components/UIKit';
import { colors, spacing, typography } from '../../theme/theme';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { reserveBook } from './bookService';

export default function ReserveBookScreen({ route, navigation }) {
  const userId = useCurrentUserId();
  const book = route.params?.book;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const confirm = async () => {
    if (!book?.id) { setError('Book information is missing. Go back and select a book again.'); return; }
    setSaving(true); setError('');
    try {
      const reservationId = await reserveBook(userId, book);
      navigation.replace('BookConfirmation', { book, reservationId });
    } catch (e) { setError(e.message || 'Could not reserve this book.'); }
    finally { setSaving(false); }
  };
  return <SafeAreaView style={styles.safe} edges={['bottom']}><View style={styles.container}>
    <Text style={typography.title}>Review your reservation</Text>
    <Text style={typography.muted}>Confirm the title below to place a hold with the library.</Text>
    <Card style={styles.card}><Ionicons name="book-outline" size={34} color={colors.primary} /><Text style={typography.subtitle}>{book?.title || 'Book unavailable'}</Text><Text style={typography.muted}>by {book?.author || 'Unknown author'}</Text><View style={styles.divider} /><Text style={typography.body}>Reservation type</Text><Text style={typography.muted}>Library book hold</Text></Card>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <PrimaryButton title="Confirm reservation" onPress={confirm} loading={saving} disabled={!userId || !book || saving} />
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, container: { padding: spacing.lg, gap: spacing.md }, card: { gap: spacing.sm }, divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }, error: { color: colors.danger } });
