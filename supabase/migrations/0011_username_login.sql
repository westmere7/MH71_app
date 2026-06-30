-- =====================================================================
-- MH71 — Username login. Supabase Auth is email/password; this lets people
-- sign in with a short username instead of typing the full email.
--
-- A credential set = (email, username, password):
--   • email + password  → the real Supabase Auth user (create in Auth → Users)
--   • username          → a short handle mapped to that email (rows below)
--
-- The username→email map is private (RLS, no policies). Login resolves it via
-- the SECURITY DEFINER function below, which the anon key may execute.
-- Run this in the Supabase SQL editor after 0001–0010.
-- =====================================================================

create table if not exists app_logins (
  username text primary key,
  email    text not null
);

alter table app_logins enable row level security;  -- no policies = no direct client access

create or replace function public.email_for_username(uname text)
returns text
language sql
security definer
set search_path = public
as $$
  select email from app_logins where lower(username) = lower(trim(uname)) limit 1;
$$;

revoke all on function public.email_for_username(text) from public;
grant execute on function public.email_for_username(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Provision usernames here (one row per account). Example — EDIT THESE:
--
--   insert into app_logins (username, email) values
--     ('admin', 'bailey.aurora@davieunitedsoccer.com')
--   on conflict (username) do update set email = excluded.email;
-- ---------------------------------------------------------------------
