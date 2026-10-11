-- LibroSeat book reservation and staff administration setup.
-- Run after supabase.schema.sql (and the seat reservation migration).
-- Safe to re-run.

create table if not exists public.seat_allocation_settings (
  id integer primary key check (id = 1),
  grace_period_minutes integer not null default 15 check (grace_period_minutes between 1 and 240),
  auto_release_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.seat_allocation_settings (id)
values (1) on conflict (id) do nothing;

alter table public.seat_allocation_settings enable row level security;
grant select, insert, update on public.seat_allocation_settings to authenticated;
grant select, insert, update, delete on public.books to authenticated;
grant select, insert, update on public.reservations to authenticated;

create or replace function public.is_library_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'staff'
  );
$$;

revoke all on function public.is_library_staff() from public;
grant execute on function public.is_library_staff() to authenticated;

drop policy if exists "Staff manage books" on public.books;
create policy "Staff manage books" on public.books
  for all to authenticated using (public.is_library_staff())
  with check (public.is_library_staff());

-- Book holds are inserted only through reserve_book() so its row lock and
-- availability check cannot be bypassed by a direct client insert.
drop policy if exists "Users create own book reservations" on public.reservations;

drop policy if exists "Staff read all reservations" on public.reservations;
create policy "Staff read all reservations" on public.reservations
  for select to authenticated using (public.is_library_staff());

drop policy if exists "Staff update all reservations" on public.reservations;
create policy "Staff update all reservations" on public.reservations
  for update to authenticated using (public.is_library_staff())
  with check (public.is_library_staff());

drop policy if exists "Staff read seat allocation settings" on public.seat_allocation_settings;
create policy "Staff read seat allocation settings" on public.seat_allocation_settings
  for select to authenticated using (public.is_library_staff());

drop policy if exists "Staff manage seat allocation settings" on public.seat_allocation_settings;
create policy "Staff manage seat allocation settings" on public.seat_allocation_settings
  for all to authenticated using (public.is_library_staff())
  with check (public.is_library_staff());

-- Book reservations are serialized on the book row, preventing two students
-- from successfully reserving the same copy at the same time.
create or replace function public.reserve_book(p_book_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  selected_book public.books%rowtype;
  new_reservation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in to reserve a book.' using errcode = '42501';
  end if;

  select * into selected_book from public.books where id = p_book_id for update;
  if not found then
    raise exception 'This book could not be found.' using errcode = 'P0002';
  end if;
  if selected_book.status <> 'available' then
    raise exception 'This book is not currently available.' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.reservations
    where ref_id = p_book_id and type = 'book' and status = 'confirmed'
  ) then
    raise exception 'This book already has an active reservation.' using errcode = '23505';
  end if;

  insert into public.reservations (user_id, type, ref_id, status)
  values (current_user_id, 'book', p_book_id, 'confirmed')
  returning id into new_reservation_id;

  update public.books set status = 'reserved' where id = p_book_id;
  return new_reservation_id;
end;
$$;

revoke all on function public.reserve_book(uuid) from public;
grant execute on function public.reserve_book(uuid) to authenticated;

-- Keep book inventory status in sync when a hold is cancelled or collected.
create or replace function public.sync_book_status_from_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type = 'book' and new.ref_id is not null and new.status is distinct from old.status then
    if new.status = 'confirmed' then
      update public.books set status = 'reserved' where id = new.ref_id;
    elsif new.status = 'collected' then
      update public.books set status = 'checked_out' where id = new.ref_id;
    elsif old.status = 'confirmed' and new.status in ('cancelled', 'expired') then
      update public.books set status = 'available' where id = new.ref_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_book_status_after_reservation_update on public.reservations;
create trigger sync_book_status_after_reservation_update
  after update of status on public.reservations
  for each row execute function public.sync_book_status_from_reservation();

revoke all on function public.sync_book_status_from_reservation() from public;

-- Staff management of the seat workflow's normalized reservation records.
drop policy if exists "Staff read all seat reservations" on public.seat_reservations;
create policy "Staff read all seat reservations" on public.seat_reservations
  for select to authenticated using (public.is_library_staff());

drop policy if exists "Staff update all seat reservations" on public.seat_reservations;
create policy "Staff update all seat reservations" on public.seat_reservations
  for update to authenticated using (public.is_library_staff())
  with check (public.is_library_staff());
