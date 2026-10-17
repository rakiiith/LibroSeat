-- Seat reservation setup for LibroSeat.
-- Safe to re-run: existing seat tables are kept; required tables are created only
-- when absent. Review any existing duplicate/overlapping confirmed reservations
-- before applying the exclusion constraint.

create extension if not exists btree_gist;

create table if not exists public.reading_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  floor integer,
  created_at timestamptz not null default now()
);

create table if not exists public.library_seats (
  id uuid primary key default gen_random_uuid(),
  reading_room_id uuid references public.reading_rooms(id) on delete set null,
  seat_number text not null,
  seat_type text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (reading_room_id, seat_number)
);

create table if not exists public.seat_reservations (
  id uuid primary key default gen_random_uuid(),
  seat_id uuid not null references public.library_seats(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'confirmed',
  created_at timestamptz not null default now(),
  constraint seat_reservations_valid_time check (end_time > start_time)
);

create index if not exists seat_reservations_user_schedule_idx
  on public.seat_reservations (user_id, booking_date, start_time);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'seat_reservations_valid_time'
      and conrelid = 'public.seat_reservations'::regclass
  ) then
    alter table public.seat_reservations
      add constraint seat_reservations_valid_time check (end_time > start_time);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'seat_reservations_no_confirmed_overlap'
      and conrelid = 'public.seat_reservations'::regclass
  ) then
    alter table public.seat_reservations
      add constraint seat_reservations_no_confirmed_overlap
      exclude using gist (
        seat_id with =,
        tsrange(booking_date + start_time, booking_date + end_time, '[)') with &&
      ) where (status = 'confirmed');
  end if;
end $$;

alter table public.reading_rooms enable row level security;
alter table public.library_seats enable row level security;
alter table public.seat_reservations enable row level security;

grant select on public.reading_rooms, public.library_seats to authenticated;
grant select, insert, update on public.seat_reservations to authenticated;

drop policy if exists "Authenticated users read reading rooms" on public.reading_rooms;
create policy "Authenticated users read reading rooms"
  on public.reading_rooms for select to authenticated using (true);

drop policy if exists "Authenticated users read library seats" on public.library_seats;
create policy "Authenticated users read library seats"
  on public.library_seats for select to authenticated using (true);

drop policy if exists "Users read own seat reservations" on public.seat_reservations;
create policy "Users read own seat reservations"
  on public.seat_reservations for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users create own seat reservations" on public.seat_reservations;
create policy "Users create own seat reservations"
  on public.seat_reservations for insert to authenticated
  with check (auth.uid() = user_id and status = 'confirmed');

drop policy if exists "Users cancel own confirmed seat reservations" on public.seat_reservations;
create policy "Users cancel own confirmed seat reservations"
  on public.seat_reservations for update to authenticated
  using (
    auth.uid() = user_id
    and status = 'confirmed'
    and (booking_date > current_date or (booking_date = current_date and start_time > localtime))
  )
  with check (auth.uid() = user_id and status = 'cancelled');

create or replace function public.get_reserved_seat_ids(p_booking_date date)
returns setof uuid
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  return query
    select distinct reservation.seat_id
    from public.seat_reservations as reservation
    where reservation.booking_date = p_booking_date
      and reservation.status = 'confirmed';
end;
$$;

revoke all on function public.get_reserved_seat_ids(date) from public;
grant execute on function public.get_reserved_seat_ids(date) to authenticated;

-- Publish only non-sensitive seat status fields so every signed-in client can
-- refresh seat availability without exposing reservation owners or time details.
create or replace function public.broadcast_seat_availability_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, realtime
as $$
declare
  reservation_row record;
begin
  if tg_op = 'DELETE' then
    reservation_row := old;
  else
    reservation_row := new;
  end if;

  perform realtime.send(
    jsonb_build_object(
      'seat_id', reservation_row.seat_id,
      'booking_date', reservation_row.booking_date,
      'status', reservation_row.status
    ),
    'seat_reservation_changed',
    'seat-availability',
    false
  );
  return null;
end;
$$;

drop trigger if exists seat_reservations_broadcast_availability on public.seat_reservations;
create trigger seat_reservations_broadcast_availability
  after insert or update or delete on public.seat_reservations
  for each row execute function public.broadcast_seat_availability_change();

revoke all on function public.broadcast_seat_availability_change() from public;

-- Enable Postgres Changes when Supabase Realtime is available in this project.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'seat_reservations'
    ) then
    alter publication supabase_realtime add table public.seat_reservations;
  end if;
end $$;
