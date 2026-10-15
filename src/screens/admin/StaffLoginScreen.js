import React, { useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signInStaff } from '../../supabase/authService';
import { OutlineButton, PrimaryButton } from '../../components/UIKit';
import { colors, radius, spacing, typography } from '../../theme/theme';

export default function StaffLoginScreen({ navigation }) {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  const runShake = () => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 8, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = async () => {
    if (!staffId.trim() || !password) {
      setError('Invalid staff ID or password.');
      runShake();
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Temporary convention lives in authService: staff ID maps to `${staffId}@libroseat-staff.local`.
      await signInStaff(staffId, password);
      navigation.reset({ index: 0, routes: [{ name: 'AdminDashboard' }] });
    } catch (e) {
      setError(e?.message || 'Invalid staff ID or password.');
      runShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconBox}>
              <Ionicons name="shield-checkmark-outline" size={34} color={colors.primary} />
            </View>
            <Text style={styles.title}>Library Staff Portal</Text>
            <Text style={styles.subtitle}>Administrative Circulation & Holdings System</Text>

            <View style={styles.statusRow}>
              <View style={styles.greenDot} />
              <Text style={styles.statusText}>NODE 04 - MAIN BRANCH ILS</Text>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Staff login</Text>
              <Text style={styles.badge}>SSL 256-Bit</Text>
            </View>

            <Animated.View style={{ transform: [{ translateX: shake }] }}>
              <Text style={styles.inputLabel}>STAFF ID</Text>
              <Field icon="id-card-outline" value={staffId} onChangeText={setStaffId} autoCapitalize="characters" />
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <Field
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onRightPress={() => setShowPassword((current) => !current)}
              />
            </Animated.View>

            <View style={styles.optionRow}>
              <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberDevice((current) => !current)}>
                <View style={[styles.checkbox, rememberDevice && styles.checkboxOn]}>
                  {rememberDevice ? <Ionicons name="checkmark" size={15} color={colors.white} /> : null}
                </View>
                <Text style={typography.muted}>Remember device</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.link}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton title="Login ->" onPress={handleSubmit} disabled={loading} loading={loading} />
            <OutlineButton title="Log in as User" onPress={() => navigation.navigate('RoleSelection')} disabled={loading} />

            <Text style={styles.help}>Need help? Contact IT Helpdesk (ext. 4401)</Text>
            <Text style={styles.accessOnly}>AUTHORIZED STAFF ACCESS ONLY</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ icon, rightIcon, onRightPress, ...props }) {
  return (
    <View style={styles.inputWrap}>
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <TextInput style={styles.input} placeholderTextColor={colors.textMuted} {...props} />
      {rightIcon ? (
        <TouchableOpacity onPress={onRightPress}>
          <Ionicons name={rightIcon} size={20} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '14',
  },
  title: { ...typography.title, fontSize: 26 },
  subtitle: { ...typography.muted, lineHeight: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  greenDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.success },
  statusText: { ...typography.muted, fontSize: 12, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { ...typography.subtitle },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.lg,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: colors.primary + '14',
  },
  inputLabel: { ...typography.muted, fontSize: 12, fontWeight: '800', marginBottom: spacing.xs },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.background,
  },
  input: { flex: 1, paddingVertical: 14, color: colors.text },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: {
    width: 21,
    height: 21,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  link: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  error: { color: colors.danger, fontSize: 13 },
  help: { ...typography.muted, textAlign: 'center' },
  accessOnly: { color: colors.textMuted, textAlign: 'center', fontSize: 11, fontWeight: '800' },
});
