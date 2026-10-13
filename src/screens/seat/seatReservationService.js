import { supabase } from '../../supabase/supabaseConfig';

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
    .from('library_seats')
    .select('id, seat_number, seat_type, is_active, reading_rooms(name, floor)')
    .eq('is_active', true)
    .order('seat_number');
  if (error) throw error;
  return data ?? [];
}

export async function fetchReservedSeatIds(bookingDate = localDateString()) {
  const { data, error } = await supabase.rpc('get_reserved_seat_ids', {
    p_booking_date: bookingDate,
  });
  if (error) throw error;
  return (data ?? []).map(value => String(value));
}

export async function createSeatReservation({ seatId, bookingDate, startTime, endTime }) {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('seat_reservations')
    .insert({
      seat_id: seatId,
      user_id: user.id,
      booking_date: bookingDate,
      start_time: startTime,
      end_time: endTime,
      status: 'confirmed',
    })
    .select('id, seat_id, user_id, booking_date, start_time, end_time, status')
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
    .select(`id, seat_id, booking_date, start_time, end_time, status,
      library_seats (seat_number, seat_type, reading_rooms (name, floor))`)
    .eq('user_id', userId)
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function cancelSeatReservation(reservationId, userId) {
  const { data, error } = await supabase
    .from('seat_reservations')
    .update({ status: 'cancelled' })
    .eq('id', reservationId)
    .eq('user_id', userId)
    .eq('status', 'confirmed')
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This reservation is no longer eligible for cancellation. Refresh and try again.');
  return data;
}

export function subscribeToSeatReservations(onChange, userId) {
  let channel = supabase
    .channel(`seat-reservations-${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'seat_reservations',
      filter: `user_id=eq.${userId}`,
    }, onChange)
    .subscribe();

  return () => {
    if (channel) supabase.removeChannel(channel);
    channel = null;
  };
}

export function subscribeToSeatAvailability(onChange) {
  const channel = supabase
    .channel('seat-availability', { config: { private: false } })
    .on('broadcast', { event: 'seat_reservation_changed' }, onChange)
    .subscribe();

  return () => supabase.removeChannel(channel);
}
