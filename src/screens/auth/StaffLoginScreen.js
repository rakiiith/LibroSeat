import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme/theme';
import { PrimaryButton, OutlineButton } from '../../components/UIKit';
import { signInStaff } from '../../supabase/authService';

export default function StaffLoginScreen({ navigation }) {
  const [staffId, setStaffId] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  const runShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!staffId.trim() || !password) {
      setError('Invalid staff ID or password.');
      runShake();
      return;
    }
    
    // HARDCODED CREDENTIAL
    if (staffId.trim().toLowerCase() === 'admin' && password === 'admin') {
      navigation.reset({ index: 0, routes: [{ name: 'AdminDashboard' }] });
      return;
    }

    setLoading(true);
    setError('');
    try {
      await signInStaff(staffId, password);
      navigation.reset({ index: 0, routes: [{ name: 'AdminDashboard' }] });
    } catch (e) {
      console.warn('Staff login failed:', e.message);
      setError('Invalid staff ID or password.');
      runShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Animated.View style={[styles.container, { transform: [{ translateX: shake }] }]}>
          <View style={styles.iconBox}>
            <Ionicons name="shield-checkmark-outline" size={28} color={colors.white} />
          </View>
          <Text style={typography.title}>Library Staff Portal</Text>
          <Text style={typography.muted}>Administrative Circulation & Holdings System</Text>

          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>NODE 04 • MAIN BRANCH ILS</Text>
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>STAFF LOGIN</Text>
            <View style={styles.sslBadge}>
              <Text style={styles.sslText}>SSL 256-Bit</Text>
            </View>
          </View>

          <Text style={styles.label}>STAFF ID</Text>
          <TextInput
            value={staffId}
            onChangeText={setStaffId}
            placeholder="LIB-1042"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            autoComplete="username"
          />

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.passwordRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••••"
              secureTextEntry={!showPassword}
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPassword((s) => !s)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.rememberRow}>
            <TouchableOpacity style={styles.checkRow} onPress={() => setRememberDevice((r) => !r)}>
              <Ionicons
                name={rememberDevice ? 'checkbox' : 'square-outline'}
                size={18}
                color={rememberDevice ? colors.primary : colors.textMuted}
              />
              <Text style={styles.rememberText}>Remember device</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.link}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={{ marginTop: spacing.md }}>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <PrimaryButton title="Login →" onPress={handleLogin} />
            )}
          </View>

          <View style={{ marginTop: spacing.sm }}>
            <OutlineButton title="Log in as User" onPress={() => navigation.navigate('RoleSelection')} />
          </View>

          <Text style={styles.footerText}>Need help? Contact IT Helpdesk (ext. 4401)</Text>
          <Text style={styles.footerCaption}>AUTHORIZED STAFF ACCESS ONLY</Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  iconBox: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  statusText: { fontSize: 11, color: colors.textMuted, letterSpacing: 0.5 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  sslBadge: { backgroundColor: colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  sslText: { fontSize: 10, color: colors.textMuted },
  label: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeButton: { padding: spacing.sm },
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rememberText: { fontSize: 13, color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  error: { color: colors.danger, marginTop: spacing.sm },
  footerText: { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: spacing.lg },
  footerCaption: { textAlign: 'center', color: colors.textMuted, fontSize: 10, marginTop: 4, letterSpacing: 0.5 },
});