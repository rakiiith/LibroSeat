-- PROPOSAL ONLY: review and apply manually in Supabase after checking the
-- existing reservation data. This file is not executed by the app.
-- It replaces exact-start uniqueness with an active-reservation overlap rule.

create extension if not exists btree_gist;

do $$
begin
  if exists (
    select 1
    from public.seat_reservations a
    join public.seat_reservations b
      on a.seat_id = b.seat_id
     and a.reservation_date = b.reservation_date
     and a.id < b.id
     and a.start_time < b.end_time
     and a.end_time > b.start_time
     and a.status in ('reserved', 'checked_in')
     and b.status in ('reserved', 'checked_in')
  ) then
    raise exception 'Resolve overlapping active seat reservations before applying this migration.';
  end if;

  if exists (
    select 1 from public.seat_reservations where start_time >= end_time
  ) then
    raise exception 'Resolve reservations whose start_time is not earlier than end_time before applying this migration.';
  end if;
end;
$$;

alter table public.seat_reservations
  drop constraint if exists unique_seat_timeslot;

alter table public.seat_reservations
  drop constraint if exists seat_reservations_valid_time_range;
alter table public.seat_reservations
  add constraint seat_reservations_valid_time_range
  check (start_time < end_time);

alter table public.seat_reservations
  drop constraint if exists seat_reservations_no_active_time_overlap;
alter table public.seat_reservations
  add constraint seat_reservations_no_active_time_overlap
  exclude using gist (
    seat_id with =,
    tsrange(reservation_date + start_time, reservation_date + end_time, '[)') with &&
  )
  where (status in ('reserved', 'checked_in'));
