-- =====================================================================
-- MH71 — Setting: lock months that have passed (every month except the
-- newest) so their records and prices can't be modified or removed.
-- Run this in the Supabase SQL editor after 0001–0008.
-- =====================================================================
alter table settings add column if not exists lock_past_months boolean not null default true;
