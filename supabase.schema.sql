-- ============================================================
-- LIBROSEAT - BOOK RESERVATION UPGRADE
-- FIXED VERSION FOR SUPABASE RPC reserve_book 404
-- ============================================================

begin;

-- ============================================================
-- 1. BOOK TABLE COLUMNS
-- ============================================================

alter table public.books
  add column if not exists category text;

alter table public.books
  add column if not exists cover_url text;

alter table public.books
  add column if not exists description text;

alter table public.books
  add column if not exists isbn text;

alter table public.books
  add column if not exists shelf text;

alter table public.books
  add column if not exists total_copies integer;

alter table public.books
  add column if not exists available_copies integer;

alter table public.books
  add column if not exists is_available boolean;


-- ============================================================
-- 2. FIX EXISTING BOOK DATA
-- ============================================================

update public.books
set
  category = coalesce(nullif(category, ''), 'IT'),

  total_copies = coalesce(
    total_copies,
    case
      when coalesce(is_available, status = 'available', false)
      then 1
      else 0
    end
  ),

  available_copies = coalesce(
    available_copies,
    case
      when coalesce(is_available, status = 'available', false)
      then 1
      else 0
    end
  );

update public.books
set
  total_copies = greatest(coalesce(total_copies, 0), 0),

  available_copies = greatest(
    0,
    least(
      coalesce(available_copies, 0),
      greatest(coalesce(total_copies, 0), 0)
    )
  );

update public.books
set
  status = case
    when coalesce(available_copies, 0) > 0
    then 'available'
    else 'unavailable'
  end,

  is_available = coalesce(available_copies, 0) > 0;


-- ============================================================
-- 3. DEFAULT VALUES
-- ============================================================

alter table public.books
  alter column category set default 'IT';

alter table public.books
  alter column total_copies set default 1;

alter table public.books
  alter column available_copies set default 1;

alter table public.books
  alter column is_available set default true;


-- ============================================================
-- 4. RESERVATION TABLE COLUMNS
-- ============================================================

alter table public.reservations
  add column if not exists reservation_code text;

alter table public.reservations
  add column if not exists reservation_date date;

alter table public.reservations
  add column if not exists pickup_before date;


-- ============================================================
-- 5. RESERVATION CODE SEQUENCE
-- ============================================================

create sequence if not exists public.reservation_code_seq;


-- ============================================================
-- 6. GENERATE CODES FOR OLD RESERVATIONS
-- ============================================================

do $$
declare
  old_reservation record;
  next_code_number bigint;
begin

  for old_reservation in
    select id, created_at
    from public.reservations
    where reservation_code is null
    order by created_at, id
  loop

    next_code_number :=
      nextval('public.reservation_code_seq');

    update public.reservations
    set reservation_code =
      'RES-' ||
      to_char(
        coalesce(old_reservation.created_at, now()),
        'YYYY'
      ) ||
      '-' ||
      lpad(
        next_code_number::text,
        5,
        '0'
      )
    where id = old_reservation.id;

  end loop;

end;
$$;


-- ============================================================
-- 7. UNIQUE RESERVATION CODE
-- ============================================================

create unique index if not exists reservations_code_unique
on public.reservations(reservation_code)
where reservation_code is not null;


-- ============================================================
-- 8. CREATE MISSING PROFILES
-- ============================================================

insert into public.profiles (
  id,
  full_name,
  student_id,
  email,
  role
)
select
  auth_user.id,
  auth_user.raw_user_meta_data ->> 'full_name',
  auth_user.raw_user_meta_data ->> 'student_id',
  auth_user.email,
  'student'::public.user_role
from auth.users as auth_user
where auth_user.email is not null
and not exists (
  select 1
  from public.profiles as profile
  where profile.email = auth_user.email
)
on conflict (id) do nothing;


-- ============================================================
-- 9. BOOK RESERVATIONS TABLE
-- ============================================================

