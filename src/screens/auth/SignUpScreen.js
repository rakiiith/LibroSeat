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
import { PrimaryButton } from '../../components/UIKit';
import { signUpStudent } from '../../supabase/authService';

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function SignUpScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
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

  const canSubmit = fullName.trim() && studentId.trim() && isValidEmail(email.trim()) && password.length >= 6 && agreed;

  const handleSignUp = async () => {
    if (!fullName.trim() || !studentId.trim()) {
      setError('Please fill in your name and student ID.');
      runShake();
      return;
    }
    if (!isValidEmail(email.trim())) {
      setError('Please enter a valid email address.');
      runShake();
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      runShake();
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signUpStudent(fullName, studentId, email, password);
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (e) {
      console.warn('Sign up failed:', e.message);
      if (e.message?.toLowerCase().includes('already registered')) {
        setError('An account with this email already exists.');
      } else {
        setError(e.message || 'Could not create your account. Please try again.');
      }
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
          <Text style={typography.title}>Create Account</Text>
          <Text style={typography.muted}>Sign up to start reserving books & seats</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Sanduni Wickramasinghe"
            style={styles.input}
            textContentType="name"
            autoComplete="name"
          />

          <Text style={styles.label}>Student ID</Text>
          <TextInput
            value={studentId}
            onChangeText={setStudentId}
            placeholder="2021CS045"
            style={styles.input}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Email</Text>
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

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              autoCapitalize="none"
              textContentType="newPassword"
              autoComplete="password-new"
            />
            <TouchableOpacity onPress={() => setShowPassword((s) => !s)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.checkRow} onPress={() => setAgreed((a) => !a)}>
            <Ionicons
              name={agreed ? 'checkbox' : 'square-outline'}
              size={20}
              color={agreed ? colors.primary : colors.textMuted}
            />
            <Text style={styles.checkText}>
              I agree to the <Text style={styles.link}>Terms & Conditions</Text> and{' '}
              <Text style={styles.link}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={{ marginTop: spacing.md }}>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <PrimaryButton title="Sign Up" onPress={handleSignUp} disabled={!canSubmit} />
            )}
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing.lg }}>
            <Text style={typography.muted}>
              Already have an account? <Text style={styles.link}>Log In</Text>
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeButton: { padding: spacing.sm },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm },
  checkText: { flex: 1, color: colors.textMuted, fontSize: 13 },
  link: { color: colors.primary, fontWeight: '600' },
  error: { color: colors.danger, marginTop: spacing.sm },
});