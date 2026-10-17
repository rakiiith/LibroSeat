import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchActiveSeats,
  fetchReservedSeatIds,
  localDateString,
  subscribeToSeatAvailability,
} from './seatReservationService';

const C = {
  bg: '#F4F7F8', white: '#FFFFFF', teal: '#0F8B8D', dark: '#08696C',
  text: '#18323B', muted: '#71838A', border: '#DFE8EA', pale: '#E3F5F1',
  green: '#23865B', greenBg: '#E5F6EC', red: '#B94048', redBg: '#FDEBEC',
};

export default function SeatAvailabilityScreen({ navigation }) {
  const [seats, setSeats] = useState([]);
  const [reservedIds, setReservedIds] = useState([]);
  const [floor, setFloor] = useState('All');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [seatRows, bookedIds] = await Promise.all([
        fetchActiveSeats(),
        fetchReservedSeatIds(localDateString()),
      ]);
      setSeats(seatRows);
      setReservedIds(bookedIds);
    } catch (e) {
      setError(e.message || 'Unable to load seat availability.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    const unsubscribe = subscribeToSeatAvailability(() => load(true));
    return unsubscribe;
  }, [load]));

  const floors = useMemo(() => [
    'All',
    ...new Set(seats
      .map(seat => seat.reading_rooms?.floor)
      .filter(value => value !== null && value !== undefined)
      .map(String)),
  ], [seats]);

  const visibleSeats = useMemo(() => {
    const term = query.trim().toLowerCase();
    return seats.filter(seat => {
      const floorMatches = floor === 'All' || String(seat.reading_rooms?.floor) === floor;
      const searchText = `${seat.seat_number ?? ''} ${seat.reading_rooms?.name ?? ''} ${seat.seat_type ?? ''}`.toLowerCase();
      return floorMatches && searchText.includes(term);
    });
  }, [seats, floor, query]);

  const availableCount = visibleSeats.filter(seat => !reservedIds.includes(String(seat.id))).length;

  const openSeat = (seat) => navigation.navigate('SelectSeat', {
    room: seat.reading_rooms?.name,
    floor: seat.reading_rooms?.floor,
    selectedSeatId: seat.id,
  });

  const renderSeat = ({ item }) => {
    const reserved = reservedIds.includes(String(item.id));
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Seat ${item.seat_number}, ${reserved ? 'has a confirmed reservation today' : 'available today'}`}
        onPress={() => openSeat(item)}
        style={({ pressed }) => [styles.seatCard, pressed && styles.seatCardPressed]}
      >
        <View style={[styles.seatIcon, reserved && styles.seatIconReserved]}>
          <Ionicons name="grid-outline" size={20} color={reserved ? C.red : C.teal} />
        </View>
        <View style={styles.seatInfo}>
          <Text style={styles.seatName}>Seat {item.seat_number ?? '—'}</Text>
          <Text numberOfLines={1} style={styles.meta}>
            {item.reading_rooms?.name ?? 'Reading room'}
            {item.reading_rooms?.floor != null ? ` · Floor ${item.reading_rooms.floor}` : ''}
          </Text>
          {item.seat_type ? <Text style={styles.seatType}>{item.seat_type}</Text> : null}
        </View>
        <View style={[styles.statusBadge, reserved && styles.reservedBadge]}>
          <View style={[styles.dot, reserved && styles.reservedDot]} />
          <Text style={[styles.statusText, reserved && styles.reservedText]}>
            {reserved ? 'Booked today' : 'Available'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={17} color={C.muted} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.teal} />
      <FlatList
        data={visibleSeats}
        keyExtractor={seat => String(seat.id)}
        renderItem={renderSeat}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={() => load(true)}
        ListHeaderComponent={(
          <View>
            <Text style={styles.brand}>LIBROSEAT / SEATING</Text>
            <Text style={styles.title}>Seat availability</Text>
            <Text style={styles.subtitle}>Browse today's seats. Time conflicts are checked when you confirm.</Text>

            <View style={styles.search}>
              <Ionicons name="search-outline" size={18} color={C.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search room or seat number"
                placeholderTextColor="#91A0A8"
                style={styles.searchInput}
                returnKeyType="search"
                accessibilityLabel="Search seats"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={19} color={C.muted} />
                </Pressable>
              )}
            </View>

            <View style={styles.filterHeading}>
              <Text style={styles.sectionTitle}>Filter by floor</Text>
              <Pressable onPress={() => load(true)} style={styles.refreshButton}>
                <Ionicons name="refresh-outline" size={14} color={C.teal} />
                <Text style={styles.refreshText}>Refresh</Text>
              </Pressable>
            </View>
            <FlatList
              horizontal
              data={floors}
              keyExtractor={item => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              renderItem={({ item }) => (
                <Pressable onPress={() => setFloor(item)} style={[styles.chip, floor === item && styles.chipActive]}>
                  <Text style={[styles.chipText, floor === item && styles.chipTextActive]}>
                    {item === 'All' ? 'All floors' : `Floor ${item}`}
                  </Text>
                </Pressable>
              )}
            />

            <View style={styles.seatsHeading}>
              <View>
                <Text style={styles.sectionTitle}>Seats today</Text>
                <Text style={styles.meta}>{visibleSeats.length} {visibleSeats.length === 1 ? 'seat' : 'seats'} found</Text>
              </View>
              <View style={styles.countBadge}>
                <View style={styles.dot} />
          <Text style={styles.countText}>{availableCount} unbooked today</Text>
              </View>
            </View>
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={() => load()}><Text style={styles.retry}>Try again</Text></Pressable>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={loading ? (
          <View style={styles.state}><ActivityIndicator size="large" color={C.teal} /><Text style={styles.meta}>Loading seats…</Text></View>
        ) : error ? null : (
          <View style={styles.state}>
            <View style={styles.emptyIcon}><Ionicons name="search-outline" size={22} color={C.teal} /></View>
            <Text style={styles.emptyTitle}>{query || floor !== 'All' ? 'No matching seats' : 'No seats found'}</Text>
            <Text style={styles.emptyText}>{query || floor !== 'All' ? 'Try a different search or floor.' : 'Seats will appear here when available.'}</Text>
          </View>
        )}
        ListFooterComponent={<View style={{ height: 20 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  list: { padding: 20, paddingBottom: 28, flexGrow: 1 },
  brand: { color: C.teal, fontSize: 10, fontWeight: '900', letterSpacing: 1.8, marginTop: 8 },
  title: { color: C.text, fontSize: 28, fontWeight: '900', marginTop: 12 },
  subtitle: { color: C.muted, fontSize: 13, marginTop: 6 },
  search: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 20, marginBottom: 20, paddingHorizontal: 13, borderWidth: 1, borderColor: C.border, borderRadius: 14, backgroundColor: C.white },
  searchInput: { flex: 1, color: C.text, fontSize: 13, paddingVertical: 11 },
  filterHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
  refreshButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 5 },
  refreshText: { color: C.teal, fontSize: 11, fontWeight: '700' },
  chips: { gap: 8, paddingVertical: 11 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
  chipActive: { backgroundColor: C.teal, borderColor: C.teal },
  chipText: { color: C.muted, fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: C.white },
  seatsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, paddingBottom: 13, marginTop: 5, borderTopWidth: 1, borderTopColor: C.border },
  meta: { color: C.muted, fontSize: 11, marginTop: 4 },
  countBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: C.greenBg },
  countText: { color: C.green, fontSize: 10, fontWeight: '800' },
  seatCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, marginBottom: 10, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
  seatCardPressed: { borderColor: C.teal, backgroundColor: '#F8FCFC' },
  seatIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: C.pale },
  seatIconReserved: { backgroundColor: C.redBg },
  seatInfo: { flex: 1, minWidth: 0 },
  seatName: { color: C.text, fontSize: 14, fontWeight: '800' },
  seatType: { color: C.dark, fontSize: 9, fontWeight: '700', marginTop: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10, backgroundColor: C.greenBg },
  reservedBadge: { backgroundColor: C.redBg },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  reservedDot: { backgroundColor: C.red },
  statusText: { color: C.green, fontSize: 9, fontWeight: '800' },
  reservedText: { color: C.red },
  errorBox: { padding: 13, marginBottom: 10, borderRadius: 12, backgroundColor: C.redBg },
  errorText: { color: C.red, fontSize: 12 },
  retry: { color: C.red, fontSize: 11, fontWeight: '800', marginTop: 8 },
  state: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 36, gap: 9 },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.pale },
  emptyTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
  emptyText: { color: C.muted, fontSize: 12, textAlign: 'center' },
});
