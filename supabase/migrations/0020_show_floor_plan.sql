-- =====================================================================
-- MH71 — Setting: show the experimental "Sơ đồ" (floor plan) tab.
-- Off by default; toggled in Cài đặt → Tính năng thử nghiệm.
-- Run this in the Supabase SQL editor after 0001–0019.
-- =====================================================================
alter table settings add column if not exists show_floor_plan boolean not null default false;
