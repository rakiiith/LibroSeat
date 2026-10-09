import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { C, timeAgo } from '../../theme/ui';
import { subscribeToNotificationList, markRead, deleteNotification } from './accountExtras';

const mk = (icon, color, bg, label) => ({
  icon, iconName: icon, color, tint: color, bg, background: bg, backgroundColor: bg, label, title: label,
});

export const NOTIFICATION_STYLES = {
  expiry: mk('time-outline', '#E53935', '#FDECEA', 'Reservation expiry'),
  pickup: mk('book-outline', '#14919B', '#E3F4F5', 'Ready for pickup'),
  released: mk('swap-horizontal-outline', '#F59E0B', '#FEF3C7', 'Released'),
  confirmation: mk('checkmark-circle-outline', '#2E9E5B', '#E6F6EC', 'Confirmation'),
  default: mk('notifications-outline', '#6B7280', '#F3F4F6', 'Notification'),
};

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const userId = useCurrentUserId();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return undefined;
    return subscribeToNotificationList(
      userId,
      (rows) => {
        setItems(rows);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [userId]);

  const open = (item) => {
    if (!item.isRead) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
      markRead(item.id);
    }
    navigation.navigate('NotificationDetail', {
      notification: { ...item, isRead: true },
      notificationId: item.id,
      id: item.id,
    });
  };

  const confirmDelete = (item) => {
    Alert.alert('Delete notification', 'Do you want to delete this notification?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const before = items;
          setItems((prev) => prev.filter((n) => n.id !== item.id));
          try {
            await deleteNotification(item.id);
          } catch (e) {
            setItems(before);
            Alert.alert('Error', 'Could not delete the notification. Please try again.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const st = NOTIFICATION_STYLES[item.type] || NOTIFICATION_STYLES.default;
    return (
      <Pressable
        onPress={() => open(item)}
        onLongPress={() => confirmDelete(item)}
        delayLongPress={400}
        style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]}
      >
        <View style={[s.icon, { backgroundColor: st.bg }]}>
          <Ionicons name={st.icon} size={22} color={st.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.msg, !item.isRead && { fontWeight: '700' }]} numberOfLines={3}>
            {item.message}
          </Text>
          <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
        </View>
        {!item.isRead && <View style={s.dot} />}
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 12 }}>
      <Text style={s.title}>Notifications</Text>
      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingTop: 8, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Ionicons name="notifications-off-outline" size={48} color={C.muted} />
              <Text style={[s.hint, { marginTop: 12, paddingHorizontal: 0 }]}>No notifications yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: C.text, paddingHorizontal: 20, marginTop: 8, marginBottom: 18 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  msg: { fontSize: 14, color: C.text },
  time: { fontSize: 12, color: C.muted, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary, marginLeft: 8 },
});