import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState, StatusBadge } from '../../components/UIKit';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { searchBooks } from './bookService';

export default function SearchBooksScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setBooks(await searchBooks(query)); }
    catch (e) { setError(e.message || 'Unable to load books.'); }
    finally { setLoading(false); }
  }, [query]);
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.searchBox}><Ionicons name="search-outline" size={20} color={colors.textMuted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search title or author" placeholderTextColor={colors.textMuted} style={styles.searchInput} returnKeyType="search" /></View>
      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListHeaderComponent={<View style={styles.heading}><Text style={typography.title}>Find your next read</Text><Text style={typography.muted}>{books.length} {books.length === 1 ? 'book' : 'books'} in the library</Text></View>}
        ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /> : <EmptyState message={error || 'No books match your search.'} />}
        renderItem={({ item }) => {
          const available = item.status === 'available';
          return <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('BookDetails', { book: item })}>
            <Card style={styles.bookCard}>
              <View style={styles.bookIcon}><Ionicons name="book-outline" size={24} color={colors.primary} /></View>
              <View style={styles.bookInfo}><Text style={styles.bookTitle}>{item.title}</Text><Text style={typography.muted}>{item.author || 'Unknown author'}</Text><StatusBadge label={available ? 'Available' : (item.status || 'Unavailable')} tone={available ? 'success' : 'warning'} /></View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Card>
          </TouchableOpacity>;
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, margin: spacing.lg, marginBottom: 0, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, backgroundColor: colors.card },
  searchInput: { flex: 1, paddingVertical: 13, color: colors.text },
  list: { padding: spacing.lg, flexGrow: 1 },
  heading: { gap: spacing.xs, marginBottom: spacing.sm },
  bookCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bookIcon: { width: 48, height: 56, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '14' },
  bookInfo: { flex: 1, gap: spacing.xs },
  bookTitle: { ...typography.subtitle },
});
