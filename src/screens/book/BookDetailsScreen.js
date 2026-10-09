import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '../../theme/theme';
import { PrimaryButton, OutlineButton } from '../../components/UIKit';

export default function BookDetailsScreen({ navigation, route }) {
  const book = route?.params?.book;

  if (!book) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Book Not Found</Text>
        <OutlineButton title="Go Back" onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

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
          <Text style={styles.label}>Status</Text>
          <Text style={[styles.value, { color: book.is_available ? colors.primary : colors.error }]}>
            {book.is_available ? 'Available' : 'Checked Out / Reserved'}
          </Text>
        </View>
        
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton 
          title="Reserve Book" 
          disabled={!book.is_available}
          onPress={() => navigation.navigate('ReserveBook', { book })}
        />
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
  label: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  value: { fontSize: 14, color: colors.text, fontWeight: '500' },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white }
});
