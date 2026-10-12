import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme/theme';
import ProfileView from '../../components/ProfileView';
import LogoutConfirmModal from '../../components/LogoutConfirmModal';
import { useCurrentProfile } from '../../hooks/useCurrentProfile';
import { signOutAccount } from '../../supabase/authService';

export default function ProfileScreen({ navigation }) {
  const { profile } = useCurrentProfile();
  const [logoutVisible, setLogoutVisible] = useState(false);

  const handleConfirmLogout = async () => {
    try {
      await signOutAccount();
    } catch (e) {
      console.warn('Logout failed:', e.message);
    } finally {
      setLogoutVisible(false);
      // Logout lands on the login chooser, never the Welcome slides.
      navigation.getParent()?.reset({ index: 0, routes: [{ name: 'RoleSelection' }] });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={typography.title}>My Profile</Text>
      </View>

      <ProfileView
        name={profile?.full_name}
        email={profile?.email}
        roleLabel="STUDENT"
        sectionTitle="Account"
        logoutSubtitle="Sign out of your LibroSeat account"
        onLogout={() => setLogoutVisible(true)}
        rows={[
          {
            icon: 'person-outline',
            title: 'Personal Information',
            subtitle: 'Name, student ID and email',
            onPress: () => navigation.navigate('PersonalInfo'),
          },
          {
            icon: 'calendar-outline',
            title: 'Reservation History',
            subtitle: 'View previous bookings',
            onPress: () => navigation.navigate('MyReservations'),
          },
          {
            icon: 'settings-outline',
            title: 'Settings',
            subtitle: 'Notifications and preferences',
            onPress: () => navigation.navigate('Settings'),
          },
        ]}
      />

      <LogoutConfirmModal
        visible={logoutVisible}
        title="Log Out?"
        message="Are you sure you want to log out of your LibroSeat account?"
        onCancel={() => setLogoutVisible(false)}
        onConfirm={handleConfirmLogout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});