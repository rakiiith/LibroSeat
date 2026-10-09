import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { PrimaryButton } from '../../components/UIKit';
import { NOTIFICATION_STYLES } from './NotificationsScreen';
import { markNotificationRead, subscribeToReservation, getRelatedItem } from './accountService';
import { toJsDate } from '../../hooks/formatDate';

function expiresInText(dueDate) {
  const d = toJsDate(dueDate);
  if (!d) return null;
  const mins = Math.round((d.getTime() - Date.now()) / 60000);
  if (mins <= 0) return 'expired';
  if (mins < 60) return `expires in ${mins} min`;
  return `expires in ${Math.round(mins / 60)} hr`;
}

export default function NotificationDetailScreen({ route, navigation }) {
  const { notification } = route.params;
  const [reservation, setReservation] = useState(null);
  const [item, setItem] = useState(null);

  const s = NOTIFICATION_STYLES[notification.type] || NOTIFICATION_STYLES.default;

  // Mark as read once, on open.
  useEffect(() => {
    if (!notification.isRead) {
      markNotificationRead(notification.id).catch((e) => console.warn('markNotificationRead:', e.message));
    }
  }, [notification.id]);

  // Load the related reservation (if any) and the seat/book it points to.
  useEffect(() => {
    if (!notification.relatedReservationId) return;
    let active = true;
    const unsubscribe = subscribeToReservation(notification.relatedReservationId, (r) => {
      if (!active) return;
      setReservation(r);
      if (r) getRelatedItem(r).then((i) => active && setItem(i));
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [notification.relatedReservationId]);

  const itemTitle = item
    ? reservation?.type === 'seat'
      ? `Seat ${item.seatNumber}`
      : item.title
    : null;
  const itemSub = item
    ? [reservation?.type === 'seat' ? item.room : item.author, expiresInText(reservation?.dueDate)]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.body}>
        <View style={[styles.bigIcon, { backgroundColor: s.color + '26' }]}>
          <Ionicons name={s.icon} size={34} color={s.color} />
        </View>

        <Text style={styles.message}>{notification.message}</Text>

        {itemTitle ? (
          <View style={styles.itemCard}>
            <View style={styles.itemIcon}>
              <Ionicons
                name={reservation?.type === 'seat' ? 'grid-outline' : 'book-outline'}
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{itemTitle}</Text>
              {itemSub ? <Text style={typography.muted}>{itemSub}</Text> : null}
            </View>
          </View>
        ) : null}
      </View>

      {notification.relatedReservationId ? (
        <View style={styles.footer}>
          <PrimaryButton
            title="View Reservation"
            onPress={() =>
              navigation.navigate('ReservationDetail', { reservationId: notification.relatedReservationId })
            }
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, alignItems: 'center', padding: spacing.lg, paddingTop: spacing.xl },
  bigIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.xl,
  },
  itemCard: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  footer: { padding: spacing.lg },
});