import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme/theme';
import { Card } from '../../components/UIKit';
import { useCurrentProfile } from '../../hooks/useCurrentProfile';

function InfoRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={typography.muted}>{label}</Text>
      <Text style={[typography.body, { marginTop: 2 }]}>{value || '—'}</Text>
    </View>
  );
}

export default function PersonalInfoScreen() {
  const { profile } = useCurrentProfile();
  const isStaff = profile?.role === 'staff';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <Card>
          <InfoRow label="Full name" value={profile?.full_name} />
          {!isStaff ? <InfoRow label="Student ID" value={profile?.student_id} /> : null}
          <InfoRow label="Email" value={profile?.email} />
          <InfoRow label="Account type" value={isStaff ? 'Library Staff' : 'Student'} />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg },
  row: { paddingVertical: spacing.sm },
});