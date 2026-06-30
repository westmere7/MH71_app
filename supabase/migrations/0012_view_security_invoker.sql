-- =====================================================================
-- MH71 — Silence the Supabase "Security Definer View" lint on v_bills_full.
--
-- By default a Postgres view runs with the VIEW OWNER's permissions/RLS,
-- so querying it bypasses row-level security on the underlying tables.
-- security_invoker = on makes the view enforce the CALLING user's RLS
-- instead (Postgres 15+). The owner (authenticated) still sees everything;
-- anon still sees nothing. Run in the Supabase SQL editor.
-- =====================================================================

alter view public.v_bills_full set (security_invoker = on);
