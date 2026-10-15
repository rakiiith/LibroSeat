import React, { useCallback, useMemo, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import {
  cancelSeatReservation,
  checkInSeatReservation,
  fetchMySeatReservations,
  getCurrentUser,
  localDateString,
  subscribeToSeatReservations,
} from './seatReservationService';

const C = {
  bg: '#F4F7F8', white: '#FFFFFF', teal: '#0F8B8D', dark: '#08696C',
  text: '#18323B', muted: '#71838A', faint: '#91A0A8', border: '#DFE8EA',
  pale: '#E3F5F1', emerald: '#23865B', greenBg: '#E5F6EC',
  amber: '#A96B00', amberBg: '#FFF4DD', rose: '#B94048', roseBg: '#FDEBEC',
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

function currentTimeString() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function isUpcoming(item) {
  const status = String(item.status || '').toLowerCase();
  if (status !== 'confirmed' && status !== 'pending' && status !== 'reserved' && status !== 'checked_in') return false;
  const today = dateKey();
  const resDate = item.reservation_date || item.booking_date;
  if (resDate > today) return true;
  return resDate === today && displayTime(item.end_time) >= currentTimeString();
}

function canCancel(item) {
  const status = String(item.status || '').toLowerCase();
  const resDate = item.reservation_date || item.booking_date;
  return (status === 'confirmed' || status === 'reserved') && (
    resDate > dateKey() ||
    (resDate === dateKey() && displayTime(item.start_time) > currentTimeString())
  );
}

function getCheckInInfo(item) {
  const status = String(item.status || '').toLowerCase();
  if (status === 'checked_in') {
    return { canCheckIn: false, isCheckedIn: true, message: 'Checked In · Enjoy your study session' };
  }
  if (status === 'cancelled') {
    return { canCheckIn: false, isCancelled: true, message: 'Cancelled pass' };
  }
  if (status === 'no_show') {
    return { canCheckIn: false, isNoShow: true, message: 'Check-in window passed' };
  }
  if (status !== 'reserved' && status !== 'confirmed') {
    return { canCheckIn: false, message: '' };
  }

  const resDate = item.reservation_date || item.booking_date;
  const sTime = item.start_time ? (item.start_time.length === 5 ? `${item.start_time}:00` : item.start_time) : '00:00:00';
  const eTime = item.end_time ? (item.end_time.length === 5 ? `${item.end_time}:00` : item.end_time) : '23:59:59';
  const start = new Date(`${resDate}T${sTime}`);
  const end = new Date(`${resDate}T${eTime}`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { canCheckIn: false, message: '' };
  }

  const now = new Date();
  const earlyWindow = new Date(start.getTime() - 15 * 60000);

  if (now < earlyWindow) {
    const earlyMin = String(earlyWindow.getMinutes()).padStart(2, '0');
    let earlyHours = earlyWindow.getHours();
    const ampm = earlyHours >= 12 ? 'PM' : 'AM';
    earlyHours = earlyHours % 12 || 12;
    const openTimeStr = `${String(earlyHours).padStart(2, '0')}:${earlyMin} ${ampm}`;
    return {
      canCheckIn: false,
      isPendingWindow: true,
      message: `Check-in opens 15m prior (at ${openTimeStr})`,
    };
  }

  if (now > end) {
    return {
      canCheckIn: false,
      isExpired: true,
      message: 'Reservation shift has ended',
    };
  }

  return {
    canCheckIn: true,
    message: 'Check-in is open now!',
  };
}

function canCheckIn(item) {
  return getCheckInInfo(item).canCheckIn;
}

function statusTone(status) {
  switch (String(status || '').toLowerCase()) {
    case 'checked_in': return { text: C.emerald, bg: C.greenBg, icon: 'checkmark-circle' };
    case 'confirmed':
    case 'reserved': return { text: C.teal, bg: C.pale, icon: 'bookmark' };
    case 'cancelled': return { text: C.rose, bg: C.roseBg, icon: 'close-circle' };
    default: return { text: C.amber, bg: C.amberBg, icon: 'time' };
  }
}

export default function MyReservationsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState('Upcoming');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async (userId, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const reservations = await fetchMySeatReservations(userId);
      setItems(reservations);
    } catch (e) {
      setError(e.message || 'Unable to load reservations.');
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
      } catch (e) {
        if (active) {
          setError(e.message || 'Unable to load reservations.');
          setLoading(false);
        }
      }
    };
    start();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [load]));

  const refreshReservations = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      await load(user.id, true);
    } catch (e) {
      setError(e.message || 'Unable to refresh reservations.');
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
      const room = item.seats?.zone ?? 'Reading Room A';
      const resDate = item.reservation_date || item.booking_date || '';
      const haystack = `${seat} ${room} ${resDate} ${item.status}`.toLowerCase();
      return matchesTab && (!query || haystack.includes(query));
    }).sort((left, right) => {
      const leftDate = left.reservation_date || left.booking_date || '';
      const rightDate = right.reservation_date || right.booking_date || '';
      const a = `${leftDate} ${displayTime(left.start_time)}`;
      const b = `${rightDate} ${displayTime(right.start_time)}`;
      return tab === 'Upcoming' ? a.localeCompare(b) : b.localeCompare(a);
    });
  }, [items, search, tab]);

  const handleCheckIn = (item) => {
    const seatNum = item.seats?.seat_number ?? item.seat_id;
    Alert.alert(
      'Check in to seat?',
      `Confirm your arrival at Carrel ${seatNum}.`,
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Check in now',
          onPress: async () => {
            setBusyId(item.id);
            try {
              const user = await getCurrentUser();
              await checkInSeatReservation(item.id, user.id);
              setSelected(null);
              await load(user.id, true);
              Alert.alert('Check-in confirmed', 'Your seat is now active. Enjoy your study session!');
            } catch (e) {
              Alert.alert('Check-in failed', e.message || 'Please try again.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const cancel = (item) => {
    const seatNum = item.seats?.seat_number ?? item.seat_id;
    const resDate = item.reservation_date || item.booking_date;
    Alert.alert(
      'Cancel reservation?',
      `Seat ${seatNum} · ${displayDate(resDate)}`,
      [
        { text: 'Keep booking', style: 'cancel' },
        {
          text: 'Confirm cancel', style: 'destructive',
          onPress: async () => {
            setBusyId(item.id);
            try {
              const user = await getCurrentUser();
              await cancelSeatReservation(item.id, user.id);
              setSelected(null);
              await load(user.id, true);
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
    const seat = item.seats?.seat_number ?? item.seat_id;
    const room = item.seats?.zone ?? 'Quiet Study';
    const status = statusTone(item.status);
    const active = isUpcoming(item);
    const resDate = item.reservation_date || item.booking_date;
    const checkInfo = getCheckInInfo(item);
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
            <Text style={styles.dateText}>{displayDate(resDate)}</Text>
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
            <Text style={styles.passButtonText}>Details</Text>
          </Pressable>
          {checkInfo.canCheckIn ? (
            <Pressable disabled={busyId === item.id} onPress={() => handleCheckIn(item)} style={styles.checkInButton}>
              {busyId === item.id ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={15} color={C.white} />
                  <Text style={styles.checkInButtonText}>Check In</Text>
                </>
              )}
            </Pressable>
          ) : checkInfo.isPendingWindow ? (
            <View style={styles.pendingWindowBadge}>
              <Ionicons name="time-outline" size={12} color={C.amber} />
              <Text style={styles.pendingWindowText}>{checkInfo.message}</Text>
            </View>
          ) : null}
          {canCancel(item) && (
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

  const selectedCheckInfo = selected ? getCheckInInfo(selected) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
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
              <Ionicons name={value === 'Upcoming' ? 'flash' : 'time'} size={14} color={active ? C.white : C.muted} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{value}</Text>
              {value === 'Upcoming' && <Text style={[styles.countBadge, active && styles.countBadgeActive]}>{upcomingCount}</Text>}
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.amber} /><Text style={styles.helper}>Loading your passes...</Text></View>
      ) : error ? (
        <View style={styles.center}><Ionicons name="cloud-offline-outline" size={34} color={C.rose} /><Text style={styles.error}>{error}</Text><Pressable onPress={refreshReservations} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable></View>
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          onRefresh={refreshReservations}
          refreshing={refreshing}
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
            <Text style={styles.detailSeat}>Seat {selected.seats?.seat_number ?? selected.seat_id}</Text>
            <Text style={styles.detailRoom}>{selected.seats?.zone ?? 'Reading Room A'}</Text>
          </View>
          <View style={styles.detailGrid}>
            <View style={styles.detailCell}><Text style={styles.detailLabel}>DATE</Text><Text style={styles.detailValue}>{displayDate(selected.reservation_date || selected.booking_date)}</Text></View>
            <View style={styles.detailCell}><Text style={styles.detailLabel}>TIME SLOT</Text><Text style={styles.detailValue}>{displayTime(selected.start_time)} – {displayTime(selected.end_time)}</Text></View>
          </View>
          <View style={styles.modalStatusRow}><Text style={styles.detailLabel}>BOOKING STATUS</Text><View style={[styles.statusPill, { backgroundColor: statusTone(selected.status).bg }]}><Text style={[styles.statusText, { color: statusTone(selected.status).text }]}>{selected.status || 'Pending'}</Text></View></View>
          {selectedCheckInfo?.canCheckIn ? (
            <Pressable
              disabled={busyId === selected.id}
              onPress={() => {
                const item = selected;
                setSelected(null);
                handleCheckIn(item);
              }}
              style={styles.modalCheckIn}
            >
              <Ionicons name="checkmark-done" size={16} color={C.white} />
              <Text style={styles.modalCheckInText}>Check In Now</Text>
            </Pressable>
          ) : selectedCheckInfo?.isPendingWindow ? (
            <View style={styles.modalPendingWindow}>
              <Ionicons name="time-outline" size={15} color={C.amber} />
              <Text style={styles.modalPendingWindowText}>{selectedCheckInfo.message}</Text>
            </View>
          ) : null}
          {canCancel(selected) && <Pressable onPress={() => cancel(selected)} style={styles.modalCancel}><Text style={styles.modalCancelText}>Cancel reservation</Text></Pressable>}
          <Pressable onPress={() => setSelected(null)} style={styles.doneButton}><Text style={styles.doneText}>Done</Text></Pressable>
        </View>
      </View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  headerButton: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { alignItems: 'center' },
  title: { color: C.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  activeCount: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  activeCountText: { color: C.dark, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.emerald },
  searchWrap: { minHeight: 48, marginHorizontal: 20, marginBottom: 10, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 14 },
  searchInput: { flex: 1, color: C.text, fontSize: 13, paddingVertical: 10 },
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginTop: 8, marginBottom: 8, padding: 4, borderRadius: 14, backgroundColor: '#E9EFF0', borderWidth: 1, borderColor: C.border },
  tab: { flex: 1, minHeight: 40, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  tabActive: { backgroundColor: C.teal },
  tabText: { color: C.muted, fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: C.white },
  countBadge: { overflow: 'hidden', color: C.dark, backgroundColor: '#D7ECE8', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, fontSize: 9, fontWeight: '800' },
  countBadgeActive: { color: C.teal, backgroundColor: C.white },
  list: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32, flexGrow: 1 },
  card: { backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 15, marginBottom: 13 },
  cardPressed: { borderColor: C.teal, backgroundColor: '#F8FCFC' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  seatBadge: { width: 49, height: 49, borderRadius: 15, borderWidth: 1, borderColor: '#BDE4DD', backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' },
  seatEyebrow: { color: C.muted, fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  seatNumber: { color: C.teal, fontSize: 16, fontWeight: '900', marginTop: 1 },
  cardHeading: { flex: 1 },
  roomName: { color: C.text, fontSize: 13, fontWeight: '800' },
  metaLine: { color: C.muted, fontSize: 10, marginTop: 5 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 9, fontWeight: '800', textTransform: 'capitalize' },
  dateStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 11, paddingVertical: 10, backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  dateTextWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  dateText: { color: C.text, fontSize: 10, fontWeight: '600', flexShrink: 1 },
  activeLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  activeLabelText: { color: C.emerald, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  expiredText: { color: C.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: C.border },
  passButton: { flex: 1, minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, borderWidth: 1, borderColor: '#CFE5E3', backgroundColor: '#F7FBFA' },
  passButtonText: { color: C.dark, fontSize: 10, fontWeight: '700' },
  checkInButton: { minWidth: 92, minHeight: 38, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 12, backgroundColor: C.emerald },
  checkInButtonText: { color: C.white, fontSize: 10, fontWeight: '800' },
  pendingWindowBadge: { flex: 1, minHeight: 38, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 12, backgroundColor: C.amberBg, borderWidth: 1, borderColor: '#FCE0A6' },
  pendingWindowText: { color: C.amber, fontSize: 10, fontWeight: '700' },
  modalPendingWindow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 13, backgroundColor: C.amberBg, borderWidth: 1, borderColor: '#FCE0A6', marginBottom: 9 },
  modalPendingWindowText: { color: C.amber, fontSize: 11, fontWeight: '700' },
  cancelButton: { minWidth: 86, minHeight: 38, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 12, borderWidth: 1, borderColor: '#F0C7C9', backgroundColor: '#FFF9F9' },
  cancelText: { color: C.rose, fontSize: 10, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  helper: { color: C.muted, textAlign: 'center', fontSize: 12, marginTop: 9, lineHeight: 18 },
  error: { color: '#A52B32', textAlign: 'center', fontSize: 13, marginTop: 12 },
  retry: { marginTop: 16, backgroundColor: C.teal, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: C.white, fontSize: 12, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 70 },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.pale, borderWidth: 1, borderColor: '#BDE4DD' },
  emptyTitle: { color: C.text, fontSize: 16, fontWeight: '800', marginTop: 16 },
  modalOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10, justifyContent: 'flex-end', backgroundColor: 'rgba(24,50,59,0.35)' },
  detailSheet: { paddingHorizontal: 22, paddingTop: 11, paddingBottom: 28, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  sheetHandle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 3, backgroundColor: '#CBD6D8', marginBottom: 18 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: C.border },
  sheetIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' },
  sheetEyebrow: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  sheetId: { color: C.teal, fontSize: 11, fontWeight: '700', marginTop: 3 },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  detailHero: { alignItems: 'center', paddingVertical: 20, marginTop: 15, borderRadius: 16, backgroundColor: C.pale, borderWidth: 1, borderColor: '#CFE5E3' },
  detailLabel: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  detailSeat: { color: C.teal, fontSize: 24, fontWeight: '900', marginTop: 6 },
  detailRoom: { color: C.text, fontSize: 12, marginTop: 4 },
  detailGrid: { flexDirection: 'row', gap: 9, marginTop: 10 },
  detailCell: { flex: 1, padding: 12, borderRadius: 14, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  detailValue: { color: C.text, fontSize: 11, fontWeight: '700', marginTop: 8 },
  modalStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  modalCheckIn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 13, backgroundColor: C.emerald, marginBottom: 9 },
  modalCheckInText: { color: C.white, fontSize: 12, fontWeight: '800' },
  modalCancel: { alignItems: 'center', paddingVertical: 12, borderRadius: 13, borderWidth: 1, borderColor: '#F0C7C9', backgroundColor: '#FFF9F9', marginBottom: 9 },
  modalCancelText: { color: C.rose, fontSize: 12, fontWeight: '800' },
  doneButton: { alignItems: 'center', paddingVertical: 13, borderRadius: 13, backgroundColor: C.teal },
  doneText: { color: C.white, fontSize: 12, fontWeight: '900' },
});
