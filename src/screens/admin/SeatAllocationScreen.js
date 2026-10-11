import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, PrimaryButton } from '../../components/UIKit';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { getSeatAllocationSettings, saveSeatAllocationSettings } from './adminService';

export default function SeatAllocationScreen() {
  const [minutes, setMinutes] = useState('15'); const [enabled, setEnabled] = useState(true); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  useEffect(() => { getSeatAllocationSettings().then((settings) => { setMinutes(String(settings.grace_period_minutes)); setEnabled(Boolean(settings.auto_release_enabled)); }).catch((e) => setError(e.message || 'Could not load settings.')).finally(() => setLoading(false)); }, []);
  const save = async () => {
    const value = Number(minutes);
    if (!Number.isInteger(value) || value < 1 || value > 240) { setError('Enter a grace period from 1 to 240 minutes.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try { await saveSeatAllocationSettings({ gracePeriodMinutes: value, enabled }); setSuccess('Seat allocation settings saved.'); }
    catch (e) { setError(e.message || 'Could not save settings.'); }
    finally { setSaving(false); }
  };
  return <SafeAreaView style={styles.safe} edges={['bottom']}><View style={styles.container}>
    <Text style={typography.title}>Seat allocation</Text><Text style={typography.muted}>Configure the no-show grace period used by the library.</Text>
    {loading ? <ActivityIndicator color={colors.primary} /> : <>
      <Card style={styles.card}><View style={styles.switchRow}><View style={styles.switchCopy}><Text style={typography.subtitle}>Auto-release policy</Text><Text style={typography.muted}>Enable no-show seat release rules.</Text></View><Switch value={enabled} onValueChange={setEnabled} trackColor={{ true: colors.primary }} /></View>
      <Text style={styles.label}>Grace period (minutes)</Text><TextInput style={styles.input} value={minutes} onChangeText={(v) => setMinutes(v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" maxLength={3} editable={enabled} /><Text style={typography.muted}>A reservation may be released after this many minutes without check-in. A server-side scheduled job is required to enforce this policy automatically.</Text></Card>
      {error ? <Text style={styles.error}>{error}</Text> : null}{success ? <Text style={styles.success}>{success}</Text> : null}
      <PrimaryButton title="Save settings" onPress={save} loading={saving} disabled={saving} />
    </>}
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, container: { padding: spacing.lg, gap: spacing.md }, card: { gap: spacing.md }, switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, switchCopy: { flex: 1, gap: spacing.xs }, label: { ...typography.body, fontWeight: '700' }, input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.background, padding: spacing.md, color: colors.text, fontSize: 18 }, error: { color: colors.danger }, success: { color: colors.success, fontWeight: '700' } });
