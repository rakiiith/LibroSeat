const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://qkrvkrbqttpndeclieso.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcnZrcmJxdHRwbmRlY2xpZXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMDgwMzAsImV4cCI6MjEwNjY4NDAzMH0.BycjNJvIs0CHI4WwXPM2i5JV_YAFUtXB1oyX-QHra6A';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').eq('role', 'staff').limit(1);
  console.log('Staff profiles:', data);
  console.log('Error:', error);
}

check();
