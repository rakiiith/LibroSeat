import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  cancelSeatReservation,
  checkInSeatReservation,
  fetchMySeatReservations,
  getCurrentUser,
  subscribeToSeatReservations,
} from './seatReservationService';

const C = {
  bg: '#F4F8F9', white: '#FFFFFF', teal: '#0F9292', dark: '#0A686B',
  text: '#18323B', muted: '#74868E', faint: '#9BA9AE', border: '#E2EBED',
  pale: '#E7F7F5', green: '#168957', greenBg: '#DDF6E9', rose: '#C94C55', roseBg: '#FDEBEC',
};

const AREA_IMAGES = [
  require('../../assets/library3d/study-front.jpg'),
  require('../../assets/library3d/library-overview.jpg'),
  require('../../assets/library3d/group-study.jpg'),
];

const dateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function displayDate(value, options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!value) return 'Date not set';
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString(undefined, options);
}

function displayTime(value) {
  return value ? String(value).slice(0, 5) : '—';
}

function isUpcoming(item) {
  const status = String(item.status || '').toLowerCase();
  if (!['confirmed', 'pending', 'reserved', 'checked_in'].includes(status)) return false;
  const date = item.reservation_date || item.booking_date;
  return date > dateKey() || (date === dateKey() && displayTime(item.end_time) >= displayTime(new Date().toTimeString()));
}

function canCancel(item) {
  const status = String(item.status || '').toLowerCase();
  const date = item.reservation_date || item.booking_date;
  const now = new Date();
  const timeNow = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return ['confirmed', 'reserved'].includes(status)
    && (date > dateKey() || (date === dateKey() && displayTime(item.start_time) > timeNow));
}

function checkInState(item) {
  const status = String(item.status || '').toLowerCase();
  if (status === 'checked_in') return { checked: true, label: 'Checked in' };
  if (!['reserved', 'confirmed'].includes(status)) return { canCheckIn: false };
  const date = item.reservation_date || item.booking_date;
  const start = new Date(`${date}T${displayTime(item.start_time)}:00`);
  const end = new Date(`${date}T${displayTime(item.end_time)}:00`);
  const now = new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { canCheckIn: false };
  if (now < new Date(start.getTime() - 15 * 60 * 1000)) return { canCheckIn: false, label: 'Check-in opens 15 min before' };
  return { canCheckIn: now <= end, label: now <= end ? 'Check in now' : 'Reservation ended' };
}

function statusInfo(item) {
  if (isUpcoming(item)) return { label: item.status === 'checked_in' ? 'Checked in' : 'Upcoming', color: C.green, bg: C.greenBg };
  if (String(item.status).toLowerCase() === 'cancelled') return { label: 'Cancelled', color: C.rose, bg: C.roseBg };
  return { label: 'Past', color: C.muted, bg: '#E9EEF0' };
}

