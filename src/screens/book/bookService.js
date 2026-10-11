import { isSupabaseConfigured, supabase } from '../../supabase/supabaseConfig';

export async function searchBooks(query = '') {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
  let request = supabase.from('books').select('*').order('title');
  const term = query.trim();
  if (term) request = request.or(`title.ilike.%${term}%,author.ilike.%${term}%`);
  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
}

export async function reserveBook(userId, book) {
  if (!isSupabaseConfigured || !userId || !book?.id) throw new Error('Please sign in before reserving a book.');
  const { data, error } = await supabase.rpc('reserve_book', { p_book_id: book.id });
  if (error) throw error;
  return data;
}

export async function getBook(bookId) {
  if (!isSupabaseConfigured || !bookId) return null;
  const { data, error } = await supabase.from('books').select('*').eq('id', bookId).maybeSingle();
  if (error) throw error;
  return data;
}
