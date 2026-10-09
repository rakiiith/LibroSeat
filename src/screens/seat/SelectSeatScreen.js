import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '../../theme/theme';
import { PrimaryButton, OutlineButton } from '../../components/UIKit';
import { createReservation } from '../../services/reservationService';
import { supabase } from '../../supabase/supabaseClient';

export default function SelectSeatScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  
  // Passed from SeatAvailabilityScreen
  const seat = route?.params?.seat || { id: 'test-seat-id', seat_number: 'A-01', room: 'General' };

  async function handleConfirm() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to book a seat.");

      await createReservation('seat', seat.id, user.id);
      
      Alert.alert("Success", "Your seat has been booked!", [
        { text: "OK", onPress: () => navigation.navigate('SeatConfirmation') }
      ]);
    } catch (e) {
      console.warn(e);
      Alert.alert("Booking Failed", e.message || "Could not complete seat booking.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>Confirm Seat Booking</Text>
        <Text style={styles.subtitle}>You are about to book:</Text>
        
        <View style={styles.card}>
          <Text style={styles.seatNum}>Carrel {seat.seat_number}</Text>
          <Text style={styles.roomName}>{seat.room}</Text>
        </View>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            You must check in within 15 minutes of your session start time, otherwise this seat will be automatically released.
          </Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <OutlineButton title="Cancel" onPress={() => navigation.goBack()} style={{marginBottom: spacing.sm}} />
        <PrimaryButton 
          title={loading ? "Processing..." : "Confirm Booking"} 
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
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl,
    alignItems: 'center'
  },
  seatNum: { ...typography.h1, color: colors.primary, marginBottom: 4 },
  roomName: { ...typography.body, color: colors.textMuted },
  infoBox: { backgroundColor: '#FFFBEB', padding: spacing.md, borderRadius: radius.sm },
  infoText: { fontSize: 13, color: '#92400E', lineHeight: 20 },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white }
});
