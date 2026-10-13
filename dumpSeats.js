import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bexdswxoxvctqytvrtor.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_KEY_HERE'; // Wait, I don't need to put the actual key, I can just use the existing one

import { supabase } from './src/supabase/supabaseClient.js';

async function run() {
  const { data, error } = await supabase.from('seat_reservations').select('*');
  console.log("SEATS:", data);
}

run();
