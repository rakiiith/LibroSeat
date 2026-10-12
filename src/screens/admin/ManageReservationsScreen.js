import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { getRichReservations, releaseReservation } from '../../services/reservationService';
import { ActivityIndicator, Alert } from 'react-native';

export default function ManageReservationsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const seatCount = reservations.filter(r => r.type === 'seat' || r.type === 'seat_adv').length;
  const bookCount = reservations.filter(r => r.type === 'book').length;
  const alertCount = reservations.filter(r => r.status === 'overdue' || r.status === 'unattended').length;

  const filters = [
    { id: 'All', label: `All (${reservations.length})` },
    { id: 'Seats', label: `Seats (${seatCount})` },
    { id: 'Books', label: `Books (${bookCount})` },
    { id: 'Alerts', label: `Alerts (${alertCount})`, hasDot: true },
  ];

  // Filtering logic
  const filteredData = reservations.filter(r => {
    // 1. Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const patronName = r.profile?.full_name || 'unknown';
      const patronId = r.profile?.student_id || '';
      const resourceName = r.item?.title || r.item?.seat_number || '';
      if (!patronName.toLowerCase().includes(q) && !patronId.toLowerCase().includes(q) && !resourceName.toLowerCase().includes(q)) return false;
    }
    // 2. Tabs
    if (activeFilter === 'Seats' && r.type !== 'seat' && r.type !== 'seat_adv') return false;
    if (activeFilter === 'Books' && r.type !== 'book') return false;
    if (activeFilter === 'Alerts' && r.status !== 'overdue' && r.status !== 'unattended') return false;
    return true;
  });



  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const data = await getRichReservations();
      setReservations(data);
    } catch (e) {
      console.warn(e);
      Alert.alert("Error", "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  }

  async function handleRelease(res) {
    try {
      setLoading(true);
      await releaseReservation(res.id, res.type, res.ref_id);
      await fetchData();
    } catch (e) {
      Alert.alert("Error", "Failed to release reservation");
      setLoading(false);
    }
  }

  const renderItem = ({ item }) => {
    // Dynamic mappings based on database structure
    const patronName = item.profile?.full_name || 'Unknown Student';
    const patronInitials = patronName.substring(0, 2).toUpperCase();
    const patronId = item.profile?.student_id || item.user_id?.substring(0,6).toUpperCase();
    const patronRole = item.profile?.role === 'staff' ? 'Staff Member' : 'Student';
    
    let statusLabel = item.status.charAt(0).toUpperCase() + item.status.slice(1);
    let avatarBg = '#E5E7EB';
    let avatarText = '#374151';
    let statusBg = '#E5E7EB';
    let statusColor = '#374151';
    
    if (item.status === 'confirmed' || item.status === 'active' || item.status === 'reserved' || item.status === 'checked_in') {
      statusLabel = 'Active';
      avatarBg = '#D1FAE5'; avatarText = '#065F46';
      statusBg = '#D1FAE5'; statusColor = '#059669';
    } else if (item.status === 'unattended' || item.status === 'no_show') {
      avatarBg = '#FCE7F3'; avatarText = '#9D174D';
      statusBg = '#FCE7F3'; statusColor = '#E11D48';
      statusLabel = 'No-Show';
    } else if (item.status === 'overdue') {
      avatarBg = '#FEF3C7'; avatarText = '#92400E';
      statusBg = '#FEF3C7'; statusColor = '#D97706';
      statusLabel = 'Overdue';
    } else if (item.status === 'cancelled') {
      avatarBg = '#F3F4F6'; avatarText = '#9CA3AF';
      statusBg = '#F3F4F6'; statusColor = '#9CA3AF';
    }

    const resourceName = (item.type === 'seat' || item.type === 'seat_adv') ? `Carrel ${item.item?.seat_number || '?'}` : (item.item?.title || 'Unknown Book');
    let resourceDetail = '';
    if (item.type === 'seat_adv') {
      resourceDetail = `${item.reservation_date} | ${item.start_time.substring(0,5)} - ${item.due_date.substring(11,16)}`;
    } else if (item.type === 'seat') {
      resourceDetail = `Reserved on ${new Date(item.created_at).toLocaleDateString()}`;
    } else {
      resourceDetail = item.due_date ? `Due ${new Date(item.due_date).toLocaleString()}` : 'No Due Date';
    }
    const resourceDetailColor = statusColor;
    const rightBoxText = (item.type === 'seat' || item.type === 'seat_adv') ? (item.item?.zone || item.item?.room || 'General') : (item.item?.category || 'General Collection');

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.patronInfo}>
            <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
              <Text style={[styles.avatarText, { color: avatarText }]}>{patronInitials}</Text>
            </View>
            <View>
              <View style={styles.nameRow}>
                <Text style={styles.patronName}>{patronName}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{patronId}</Text>
                </View>
              </View>
              <Text style={styles.patronRole}>{patronRole}</Text>
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.resourceBox}>
          <View style={styles.resourceBoxLeft}>
            <View style={styles.resourceRow}>
              {(item.type === 'seat' || item.type === 'seat_adv') ? (
                <MaterialCommunityIcons name="sofa-single" size={18} color="#008080" style={styles.resourceIcon} />
              ) : (
                <MaterialCommunityIcons name="book-open-blank-variant" size={18} color="#008080" style={styles.resourceIcon} />
              )}
              <Text style={styles.resourceName} numberOfLines={1}>{resourceName}</Text>
            </View>
            <View style={styles.resourceRow}>
              {(item.type === 'seat' || item.type === 'seat_adv') ? (
                <MaterialCommunityIcons name="clock-outline" size={16} color={resourceDetailColor} style={styles.resourceIcon} />
              ) : (
                <MaterialCommunityIcons name="calendar-month-outline" size={16} color={resourceDetailColor} style={styles.resourceIcon} />
              )}
              <Text style={[styles.resourceDetail, { color: resourceDetailColor }]}>{resourceDetail}</Text>
            </View>
          </View>
          <View style={styles.resourceBoxRight}>
            <Text style={styles.rightBoxText} numberOfLines={2}>{rightBoxText}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {(item.type === 'seat' || item.type === 'seat_adv') ? (
            <>
              <TouchableOpacity style={styles.btnSecondary}>
                <Ionicons name="notifications-outline" size={16} color="#4B5563" style={styles.btnIcon} />
                <Text style={styles.btnSecondaryText}>Notify</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnDanger, item.status === 'cancelled' && {opacity: 0.5}]} onPress={() => handleRelease(item)} disabled={item.status === 'cancelled'}>
                <Ionicons name="log-out-outline" size={16} color={colors.white} style={styles.btnIcon} />
                <Text style={styles.btnDangerText}>Release Seat</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>Extend Hold</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnPrimaryLight, item.status === 'cancelled' && {opacity: 0.5}]} onPress={() => handleRelease(item)} disabled={item.status === 'cancelled'}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#1E3A8A" style={styles.btnIcon} />
                <Text style={styles.btnPrimaryLightText}>Complete / Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons name="book-open-page-variant" size={20} color={colors.primary} />
          </View>
          <View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={styles.dashboardTitle}>Reservations</Text>
              <View style={styles.titleDot} />
            </View>
            <Text style={styles.staffPortalText}>Main Wing • Staff Node</Text>
          </View>
        </View>
        <View style={styles.headerIcons}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={14} color={colors.white} />
          </View>
        </View>
      </View>

      {/* Title Row */}
      <View style={{ paddingHorizontal: spacing.lg }}>
        <View style={styles.titleRowMain}>
          <View>
            <Text style={styles.pageTitle}>Manage Reservations</Text>
            <View style={styles.subtitleRow}>
              <View style={styles.syncDot} />
              <Text style={styles.itemCountText}>{reservations.filter(r=>r.status === 'confirmed' || r.status === 'reserved' || r.status === 'checked_in').length} Active Holds • {reservations.filter(r=>r.status === 'expired' || r.status === 'no_show').length} Overdue/No-Show</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.batchBtn}>
            <Ionicons name="options-outline" size={16} color="#4B5563" style={{marginRight: 4}} />
            <Text style={styles.batchBtnText}>Batch</Text>
          </TouchableOpacity>
        </View>

        {/* Search Row */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search patron, ID, seat, or book" 
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <View style={styles.filterDropdown}>
            <Text style={styles.filterDropdownText}>All Types</Text>
            <Ionicons name="chevron-down" size={16} color="#4B5563" />
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {filters.map(f => (
              <TouchableOpacity 
                key={f.id} 
                style={[styles.filterChip, activeFilter === f.id && styles.filterChipActive]}
                onPress={() => setActiveFilter(f.id)}
              >
                {f.hasDot && <View style={styles.alertDot} />}
                <Text style={[styles.filterChipText, activeFilter === f.id && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* List */}
      
      {loading && reservations.length === 0 ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  
  /* Header */
  headerTop: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoContainer: { 
    width: 36, height: 36, borderRadius: radius.sm, 
    backgroundColor: '#EFFFFE', justifyContent: 'center', alignItems: 'center', 
    marginRight: spacing.sm 
  },
  dashboardTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  titleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginLeft: 4, marginTop: 2 },
  staffPortalText: { fontSize: 10, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.5, marginTop: 2 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  profileAvatar: { 
    width: 28, height: 28, borderRadius: 14, 
    backgroundColor: '#009688', justifyContent: 'center', alignItems: 'center' 
  },

  /* Title Row */
  titleRowMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center' },
  syncDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669', marginRight: 6 },
  itemCountText: { fontSize: 13, fontWeight: '600', color: '#4B5563', letterSpacing: 0.5 },
  
  batchBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E5EDF6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm },
  batchBtnText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },

  /* Search */
  searchRow: { flexDirection: 'row', marginBottom: spacing.md },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, height: 44,
    marginRight: spacing.sm,
    borderWidth: 1, borderColor: colors.border
  },
  searchInput: { flex: 1, marginLeft: spacing.sm, fontSize: 13, color: colors.text },
  filterDropdown: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: spacing.sm, height: 44
  },
  filterDropdownText: { fontSize: 13, color: '#4B5563', fontWeight: '500', marginRight: 4 },

  /* Filters */
  filterContainer: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.md },
  filterScroll: { alignItems: 'center' },
  filterChip: { 
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, 
    borderRadius: 20, backgroundColor: colors.white, 
    marginRight: spacing.sm,
    borderWidth: 1, borderColor: colors.border
  },
  filterChipActive: { backgroundColor: '#009688', borderColor: '#009688' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  filterChipTextActive: { color: colors.white },
  alertDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#DC2626', marginRight: 6 },

  /* List */
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2
  },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  patronInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  avatarText: { fontSize: 16, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  patronName: { fontSize: 15, fontWeight: '700', color: '#111827', marginRight: 8 },
  badge: { backgroundColor: '#E5E7EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#4B5563' },
  patronRole: { fontSize: 12, color: '#6B7280' },

  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },

  resourceBox: { flexDirection: 'row', backgroundColor: '#F3F6FA', borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.md },
  resourceBoxLeft: { flex: 1, paddingRight: spacing.sm },
  resourceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  resourceIcon: { marginRight: 8, marginTop: 2 },
  resourceName: { fontSize: 14, fontWeight: '700', color: '#1F2937', flex: 1 },
  resourceDetail: { fontSize: 12, fontWeight: '600' },
  
  resourceBoxRight: { backgroundColor: colors.white, padding: spacing.sm, borderRadius: 4, justifyContent: 'center', alignItems: 'center', minWidth: 80 },
  rightBoxText: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#374151', textAlign: 'center' },

  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  btnSecondary: { backgroundColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.sm },
  btnSecondaryText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  btnIcon: { marginRight: 6 },
  
  btnDanger: { backgroundColor: '#B91C1C', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.sm },
  btnDangerText: { fontSize: 13, fontWeight: '600', color: colors.white },

  btnPrimaryLight: { backgroundColor: '#DBEAFE', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.sm },
  btnPrimaryLightText: { fontSize: 13, fontWeight: '600', color: '#1E3A8A' },
});
