import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '../../theme/theme';
import { supabase } from '../../supabase/supabaseClient';

export default function BookDetailsScreen({ navigation, route }) {
  const passedBook = route?.params?.book;
  const [book, setBook] = useState(passedBook || null);
  const [loading, setLoading] = useState(!passedBook);

  // Always re-fetch fresh data from Supabase to avoid stale navigation params
  useEffect(() => {
    if (!passedBook?.id) return;
    async function fetchFresh() {
      setLoading(true);
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', passedBook.id)
        .single();
      if (!error && data) setBook(data);
      setLoading(false);
    }
    fetchFresh();
  }, [passedBook?.id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!book) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={[styles.title, { padding: spacing.lg }]}>Book Not Found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isAvailable = book.is_available === true;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.author}>{book.author || 'Unknown Author'}</Text>

        <View style={styles.detailBox}>
          <Text style={styles.label}>Category</Text>
          <Text style={styles.value}>{book.category || 'General'}</Text>
        </View>

        <View style={styles.detailBox}>
          <Text style={styles.label}>ISBN</Text>
          <Text style={styles.value}>{book.isbn || 'N/A'}</Text>
        </View>

        <View style={styles.detailBox}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>{book.location || 'N/A'}</Text>
        </View>

        <View style={styles.detailBox}>
          <Text style={styles.label}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: isAvailable ? '#D1FAE5' : '#FEE2E2' }]}>
            <View style={[styles.statusDot, { backgroundColor: isAvailable ? '#059669' : '#DC2626' }]} />
            <Text style={[styles.statusText, { color: isAvailable ? '#059669' : '#DC2626' }]}>
              {isAvailable ? 'Available' : 'Checked Out / Reserved'}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {isAvailable ? (
          <TouchableOpacity
            style={styles.reserveBtn}
            onPress={() => navigation.navigate('ReserveBook', { book })}
          >
            <Text style={styles.reserveBtnText}>Reserve Book</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.unavailableBtn}>
            <Text style={styles.unavailableBtnText}>Not Available for Reservation</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.xs },
  author: { ...typography.body, color: colors.textMuted, marginBottom: spacing.xl },
  detailBox: {
    backgroundColor: colors.white, padding: spacing.md,
    borderRadius: radius.sm, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border
  },
  label: { fontSize: 12, color: colors.textMuted, marginBottom: 4, fontWeight: '600' },
  value: { fontSize: 14, color: colors.text, fontWeight: '500' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 13, fontWeight: '700' },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white },
  reserveBtn: {
    backgroundColor: colors.primary, paddingVertical: 16,
    borderRadius: radius.md, alignItems: 'center'
  },
  reserveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  unavailableBtn: {
    backgroundColor: '#F3F4F6', paddingVertical: 16,
    borderRadius: radius.md, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border
  },
  unavailableBtnText: { color: colors.textMuted, fontWeight: '600', fontSize: 15 },
  backBtn: { margin: spacing.lg, padding: spacing.md, alignItems: 'center' },
  backBtnText: { color: colors.primary, fontWeight: '600' }
});
