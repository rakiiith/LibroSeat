const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qkrvkrbqttpndeclieso.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcnZrcmJxdHRwbmRlY2xpZXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMDgwMzAsImV4cCI6MjEwNjY4NDAzMH0.BycjNJvIs0CHI4WwXPM2i5JV_YAFUtXB1oyX-QHra6A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const books = await supabase.from('books').select('id', { count: 'exact', head: true });
  console.log('Books:', books.count);

  const res = await supabase.from('reservations').select('status, id');
  console.log('Reservations:', res.data?.slice(0, 5));

  const seats = await supabase.from('seats').select('status, id, zone');
  console.log('Seats:', seats.data?.slice(0, 5));
}

check();
