-- =====================================================================
-- MH71 — Manual snapshots ("bản sao lưu"). Each row freezes a month's full
-- bill set at a point in time (jsonb), so the owner can keep a dated record
-- and export it to CSV. Read/create/delete only — never used to revert data.
-- Run in the Supabase SQL editor.
-- =====================================================================

create table if not exists backups (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  month_id     uuid references months(id) on delete cascade,
  year         int not null,
  month        int not null,
  units_total  int not null default 0,
  total_billed numeric not null default 0,
  data         jsonb not null   -- frozen per-room rows at snapshot time
);

create index if not exists backups_month_idx on backups (month_id, created_at desc);

alter table backups enable row level security;
drop policy if exists owner_all on backups;
create policy owner_all on backups for all to authenticated using (true) with check (true);