create table if not exists public.book_reservations (

  id uuid primary key
    default gen_random_uuid(),

  reservation_id uuid not null unique
    references public.reservations(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  book_id uuid not null
    references public.books(id)
    on delete restrict,

  book_title text not null,

  book_author text,

  book_category text,

  reservation_code text not null unique,

  reservation_date date not null,

  pickup_before date not null,

  status text not null default 'confirmed',

  created_at timestamptz not null default now(),

  check (
    pickup_before >= reservation_date
  )
);


-- ============================================================
-- 10. BOOK STATUS FUNCTION
-- ============================================================

create or replace function public.sync_book_status()
returns trigger
language plpgsql
as $$
begin

  new.total_copies :=
    greatest(
      0,
      coalesce(new.total_copies, 0)
    );

  new.available_copies :=
    greatest(
      0,
      least(
        coalesce(new.available_copies, 0),
        new.total_copies
      )
    );

  new.status :=
    case
      when new.available_copies > 0
      then 'available'
      else 'unavailable'
    end;

  new.is_available :=
    new.available_copies > 0;

  return new;

end;
$$;


-- ============================================================
-- 11. BOOK STATUS TRIGGER
-- ============================================================

drop trigger if exists books_sync_status
on public.books;

create trigger books_sync_status

before insert or update of
  available_copies,
  total_copies

on public.books

for each row
execute function public.sync_book_status();


-- ============================================================
-- 12. REMOVE OLD RPC FUNCTION
-- ============================================================

drop function if exists
public.reserve_book(uuid, date, date);


-- ============================================================
-- 13. MAIN RESERVATION RPC FUNCTION
-- ============================================================

create or replace function public.reserve_book(
  p_book_id uuid,
  p_reservation_date date,
  p_pickup_before date
)
returns public.book_reservations

language plpgsql

security definer

set search_path = public, auth

as $$

declare

  current_user_id uuid;

  selected_book public.books%rowtype;

  saved_reservation public.reservations%rowtype;

  saved_book_reservation
    public.book_reservations%rowtype;

  reservation_user_id_type text;

  reservation_code_value text;

begin

  -- ----------------------------------------------------------
  -- CURRENT AUTH USER
  -- ----------------------------------------------------------

  current_user_id := auth.uid();


  -- ----------------------------------------------------------
  -- AUTH CHECK
  -- ----------------------------------------------------------

  if current_user_id is null then

    raise exception
      'Sign in with a Supabase Auth account before reserving a book.';

  end if;


  -- ----------------------------------------------------------
  -- PROFILE CHECK
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from public.profiles
    where id = current_user_id
  ) then

    raise exception
      'Your user profile is missing. Please sign out and sign in again.';

  end if;


  -- ----------------------------------------------------------
  -- DATE VALIDATION
  -- ----------------------------------------------------------

  if p_reservation_date is null
     or p_pickup_before is null then

    raise exception
      'Choose both a reservation date and a pickup-before date.';

  end if;


  if p_reservation_date < current_date then

    raise exception
      'Reservation date cannot be in the past.';

  end if;


  if p_pickup_before < p_reservation_date then

    raise exception
      'Pickup date must be on or after the reservation date.';

  end if;


  -- ----------------------------------------------------------
  -- GET BOOK
  -- ----------------------------------------------------------

  select *
  into selected_book

  from public.books

  where id = p_book_id

  for update;


  -- ----------------------------------------------------------
  -- BOOK EXISTS
  -- ----------------------------------------------------------

  if not found then

    raise exception
      'Book not found.';

  end if;


  -- ----------------------------------------------------------
  -- BOOK AVAILABLE
  -- ----------------------------------------------------------

  if coalesce(
    selected_book.available_copies,
    0
  ) <= 0 then

    raise exception
      'This book is currently unavailable.';

  end if;


  -- ----------------------------------------------------------
  -- DUPLICATE RESERVATION CHECK
  -- ----------------------------------------------------------

  if exists (

    select 1

    from public.reservations

    where user_id::text =
          current_user_id::text

      and type = 'book'

      and ref_id = p_book_id

      and status = 'confirmed'

  ) then

    raise exception
      'You already have an active reservation for this book.';

  end if;


  -- ----------------------------------------------------------
  -- CREATE RESERVATION CODE
  -- ----------------------------------------------------------

  reservation_code_value :=
    'RES-' ||
    to_char(current_date, 'YYYY') ||
    '-' ||
    lpad(
      nextval(
        'public.reservation_code_seq'
      )::text,
      5,
      '0'
    );


  -- ----------------------------------------------------------
  -- CHECK USER_ID TYPE
  -- ----------------------------------------------------------

  select data_type
  into reservation_user_id_type

  from information_schema.columns

  where table_schema = 'public'

    and table_name = 'reservations'

    and column_name = 'user_id';


  -- ==========================================================
  -- INSERT RESERVATION
  -- ==========================================================

  if reservation_user_id_type = 'uuid' then

    insert into public.reservations (

      user_id,
      type,
      ref_id,
      status,
      reservation_code,
      reservation_date,
      pickup_before

    )

    values (

      current_user_id,
      'book',
      p_book_id,
      'confirmed',
      reservation_code_value,
      p_reservation_date,
      p_pickup_before

    )

    returning *
    into saved_reservation;


  else

    execute '

      insert into public.reservations (

        user_id,
        type,
        ref_id,
        status,
        reservation_code,
        reservation_date,
        pickup_before

      )

      values (

        $1,
        ''book'',
        $2,
        ''confirmed'',
        $3,
        $4,
        $5

      )

      returning *

    '

    into saved_reservation

    using

      current_user_id::text,
      p_book_id,
      reservation_code_value,
      p_reservation_date,
      p_pickup_before;

  end if;


  -- ==========================================================
  -- INSERT BOOK RESERVATION
  -- ==========================================================

  insert into public.book_reservations (

    reservation_id,

    user_id,

    book_id,

    book_title,

    book_author,

    book_category,

    reservation_code,

    reservation_date,

    pickup_before,

    status

  )

  values (

    saved_reservation.id,

    current_user_id,

    selected_book.id,

    selected_book.title,

    selected_book.author,

    selected_book.category,

    reservation_code_value,

    p_reservation_date,

    p_pickup_before,

    'confirmed'

  )

  returning *
  into saved_book_reservation;


  -- ==========================================================
  -- REDUCE AVAILABLE COPIES
  -- ==========================================================

  update public.books

  set available_copies =
    greatest(
      0,
      coalesce(available_copies, 0) - 1
    )

  where id = p_book_id;


  -- ==========================================================
  -- RETURN RESULT
  -- ==========================================================

  return saved_book_reservation;

