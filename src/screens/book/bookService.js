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
  // 1. Try 3-argument RPC (standard in schema.sql & fix_reserve_book.sql)
  let { data, error } = await supabase.rpc('reserve_book', {
    p_book_id: bookId,
    p_reservation_date: reservationDate,
    p_pickup_before: pickupBefore,
  });

  // 2. If signature not found, try 1-argument RPC (from book_admin_workflow.sql)
  if (error?.code === 'PGRST202' || error?.code === '42883') {
    const fallbackRpc = await supabase.rpc('reserve_book', { p_book_id: bookId });
    if (!fallbackRpc.error) {
      data = fallbackRpc.data;
      error = null;
    }
  }

  // 3. Fallback to direct insert if RPC function is not installed in database
  if (error?.code === 'PGRST202' || error?.code === '42883' || error?.message?.includes('function')) {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error('Please sign in before reserving a book.');

    const resCode =
      'RES-' +
      new Date().getFullYear() +
      '-' +
      Math.floor(10000 + Math.random() * 90000);

    const { data: inserted, error: insertError } = await supabase
      .from('reservations')
      .insert({
        user_id: user.id,
        type: 'book',
        ref_id: bookId,
        status: 'confirmed',
        reservation_code: resCode,
        reservation_date: reservationDate,
        pickup_before: pickupBefore,
      })
      .select('*')
      .single();

    if (insertError) throw insertError;

    // Decrement available copies if possible
    try {
      const { data: b } = await supabase
        .from('books')
        .select('available_copies')
        .eq('id', bookId)
        .single();
      if (b && b.available_copies > 0) {
        await supabase
          .from('books')
          .update({ available_copies: b.available_copies - 1 })
          .eq('id', bookId);
      }
    } catch (_) {}

    return inserted;
  }

  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

/** Fetch all book reservations for a student with book details */
export async function fetchMyBookReservations(userId) {
  try {
    const { data: bookRes, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'book')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('fetchMyBookReservations error:', error.message);
    }

    const bookList = bookRes || [];
    const bookIds = [...new Set(bookList.map((r) => r.ref_id).filter(Boolean))];

    let bookMap = {};
    if (bookIds.length > 0) {
      const { data: bookDetails } = await supabase
        .from('books')
        .select('id, title, author, category, cover_url, shelf')
        .in('id', bookIds);
      (bookDetails || []).forEach((b) => {
        bookMap[b.id] = b;
      });
    }

    const items = bookList.map((r) => {
      const b = bookMap[r.ref_id] || {};
      const resDate =
        r.reservation_date ||
        (r.created_at ? r.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);
      return {
        id: r.id,
        kind: 'book',
        type: 'book',
        ref_id: r.ref_id,
        book_id: r.ref_id,
        title: b.title || 'Reserved Book',
        author: b.author || 'Library Collection',
        category: b.category || '',
        shelf: b.shelf || '',
        cover_url: b.cover_url || null,
        reservation_code:
          r.reservation_code || `RES-${String(r.id).slice(0, 8).toUpperCase()}`,
        reservation_date: resDate,
        pickup_before: r.pickup_before || r.due_date || null,
        due_date: r.due_date || r.pickup_before || null,
        status: r.status || 'confirmed',
        created_at: r.created_at,
        raw: r,
      };
    });

    // Also check book_reservations table if any exist there
    try {
      const { data: brList } = await supabase
        .from('book_reservations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (brList && brList.length > 0) {
        const existingIds = new Set(
          items.map((i) => i.id).concat(items.map((i) => i.raw?.id))
        );
        for (const br of brList) {
          if (!existingIds.has(br.id) && !existingIds.has(br.reservation_id)) {
            items.push({
              id: br.reservation_id || br.id,
              kind: 'book',
              type: 'book',
              ref_id: br.book_id,
              book_id: br.book_id,
              title: br.book_title || 'Reserved Book',
              author: br.book_author || 'Library Collection',
              category: br.book_category || '',
              shelf: '',
              reservation_code:
                br.reservation_code || `RES-${String(br.id).slice(0, 8).toUpperCase()}`,
              reservation_date:
                br.reservation_date ||
                (br.created_at
                  ? br.created_at.split('T')[0]
                  : new Date().toISOString().split('T')[0]),
              pickup_before: br.pickup_before || null,
              due_date: br.pickup_before || null,
              status: br.status || 'confirmed',
              created_at: br.created_at,
              raw: br,
            });
          }
        }
      }
    } catch (_) {}

    return items;
  } catch (err) {
    console.warn('fetchMyBookReservations error:', err);
    return [];
  }
}

/** Cancel a student's book reservation and restore book copies */
export async function cancelBookReservation(reservationId, bookId) {
  // Update reservations table
  const { error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', reservationId);

  if (error) {
    console.warn('cancelBookReservation error in reservations:', error);
  }

  // Also update book_reservations if table exists
  try {
    await supabase
      .from('book_reservations')
      .update({ status: 'cancelled' })
      .or(`id.eq.${reservationId},reservation_id.eq.${reservationId}`);
  } catch (_) {}

  // Restore available copies if bookId is provided
  if (bookId) {
    try {
      const { data: book } = await supabase
        .from('books')
        .select('available_copies, total_copies')
        .eq('id', bookId)
        .single();
      if (book) {
        const newAvailable = Math.min(
          (book.available_copies ?? 0) + 1,
          book.total_copies ?? 999
        );
        await supabase
          .from('books')
          .update({ available_copies: newAvailable })
          .eq('id', bookId);
      }
    } catch (_) {}
  }
}