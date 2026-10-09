import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme/theme';
import { supabase } from '../../supabase/supabaseClient';

export default function SeatAvailabilityScreen({ navigation }) {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeats();
  }, []);

  async function fetchSeats() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('seats').select('*').order('seat_number');
      if (data) setSeats(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity 
        style={[styles.card, !item.is_available && styles.cardDisabled]}
        disabled={!item.is_available}
        onPress={() => navigation.navigate('SelectSeat', { seat: item })}
      >
        <View style={styles.iconBox}>
          <MaterialCommunityIcons name="table-chair" size={24} color={item.is_available ? colors.primary : '#9CA3AF'} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, !item.is_available && { color: '#9CA3AF' }]}>Carrel {item.seat_number}</Text>
          <Text style={styles.subtitle}>{item.room}</Text>
        </View>
        <View style={styles.statusBox}>
          <View style={[styles.dot, { backgroundColor: item.is_available ? '#10B981' : '#EF4444' }]} />
          <Text style={[styles.statusText, { color: item.is_available ? '#10B981' : '#EF4444' }]}>
            {item.is_available ? 'Available' : 'Occupied'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Seats</Text>
        <TouchableOpacity onPress={fetchSeats}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={seats}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.white },
  headerTitle: { ...typography.h1 },
  list: { padding: spacing.md },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, 
    padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border
  },
  cardDisabled: { backgroundColor: '#F9FAFB' },
  iconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFFFFE', justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  info: { flex: 1 },
  title: { ...typography.h2, color: colors.text, marginBottom: 2 },
  subtitle: { ...typography.body, color: colors.textMuted },
  statusBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusText: { fontSize: 10, fontWeight: '700' }
});
