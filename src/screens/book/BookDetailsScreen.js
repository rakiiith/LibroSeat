import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { PrimaryButton, StatusBadge } from '../../components/UIKit';

export default function BookDetailsScreen({ route, navigation }) {
  const book = route?.params?.book;

  if (!book) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.empty}>
          <Ionicons name="book-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Book details unavailable</Text>
          <Text style={styles.emptyMessage}>Go back and select a book to see its details.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const availableCopies = Number(book.availableCopies);
  const hasCopyCount = Number.isFinite(availableCopies);
  const isAvailable = hasCopyCount ? availableCopies > 0 : Boolean(book.isAvailable);
  const availabilityLabel = hasCopyCount
    ? `${availableCopies} ${availableCopies === 1 ? 'copy' : 'copies'} available`
    : isAvailable
      ? 'Available'
      : 'Unavailable';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back to book search"
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
          <Text style={styles.backButtonText}>Book Details</Text>
        </TouchableOpacity>

        <View style={styles.cover}>
          {book.coverUrl ? (
            <Image source={{ uri: book.coverUrl }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <Ionicons name="book-outline" size={52} color={colors.primary} />
          )}
        </View>

        <Text style={styles.title}>{book.title || 'Untitled book'}</Text>
        <Text style={styles.author}>{book.author || 'Unknown author'}</Text>

        <View style={styles.status}>
          <StatusBadge
            label={availabilityLabel}
            tone={isAvailable ? 'success' : 'danger'}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Book information</Text>
          <DetailRow label="Category" value={book.category} />
          <DetailRow label="ISBN" value={book.isbn} />
          <DetailRow label="Shelf" value={book.shelf} />
          {book.totalCopies != null ? (
            <DetailRow label="Total copies" value={String(book.totalCopies)} last />
          ) : null}
        </View>

        {book.description ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>About this book</Text>
            <Text style={styles.description}>{book.description}</Text>
          </View>
        ) : null}

        <PrimaryButton
          title={isAvailable ? 'Reserve Book' : 'Book Unavailable'}
          disabled={!isAvailable}
          onPress={() => navigation.navigate('ReserveBook', { book })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, last = false }) {
  return (
    <View style={[styles.detailRow, last && styles.lastDetailRow]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'Not provided'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  backButtonText: { ...typography.subtitle, fontSize: 18 },
  cover: {
    width: 176,
    height: 220,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.primary + '18',
    marginBottom: spacing.lg,
  },
  coverImage: { width: '100%', height: '100%' },
  title: { ...typography.title, fontSize: 25, textAlign: 'center' },
  author: { ...typography.muted, fontSize: 15, textAlign: 'center', marginTop: spacing.xs },
  status: { alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  sectionTitle: { ...typography.subtitle, marginBottom: spacing.sm },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastDetailRow: { borderBottomWidth: 0 },
  detailLabel: { ...typography.muted, flex: 1 },
  detailValue: { ...typography.body, flex: 1, textAlign: 'right' },
  description: { ...typography.body, lineHeight: 21 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyTitle: { ...typography.subtitle, marginTop: spacing.md },
  emptyMessage: { ...typography.muted, textAlign: 'center', marginTop: spacing.sm },
});
