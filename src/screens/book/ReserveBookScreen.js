import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '../../theme/theme';
import { PrimaryButton, OutlineButton } from '../../components/UIKit';
import { createReservation } from '../../services/reservationService';
import { supabase } from '../../supabase/supabaseClient';

export default function ReserveBookScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  
  // Example of how we might receive the book from the previous screen
  // If not passed, we fallback to a safe empty object or ID to prevent crashes
  const book = route?.params?.book || { id: 'test-book-id', title: 'Example Book' };

  async function handleConfirm() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to reserve a book.");

      // Set due date to 14 days from now
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      await createReservation('book', book.id, user.id, dueDate.toISOString());
      
      Alert.alert("Success", "Your book has been reserved!", [
        { text: "OK", onPress: () => navigation.navigate('BookConfirmation') }
      ]);
    } catch (e) {
      console.warn(e);
      Alert.alert("Reservation Failed", e.message || "Could not complete reservation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>Confirm Reservation</Text>
        <Text style={styles.subtitle}>You are about to place a hold on:</Text>
        
        <View style={styles.card}>
          <Text style={styles.bookTitle}>{book.title}</Text>
          <Text style={styles.bookAuthor}>{book.author || 'Author info unavailable'}</Text>
        </View>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            You will have 48 hours to collect this book from the circulation desk before the hold expires.
          </Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <OutlineButton title="Cancel" onPress={() => navigation.goBack()} style={{marginBottom: spacing.sm}} />
        <PrimaryButton 
          title={loading ? "Processing..." : "Confirm Reservation"} 
          onPress={handleConfirm} 
          disabled={loading} 
        />
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
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl
  },
  bookTitle: { ...typography.h2, color: colors.text, marginBottom: 4 },
  bookAuthor: { ...typography.body, color: colors.textMuted },
  infoBox: { backgroundColor: '#F3F4F6', padding: spacing.md, borderRadius: radius.sm },
  infoText: { fontSize: 13, color: '#4B5563', lineHeight: 20 },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white }
});
