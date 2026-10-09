import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { Card, EmptyState, PrimaryButton, OutlineButton } from '../../components/UIKit';
import { supabase } from '../../supabase/supabaseClient';
import { getStudentSeatReservations, updateSeatReservationStatus } from '../../services/seatReservationService';

export default function MyReservationsScreen({ navigation }) {
  const [userId, setUserId] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        fetchRes(user.id);
      }
    });

    // Update 'now' every minute to evaluate check-in buttons
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchRes(uid) {
    try {
      setLoading(true);
      const data = await getStudentSeatReservations(uid);
      setReservations(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(resId, newStatus) {
    try {
      await updateSeatReservationStatus(resId, newStatus);
      if (userId) fetchRes(userId);
    } catch (e) {
      Alert.alert("Error", "Could not update reservation.");
    }
  }

  const renderItem = ({ item }) => {
    const resDate = new Date(`${item.reservation_date}T${item.start_time}`);
    const resEnd = new Date(`${item.reservation_date}T${item.end_time}`);
    
    // Check-in allowed from start_time up to start_time + 15 mins
    const checkInDeadline = new Date(resDate);
    checkInDeadline.setMinutes(checkInDeadline.getMinutes() + 15);

    const isBeforeStart = now < resDate;
    const canCheckIn = now >= resDate && now <= checkInDeadline;
    
    // Status colors
    let statusColor = '#0284C7'; // reserved
    if (item.status === 'checked_in') statusColor = '#10B981';
    else if (item.status === 'cancelled') statusColor = '#9CA3AF';
    else if (item.status === 'no_show') statusColor = '#E11D48';
    else if (item.status === 'completed') statusColor = '#4F46E5';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.seatNum}>Carrel {item.seats?.seat_number}</Text>
            <Text style={styles.zone}>{item.seats?.zone || 'General'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.timeRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <Text style={styles.timeText}>{item.reservation_date} | {item.start_time.substring(0,5)} - {item.end_time.substring(0,5)}</Text>
        </View>

        {item.status === 'reserved' && (
          <View style={styles.actionRow}>
            {isBeforeStart ? (
              <OutlineButton 
                title="Cancel Reservation" 
                onPress={() => handleAction(item.id, 'cancelled')} 
                style={styles.actionBtn} 
              />
            ) : null}
            
            {canCheckIn ? (
              <PrimaryButton 
                title="Check In Now" 
                onPress={() => handleAction(item.id, 'checked_in')} 
                style={styles.actionBtn} 
              />
            ) : null}
            
            {!isBeforeStart && !canCheckIn ? (
              <Text style={{color: '#E11D48', fontSize: 13}}>Check-in period expired.</Text>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Seat Reservations</Text>
        <TouchableOpacity onPress={() => userId && fetchRes(userId)}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          contentContainerStyle={styles.container}
          data={reservations}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<EmptyState message="You have no seat reservations." />}
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.white },
  headerTitle: { ...typography.h1 },
  container: { padding: spacing.md },
  card: { backgroundColor: colors.white, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  seatNum: { ...typography.h2, color: colors.text },
  zone: { ...typography.body, color: colors.textMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '700' },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, marginBottom: spacing.md },
  timeText: { marginLeft: 6, fontSize: 14, color: colors.text },
  actionRow: { flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  actionBtn: { flex: 1 }
});