end;

$$;


-- ============================================================
-- 14. IMPORTANT RPC PERMISSIONS
-- ============================================================

revoke all
on function public.reserve_book(uuid, date, date)
from public;

grant execute
on function public.reserve_book(uuid, date, date)
to authenticated;

grant usage
on schema public
to authenticated;


-- ============================================================
-- 15. ROW LEVEL SECURITY
-- ============================================================

alter table public.books
enable row level security;

alter table public.reservations
enable row level security;

alter table public.book_reservations
enable row level security;


-- ============================================================
-- 16. BOOK READ POLICY
-- ============================================================

drop policy if exists
"Anyone signed in can read books"
on public.books;

create policy
"Anyone signed in can read books"

on public.books

for select

to authenticated

using (true);


-- ============================================================
-- 17. RESERVATION READ POLICY
-- ============================================================

drop policy if exists
"Users read own reservations"
on public.reservations;

create policy
"Users read own reservations"

on public.reservations

for select

to authenticated

using (
  auth.uid()::text =
  user_id::text
);


-- ============================================================
-- 18. RESERVATION UPDATE POLICY
-- ============================================================

drop policy if exists
"Users update own reservations"
on public.reservations;

create policy
"Users update own reservations"

on public.reservations

for update

to authenticated

using (
  auth.uid()::text =
  user_id::text
)

with check (
  auth.uid()::text =
  user_id::text
);


-- ============================================================
-- 19. BOOK RESERVATION READ POLICY
-- ============================================================

drop policy if exists
"Users read own book reservations"
on public.book_reservations;

create policy
"Users read own book reservations"

on public.book_reservations

for select

to authenticated

using (
  auth.uid() = user_id
);


-- ============================================================
-- 20. CANCEL RESERVATION FUNCTION
-- ============================================================

create or replace function
public.restore_cancelled_book_copy()

returns trigger

language plpgsql

security definer

set search_path = public

as $$

begin

  if new.type = 'book'

     and old.status = 'confirmed'

     and new.status = 'cancelled'

     and new.ref_id is not null

  then

    update public.books

    set available_copies =
      least(
        coalesce(total_copies, 0),
        coalesce(available_copies, 0) + 1
      )

    where id = new.ref_id;


    update public.book_reservations

    set status = 'cancelled'

    where reservation_id = new.id;

  end if;


  return new;

end;

$$;


-- ============================================================
-- 21. CANCEL TRIGGER
-- ============================================================

drop trigger if exists
reservations_restore_book_copy
on public.reservations;

create trigger
reservations_restore_book_copy

after update of status

on public.reservations

for each row

execute function
public.restore_cancelled_book_copy();


-- ============================================================
-- 22. RELOAD POSTGREST SCHEMA
-- ============================================================

notify pgrst, 'reload schema';


commit;


-- ============================================================
-- 23. VERIFY RPC FUNCTION
-- ============================================================

select
  routine_schema,
  routine_name,
  routine_type

from information_schema.routines

where routine_schema = 'public'

and routine_name = 'reserve_book';


-- ============================================================
-- 24. VERIFY EXACT FUNCTION SIGNATURE
-- ============================================================

select
  p.proname as function_name,
  pg_get_function_identity_arguments(
    p.oid
  ) as arguments

from pg_proc p

join pg_namespace n
  on n.oid = p.pronamespace

where n.nspname = 'public'

and p.proname = 'reserve_book';


-- ============================================================
-- 25. VERIFY EXECUTE PERMISSION
-- ============================================================

select
  routine_schema,
  routine_name,
  routine_privileges

from information_schema.routines

where routine_schema = 'public'

and routine_name = 'reserve_book';