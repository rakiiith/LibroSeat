import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, PrimaryButton } from '../../components/UIKit';
import { colors, radius, spacing, typography } from '../../theme/theme';

export default function BookConfirmationScreen({ route, navigation }) {
  const { book, reservationId } = route.params ?? {};
  return <SafeAreaView style={styles.safe} edges={['bottom']}><View style={styles.container}>
    <View style={styles.success}><Ionicons name="checkmark" size={44} color={colors.white} /></View>
    <Text style={styles.title}>Reservation confirmed</Text>
    <Text style={typography.muted}>Your book hold has been placed.</Text>
    <Card style={styles.card}><Text style={typography.subtitle}>{book?.title || 'Book reservation'}</Text><Text style={typography.muted}>by {book?.author || 'Unknown author'}</Text>{reservationId ? <Text style={styles.id}>Reservation #{String(reservationId).slice(0, 8).toUpperCase()}</Text> : null}</Card>
    <PrimaryButton title="View my reservations" onPress={() => navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'MyReservations' }] })} />
    <Text onPress={() => navigation.navigate('SearchBooks')} style={styles.link}>Continue browsing books</Text>
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, container: { flex: 1, padding: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.md }, success: { width: 82, height: 82, borderRadius: 41, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' }, title: { ...typography.title, fontSize: 25, textAlign: 'center' }, card: { alignSelf: 'stretch', gap: spacing.sm }, id: { ...typography.muted, marginTop: spacing.xs }, link: { color: colors.primary, fontWeight: '700', padding: spacing.sm } });
