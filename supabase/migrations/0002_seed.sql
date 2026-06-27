-- =====================================================================
-- MH71 — Seed data (paste this SECOND, after 0001_schema.sql)
-- Real data transcribed from the June 2026 sheet. Safe to re-run.
-- Replace / extend later when you provide historical months.
-- =====================================================================

-- ---------- settings ----------
update settings
   set building_name = 'MH71', electricity_rate = 3300,
       trash_fee = 50000, collection_target_pct = 88
 where id = 1;

-- ---------- rooms (2 kiosks + 24 rooms) ----------
insert into rooms (code, kind, default_rent, sort_order) values
  ('K1', 'kiosk', 2500000, 1),
  ('K2', 'kiosk', 2500000, 2),
  ('P1',  'room', 1600000, 3),
  ('P2',  'room', 1400000, 4),
  ('P3',  'room', 1400000, 5),
  ('P4',  'room', 1400000, 6),
  ('P5',  'room',       0, 7),
  ('P6',  'room', 1400000, 8),
  ('P7',  'room', 1400000, 9),
  ('P8',  'room', 1400000, 10),
  ('P9',  'room', 1400000, 11),
  ('P10', 'room', 1400000, 12),
  ('P11', 'room', 1400000, 13),
  ('P12', 'room', 1400000, 14),
  ('P13', 'room', 1400000, 15),
  ('P14', 'room', 1800000, 16),
  ('P15', 'room', 1400000, 17),
  ('P16', 'room', 1400000, 18),
  ('P17', 'room', 1400000, 19),
  ('P18', 'room', 1400000, 20),
  ('P19', 'room', 1400000, 21),
  ('P20', 'room', 1400000, 22),
  ('P21', 'room', 1400000, 23),
  ('P22', 'room', 1400000, 24),
  ('P23', 'room', 1400000, 25),
  ('P24', 'room', 1400000, 26)
on conflict (code) do nothing;

-- ---------- current tenants ----------
insert into tenants (room_id, name, phone, same_household, camera_access)
select r.id, v.name, v.phone, v.household, v.camera
from (values
  ('K1',  'Phương (nail)', null,         false, true),
  ('K2',  'Hải (tạp hóa)', '0962666950', false, true),
  ('P1',  'Toán',          '0328078412', false, false),
  ('P2',  'Hoàng Vi',      '0374229685', false, false),
  ('P3',  'Hiền',          '0799056867', false, false),
  ('P4',  'Quỳnh Như',     '0336146164', false, false),
  ('P5',  'Tám Tàng',      '0334191044', false, false),
  ('P6',  'Thành Sang',    '0392212246', false, false),
  ('P7',  'Quốc',          '0984742744', false, true),
  ('P8',  'Sen',           '0372316979', false, false),
  ('P9',  'An',            null,         false, false),
  ('P10', 'Thanh Bình',    '0909772579', false, false),
  ('P11', 'Thành',         '0937342988', false, false),
  ('P12', 'Hiền',          '0934091644', false, false),
  ('P13', 'Chi',           '0348952627', false, false),
  ('P14', 'Thành',         '0967609172', false, false),
  ('P15', 'Mừng',          '0339924866', false, false),
  ('P16', 'Mai Ý',         '0343432752', false, false),
  ('P17', 'Thu',           '0917521647', false, false),
  ('P18', 'Phúc & Tuyền',  '0326345741', false, false),
  ('P19', 'An',            '0386728498', false, false),
  ('P20', 'Lợi',           '0777008262', false, false),
  ('P21', 'Thu Thảo',      '0906903020', false, false),
  ('P22', 'Quân',          '0931616879', false, false),
  ('P23', 'Giáo viên',     '0398652508', false, false),
  ('P24', 'Phong',         '0907818279', false, false)
) as v(code, name, phone, household, camera)
join rooms r on r.code = v.code
where not exists (
  select 1 from tenants t where t.room_id = r.id and t.move_out_date is null
);

