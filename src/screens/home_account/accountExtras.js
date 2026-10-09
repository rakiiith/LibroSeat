import * as client from '../../supabase/supabaseClient';
import * as rt from '../../supabase/realtimeUtil';

const supabase = client.supabase ?? client.default;
const channelName = rt.uniqueChannelName ?? rt.default;
const isId = (v) => typeof v === 'string' && v.length > 0;

export const mapNotification = (r) => ({
  id: r.id,
  userId: r.user_id,
  message: r.message,
  type: r.type || 'confirmation',
  relatedReservationId: r.related_reservation_id,
  createdAt: r.created_at,
  isRead: r.is_read,
});

export const mapReservation = (r) => ({
  id: r.id,
  userId: r.user_id,
  type: r.type,
  refId: r.ref_id,
  status: r.status,
  createdAt: r.created_at,
  dueDate: r.due_date,
});

export async function fetchNotifications(userId) {
  if (!isId(userId)) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapNotification);
}

export function subscribeToNotificationList(userId, onData, onError) {
  if (!isId(userId)) return () => {};
  let active = true;
  const load = async () => {
    try {
      const rows = await fetchNotifications(userId);
      if (active) onData(rows);
    } catch (e) {
      if (active && onError) onError(e);
    }
  };
  load();
  const channel = supabase
    .channel(channelName('notif-list'))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      load
    )
    .subscribe();
  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

export async function markRead(id) {
  if (!isId(id)) return;
  await supabase.from('notifications').update({ is_read: true }).eq('id', id);
}

export async function deleteNotification(id) {
  if (!isId(id)) return;
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
}

export async function refreshReminders() {
  try {
    await supabase.rpc('refresh_my_reminders');
  } catch (e) {
    // non-critical
  }
}

export async function fetchActiveReservations(userId) {
  if (!isId(userId)) return [];
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })
    .limit(3);
  if (error) throw error;
  const rows = data || [];

  const bookIds = rows.filter((r) => r.type === 'book').map((r) => r.ref_id);
  const seatIds = rows.filter((r) => r.type === 'seat').map((r) => r.ref_id);
  const [b, s] = await Promise.all([
    bookIds.length ? supabase.from('books').select('id,title').in('id', bookIds) : { data: [] },
    seatIds.length ? supabase.from('seats').select('id,seat_number').in('id', seatIds) : { data: [] },
  ]);
  const titles = Object.fromEntries((b.data || []).map((x) => [x.id, x.title]));
  const seats = Object.fromEntries((s.data || []).map((x) => [x.id, `Seat ${x.seat_number}`]));

  return rows.map((r) => ({
    ...mapReservation(r),
    label: (r.type === 'book' ? titles[r.ref_id] : seats[r.ref_id]) || `${r.type} reservation`,
  }));
}

export async function updateOwnProfile(userId, { fullName, studentId }) {
  if (!isId(userId)) throw new Error('Not signed in.');
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, student_id: studentId })
    .eq('id', userId);
  if (error) throw error;
  await supabase.auth.updateUser({ data: { full_name: fullName, student_id: studentId } });
}