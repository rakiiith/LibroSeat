import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme/theme';
import { PrimaryButton } from '../../components/UIKit';
import { requestPasswordReset } from '../../supabase/authService';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await requestPasswordReset(email);
      navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() });
    } catch (e) {
      console.warn('requestPasswordReset failed:', e.message);
      setError('Could not send a reset code. Please check the email and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Ionicons name="key-outline" size={32} color={colors.primary} style={styles.icon} />
        <Text style={typography.title}>Reset Password</Text>
        <Text style={typography.muted}>
          Enter your email and we'll send you a 6-digit code to reset your password.
        </Text>

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

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ marginTop: spacing.lg }}>
          {loading ? <ActivityIndicator color={colors.primary} /> : <PrimaryButton title="Send Reset Code" onPress={handleSend} />}
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