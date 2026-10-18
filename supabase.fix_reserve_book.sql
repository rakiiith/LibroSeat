-- ============================================================
-- LIBROSEAT - MINIMAL FIX FOR reserve_book RPC
-- Run this in Supabase SQL Editor to fix the
-- "no field available_copies" error.
-- ============================================================

-- STEP 1: Add missing columns to books table
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS available_copies integer DEFAULT 1;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS total_copies    integer DEFAULT 1;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_available    boolean DEFAULT true;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS category        text    DEFAULT 'IT';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS cover_url       text;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS description     text;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS isbn            text;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS shelf           text;

-- STEP 2: Backfill nulls so reserve_book checks work correctly
UPDATE public.books
SET
  available_copies = COALESCE(available_copies, CASE WHEN COALESCE(is_available, true) THEN 1 ELSE 0 END),
  total_copies     = COALESCE(total_copies,     CASE WHEN COALESCE(is_available, true) THEN 1 ELSE 0 END),
  is_available     = COALESCE(is_available, true)
WHERE available_copies IS NULL OR total_copies IS NULL OR is_available IS NULL;

-- STEP 3: Ensure the reservation code sequence exists
CREATE SEQUENCE IF NOT EXISTS public.reservation_code_seq;

-- STEP 3b: Add missing columns to reservations table
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS reservation_code text;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS reservation_date date;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS pickup_before    date;

-- Recreate the reserve_book function (drop old signature first)
DROP FUNCTION IF EXISTS public.reserve_book(uuid, date, date);

CREATE OR REPLACE FUNCTION public.reserve_book(
  p_book_id          uuid,
  p_reservation_date date,
  p_pickup_before    date
)
RETURNS public.book_reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id          uuid;
  selected_book            public.books%rowtype;
  saved_reservation        public.reservations%rowtype;
  saved_book_reservation   public.book_reservations%rowtype;
  reservation_user_id_type text;
  reservation_code_value   text;
BEGIN

  -- AUTH CHECK
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Sign in with a Supabase Auth account before reserving a book.';
  END IF;

  -- PROFILE CHECK
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = current_user_id) THEN
    RAISE EXCEPTION 'Your user profile is missing. Please sign out and sign in again.';
  END IF;

  -- DATE VALIDATION
  IF p_reservation_date IS NULL OR p_pickup_before IS NULL THEN
    RAISE EXCEPTION 'Choose both a reservation date and a pickup-before date.';
  END IF;
  IF p_reservation_date < current_date THEN
    RAISE EXCEPTION 'Reservation date cannot be in the past.';
  END IF;
  IF p_pickup_before < p_reservation_date THEN
    RAISE EXCEPTION 'Pickup date must be on or after the reservation date.';
  END IF;

  -- GET BOOK (lock row)
  SELECT * INTO selected_book FROM public.books WHERE id = p_book_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Book not found.';
  END IF;

  -- AVAILABILITY CHECK
  IF COALESCE(selected_book.available_copies, 0) <= 0 THEN
    RAISE EXCEPTION 'This book is currently unavailable.';
  END IF;

  -- DUPLICATE RESERVATION CHECK
  IF EXISTS (
    SELECT 1 FROM public.reservations
    WHERE user_id::text = current_user_id::text
      AND type   = 'book'
      AND ref_id = p_book_id
      AND status = 'confirmed'
  ) THEN
    RAISE EXCEPTION 'You already have an active reservation for this book.';
  END IF;

  -- GENERATE RESERVATION CODE
  reservation_code_value :=
    'RES-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('public.reservation_code_seq')::text, 5, '0');

  -- DETECT user_id COLUMN TYPE
  SELECT data_type INTO reservation_user_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'reservations'
    AND column_name  = 'user_id';

  -- INSERT RESERVATION
  IF reservation_user_id_type = 'uuid' THEN
    INSERT INTO public.reservations (user_id, type, ref_id, status, reservation_code, reservation_date, pickup_before)
    VALUES (current_user_id, 'book', p_book_id, 'confirmed', reservation_code_value, p_reservation_date, p_pickup_before)
    RETURNING * INTO saved_reservation;
  ELSE
    EXECUTE '
      INSERT INTO public.reservations (user_id, type, ref_id, status, reservation_code, reservation_date, pickup_before)
      VALUES ($1, ''book'', $2, ''confirmed'', $3, $4, $5)
      RETURNING *
    '
    INTO saved_reservation
    USING current_user_id::text, p_book_id, reservation_code_value, p_reservation_date, p_pickup_before;
  END IF;

  -- INSERT BOOK RESERVATION
  INSERT INTO public.book_reservations (
    reservation_id, user_id, book_id, book_title, book_author,
    book_category, reservation_code, reservation_date, pickup_before, status
  )
  VALUES (
    saved_reservation.id, current_user_id, selected_book.id,
    selected_book.title, selected_book.author, selected_book.category,
    reservation_code_value, p_reservation_date, p_pickup_before, 'confirmed'
  )
  RETURNING * INTO saved_book_reservation;

  -- DECREMENT AVAILABLE COPIES
  UPDATE public.books
  SET available_copies = GREATEST(0, COALESCE(available_copies, 0) - 1)
  WHERE id = p_book_id;

  RETURN saved_book_reservation;

END;
$$;

-- STEP 4: Grant permissions
REVOKE ALL ON FUNCTION public.reserve_book(uuid, date, date) FROM public;
GRANT EXECUTE ON FUNCTION public.reserve_book(uuid, date, date) TO authenticated;
