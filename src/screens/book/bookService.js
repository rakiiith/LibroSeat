import { supabase } from '../../supabase/supabaseClient';

function mapBook(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    category: row.category,
    isAvailable: row.is_available,
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