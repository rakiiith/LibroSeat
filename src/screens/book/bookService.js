import { supabase } from '../../supabase/supabaseClient';

function mapBook(row) {
  const isAvailable = row.is_available ?? row.status === 'available';
  const availableCopies = row.available_copies ?? (isAvailable ? 1 : 0);
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    category: row.category,
    coverUrl: row.cover_url,
    description: row.description,
    isbn: row.isbn,
    shelf: row.shelf,
    totalCopies: row.total_copies,
    availableCopies,
    isAvailable: availableCopies > 0,
  };
}

/** READ — fetch categories actually present in the books table. */
export async function fetchCategories() {
  const { data, error } = await supabase.from('books').select('category');
  if (error) {
    console.warn('fetchCategories error:', error.message);
    return [];
  }
  const unique = [...new Set(data.map((r) => r.category).filter(Boolean))];
  return unique.sort();
}

/** READ — search by title/author, optionally filtered by category. */
export async function searchBooks({ query = '', category = 'All' }) {
  let q = supabase.from('books').select('*').order('title', { ascending: true });

  const text = query.trim().replace(/[,%()]/g, ' ');
  if (text) {
    q = q.or(`title.ilike.%${text}%,author.ilike.%${text}%`);
  }
  if (category && category !== 'All') {
    q = q.eq('category', category);
  }

  const { data, error } = await q;
  if (error) {
    console.warn('searchBooks error:', error.message);
    return [];
  }
  return data.map(mapBook);
}

/** Create a reservation and decrement availability atomically through Supabase. */
export async function reserveBook({ bookId, reservationDate, pickupBefore }) {
  const { data, error } = await supabase.rpc('reserve_book', {
    p_book_id: bookId,
    p_reservation_date: reservationDate,
    p_pickup_before: pickupBefore,
  });

  if (error?.code === 'PGRST202' || error?.code === '42883') {
    throw new Error(
      'The reservation service is not installed in Supabase. Run the reservation setup SQL, then try again.'
    );
  }
  if (error) throw error;

  return Array.isArray(data) ? data[0] : data;
}