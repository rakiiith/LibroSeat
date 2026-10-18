import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createSeatReservation, getCurrentUser } from './seatReservationService';

const C = {
  bg: '#F4F8F9', white: '#FFFFFF', teal: '#0F9292', dark: '#0A686B',
  text: '#18323B', muted: '#74868E', border: '#E2EBED', pale: '#E7F7F5',
};

function formatDate(value) {
  if (!value) return 'Date not set';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatTime(value) {
  if (!value) return '—';
  const [hourString, minute = '00'] = value.slice(0, 5).split(':');
  const hour = Number(hourString);
  if (Number.isNaN(hour)) return value;
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function duration(start, end) {
  const toMinutes = value => {
    const [hour, minute] = (value || '').slice(0, 5).split(':').map(Number);
    return (hour || 0) * 60 + (minute || 0);
  };
  const minutes = toMinutes(end) - toMinutes(start);
  if (minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : '', rest ? `${rest} min` : ''].filter(Boolean).join(' ');
}

function StepProgress() {
  return (
    <View style={styles.progress}>
      {[['1', 'Select'], ['2', 'Details'], ['3', 'Confirm']].map(([number, label], index) => (
        <React.Fragment key={number}>
          <View style={styles.step}>
            <View style={[styles.stepCircle, index === 2 && styles.stepCurrent]}>
              <Text style={styles.stepNumber}>{number}</Text>
            </View>
            <Text style={[styles.stepLabel, index === 2 && styles.stepLabelCurrent]}>{label}</Text>
          </View>
          {index < 2 && <View style={[styles.stepLine, index === 1 && styles.stepLineActive]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

function SummaryRow({ icon, label, value, subvalue }) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryIcon}><Ionicons name={icon} size={19} color={C.teal} /></View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <View style={styles.summaryValueWrap}>
        <Text style={styles.summaryValue}>{value}</Text>
        {!!subvalue && <Text style={styles.summarySubvalue}>{subvalue}</Text>}
      </View>
    </View>
  );
}

export default function SeatConfirmationScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const seat = route?.params?.seat;
  const bookingDate = route?.params?.bookingDate;
  const startTime = route?.params?.startTime;
  const endTime = route?.params?.endTime;
  const room = route?.params?.room || seat?.reading_rooms?.name || seat?.zone || 'Main Library';
  const floor = route?.params?.floor ?? seat?.reading_rooms?.floor;
  const studyArea = route?.params?.studyArea;
  const [student, setStudent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const savingRef = useRef(false);
  const successScale = useRef(new Animated.Value(0.75)).current;
  const contentStyle = Platform.OS === 'web' && width > 700 ? styles.wideContent : null;

  useEffect(() => {
    getCurrentUser().then(setStudent).catch(() => setStudent(null));
  }, []);

  useEffect(() => {
    if (!confirmed) return;
    Animated.spring(successScale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 100 }).start();
  }, [confirmed, successScale]);

  const submit = async () => {
    if (savingRef.current) return;
    if (!seat?.id) {
      Alert.alert('Seat missing', 'Return to seat selection and choose a seat.');
      return;
    }
    if (!bookingDate || !startTime || !endTime) {
      Alert.alert('Reservation details missing', 'Go back and choose a date and time.');
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const reservation = await createSeatReservation({
        seatId: seat.id, bookingDate, startTime, endTime,
      });
      setConfirmed(reservation);
    } catch (error) {
      Alert.alert('Booking failed', error.message || 'Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (!seat) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={38} color={C.teal} />
          <Text style={styles.pageTitle}>No seat selected</Text>
          <Pressable style={styles.primaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryButtonText}>Return to seat selection</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (confirmed) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={styles.successScreen}>
          <View style={[styles.successContent, contentStyle]}>
            <View style={styles.confettiArea}>
              <View style={[styles.confetti, styles.confettiOne]} />
              <View style={[styles.confetti, styles.confettiTwo]} />
              <View style={[styles.confetti, styles.confettiThree]} />
              <Animated.View style={[styles.successMark, { transform: [{ scale: successScale }] }]}>
                <Ionicons name="checkmark" size={50} color={C.white} />
              </Animated.View>
            </View>
            <Text style={styles.successTitle}>Reservation Successful!</Text>
            <Text style={styles.successText}>Your seat {seat.seat_number} has been reserved.</Text>
            <Text style={styles.successText}>See you at the library!</Text>
            <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('MyReservations')}>
              <Text style={styles.primaryButtonText}>View My Reservations</Text>
              <Ionicons name="arrow-forward" size={19} color={C.white} />
            </Pressable>
            <Pressable style={styles.outlineButton} onPress={() => navigation.navigate('SeatAvailability')}>
              <Text style={styles.outlineButtonText}>Book Another Seat</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const studentName = student?.user_metadata?.full_name || student?.user_metadata?.name || 'Student';
  const studentId = student?.user_metadata?.student_id || student?.email || 'Signed in student';
  const floorDescription = floor == null
    ? ''
    : (/floor/i.test(String(floor)) ? String(floor) : `Floor ${floor}`);
  const roomDescription = [room, floorDescription, studyArea || ''].filter(Boolean).join(' · ');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Confirm Reservation</Text>
        <View style={styles.headerButton}>
          <Ionicons name="notifications-outline" size={20} color={C.text} />
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, contentStyle]} showsVerticalScrollIndicator={false}>
        <StepProgress />
        <Text style={styles.pageTitle}>Review your reservation</Text>
        <Text style={styles.subtitle}>Make sure the details are correct before confirming.</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Reservation Summary</Text>
          <SummaryRow icon="tablet-portrait-outline" label="Seat Number" value={seat.seat_number || '—'} />
          <SummaryRow icon="book-outline" label="Reading Room" value={roomDescription} />
          <SummaryRow icon="calendar-outline" label="Date" value={formatDate(bookingDate)} />
          <SummaryRow
            icon="time-outline"
            label="Time Slot"
            value={`${formatTime(startTime)} – ${formatTime(endTime)}`}
            subvalue={duration(startTime, endTime)}
          />
          <SummaryRow icon="person-outline" label="Student" value={studentName} subvalue={studentId} />
        </View>

        <View style={styles.notice}>
          <Ionicons name="shield-checkmark-outline" size={21} color={C.dark} />
          <Text style={styles.noticeText}>Please confirm your reservation details before proceeding.</Text>
        </View>

        <Pressable disabled={saving} onPress={submit} style={[styles.primaryButton, saving && styles.buttonDisabled]}>
          {saving ? <ActivityIndicator color={C.white} /> : <>
            <Text style={styles.primaryButtonText}>Confirm Reservation</Text>
            <Ionicons name="arrow-forward" size={19} color={C.white} />
          </>}
        </Pressable>
        <Pressable disabled={saving} onPress={() => navigation.goBack()} style={styles.cancelLink}>
          <Text style={styles.cancelLinkText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { minHeight: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bg },
  headerButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.text, fontSize: 16, fontWeight: '800' },
  scrollContent: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 },
  wideContent: { maxWidth: 720 },
  progress: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 18 },
  step: { alignItems: 'center', minWidth: 58 },
  stepCircle: { width: 31, height: 31, borderRadius: 16, backgroundColor: '#AEBBC1', alignItems: 'center', justifyContent: 'center' },
  stepCurrent: { backgroundColor: C.teal },
  stepNumber: { color: C.white, fontSize: 13, fontWeight: '800' },
  stepLabel: { color: C.muted, fontSize: 10, marginTop: 5 },
  stepLabelCurrent: { color: C.dark, fontWeight: '800' },
  stepLine: { width: 48, height: 2, backgroundColor: '#D9E2E4', marginTop: 15 },
  stepLineActive: { backgroundColor: C.teal },
  pageTitle: { color: C.text, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: C.muted, fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 17 },
  summaryCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 17, paddingVertical: 8, shadowColor: '#1A3F49', shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  cardTitle: { color: C.text, fontSize: 15, fontWeight: '800', paddingVertical: 9 },
  summaryRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F4F5', gap: 10 },
  summaryIcon: { width: 27, alignItems: 'center' },
  summaryLabel: { color: C.muted, fontSize: 12, flex: 1 },
  summaryValueWrap: { alignItems: 'flex-end', maxWidth: '58%' },
  summaryValue: { color: C.text, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  summarySubvalue: { color: C.muted, fontSize: 10, marginTop: 3, textAlign: 'right' },
  notice: { minHeight: 58, marginTop: 15, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 15, backgroundColor: '#DDF5F2', flexDirection: 'row', alignItems: 'center', gap: 10 },
  noticeText: { flex: 1, color: C.dark, fontSize: 12, lineHeight: 18 },
  primaryButton: { minHeight: 53, paddingHorizontal: 17, borderRadius: 15, backgroundColor: C.teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: C.dark, shadowOpacity: 0.16, shadowRadius: 8, elevation: 2 },
  primaryButtonText: { color: C.white, fontSize: 14, fontWeight: '800' },
  buttonDisabled: { opacity: 0.65 },
  cancelLink: { alignItems: 'center', paddingVertical: 14 },
  cancelLinkText: { color: C.dark, fontSize: 13, fontWeight: '600' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  successScreen: { flex: 1, justifyContent: 'center', padding: 20 },
  successContent: { width: '100%', maxWidth: 500, alignSelf: 'center', alignItems: 'center', padding: 24, backgroundColor: C.white, borderRadius: 28, borderWidth: 1, borderColor: C.border, shadowColor: '#1A3F49', shadowOpacity: 0.07, shadowRadius: 16, elevation: 3 },
  confettiArea: { width: 180, height: 125, alignItems: 'center', justifyContent: 'center' },
  successMark: { width: 88, height: 88, borderRadius: 46, backgroundColor: '#18B99F', borderWidth: 8, borderColor: '#D7F5F0', alignItems: 'center', justifyContent: 'center' },
  confetti: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: '#4EC995' },
  confettiOne: { top: 18, left: 15 },
  confettiTwo: { top: 28, right: 14, backgroundColor: '#5598E9' },
  confettiThree: { bottom: 18, left: 31, backgroundColor: '#F47C69' },
  successTitle: { color: C.text, fontSize: 22, fontWeight: '900', textAlign: 'center', marginTop: 5 },
  successText: { color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 5 },
  outlineButton: { width: '100%', minHeight: 49, borderWidth: 1.5, borderColor: C.teal, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  outlineButtonText: { color: C.dark, fontSize: 13, fontWeight: '800' },
});
