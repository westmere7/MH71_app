-- =====================================================================
-- MH71 — Track WHEN the on-site manager finished entering the meter readings.
-- Set by the /api/meter/submit route when he taps "Hoàn tất ghi điện".
-- Run this in the Supabase SQL editor after 0001–0005.
-- =====================================================================
alter table months add column if not exists meter_filled_at timestamptz;
