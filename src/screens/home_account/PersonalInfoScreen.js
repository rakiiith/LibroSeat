import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as client from '../../supabase/supabaseClient';
import { useCurrentProfile, refreshProfile } from '../../hooks/useCurrentProfile';

const supabase = client.supabase ?? client.default;
const TEAL = '#14919B';
const RED = '#E53935';

const initialsOf = (name) => {
  const p = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  return ((p[0][0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
};

export default function PersonalInfoScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { profile, user, loading } = useCurrentProfile();
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const origName = profile?.full_name || user?.user_metadata?.full_name || '';
  const origId = profile?.student_id || user?.user_metadata?.student_id || '';
  const email = profile?.email || user?.email || '';

  useEffect(() => {
    setFullName(origName);
    setStudentId(origId);
  }, [origName, origId]);

  const dirty = fullName.trim() !== origName || studentId.trim().toUpperCase() !== origId.toUpperCase();

  const validate = () => {
    const e = {};
    const n = fullName.trim();
    const sid = studentId.trim();
    if (n.length < 2) e.name = 'Please enter your full name.';
    else if (n.length > 60) e.name = 'Name is too long.';
    else if (/\d/.test(n)) e.name = 'Name should not contain numbers.';
    if (!/^[A-Za-z0-9]{6,15}$/.test(sid)) e.studentId = 'Use 6 to 15 letters or digits, for example IT23548282.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const n = fullName.trim();
      const sid = studentId.trim().toUpperCase();
      const { data, error } = await supabase
        .from('profiles')
        .update({ full_name: n, student_id: sid })
        .eq('id', user.id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Your changes could not be saved.');
      await supabase.auth.updateUser({ data: { full_name: n, student_id: sid } });
      refreshProfile();
      Alert.alert('Saved', 'Your personal information has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setErrors({ form: err?.message || 'Could not save your changes. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <View style={[s.header, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
        <Ionicons name="arrow-back" size={24} color="#1F2937" />
      </Pressable>
      <Text style={s.headerTitle}>Personal Information</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F7FAFB' }}>
        {header}
        <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (profile?.role === 'staff') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F7FAFB' }}>
        {header}
        <Text style={s.staffMsg}>Profile editing is available for student accounts only. Staff details are managed by the administration.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F7FAFB' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initialsOf(fullName)}</Text>
          </View>
        </View>

        <Text style={s.label}>Full name</Text>
        <TextInput
          style={[s.input, errors.name && s.inputErr]}
          value={fullName}
          onChangeText={(t) => { setFullName(t); setErrors((e) => ({ ...e, name: undefined, form: undefined })); }}
          placeholder="Your full name"
          autoCapitalize="words"
          autoComplete="name"
        />
        {!!errors.name && <Text style={s.error}>{errors.name}</Text>}

        <Text style={s.label}>Student ID</Text>
        <TextInput
          style={[s.input, errors.studentId && s.inputErr]}
          value={studentId}
          onChangeText={(t) => { setStudentId(t); setErrors((e) => ({ ...e, studentId: undefined, form: undefined })); }}
          placeholder="e.g. IT23548282"
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {!!errors.studentId && <Text style={s.error}>{errors.studentId}</Text>}

        <Text style={s.label}>Email</Text>
        <View style={[s.input, s.locked]}>
          <Text style={{ color: '#6B7280', flex: 1 }} numberOfLines={1}>{email}</Text>
          <Ionicons name="lock-closed-outline" size={16} color="#9CA3AF" />
        </View>
        <Text style={s.note}>Your email is your login, so it can't be changed here.</Text>

        {!!errors.form && <Text style={[s.error, { marginTop: 14 }]}>{errors.form}</Text>}

        <Pressable style={[s.save, (!dirty || saving) && { opacity: 0.5 }]} onPress={save} disabled={!dirty || saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveText}>Save Changes</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: '#1F2937', marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1F2937',
  },
  inputErr: { borderColor: RED },
  locked: { backgroundColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center' },
  note: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  error: { color: RED, fontSize: 13, marginTop: 6 },
  save: { backgroundColor: TEAL, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 26 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  staffMsg: { padding: 24, fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
});