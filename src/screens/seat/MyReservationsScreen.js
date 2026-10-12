
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { supabase } from '../../supabase/supabaseClient';

const C = {
  bg: '#F4F7F8', white: '#FFFFFF', teal: '#0F8B8D',
  text: '#18323B', muted: '#71838A', border: '#DFE8EA',
  green: '#23865B', red: '#B94048',
};

export default function MyReservationsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState('Upcoming');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;
      if (!authData?.user) {
        throw new Error('Please sign in to view your reservations.');
      }

      const { data, error: queryError } = await supabase
        .from('seat_reservations')
        .select(`
          id, seat_id, booking_date, start_time, end_time, status,
          library_seats (
            seat_number,
            reading_rooms (name, floor)
          )
        `)
        .eq('user_id', authData.user.id)
        .order('booking_date', { ascending: false });

      if (queryError) throw queryError;
      setItems(data ?? []);
    } catch (e) {
      setError(e.message || 'Unable to load reservations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cancel = (item) => {
    Alert.alert(
      'Cancel reservation?',
      `Cancel the reservation for seat ${item.library_seats?.seat_number ?? item.seat_id}?`,
      [
        { text: 'Keep reservation', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: async () => {
            setBusyId(item.id);

            try {
              const { data: authData, error: authError } =
                await supabase.auth.getUser();

              if (authError) throw authError;
              if (!authData?.user) throw new Error('Please sign in again.');

              const { error: updateError } = await supabase
                .from('seat_reservations')
                .update({ status: 'cancelled' })
                .eq('id', item.id)
                .eq('user_id', authData.user.id);

              if (updateError) throw updateError;

              await load();
              Alert.alert('Cancelled', 'Your reservation was cancelled.');
            } catch (e) {
              Alert.alert('Could not cancel', e.message);
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const today = new Date().toISOString().slice(0, 10);
  const isUpcoming = (item) => String(item.status).toLowerCase() === 'confirmed' && item.booking_date >= today;
  const visibleItems = items.filter(item => tab === 'Upcoming' ? isUpcoming(item) : !isUpcoming(item));

  const renderItem = ({ item }) => {
    const cancelled = String(item.status).toLowerCase() === 'cancelled';

    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.seatIcon}>
            <Text style={{ color: C.teal, fontSize: 22 }}>▦</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.seatName}>
              Seat {item.library_seats?.seat_number ?? item.seat_id}
            </Text>
            <Text style={styles.room}>
              {item.library_seats?.reading_rooms?.name ?? 'Reading room'}
            </Text>
          </View>
          <View style={[styles.badge, cancelled && styles.badgeCancelled]}>
            <Text style={[styles.badgeText, cancelled && styles.cancelledText]}>
              {item.status ?? 'Pending'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>DATE</Text>
            <Text style={styles.value}>{item.booking_date}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>TIME</Text>
            <Text style={styles.value}>
              {String(item.start_time).slice(0, 5)} – {String(item.end_time).slice(0, 5)}
            </Text>
          </View>
        </View>

        {!cancelled && isUpcoming(item) && (
          <Pressable
            disabled={busyId === item.id}
            onPress={() => cancel(item)}
            style={styles.cancelButton}
          >
            {busyId === item.id ? (
              <ActivityIndicator color={C.red} />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel reservation</Text>
            )}
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <Text style={styles.brand}>LIBROSEAT</Text>
        <Text style={styles.title}>My reservations</Text>
        <Text style={styles.subtitle}>Manage your library study sessions.</Text>
      </View>

      <View style={styles.tabs}>
        {['Upcoming', 'History'].map(value => <Pressable key={value} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.tabActive]}><Text style={[styles.tabText, tab === value && styles.tabTextActive]}>{value}</Text></Pressable>)}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.teal} />
          <Text style={styles.room}>Loading reservations...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={load} style={styles.retry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshing={loading}
          onRefresh={load}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{tab === 'Upcoming' ? 'No upcoming reservations' : 'No booking history yet'}</Text>
              <Text style={styles.room}>
                Your confirmed bookings will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { padding: 22, paddingBottom: 12 },
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 8, backgroundColor: '#E9EFF0', borderRadius: 12, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 },
  tabActive: { backgroundColor: C.white },
  tabText: { color: C.muted, fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: C.teal },
  brand: { color: C.teal, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: C.text, fontSize: 28, fontWeight: '900', marginTop: 13 },
  subtitle: { color: C.muted, fontSize: 13, marginTop: 7 },
  list: { padding: 20, paddingTop: 8, flexGrow: 1 },
  card: {
    backgroundColor: C.white, borderRadius: 19, padding: 16,
    borderWidth: 1, borderColor: C.border, marginBottom: 13,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  seatIcon: {
    width: 44, height: 44, borderRadius: 13, backgroundColor: '#E3F5F1',
    alignItems: 'center', justifyContent: 'center',
  },
  seatName: { color: C.text, fontSize: 16, fontWeight: '800' },
  room: { color: C.muted, fontSize: 12, marginTop: 5 },
  badge: { backgroundColor: '#E5F6EC', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9 },
  badgeText: { color: C.green, fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  badgeCancelled: { backgroundColor: '#FDEBEC' },
  cancelledText: { color: C.red },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },
  detailsRow: { flexDirection: 'row', gap: 10 },
  label: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  value: { color: C.text, fontSize: 13, fontWeight: '700', marginTop: 7 },
  cancelButton: {
    borderWidth: 1, borderColor: '#F0C7C9', borderRadius: 12,
    alignItems: 'center', padding: 12, marginTop: 16,
  },
  cancelButtonText: { color: C.red, fontSize: 12, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: C.red, textAlign: 'center' },
  retry: { backgroundColor: C.white, padding: 12, borderRadius: 10, marginTop: 12 },
  retryText: { color: C.teal, fontWeight: '800' },
  empty: { alignItems: 'center', padding: 30, marginTop: 40 },
  emptyTitle: { color: C.text, fontSize: 18, fontWeight: '800' },
});
