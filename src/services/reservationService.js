import { supabase } from '../supabase/supabaseClient';

export async function createReservation(type, refId, userId, dueDate = null) {
  // 1. Insert reservation
  const { data, error } = await supabase
    .from('reservations')
    .insert({
      user_id: userId,
      type: type,
      ref_id: refId,
      status: 'pending',
      due_date: dueDate
    })
    .select()
    .single();

  if (error) throw error;

  // 2. Update resource availability
  const table = type === 'seat' ? 'seats' : 'books';
  const { error: updateError } = await supabase
    .from(table)
    .update({ is_available: false })
    .eq('id', refId);

  if (updateError) throw updateError;

  return data;
}

export async function releaseReservation(reservationId, type, refId) {
  // 1. Mark reservation as completed/cancelled
  const { error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', reservationId);
    
  if (error) throw error;

  // 2. Free up the resource
  const table = type === 'seat' ? 'seats' : 'books';
  const { error: updateError } = await supabase
    .from(table)
    .update({ is_available: true })
    .eq('id', refId);

  if (updateError) throw updateError;
}

// Custom manual join since Supabase FK relations are missing
export async function getRichReservations() {
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!reservations || reservations.length === 0) return [];

  // Extract unique IDs
  const userIds = [...new Set(reservations.map(r => r.user_id))];
  const seatIds = [...new Set(reservations.filter(r => r.type === 'seat').map(r => r.ref_id))];
  const bookIds = [...new Set(reservations.filter(r => r.type === 'book').map(r => r.ref_id))];

  // Fetch related records in parallel
  const [profilesRes, seatsRes, booksRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, student_id, role').in('id', userIds),
    seatIds.length > 0 ? supabase.from('seats').select('*').in('id', seatIds) : Promise.resolve({ data: [] }),
    bookIds.length > 0 ? supabase.from('books').select('*').in('id', bookIds) : Promise.resolve({ data: [] })
  ]);

  const profilesMap = (profilesRes.data || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
  const seatsMap = (seatsRes.data || []).reduce((acc, s) => ({ ...acc, [s.id]: s }), {});
  const booksMap = (booksRes.data || []).reduce((acc, b) => ({ ...acc, [b.id]: b }), {});

  // Construct rich objects
  return reservations.map(r => {
    const profile = profilesMap[r.user_id] || {};
    const item = r.type === 'seat' ? seatsMap[r.ref_id] : booksMap[r.ref_id];
    
    return {
      ...r,
      profile,
      item: item || {}
    };
  });
}
