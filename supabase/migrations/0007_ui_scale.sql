-- =====================================================================
-- MH71 — UI scale (interface + text size) preference.
-- Stored on the single settings row; applied app-wide via the root font-size.
-- Run this in the Supabase SQL editor after 0001–0006.
-- =====================================================================
alter table settings add column if not exists ui_scale real not null default 1;