function BottomTab({ icon, label, active, onPress }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.bottomTab}>
      <Ionicons name={icon} size={21} color={active ? C.dark : C.muted} />
      <Text style={[styles.bottomTabText, active && styles.bottomTabTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function MyReservationsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState('Upcoming');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const wide = width > 760;

  const load = useCallback(async (userId, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setItems(await fetchMySeatReservations(userId));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load reservations.');
    } finally {
      if (refresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    let unsubscribe;
    const start = async () => {
      try {
        const user = await getCurrentUser();
        if (!active) return;
        unsubscribe = subscribeToSeatReservations(() => load(user.id, true), user.id);
        await load(user.id);
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'Unable to load reservations.');
          setLoading(false);
        }
      }
    };
    start();
    return () => { active = false; unsubscribe?.(); };
  }, [load]));

  const refresh = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      await load(user.id, true);
    } catch (loadError) {
      setError(loadError.message || 'Unable to refresh reservations.');
      setRefreshing(false);
    }
  }, [load]);

  const upcomingCount = items.filter(isUpcoming).length;
  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter(item => {
      const active = isUpcoming(item);
      const matchesTab = tab === 'Upcoming' ? active : !active;
      const seat = item.seats?.seat_number ?? item.seat_id ?? '';
      const room = item.seats?.zone ?? 'Main Library';
      const date = item.reservation_date || item.booking_date || '';
      return matchesTab && (!query || `${seat} ${room} ${date} ${item.status}`.toLowerCase().includes(query));
    }).sort((a, b) => {
      const aDate = `${a.reservation_date || a.booking_date} ${displayTime(a.start_time)}`;
      const bDate = `${b.reservation_date || b.booking_date} ${displayTime(b.start_time)}`;
      return tab === 'Upcoming' ? aDate.localeCompare(bDate) : bDate.localeCompare(aDate);
    });
  }, [items, search, tab]);

  const runAction = (item, action) => {
    const seat = item.seats?.seat_number ?? item.seat_id;
    const isCancel = action === 'cancel';
    Alert.alert(
      isCancel ? 'Cancel reservation?' : 'Check in to your seat?',
      isCancel ? `Seat ${seat} · ${displayDate(item.reservation_date || item.booking_date)}` : `Confirm your arrival at seat ${seat}.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: isCancel ? 'Cancel booking' : 'Check in',
          style: isCancel ? 'destructive' : 'default',
          onPress: async () => {
            setBusyId(item.id);
            try {
              const user = await getCurrentUser();
              if (isCancel) await cancelSeatReservation(item.id, user.id);
              else await checkInSeatReservation(item.id, user.id);
              setSelected(null);
              await load(user.id, true);
            } catch (actionError) {
              Alert.alert(isCancel ? 'Could not cancel' : 'Check-in failed', actionError.message || 'Please try again.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item, index }) => {
    const seat = item.seats?.seat_number ?? item.seat_id ?? '—';
    const room = item.seats?.zone || 'Main Library';
    const date = item.reservation_date || item.booking_date;
    const status = statusInfo(item);
    const checkIn = checkInState(item);
    const mayCancel = canCancel(item);
    return (
      <View style={styles.card}>
        <View style={styles.cardMain}>
          <View style={styles.cardDetails}>
            <View style={styles.cardHeading}>
              <View style={styles.seatHeading}>
                <Ionicons name="tablet-portrait" size={19} color={C.teal} />
                <Text style={styles.seatNumber}>{seat}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
              </View>
            </View>
            <View style={styles.detailLine}><Ionicons name="calendar-outline" size={16} color={C.muted} /><Text style={styles.detailText}>{displayDate(date)}</Text></View>
            <View style={styles.detailLine}><Ionicons name="time-outline" size={16} color={C.muted} /><Text style={styles.detailText}>{displayTime(item.start_time)} – {displayTime(item.end_time)}</Text></View>
            <View style={styles.detailLine}><Ionicons name="location-outline" size={16} color={C.muted} /><Text numberOfLines={1} style={styles.detailText}>{room}</Text></View>
          </View>
          <Image source={AREA_IMAGES[index % AREA_IMAGES.length]} style={styles.cardImage} resizeMode="cover" />
        </View>
        <View style={styles.cardActions}>
          <Pressable onPress={() => setSelected(item)} style={styles.detailsButton}>
            <Text style={styles.detailsButtonText}>View Details</Text>
          </Pressable>
          {mayCancel ? (
            <Pressable disabled={busyId === item.id} onPress={() => runAction(item, 'cancel')} style={styles.cancelButton}>
              {busyId === item.id ? <ActivityIndicator size="small" color={C.rose} /> : <Text style={styles.cancelButtonText}>Cancel</Text>}
            </Pressable>
          ) : checkIn.canCheckIn ? (
            <Pressable disabled={busyId === item.id} onPress={() => runAction(item, 'checkin')} style={styles.checkInButton}>
              <Text style={styles.checkInButtonText}>Check In</Text>
            </Pressable>
          ) : (
            <View style={styles.actionHint}><Text style={styles.actionHintText}>{checkIn.checked ? 'Checked in' : ''}</Text></View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={[styles.header, wide && styles.wideHeader]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation?.canGoBack?.() ? navigation.goBack() : navigation.navigate('Home')} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={19} color={C.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>My Reservations</Text>
          <Text style={styles.headerSubtitle}>{upcomingCount} upcoming {upcomingCount === 1 ? 'reservation' : 'reservations'}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Search reservations" onPress={() => { setSearchOpen(value => !value); setSearch(''); }} style={styles.headerButton}>
          <Ionicons name={searchOpen ? 'close' : 'search'} size={19} color={C.text} />
        </Pressable>
      </View>

      {searchOpen && (
        <View style={[styles.searchWrap, wide && styles.wideContent]}>
          <Ionicons name="search" size={17} color={C.muted} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search seat, room, or date" placeholderTextColor={C.faint} style={styles.searchInput} autoFocus />
        </View>
      )}

      <View style={[styles.tabs, wide && styles.wideContent]}>
        {['Upcoming', 'History'].map(value => {
          const active = tab === value;
          const count = value === 'Upcoming' ? upcomingCount : items.length - upcomingCount;
          return (
            <Pressable key={value} onPress={() => setTab(value)} style={[styles.tab, active && styles.tabActive]}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{value}</Text>
              <Text style={[styles.tabCount, active && styles.tabCountActive]}>{count}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.teal} /><Text style={styles.helper}>Loading your reservations…</Text></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={34} color={C.rose} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={refresh} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          onRefresh={refresh}
          refreshing={refreshing}
          contentContainerStyle={[styles.list, wide && styles.wideContent, !visibleItems.length && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={(
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><Ionicons name={tab === 'Upcoming' ? 'calendar-outline' : 'time-outline'} size={25} color={C.teal} /></View>
              <Text style={styles.emptyTitle}>{search ? 'No matching reservations' : tab === 'Upcoming' ? 'No upcoming reservations' : 'No reservation history'}</Text>
              <Text style={styles.helper}>{search ? 'Try another seat, room, or date.' : 'Your seat bookings will appear here.'}</Text>
            </View>
          )}
        />
      )}

      {selected && (
        <View style={styles.modalOverlay}>
          <Pressable accessibilityLabel="Close reservation details" onPress={() => setSelected(null)} style={StyleSheet.absoluteFill} />
          <View style={[styles.detailSheet, wide && styles.wideSheet]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetIcon}><Ionicons name="ticket-outline" size={19} color={C.teal} /></View>
              <View style={{ flex: 1 }}><Text style={styles.sheetTitle}>Reservation Details</Text><Text style={styles.sheetId}>#{String(selected.id).slice(0, 8).toUpperCase()}</Text></View>
              <Pressable onPress={() => setSelected(null)} style={styles.closeButton}><Ionicons name="close" size={19} color={C.muted} /></Pressable>
            </View>
            <Text style={styles.sheetSeat}>Seat {selected.seats?.seat_number ?? selected.seat_id}</Text>
            <View style={styles.detailLine}><Ionicons name="location-outline" size={17} color={C.muted} /><Text style={styles.detailText}>{selected.seats?.zone || 'Main Library'}</Text></View>
            <View style={styles.detailLine}><Ionicons name="calendar-outline" size={17} color={C.muted} /><Text style={styles.detailText}>{displayDate(selected.reservation_date || selected.booking_date)}</Text></View>
            <View style={styles.detailLine}><Ionicons name="time-outline" size={17} color={C.muted} /><Text style={styles.detailText}>{displayTime(selected.start_time)} – {displayTime(selected.end_time)}</Text></View>
            {checkInState(selected).canCheckIn && <Pressable onPress={() => runAction(selected, 'checkin')} style={styles.sheetPrimary}><Text style={styles.sheetPrimaryText}>Check In Now</Text></Pressable>}
            {canCancel(selected) && <Pressable onPress={() => runAction(selected, 'cancel')} style={styles.sheetCancel}><Text style={styles.cancelButtonText}>Cancel reservation</Text></Pressable>}
            <Pressable onPress={() => setSelected(null)} style={styles.sheetDone}><Text style={styles.sheetDoneText}>Done</Text></Pressable>
          </View>
        </View>
      )}

      <View style={styles.bottomTabs}>
        <BottomTab icon="home-outline" label="Home" onPress={() => navigation.navigate('Home', { screen: 'HomeTab' })} />
        <BottomTab icon="grid-outline" label="Seats" onPress={() => navigation.navigate('SeatAvailability')} />
        <BottomTab icon="calendar" label="Bookings" active onPress={() => {}} />
        <BottomTab icon="person-outline" label="Account" onPress={() => navigation.navigate('Home', { screen: 'Profile' })} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { minHeight: 67, width: '100%', paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wideHeader: { maxWidth: 900, alignSelf: 'center' },
  headerButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { color: C.text, fontSize: 17, fontWeight: '800' },
  headerSubtitle: { color: C.muted, fontSize: 10, marginTop: 3 },
  wideContent: { width: '100%', maxWidth: 900, alignSelf: 'center' },
  searchWrap: { minHeight: 46, marginHorizontal: 18, marginBottom: 9, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, paddingVertical: 10, color: C.text, fontSize: 13 },
  tabs: { width: 'auto', flexDirection: 'row', marginHorizontal: 18, marginTop: 5, marginBottom: 5, padding: 4, borderRadius: 14, backgroundColor: '#E9EFF0', borderWidth: 1, borderColor: C.border },
  tab: { flex: 1, minHeight: 40, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  tabActive: { backgroundColor: C.teal },
  tabText: { color: C.muted, fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: C.white },
  tabCount: { overflow: 'hidden', color: C.dark, backgroundColor: '#D8EFEC', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, fontSize: 9, fontWeight: '800' },
  tabCountActive: { color: C.teal, backgroundColor: C.white },
  list: { width: '100%', paddingHorizontal: 18, paddingTop: 9, paddingBottom: 16 },
  listEmpty: { flexGrow: 1 },
  card: { backgroundColor: C.white, borderRadius: 19, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 12, shadowColor: '#1A3F49', shadowOpacity: 0.04, shadowRadius: 9, elevation: 1 },
  cardMain: { minHeight: 116, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardDetails: { flex: 1, gap: 9 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 },
  seatHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  seatNumber: { color: C.text, fontSize: 20, fontWeight: '900' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15 },
  statusText: { fontSize: 10, fontWeight: '800' },
  detailLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { flex: 1, color: C.muted, fontSize: 11, lineHeight: 16 },
  cardImage: { width: 92, height: 112, borderRadius: 12, backgroundColor: '#E5EEEE' },
  cardActions: { flexDirection: 'row', gap: 9, marginTop: 13 },
  detailsButton: { flex: 1, minHeight: 41, borderRadius: 12, backgroundColor: '#EFF5F6', alignItems: 'center', justifyContent: 'center' },
  detailsButtonText: { color: C.dark, fontSize: 11, fontWeight: '800' },
  cancelButton: { flex: 1, minHeight: 41, borderRadius: 12, backgroundColor: C.roseBg, alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { color: C.rose, fontSize: 11, fontWeight: '800' },
  checkInButton: { flex: 1, minHeight: 41, borderRadius: 12, backgroundColor: C.greenBg, alignItems: 'center', justifyContent: 'center' },
  checkInButtonText: { color: C.green, fontSize: 11, fontWeight: '800' },
  actionHint: { flex: 1, minHeight: 41, alignItems: 'center', justifyContent: 'center' },
  actionHintText: { color: C.green, fontSize: 10, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 25 },
  helper: { color: C.muted, textAlign: 'center', fontSize: 12, marginTop: 9, lineHeight: 18 },
  errorText: { color: C.rose, textAlign: 'center', fontSize: 13, marginTop: 12 },
  retryButton: { marginTop: 15, paddingHorizontal: 19, paddingVertical: 11, borderRadius: 12, backgroundColor: C.teal },
  retryText: { color: C.white, fontSize: 12, fontWeight: '800' },
  emptyState: { flex: 1, minHeight: 250, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25 },
  emptyIcon: { width: 58, height: 58, borderRadius: 19, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: C.text, fontSize: 16, fontWeight: '800', marginTop: 15 },
  modalOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10, justifyContent: 'flex-end', backgroundColor: 'rgba(24,50,59,0.38)' },
  detailSheet: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 25, borderTopLeftRadius: 25, borderTopRightRadius: 25, backgroundColor: C.white },
  wideSheet: { width: '100%', maxWidth: 620, alignSelf: 'center', borderRadius: 25, marginBottom: 25 },
  sheetHandle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 3, backgroundColor: '#CBD6D8', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  sheetIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { color: C.text, fontSize: 14, fontWeight: '800' },
  sheetId: { color: C.muted, fontSize: 10, marginTop: 3 },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  sheetSeat: { color: C.teal, fontSize: 23, fontWeight: '900', marginVertical: 15 },
  sheetPrimary: { minHeight: 43, borderRadius: 12, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  sheetPrimaryText: { color: C.white, fontSize: 12, fontWeight: '800' },
  sheetCancel: { minHeight: 43, borderRadius: 12, backgroundColor: C.roseBg, alignItems: 'center', justifyContent: 'center', marginTop: 9 },
  sheetDone: { alignItems: 'center', paddingVertical: 13, marginTop: 6 },
  sheetDoneText: { color: C.dark, fontSize: 12, fontWeight: '800' },
  bottomTabs: { minHeight: 58, paddingTop: 7, paddingBottom: 3, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row', justifyContent: 'space-around' },
  bottomTab: { minWidth: 60, alignItems: 'center', justifyContent: 'center', gap: 2 },
  bottomTabText: { color: C.muted, fontSize: 9 },
  bottomTabTextActive: { color: C.dark, fontWeight: '800' },
});
