import * as client from './supabaseClient';

const supabase = client.supabase ?? client.default;
const STAFF_DOMAIN = 'libroseat-staff.local';

const friendlyError = (error) => {
  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('rate limit')) return new Error('Too many emails were requested. Please wait a while and try again.');
  if (msg.includes('email not confirmed')) return new Error('Please confirm your email first, then log in.');
  if (msg.includes('invalid login credentials')) return new Error('Incorrect email/ID or password.');
  if (msg.includes('already registered')) return new Error('An account with this email already exists.');
  return new Error(error?.message || 'Something went wrong. Please try again.');
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const pick = (args, names) => {
  const first = args[0];
  if (first && typeof first === 'object') {
    for (const n of names) if (first[n] !== undefined) return first[n];
  }
  return undefined;
};

// Accepts an id string, a user object, or a session object.
const toId = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  return v.id ?? v.user?.id ?? v.uid ?? null;
};

export async function getSupabaseProfile(userOrId) {
  const userId = toId(userOrId);
  if (!userId) return null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw friendlyError(error);
    if (data) return data;
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

export async function signUpStudent(...args) {
  const obj = args[0] && typeof args[0] === 'object';
  const fullName = String((obj ? pick(args, ['fullName', 'full_name', 'name']) : args[0]) || '').trim();
  const studentId = String((obj ? pick(args, ['studentId', 'student_id']) : args[1]) || '').trim();
  const email = normalizeEmail(obj ? pick(args, ['email']) : args[2]);
  const password = obj ? pick(args, ['password']) : args[3];

  if (email.endsWith('@' + STAFF_DOMAIN)) {
    throw new Error('This email address cannot be used for student signup.');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, student_id: studentId } },
  });
  if (error) throw friendlyError(error);

  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('An account with this email already exists.');
  }

  return { user: data.user, session: data.session, needsEmailConfirmation: !data.session };
}

export async function signInStudent(...args) {
  const obj = args[0] && typeof args[0] === 'object';
  const email = normalizeEmail(obj ? pick(args, ['email']) : args[0]);
  const password = obj ? pick(args, ['password']) : args[1];

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw friendlyError(error);

  const profile = await getSupabaseProfile(data.user.id);
  if (profile?.role === 'staff') {
    await supabase.auth.signOut();
    throw new Error('This is a staff account. Please use Staff Login.');
  }
  return { user: data.user, session: data.session, profile };
}

export async function signInStaff(...args) {
  const obj = args[0] && typeof args[0] === 'object';
  const raw = String((obj ? pick(args, ['staffId', 'staff_id', 'id', 'email']) : args[0]) || '')
    .trim()
    .toLowerCase();
  const password = obj ? pick(args, ['password']) : args[1];

  if (!raw) throw new Error('Please enter your Staff ID.');
  const email = raw.includes('@') ? raw : `${raw}@${STAFF_DOMAIN}`;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if ((error.message || '').toLowerCase().includes('email not confirmed')) {
      throw new Error('This staff account is not confirmed yet. Ask the developer to enable Auto Confirm.');
    }
    throw new Error('Invalid staff ID or password.');
  }

  const profile = await getSupabaseProfile(data.user.id);
  if (!profile || profile.role !== 'staff') {
    await supabase.auth.signOut();
    throw new Error('This account does not have staff access.');
  }
  return { user: data.user, session: data.session, profile };
}

export async function signOutAccount() {
  const { error } = await supabase.auth.signOut();
  if (error) throw friendlyError(error);
}

export async function requestPasswordReset(...args) {
  const email = normalizeEmail(args[0] && typeof args[0] === 'object' ? pick(args, ['email']) : args[0]);
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw friendlyError(error);
}

export async function confirmPasswordReset(...args) {
  const obj = args[0] && typeof args[0] === 'object';
  const email = normalizeEmail(obj ? pick(args, ['email']) : args[0]);
  const token = String((obj ? pick(args, ['token', 'code', 'otp']) : args[1]) || '').trim();
  const newPassword = obj ? pick(args, ['newPassword', 'password']) : args[2];

  const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
  if (verifyError) throw new Error('Invalid or expired code.');

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) throw friendlyError(updateError);
}