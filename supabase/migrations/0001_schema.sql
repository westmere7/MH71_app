-- =====================================================================
-- MH71 — Schema (paste this FIRST in the Supabase SQL Editor)
-- Postgres / Supabase. Idempotent where practical.
-- =====================================================================

-- ---------- Enums ----------
do $$ begin
  create type room_kind_t as enum ('kiosk', 'room');
exception when duplicate_object then null; end $$;

do $$ begin
  -- progress states for "Ghi điện", "Thanh toán" (to providers), "Thu tiền"
  create type progress_status_t as enum ('chua', 'dang', 'xong');
exception when duplicate_object then null; end $$;

do $$ begin
  -- tenant payment state for a bill
  create type payment_status_t as enum (
    'unpaid',         -- Chưa thanh toán
    'paid_cash',      -- Đã trả tiền mặt
    'paid_transfer',  -- Đã chuyển khoản
    'partial',        -- Còn nợ (trả một phần)
    'vacant'          -- Trống (chưa có khách)
  );
exception when duplicate_object then null; end $$;

-- ---------- settings (singleton) ----------
create table if not exists settings (
  id                    smallint primary key default 1 check (id = 1),
  building_name         text    not null default 'MH71',
  electricity_rate      numeric not null default 3300,    -- đồng / kWh
  trash_fee             numeric not null default 50000,   -- đồng / phòng / tháng
  collection_target_pct numeric not null default 88,      -- % mục tiêu thu
  updated_at            timestamptz not null default now()
);

