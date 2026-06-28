-- =====================================================================
-- MH71 — The actual EVN electricity bill the owner pays each month. This is
-- DIFFERENT from the electricity fee charged to tenants (computed from meter
-- readings). Entered manually per month and used in:
--   Lợi nhuận = Doanh thu − (Chi phí tổng cộng + Điện EVN)
-- Run this in the Supabase SQL editor after 0001–0009.
-- =====================================================================
alter table months add column if not exists evn_bill numeric not null default 0;
