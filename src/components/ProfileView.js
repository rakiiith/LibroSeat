// Shared layout for "My Profile" (student) and "Staff Profile" (admin),
// matching the high-fidelity design: avatar with initials, name, email,
// role badge, then an "Account" list. The Log Out row is always red.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme/theme';

function initialsOf(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export default function ProfileView({ name, email, roleLabel, sectionTitle, rows, onLogout, logoutSubtitle }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(name)}</Text>
        </View>
        <Text style={styles.name}>{name || 'User'}</Text>
        <Text style={typography.muted}>{email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{roleLabel}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{sectionTitle}</Text>
      <View style={styles.listCard}>
        {rows.map((row, index) => (
          <React.Fragment key={row.title}>
            <TouchableOpacity style={styles.row} onPress={row.onPress}>
              <View style={styles.rowIcon}>
                <Ionicons name={row.icon} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.divider} />
          </React.Fragment>
        ))}

        {/* Log Out — red icon + red label */}
        <TouchableOpacity style={styles.row} onPress={onLogout}>
          <View style={[styles.rowIcon, { backgroundColor: colors.danger + '1A' }]}>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.danger }]}>Log Out</Text>
            <Text style={styles.rowSubtitle}>{logoutSubtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '26',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: colors.primary },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  roleBadge: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary + '1F',
    borderRadius: radius.lg,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleBadgeText: { color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  sectionTitle: { ...typography.subtitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  listCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  rowSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 66 },
});