-- ============================================================
-- LibroSeat - Connect Student Seat Bookings to Admin Module
-- Additive, Non-Destructive Migration & RLS Configuration
-- ============================================================

-- 1. Ensure extensions
create extension if not exists "uuid-ossp";

-- 2. Ensure public.seats table has required columns
create table if not exists public.seats (
  id uuid primary key default gen_random_uuid(),
  seat_number text not null,
  zone text default 'Reading Room A',
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.seats add column if not exists zone text default 'Reading Room A';
alter table public.seats add column if not exists is_blocked boolean not null default false;

-- 3. Ensure public.profiles table exists and has role column
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  student_id text,
  email text,
  role text not null default 'student',
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role text not null default 'student';
alter table public.profiles add column if not exists student_id text;
alter table public.profiles add column if not exists full_name text;

-- 4. Ensure public.seat_reservations exists with correct columns
create table if not exists public.seat_reservations (
  id uuid primary key default gen_random_uuid(),
  seat_id uuid not null references public.seats(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  reservation_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'reserved',
  created_at timestamptz not null default now(),
  constraint seat_res_valid_times check (end_time > start_time)
);

alter table public.seat_reservations add column if not exists status text not null default 'reserved';
alter table public.seat_reservations add column if not exists reservation_date date;
alter table public.seat_reservations add column if not exists start_time time;
alter table public.seat_reservations add column if not exists end_time time;

-- Helpful indices for fast querying
create index if not exists idx_seat_res_date_time 
  on public.seat_reservations (reservation_date, start_time, end_time);

create index if not exists idx_seat_res_student 
  on public.seat_reservations (student_id, reservation_date);

create index if not exists idx_seat_res_seat 
  on public.seat_reservations (seat_id, reservation_date);

-- 5. Helper Function: Check if caller is Staff/Admin
create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role::text in ('staff', 'admin')
  );
$$;

-- 6. Configure Row Level Security (RLS)

-- A) seats
alter table public.seats enable row level security;

drop policy if exists "Anyone can view seats" on public.seats;
create policy "Anyone can view seats"
  on public.seats for select
  to authenticated, anon
  using (true);

drop policy if exists "Staff can modify seats" on public.seats;
create policy "Staff can modify seats"
  on public.seats for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- B) profiles
alter table public.profiles enable row level security;

drop policy if exists "Users view own profile or staff views all" on public.profiles;
create policy "Users view own profile or staff views all"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_staff());

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid() or public.is_staff());

-- C) seat_reservations
alter table public.seat_reservations enable row level security;

drop policy if exists "Users read own seat reservations" on public.seat_reservations;
drop policy if exists "Users create own seat reservations" on public.seat_reservations;
drop policy if exists "Users cancel own confirmed seat reservations" on public.seat_reservations;

drop policy if exists "Students view own reservations, staff views all" on public.seat_reservations;
create policy "Students view own reservations, staff views all"
  on public.seat_reservations for select
  to authenticated
  using (student_id = auth.uid() or public.is_staff());

drop policy if exists "Students create own reservation" on public.seat_reservations;
create policy "Students create own reservation"
  on public.seat_reservations for insert
  to authenticated
  with check (
    (student_id = auth.uid() and status in ('reserved', 'confirmed', 'pending'))
    or public.is_staff()
  );

drop policy if exists "Students update own reservation or staff updates" on public.seat_reservations;
create policy "Students update own reservation or staff updates"
  on public.seat_reservations for update
  to authenticated
  using (student_id = auth.uid() or public.is_staff())
  with check (student_id = auth.uid() or public.is_staff());

-- 7. Auto-create Profile Record on User Registration Trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_role user_role := 'student'::user_role;
begin
  if lower(coalesce(new.raw_user_meta_data->>'role', 'student')) in ('staff', 'admin') then
    v_role := 'staff'::user_role;
  end if;

  insert into public.profiles (id, full_name, student_id, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Student User'),
    coalesce(new.raw_user_meta_data->>'student_id', 'STU-' || substring(new.id::text, 1, 6)),
    new.email,
    v_role
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    student_id = coalesce(excluded.student_id, public.profiles.student_id),
    email = coalesce(excluded.email, public.profiles.email);
  return new;
exception when others then
  -- Ensure that user signup is never aborted by profile creation edge cases
  raise warning 'handle_new_user profile creation warning: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 8. Enable Realtime Broadcasting for Seat Tables
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'seat_reservations'
  ) then
    alter publication supabase_realtime add table public.seat_reservations;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'seats'
  ) then
    alter publication supabase_realtime add table public.seats;
  end if;
end $$;
