// Guaranteed-unique Realtime channel names.
//
// Why this exists: supabase-js reuses an existing channel object when you
// call supabase.channel(sameName) again. If that channel was already
// subscribed (e.g. React re-ran an effect before the previous channel's
// async removeChannel() finished), calling .on() on it throws:
//   "cannot add postgres_changes callbacks ... after subscribe()"
// Date.now() is NOT unique enough (two calls in one millisecond collide).
// A module-level counter + random suffix can never collide.

let counter = 0;

export function uniqueChannelName(prefix) {
  counter += 1;
  return `${prefix}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}