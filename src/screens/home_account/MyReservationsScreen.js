import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { supabase } from '../../supabase/supabaseClient';
import { cancelReservation } from './accountService';
import { updateSeatReservationStatus } from '../../services/seatReservationService';

export default function MyReservationsScreen({ navigation }) {
  const [userId, setUserId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        fetchAll(user.id);
      }
    });
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchAll(uid) {
    setLoading(true);
    try {
      // 1. Book reservations
      const { data: bookRes } = await supabase
        .from('reservations')
        .select('*')
        .eq('user_id', uid)
        .eq('type', 'book')
        .order('created_at', { ascending: false });

      // Fetch book details manually because ref_id is a generic UUID without a strict FK to books
      const bookIds = (bookRes || []).map(r => r.ref_id);
      const { data: bookDetails } = await supabase
        .from('books')
        .select('id, title, author')
        .in('id', bookIds);

      const bookMap = {};
      (bookDetails || []).forEach(b => { bookMap[b.id] = b; });

      // 2. Seat reservations
      const { data: seatRes } = await supabase
        .from('seat_reservations')
        .select('*, seats(seat_number, zone)')
        .eq('student_id', uid)
        .order('reservation_date', { ascending: false })
        .order('start_time', { ascending: false });

      const books = (bookRes || []).map(r => ({
        id: r.id,
        kind: 'book',
        title: bookMap[r.ref_id]?.title || 'Unknown Book',
        subtitle: bookMap[r.ref_id]?.author || '',
        status: r.status,
        date: new Date(r.created_at).toLocaleDateString(),
        dueDate: r.due_date ? new Date(r.due_date).toLocaleDateString() : null,
        raw: r,
      }));

      const seats = (seatRes || []).map(r => ({
        id: r.id,
        kind: 'seat',
        title: `Carrel ${r.seats?.seat_number || '?'}`,
        subtitle: `${r.seats?.zone || 'General'} · ${r.reservation_date} · ${r.start_time?.substring(0,5)} – ${r.end_time?.substring(0,5)}`,
        status: r.status,
        date: r.reservation_date,
        startTime: r.start_time,
        endTime: r.end_time,
        raw: r,
      }));

      setItems([...books, ...seats]);
    } catch (e) {
      console.warn('fetchAll error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelBook(id) {
    try {
      await cancelReservation(id);
      if (userId) fetchAll(userId);
    } catch (e) {
      console.warn(e);
    }
  }

  async function handleSeatAction(id, status) {
    try {
      await updateSeatReservationStatus(id, status);
      if (userId) fetchAll(userId);
    } catch (e) {
      console.warn(e);
    }
  }

  const ACTIVE_STATUSES = ['confirmed', 'reserved', 'checked_in'];
  const filtered = items.filter(item =>
    tab === 'active'
      ? ACTIVE_STATUSES.includes(item.status)
      : !ACTIVE_STATUSES.includes(item.status)
  );

  const STATUS_COLOR = {
    confirmed: '#059669', reserved: '#0284C7', checked_in: '#059669',
    collected: '#6B7280', cancelled: '#9CA3AF', expired: '#D97706', no_show: '#E11D48', completed: '#4F46E5'
  };
  const STATUS_LABEL = {
    confirmed: 'Active Hold', reserved: 'Reserved', checked_in: 'Checked In',
    collected: 'Collected', cancelled: 'Cancelled', expired: 'Expired', no_show: 'No-Show', completed: 'Completed'
  };

  const renderItem = ({ item }) => {
    const statusColor = STATUS_COLOR[item.status] || '#6B7280';
    const statusLabel = STATUS_LABEL[item.status] || item.status;

    // Seat time-gating
    let canCheckIn = false;
    let canCancelSeat = false;
    if (item.kind === 'seat' && item.status === 'reserved') {
      const start = new Date(`${item.date}T${item.startTime}`);
      const deadline = new Date(start);
      deadline.setMinutes(deadline.getMinutes() + 15);
      canCheckIn = now >= start && now <= deadline;
      canCancelSeat = now < start;
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={[styles.iconBox, { backgroundColor: statusColor + '18' }]}>
            {item.kind === 'seat'
              ? <MaterialCommunityIcons name="table-chair" size={22} color={statusColor} />
              : <Ionicons name="book-outline" size={22} color={statusColor} />
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.subtitle ? <Text style={styles.cardSub}>{item.subtitle}</Text> : null}
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor + '18' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Book actions */}
        {item.kind === 'book' && item.status === 'confirmed' && (
          <View style={styles.actionRow}>
            {item.dueDate ? <Text style={styles.dueText}>Due: {item.dueDate}</Text> : null}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelBook(item.id)}>
              <Text style={styles.cancelBtnText}>Cancel Hold</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Seat actions */}
        {item.kind === 'seat' && item.status === 'reserved' && (
          <View style={styles.actionRow}>
            {canCancelSeat && (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => handleSeatAction(item.id, 'cancelled')}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
            {canCheckIn && (
              <TouchableOpacity style={styles.checkInBtn} onPress={() => handleSeatAction(item.id, 'checked_in')}>
                <Text style={styles.checkInBtnText}>Check In Now</Text>
              </TouchableOpacity>
            )}
            {!canCancelSeat && !canCheckIn && (
              <Text style={{ color: '#E11D48', fontSize: 12 }}>Check-in window expired</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Reservations</Text>
        <TouchableOpacity onPress={() => userId && fetchAll(userId)}>
          <Ionicons name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'active' && styles.tabBtnActive]} onPress={() => setTab('active')}>
          <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'past' && styles.tabBtnActive]} onPress={() => setTab('past')}>
          <Text style={[styles.tabText, tab === 'past' && styles.tabTextActive]}>Past</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={filtered}
          keyExtractor={item => `${item.kind}-${item.id}`}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={48} color={colors.border} />
              <Text style={styles.emptyText}>No {tab} reservations.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { ...typography.h1 },
  tabRow: { flexDirection: 'row', margin: spacing.lg, backgroundColor: '#F3F4F6', borderRadius: radius.md, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.sm },
  tabBtnActive: { backgroundColor: colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontWeight: '600', color: colors.textMuted, fontSize: 14 },
  tabTextActive: { color: colors.primary },
  list: { padding: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  dueText: { flex: 1, fontSize: 12, color: colors.textMuted },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: '#EF4444' },
  cancelBtnText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },
  checkInBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.primary },
  checkInBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyBox: { alignItems: 'center', marginTop: 60, gap: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: 15 },
});