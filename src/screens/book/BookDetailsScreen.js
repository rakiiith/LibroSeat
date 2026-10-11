import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, PrimaryButton, StatusBadge } from '../../components/UIKit';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { getBook } from './bookService';

export default function BookDetailsScreen({ route, navigation }) {
  const [book, setBook] = useState(route.params?.book ?? null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const id = route.params?.book?.id ?? route.params?.bookId;
    if (!id) return;
    setLoading(true);
    getBook(id).then((latest) => latest && setBook(latest)).catch((error) => console.warn('getBook failed:', error.message)).finally(() => setLoading(false));
  }, [route.params?.book?.id, route.params?.bookId]);
  const available = book?.status === 'available';

  return <SafeAreaView style={styles.safe} edges={['bottom']}><ScrollView contentContainerStyle={styles.container}>
    {loading && !book ? <ActivityIndicator color={colors.primary} /> : null}
    <View style={styles.hero}><Ionicons name="book" size={68} color={colors.primary} /></View>
    <Text style={styles.title}>{book?.title || 'Book details'}</Text>
    <Text style={styles.author}>by {book?.author || 'Unknown author'}</Text>
    {book ? <StatusBadge label={available ? 'Available to reserve' : (book.status || 'Unavailable')} tone={available ? 'success' : 'warning'} /> : null}
    <Card style={styles.details}><Text style={typography.subtitle}>About this book</Text><Text style={typography.muted}>Check availability before reserving. Library staff can help with questions about this title.</Text>{book?.created_at ? <Text style={typography.muted}>Added {new Date(book.created_at).toLocaleDateString()}</Text> : null}</Card>
    <PrimaryButton title="Reserve this book" disabled={!available || !book} onPress={() => navigation.navigate('ReserveBook', { book })} />
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  hero: { height: 180, borderRadius: radius.lg, backgroundColor: colors.primary + '14', alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, fontSize: 26 },
  author: { ...typography.muted, fontSize: 16 },
  details: { gap: spacing.sm, marginTop: spacing.sm },
});
