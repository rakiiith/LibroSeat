import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme/theme';
import { PrimaryButton } from '../../components/UIKit';
import { confirmPasswordReset } from '../../supabase/authService';

export default function ResetPasswordScreen({ route, navigation }) {
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!code.trim() || newPassword.length < 6) {
      setError('Enter the code from your email and a password of at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await confirmPasswordReset(email, code, newPassword);
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (e) {
      console.warn('confirmPasswordReset failed:', e.message);
      setError('That code is invalid or expired. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Ionicons name="shield-checkmark-outline" size={32} color={colors.primary} style={styles.icon} />
        <Text style={typography.title}>Enter Reset Code</Text>
        <Text style={typography.muted}>We sent a 6-digit code to {email}</Text>

        <Text style={styles.label}>Reset Code</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="123456"
          style={styles.input}
          keyboardType="number-pad"
          maxLength={6}
        />

        <Text style={styles.label}>New Password</Text>
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="••••••••"
          secureTextEntry
          style={styles.input}
          autoCapitalize="none"
          textContentType="newPassword"
          autoComplete="password-new"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ marginTop: spacing.lg }}>
          {loading ? <ActivityIndicator color={colors.primary} /> : <PrimaryButton title="Reset Password" onPress={handleReset} />}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  icon: { alignSelf: 'center', marginBottom: spacing.sm },
  label: { ...typography.muted, marginTop: spacing.lg, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  error: { color: colors.danger, marginTop: spacing.sm },
});