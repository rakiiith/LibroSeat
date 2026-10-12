// Screen: Welcome / Onboarding (3 auto-advancing slides)
// Shows only on a cold app start (this screen is the navigator's
// initialRouteName, and every other screen is reached via .replace(),
// so it's never pushed back onto the stack — pressing back from
// RoleSelection/Login exits the app instead of returning here).
//
// Auto-advances through 3 dots on its own and then redirects based on
// whether a Supabase session already exists — no tap required.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme/theme';
import { supabase } from '../../supabase/supabaseClient';
import { getSupabaseProfile } from '../../supabase/authService';

const SLIDE_DURATION_MS = 900; // time each dot is "active" before advancing
const SLIDES = [
  { title: 'LibroSeat', subtitle: 'Reserve. Read. Relax.' },
  { title: 'Find Your Book', subtitle: 'Check availability in real time.' },
  { title: 'Book Your Seat', subtitle: 'Reserve a reading-room spot in seconds.' },
];

export default function WelcomeScreen({ navigation }) {
  const [activeDot, setActiveDot] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let dotIndex = 0;
    const dotTimer = setInterval(() => {
      dotIndex = (dotIndex + 1) % SLIDES.length;
      Animated.sequence([
        Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      setActiveDot(dotIndex);
    }, SLIDE_DURATION_MS);

    const totalTimer = setTimeout(async () => {
      clearInterval(dotTimer);
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user;
        if (user) {
          const profile = await getSupabaseProfile(user);
          if (profile?.role === 'staff') {
            navigation.replace('AdminDashboard');
            return;
          }
          if (profile) {
            navigation.replace('Home');
            return;
          }
        }
      } catch (e) {
        console.warn('Welcome session check failed:', e.message);
      }
      navigation.replace('RoleSelection');
    }, SLIDES.length * SLIDE_DURATION_MS);

    return () => {
      clearInterval(dotTimer);
      clearTimeout(totalTimer);
    };
  }, []);

  const slide = SLIDES[activeDot];

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.container, { opacity: fade }]}>
        <View style={styles.iconCircle}>
          <Ionicons name="library-outline" size={40} color={colors.white} />
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </Animated.View>

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeDot && styles.dotActive]} />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary, justifyContent: 'center' },
  container: { alignItems: 'center', paddingHorizontal: spacing.xl },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...typography.title, color: colors.white, fontSize: 26, textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,0.85)', marginTop: spacing.xs, textAlign: 'center' },
  dotsRow: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: colors.white, width: 18 },
});