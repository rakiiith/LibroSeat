const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://qkrvkrbqttpndeclieso.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcnZrcmJxdHRwbmRlY2xpZXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMDgwMzAsImV4cCI6MjEwNjY4NDAzMH0.BycjNJvIs0CHI4WwXPM2i5JV_YAFUtXB1oyX-QHra6A');

async function run() {
  const { data } = await supabase.from('seat_reservations').select('*');
  console.log(JSON.stringify(data, null, 2));
}
run();
