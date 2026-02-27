-- Migration: Drop old process_payment_atomic function
-- Purpose: Remove overloaded function to avoid schema cache conflicts
-- Date: 2026-02-27

DROP FUNCTION IF EXISTS public.process_payment_atomic CASCADE;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
