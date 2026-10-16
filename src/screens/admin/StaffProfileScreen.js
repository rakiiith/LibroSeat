import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme/theme';
import ProfileView from '../../components/ProfileView';
import LogoutConfirmModal from '../../components/LogoutConfirmModal';
import { useCurrentProfile } from '../../hooks/useCurrentProfile';
import { signOutAccount } from '../../supabase/authService';

export default function StaffProfileScreen({ navigation }) {
  const { profile } = useCurrentProfile();
  const [logoutVisible, setLogoutVisible] = useState(false);

  const handleConfirmLogout = async () => {
    try {
      await signOutAccount();
    } catch (e) {
      console.warn('Logout failed:', e.message);
    } finally {
      setLogoutVisible(false);
      const rootNav = navigation.getParent() || navigation;
      rootNav.reset({ index: 0, routes: [{ name: 'RoleSelection' }] });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminDashboard'))}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back to Admin Dashboard"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[typography.title, { flex: 1 }]}>Staff Profile</Text>
        <View style={styles.staffBadge}>
          <Text style={styles.staffBadgeText}>STAFF</Text>
        </View>
      </View>

      <ProfileView
        name={profile?.full_name}
        email={profile?.email}
        roleLabel="LIBRARY ADMIN"
        sectionTitle="Staff Account"
        logoutSubtitle="Sign out of the staff portal"
        onLogout={() => setLogoutVisible(true)}
        rows={[
          {
            icon: 'person-outline',
            title: 'Staff Information',
            subtitle: 'View account details',
            onPress: () => navigation.navigate('PersonalInfo'),
          },
          {
            icon: 'shield-checkmark-outline',
            title: 'Admin Dashboard',
            subtitle: 'Return to portal overview',
            onPress: () => navigation.navigate('AdminDashboard', { screen: 'AdminHome' }),
          },
          {
            icon: 'settings-outline',
            title: 'Settings',
            subtitle: 'Account and notifications',
            onPress: () => navigation.navigate('Settings'),
          },
        ]}
      />

      <LogoutConfirmModal
        visible={logoutVisible}
        title="Log Out?"
        message="Are you sure you want to log out of the Admin Portal?"
        onCancel={() => setLogoutVisible(false)}
        onConfirm={handleConfirmLogout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    paddingRight: spacing.xs,
    cursor: 'pointer',
  },
  staffBadge: {
    backgroundColor: colors.primary + '22',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  staffBadgeText: { color: colors.primary, fontSize: 10, fontWeight: '700' },
});