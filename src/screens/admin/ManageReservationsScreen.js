import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Pressable, FlatList, ScrollView, Platform, RefreshControl, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { getRichReservations, releaseReservation } from '../../services/reservationService';
import { TIME_SLOTS } from '../../services/seatReservationService';
import { supabase } from '../../supabase/supabaseClient';
import { uniqueChannelName } from '../../supabase/realtimeUtil';
import { signOutAccount } from '../../supabase/authService';

export default function ManageReservationsScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedType, setSelectedType] = useState('All Types');
  const [typeDropdownVisible, setTypeDropdownVisible] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [staffEmail, setStaffEmail] = useState('admin@libroseat.com');
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setStaffEmail(data.user.email);
    });
  }, []);

  const seatCount = reservations.filter(r => r.type === 'seat' || r.type === 'seat_adv').length;
  const bookCount = reservations.filter(r => r.type === 'book').length;
  const alertCount = reservations.filter(r => r.status === 'overdue' || r.status === 'unattended' || r.status === 'no_show').length;

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
    if (activeFilter === 'Alerts' && r.status !== 'overdue' && r.status !== 'unattended' && r.status !== 'no_show') return false;
    // 3. Dropdown Type Filter
    if (selectedType === 'Seats Only' && r.type !== 'seat' && r.type !== 'seat_adv') return false;
    if (selectedType === 'Books Only' && r.type !== 'book') return false;
    return true;
  });

  const fetchData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await getRichReservations();
      setReservations(data);
    } catch (e) {
      console.warn(e);
      if (showSpinner) Alert.alert("Error", "Failed to load reservations");
    } finally {
      if (showSpinner) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData(false);
    }, [fetchData])
  );

  useEffect(() => {
    fetchData(true);

    const channel = supabase
      .channel(uniqueChannelName('manage_reservations'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seat_reservations' }, () => {
        fetchData(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
        fetchData(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(false);
  }, [fetchData]);

  async function handleRelease(res) {
    try {
      setLoading(true);
      await releaseReservation(res.id, res.type, res.ref_id);
      await fetchData(false);
    } catch (e) {
      Alert.alert("Error", "Failed to release reservation");
    } finally {
      setLoading(false);
    }
  }

  const handleSignOut = async () => {
    try {
      setProfileModalVisible(false);
      await signOutAccount();
      navigation?.reset?.({ index: 0, routes: [{ name: 'StaffLogin' }] });
    } catch (e) {
      Alert.alert('Sign out error', e.message);
    }
  };

  const handleBatchReleaseAlerts = async () => {
    const alertItems = reservations.filter(r => r.status === 'overdue' || r.status === 'unattended' || r.status === 'no_show');
    if (alertItems.length === 0) {
      Alert.alert('No alerts', 'There are no overdue or no-show reservations to release.');
      return;
    }
    setLoading(true);
    setBatchModalVisible(false);
    try {
      for (const item of alertItems) {
        await releaseReservation(item.id, item.type, item.ref_id);
      }
      await fetchData(false);
      Alert.alert('Batch complete', `Successfully released ${alertItems.length} overdue/no-show reservations.`);
    } catch (e) {
      Alert.alert('Batch error', e.message || 'Failed to complete batch release');
    } finally {
      setLoading(false);
    }
  };

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
    
    if (item.status === 'checked_in') {
      statusLabel = 'Checked In';
      avatarBg = '#D1FAE5'; avatarText = '#065F46';
      statusBg = '#D1FAE5'; statusColor = '#059669';
    } else if (item.status === 'reserved') {
      statusLabel = 'Reserved';
      avatarBg = '#E0F2FE'; avatarText = '#0284C7';
      statusBg = '#E0F2FE'; statusColor = '#0284C7';
    } else if (item.status === 'confirmed' || item.status === 'active') {
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
      statusLabel = 'Cancelled';
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

        <TouchableOpacity 
          style={styles.resourceBox}
          activeOpacity={0.8}
          onPress={() => {
            if ((item.type === 'seat' || item.type === 'seat_adv') && navigation) {
              const sTime = item.start_time ? String(item.start_time).substring(0, 5) : '14:00';
              const slot = TIME_SLOTS.find(s => s.start.startsWith(sTime)) || TIME_SLOTS[0];
              navigation.navigate('Seats', {
                date: item.booking_date,
                slotId: slot.id,
              });
            }
          }}
        >
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
        </TouchableOpacity>

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
          <TouchableOpacity 
            style={styles.profileAvatar}
            onPress={() => navigation?.navigate('StaffProfile')}
            accessibilityRole="button"
            accessibilityLabel="Staff profile and account"
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="person" size={14} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Title Row */}
      <View style={{ paddingHorizontal: spacing.lg, zIndex: 50 }}>
        <View style={styles.titleRowMain}>
          <View>
            <Text style={styles.pageTitle}>Manage Reservations</Text>
            <View style={styles.subtitleRow}>
              <View style={styles.syncDot} />
              <Text style={styles.itemCountText}>{reservations.filter(r=>r.status === 'confirmed' || r.status === 'reserved' || r.status === 'checked_in').length} Active Holds • {reservations.filter(r=>r.status === 'expired' || r.status === 'no_show').length} Overdue/No-Show</Text>
            </View>
          </View>
          <Pressable 
            style={({ pressed, hovered }) => [
              styles.batchBtn,
              hovered && styles.batchBtnHovered,
              pressed && { opacity: 0.75 }
            ]}
            onPress={() => setBatchModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Batch operations"
          >
            <Ionicons name="options-outline" size={16} color="#4B5563" style={{marginRight: 4}} />
            <Text style={styles.batchBtnText}>Batch</Text>
          </Pressable>
        </View>

        {/* Search Row Container with floating dropdown support */}
        <View style={styles.searchRowContainer}>
          <View style={styles.searchRow}>
            <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
              <Ionicons name="search" size={20} color={isSearchFocused ? colors.primary : colors.textMuted} />
              <TextInput 
                style={styles.searchInput} 
                placeholder="Search patron, ID, seat, or book" 
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                underlineColorAndroid="transparent"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={10} style={{ cursor: 'pointer' }}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
            <Pressable 
              style={({ pressed, hovered }) => [
                styles.filterDropdown,
                typeDropdownVisible && styles.filterDropdownActive,
                hovered && styles.filterDropdownHovered,
                pressed && { opacity: 0.8 }
              ]}
              onPress={() => setTypeDropdownVisible(!typeDropdownVisible)}
              accessibilityRole="button"
              accessibilityLabel="Filter by type"
            >
              <Text style={styles.filterDropdownText}>{selectedType}</Text>
              <Ionicons name={typeDropdownVisible ? "chevron-up" : "chevron-down"} size={16} color="#4B5563" />
            </Pressable>
          </View>

          {/* Floating Dropdown for Type Filter */}
          {typeDropdownVisible && (
            <>
              <Pressable 
                style={styles.dropdownDismissOverlay} 
                onPress={() => setTypeDropdownVisible(false)} 
              />
              <View style={styles.inlineDropdownMenu}>
                <Text style={styles.dropdownMenuTitle}>FILTER BY TYPE</Text>
                {['All Types', 'Seats Only', 'Books Only'].map(type => (
                  <Pressable
                    key={type}
                    style={({ pressed, hovered }) => [
                      styles.inlineDropdownItem,
                      selectedType === type && styles.inlineDropdownItemActive,
                      (hovered || pressed) && styles.inlineDropdownItemHovered
                    ]}
                    onPress={() => {
                      setSelectedType(type);
                      setTypeDropdownVisible(false);
                    }}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name={type === 'Seats Only' ? 'grid-outline' : type === 'Books Only' ? 'book-outline' : 'layers-outline'}
                      size={15}
                      color={selectedType === type ? colors.primary : '#4B5563'}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[styles.inlineDropdownItemText, selectedType === type && styles.inlineDropdownItemTextActive]}>
                      {type}
                    </Text>
                    {selectedType === type && (
                      <Ionicons name="checkmark-circle" size={15} color={colors.primary} style={{ marginLeft: 'auto' }} />
                    )}
                  </Pressable>
                ))}
              </View>
            </>
          )}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        />
      )}

      {/* 1. Batch Actions Modal */}
      {batchModalVisible && (
        <Modal transparent animationType="fade" visible={batchModalVisible} onRequestClose={() => setBatchModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setBatchModalVisible(false)} />
            <View style={styles.actionModalCard}>
              <View style={styles.actionModalHeader}>
                <Ionicons name="options" size={20} color={colors.primary} style={{marginRight: 8}} />
                <Text style={styles.actionModalTitle}>Batch Operations</Text>
                <Pressable onPress={() => setBatchModalVisible(false)} style={styles.modalCloseBtn} hitSlop={8}>
                  <Ionicons name="close" size={20} color="#6B7280" />
                </Pressable>
              </View>

              <Pressable 
                style={({ pressed, hovered }) => [
                  styles.batchActionBtn,
                  hovered && { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
                  pressed && { opacity: 0.8 }
                ]} 
                onPress={handleBatchReleaseAlerts}
              >
                <Ionicons name="log-out-outline" size={20} color="#DC2626" style={{marginRight: 12}} />
                <View style={{flex: 1}}>
                  <Text style={styles.batchActionText}>Release All No-Show & Overdue ({alertCount})</Text>
                  <Text style={styles.batchActionSub}>Frees unheld resources immediately</Text>
                </View>
              </Pressable>

              <Pressable 
                style={({ pressed, hovered }) => [
                  styles.batchActionBtn,
                  hovered && { backgroundColor: '#EFFFFE', borderColor: colors.primary },
                  pressed && { opacity: 0.8 }
                ]} 
                onPress={() => { setBatchModalVisible(false); fetchData(true); }}
              >
                <Ionicons name="sync-outline" size={20} color="#009688" style={{marginRight: 12}} />
                <View style={{flex: 1}}>
                  <Text style={styles.batchActionText}>Force Re-sync Records</Text>
                  <Text style={styles.batchActionSub}>Re-queries all hold queues from Supabase</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* 2. Staff Profile & Sign Out Modal */}
      {profileModalVisible && (
        <Modal transparent animationType="fade" visible={profileModalVisible} onRequestClose={() => setProfileModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setProfileModalVisible(false)} />
            <View style={styles.actionModalCard}>
              <View style={styles.actionModalHeader}>
                <View style={styles.profileAvatarLarge}>
                  <Ionicons name="person" size={22} color={colors.white} />
                </View>
                <View style={{marginLeft: 12, flex: 1}}>
                  <Text style={styles.actionModalTitle}>Staff Profile</Text>
                  <Text style={{fontSize: 12, color: '#6B7280', marginTop: 1}} numberOfLines={1}>{staffEmail}</Text>
                </View>
                <Pressable onPress={() => setProfileModalVisible(false)} style={styles.modalCloseBtn} hitSlop={8}>
                  <Ionicons name="close" size={20} color="#6B7280" />
                </Pressable>
              </View>

              <View style={styles.profileInfoBox}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                  <Text style={{fontSize: 12, color: '#6B7280'}}>Role</Text>
                  <Text style={{fontSize: 12, fontWeight: '700', color: '#059669'}}>Administrator / Staff</Text>
                </View>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  <Text style={{fontSize: 12, color: '#6B7280'}}>Session</Text>
                  <Text style={{fontSize: 12, fontWeight: '700', color: '#1F2937'}}>Active</Text>
                </View>
              </View>

              <Pressable 
                style={({ pressed, hovered }) => [
                  styles.signOutBtn,
                  hovered && { backgroundColor: '#FCA5A5' },
                  pressed && { opacity: 0.8 }
                ]} 
                onPress={handleSignOut}
              >
                <Ionicons name="log-out-outline" size={18} color="#DC2626" style={{marginRight: 8}} />
                <Text style={styles.signOutBtnText}>Sign Out</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
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
    width: 32, height: 32, borderRadius: 16, 
    backgroundColor: '#009688', justifyContent: 'center', alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none',
  },
  profileAvatarHovered: {
    backgroundColor: '#00796B',
    transform: [{ scale: 1.05 }],
  },

  /* Title Row */
  titleRowMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center' },
  syncDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669', marginRight: 6 },
  itemCountText: { fontSize: 13, fontWeight: '600', color: '#4B5563', letterSpacing: 0.5 },
  
  batchBtn: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#E5EDF6', 
    paddingHorizontal: 12, paddingVertical: 7, 
    borderRadius: radius.sm,
    cursor: 'pointer',
    userSelect: 'none',
  },
  batchBtnHovered: {
    backgroundColor: '#D6E4F0',
  },
  batchBtnText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },

  /* Search & Dropdown */
  searchRowContainer: {
    position: 'relative',
    zIndex: 100,
    marginBottom: spacing.md,
  },
  searchRow: { flexDirection: 'row' },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, height: 44,
    marginRight: spacing.sm,
    borderWidth: 1, borderColor: colors.border
  },
  searchBarFocused: {
    borderColor: colors.primary,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 13,
    color: colors.text,
    borderWidth: 0,
    outlineStyle: 'none',
    backgroundColor: 'transparent',
    paddingVertical: 0,
    height: '100%',
  },
  filterDropdown: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: 12, height: 44,
    cursor: 'pointer',
    userSelect: 'none',
  },
  filterDropdownActive: {
    borderColor: colors.primary,
    backgroundColor: '#EFFFFE',
  },
  filterDropdownHovered: {
    borderColor: colors.primary,
  },
  filterDropdownText: { fontSize: 13, color: '#4B5563', fontWeight: '500', marginRight: 4 },
  dropdownDismissOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
    cursor: 'default',
  },
  inlineDropdownMenu: {
    position: 'absolute',
    top: 48,
    right: 0,
    width: 175,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 6,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownMenuTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  inlineDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    cursor: 'pointer',
    marginBottom: 2,
  },
  inlineDropdownItemHovered: {
    backgroundColor: '#F0FDFA',
  },
  inlineDropdownItemActive: {
    backgroundColor: '#EFFFFE',
  },
  inlineDropdownItemText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  inlineDropdownItemTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  /* Filters */
  filterContainer: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.md },
  filterScroll: { alignItems: 'center' },
  filterChip: { 
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, 
    borderRadius: 20, backgroundColor: colors.white, 
    marginRight: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
    cursor: 'pointer',
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

  resourceBox: { 
    flexDirection: 'row', backgroundColor: '#F3F6FA', borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.md,
    cursor: 'pointer',
  },
  resourceBoxLeft: { flex: 1, paddingRight: spacing.sm },
  resourceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  resourceIcon: { marginRight: 8, marginTop: 2 },
  resourceName: { fontSize: 14, fontWeight: '700', color: '#1F2937', flex: 1 },
  resourceDetail: { fontSize: 12, fontWeight: '600' },
  
  resourceBoxRight: { backgroundColor: colors.white, padding: spacing.sm, borderRadius: 4, justifyContent: 'center', alignItems: 'center', minWidth: 80 },
  rightBoxText: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#374151', textAlign: 'center' },

  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  btnSecondary: { backgroundColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.sm, cursor: 'pointer' },
  btnSecondaryText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  btnIcon: { marginRight: 6 },
  
  btnDanger: { backgroundColor: '#B91C1C', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.sm, cursor: 'pointer' },
  btnDangerText: { fontSize: 13, fontWeight: '600', color: colors.white },

  btnPrimaryLight: { backgroundColor: '#DBEAFE', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.sm, cursor: 'pointer' },
  btnPrimaryLightText: { fontSize: 13, fontWeight: '600', color: '#1E3A8A' },

  /* Modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCloseBtn: {
    padding: 6,
    cursor: 'pointer',
    borderRadius: 14,
  },
  actionModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  },
  actionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  profileAvatarLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#009688',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfoBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    cursor: 'pointer',
  },
  signOutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },

  batchActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: spacing.sm,
    cursor: 'pointer',
  },
  batchActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  batchActionSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
});
