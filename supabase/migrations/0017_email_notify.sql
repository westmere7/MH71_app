-- =====================================================================
-- MH71 — Email notification when the manager fills số điện for a month.
--   • months.meter_notified_at : stamped the first time we email the owner,
--     so retries/redeploys never send a duplicate "first fill" email.
--   • settings.notify_email     : the address to notify (editable in Cài đặt).
-- Run in the Supabase SQL editor.
-- =====================================================================

alter table months   add column if not exists meter_notified_at timestamptz;
alter table settings add column if not exists notify_email       text;
