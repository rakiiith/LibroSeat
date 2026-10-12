const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://qkrvkrbqttpndeclieso.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcnZrcmJxdHRwbmRlY2xpZXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMDgwMzAsImV4cCI6MjEwNjY4NDAzMH0.BycjNJvIs0CHI4WwXPM2i5JV_YAFUtXB1oyX-QHra6A';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createStaff() {
  const email = 'admin@libroseat.com';
  const password = 'password123';
  
  console.log('Signing up...');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: 'Admin Staff' } },
  });
  
  if (error) {
    console.error('SignUp Error:', error);
    return;
  }
  
  console.log('User signed up. ID:', data.user.id);
  
  console.log('Updating profile role to staff...');
  const { data: updateData, error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'staff' })
    .eq('id', data.user.id);
    
  if (updateError) {
    console.error('Update Error:', updateError);
  } else {
    console.log('Update success:', updateData);
  }
}

createStaff();
