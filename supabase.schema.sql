-- LibroSeat — Supabase schema (corrected to match what actually exists)
-- Run each section once. Safe to re-run: every CREATE is guarded.
-- No payment-related tables — there is no payment flow in the high-fidelity
-- prototype, so that part of the original schema has been removed entirely.

-- ============================================================
-- 1. profiles (already created manually — included here for the record,
--    so this file accurately reflects the real database)
-- ============================================================
do $$ begin
  create type public.user_role as enum ('student', 'staff');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  student_id text,
  email text unique not null,
  role public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- 2. books (Book Module — Shashith)
-- ============================================================
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  is_available boolean not null default true
);

alter table public.books enable row level security;

drop policy if exists "Anyone signed in can read books" on public.books;
create policy "Anyone signed in can read books"
  on public.books for select
  to authenticated
  using (true);

drop policy if exists "Staff manage books" on public.books;
create policy "Staff manage books"
  on public.books for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'));

-- ============================================================
-- 3. seats (Seat Module — Higgoda)
-- ============================================================
create table if not exists public.seats (
  id uuid primary key default gen_random_uuid(),
  seat_number text not null,
  room text,
  is_available boolean not null default true
);

alter table public.seats enable row level security;

drop policy if exists "Anyone signed in can read seats" on public.seats;
create policy "Anyone signed in can read seats"
  on public.seats for select
  to authenticated
  using (true);

drop policy if exists "Staff manage seats" on public.seats;
create policy "Staff manage seats"
  on public.seats for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'));

-- ============================================================
-- 4. reservations (Home & Account Module — Nimnada; also used by Book/Seat
--    modules to create, and Admin module to manage)
--    user_id is uuid referencing auth.users(id) — this consistent typing
--    is what the earlier "uuid = text" error was caused by getting wrong.
-- ============================================================
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('book', 'seat')),
  ref_id uuid not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'collected', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  due_date timestamptz
);

alter table public.reservations enable row level security;

drop policy if exists "Users read own reservations" on public.reservations;
create policy "Users read own reservations"
  on public.reservations for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users create own reservations" on public.reservations;
create policy "Users create own reservations"
  on public.reservations for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own reservations" on public.reservations;
create policy "Users update own reservations"
  on public.reservations for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Staff manage all reservations" on public.reservations;
create policy "Staff manage all reservations"
  on public.reservations for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'));

-- ============================================================
-- 5. notifications (Home & Account Module — Nimnada)
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  type text,
  related_reservation_id uuid references public.reservations(id) on delete set null,
  created_at timestamptz not null default now(),
  is_read boolean not null default false
);

alter table public.notifications enable row level security;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Staff manage all notifications" on public.notifications;
create policy "Staff manage all notifications"
  on public.notifications for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'));
-- ============================================================
-- 6. ADVANCED SEAT RESERVATION SYSTEM
-- ============================================================

-- A. Update the existing seats table to match the new requirements
ALTER TABLE public.seats RENAME COLUMN room TO zone;
ALTER TABLE public.seats RENAME COLUMN is_available TO is_blocked;
ALTER TABLE public.seats ALTER COLUMN is_blocked SET DEFAULT false;
UPDATE public.seats SET is_blocked = false;
ALTER TABLE public.seats ADD CONSTRAINT unique_seat_number UNIQUE (seat_number);

-- B. Create a dedicated seat_reservations table (separate from books to avoid breaking existing book features)
CREATE TABLE IF NOT EXISTS public.seat_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id uuid NOT NULL REFERENCES public.seats(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reservation_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'checked_in', 'completed', 'cancelled', 'no_show')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_seat_timeslot UNIQUE (seat_id, reservation_date, start_time)
);

ALTER TABLE public.seat_reservations ENABLE ROW LEVEL SECURITY;

-- C. Row Level Security Policies for seat_reservations
CREATE POLICY "Students read all seat reservations" ON public.seat_reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Students create own seat reservations" ON public.seat_reservations FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students cancel own seat reservations" ON public.seat_reservations FOR UPDATE TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Staff manage all seat reservations" ON public.seat_reservations FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'staff'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'staff'));

