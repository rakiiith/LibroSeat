// Owned by: Nimnada (Home & Account Module, Prototype Lead)
// Supabase tables used: notifications, reservations, books, seats
//
// ONLY CHANGE vs the previous version: every channel name now comes from
// uniqueChannelName() instead of a fixed/Date.now() string, which fixes
// "cannot add postgres_changes callbacks ... after subscribe()".

import { supabase } from '../../supabase/supabaseClient';
import { uniqueChannelName } from '../../supabase/realtimeUtil';

function mapReservation(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    refId: row.ref_id,
    status: row.status,
    createdAt: row.created_at,
    dueDate: row.due_date,
  };
}

function mapNotification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    message: row.message,
    type: row.type,
    relatedReservationId: row.related_reservation_id,
    createdAt: row.created_at,
    isRead: row.is_read,
  };
}

export function subscribeToNotifications(userId, callback) {
  const fetchAndEmit = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return console.warn('subscribeToNotifications error:', error.message);
    callback(data.map(mapNotification));
  };

  fetchAndEmit();

  const channel = supabase
    .channel(uniqueChannelName(`notifications-${userId}`))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      fetchAndEmit
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToReservations(userId, callback) {
  const fetchAndEmit = async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return console.warn('subscribeToReservations error:', error.message);
    callback(data.map(mapReservation));
  };

  fetchAndEmit();

  const channel = supabase
    .channel(uniqueChannelName(`reservations-${userId}`))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reservations', filter: `user_id=eq.${userId}` },
      fetchAndEmit
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToReservation(reservationId, callback) {
  const fetchAndEmit = async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single();
    if (error) return callback(null);
    callback(mapReservation(data));
  };

  fetchAndEmit();

  const channel = supabase
    .channel(uniqueChannelName(`reservation-${reservationId}`))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reservations', filter: `id=eq.${reservationId}` },
      fetchAndEmit
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function getRelatedItem(reservation) {
  if (!reservation?.refId) return null;
  const table = reservation.type === 'seat' ? 'seats' : 'books';
  const { data, error } = await supabase.from(table).select('*').eq('id', reservation.refId).single();
  if (error) {
    console.warn('getRelatedItem error:', error.message);
    return null;
  }
  return table === 'seats'
    ? { id: data.id, seatNumber: data.seat_number, room: data.room, isAvailable: data.is_available }
    : { id: data.id, title: data.title, author: data.author, isAvailable: data.is_available };
}

export async function markAsCollected(reservationId) {
  const { error } = await supabase.from('reservations').update({ status: 'collected' }).eq('id', reservationId);
  if (error) throw error;
}

export async function cancelReservation(reservationId) {
  const { error } = await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', reservationId);
  if (error) throw error;
}

export async function markNotificationRead(notificationId) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
  if (error) throw error;
}