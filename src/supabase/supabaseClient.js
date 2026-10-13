// Keep one Supabase client instance so auth, screens, and realtime share a session.
export { supabase, isSupabaseConfigured } from './supabaseConfig';
