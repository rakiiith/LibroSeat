import { isSupabaseConfigured, supabase } from '../../supabase/supabaseConfig';

function requireBackend() {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
}

export async function listInventory() {
  requireBackend();
  const { data, error } = await supabase.from('books').select('*').order('title');
  if (error) throw error;
  return data ?? [];
}

export async function saveBook(book) {
  requireBackend();
  const values = { title: book.title.trim(), author: book.author.trim(), status: book.status || 'available' };
  const request = book.id
    ? supabase.from('books').update(values).eq('id', book.id)
    : supabase.from('books').insert(values);
  const { error } = await request;
  if (error) throw error;
}

export async function removeBook(bookId) {
  requireBackend();
  const { error } = await supabase.from('books').delete().eq('id', bookId);
  if (error) throw error;
}

export async function listReservations() {
  requireBackend();
  const [books, seats] = await Promise.all([
    supabase.from('reservations').select('*').order('created_at', { ascending: false }),
    supabase.from('seat_reservations').select('*').order('created_at', { ascending: false }),
  ]);
  if (books.error) throw books.error;
  if (seats.error) throw seats.error;
  return [
    ...(books.data ?? []).map((row) => ({ ...row, recordKind: 'reservation' })),
    ...(seats.data ?? []).map((row) => ({ ...row, type: 'seat', ref_id: row.seat_id, recordKind: 'seat_reservation' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function updateReservationStatus(reservation, status) {
  requireBackend();
  const table = reservation.recordKind === 'seat_reservation' ? 'seat_reservations' : 'reservations';
  const { error } = await supabase.from(table).update({ status }).eq('id', reservation.id);
  if (error) throw error;
}

export async function getSeatAllocationSettings() {
  requireBackend();
  const { data, error } = await supabase.from('seat_allocation_settings').select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  return data ?? { grace_period_minutes: 15, auto_release_enabled: true };
}

export async function saveSeatAllocationSettings({ gracePeriodMinutes, enabled }) {
  requireBackend();
  const { error } = await supabase.from('seat_allocation_settings').upsert({
    id: 1,
    grace_period_minutes: gracePeriodMinutes,
    auto_release_enabled: enabled,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
