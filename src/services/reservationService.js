import { supabase } from '../supabase/supabaseClient';

export async function createReservation(type, refId, userId, dueDate = null) {
  const { data, error } = await supabase
    .from('reservations')
    .insert({
      user_id: userId,
      type: type,
      ref_id: refId,
      status: 'confirmed',
      due_date: dueDate
    })
    .select()
    .single();

  if (error) throw error;

  const table = type === 'seat' ? 'seats' : 'books';
  const { error: updateError } = await supabase
    .from(table)
    .update({ is_available: false })
    .eq('id', refId);

  if (updateError) throw updateError;

  return data;
}

export async function releaseReservation(reservationId, type, refId) {
  if (type === 'seat_adv') {
    const { error } = await supabase.from('seat_reservations').update({ status: 'cancelled' }).eq('id', reservationId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', reservationId);
  if (error) throw error;

  const table = type === 'seat' ? 'seats' : 'books';
  const { error: updateError } = await supabase.from(table).update({ is_available: true }).eq('id', refId);
  if (updateError) throw updateError;
}

export async function getRichReservations() {
  // 1. Fetch Book Reservations (Old table)
  const { data: bookRes, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('type', 'book')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // 2. Fetch Seat Reservations (New table)
  const { data: seatRes, error: seatErr } = await supabase
    .from('seat_reservations')
    .select('*')
    .order('reservation_date', { ascending: false })
    .order('start_time', { ascending: false });

  if (seatErr) throw seatErr;

  const userIds = [
    ...new Set([
      ...(bookRes || []).map(r => r.user_id),
      ...(seatRes || []).map(r => r.student_id)
    ])
  ];
  
  const bookIds = [...new Set((bookRes || []).map(r => r.ref_id))];
  const seatIds = [...new Set((seatRes || []).map(r => r.seat_id))];

  const [profilesRes, booksRes, seatsRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, student_id, role').in('id', userIds),
    bookIds.length > 0 ? supabase.from('books').select('*').in('id', bookIds) : Promise.resolve({ data: [] }),
    seatIds.length > 0 ? supabase.from('seats').select('*').in('id', seatIds) : Promise.resolve({ data: [] })
  ]);

  const profilesMap = (profilesRes.data || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
  const booksMap = (booksRes.data || []).reduce((acc, b) => ({ ...acc, [b.id]: b }), {});
  const seatsMap = (seatsRes.data || []).reduce((acc, s) => ({ ...acc, [s.id]: s }), {});

  // Map book reservations
  const formattedBooks = (bookRes || []).map(r => ({
    ...r,
    profile: profilesMap[r.user_id] || {},
    item: booksMap[r.ref_id] || {}
  }));

  // Map seat reservations to match the generic UI structure
  const formattedSeats = (seatRes || []).map(r => ({
    id: r.id,
    type: 'seat_adv',
    ref_id: r.seat_id,
    user_id: r.student_id,
    status: r.status,
    created_at: r.created_at,
    due_date: `${r.reservation_date}T${r.end_time}`, // Store end_time here so UI can show it
    start_time: r.start_time,
    reservation_date: r.reservation_date,
    profile: profilesMap[r.student_id] || {},
    item: seatsMap[r.seat_id] || {}
  }));

  return [...formattedBooks, ...formattedSeats].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}
