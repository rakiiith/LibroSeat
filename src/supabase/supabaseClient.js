import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qkrvkrbqttpndeclieso.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcnZrcmJxdHRwbmRlY2xpZXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMDgwMzAsImV4cCI6MjEwNjY4NDAzMH0.BycjNJvIs0CHI4WwXPM2i5JV_YAFUtXB1oyX-QHra6A'; // Supabase dashboard -> Settings -> API -> anon public key

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});