-- ---------- rooms (fixed structure: 2 kiosks + 24 rooms) ----------
create table if not exists rooms (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,             -- K1, K2, P1 .. P24
  kind         room_kind_t not null default 'room',
  default_rent numeric not null default 0,        -- tiền phòng mặc định
  sort_order   int not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------- tenants (full tenancy history; current = move_out_date is null) ----------
create table if not exists tenants (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references rooms(id) on delete cascade,
  name           text not null,
  phone          text,
  move_in_date   date,
  move_out_date  date,                            -- null = đang ở
  photo_url      text,
  notes          text,
  same_household boolean not null default false,  -- "cùng hộ" (chấm vàng)
  camera_access  boolean not null default false,  -- có quyền truy cập camera
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists one_current_tenant_per_room
  on tenants(room_id) where move_out_date is null;
create index if not exists tenants_room_idx on tenants(room_id);

-- ---------- months (per-month metadata) ----------
create table if not exists months (
  id                   uuid primary key default gen_random_uuid(),
  year                 int not null,
  month                int not null check (month between 1 and 12),
  period_start         date,                            -- vd 10.05.2026
  period_end           date,                            -- vd 10.06.2026
  meter_status         progress_status_t not null default 'chua', -- Ghi điện
  fee_status           progress_status_t not null default 'chua', -- Thanh toán (cho nhà cung cấp)
  collection_status    progress_status_t not null default 'chua', -- Thu tiền
  other_fees           numeric not null default 0,       -- chi phí ngoài khác (cho lợi nhuận)
  meter_note_photo_url text,                             -- ảnh ghi chú số điện của quản lý
  created_at           timestamptz not null default now(),
  unique (year, month)
);

-- ---------- bills (1 dòng / phòng / tháng — bản ghi cốt lõi) ----------
create table if not exists bills (
  id                 uuid primary key default gen_random_uuid(),
  month_id           uuid not null references months(id) on delete cascade,
  room_id            uuid not null references rooms(id) on delete cascade,
  tenant_id          uuid references tenants(id) on delete set null,
  tenant_name        text,                              -- snapshot tên người thuê
  reading_old        numeric not null default 0,        -- số cũ
  reading_new        numeric,                           -- số mới (null đến khi quản lý nhập)
  units              numeric generated always as
                       (greatest(coalesce(reading_new,0) - reading_old, 0)) stored,
  electricity_rate   numeric not null default 3300,     -- snapshot đơn giá điện
  electricity_amount numeric generated always as
                       (greatest(coalesce(reading_new,0) - reading_old, 0) * electricity_rate) stored,
  room_fee           numeric not null default 0,        -- tiền phòng (snapshot, sửa được)
  trash_fee          numeric not null default 0,        -- tiền rác (snapshot)
  total              numeric generated always as
                       (greatest(coalesce(reading_new,0) - reading_old, 0) * electricity_rate
                        + room_fee + trash_fee) stored,
  payment_status     payment_status_t not null default 'unpaid',
  paid_at            timestamptz,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (month_id, room_id)
);
create index if not exists bills_month_idx on bills(month_id);
create index if not exists bills_room_idx  on bills(room_id);

-- ---------- payment_logs (append-only audit trail) ----------
create table if not exists payment_logs (
  id          uuid primary key default gen_random_uuid(),
  bill_id     uuid not null references bills(id) on delete cascade,
  old_status  payment_status_t,
  new_status  payment_status_t not null,
  changed_at  timestamptz not null default now(),
  changed_by  text
);
create index if not exists payment_logs_bill_idx on payment_logs(bill_id);

-- =====================================================================
-- Triggers
-- =====================================================================

-- updated_at for tenants
create or replace function trg_set_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end; $$ language plpgsql;

drop trigger if exists tenants_set_updated_at on tenants;
create trigger tenants_set_updated_at before update on tenants
  for each row execute function trg_set_updated_at();

-- bills: on payment_status change -> write log + manage paid_at; always bump updated_at
create or replace function trg_bill_status_change() returns trigger as $$
begin
  if (new.payment_status is distinct from old.payment_status) then
    insert into payment_logs(bill_id, old_status, new_status, changed_by)
      values (new.id, old.payment_status, new.payment_status,
              nullif(auth.jwt() ->> 'email', ''));
    if new.payment_status in ('paid_cash', 'paid_transfer') then
      new.paid_at := now();
    elsif new.payment_status in ('unpaid', 'vacant') then
      new.paid_at := null;
    elsif new.payment_status = 'partial' and new.paid_at is null then
      new.paid_at := now();
    end if;
  end if;
  new.updated_at := now();
  return new;
end; $$ language plpgsql security definer;

drop trigger if exists bills_status_change on bills;
create trigger bills_status_change before update on bills
  for each row execute function trg_bill_status_change();

-- =====================================================================
-- Denormalized view for human-readable CSV export (mirrors the sheet)
-- =====================================================================
create or replace view v_bills_full as
select
  m.year                                              as nam,
  m.month                                             as thang,
  to_char(make_date(m.year, m.month, 1), 'MM/YYYY')   as ky,
  r.code                                              as phong,
  r.kind                                              as loai,
  coalesce(b.tenant_name, t.name)                     as nguoi_thue,
  t.phone                                             as sdt_zalo,
  b.reading_old                                       as so_cu,
  b.reading_new                                       as so_moi,
  b.units                                             as so_dien,
  b.electricity_rate                                  as don_gia_dien,
  b.electricity_amount                                as tien_dien,
  b.room_fee                                          as tien_phong,
  b.trash_fee                                         as tien_rac,
  b.total                                             as tong,
  b.payment_status                                    as trang_thai,
  b.paid_at                                           as thoi_gian_thanh_toan,
  b.notes                                             as ghi_chu
from bills b
join months m on m.id = b.month_id
join rooms  r on r.id = b.room_id
left join tenants t on t.id = b.tenant_id
order by m.year desc, m.month desc, r.sort_order;

-- =====================================================================
-- Row Level Security: owner (authenticated) = full access.
-- The meter page never uses the anon key — it goes through a server
-- route handler with the service-role key (which bypasses RLS).
-- =====================================================================
alter table settings     enable row level security;
alter table rooms        enable row level security;
alter table tenants      enable row level security;
alter table months       enable row level security;
alter table bills        enable row level security;
alter table payment_logs enable row level security;

do $$
declare t text;
begin
  foreach t in array array['settings','rooms','tenants','months','bills','payment_logs'] loop
    execute format('drop policy if exists owner_all on %I;', t);
    execute format(
      'create policy owner_all on %I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- =====================================================================
-- Storage buckets (public read) + authenticated write policies
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('tenant-photos', 'tenant-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('meter-notes', 'meter-notes', true)
on conflict (id) do nothing;

drop policy if exists "mh71 storage write" on storage.objects;
create policy "mh71 storage write" on storage.objects
  for all to authenticated
  using (bucket_id in ('tenant-photos', 'meter-notes'))
  with check (bucket_id in ('tenant-photos', 'meter-notes'));

-- =====================================================================
-- Realtime: broadcast row changes so devices stay in sync
-- =====================================================================
do $$ begin
  alter publication supabase_realtime add table bills;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table months;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table tenants;
exception when duplicate_object then null; end $$;

-- seed the singleton settings row
insert into settings (id) values (1) on conflict (id) do nothing;
