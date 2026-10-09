import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { useCurrentProfile } from '../../hooks/useCurrentProfile';
import { supabase } from '../../supabase/supabaseClient';

export default function AdminDashboardScreen({ navigation }) {
  const { profile } = useCurrentProfile();
  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : 'Staff';

  const [stats, setStats] = useState({
    totalBooks: 0,
    activeHolds: 0,
    pendingPickup: 0,
    unattendedSeats: 0,
    loading: true
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const { count: booksCount } = await supabase
          .from('books')
          .select('*', { count: 'exact', head: true });
          
        const { count: activeHolds } = await supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .in('status', ['active', 'pending', 'approved']);
          
        const { count: pendingPickup } = await supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
          
        const { count: unattendedSeats } = await supabase
          .from('seats')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'unattended');
          
        setStats({
          totalBooks: booksCount || 0,
          activeHolds: activeHolds || 0,
          pendingPickup: pendingPickup || 0,
          unattendedSeats: unattendedSeats || 0,
          loading: false
        });
      } catch (e) {
        console.error('Error fetching dashboard stats', e);
        setStats(s => ({ ...s, loading: false }));
      }
    }
    
    fetchStats();
    
    // Optional real-time refresh could be added here
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons name="book-open-variant" size={20} color={colors.primary} />
            </View>
            <View style={styles.headerTitles}>
              <Text style={styles.staffPortalText}>STAFF PORTAL</Text>
              <Text style={styles.dashboardTitle}>Dashboard</Text>
            </View>
          </View>
          <View style={styles.headerIcons}>
            <View style={styles.profileAvatar}>
              <Ionicons name="person" size={14} color={colors.white} />
            </View>
          </View>
        </View>

        {/* Status & Welcome */}
        <View style={styles.statusContainer}>
          <View style={styles.statusRow}>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>MAIN LIBRARY • DESK ACTIVE</Text>
            </View>
            <Text style={styles.shiftText}>Shift: 08:00 - 16:30</Text>
          </View>
          <Text style={styles.welcomeText}>Welcome back, {firstName}</Text>
          <Text style={styles.welcomeSub}>Here's what's happening today across circulation and floor bays.</Text>
        </View>

        {/* Holdings Card */}
        <View style={styles.holdingsCard}>
          <View style={styles.holdingsTop}>
            <View style={styles.holdingsTitleRow}>
              <Ionicons name="book-outline" size={16} color={colors.white} />
              <Text style={styles.holdingsTitle}>HOLDINGS REPOSITORY</Text>
            </View>
            <MaterialCommunityIcons name="book-open-page-variant-outline" size={60} color="rgba(255,255,255,0.15)" style={styles.holdingsBgIcon} />
          </View>
          
          <View style={styles.holdingsStats}>
            {stats.loading ? (
              <ActivityIndicator color={colors.white} size="small" style={{ marginRight: 8 }} />
            ) : (
              <Text style={styles.holdingsNumber}>{stats.totalBooks}</Text>
            )}
            <Text style={styles.holdingsSubNumber}>Total Books</Text>
          </View>
          
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '94%' }]} />
          </View>
          
          <View style={styles.holdingsBottom}>
            <View style={styles.holdingsCheck}>
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.white} />
              <Text style={styles.holdingsCheckText}>94% cataloged & shelved</Text>
            </View>
            {/* Removed dummy 14 out today pill */}
          </View>
        </View>

        {/* Tiles Row */}
        <View style={styles.tilesRow}>
          <View style={[styles.smallTile, { backgroundColor: '#EFFFFE' }]}>
            <View style={styles.tileHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#D1F4F0' }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <View style={[styles.tileBadge, { backgroundColor: '#D1F4F0' }]}>
                <Text style={[styles.tileBadgeText, { color: colors.primary }]}>Queue</Text>
              </View>
            </View>
            {stats.loading ? (
              <ActivityIndicator color={colors.primary} size="small" style={{ alignSelf: 'flex-start', marginVertical: 4 }} />
            ) : (
              <Text style={styles.tileNumber}>{stats.activeHolds}</Text>
            )}
            <Text style={styles.tileLabel}>Active holds</Text>
            {/* Removed dummy pending pickup text */}
          </View>

          <View style={[styles.smallTile, { backgroundColor: '#FFF0F0' }]}>
            <View style={styles.tileHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#FFE0E0', borderRadius: 6 }]}>
                <MaterialCommunityIcons name="sofa-single-outline" size={18} color={colors.danger} />
              </View>
              <View style={[styles.tileBadge, { backgroundColor: colors.danger }]}>
                <Text style={[styles.tileBadgeText, { color: colors.white }]}>!Alert</Text>
              </View>
            </View>
            {stats.loading ? (
              <ActivityIndicator color={colors.danger} size="small" style={{ alignSelf: 'flex-start', marginVertical: 4 }} />
            ) : (
              <Text style={[styles.tileNumber, { color: colors.danger }]}>{stats.unattendedSeats}</Text>
            )}
            <Text style={[styles.tileLabel, { color: colors.danger }]}>Unattended seats</Text>
            {/* Removed dummy idle session text */}
          </View>
        </View>

        {/* Floor Density */}
        <View style={styles.densityCard}>
          <View style={styles.densityHeader}>
            <View style={styles.densityTitleRow}>
              <Ionicons name="pie-chart-outline" size={18} color={colors.textMuted} />
              <Text style={styles.densityTitle}>Floor Density Real-Time</Text>
            </View>
            <Text style={styles.densityRightText}>Level 2 Stacks</Text>
          </View>
          
          <View style={styles.densityBody}>
            <View style={styles.donutContainer}>
              <View style={styles.donutBase} />
              <View style={styles.donutOverlay} />
              <Text style={styles.donutText}>73%</Text>
            </View>
            <View style={styles.densityInfo}>
              <View style={styles.densityInfoRow}>
                <Text style={styles.densityCarrelsText}>Reading Carrels: 35 / 48</Text>
                <Text style={styles.densityHealthyText}>Healthy</Text>
              </View>
              <View style={styles.densityLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.legendText}>Quiet Zone</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#B0BEC5' }]} />
                  <Text style={styles.legendText}>Collab Bay</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick actions</Text>
            <Text style={styles.sectionRightText}>Desk Utilities</Text>
          </View>

          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Books')}>
            <View style={[styles.actionIconBox, { backgroundColor: '#EFFFFE' }]}>
              <Ionicons name="archive-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.actionTextContent}>
              <Text style={styles.actionTitle}>Manage inventory</Text>
              <Text style={styles.actionDesc}>Browse catalog, check-in & stock</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Manage')}>
            <View style={[styles.actionIconBox, { backgroundColor: '#EFFFFE' }]}>
              <Ionicons name="calendar-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.actionTextContent}>
              <Text style={styles.actionTitle}>Manage reservations</Text>
              <Text style={styles.actionDesc}>Review active holds & patron requests</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('SeatAllocation')}>
            <View style={[styles.actionIconBox, { backgroundColor: '#EFFFFE' }]}>
              <MaterialCommunityIcons name="sofa-single-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.actionTextContent}>
              <Text style={styles.actionTitle}>Seat allocation</Text>
              <Text style={styles.actionDesc}>Reading room carrels & occupancy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Activity Feed */}
        <View style={[styles.sectionContainer, { paddingBottom: spacing.xl }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.feedTitle}>DESK ACTIVITY FEED</Text>
            <Text style={styles.feedRightText}>Auto-sync</Text>
          </View>

          <View style={[styles.feedItem, { justifyContent: 'center', marginTop: 10 }]}>
            <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>No recent activity.</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  
  /* Header */
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoContainer: { 
    width: 36, height: 36, borderRadius: radius.sm, 
    backgroundColor: '#EFFFFE', justifyContent: 'center', alignItems: 'center', 
    marginRight: spacing.sm 
  },
  staffPortalText: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },
  dashboardTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: -2 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconMargin: { marginRight: spacing.md },
  profileAvatar: { 
    width: 28, height: 28, borderRadius: 14, 
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' 
  },

  /* Status & Welcome */
  statusContainer: { marginBottom: spacing.lg },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  statusBadge: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#EFFFFE', paddingHorizontal: 10, paddingVertical: 4, 
    borderRadius: 20 
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 6 },
  statusText: { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 0.5 },
  shiftText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  welcomeText: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
  welcomeSub: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },

  /* Holdings Card */
  holdingsCard: { 
    backgroundColor: '#0F7C6A', borderRadius: radius.md, 
    padding: spacing.lg, marginBottom: spacing.md, overflow: 'hidden'
  },
  holdingsTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  holdingsTitleRow: { flexDirection: 'row', alignItems: 'center' },
  holdingsTitle: { color: colors.white, fontSize: 11, fontWeight: '700', marginLeft: 6, letterSpacing: 0.5 },
  holdingsBgIcon: { position: 'absolute', right: -10, top: -20 },
  holdingsStats: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  holdingsNumber: { fontSize: 32, fontWeight: '700', color: colors.white, marginRight: 8 },
  holdingsSubNumber: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  progressBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, marginBottom: 12 },
  progressBarFill: { height: '100%', backgroundColor: colors.white, borderRadius: 2 },
  holdingsBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  holdingsCheck: { flexDirection: 'row', alignItems: 'center' },
  holdingsCheckText: { color: colors.white, fontSize: 11, marginLeft: 4 },
  outTodayPill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  outTodayText: { color: colors.white, fontSize: 11, fontWeight: '600' },

  /* Tiles Row */
  tilesRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  smallTile: { flex: 1, borderRadius: radius.md, padding: spacing.md },
  tileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  iconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  tileBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tileBadgeText: { fontSize: 10, fontWeight: '700' },
  tileNumber: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 2 },
  tileLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 },
  tileFooterGreen: { fontSize: 11, fontWeight: '600', color: colors.primary },
  tileFooterRed: { fontSize: 11, fontWeight: '600', color: colors.danger },

  /* Density Card */
  densityCard: { 
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, 
    padding: spacing.md, marginBottom: spacing.lg 
  },
  densityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  densityTitleRow: { flexDirection: 'row', alignItems: 'center' },
  densityTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginLeft: 6 },
  densityRightText: { fontSize: 11, color: '#90A4AE', fontWeight: '600', letterSpacing: 0.5 },
  densityBody: { flexDirection: 'row', alignItems: 'center' },
  donutContainer: { 
    width: 60, height: 60, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md 
  },
  donutBase: { 
    position: 'absolute', width: 60, height: 60, borderRadius: 30, 
    borderWidth: 5, borderColor: '#E3E6EA' 
  },
  donutOverlay: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    borderWidth: 5, borderColor: colors.primary,
    borderRightColor: 'transparent', borderBottomColor: 'transparent',
    transform: [{ rotate: '45deg' }]
  },
  donutText: { fontSize: 12, fontWeight: '700', color: colors.text },
  densityInfo: { flex: 1 },
  densityInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  densityCarrelsText: { fontSize: 12, color: colors.textMuted },
  densityHealthyText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  densityLegendRow: { flexDirection: 'row', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  legendText: { fontSize: 11, color: colors.textMuted },

  /* Sections */
  sectionContainer: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  sectionRightText: { fontSize: 11, color: '#90A4AE', fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  
  actionCard: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm 
  },
  actionIconBox: { 
    width: 40, height: 40, borderRadius: radius.sm, 
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.md 
  },
  actionTextContent: { flex: 1 },
  actionTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
  actionDesc: { fontSize: 12, color: colors.textMuted },

  feedTitle: { fontSize: 11, fontWeight: '700', color: '#90A4AE', letterSpacing: 0.5 },
  feedRightText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  feedItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  feedDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  feedItemText: { flex: 1, fontSize: 13, color: colors.text },
  feedTimeText: { fontSize: 11, color: colors.textMuted, marginLeft: 8 },
});