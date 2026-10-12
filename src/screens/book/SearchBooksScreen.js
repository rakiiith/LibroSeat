import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { StatusBadge, EmptyState } from '../../components/UIKit';
import { searchBooks, fetchCategories } from './bookService';

const COVER_TINTS = ['#4F7CFF', '#E0457B', '#F0A92B', '#14919B', '#8E5BE8'];

export default function SearchBooksScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories().then((c) => setCategories(['All', ...c]));
  }, []);

  // Debounced search: waits 250ms after typing stops.
  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      const results = await searchBooks({ query, category });
      if (active) {
        setBooks(results);
        setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, category]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={typography.title}>Search Books</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={colors.primary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by title, author or ISBN"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.sectionLabel}>Browse Categories</Text>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {categories.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, category === c && styles.chipActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.sectionLabel}>{query || category !== 'All' ? 'Results' : 'Recommended Books'}</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={books}
          keyExtractor={(b) => b.id}
          ListEmptyComponent={<EmptyState message="No books match your search." />}
          renderItem={({ item, index }) => {
            const tint = COVER_TINTS[index % COVER_TINTS.length];
            return (
              <TouchableOpacity
                style={styles.bookCard}
                onPress={() => navigation.navigate('BookDetails', { book: item })}
              >
                <View style={[styles.cover, { backgroundColor: tint + '22' }]}>
                  <Ionicons name="book-outline" size={22} color={tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookTitle}>{item.title}</Text>
                  <Text style={typography.muted}>{item.author}</Text>
                  <View style={{ marginTop: 4 }}>
                    <StatusBadge
                      label={item.isAvailable ? 'Available' : 'Unavailable'}
                      tone={item.isAvailable ? 'success' : 'danger'}
                    />
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.card,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  sectionLabel: {
    ...typography.subtitle,
    fontSize: 13,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chipRow: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  cover: {
    width: 52,
    height: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
});