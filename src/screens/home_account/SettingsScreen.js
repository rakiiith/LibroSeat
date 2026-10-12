import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, typography } from '../../theme/theme';
import { Card } from '../../components/UIKit';

const KEY_NOTIFS = 'settings.notificationsEnabled';
const KEY_REMINDERS = 'settings.expiryReminders';

function ToggleRow({ label, hint, value, onValueChange }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <Text style={typography.body}>{label}</Text>
        <Text style={typography.muted}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary, false: colors.border }}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const [notifs, setNotifs] = useState(true);
  const [reminders, setReminders] = useState(true);

  useEffect(() => {
    AsyncStorage.multiGet([KEY_NOTIFS, KEY_REMINDERS]).then((pairs) => {
      const [n, r] = pairs;
      if (n[1] !== null) setNotifs(n[1] === 'true');
      if (r[1] !== null) setReminders(r[1] === 'true');
    });
  }, []);

  const update = (key, setter) => (value) => {
    setter(value);
    AsyncStorage.setItem(key, String(value));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <Card>
          <ToggleRow
            label="Push notifications"
            hint="Reservation updates and alerts"
            value={notifs}
            onValueChange={update(KEY_NOTIFS, setNotifs)}
          />
          <View style={styles.divider} />
          <ToggleRow
            label="Expiry reminders"
            hint="Warn me before a seat or book expires"
            value={reminders}
            onValueChange={update(KEY_REMINDERS, setReminders)}
          />
        </Card>
        <Text style={[typography.muted, { textAlign: 'center', marginTop: spacing.lg }]}>LibroSeat v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
});