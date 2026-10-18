import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius } from '../../theme/theme';
import { fetchAdminSeatData, blockSeat, updateSeatReservationStatus, TIME_SLOTS } from '../../services/seatReservationService';
import { supabase } from '../../supabase/supabaseClient';
import { uniqueChannelName } from '../../supabase/realtimeUtil';
import LogoutConfirmModal from '../../components/LogoutConfirmModal';
import { signOutAccount } from '../../supabase/authService';

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(dateStr) {
  const parts = dateStr.split('-');
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const todayStr = formatDateKey(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDateKey(tomorrow);

  if (dateStr === todayStr) {
    return `Today (${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`;
  }
  if (dateStr === tomorrowStr) {
    return `Tomorrow (${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`;
  }
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SeatAllocationScreen({ navigation, route }) {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  
  const initialDate = route?.params?.date || formatDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedSlot, setSelectedSlot] = useState(() => {
    if (route?.params?.slotId) {
      return TIME_SLOTS.find(s => s.id === route.params.slotId) || TIME_SLOTS[0];
    }
    return TIME_SLOTS[3] || TIME_SLOTS[0]; // Default to 02:00 - 04:00 PM if available
  });

  const quickDates = React.useMemo(() => {
    const list = [];
    const base = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const key = formatDateKey(d);
      let label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (i === 0) label = `Today (${d.getDate()} ${d.toLocaleDateString(undefined, { month: 'short' })})`;
      else if (i === 1) label = `Tomorrow (${d.getDate()} ${d.toLocaleDateString(undefined, { month: 'short' })})`;
      else label = `${d.toLocaleDateString(undefined, { weekday: 'short' })}, ${d.getDate()} ${d.toLocaleDateString(undefined, { month: 'short' })}`;
      list.push({ key, label });
    }
    return list;
  }, []);

  const changeDateBy = (offset) => {
    const parts = selectedDate.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    d.setDate(d.getDate() + offset);
    setSelectedDate(formatDateKey(d));
  };

  useEffect(() => {
    if (route?.params?.date) {
      setSelectedDate(route.params.date);
    }
    if (route?.params?.slotId) {
      const match = TIME_SLOTS.find(s => s.id === route.params.slotId);
      if (match) setSelectedSlot(match);
    }
  }, [route?.params?.date, route?.params?.slotId]);

  const loadSeats = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await fetchAdminSeatData(selectedDate, selectedSlot);
      setSeats(data);
      setSelectedSeat((current) => {
        if (!current) return null;
        return data.find(s => s.id === current.id) ?? current;
      });
    } catch (e) {
      console.warn(e);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [selectedDate, selectedSlot]);

  useFocusEffect(
    useCallback(() => {
      loadSeats(false);
    }, [loadSeats])
  );

  useEffect(() => {
    loadSeats(true);
    
    // Subscribe to realtime updates on seat_reservations
    const channel = supabase
      .channel(uniqueChannelName(`admin_seat_${selectedDate}_${selectedSlot.id}`))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seat_reservations' }, () => {
        loadSeats(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seats' }, () => {
        loadSeats(false);
      })
      .subscribe();

    const interval = setInterval(() => {
      loadSeats(false);
    }, 5000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [selectedDate, selectedSlot]);

  async function handleBlock(seat) {
    try {
      await blockSeat(seat.id, !seat.is_blocked);
      await loadSeats(false);
    } catch (e) {
      console.warn(e);
    }
  }

  async function handleCancelRes(resId) {
    try {
      await updateSeatReservationStatus(resId, 'cancelled');
      await loadSeats(false);
    } catch (e) {
      console.warn(e);
    }
  }

  // Calculate Stats
  let freeCount = 0;
  let occupiedCount = 0;
  let reservedCount = 0;
  let noShowCount = 0;
  let blockedCount = 0;

  seats.forEach(s => {
    if (s.is_blocked) {
      blockedCount++;
    } else if (s.reservation) {
      if (s.reservation.status === 'checked_in' || s.reservation.status === 'completed') occupiedCount++;
      else if (s.reservation.status === 'no_show') noShowCount++;
      else if (s.reservation.status === 'reserved') reservedCount++;
      else freeCount++; // cancelled
    } else {
      freeCount++;
    }
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top Header */}
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Ionicons name="book" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.staffPortalText}>STAFF PORTAL</Text>
            <Text style={styles.dashboardTitle}>Dashboard</Text>
          </View>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => loadSeats()} style={styles.iconMargin}>
            <Ionicons name="refresh-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <Ionicons name="search" size={20} color={colors.text} style={styles.iconMargin} />
          <TouchableOpacity 
            style={styles.profileAvatar}
            onPress={() => navigation?.navigate('StaffProfile')}
            accessibilityRole="button"
            accessibilityLabel="Staff profile"
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="person" size={14} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSeats} colors={[colors.primary]} />}
      >
        
        {/* Title */}
        <Text style={styles.pageTitle}>Seat Allocation Settings</Text>
        <Text style={styles.pageSubtitle}>Real-time carrel occupancy rules and zone layout</Text>

        {/* Date Selector */}
        <View style={styles.dateSelectorContainer}>
          <View style={styles.dateHeaderRow}>
            <TouchableOpacity onPress={() => changeDateBy(-1)} style={styles.dateNavBtn}>
              <Ionicons name="chevron-back" size={16} color={colors.primary} />
            </TouchableOpacity>
            <View style={styles.dateDisplayWrap}>
              <Ionicons name="calendar" size={16} color={colors.primary} style={{marginRight: 6}} />
              <Text style={styles.dateDisplayText}>{formatDisplayDate(selectedDate)}</Text>
            </View>
            <TouchableOpacity onPress={() => changeDateBy(1)} style={styles.dateNavBtn}>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickDateScroll}>
            {quickDates.map(qd => (
              <TouchableOpacity
                key={qd.key}
                style={[styles.dateChip, selectedDate === qd.key && styles.dateChipActive]}
                onPress={() => setSelectedDate(qd.key)}
              >
                <Text style={[styles.dateChipText, selectedDate === qd.key && styles.dateChipTextActive]}>{qd.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Slot Picker */}
        <View style={{marginBottom: spacing.lg}}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
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

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { borderTopColor: '#009688' }]}>
            <View style={styles.statBoxHeader}>
              <Ionicons name="checkmark-circle-outline" size={12} color="#009688" />
              <Text style={[styles.statBoxTitle, { color: '#009688' }]}>FREE</Text>
            </View>
            <Text style={[styles.statBoxNumber, { color: '#009688' }]}>{freeCount}</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: '#1F2937' }]}>
            <View style={styles.statBoxHeader}>
              <Ionicons name="person" size={12} color="#1F2937" />
              <Text style={[styles.statBoxTitle, { color: '#1F2937' }]}>OCCUPIED</Text>
            </View>
            <Text style={[styles.statBoxNumber, { color: '#1F2937' }]}>{occupiedCount}</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: '#E11D48' }]}>
            <View style={styles.statBoxHeader}>
              <Ionicons name="time-outline" size={12} color="#E11D48" />
              <Text style={[styles.statBoxTitle, { color: '#E11D48' }]}>NO SHOW / IDLE</Text>
            </View>
            <Text style={[styles.statBoxNumber, { color: '#E11D48' }]}>{noShowCount}</Text>
          </View>
        </View>

        {/* Legends */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#009688' }]} /><Text style={styles.legendText}>Free ({freeCount})</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#1E403F' }]} /><Text style={styles.legendText}>Occupied ({occupiedCount})</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#06B6D4' }]} /><Text style={styles.legendText}>Reserved ({reservedCount})</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#E11D48' }]} /><Text style={styles.legendText}>No-Show ({noShowCount})</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#9CA3AF' }]} /><Text style={styles.legendText}>Blocked ({blockedCount})</Text></View>
        </View>

        {/* Grid */}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{marginVertical: 40}} />
        ) : (
          <View style={styles.seatGrid}>
            {seats.map(seat => {
              let seatStyle = styles.seatFree;
              let seatTextStyle = styles.seatFreeText;
              let icon = <Ionicons name="ellipse-outline" size={14} color="#009688" />;
              
              if (seat.is_blocked) {
                seatStyle = { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#9CA3AF', justifyContent: 'center', alignItems: 'center', width: 56, height: 64, borderRadius: 12 };
                seatTextStyle = { fontSize: 12, fontWeight: '700', color: '#9CA3AF', marginBottom: 4 };
                icon = <Ionicons name="lock-closed" size={12} color="#9CA3AF" />;
              } else if (seat.reservation) {
                if (seat.reservation.status === 'no_show') {
                   seatStyle = { backgroundColor: '#FCE7F3', borderWidth: 1, borderColor: '#E11D48', justifyContent: 'center', alignItems: 'center', width: 56, height: 64, borderRadius: 12 };
                   seatTextStyle = { fontSize: 12, fontWeight: '700', color: '#E11D48', marginBottom: 4 };
                   icon = <Ionicons name="time-outline" size={12} color="#E11D48" />;
                } else if (seat.reservation.status === 'reserved') {
                   seatStyle = { backgroundColor: '#E0F2FE', borderWidth: 1, borderColor: '#0284C7', justifyContent: 'center', alignItems: 'center', width: 56, height: 64, borderRadius: 12 };
                   seatTextStyle = { fontSize: 12, fontWeight: '700', color: '#0284C7', marginBottom: 4 };
                   icon = <Ionicons name="bookmark" size={12} color="#0284C7" />;
                } else if (seat.reservation.status === 'checked_in') {
                   seatStyle = styles.seatOccupied;
                   seatTextStyle = styles.seatOccupiedText;
                   icon = <Ionicons name="person" size={12} color={colors.white} />;
                }
              }

              return (
                <TouchableOpacity key={seat.id} style={seatStyle} onPress={() => setSelectedSeat(seat)}>
                  <Text style={seatTextStyle}>{seat.seat_number.replace('Carrel ', '')}</Text>
                  {icon}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Detail Card */}
        {selectedSeat && (
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <View style={styles.detailIconBox}>
                <MaterialCommunityIcons name="table-chair" size={24} color="#009688" />
              </View>
              <View style={styles.detailHeaderInfo}>
                <View style={{flexDirection:'row', alignItems:'center'}}>
                  <Text style={styles.detailCarrelName}>Carrel {selectedSeat.seat_number}</Text>
                  <View style={styles.quietZoneBadge}><Text style={styles.quietZoneText}>{selectedSeat.zone || 'General'}</Text></View>
                </View>
                <Text style={styles.detailPatronName}>
                  {selectedSeat.is_blocked 
                    ? 'Blocked by Staff' 
                    : selectedSeat.reservation?.profiles
                      ? `Patron: ${selectedSeat.reservation.profiles.full_name} (${selectedSeat.reservation.profiles.student_id})`
                      : 'Free / Unassigned'}
                </Text>
              </View>
              
              {(() => {
                const getDetailStatus = () => {
                  if (selectedSeat.is_blocked) return { bg: '#F3F4F6', color: '#9CA3AF', label: 'Blocked' };
                  const res = selectedSeat.reservation;
                  if (!res || res.status === 'cancelled') return { bg: '#EFFFFE', color: '#009688', label: 'Free' };
                  if (res.status === 'checked_in') return { bg: '#E6F4EA', color: '#1E403F', label: 'Occupied' };
                  if (res.status === 'reserved') return { bg: '#E0F2FE', color: '#0284C7', label: 'Reserved' };
                  if (res.status === 'no_show') return { bg: '#FCE7F3', color: '#E11D48', label: 'No-Show' };
                  return { bg: '#F3F4F6', color: '#6B7280', label: res.status.toUpperCase() };
                };
                const st = getDetailStatus();
                return (
                  <View style={[styles.detailStatusBox, { backgroundColor: st.bg }]}>
                    <View style={[styles.detailStatusDot, { backgroundColor: st.color }]} />
                    <Text style={[styles.detailStatusText, { color: st.color }]}>
                      {st.label}
                    </Text>
                  </View>
                );
              })()}
            </View>

            <View style={styles.detailActionRow}>
              <TouchableOpacity 
                style={[styles.detailBtnSecondary, selectedSeat.is_blocked && {borderColor: '#009688', backgroundColor: '#EFFFFE'}]}
                onPress={() => handleBlock(selectedSeat)}
              >
                <Ionicons name={selectedSeat.is_blocked ? "lock-open-outline" : "lock-closed-outline"} size={16} color="#009688" style={{marginRight: 6}} />
                <Text style={styles.detailBtnSecondaryText}>{selectedSeat.is_blocked ? 'Unblock Seat' : 'Block Seat'}</Text>
              </TouchableOpacity>
              
              {selectedSeat.reservation && selectedSeat.reservation.status !== 'cancelled' ? (
                <TouchableOpacity 
                  style={styles.detailBtnPrimary}
                  onPress={() => handleCancelRes(selectedSeat.reservation.id)}
                >
                  <Ionicons name="close-circle-outline" size={16} color={colors.white} style={{marginRight: 6}} />
                  <Text style={styles.detailBtnPrimaryText}>Cancel Reservation</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.detailBtnPrimary, {backgroundColor: '#4F46E5'}]}
                  disabled={selectedSeat.is_blocked}
                  onPress={() => alert('Manual walk-in assignment requires student ID scanning.')}
                >
                  <Ionicons name="person-add-outline" size={16} color={colors.white} style={{marginRight: 6}} />
                  <Text style={styles.detailBtnPrimaryText}>Assign Walk-In</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

      </ScrollView>

      <LogoutConfirmModal
        visible={logoutModalVisible}
        title="Staff Sign Out"
        message="Are you sure you want to sign out of the staff administration portal?"
        onCancel={() => setLogoutModalVisible(false)}
        onConfirm={signOutAccount}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  
  /* Header */
  headerTop: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
    backgroundColor: colors.white
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoContainer: { 
    width: 36, height: 36, borderRadius: radius.sm, 
    backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', 
    marginRight: spacing.sm 
  },
  staffPortalText: { fontSize: 10, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5 },
  dashboardTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconMargin: { marginRight: spacing.md, cursor: 'pointer' },
  profileAvatar: { 
    width: 28, height: 28, borderRadius: 14, 
    backgroundColor: '#009688', justifyContent: 'center', alignItems: 'center',
    cursor: 'pointer',
  },

  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, paddingTop: spacing.md },

  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  dateSelectorContainer: {
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplayWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateDisplayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  quickDateScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  dateChipTextActive: {
    color: colors.white,
  },

  slotChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#E5E7EB', borderWidth: 1, borderColor: 'transparent' },
  slotChipActive: { backgroundColor: '#E0F2FE', borderColor: colors.primary },
  slotText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  slotTextActive: { color: colors.primary, fontWeight: '700' },

  /* Stats Row */
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  statBox: { flex: 1, backgroundColor: colors.white, borderRadius: radius.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderTopWidth: 3, marginRight: spacing.sm },
  statBoxHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statBoxTitle: { fontSize: 10, fontWeight: '700', marginLeft: 4, letterSpacing: 0.5 },
  statBoxNumber: { fontSize: 24, fontWeight: '700', color: '#1F2937', textAlign: 'center' },

  /* Legends */
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  legendDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  legendText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },

  /* Grid */
  seatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center', marginBottom: spacing.xl },
  seatBox: { width: 56, height: 64, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  
  seatFree: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#009688', justifyContent: 'center', alignItems: 'center', width: 56, height: 64, borderRadius: 12 },
  seatFreeText: { fontSize: 12, fontWeight: '700', color: '#009688', marginBottom: 4 },
  
  seatOccupied: { backgroundColor: '#1E403F', justifyContent: 'center', alignItems: 'center', width: 56, height: 64, borderRadius: 12 },
  seatOccupiedText: { fontSize: 12, fontWeight: '700', color: colors.white, marginBottom: 4 },

  /* Detail Card */
  detailCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  detailHeader: { flexDirection: 'row', marginBottom: spacing.lg },
  detailIconBox: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: '#EFFFFE', justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  detailHeaderInfo: { flex: 1, justifyContent: 'center' },
  detailCarrelName: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginRight: 8 },
  quietZoneBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  quietZoneText: { fontSize: 9, fontWeight: '700', color: '#4B5563' },
  detailPatronName: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  
  detailStatusBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  detailStatusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  detailStatusText: { fontSize: 10, fontWeight: '700' },

  detailActionRow: { flexDirection: 'row', gap: spacing.sm },
  detailBtnSecondary: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: '#009688', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm },
  detailBtnSecondaryText: { fontSize: 13, fontWeight: '700', color: '#009688' },
  detailBtnPrimary: { flex: 1, backgroundColor: '#DC2626', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm },
  detailBtnPrimaryText: { fontSize: 13, fontWeight: '700', color: colors.white },
});
