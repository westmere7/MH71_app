-- =====================================================================
-- MH71 — Partial payment ("trả thiếu") support.
-- amount_paid = số tiền đã thu thực tế. NULL means paid in full (= total).
-- A paid bill with amount_paid < total is "trả thiếu" (underpaid).
-- Run this in the Supabase SQL editor after 0001–0004.
-- =====================================================================
alter table bills add column if not exists amount_paid numeric;  -- null = thu đủ
