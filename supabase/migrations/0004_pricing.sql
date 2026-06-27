-- =====================================================================
-- MH71 — Per-room price overrides for "Thiết lập giá".
-- When a room's override is NULL it falls back to the shared value in
-- `settings` (electricity_rate / trash_fee). "Giống nhau" = all NULL.
-- Run this in the Supabase SQL editor after 0001–0003.
-- =====================================================================
alter table rooms add column if not exists default_trash numeric;  -- null = dùng giá chung
alter table rooms add column if not exists default_rate  numeric;  -- null = dùng giá chung
