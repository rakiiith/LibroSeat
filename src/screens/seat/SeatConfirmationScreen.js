
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../../supabase/supabaseClient';

const C = {
  bg: '#F4F7F8', white: '#FFFFFF', teal: '#0F8B8D',
  dark: '#08696C', text: '#18323B', muted: '#71838A',
  border: '#DFE8EA',
};

function dateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function SeatConfirmationScreen({ route, navigation }) {
  const seat = route?.params?.seat;
  const [date, setDate] = useState(dateString(new Date()));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  const submit = async () => {
    if (!seat?.id) {
      Alert.alert('Seat missing', 'Return to seat selection and choose a seat.');
      return;
    }

    const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date);
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

    if (!dateValid || !timePattern.test(startTime) || !timePattern.test(endTime)) {
      Alert.alert('Invalid details', 'Use date YYYY-MM-DD and times HH:MM.');
      return;
    }

    const chosenDate = new Date(`${date}T00:00:00`);
    if (
      Number.isNaN(chosenDate.getTime()) ||
      dateString(chosenDate) !== date ||
      date < dateString(new Date())
    ) {
      Alert.alert('Invalid date', 'Choose today or a future date.');
      return;
    }

    if (startTime >= endTime) {
      Alert.alert('Invalid time', 'End time must be later than start time.');
      return;
    }

    setSaving(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      const user = authData?.user;

      if (!user) {
        Alert.alert('Login required', 'Please sign in before booking a seat.');
        return;
      }

      const { data: reservation, error } = await supabase
        .from('seat_reservations')
        .insert({
          seat_id: seat.id,
          user_id: user.id,
          booking_date: date,
          start_time: startTime,
          end_time: endTime,
          status: 'confirmed',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505' || error.code === '23P01') {
          Alert.alert(
            'Seat unavailable',
            'This seat may already be booked for that time. Please choose another seat or time.'
          );
        } else {
          throw error;
        }
        return;
      }

      setConfirmed(reservation);
    } catch (e) {
      console.error('Reservation failed:', e.message);
      Alert.alert('Booking failed', e.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!seat) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>No seat selected</Text>
        <Pressable style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Return to seat selection</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (confirmed) {
    return <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={styles.successPage}>
        <View style={styles.successMark}><Text style={styles.check}>✓</Text></View>
        <Text style={styles.title}>Reservation confirmed</Text>
        <Text style={styles.subtitle}>Your seat has been reserved successfully.</Text>
        <View style={styles.successCard}>
          <Text style={styles.eyebrow}>CONFIRMED SEAT</Text>
          <Text style={styles.successSeat}>Seat {seat.seat_number}</Text>
          <Text style={styles.successRoom}>{seat.reading_rooms?.name ?? 'Reading room'}</Text>
          <View style={styles.divider}/>
          <Text style={styles.successMeta}>DATE   {date}</Text>
          <Text style={styles.successMeta}>TIME   {startTime} – {endTime}</Text>
          <Text style={styles.code}>Confirmation · {String(confirmed.id).slice(0, 8).toUpperCase()}</Text>
        </View>
        <Pressable style={styles.button} onPress={() => navigation.navigate('MyReservations')}><Text style={styles.buttonText}>View my reservations</Text></Pressable>
        <Pressable style={styles.doneButton} onPress={() => navigation.popToTop()}><Text style={styles.doneText}>Done</Text></Pressable>
      </View>
    </SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>LIBROSEAT / RESERVATION</Text>
        <Text style={styles.title}>Confirm your seat</Text>
        <Text style={styles.subtitle}>
          Review your study session before reserving.
        </Text>

        <View style={styles.seatCard}>
          <Text style={styles.eyebrow}>YOUR SELECTED SEAT</Text>
          <Text style={styles.seatNumber}>{seat.seat_number}</Text>
          <Text style={styles.room}>
            {seat.reading_rooms?.name ?? 'Reading room'}
          </Text>
          <Text style={styles.floor}>
            Floor {seat.reading_rooms?.floor ?? '—'} · {seat.seat_type || 'Standard'}
          </Text>
        </View>

        <Text style={styles.label}>Booking date</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          style={styles.input}
          autoCapitalize="none"
        />
        <Text style={styles.help}>Format: YYYY-MM-DD</Text>

        <View style={styles.timeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Start time</Text>
            <TextInput
              value={startTime}
              onChangeText={setStartTime}
              placeholder="09:00"
              style={styles.input}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>End time</Text>
            <TextInput
              value={endTime}
              onChangeText={setEndTime}
              placeholder="10:00"
              style={styles.input}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>
        <Text style={styles.help}>Use 24-hour time, for example 14:30.</Text>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Before you confirm</Text>
          <Text style={styles.noticeText}>
            Your reservation must satisfy the library's booking rules.
            The database must also prevent overlapping reservations.
          </Text>
        </View>

        <Pressable
          disabled={saving}
          onPress={submit}
          style={[styles.button, saving && { opacity: 0.65 }]}
        >
          {saving ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={styles.buttonText}>Confirm reservation →</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  successPage: { flex: 1, padding: 22, justifyContent: 'center' },
  successMark: { width: 86, height: 86, borderRadius: 43, backgroundColor: '#E3F8F4', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  check: { color: C.teal, fontSize: 48, fontWeight: '800' },
  successCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, marginVertical: 22 },
  successSeat: { color: C.text, fontSize: 28, fontWeight: '900', marginTop: 12 },
  successRoom: { color: C.muted, fontSize: 14, marginTop: 6 },
  successMeta: { color: C.text, fontSize: 13, fontWeight: '700', marginVertical: 4 },
  eyebrow: { color: C.teal, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },
  code: { color: C.muted, fontSize: 11, marginTop: 18 },
  doneButton: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 15, padding: 16, alignItems: 'center', marginTop: 10 },
  doneText: { color: C.dark, fontWeight: '800' },
  content: { padding: 22, paddingBottom: 36 },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 24, backgroundColor: C.bg,
  },
  brand: { color: C.teal, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 10 },
  title: { color: C.text, fontSize: 28, fontWeight: '900', marginTop: 13 },
  subtitle: { color: C.muted, fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 22 },
  seatCard: {
    backgroundColor: C.dark, borderRadius: 22, padding: 22, marginBottom: 25,
  },
  eyebrow: { color: '#BCE4E1', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  seatNumber: { color: C.white, fontSize: 36, fontWeight: '900', marginTop: 13 },
  room: { color: C.white, fontSize: 16, fontWeight: '700', marginTop: 6 },
  floor: { color: '#C6E7E5', fontSize: 12, marginTop: 7 },
  label: { color: C.text, fontSize: 13, fontWeight: '800', marginBottom: 9 },
  input: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 13, paddingHorizontal: 14, paddingVertical: 14,
    color: C.text, fontSize: 15,
  },
  help: { color: C.muted, fontSize: 11, marginTop: 7, marginBottom: 19 },
  timeRow: { flexDirection: 'row', gap: 12 },
  notice: { backgroundColor: '#E4F4F1', borderRadius: 15, padding: 15, marginTop: 6, marginBottom: 23 },
  noticeTitle: { color: C.dark, fontWeight: '800', fontSize: 13 },
  noticeText: { color: C.dark, fontSize: 12, lineHeight: 19, marginTop: 6 },
  button: {
    backgroundColor: C.teal, borderRadius: 15, padding: 17,
    alignItems: 'center', justifyContent: 'center', minHeight: 54,
  },
  buttonText: { color: C.white, fontSize: 14, fontWeight: '800' },
});
