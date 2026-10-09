import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { useCurrentProfile } from '../../hooks/useCurrentProfile';

function Tile({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress}>
      <Ionicons name={icon} size={28} color={colors.primary} />
      <Text style={[typography.body, { marginTop: spacing.xs, textAlign: 'center' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AdminDashboardScreen({ navigation }) {
  const { profile } = useCurrentProfile();
  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : 'Staff';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={typography.title}>Admin Dashboard</Text>
          <Text style={typography.muted}>Welcome, {firstName}</Text>
        </View>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      <View style={styles.tileGrid}>
        <Tile icon="book-outline" label="Manage Inventory" onPress={() => navigation.navigate('Books')} />
        <Tile icon="document-text-outline" label="Manage Reservations" onPress={() => navigation.navigate('Manage')} />
        <Tile icon="grid-outline" label="Seat Allocation" onPress={() => navigation.navigate('SeatAllocation')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  adminBadge: {
    backgroundColor: colors.primary + '22',
    borderRadius: radius.lg,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  adminBadgeText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingHorizontal: spacing.lg },
  tile: {
    width: 150,
    height: 110,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
});