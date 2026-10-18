import { supabase } from '../../supabase/supabaseConfig';
import { uniqueChannelName } from '../../supabase/realtimeUtil';

export { TIME_SLOTS } from '../../services/seatReservationService';

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user) throw new Error('Please sign in to manage seat reservations.');
  return data.user;
}

export async function fetchActiveSeats() {
  const { data, error } = await supabase
    .from('seats')
    .select('id, seat_number, zone, is_blocked')
    .eq('is_blocked', false)
    .order('seat_number');
  if (error) throw error;
  return data ?? [];
}

export async function fetchReservedSeatIds(bookingDate = localDateString()) {
  const { data, error } = await supabase
    .from('seat_reservations')
    .select('seat_id')
    .eq('reservation_date', bookingDate)
    .in('status', ['reserved', 'checked_in', 'confirmed']);
  if (error) throw error;
  return (data ?? []).map(r => String(r.seat_id));
}

export async function createSeatReservation({ seatId, bookingDate, startTime, endTime }) {
  const user = await getCurrentUser();

  // Standardize HH:MM to HH:MM:SS
  const sTime = startTime.length === 5 ? `${startTime}:00` : startTime;
  const eTime = endTime.length === 5 ? `${endTime}:00` : endTime;

  // Check for existing overlapping active reservation on the same seat
  const { data: conflicts, error: checkErr } = await supabase
    .from('seat_reservations')
    .select('id')
    .eq('seat_id', seatId)
    .eq('reservation_date', bookingDate)
    .lt('start_time', eTime)
    .gt('end_time', sTime)
    .in('status', ['reserved', 'checked_in', 'confirmed']);

  if (checkErr) throw checkErr;
  if (conflicts && conflicts.length > 0) {
    throw new Error('This seat is already reserved for an overlapping time. Choose another seat or time.');
  }

  // Ensure user profile exists in public.profiles to satisfy foreign key
  try {
    const { data: p } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
    if (!p) {
      await supabase.from('profiles').insert({
        id: user.id,
        full_name: user.user_metadata?.full_name || 'Student User',
        student_id: user.user_metadata?.student_id || 'STU-' + user.id.slice(0, 6),
        email: user.email,
        role: 'student'
      });
    }
  } catch (_) {}

  const { data, error } = await supabase
    .from('seat_reservations')
    .insert({
      seat_id: seatId,
      student_id: user.id,
      reservation_date: bookingDate,
      start_time: sTime,
      end_time: eTime,
      status: 'reserved',
    })
    .select('id, seat_id, student_id, reservation_date, start_time, end_time, status')
    .single();

  if (error) {
    if (error.code === '23P01' || error.code === '23505') {
      const conflict = new Error('This seat was just reserved for an overlapping time. Choose another seat or time.');
      conflict.code = error.code;
      throw conflict;
    }
    throw error;
  }
  return data;
}

export async function fetchMySeatReservations(userId) {
  const { data, error } = await supabase
    .from('seat_reservations')
    .select(`id, seat_id, reservation_date, start_time, end_time, status,
      seats (seat_number, zone)`)
    .eq('student_id', userId)
    .order('reservation_date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function cancelSeatReservation(reservationId, userId) {
  const { data, error } = await supabase
    .from('seat_reservations')
    .update({ status: 'cancelled' })
    .eq('id', reservationId)
    .eq('student_id', userId)
    .in('status', ['reserved', 'confirmed'])
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This reservation is no longer eligible for cancellation. Refresh and try again.');
  return data;
}

export async function checkInSeatReservation(reservationId, userId) {
  const { data, error } = await supabase
    .from('seat_reservations')
    .update({ status: 'checked_in' })
    .eq('id', reservationId)
    .eq('student_id', userId)
    .in('status', ['reserved', 'confirmed'])
    .select('id, status')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This reservation is no longer eligible for check-in. Refresh and try again.');
  return data;
}

export function subscribeToSeatReservations(onChange, userId) {
  let channel = supabase
    .channel(uniqueChannelName(`seat-reservations-${userId}`))
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'seat_reservations',
      filter: `student_id=eq.${userId}`,
    }, onChange)
    .subscribe();

  return () => {
    if (channel) supabase.removeChannel(channel);
    channel = null;
  };
}

export function subscribeToSeatAvailability(onChange) {
  const channel = supabase
    .channel(uniqueChannelName('seat-availability'))
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'seat_reservations',
    }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
