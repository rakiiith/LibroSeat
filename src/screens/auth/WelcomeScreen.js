import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as client from '../../supabase/supabaseClient';
import { getSupabaseProfile } from '../../supabase/authService';

const supabase = client.supabase ?? client.default;
const MIN_SPLASH_MS = 1200;

async function resolveTarget() {
  try {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    if (!user) return 'RoleSelection';
    const profile = await getSupabaseProfile(user.id);
    if (profile?.role === 'staff') return 'AdminDashboard';
    if (profile) return 'Home';
    return 'RoleSelection';
  } catch (e) {
    return 'RoleSelection';
  }
}

export default function WelcomeScreen({ navigation }) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();

    let active = true;
    const wait = new Promise((r) => setTimeout(r, MIN_SPLASH_MS));
    Promise.all([wait, resolveTarget()]).then(([, target]) => {
      if (active) navigation.reset({ index: 0, routes: [{ name: target }] });
    });
    return () => {
      active = false;
    };
  }, [navigation, fade, scale]);

  return (
    <View style={s.container}>
      <Animated.View style={{ alignItems: 'center', opacity: fade, transform: [{ scale }] }}>
        <View style={s.logo}>
          <Ionicons name="library-outline" size={54} color="#fff" />
        </View>
        <Text style={s.name}>LibroSeat</Text>
        <Text style={s.tag}>Reserve books. Book seats.</Text>
      </Animated.View>
      <ActivityIndicator color="#fff" style={s.spinner} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#14919B', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 104, height: 104, borderRadius: 52, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  name: { fontSize: 34, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  tag: { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  spinner: { position: 'absolute', bottom: 70 },
});