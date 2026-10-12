import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { useCurrentProfile } from '../../hooks/useCurrentProfile';
import { subscribeToReservations, getRelatedItem } from './accountService';
import { toJsDate } from '../../hooks/formatDate';

function expiresInText(dueDate) {
  const d = toJsDate(dueDate);
  if (!d) return null;
  const mins = Math.round((d.getTime() - Date.now()) / 60000);
  if (mins <= 0) return 'Expired';
  if (mins < 60) return `Expires in ${mins} min`;
  return `Expires in ${Math.round(mins / 60)} hr`;
}

function ActionCard({ icon, title, subtitle, onPress }) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSub}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function ActivityRow({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.activityRow} onPress={onPress}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <Text style={styles.activityLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function HomeDashboardScreen({ navigation }) {
  const { user, profile } = useCurrentProfile();
  const [next, setNext] = useState(null);
  const [nextItem, setNextItem] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const unsubscribe = subscribeToReservations(user.id, (reservations) => {
      if (!active) return;
      const first = reservations.find((r) => r.status === 'confirmed') ?? null;
      setNext(first);
      if (first) getRelatedItem(first).then((i) => active && setNextItem(i));
      else setNextItem(null);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user?.id]);

  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : 'there';

  const nextTitle = next
    ? next.type === 'seat'
      ? `Seat ${nextItem?.seatNumber ?? ''}`.trim()
      : nextItem?.title ?? 'Book reservation'
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={typography.title}>Hi, {firstName}</Text>
          <Text style={typography.muted}>Welcome back</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.bell}>
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.actionRow}>
          <ActionCard
            icon="search-outline"
            title="Search Books"
            subtitle="Browse the catalog"
            onPress={() => navigation.navigate('Search')}
          />
          <ActionCard
            icon="grid-outline"
            title="Book a Seat"
            subtitle="Reserve a spot"
            onPress={() => navigation.navigate('SeatAvailability')}
          />
        </View>

        {next ? (
          <TouchableOpacity
            style={styles.nextCard}
            onPress={() => navigation.navigate('ReservationDetail', { reservationId: next.id })}
          >
            <View style={styles.nextIcon}>
              <Ionicons name={next.type === 'seat' ? 'grid-outline' : 'book-outline'} size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextLabel}>YOUR NEXT RESERVATION</Text>
              <Text style={styles.nextTitle}>{nextTitle}</Text>
              {expiresInText(next.dueDate) ? (
                <Text style={styles.nextSub}>{expiresInText(next.dueDate)}</Text>
              ) : null}
            </View>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.nextCard, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
            <Text style={typography.muted}>You have no active reservations right now.</Text>
          </View>
        )}

        <Text style={[typography.subtitle, styles.sectionLabel]}>Recent Activity</Text>
        <ActivityRow icon="notifications-outline" label="Notifications" onPress={() => navigation.navigate('Notifications')} />
        <ActivityRow icon="list-outline" label="My Reservations" onPress={() => navigation.navigate('MyReservations')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  bell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: { padding: spacing.lg, paddingBottom: spacing.xl },
  actionRow: { flexDirection: 'row', gap: spacing.md },
  actionCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  actionTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  actionSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  nextCard: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  nextIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextLabel: { fontSize: 9, letterSpacing: 0.8, color: 'rgba(255,255,255,0.8)' },
  nextTitle: { fontSize: 16, fontWeight: '700', color: colors.white },
  nextSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  activeBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBadgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  activityLabel: { flex: 1, fontSize: 13, color: colors.text },
});