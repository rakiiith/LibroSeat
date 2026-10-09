import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../theme/theme';
import { supabase } from '../../supabase/supabaseClient';
import { getRichReservations, releaseReservation } from '../../services/reservationService';

export default function SeatAllocationScreen() {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoReleaseEnabled, setAutoReleaseEnabled] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [activeReservations, setActiveReservations] = useState({});

  useEffect(() => {
    fetchSeats();
  }, []);

  async function fetchSeats() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('seats').select('*').order('seat_number');
      if (data && !error) {
        setSeats(data);
      }
      
      const allRes = await getRichReservations();
      const activeSeatRes = allRes.filter(r => r.type === 'seat' && (r.status === 'pending' || r.status === 'active' || r.status === 'unattended'));
      
      const resMap = {};
      activeSeatRes.forEach(r => {
        resMap[r.ref_id] = r;
      });
      setActiveReservations(resMap);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }

  const freeCount = seats.filter(s => s.is_available).length;
  
  let occupiedCount = 0;
  let reservedCount = 0;
  let unattendedCount = 0;

  seats.forEach(s => {
    if (!s.is_available) {
      const res = activeReservations[s.id];
      if (res) {
        if (res.status === 'unattended') unattendedCount++;
        else if (res.status === 'pending') reservedCount++;
        else occupiedCount++;
      } else {
        occupiedCount++;
      }
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
          <Ionicons name="search" size={20} color={colors.text} style={styles.iconMargin} />
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={14} color={colors.white} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Node Pill */}
        <View style={styles.nodePillRow}>
          <View style={styles.nodePill}>
            <View style={styles.nodePillDot} />
            <Text style={styles.nodePillText}>STAFF NODE • ZONE A</Text>
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="options" size={16} color="#4B5563" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.pageTitle}>Seat Allocation Settings</Text>
        <Text style={styles.pageSubtitle}>Real-time carrel occupancy rules and zone layout</Text>

        {/* Settings Card */}
        <View style={styles.settingsCard}>
          <View style={styles.settingsHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={styles.settingIconBox}>
                <Ionicons name="time-outline" size={18} color="#009688" />
              </View>
              <View>
                <Text style={styles.settingTitle}>Auto-Release Idle Seats</Text>
                <Text style={styles.settingSub}>Automated grace and buffer checks</Text>
              </View>
            </View>
            <Switch
              value={autoReleaseEnabled}
              onValueChange={setAutoReleaseEnabled}
              trackColor={{ false: '#D1D5DB', true: '#009688' }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Ionicons name="timer-outline" size={14} color="#009688" style={{marginRight: 8}} />
              <Text style={styles.settingRowLabel}>Release buffer threshold</Text>
            </View>
            <View style={styles.settingSpinner}>
              <Text style={styles.settingSpinnerText}>30 min</Text>
              <Ionicons name="chevron-expand" size={14} color="#6B7280" />
            </View>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Ionicons name="stopwatch-outline" size={14} color="#009688" style={{marginRight: 8}} />
              <Text style={styles.settingRowLabel}>Check-in grace period</Text>
            </View>
            <View style={styles.settingSpinner}>
              <Text style={styles.settingSpinnerText}>15 min</Text>
              <Ionicons name="chevron-expand" size={14} color="#6B7280" />
            </View>
          </View>

          <View style={styles.alertBanner}>
            <Ionicons name="notifications-outline" size={14} color="#009688" style={{marginRight: 8}} />
            <Text style={styles.alertBannerText}>
              Automated alert dispatched via SMS/Email 5m prior to revocation.
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { borderTopColor: '#009688' }]}>
            <View style={styles.statBoxHeader}>
              <Ionicons name="checkmark-circle-outline" size={12} color="#009688" />
              <Text style={[styles.statBoxTitle, { color: '#009688' }]}>FREE</Text>
            </View>
            <Text style={styles.statBoxNumber}>{freeCount}</Text>
          </View>

          <View style={[styles.statBox, { borderTopColor: '#1F2937' }]}>
            <View style={styles.statBoxHeader}>
              <Ionicons name="person" size={12} color="#1F2937" />
              <Text style={[styles.statBoxTitle, { color: '#1F2937' }]}>OCCUPIED</Text>
            </View>
            <Text style={styles.statBoxNumber}>{occupiedCount}</Text>
          </View>

          <View style={[styles.statBox, { borderTopColor: '#E11D48' }]}>
            <View style={styles.statBoxHeader}>
              <Ionicons name="time-outline" size={12} color="#E11D48" />
              <Text style={[styles.statBoxTitle, { color: '#E11D48' }]}>IDLE / UNATTENDED</Text>
            </View>
            <Text style={[styles.statBoxNumber, { color: '#E11D48' }]}>{unattendedCount}</Text>
          </View>
        </View>

        {/* Grid Title */}
        <View style={styles.gridTitleRow}>
          <Text style={styles.gridTitleMain}>Reading Room • Level 2 Grid</Text>
          <Text style={styles.gridTitleSub}>Zone A (Carrels)</Text>
        </View>

        {/* Legends */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#009688' }]} />
            <Text style={styles.legendText}>Free ({freeCount})</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#1F2937' }]} />
            <Text style={styles.legendText}>Occupied ({occupiedCount})</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#E11D48' }]} />
            <Text style={[styles.legendText, { color: '#E11D48' }]}>Unattended ({unattendedCount})</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#06B6D4' }]} />
            <Text style={[styles.legendText, { color: '#06B6D4' }]}>Reserved ({reservedCount})</Text>
          </View>
        </View>

        {/* Seat Grid */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : (
          <View style={styles.seatGrid}>
            {seats.map((seat) => {
              const isSelected = selectedSeat?.id === seat.id;
              
              // Map db data to mockup styles based on availability
              let seatStyle = styles.seatFree;
              let seatTextStyle = styles.seatFreeText;
              let icon = <Ionicons name="ellipse-outline" size={14} color="#009688" />;
              
              if (!seat.is_available) {
                const res = activeReservations[seat.id];
                if (res?.status === 'unattended') {
                   seatStyle = { backgroundColor: '#FCE7F3', borderWidth: 1, borderColor: '#E11D48' };
                   seatTextStyle = { fontSize: 12, fontWeight: '700', color: '#E11D48', marginBottom: 4 };
                   icon = <Ionicons name="time-outline" size={12} color="#E11D48" />;
                } else if (res?.status === 'pending') {
                   seatStyle = { backgroundColor: '#E0F2FE', borderWidth: 1, borderColor: '#0284C7' };
                   seatTextStyle = { fontSize: 12, fontWeight: '700', color: '#0284C7', marginBottom: 4 };
                   icon = <Ionicons name="bookmark" size={12} color="#0284C7" />;
                } else {
                   seatStyle = styles.seatOccupied;
                   seatTextStyle = styles.seatOccupiedText;
                   icon = <Ionicons name="person" size={12} color={colors.white} />;
                }
              }

              return (
                <TouchableOpacity 
                  key={seat.id} 
                  style={[styles.seatBox, seatStyle, isSelected && { borderWidth: 2, borderColor: '#000' }]}
                  onPress={() => setSelectedSeat(seat)}
                >
                  <Text style={seatTextStyle}>{seat.seat_number}</Text>
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
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Text style={styles.detailCarrelName}>Carrel {selectedSeat.seat_number}</Text>
                  <View style={styles.quietZoneBadge}>
                    <Text style={styles.quietZoneText}>Quiet Zone</Text>
                  </View>
                </View>
                <Text style={styles.detailPatronName}>
                  {selectedSeat.is_available 
                    ? 'No Patron Assigned' 
                    : activeReservations[selectedSeat.id] 
                      ? `Patron: ${activeReservations[selectedSeat.id].profile?.full_name} (${activeReservations[selectedSeat.id].profile?.student_id || 'N/A'})`
                      : 'Occupied by unknown'}
                </Text>
              </View>
              
              <View style={[styles.detailStatusBox, { backgroundColor: selectedSeat.is_available ? '#EFFFFE' : (activeReservations[selectedSeat.id]?.status === 'unattended' ? '#FCE7F3' : '#F3F4F6') }]}>
                <View style={[styles.detailStatusDot, { backgroundColor: selectedSeat.is_available ? '#009688' : (activeReservations[selectedSeat.id]?.status === 'unattended' ? '#E11D48' : '#374151') }]} />
                <Text style={[styles.detailStatusText, { color: selectedSeat.is_available ? '#009688' : (activeReservations[selectedSeat.id]?.status === 'unattended' ? '#E11D48' : '#374151') }]}>
                  {selectedSeat.is_available ? 'Free' : (activeReservations[selectedSeat.id]?.status === 'unattended' ? 'Unattended' : (activeReservations[selectedSeat.id]?.status === 'pending' ? 'Reserved' : 'Occupied'))}
                </Text>
              </View>
            </View>

            <View style={styles.detailTimeRow}>
              <View style={styles.detailTimeBoxLeft}>
                <Text style={styles.detailTimeLabel}>BOOKED AT</Text>
                <Text style={styles.detailTimeValue}>
                  {selectedSeat.is_available ? '--' : (activeReservations[selectedSeat.id] ? new Date(activeReservations[selectedSeat.id].created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Unknown')}
                </Text>
              </View>
              <View style={styles.detailTimeBoxRight}>
                <Text style={styles.detailAutoLabel}>AUTO-RELEASE CLOCK</Text>
                <Text style={styles.detailAutoValue}>
                  {selectedSeat.is_available ? '--' : (activeReservations[selectedSeat.id]?.status === 'pending' ? 'T - 15m\ngrace period' : '--')}
                </Text>
              </View>
            </View>

            <View style={styles.detailActionRow}>
              <TouchableOpacity style={styles.detailBtnSecondary} disabled={selectedSeat.is_available}>
                <Ionicons name="notifications-outline" size={16} color={selectedSeat.is_available ? "#9CA3AF" : "#009688"} style={{marginRight: 6}} />
                <Text style={[styles.detailBtnSecondaryText, selectedSeat.is_available && {color: "#9CA3AF"}]}>Ping Patron</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.detailBtnPrimary, selectedSeat.is_available && {backgroundColor: "#F87171"}]}
                disabled={selectedSeat.is_available}
                onPress={async () => {
                  if (activeReservations[selectedSeat.id]) {
                    setLoading(true);
                    await releaseReservation(activeReservations[selectedSeat.id].id, 'seat', selectedSeat.id);
                    await fetchSeats();
                    setSelectedSeat(null);
                  }
                }}
              >
                <Ionicons name="log-out-outline" size={16} color={colors.white} style={{marginRight: 6}} />
                <Text style={styles.detailBtnPrimaryText}>Release Carrel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>
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
  iconMargin: { marginRight: spacing.md },
  profileAvatar: { 
    width: 28, height: 28, borderRadius: 14, 
    backgroundColor: '#009688', justifyContent: 'center', alignItems: 'center' 
  },

  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, paddingTop: spacing.md },

  /* Node Pill */
  nodePillRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  nodePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFFFFE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  nodePillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#009688', marginRight: 6 },
  nodePillText: { fontSize: 10, fontWeight: '700', color: '#009688', letterSpacing: 0.5 },
  filterBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },

  /* Title */
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: spacing.lg },

  /* Settings Card */
  settingsCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  settingIconBox: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: '#EFFFFE', justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  settingTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  settingSub: { fontSize: 11, color: '#6B7280' },
  
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center' },
  settingRowLabel: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  settingSpinner: { flexDirection: 'row', alignItems: 'center' },
  settingSpinnerText: { fontSize: 12, fontWeight: '700', color: '#1F2937', marginRight: 4 },

  alertBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFFFFE', padding: spacing.sm, borderRadius: radius.sm, marginTop: 8 },
  alertBannerText: { fontSize: 11, color: '#009688', flex: 1, lineHeight: 16 },

  /* Stats Row */
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  statBox: { flex: 1, backgroundColor: colors.white, borderRadius: radius.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderTopWidth: 3, marginRight: spacing.sm },
  statBoxHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statBoxTitle: { fontSize: 10, fontWeight: '700', marginLeft: 4, letterSpacing: 0.5 },
  statBoxNumber: { fontSize: 24, fontWeight: '700', color: '#1F2937', textAlign: 'center' },

  /* Grid Title */
  gridTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.sm },
  gridTitleMain: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  gridTitleSub: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#6B7280' },

  /* Legends */
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  legendDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  legendText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },

  /* Grid */
  seatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center', marginBottom: spacing.xl },
  seatBox: { width: 56, height: 64, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  
  seatFree: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#009688' },
  seatFreeText: { fontSize: 12, fontWeight: '700', color: '#009688', marginBottom: 4 },
  
  seatOccupied: { backgroundColor: '#1E403F' },
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

  detailTimeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  detailTimeBoxLeft: { flex: 1, backgroundColor: '#F9FAFB', padding: spacing.sm, borderRadius: radius.sm },
  detailTimeLabel: { fontSize: 9, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 4 },
  detailTimeValue: { fontSize: 13, fontWeight: '700', color: '#1F2937', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  
  detailTimeBoxRight: { flex: 1, backgroundColor: '#FFFBEB', padding: spacing.sm, borderRadius: radius.sm },
  detailAutoLabel: { fontSize: 9, fontWeight: '700', color: '#D97706', letterSpacing: 0.5, marginBottom: 4 },
  detailAutoValue: { fontSize: 13, fontWeight: '700', color: '#B45309', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 18 },

  detailActionRow: { flexDirection: 'row', gap: spacing.sm },
  detailBtnSecondary: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: '#009688', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm },
  detailBtnSecondaryText: { fontSize: 13, fontWeight: '700', color: '#009688' },
  detailBtnPrimary: { flex: 1, backgroundColor: '#DC2626', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm },
  detailBtnPrimaryText: { fontSize: 13, fontWeight: '700', color: colors.white },
});
