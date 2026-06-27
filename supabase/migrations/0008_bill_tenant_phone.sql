-- =====================================================================
-- MH71 — Snapshot the tenant's phone onto each month's bill, so the phone
-- (like the name) is month-specific and never propagates across months.
-- Run this in the Supabase SQL editor after 0001–0007.
-- =====================================================================
alter table bills add column if not exists tenant_phone text;
