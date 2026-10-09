import { supabase } from '../supabase/supabaseClient';

// Time slots used in the app
export const TIME_SLOTS = [
  { id: '08-10', label: '08:00 - 10:00 AM', start: '08:00:00', end: '10:00:00' },
  { id: '10-12', label: '10:00 - 12:00 PM', start: '10:00:00', end: '12:00:00' },
  { id: '12-14', label: '12:00 - 02:00 PM', start: '12:00:00', end: '14:00:00' },
  { id: '14-16', label: '02:00 - 04:00 PM', start: '14:00:00', end: '16:00:00' },
  { id: '16-18', label: '04:00 - 06:00 PM', start: '16:00:00', end: '18:00:00' },
  { id: '18-20', label: '06:00 - 08:00 PM', start: '18:00:00', end: '20:00:00' }
];

export async function fetchSeatsWithAvailability(dateStr, slot) {
  // 1. Fetch all seats
  const { data: seats, error: seatErr } = await supabase.from('seats').select('*').order('seat_number');
  if (seatErr) throw seatErr;

  // 2. Fetch reservations for this date and time slot
  const { data: reservations, error: resErr } = await supabase
    .from('seat_reservations')
    .select('seat_id, status')
    .eq('reservation_date', dateStr)
    .eq('start_time', slot.start)
    .in('status', ['reserved', 'checked_in']);
  
  if (resErr) throw resErr;

  // 3. Merge availability map
  const resMap = {};
  reservations.forEach(r => { resMap[r.seat_id] = r.status; });

  return seats.map(s => ({
    ...s,
    // seat is available if it's not blocked AND has no active reservation
    is_available: !s.is_blocked && !resMap[s.id],
    reservation_status: resMap[s.id] || null
  }));
}

export async function createSeatReservation(seatId, userId, dateStr, slot) {
  // Check if student already has a reservation at this time
  const { data: existing } = await supabase
    .from('seat_reservations')
    .select('id')
    .eq('student_id', userId)
    .eq('reservation_date', dateStr)
    .eq('start_time', slot.start)
    .in('status', ['reserved', 'checked_in']);
    
  if (existing && existing.length > 0) {
    throw new Error('You already have an active reservation for this time slot.');
  }

  const { data, error } = await supabase
    .from('seat_reservations')
    .insert({
      seat_id: seatId,
      student_id: userId,
      reservation_date: dateStr,
      start_time: slot.start,
      end_time: slot.end,
      status: 'reserved'
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Seat just taken, pick another');
    throw error;
  }
  return data;
}

export async function getStudentSeatReservations(userId) {
  const { data: res, error } = await supabase
    .from('seat_reservations')
    .select('*, seats(seat_number, zone)')
    .eq('student_id', userId)
    .order('reservation_date', { ascending: false })
    .order('start_time', { ascending: false });
    
  if (error) throw error;
  return res;
}

export async function updateSeatReservationStatus(resId, status) {
  const { data, error } = await supabase
    .from('seat_reservations')
    .update({ status })
    .eq('id', resId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}


export async function processNoShows(dateStr, slot) {
  // Check if current time is past start_time + 15 mins
  const now = new Date();
  const resDate = new Date(`${dateStr}T${slot.start}`);
  const cutoff = new Date(resDate);
  cutoff.setMinutes(cutoff.getMinutes() + 15);

  if (now > cutoff) {
    // Find all 'reserved' (not checked_in) for this slot and mark as no_show
    const { error } = await supabase
      .from('seat_reservations')
      .update({ status: 'no_show' })
      .eq('reservation_date', dateStr)
      .eq('start_time', slot.start)
      .eq('status', 'reserved');
    if (error) console.error('Failed to process no_shows', error);
  }
}

export async function fetchAdminSeatData(dateStr, slot) {
  await processNoShows(dateStr, slot);

  const { data: seats, error: seatErr } = await supabase.from('seats').select('*').order('seat_number');
  if (seatErr) throw seatErr;

  const { data: reservations, error: resErr } = await supabase
    .from('seat_reservations')
    .select('*, profiles(full_name, student_id)')
    .eq('reservation_date', dateStr)
    .eq('start_time', slot.start);
  
  if (resErr) throw resErr;

  const resMap = {};
  reservations.forEach(r => { resMap[r.seat_id] = r; });

  return seats.map(s => ({
    ...s,
    reservation: resMap[s.id] || null
  }));
}

export async function blockSeat(seatId, isBlocked) {
  const { error } = await supabase.from('seats').update({ is_blocked: isBlocked }).eq('id', seatId);
  if (error) throw error;
}

export async function adminAssignSeat(seatId, studentId, dateStr, slot) {
  // Check if seat is blocked
  const { data: seat } = await supabase.from('seats').select('is_blocked').eq('id', seatId).single();
  if (seat?.is_blocked) throw new Error('Cannot assign a blocked seat.');

  // Create reservation as checked_in (walk-in)
  const { error } = await supabase
    .from('seat_reservations')
    .insert({
      seat_id: seatId,
      student_id: studentId,
      reservation_date: dateStr,
      start_time: slot.start,
      end_time: slot.end,
      status: 'checked_in'
    });
  
  if (error) {
    if (error.code === '23505') throw new Error('Seat is already taken.');
    throw error;
  }
}

