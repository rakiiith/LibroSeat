import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TEAL = '#14919B';

const TERMS = [
  {
    title: '1. Using LibroSeat',
    body: 'LibroSeat lets students search library books, reserve books and reserve reading-room seats. By creating an account you confirm that the name, student ID and email you give are your own and are accurate.',
  },
  {
    title: '2. Reservations',
    body: 'A reservation holds a book or seat for a limited time. Please collect your book or arrive for your seat on time. Reservations that are not collected can expire, and unused seats can be released so other students can use them. You can cancel a reservation from My Reservations at any time.',
  },
  {
    title: '3. Your account',
    body: 'Keep your password private and do not share your account. Your email address is your login and cannot be changed in the app. You can update your name and student ID from your profile.',
  },
  {
    title: '4. Fair use',
    body: 'Do not make reservations you do not plan to use, and do not try to access other students\' data or change the app\'s records. Library staff may cancel reservations or limit accounts that misuse the service.',
  },
  {
    title: '5. Changes',
    body: 'We may update these terms as the app improves. Continuing to use LibroSeat after an update means you accept the new version.',
  },
];

const PRIVACY = [
  {
    title: 'What we collect',
    bullets: [
      'Personal details: your full name, student ID and email address.',
      'Booking and reservation history: the books and seats you reserve, their status (confirmed, collected, cancelled, expired) and dates.',
      'Search history: the books and categories you search for.',
      'Errors and usage data: error messages and technical information about problems in the app.',
    ],
  },
  {
    title: 'Why we collect it',
    bullets: [
      'To create your account and let you sign in.',
      'To make, show and manage your reservations, and to send you notifications about them.',
      'To understand how the app is used, fix errors and improve the user experience.',
    ],
  },
  {
    title: 'Who can see it',
    body: 'Library staff can see reservations so they can manage books and seats. Other students cannot see your details or reservations. We do not sell your personal information.',
  },
  {
    title: 'How it is protected',
    body: 'Your data is stored in a secured online database. Access rules make sure each student can only read and change their own information.',
  },
  {
    title: 'Your choices',
    body: 'You can edit your name and student ID in your profile, and you can delete notifications and cancel reservations yourself. To have your account removed, contact the library administration.',
  },
];

export default function TermsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(route?.params?.tab === 'privacy' ? 'privacy' : 'terms');

  const goBackToSignUp = (accepted) => {
    if (accepted) navigation.navigate('SignUp', { acceptedTerms: true });
    else navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F7FAFB' }}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => goBackToSignUp(false)} hitSlop={12} style={s.back}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>
        <Text style={s.headerTitle}>Terms & Privacy</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.tabs}>
        {[['terms', 'Terms & Conditions'], ['privacy', 'Privacy Policy']].map(([key, label]) => (
          <Pressable key={key} style={[s.tab, tab === key && s.tabActive]} onPress={() => setTab(key)}>
            <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
        <Text style={s.updated}>Last updated: 15 October 2026</Text>

        {tab === 'terms' &&
          TERMS.map((sec) => (
            <View key={sec.title} style={s.section}>
              <Text style={s.secTitle}>{sec.title}</Text>
              <Text style={s.body}>{sec.body}</Text>
            </View>
          ))}

        {tab === 'privacy' &&
          PRIVACY.map((sec) => (
            <View key={sec.title} style={s.section}>
              <Text style={s.secTitle}>{sec.title}</Text>
              {sec.body ? <Text style={s.body}>{sec.body}</Text> : null}
              {sec.bullets
                ? sec.bullets.map((b) => (
                    <View key={b} style={s.bulletRow}>
                      <Text style={s.bullet}>•</Text>
                      <Text style={[s.body, { flex: 1 }]}>{b}</Text>
                    </View>
                  ))
                : null}
            </View>
          ))}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={s.primary} onPress={() => goBackToSignUp(true)}>
          <Text style={s.primaryText}>I Understand, Back to Sign Up</Text>
        </Pressable>
        <Pressable onPress={() => goBackToSignUp(false)} style={{ paddingVertical: 10 }}>
          <Text style={s.secondaryText}>Go back without agreeing</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, backgroundColor: '#fff' },
  back: { width: 24 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: TEAL },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: TEAL },
  updated: { fontSize: 12, color: '#9CA3AF', marginBottom: 14 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  secTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  body: { fontSize: 14, color: '#4B5563', lineHeight: 21 },
  bulletRow: { flexDirection: 'row', marginTop: 6 },
  bullet: { color: TEAL, fontWeight: '700', marginRight: 8, lineHeight: 21 },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  primary: { backgroundColor: TEAL, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryText: { color: '#6B7280', fontWeight: '600', textAlign: 'center', fontSize: 14 },
});