-- ---------- month: June 2026 ----------
insert into months (year, month, period_start, period_end,
                    meter_status, fee_status, collection_status)
values (2026, 6, date '2026-05-10', date '2026-06-10', 'xong', 'dang', 'dang')
on conflict (year, month) do nothing;

-- ---------- bills for June 2026 ----------
insert into bills (month_id, room_id, tenant_id, tenant_name,
                   reading_old, reading_new, electricity_rate,
                   room_fee, trash_fee, payment_status, paid_at)
select
  m.id, r.id, t.id, t.name,
  v.so_cu, v.so_moi, 3300, v.rent, 50000,
  v.status::payment_status_t, v.paid_at
from (values
  ('K1',  3740, 3744, 2500000, 'paid_cash',     timestamptz '2026-06-10 15:34+07'),
  ('K2',  7428, 7624, 2500000, 'paid_transfer', timestamptz '2026-06-16 20:29+07'),
  ('P1',  4299, 4397, 1600000, 'paid_transfer', timestamptz '2026-06-19 13:46+07'),
  ('P2',  1974, 2171, 1400000, 'paid_transfer', timestamptz '2026-06-10 15:22+07'),
  ('P3',  2232, 2268, 1400000, 'paid_transfer', timestamptz '2026-06-11 08:53+07'),
  ('P4',  4326, 4394, 1400000, 'paid_transfer', timestamptz '2026-06-10 15:28+07'),
  ('P5',  4210, 4312,       0, 'paid_transfer', timestamptz '2026-06-16 13:31+07'),
  ('P6',  3924, 4020, 1400000, 'paid_transfer', timestamptz '2026-06-11 08:55+07'),
  ('P7',  2143, 2353, 1400000, 'paid_transfer', timestamptz '2026-06-10 15:24+07'),
  ('P8',  6216, 6569, 1400000, 'unpaid',        null),
  ('P9',  3122, 3165, 1400000, 'paid_transfer', timestamptz '2026-06-10 20:10+07'),
  ('P10', 1779, 1779, 1400000, 'unpaid',        null),
  ('P11', 3810, 3969, 1400000, 'paid_transfer', timestamptz '2026-06-11 08:02+07'),
  ('P12', 2700, 2777, 1400000, 'paid_transfer', timestamptz '2026-06-11 11:07+07'),
  ('P13', 4275, 4341, 1400000, 'paid_transfer', timestamptz '2026-06-16 20:29+07'),
  ('P14', 5866, 6024, 1800000, 'paid_transfer', timestamptz '2026-06-10 18:57+07'),
  ('P15', 4573, 4595, 1400000, 'paid_transfer', timestamptz '2026-06-10 15:26+07'),
  ('P16', 8174, 8311, 1400000, 'paid_transfer', timestamptz '2026-06-10 15:23+07'),
  ('P17', 4499, 4579, 1400000, 'paid_transfer', timestamptz '2026-06-10 15:25+07'),
  ('P18', 5172, 5381, 1400000, 'paid_transfer', timestamptz '2026-06-11 19:38+07'),
  ('P19', 3794, 3881, 1400000, 'paid_transfer', timestamptz '2026-06-10 20:11+07'),
  ('P20', 4954, 5115, 1400000, 'paid_transfer', timestamptz '2026-06-16 13:33+07'),
  ('P21', 4791, 4942, 1400000, 'paid_transfer', timestamptz '2026-06-10 15:32+07'),
  ('P22', 3358, 3439, 1400000, 'unpaid',        null),
  ('P23', 5285, 5377, 1400000, 'paid_transfer', timestamptz '2026-06-11 14:48+07'),
  ('P24', 4809, 4832, 1400000, 'paid_transfer', timestamptz '2026-06-11 19:43+07')
) as v(code, so_cu, so_moi, rent, status, paid_at)
join rooms  r on r.code = v.code
join months m on m.year = 2026 and m.month = 6
left join tenants t on t.room_id = r.id and t.move_out_date is null
on conflict (month_id, room_id) do nothing;
