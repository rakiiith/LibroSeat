
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { fetchActiveSeats, fetchReservedSeatIds, localDateString, subscribeToSeatAvailability } from './seatReservationService';
import SeatCard from './SeatCard';

const C = {
  bg: '#F4F7F8', white: '#FFFFFF', teal: '#0F8B8D',
  text: '#18323B', muted: '#71838A', border: '#DFE8EA',
};

export default function SelectSeatScreen({ navigation, route }) {
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [floor, setFloor] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [roomFilter, setRoomFilter] = useState('');
  const [reservedIds, setReservedIds] = useState([]);

  const loadSeats = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');

    try {
      const [data, reserved] = await Promise.all([
        fetchActiveSeats(),
        fetchReservedSeatIds(localDateString()),
      ]);
      setSeats(data);
      setReservedIds(reserved);
      setSelected((current) =>
        current
          ? data.find((s) => String(s.id) === String(current.id)) ?? null
          : data.find((s) => String(s.id) === String(route?.params?.selectedSeatId)) ?? null
      );
    } catch (e) {
      setError(e.message || 'Unable to load seats.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route?.params?.selectedSeatId]);

  useFocusEffect(useCallback(() => {
    loadSeats();
    const unsubscribe = subscribeToSeatAvailability(() => loadSeats(true));
    return unsubscribe;
  }, [loadSeats]));

  useEffect(() => {
    const room = route?.params?.room;
    if (room) setRoomFilter(room);
    if (route?.params?.floor != null) setFloor(String(route.params.floor));
  }, [route?.params?.room, route?.params?.floor]);

  const floors = useMemo(() => [
    'All',
    ...new Set(
      seats.map((s) => s.reading_rooms?.floor)
        .filter((v) => v !== null && v !== undefined)
        .map(String)
    ),
  ], [seats]);

  const visibleSeats = useMemo(() => seats.filter((seat) => {
    const room = seat.reading_rooms?.name ?? '';
    const number = String(seat.seat_number ?? '');
    const type = seat.seat_type ?? '';

    return (
      (floor === 'All' || String(seat.reading_rooms?.floor) === floor) &&
      (!roomFilter || seat.reading_rooms?.name === roomFilter) &&
      `${number} ${room} ${type}`.toLowerCase().includes(search.trim().toLowerCase())
    );
  }), [seats, floor, search]);

  const continueBooking = () => {
    if (!selected) {
      Alert.alert('Choose a seat', 'Select a seat before continuing.');
      return;
    }

    navigation.navigate('SeatConfirmation', { seat: selected });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={C.teal} />
        <Text style={styles.muted}>Loading seats...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <FlatList
        data={visibleSeats}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={() => loadSeats(true)}
        renderItem={({ item }) => (
          <SeatCard
            seat={item}
            selected={selected?.id === item.id}
            bookedToday={reservedIds.includes(String(item.id))}
            onPress={() => setSelected((old) => old?.id === item.id ? null : item)}
          />
        )}
        ListHeaderComponent={
          <View>
            <Text style={styles.brand}>LIBROSEAT / SEATING</Text>
            <Text style={styles.title}>Choose your seat</Text>
            <Text style={styles.subtitle}>
              {roomFilter ? `${roomFilter}${route?.params?.floor != null ? ` · Floor ${route.params.floor}` : ''}` : 'Pick a seat in your preferred reading room.'}
            </Text>

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search seat, room or type"
              placeholderTextColor="#91A0A8"
              style={styles.search}
            />

            <Text style={styles.section}>Select floor</Text>
            <FlatList
              horizontal
              data={floors}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 13 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setFloor(item)}
                  style={[styles.chip, floor === item && styles.chipActive]}
                >
                  <Text style={[styles.chipText, floor === item && styles.chipTextActive]}>
                    {item === 'All' ? 'All floors' : `Floor ${item}`}
                  </Text>
                </Pressable>
              )}
            />

            <View style={styles.sectionRow}>
              <Text style={styles.section}>Seats</Text>
              <Text style={styles.muted}>{visibleSeats.length} active</Text>
            </View>

            {error ? (
              <View style={styles.error}>
                <Text style={{ color: '#A52B32' }}>{error}</Text>
                <Pressable onPress={() => loadSeats()}>
                  <Text style={{ color: '#A52B32', fontWeight: '800', marginTop: 8 }}>
                    Try again
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !error ? (
            <Text style={styles.empty}>No seats match your search.</Text>
          ) : null
        }
        ListFooterComponent={<View style={{ height: selected ? 110 : 25 }} />}
      />

      {selected && (
        <View style={styles.bottom}>
          <View style={{ flex: 1 }}>
            <Text style={styles.muted}>SELECTED SEAT</Text>
            <Text style={styles.selectedName}>{selected.seat_number}</Text>
            <Text numberOfLines={1} style={styles.muted}>
              {selected.reading_rooms?.name ?? 'Reading room'}
            </Text>
          </View>
          <Pressable onPress={continueBooking} style={styles.button}>
            <Text style={styles.buttonText}>Continue →</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: {
    flex: 1, backgroundColor: C.bg, alignItems: 'center',
    justifyContent: 'center', gap: 12,
  },
  list: { padding: 20, paddingBottom: 25, flexGrow: 1, gap: 12 },
  brand: { color: C.teal, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 8 },
  title: { color: C.text, fontSize: 29, fontWeight: '900', marginTop: 12 },
  subtitle: { color: C.muted, fontSize: 13, marginTop: 7, lineHeight: 20 },
  search: {
    backgroundColor: C.white, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 15, marginTop: 22, color: C.text,
  },
  section: { color: C.text, fontSize: 16, fontWeight: '800' },
  chip: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16,
  },
  chipActive: { backgroundColor: C.teal, borderColor: C.teal },
  chipText: { color: C.muted, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: C.white },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 2,
  },
  muted: { color: C.muted, fontSize: 12 },
  error: { backgroundColor: '#FDECEC', padding: 14, borderRadius: 12, marginVertical: 8 },
  empty: { color: C.muted, textAlign: 'center', padding: 24 },
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.white, borderTopWidth: 1, borderColor: C.border,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  selectedName: { color: C.text, fontWeight: '900', fontSize: 19, marginVertical: 3 },
  button: { backgroundColor: C.teal, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 18 },
  buttonText: { color: C.white, fontWeight: '800', fontSize: 13 },
});
