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
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../supabase/supabaseClient';

const C = {
  bg: '#071215', panel: '#0B191D', panelLight: '#102329', teal: '#17343C',
  amber: '#FF9D00', orange: '#FF6B00', cyan: '#00F0FF', emerald: '#10B981',
  white: '#F4F7F8', muted: '#91A4A9', faint: '#53686D', border: 'rgba(255,255,255,0.09)',
  rose: '#FB7185',
};

const dateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

function displayDate(value) {
  if (!value) return 'Date not set';
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : parsed.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function displayTime(value) {
  return value ? String(value).slice(0, 5) : '—';
}

function isActive(item) {
  const status = String(item.status || '').toLowerCase();
  return status === 'confirmed' && item.booking_date >= dateKey();
}

function statusTone(status) {
  switch (String(status || '').toLowerCase()) {
    case 'confirmed': return { text: C.emerald, bg: 'rgba(16,185,129,0.12)', icon: 'checkmark-circle' };
    case 'cancelled': return { text: C.rose, bg: 'rgba(251,113,133,0.12)', icon: 'close-circle' };
    default: return { text: C.amber, bg: 'rgba(255,157,0,0.12)', icon: 'time' };
  }
}

export default function MyReservationsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState('Upcoming');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData?.user) throw new Error('Please sign in to view your reservations.');

      const { data, error: queryError } = await supabase
        .from('seat_reservations')
        .select(`id, seat_id, booking_date, start_time, end_time, status,
          library_seats (seat_number, seat_type, reading_rooms (name, floor))`)
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

  useEffect(() => { load(); }, [load]);

  const upcomingCount = items.filter(isActive).length;
  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter(item => {
      const active = isActive(item);
      const matchesTab = tab === 'Upcoming' ? active : !active;
      const seat = item.library_seats?.seat_number ?? item.seat_id ?? '';
      const room = item.library_seats?.reading_rooms?.name ?? '';
      const haystack = `${seat} ${room} ${item.booking_date} ${item.status}`.toLowerCase();
      return matchesTab && (!query || haystack.includes(query));
    });
  }, [items, search, tab]);

  const cancel = (item) => {
    Alert.alert(
      'Cancel reservation?',
      `Seat ${item.library_seats?.seat_number ?? item.seat_id} · ${displayDate(item.booking_date)}`,
      [
        { text: 'Keep booking', style: 'cancel' },
        {
          text: 'Confirm cancel', style: 'destructive',
          onPress: async () => {
            setBusyId(item.id);
            try {
              const { data: authData, error: authError } = await supabase.auth.getUser();
              if (authError) throw authError;
              if (!authData?.user) throw new Error('Please sign in again.');
              const { error: updateError } = await supabase
                .from('seat_reservations')
                .update({ status: 'cancelled' })
                .eq('id', item.id)
                .eq('user_id', authData.user.id);
              if (updateError) throw updateError;
              setSelected(null);
              await load();
              Alert.alert('Reservation cancelled', 'Your seat is now available to other members.');
            } catch (e) {
              Alert.alert('Could not cancel', e.message || 'Please try again.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }) => {
    const seat = item.library_seats?.seat_number ?? item.seat_id;
    const room = item.library_seats?.reading_rooms?.name ?? 'Reading room';
    const status = statusTone(item.status);
    const active = isActive(item);
    return (
      <Pressable onPress={() => setSelected(item)} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        <View style={styles.cardTop}>
          <View style={styles.seatBadge}>
            <Text style={styles.seatEyebrow}>SEAT</Text>
            <Text style={styles.seatNumber}>{seat}</Text>
          </View>
          <View style={styles.cardHeading}>
            <Text numberOfLines={1} style={styles.roomName}>{room}</Text>
            <Text style={styles.metaLine}>
              <Ionicons name="time-outline" size={12} color={C.amber} />{' '}
              {displayTime(item.start_time)} – {displayTime(item.end_time)}
              {item.library_seats?.seat_type ? `  ·  ${item.library_seats.seat_type}` : ''}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={12} color={status.text} />
            <Text style={[styles.statusText, { color: status.text }]}>{item.status || 'Pending'}</Text>
          </View>
        </View>

        <View style={styles.dateStrip}>
          <View style={styles.dateTextWrap}>
            <Ionicons name="calendar-outline" size={15} color={C.amber} />
            <Text style={styles.dateText}>{displayDate(item.booking_date)}</Text>
          </View>
          {active ? (
            <View style={styles.activeLabel}><View style={styles.liveDot} /><Text style={styles.activeLabelText}>ACTIVE PASS</Text></View>
          ) : (
            <Text style={styles.expiredText}>{String(item.status).toLowerCase() === 'cancelled' ? 'CANCELLED' : 'PAST PASS'}</Text>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => setSelected(item)} style={styles.passButton}>
            <Ionicons name="ticket-outline" size={16} color={C.amber} />
            <Text style={styles.passButtonText}>Reservation details</Text>
          </Pressable>
          {active && (
            <Pressable disabled={busyId === item.id} onPress={() => cancel(item)} style={styles.cancelButton}>
              {busyId === item.id ? <ActivityIndicator size="small" color={C.rose} /> : <>
                <Ionicons name="close" size={15} color={C.rose} />
                <Text style={styles.cancelText}>Cancel</Text>
              </>}
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation?.canGoBack?.() ? navigation.goBack() : navigation?.navigate?.('Home')} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={18} color={C.white} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.title}>My Reservations</Text>
          <View style={styles.activeCount}><View style={styles.liveDot} /><Text style={styles.activeCountText}>{upcomingCount} Active {upcomingCount === 1 ? 'Pass' : 'Passes'}</Text></View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Search reservations" onPress={() => { setSearchOpen(v => !v); setSearch(''); }} style={styles.headerButton}>
          <Ionicons name={searchOpen ? 'close' : 'search'} size={18} color={C.white} />
        </Pressable>
      </View>

      {searchOpen && (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={C.muted} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search seat, room, or date..." placeholderTextColor={C.faint} style={styles.searchInput} autoFocus />
        </View>
      )}

      <View style={styles.tabs}>
        {['Upcoming', 'History'].map(value => {
          const active = tab === value;
          return (
            <Pressable key={value} onPress={() => setTab(value)} style={[styles.tab, active && styles.tabActive]}>
              <Ionicons name={value === 'Upcoming' ? 'flash' : 'time'} size={14} color={active ? '#111' : C.muted} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{value}</Text>
              {value === 'Upcoming' && <Text style={[styles.countBadge, active && styles.countBadgeActive]}>{upcomingCount}</Text>}
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.amber} /><Text style={styles.helper}>Loading your passes...</Text></View>
      ) : error ? (
        <View style={styles.center}><Ionicons name="cloud-offline-outline" size={34} color={C.rose} /><Text style={styles.error}>{error}</Text><Pressable onPress={load} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable></View>
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          onRefresh={load}
          refreshing={loading}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name={tab === 'Upcoming' ? 'ticket-outline' : 'time-outline'} size={25} color={C.amber} /></View><Text style={styles.emptyTitle}>{search ? 'No matching reservations' : tab === 'Upcoming' ? 'No upcoming passes' : 'No reservation history'}</Text><Text style={styles.helper}>{search ? 'Try a different seat, room, or date.' : 'Your seat bookings will show up here.'}</Text></View>}
        />
      )}

      {selected && <View style={styles.modalOverlay}>
        <Pressable accessibilityLabel="Close reservation details" onPress={() => setSelected(null)} style={StyleSheet.absoluteFill} />
        <View style={styles.detailSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetIcon}><Ionicons name="ticket" size={17} color={C.amber} /></View>
            <View style={{ flex: 1 }}><Text style={styles.sheetEyebrow}>RESERVATION DETAILS</Text><Text style={styles.sheetId}>#{String(selected.id).slice(0, 8).toUpperCase()}</Text></View>
            <Pressable onPress={() => setSelected(null)} style={styles.closeButton}><Ionicons name="close" size={19} color={C.muted} /></Pressable>
          </View>
          <View style={styles.detailHero}>
            <Text style={styles.detailLabel}>ASSIGNED SEAT</Text>
            <Text style={styles.detailSeat}>Seat {selected.library_seats?.seat_number ?? selected.seat_id}</Text>
            <Text style={styles.detailRoom}>{selected.library_seats?.reading_rooms?.name ?? 'Reading room'}{selected.library_seats?.reading_rooms?.floor ? ` · Floor ${selected.library_seats.reading_rooms.floor}` : ''}</Text>
          </View>
          <View style={styles.detailGrid}>
            <View style={styles.detailCell}><Text style={styles.detailLabel}>DATE</Text><Text style={styles.detailValue}>{displayDate(selected.booking_date)}</Text></View>
            <View style={styles.detailCell}><Text style={styles.detailLabel}>TIME SLOT</Text><Text style={styles.detailValue}>{displayTime(selected.start_time)} – {displayTime(selected.end_time)}</Text></View>
          </View>
          <View style={styles.modalStatusRow}><Text style={styles.detailLabel}>BOOKING STATUS</Text><View style={[styles.statusPill, { backgroundColor: statusTone(selected.status).bg }]}><Text style={[styles.statusText, { color: statusTone(selected.status).text }]}>{selected.status || 'Pending'}</Text></View></View>
          {isActive(selected) && <Pressable onPress={() => cancel(selected)} style={styles.modalCancel}><Text style={styles.modalCancelText}>Cancel reservation</Text></Pressable>}
          <Pressable onPress={() => setSelected(null)} style={styles.doneButton}><Text style={styles.doneText}>Done</Text></Pressable>
        </View>
      </View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  headerButton: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, borderColor: C.border, backgroundColor: 'rgba(255,255,255,0.035)', alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { alignItems: 'center' },
  title: { color: C.white, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  activeCount: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  activeCountText: { color: C.amber, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.emerald },
  searchWrap: { minHeight: 44, marginHorizontal: 22, marginBottom: 10, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: C.panel, borderWidth: 1, borderColor: 'rgba(255,157,0,0.28)', borderRadius: 15 },
  searchInput: { flex: 1, color: C.white, fontSize: 12, paddingVertical: 9 },
  tabs: { flexDirection: 'row', marginHorizontal: 22, marginTop: 8, marginBottom: 8, padding: 4, borderRadius: 16, backgroundColor: '#061013', borderWidth: 1, borderColor: C.border },
  tab: { flex: 1, minHeight: 40, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  tabActive: { backgroundColor: C.amber, shadowColor: C.amber, shadowOpacity: 0.25, shadowRadius: 10, elevation: 3 },
  tabText: { color: C.muted, fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#111820' },
  countBadge: { overflow: 'hidden', color: C.amber, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, fontSize: 9, fontWeight: '800' },
  countBadgeActive: { color: '#FFE7BD', borderWidth: 1, borderColor: 'rgba(0,0,0,0.14)' },
  list: { paddingHorizontal: 21, paddingTop: 10, paddingBottom: 32, flexGrow: 1 },
  card: { backgroundColor: 'rgba(255,255,255,0.045)', borderRadius: 22, borderWidth: 1, borderColor: C.border, padding: 15, marginBottom: 14 },
  cardPressed: { borderColor: 'rgba(255,157,0,0.45)', backgroundColor: 'rgba(255,255,255,0.07)' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  seatBadge: { width: 49, height: 49, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,157,0,0.4)', backgroundColor: 'rgba(255,157,0,0.12)', alignItems: 'center', justifyContent: 'center' },
  seatEyebrow: { color: C.muted, fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  seatNumber: { color: C.white, fontSize: 16, fontWeight: '900', marginTop: 1 },
  cardHeading: { flex: 1 },
  roomName: { color: C.white, fontSize: 13, fontWeight: '800' },
  metaLine: { color: C.muted, fontSize: 10, marginTop: 5 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 9, fontWeight: '800', textTransform: 'capitalize' },
  dateStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 11, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.27)', borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  dateTextWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  dateText: { color: '#D5E0E2', fontSize: 10, fontWeight: '600', flexShrink: 1 },
  activeLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  activeLabelText: { color: C.emerald, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  expiredText: { color: C.faint, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  passButton: { flex: 1, minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)' },
  passButtonText: { color: '#DDE6E7', fontSize: 10, fontWeight: '700' },
  cancelButton: { minWidth: 86, minHeight: 38, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(251,113,133,0.3)' },
  cancelText: { color: C.rose, fontSize: 10, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  helper: { color: C.muted, textAlign: 'center', fontSize: 12, marginTop: 9, lineHeight: 18 },
  error: { color: '#FFC2CA', textAlign: 'center', fontSize: 13, marginTop: 12 },
  retry: { marginTop: 16, backgroundColor: C.amber, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: '#111820', fontSize: 12, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 70 },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,157,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,157,0,0.2)' },
  emptyTitle: { color: C.white, fontSize: 16, fontWeight: '800', marginTop: 16 },
  modalOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.76)' },
  detailSheet: { paddingHorizontal: 22, paddingTop: 11, paddingBottom: 28, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#0B191D', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  sheetHandle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 18 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: C.border },
  sheetIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: 'rgba(255,157,0,0.13)', alignItems: 'center', justifyContent: 'center' },
  sheetEyebrow: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  sheetId: { color: C.amber, fontSize: 11, fontWeight: '700', marginTop: 3 },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  detailHero: { alignItems: 'center', paddingVertical: 20, marginTop: 15, borderRadius: 18, backgroundColor: 'rgba(255,157,0,0.07)', borderWidth: 1, borderColor: 'rgba(255,157,0,0.17)' },
  detailLabel: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  detailSeat: { color: C.amber, fontSize: 24, fontWeight: '900', marginTop: 6 },
  detailRoom: { color: '#D1DDDF', fontSize: 12, marginTop: 4 },
  detailGrid: { flexDirection: 'row', gap: 9, marginTop: 10 },
  detailCell: { flex: 1, padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: C.border },
  detailValue: { color: C.white, fontSize: 11, fontWeight: '700', marginTop: 8 },
  modalStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  modalCancel: { alignItems: 'center', paddingVertical: 12, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(251,113,133,0.35)', marginBottom: 9 },
  modalCancelText: { color: C.rose, fontSize: 12, fontWeight: '800' },
  doneButton: { alignItems: 'center', paddingVertical: 13, borderRadius: 13, backgroundColor: C.amber },
  doneText: { color: '#111820', fontSize: 12, fontWeight: '900' },
});
