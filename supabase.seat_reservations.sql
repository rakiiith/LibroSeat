-- Seat availability RPC for the existing LibroSeat schema.
-- Expected table: public.seat_reservations(seat_id, reservation_date, status)
-- This migration intentionally does not create or alter tables.

create or replace function public.get_reserved_seat_ids(p_booking_date date)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct reservation.seat_id
  from public.seat_reservations as reservation
  where reservation.reservation_date = p_booking_date
    and reservation.status in ('reserved', 'checked_in');
$$;

revoke all on function public.get_reserved_seat_ids(date) from public;
grant execute on function public.get_reserved_seat_ids(date) to authenticated;

notify pgrst, 'reload schema';
