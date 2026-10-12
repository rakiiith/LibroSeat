import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestPasswordReset, confirmPasswordReset, signOutAccount } from '../../supabase/authService';

const TEAL = '#14919B';
const RED = '#E53935';

export default function ResetPasswordScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState(route?.params?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const clear = (k) => setErrors((e) => ({ ...e, [k]: undefined, form: undefined }));

  const validate = () => {
    const e = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter the email you used to sign up.';
    if (!/^\d{6,10}$/.test(code.trim())) e.code = 'Enter the code from your email.';
    if (password.length < 6) e.password = 'Password must be at least 6 characters.';
    if (confirm !== password) e.confirm = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      await confirmPasswordReset({ email: email.trim().toLowerCase(), token: code.trim(), newPassword: password });
      try { await signOutAccount(); } catch (e) { /* ignore */ }
      Alert.alert('Password updated', 'Please log in with your new password.', [
        { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) },
      ]);
    } catch (err) {
      setErrors({ form: err?.message || 'Could not reset your password. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrors({ email: 'Enter your email first.' });
      return;
    }
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setInfo('A new code has been sent.');
      setCooldown(60);
    } catch (err) {
      setErrors({ form: err?.message || 'Could not resend the code.' });
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ marginBottom: 24 }}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>

        <View style={s.iconWrap}>
          <Ionicons name="key-outline" size={34} color={TEAL} />
        </View>
        <Text style={s.title}>Reset password</Text>
        <Text style={s.sub}>Enter the code we emailed you and choose a new password.</Text>

        <Text style={s.label}>Email</Text>
        <TextInput
          style={[s.input, errors.email && s.err]}
          value={email}
          onChangeText={(t) => { setEmail(t); clear('email'); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="you@example.com"
        />
        {!!errors.email && <Text style={s.error}>{errors.email}</Text>}

        <Text style={s.label}>Code</Text>
        <TextInput
          style={[s.input, s.codeInput, errors.code && s.err]}
          value={code}
          onChangeText={(t) => { setCode(t.replace(/\D/g, '')); clear('code'); }}
          keyboardType="number-pad"
          maxLength={10}
          placeholder="123456"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
        />
        {!!errors.code && <Text style={s.error}>{errors.code}</Text>}

        <Text style={s.label}>New password</Text>
        <View style={[s.input, s.row, errors.password && s.err]}>
          <TextInput
            style={{ flex: 1, fontSize: 15, color: '#1F2937', padding: 0 }}
            value={password}
            onChangeText={(t) => { setPassword(t); clear('password'); }}
            secureTextEntry={!show}
            autoCapitalize="none"
            placeholder="At least 6 characters"
          />
          <Pressable onPress={() => setShow((v) => !v)} hitSlop={10}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
          </Pressable>
        </View>
        {!!errors.password && <Text style={s.error}>{errors.password}</Text>}

        <Text style={s.label}>Confirm new password</Text>
        <TextInput
          style={[s.input, errors.confirm && s.err]}
          value={confirm}
          onChangeText={(t) => { setConfirm(t); clear('confirm'); }}
          secureTextEntry={!show}
          autoCapitalize="none"
          placeholder="Repeat the password"
        />
        {!!errors.confirm && <Text style={s.error}>{errors.confirm}</Text>}

        {!!errors.form && <Text style={[s.error, { marginTop: 14 }]}>{errors.form}</Text>}
        {!!info && !errors.form && <Text style={[s.error, { color: '#2E9E5B', marginTop: 14 }]}>{info}</Text>}

        <Pressable style={[s.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Update Password</Text>}
        </Pressable>

        <Pressable onPress={resend} disabled={cooldown > 0} style={{ marginTop: 18 }}>
          <Text style={[s.link, cooldown > 0 && { color: '#9CA3AF' }]}>
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  iconWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#E3F4F5', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { fontSize: 26, fontWeight: '800', color: '#1F2937' },
  sub: { fontSize: 15, color: '#6B7280', marginTop: 8, marginBottom: 12, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '600', color: '#1F2937', marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#1F2937', backgroundColor: '#F9FAFB' },
  codeInput: { textAlign: 'center', fontSize: 22, letterSpacing: 6, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
  err: { borderColor: RED },
  error: { color: RED, fontSize: 13, marginTop: 6 },
  btn: { backgroundColor: TEAL, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  link: { color: TEAL, fontWeight: '600', textAlign: 'center', fontSize: 14 },
});