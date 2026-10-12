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
import { signInStudent } from '../../supabase/authService';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      runShake();
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signInStudent(email, password);
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (e) {
      console.warn('Student login failed:', e.message);
      setError('Incorrect email or password. Please try again.');
      runShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Animated.View style={[styles.container, { transform: [{ translateX: shake }] }]}>
          <Ionicons name="lock-closed-outline" size={32} color={colors.primary} style={styles.icon} />
          <Text style={typography.title}>Welcome Back</Text>
          <Text style={typography.muted}>Log in to continue as a student</Text>

          <Text style={styles.label}>Student Email or ID</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="sanduni@university.edu"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
          />

          <View style={styles.labelRow}>
            <Text style={styles.label}>Password</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.link}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.passwordRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              autoCapitalize="none"
              textContentType="password"
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPassword((s) => !s)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={{ marginTop: spacing.md }}>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <PrimaryButton title="Log In" onPress={handleLogin} />
            )}
          </View>

          <Text style={styles.orText}>or</Text>

          <OutlineButton title="Log in as Admin" onPress={() => navigation.navigate('StaffLogin')} />

          <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={{ marginTop: spacing.lg }}>
            <Text style={typography.muted}>
              Don't have an account? <Text style={styles.link}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  icon: { alignSelf: 'center', marginBottom: spacing.sm },
  label: { ...typography.muted, marginTop: spacing.md, marginBottom: spacing.xs },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeButton: { padding: spacing.sm },
  link: { color: colors.primary, fontWeight: '600' },
  error: { color: colors.danger, marginTop: spacing.sm },
  orText: { textAlign: 'center', color: colors.textMuted, marginVertical: spacing.md },
});