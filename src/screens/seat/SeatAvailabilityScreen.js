import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme/theme';
import { fetchSeatsWithAvailability, TIME_SLOTS } from '../../services/seatReservationService';
import { supabase } from '../../supabase/supabaseClient';

export default function SeatAvailabilityScreen({ navigation }) {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Date selection (Today or Tomorrow)
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[0]);

  useEffect(() => {
    loadSeats();
    
    // Subscribe to realtime updates on seat_reservations
    const channel = supabase
      .channel('public:seat_reservations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seat_reservations' }, payload => {
        loadSeats(); // Refresh when any reservation changes
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedDate, selectedSlot]);

  async function loadSeats() {
    setLoading(true);
    try {
      const data = await fetchSeatsWithAvailability(selectedDate, selectedSlot);
      setSeats(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }

  const renderItem = ({ item }) => {
    let statusColor = '#10B981'; // Green (Available)
    let statusText = 'Available';
    let cardStyle = styles.card;
    
    if (item.is_blocked) {
      statusColor = '#9CA3AF'; // Grey (Blocked)
      statusText = 'Blocked';
      cardStyle = [styles.card, { backgroundColor: '#F3F4F6' }];
    } else if (!item.is_available) {
      statusColor = '#EF4444'; // Red (Reserved/Occupied)
      statusText = 'Reserved';
      cardStyle = [styles.card, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }];
    }

    return (
      <TouchableOpacity 
        style={cardStyle}
        disabled={!item.is_available}
        onPress={() => navigation.navigate('SelectSeat', { seat: item, date: selectedDate, slot: selectedSlot })}
      >
        <View style={[styles.iconBox, { backgroundColor: item.is_available ? '#EFFFFE' : (item.is_blocked ? '#E5E7EB' : '#FEE2E2') }]}>
          <MaterialCommunityIcons name="table-chair" size={24} color={statusColor} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, !item.is_available && { color: statusColor }]}>Carrel {item.seat_number}</Text>
          <Text style={styles.subtitle}>{item.zone || 'General'}</Text>
        </View>
        <View style={styles.statusBox}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Book a Seat</Text>
      </View>
      
      <View style={styles.filters}>
        <View style={styles.dateTabs}>
          <TouchableOpacity 
            style={[styles.dateTab, selectedDate === today.toISOString().split('T')[0] && styles.dateTabActive]}
            onPress={() => setSelectedDate(today.toISOString().split('T')[0])}
          >
            <Text style={[styles.dateTabText, selectedDate === today.toISOString().split('T')[0] && styles.dateTabTextActive]}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.dateTab, selectedDate === tomorrow.toISOString().split('T')[0] && styles.dateTabActive]}
            onPress={() => setSelectedDate(tomorrow.toISOString().split('T')[0])}
          >
            <Text style={[styles.dateTabText, selectedDate === tomorrow.toISOString().split('T')[0] && styles.dateTabTextActive]}>Tomorrow</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.filterLabel}>Select Time Slot:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotScroll}>
          {TIME_SLOTS.map(slot => (
            <TouchableOpacity 
              key={slot.id} 
              style={[styles.slotChip, selectedSlot.id === slot.id && styles.slotChipActive]}
              onPress={() => setSelectedSlot(slot)}
            >
              <Text style={[styles.slotText, selectedSlot.id === slot.id && styles.slotTextActive]}>{slot.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={seats}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20}}>No seats found.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.white },
  headerTitle: { ...typography.h1 },
  filters: { backgroundColor: colors.white, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  dateTabs: { flexDirection: 'row', marginBottom: spacing.md, backgroundColor: '#F3F4F6', borderRadius: 8, padding: 4 },
  dateTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  dateTabActive: { backgroundColor: colors.white, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  dateTabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  dateTabTextActive: { color: colors.primary },
  filterLabel: { fontSize: 13, color: colors.textMuted, marginBottom: 8, fontWeight: '600' },
  slotScroll: { gap: 8 },
  slotChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: 'transparent' },
  slotChipActive: { backgroundColor: '#E0F2FE', borderColor: colors.primary },
  slotText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  slotTextActive: { color: colors.primary, fontWeight: '700' },
  list: { padding: spacing.md },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, 
    padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border
  },
  iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  info: { flex: 1 },
  title: { ...typography.h2, color: colors.text, marginBottom: 2 },
  subtitle: { ...typography.body, color: colors.textMuted },
  statusBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusText: { fontSize: 10, fontWeight: '700' }
});
