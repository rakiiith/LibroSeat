import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestPasswordReset } from '../../supabase/authService';

const TEAL = '#14919B';
const RED = '#E53935';

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (e.endsWith('@libroseat-staff.local')) {
      setError('Staff passwords are reset by the library administration.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await requestPasswordReset(e);
      navigation.navigate('ResetPassword', { email: e });
    } catch (err) {
      setError(err?.message || 'Could not send the code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 12 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ marginBottom: 24 }}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>

        <View style={s.iconWrap}>
          <Ionicons name="mail-outline" size={34} color={TEAL} />
        </View>
        <Text style={s.title}>Forgot password?</Text>
        <Text style={s.sub}>Enter the email you signed up with. We'll send you a 6-digit code to reset your password.</Text>

        <Text style={s.label}>Email</Text>
        <TextInput
          style={[s.input, !!error && { borderColor: RED }]}
          value={email}
          onChangeText={(t) => { setEmail(t); setError(''); }}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />
        {!!error && <Text style={s.error}>{error}</Text>}

        <Pressable style={[s.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Send Code</Text>}
        </Pressable>

        <Pressable onPress={() => navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() })} style={{ marginTop: 18 }}>
          <Text style={s.link}>I already have a code</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  iconWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#E3F4F5', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { fontSize: 26, fontWeight: '800', color: '#1F2937' },
  sub: { fontSize: 15, color: '#6B7280', marginTop: 8, marginBottom: 24, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '600', color: '#1F2937', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#1F2937', backgroundColor: '#F9FAFB' },
  error: { color: RED, fontSize: 13, marginTop: 8 },
  btn: { backgroundColor: TEAL, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 22 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  link: { color: TEAL, fontWeight: '600', textAlign: 'center', fontSize: 14 },
});