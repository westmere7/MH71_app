-- =====================================================================
-- MH71 — Historical data Oct 2023 → May 2026 (transcribed from the PDF,
-- every month validated: Σ bill totals == sheet "Tổng thu"). Idempotent.
-- Paste AFTER 0001_schema.sql. (June 2026 lives in 0002_seed.sql.)
-- =====================================================================

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2023, 10, '2023-09-10', '2023-10-10', 'xong','xong','xong', 11086000)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 1561, 1628, 3000, 3000000, 50000, 'paid_transfer'),
  ('K2', 2870, 3049, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 1909, 1962, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 824, 853, 3000, 1400000, 50000, 'paid_transfer'),
  ('P3', 1144, 1175, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 2110, 2194, 3000, 1400000, 50000, 'paid_transfer'),
  ('P5', 1434, 1497, 3000, 1400000, 50000, 'paid_transfer'),
  ('P6', 1559, 1611, 3000, 1400000, 50000, 'paid_transfer'),
  ('P7', 1294, 1433, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 2798, 2820, 3000, 1400000, 50000, 'paid_transfer'),
  ('P9', 2494, 2508, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1142, 1182, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 1929, 1956, 3000, 1400000, 50000, 'paid_transfer'),
  ('P12', 916, 945, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 1836, 1901, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 3557, 3623, 3000, 1400000, 50000, 'paid_transfer'),
  ('P15', 2867, 2959, 3000, 1400000, 50000, 'paid_transfer'),
  ('P16', 3001, 3153, 3000, 1400000, 50000, 'paid_transfer'),
  ('P17', 1236, 1378, 3000, 1400000, 50000, 'paid_transfer'),
  ('P18', 2594, 2647, 3000, 1400000, 50000, 'paid_transfer'),
  ('P19', 1573, 1705, 3000, 1400000, 50000, 'paid_transfer'),
  ('P20', 2381, 2487, 3000, 1400000, 50000, 'paid_transfer'),
  ('P21', 1976, 2034, 3000, 1400000, 50000, 'paid_transfer'),
  ('P22', 1776, 1799, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 2782, 2872, 3000, 1400000, 50000, 'paid_transfer'),
  ('P24', 3189, 3223, 3000, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2023 and m.month = 10
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2023, 11, '2023-10-10', '2023-11-10', 'xong','xong','xong', 10019677)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 1628, 1762, 3000, 3000000, 50000, 'paid_transfer'),
  ('K2', 3049, 3224, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 1962, 2031, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 853, 879, 3000, 1400000, 50000, 'paid_transfer'),
  ('P3', 1175, 1213, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 2194, 2285, 3000, 1400000, 50000, 'paid_transfer'),
  ('P5', 1497, 1542, 3000, 1400000, 50000, 'paid_transfer'),
  ('P6', 1611, 1667, 3000, 1400000, 50000, 'paid_transfer'),
  ('P7', 1433, 1586, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 2820, 2849, 3000, 1400000, 50000, 'paid_transfer'),
  ('P9', 2508, 2524, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1182, 1219, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 1956, 1987, 3000, 1400000, 50000, 'paid_transfer'),
  ('P12', 945, 985, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 1901, 1957, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 3623, 3700, 3000, 1400000, 50000, 'paid_transfer'),
  ('P15', 2959, 3047, 3000, 1400000, 50000, 'paid_transfer'),
  ('P16', 3153, 3314, 3000, 1400000, 50000, 'paid_transfer'),
  ('P17', 1378, 1536, 3000, 1400000, 50000, 'paid_transfer'),
  ('P18', 2647, 2734, 3000, 1400000, 50000, 'paid_transfer'),
  ('P19', 1705, 1841, 3000, 1400000, 50000, 'paid_transfer'),
  ('P20', 2487, 2525, 3000, 1400000, 50000, 'paid_transfer'),
  ('P21', 2034, 2109, 3000, 1400000, 50000, 'paid_transfer'),
  ('P22', 1799, 1832, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 2872, 2966, 3000, 1400000, 50000, 'paid_transfer'),
  ('P24', 3223, 3232, 3000, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2023 and m.month = 11
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2023, 12, '2023-11-10', '2023-12-10', 'xong','xong','xong', 16218129)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 1762, 1909, 3000, 2500000, 50000, 'paid_transfer'),
  ('K2', 3224, 3421, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 2031, 2108, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 879, 899, 3000, 1400000, 50000, 'paid_transfer'),
  ('P3', 1213, 1252, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 2285, 2369, 3000, 1400000, 50000, 'paid_transfer'),
  ('P5', 1542, 1589, 3000, 1400000, 50000, 'paid_transfer'),
  ('P6', 1667, 1724, 3000, 1400000, 50000, 'paid_transfer'),
  ('P7', 1586, 1754, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 2849, 2876, 3000, 1400000, 50000, 'paid_transfer'),
  ('P9', 2524, 2540, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1219, 1261, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 1987, 2015, 3000, 1400000, 50000, 'paid_transfer'),
  ('P12', 985, 1021, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 1957, 2032, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 3700, 3754, 3000, 1400000, 50000, 'paid_transfer'),
  ('P15', 3047, 3127, 3000, 1400000, 50000, 'paid_transfer'),
  ('P16', 3314, 3467, 3000, 1400000, 50000, 'paid_transfer'),
  ('P17', 1536, 1679, 3000, 1400000, 50000, 'paid_transfer'),
  ('P18', 2734, 2810, 3000, 1400000, 50000, 'paid_transfer'),
  ('P19', 1841, 1958, 3000, 1400000, 50000, 'paid_transfer'),
  ('P20', 0, 0, 3000, 0, 0, 'vacant'),
  ('P21', 2109, 2185, 3000, 1400000, 50000, 'paid_transfer'),
  ('P22', 1832, 1861, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 2966, 3045, 3000, 1400000, 50000, 'paid_transfer'),
  ('P24', 3232, 3270, 3000, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2023 and m.month = 12
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2024, 1, '2023-12-10', '2024-01-10', 'xong','xong','xong', 15598454)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 1909, 2142, 3000, 2500000, 50000, 'paid_transfer'),
  ('K2', 3421, 3591, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 2108, 2182, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 899, 919, 3000, 1400000, 50000, 'paid_transfer'),
  ('P3', 1252, 1286, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 2369, 2456, 3000, 1400000, 50000, 'paid_cash'),
  ('P5', 1589, 1639, 3000, 1400000, 50000, 'paid_transfer'),
  ('P6', 1724, 1778, 3000, 1400000, 50000, 'paid_transfer'),
  ('P7', 1754, 1926, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 2876, 2918, 3000, 1400000, 50000, 'paid_transfer'),
  ('P9', 2540, 2559, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1261, 1302, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 2015, 2049, 3000, 1400000, 50000, 'paid_transfer'),
  ('P12', 1021, 1055, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 2032, 2118, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 3754, 3816, 3000, 1400000, 50000, 'paid_transfer'),
  ('P15', 3127, 3200, 3000, 1400000, 50000, 'paid_transfer'),
  ('P16', 3467, 3644, 3000, 1400000, 50000, 'paid_transfer'),
  ('P17', 1679, 1826, 3000, 1400000, 50000, 'paid_transfer'),
  ('P18', 2810, 2911, 3000, 1400000, 50000, 'paid_transfer'),
  ('P19', 1958, 2052, 3000, 1400000, 50000, 'paid_transfer'),
  ('P20', 2556, 2576, 3000, 1400000, 50000, 'paid_transfer'),
  ('P21', 2185, 2283, 3000, 1400000, 50000, 'paid_transfer'),
  ('P22', 1861, 1895, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 3045, 3141, 3000, 1400000, 50000, 'paid_transfer'),
  ('P24', 3270, 3320, 3000, 1400000, 50000, 'paid_cash')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2024 and m.month = 1
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2024, 2, '2024-01-10', '2024-02-10', 'xong','xong','xong', 16241569)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 2142, 2348, 3000, 2500000, 50000, 'paid_transfer'),
  ('K2', 3591, 3726, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 2182, 2254, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 919, 933, 3000, 1400000, 50000, 'paid_transfer'),
  ('P3', 1286, 1316, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 2456, 2519, 3000, 1400000, 50000, 'paid_transfer'),
  ('P5', 1639, 1683, 3000, 1400000, 50000, 'paid_transfer'),
  ('P6', 1778, 1832, 3000, 1400000, 50000, 'paid_transfer'),
  ('P7', 1926, 2077, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 2918, 2961, 3000, 1400000, 50000, 'paid_cash'),
  ('P9', 2559, 2576, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1302, 1346, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 2049, 2080, 3000, 1400000, 50000, 'paid_transfer'),
  ('P12', 1055, 1083, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 2118, 2200, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 3816, 3910, 3000, 1400000, 50000, 'paid_transfer'),
  ('P15', 3200, 3273, 3000, 1400000, 50000, 'paid_transfer'),
  ('P16', 3644, 3801, 3000, 1400000, 50000, 'paid_transfer'),
  ('P17', 1826, 1950, 3000, 1400000, 50000, 'paid_transfer'),
  ('P18', 2911, 2990, 3000, 1400000, 50000, 'paid_transfer'),
  ('P19', 2052, 2140, 3000, 1400000, 50000, 'paid_transfer'),
  ('P20', 2576, 2667, 3000, 1400000, 50000, 'paid_transfer'),
  ('P21', 2283, 2363, 3000, 1400000, 50000, 'paid_transfer'),
  ('P22', 1895, 1895, 3000, 782000, 0, 'unpaid'),
  ('P23', 3141, 3238, 3000, 1400000, 50000, 'paid_transfer'),
  ('P24', 3320, 3371, 3000, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2024 and m.month = 2
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2024, 3, '2024-02-10', '2024-03-10', 'xong','xong','xong', 10367716)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 2348, 2561, 3000, 2500000, 50000, 'paid_transfer'),
  ('K2', 3726, 3877, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 2254, 2329, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 933, 946, 3000, 1400000, 50000, 'paid_transfer'),
  ('P3', 1316, 1351, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 2519, 2570, 3000, 1400000, 50000, 'paid_cash'),
  ('P5', 1683, 1721, 3000, 1400000, 50000, 'paid_transfer'),
  ('P6', 1832, 1884, 3000, 1400000, 50000, 'paid_transfer'),
  ('P7', 2077, 2200, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 2961, 2985, 3000, 1400000, 50000, 'paid_transfer'),
  ('P9', 2576, 2588, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1346, 1391, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 2080, 2112, 3000, 1400000, 50000, 'paid_transfer'),
  ('P12', 1083, 1109, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 2200, 2280, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 3910, 3958, 3000, 1400000, 50000, 'paid_transfer'),
  ('P15', 3273, 3335, 3000, 1400000, 50000, 'paid_transfer'),
  ('P16', 3801, 3960, 3000, 1400000, 50000, 'paid_transfer'),
  ('P17', 1950, 2075, 3000, 1400000, 50000, 'paid_transfer'),
  ('P18', 2990, 3047, 3000, 1400000, 50000, 'paid_transfer'),
  ('P19', 2140, 2230, 3000, 1400000, 50000, 'paid_transfer'),
  ('P20', 2667, 2668, 3000, 1400000, 50000, 'paid_transfer'),
  ('P21', 2363, 2490, 3000, 1400000, 50000, 'paid_transfer'),
  ('P22', 1923, 1932, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 3238, 3328, 3000, 1400000, 50000, 'paid_transfer'),
  ('P24', 3371, 3417, 3000, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2024 and m.month = 3
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2024, 4, '2024-03-10', '2024-04-10', 'xong','xong','xong', 11479387)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 2561, 2859, 3000, 2500000, 50000, 'paid_transfer'),
  ('K2', 3877, 4037, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 2329, 2407, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 946, 976, 3000, 1400000, 50000, 'paid_transfer'),
  ('P3', 1351, 1387, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 2570, 2615, 3000, 1400000, 50000, 'paid_transfer'),
  ('P5', 1721, 1778, 3000, 1400000, 50000, 'paid_transfer'),
  ('P6', 1884, 1904, 3000, 1400000, 50000, 'paid_transfer'),
  ('P7', 2200, 2370, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 2985, 3001, 3000, 1400000, 50000, 'paid_transfer'),
  ('P9', 2588, 2607, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1391, 1429, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 2112, 2140, 3000, 1400000, 50000, 'paid_transfer'),
  ('P12', 1109, 1146, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 2280, 2392, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 3958, 4027, 3000, 1400000, 50000, 'paid_transfer'),
  ('P15', 3335, 3419, 3000, 1400000, 50000, 'paid_transfer'),
  ('P16', 3960, 4153, 3000, 1400000, 50000, 'paid_transfer'),
  ('P17', 2075, 2221, 3000, 1400000, 50000, 'paid_transfer'),
  ('P18', 3047, 3116, 3000, 1400000, 50000, 'paid_transfer'),
  ('P19', 2230, 2331, 3000, 1400000, 50000, 'paid_transfer'),
  ('P20', 2668, 2782, 3000, 1400000, 50000, 'paid_transfer'),
  ('P21', 2490, 2679, 3000, 1400000, 50000, 'paid_transfer'),
  ('P22', 1932, 1956, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 3328, 3449, 3000, 1400000, 50000, 'paid_transfer'),
  ('P24', 3417, 3477, 3000, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2024 and m.month = 4
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2024, 5, '2024-04-10', '2024-05-10', 'xong','xong','xong', 11329000)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 2859, 2906, 3000, 2500000, 50000, 'paid_transfer'),
  ('K2', 4037, 4168, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 2407, 2490, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 976, 1000, 3000, 1400000, 50000, 'paid_transfer'),
  ('P3', 1387, 1417, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 2615, 2661, 3000, 1400000, 50000, 'paid_transfer'),
  ('P5', 1778, 1835, 3000, 1400000, 50000, 'paid_transfer'),
  ('P6', 1904, 2115, 3000, 1400000, 50000, 'paid_transfer'),
  ('P7', 2370, 2527, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 3001, 3001, 3000, 800000, 0, 'paid_transfer'),
  ('P9', 2607, 2627, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1429, 1468, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 2140, 2174, 3000, 1400000, 50000, 'paid_transfer'),
  ('P12', 1146, 1198, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 2392, 2479, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 4027, 4097, 3000, 1400000, 50000, 'paid_transfer'),
  ('P15', 3419, 3515, 3000, 1400000, 50000, 'paid_transfer'),
  ('P16', 4153, 4467, 3000, 1400000, 50000, 'paid_transfer'),
  ('P17', 2221, 2430, 3000, 1400000, 50000, 'paid_transfer'),
  ('P18', 3116, 3211, 3000, 1400000, 50000, 'paid_transfer'),
  ('P19', 2331, 2447, 3000, 1400000, 50000, 'paid_transfer'),
  ('P20', 2782, 2896, 3000, 1400000, 50000, 'paid_transfer'),
  ('P21', 2679, 2825, 3000, 1400000, 50000, 'paid_transfer'),
  ('P22', 1956, 2008, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 3449, 3548, 3000, 1400000, 50000, 'paid_transfer'),
  ('P24', 3477, 3610, 3000, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2024 and m.month = 5
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2024, 6, '2024-05-10', '2024-06-10', 'xong','xong','xong', 11465000)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 2906, 3128, 3000, 2500000, 50000, 'paid_transfer'),
  ('K2', 4168, 4276, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 2490, 2578, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 1000, 1026, 3000, 1400000, 50000, 'paid_transfer'),
  ('P3', 1417, 1504, 3000, 1400000, 50000, 'paid_cash'),
  ('P4', 2661, 2717, 3000, 1400000, 50000, 'paid_transfer'),
  ('P5', 1835, 1876, 3000, 1400000, 50000, 'paid_transfer'),
  ('P6', 2115, 2183, 3000, 1400000, 50000, 'paid_transfer'),
  ('P7', 2527, 2701, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 0, 0, 3000, 0, 0, 'vacant'),
  ('P9', 2627, 2649, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1468, 1508, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 2174, 2213, 3000, 1400000, 50000, 'paid_transfer'),
  ('P12', 1198, 1259, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 2479, 2593, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 4097, 4200, 3000, 1400000, 50000, 'paid_transfer'),
  ('P15', 3515, 3612, 3000, 1400000, 50000, 'paid_transfer'),
  ('P16', 4467, 4738, 3000, 1400000, 50000, 'paid_transfer'),
  ('P17', 2430, 2653, 3000, 1400000, 50000, 'paid_transfer'),
  ('P18', 3211, 3287, 3000, 1400000, 50000, 'paid_transfer'),
  ('P19', 2447, 2578, 3000, 1400000, 50000, 'paid_transfer'),
  ('P20', 2896, 3014, 3000, 1400000, 50000, 'paid_transfer'),
  ('P21', 2825, 2936, 3000, 1400000, 50000, 'paid_transfer'),
  ('P22', 2008, 2051, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 3548, 3652, 3000, 1400000, 50000, 'paid_transfer'),
  ('P24', 3610, 3720, 3000, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2024 and m.month = 6
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2024, 7, '2024-06-10', '2024-07-10', 'xong','xong','xong', 10557000)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3128, 3234, 3000, 2500000, 50000, 'paid_transfer'),
  ('K2', 4276, 4380, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 2578, 2662, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 1026, 1053, 3000, 1400000, 50000, 'paid_transfer'),
  ('P3', 1504, 1532, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 2717, 2800, 3000, 1400000, 50000, 'paid_transfer'),
  ('P6', 2183, 2245, 3000, 1400000, 50000, 'paid_cash'),
  ('P7', 2701, 2864, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 3127, 3137, 3000, 1400000, 50000, 'paid_transfer'),
  ('P9', 2649, 2668, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1508, 1535, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 2213, 2254, 3000, 1400000, 50000, 'paid_transfer'),
  ('P12', 1259, 1313, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 2593, 2697, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 4200, 4283, 3000, 1400000, 50000, 'paid_transfer'),
  ('P15', 3612, 3723, 3000, 1400000, 50000, 'paid_transfer'),
  ('P16', 4738, 4994, 3000, 1400000, 50000, 'paid_transfer'),
  ('P17', 2653, 2848, 3000, 1400000, 50000, 'paid_transfer'),
  ('P18', 3287, 3373, 3000, 1400000, 50000, 'paid_transfer'),
  ('P19', 2578, 2697, 3000, 1400000, 50000, 'paid_transfer'),
  ('P20', 0, 0, 3000, 0, 0, 'vacant'),
  ('P21', 2936, 2972, 3000, 1400000, 50000, 'paid_transfer'),
  ('P22', 2051, 2086, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 3652, 3755, 3000, 1400000, 50000, 'paid_transfer'),
  ('P24', 3720, 3818, 3000, 1400000, 50000, 'paid_transfer'),
  ('P5', 1876, 1876, 3000, 450000, 50000, 'unpaid')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2024 and m.month = 7
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2024, 8, '2024-07-10', '2024-08-10', 'xong','xong','xong', 11023017)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3234, 3264, 3000, 2500000, 50000, 'paid_transfer'),
  ('K2', 4380, 4493, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 2662, 2739, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 1053, 1070, 3000, 1400000, 50000, 'paid_transfer'),
  ('P3', 1532, 1565, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 2800, 2930, 3000, 1400000, 50000, 'paid_transfer'),
  ('P5', 1892, 1952, 3000, 1400000, 50000, 'paid_transfer'),
  ('P6', 2245, 2309, 3000, 1400000, 50000, 'paid_transfer'),
  ('P7', 2864, 3024, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 3137, 3172, 3000, 1400000, 50000, 'paid_transfer'),
  ('P9', 2668, 2687, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1535, 1564, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 2254, 2290, 3000, 1400000, 50000, 'paid_transfer'),
  ('P12', 1313, 1372, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 2697, 2809, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 4283, 4356, 3000, 1400000, 50000, 'paid_transfer'),
  ('P15', 3723, 3841, 3000, 1400000, 50000, 'paid_transfer'),
  ('P16', 4994, 5237, 3000, 1400000, 50000, 'paid_transfer'),
  ('P17', 2848, 3025, 3000, 1400000, 50000, 'paid_transfer'),
  ('P18', 3373, 3452, 3000, 1400000, 50000, 'paid_transfer'),
  ('P19', 2697, 2819, 3000, 1400000, 50000, 'paid_transfer'),
  ('P20', 3131, 3150, 3000, 1400000, 50000, 'paid_transfer'),
  ('P21', 2972, 3054, 3000, 1400000, 50000, 'paid_transfer'),
  ('P22', 2086, 2127, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 3755, 3870, 3000, 1400000, 50000, 'paid_transfer'),
  ('P24', 3818, 3959, 3000, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2024 and m.month = 8
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2024, 9, '2024-08-10', '2024-09-10', 'xong','xong','xong', 11367050)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3264, 3284, 3000, 2500000, 50000, 'paid_transfer'),
  ('K2', 4493, 4539, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 2739, 2824, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 1070, 1089, 3000, 1400000, 50000, 'paid_transfer'),
  ('P3', 1565, 1585, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 2930, 3051, 3000, 1400000, 50000, 'paid_transfer'),
  ('P5', 1952, 2091, 3000, 1400000, 50000, 'paid_transfer'),
  ('P6', 2309, 2382, 3000, 1400000, 50000, 'paid_transfer'),
  ('P7', 3024, 3207, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 3172, 3220, 3000, 1400000, 50000, 'paid_transfer'),
  ('P9', 2687, 2705, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1564, 1591, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 2290, 2330, 3000, 1400000, 50000, 'paid_transfer'),
  ('P12', 1372, 1432, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 2809, 2893, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 4356, 4428, 3000, 1400000, 50000, 'paid_transfer'),
  ('P15', 3841, 3950, 3000, 1400000, 50000, 'paid_transfer'),
  ('P16', 5237, 5488, 3000, 1400000, 50000, 'paid_transfer'),
  ('P17', 0, 0, 3000, 0, 0, 'vacant'),
  ('P18', 0, 0, 3000, 0, 0, 'vacant'),
  ('P19', 2819, 2920, 3000, 1400000, 50000, 'paid_transfer'),
  ('P20', 0, 0, 3000, 0, 0, 'vacant'),
  ('P21', 0, 0, 3000, 0, 0, 'vacant'),
  ('P22', 2127, 2167, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 3870, 3986, 3000, 1400000, 50000, 'paid_transfer'),
  ('P24', 0, 0, 3000, 0, 0, 'vacant')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2024 and m.month = 9
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2024, 10, '2024-09-10', '2024-10-10', 'xong','xong','xong', 10205550)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3284, 3304, 3000, 2500000, 50000, 'paid_cash'),
  ('K2', 4539, 4769, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 2824, 2902, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 1089, 1101, 3000, 1400000, 50000, 'paid_transfer'),
  ('P3', 1585, 1613, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 3051, 3158, 3000, 1400000, 50000, 'paid_transfer'),
  ('P5', 2091, 2218, 3000, 1400000, 50000, 'paid_transfer'),
  ('P6', 2382, 2453, 3000, 1400000, 50000, 'paid_transfer'),
  ('P7', 3207, 3348, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 3220, 3263, 3000, 1400000, 50000, 'paid_transfer'),
  ('P9', 2705, 2724, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1591, 1615, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 2330, 2366, 3000, 1400000, 50000, 'paid_transfer'),
  ('P12', 1432, 1507, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 2893, 2975, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 4428, 4489, 3000, 1400000, 50000, 'paid_transfer'),
  ('P15', 3950, 4061, 3000, 1400000, 50000, 'unpaid'),
  ('P16', 5488, 5718, 3000, 1400000, 50000, 'paid_transfer'),
  ('P17', 3219, 3290, 3000, 1400000, 50000, 'paid_transfer'),
  ('P18', 0, 0, 3000, 0, 0, 'vacant'),
  ('P19', 2920, 2995, 3000, 1400000, 50000, 'paid_transfer'),
  ('P20', 3167, 3171, 3000, 1400000, 50000, 'paid_transfer'),
  ('P21', 3134, 3134, 3000, 1400000, 50000, 'unpaid'),
  ('P22', 2167, 2194, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 3986, 4101, 3000, 1400000, 50000, 'paid_transfer'),
  ('P24', 0, 0, 3000, 0, 0, 'vacant')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2024 and m.month = 10
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2024, 11, '2024-10-10', '2024-11-10', 'xong','xong','xong', 10134579)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3304, 3328, 3000, 2500000, 50000, 'paid_transfer'),
  ('K2', 4769, 4932, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 2902, 2981, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 1101, 1116, 3000, 1400000, 50000, 'paid_transfer'),
  ('P3', 1613, 1652, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 3158, 3261, 3000, 1400000, 50000, 'paid_transfer'),
  ('P5', 2218, 2343, 3000, 1400000, 50000, 'paid_transfer'),
  ('P6', 2453, 2525, 3000, 1400000, 50000, 'paid_transfer'),
  ('P7', 3348, 3477, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 3263, 3318, 3000, 1400000, 50000, 'paid_transfer'),
  ('P9', 2724, 2746, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1615, 1640, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 2366, 2405, 3000, 1400000, 50000, 'paid_cash'),
  ('P12', 1507, 1570, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 2975, 3061, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 4489, 4558, 3000, 1400000, 50000, 'paid_transfer'),
  ('P15', 4061, 4070, 3000, 1400000, 50000, 'paid_transfer'),
  ('P16', 5718, 5957, 3000, 1400000, 50000, 'paid_transfer'),
  ('P17', 3290, 3371, 3000, 1400000, 50000, 'paid_transfer'),
  ('P18', 3563, 3610, 3000, 1400000, 50000, 'paid_transfer'),
  ('P19', 2995, 3041, 3000, 1400000, 50000, 'paid_transfer'),
  ('P20', 3171, 3274, 3000, 1400000, 50000, 'paid_transfer'),
  ('P21', 3134, 3177, 3000, 1400000, 50000, 'paid_transfer'),
  ('P22', 2194, 2225, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 4101, 4236, 3000, 1400000, 50000, 'paid_transfer'),
  ('P24', 4228, 4228, 3000, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2024 and m.month = 11
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2024, 12, '2024-11-10', '2024-12-10', 'xong','xong','xong', 9658759)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3328, 3364, 3000, 2500000, 50000, 'paid_transfer'),
  ('K2', 4932, 5087, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 2981, 3062, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 1116, 1134, 3000, 1400000, 50000, 'paid_transfer'),
  ('P3', 1652, 1692, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 3261, 3355, 3000, 1400000, 50000, 'paid_transfer'),
  ('P5', 2343, 2479, 3000, 1400000, 50000, 'paid_transfer'),
  ('P6', 2525, 2572, 3000, 1400000, 50000, 'paid_transfer'),
  ('P7', 3477, 3569, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 3318, 3375, 3000, 1400000, 50000, 'paid_transfer'),
  ('P9', 2746, 2765, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1640, 1668, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 2405, 2501, 3000, 1400000, 50000, 'paid_transfer'),
  ('P12', 1570, 1628, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 3061, 3148, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 4558, 4638, 3000, 1400000, 50000, 'paid_transfer'),
  ('P15', 4070, 4106, 3000, 1400000, 50000, 'paid_cash'),
  ('P16', 5957, 6220, 3000, 1400000, 50000, 'paid_transfer'),
  ('P17', 3371, 3452, 3000, 1400000, 50000, 'paid_transfer'),
  ('P18', 3610, 3625, 3000, 1400000, 50000, 'paid_transfer'),
  ('P19', 3041, 3167, 3000, 1400000, 50000, 'paid_transfer'),
  ('P20', 3274, 3370, 3000, 1400000, 50000, 'paid_transfer'),
  ('P21', 3177, 3240, 3000, 1400000, 50000, 'paid_transfer'),
  ('P22', 2225, 2265, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 4236, 4283, 3000, 1400000, 50000, 'paid_transfer'),
  ('P24', 4228, 4310, 3000, 1400000, 50000, 'paid_cash')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2024 and m.month = 12
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2025, 1, '2024-12-10', '2025-01-10', 'xong','xong','xong', 4800000)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3364, 3382, 3000, 2500000, 50000, 'paid_transfer'),
  ('K2', 5087, 5235, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 3062, 3142, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 1134, 1146, 3000, 1400000, 50000, 'paid_transfer'),
  ('P3', 1692, 1728, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 3355, 3441, 3000, 1400000, 50000, 'paid_transfer'),
  ('P5', 2479, 2594, 3000, 1400000, 50000, 'paid_transfer'),
  ('P6', 2572, 2620, 3000, 1400000, 50000, 'paid_transfer'),
  ('P7', 3569, 3589, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 3375, 3431, 3000, 1400000, 50000, 'paid_transfer'),
  ('P9', 2765, 2782, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1668, 1694, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 2501, 2542, 3000, 1400000, 50000, 'paid_transfer'),
  ('P12', 1628, 1679, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 3148, 3231, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 4638, 4725, 3000, 1400000, 50000, 'paid_transfer'),
  ('P15', 4106, 4156, 3000, 1400000, 50000, 'paid_transfer'),
  ('P16', 6220, 6471, 3000, 1400000, 50000, 'paid_transfer'),
  ('P17', 3452, 3532, 3000, 1400000, 50000, 'paid_transfer'),
  ('P18', 3625, 3653, 3000, 1400000, 50000, 'paid_transfer'),
  ('P19', 3167, 3248, 3000, 1400000, 50000, 'paid_transfer'),
  ('P20', 3370, 3518, 3000, 1400000, 50000, 'paid_transfer'),
  ('P21', 3240, 3305, 3000, 1400000, 50000, 'paid_transfer'),
  ('P22', 2265, 2291, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 4283, 4314, 3000, 1400000, 50000, 'paid_transfer'),
  ('P24', 4310, 4393, 3000, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2025 and m.month = 1
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2025, 2, '2025-01-10', '2025-02-10', 'xong','xong','xong', 15174000)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3382, 3411, 3000, 2500000, 50000, 'paid_transfer'),
  ('K2', 5235, 5363, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 3142, 3217, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 1146, 1153, 3000, 1400000, 50000, 'paid_cash'),
  ('P3', 1728, 1765, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 3441, 3511, 3000, 1400000, 50000, 'paid_cash'),
  ('P5', 2594, 2697, 3000, 1400000, 50000, 'paid_transfer'),
  ('P6', 2620, 2698, 3000, 1400000, 50000, 'unpaid'),
  ('P7', 3648, 3889, 3000, 1400000, 50000, 'unpaid'),
  ('P8', 3431, 3456, 3000, 1400000, 50000, 'paid_transfer'),
  ('P9', 2782, 2793, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1694, 1717, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 2542, 2558, 3000, 1400000, 50000, 'unpaid'),
  ('P12', 1679, 1727, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 3231, 3298, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 0, 0, 3000, 0, 0, 'vacant'),
  ('P15', 0, 0, 3000, 0, 0, 'vacant'),
  ('P16', 0, 0, 3000, 0, 0, 'vacant'),
  ('P17', 0, 0, 3000, 0, 0, 'vacant'),
  ('P18', 3653, 3670, 3000, 1400000, 50000, 'paid_transfer'),
  ('P19', 0, 0, 3000, 0, 0, 'vacant'),
  ('P20', 0, 0, 3000, 0, 0, 'vacant'),
  ('P21', 3305, 3369, 3000, 1400000, 50000, 'paid_cash'),
  ('P22', 2291, 2334, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 0, 0, 3000, 0, 0, 'vacant'),
  ('P24', 0, 0, 3000, 0, 0, 'vacant')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2025 and m.month = 2
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2025, 3, '2025-02-10', '2025-03-10', 'xong','xong','xong', 9159000)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3411, 3430, 3000, 2500000, 50000, 'paid_transfer'),
  ('K2', 5363, 5498, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 0, 0, 3000, 0, 0, 'vacant'),
  ('P2', 1153, 1216, 3000, 1400000, 50000, 'paid_cash'),
  ('P3', 1765, 1797, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 3511, 3546, 3000, 1400000, 50000, 'paid_transfer'),
  ('P5', 2697, 2788, 3000, 0, 50000, 'paid_transfer'),
  ('P6', 2698, 2699, 3000, 1400000, 50000, 'unpaid'),
  ('P7', 3889, 3979, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 3456, 3465, 3000, 1400000, 50000, 'paid_transfer'),
  ('P9', 2793, 2810, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1717, 1740, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 2558, 2561, 3000, 1400000, 50000, 'paid_transfer'),
  ('P12', 1727, 1777, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 3298, 3364, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 4769, 4771, 3000, 1400000, 50000, 'unpaid'),
  ('P15', 4201, 4201, 3000, 1400000, 50000, 'unpaid'),
  ('P16', 0, 0, 3000, 0, 0, 'vacant'),
  ('P17', 0, 0, 3000, 0, 0, 'vacant'),
  ('P18', 3670, 3711, 3000, 1400000, 50000, 'paid_transfer'),
  ('P19', 0, 0, 3000, 0, 0, 'vacant'),
  ('P20', 0, 0, 3000, 0, 0, 'vacant'),
  ('P21', 3369, 3438, 3000, 1400000, 50000, 'paid_cash'),
  ('P22', 2334, 2377, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 4325, 4343, 3000, 1400000, 50000, 'paid_cash'),
  ('P24', 4451, 4478, 3000, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2025 and m.month = 3
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2025, 4, '2025-03-10', '2025-04-10', 'xong','xong','xong', 6484000)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3430, 3452, 3000, 2500000, 50000, 'paid_transfer'),
  ('K2', 5498, 5628, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 3289, 3311, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 1216, 1298, 3000, 1400000, 50000, 'paid_cash'),
  ('P3', 1797, 1833, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 3546, 3606, 3000, 1400000, 50000, 'paid_transfer'),
  ('P5', 2788, 2908, 3000, 1400000, 50000, 'paid_transfer'),
  ('P6', 0, 0, 3000, 0, 0, 'vacant'),
  ('P7', 90, 294, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 3465, 3573, 3000, 1400000, 50000, 'paid_transfer'),
  ('P9', 2810, 2831, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1740, 1767, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 2561, 2591, 3000, 1400000, 50000, 'paid_transfer'),
  ('P12', 1777, 1856, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 3364, 3434, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 4771, 4849, 3000, 1400000, 50000, 'paid_cash'),
  ('P15', 0, 0, 3000, 0, 0, 'vacant'),
  ('P16', 6676, 6683, 3000, 1400000, 50000, 'paid_cash'),
  ('P17', 3560, 3560, 3000, 1400000, 50000, 'paid_cash'),
  ('P18', 3711, 3741, 3000, 1400000, 50000, 'paid_transfer'),
  ('P19', 3321, 3321, 3000, 1400000, 50000, 'paid_transfer'),
  ('P20', 3648, 3648, 3000, 1400000, 50000, 'paid_cash'),
  ('P21', 3438, 3516, 3000, 1400000, 50000, 'unpaid'),
  ('P22', 2377, 2429, 3000, 1400000, 50000, 'paid_cash'),
  ('P23', 0, 0, 3000, 0, 0, 'vacant'),
  ('P24', 0, 0, 3000, 0, 0, 'vacant')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2025 and m.month = 4
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2025, 5, '2025-04-10', '2025-05-10', 'xong','xong','xong', 4800000)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3452, 3477, 3000, 2500000, 50000, 'paid_transfer'),
  ('K2', 5628, 5813, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 3311, 3459, 3000, 1400000, 50000, 'paid_cash'),
  ('P2', 1298, 1352, 3000, 1400000, 50000, 'paid_cash'),
  ('P3', 1833, 1866, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 3606, 3658, 3000, 1400000, 50000, 'paid_transfer'),
  ('P5', 2908, 2957, 3000, 1400000, 50000, 'paid_cash'),
  ('P6', 2759, 2788, 3000, 1400000, 50000, 'paid_transfer'),
  ('P7', 294, 431, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 3573, 3723, 3000, 1400000, 50000, 'paid_transfer'),
  ('P9', 2831, 2855, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1767, 1779, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 2591, 2619, 3000, 1400000, 50000, 'paid_transfer'),
  ('P12', 1856, 1911, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 3434, 3507, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 4849, 4924, 3000, 1400000, 50000, 'paid_cash'),
  ('P15', 4253, 4286, 3000, 1400000, 50000, 'paid_cash'),
  ('P16', 6683, 6740, 3000, 1400000, 50000, 'paid_transfer'),
  ('P17', 3560, 3609, 3000, 1400000, 50000, 'paid_transfer'),
  ('P18', 3741, 3757, 3000, 1400000, 50000, 'paid_transfer'),
  ('P19', 3321, 3356, 3000, 1400000, 50000, 'paid_transfer'),
  ('P20', 3648, 3784, 3000, 1400000, 50000, 'paid_transfer'),
  ('P21', 3516, 3592, 3000, 1400000, 50000, 'paid_cash'),
  ('P22', 2429, 2491, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 4374, 4383, 3000, 1400000, 50000, 'paid_cash'),
  ('P24', 4498, 4499, 3000, 1400000, 50000, 'paid_cash')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2025 and m.month = 5
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2025, 6, '2025-05-10', '2025-06-10', 'xong','xong','xong', 8198000)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3477, 3509, 3000, 2500000, 50000, 'paid_transfer'),
  ('K2', 5813, 5931, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 3459, 3516, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 1352, 1387, 3000, 1400000, 50000, 'paid_transfer'),
  ('P3', 1866, 1902, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 3658, 3717, 3000, 1400000, 50000, 'paid_transfer'),
  ('P5', 2957, 3087, 3000, 0, 50000, 'paid_cash'),
  ('P6', 2788, 2887, 3000, 1400000, 50000, 'paid_transfer'),
  ('P7', 431, 586, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 3723, 3987, 3000, 1400000, 50000, 'paid_cash'),
  ('P9', 2855, 2879, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1779, 1779, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 2619, 2675, 3000, 1400000, 50000, 'paid_transfer'),
  ('P12', 1911, 1974, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 3507, 3574, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 4924, 5010, 3000, 1400000, 50000, 'paid_transfer'),
  ('P15', 4286, 4362, 3000, 1400000, 50000, 'paid_cash'),
  ('P16', 6740, 6825, 3000, 1400000, 50000, 'paid_transfer'),
  ('P17', 3609, 3681, 3000, 1400000, 50000, 'paid_transfer'),
  ('P18', 3757, 3767, 3000, 1700000, 50000, 'paid_transfer'),
  ('P19', 3356, 3401, 3000, 1400000, 50000, 'paid_cash'),
  ('P20', 3784, 3872, 3000, 1400000, 50000, 'unpaid'),
  ('P21', 3592, 3660, 3000, 1400000, 50000, 'paid_cash'),
  ('P22', 2491, 2550, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 4383, 4520, 3000, 1400000, 50000, 'paid_cash'),
  ('P24', 4499, 4577, 3000, 1400000, 50000, 'unpaid')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2025 and m.month = 6
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2025, 7, '2025-06-10', '2025-07-10', 'xong','xong','xong', 4800000)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3509, 3532, 3000, 2500000, 50000, 'paid_transfer'),
  ('K2', 5931, 6041, 3000, 2500000, 50000, 'paid_cash'),
  ('P1', 3516, 3553, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 1387, 1445, 3000, 1400000, 50000, 'paid_transfer'),
  ('P3', 1902, 1937, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 3717, 3774, 3000, 1400000, 50000, 'paid_transfer'),
  ('P5', 3087, 3217, 3000, 0, 50000, 'paid_transfer'),
  ('P6', 2887, 3020, 3000, 1400000, 50000, 'paid_transfer'),
  ('P7', 586, 768, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 3987, 4231, 3000, 1400000, 50000, 'paid_cash'),
  ('P9', 2879, 2899, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1779, 1779, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 2675, 2785, 3000, 1400000, 50000, 'paid_cash'),
  ('P12', 1974, 2049, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 3574, 3631, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 5010, 5095, 3000, 1400000, 50000, 'paid_cash'),
  ('P15', 4362, 4415, 3000, 1400000, 50000, 'paid_transfer'),
  ('P16', 6825, 6930, 3000, 1400000, 50000, 'paid_transfer'),
  ('P17', 3681, 3746, 3000, 1400000, 50000, 'paid_transfer'),
  ('P18', 3767, 3882, 3000, 1700000, 50000, 'paid_transfer'),
  ('P19', 3401, 3441, 3000, 1400000, 50000, 'paid_transfer'),
  ('P20', 3872, 3912, 3000, 1400000, 50000, 'paid_transfer'),
  ('P21', 3660, 3742, 3000, 1400000, 50000, 'paid_cash'),
  ('P22', 2550, 2630, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 4520, 4654, 3000, 1400000, 50000, 'paid_cash'),
  ('P24', 4577, 4592, 3000, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2025 and m.month = 7
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2025, 8, '2025-07-10', '2025-08-10', 'xong','xong','xong', 11048642)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3532, 3560, 3000, 2500000, 50000, 'paid_transfer'),
  ('K2', 6041, 6166, 3000, 2500000, 50000, 'paid_transfer'),
  ('P1', 3553, 3582, 3000, 1400000, 50000, 'paid_transfer'),
  ('P2', 1445, 1502, 3000, 1400000, 50000, 'paid_transfer'),
  ('P3', 1937, 1975, 3000, 1400000, 50000, 'paid_transfer'),
  ('P4', 3774, 3836, 3000, 1400000, 50000, 'paid_transfer'),
  ('P5', 3217, 3357, 3000, 0, 50000, 'paid_transfer'),
  ('P6', 3020, 3137, 3000, 1400000, 50000, 'paid_transfer'),
  ('P7', 768, 931, 3000, 1400000, 50000, 'paid_transfer'),
  ('P8', 4231, 4524, 3000, 1400000, 50000, 'paid_transfer'),
  ('P9', 2899, 2921, 3000, 1400000, 50000, 'paid_transfer'),
  ('P10', 1779, 1779, 3000, 1400000, 50000, 'paid_transfer'),
  ('P11', 2785, 3036, 3000, 1400000, 50000, 'paid_cash'),
  ('P12', 2049, 2120, 3000, 1400000, 50000, 'paid_transfer'),
  ('P13', 3631, 3690, 3000, 1400000, 50000, 'paid_transfer'),
  ('P14', 5095, 5147, 3000, 1800000, 50000, 'paid_transfer'),
  ('P15', 4415, 4444, 3000, 1400000, 50000, 'paid_transfer'),
  ('P16', 6930, 7060, 3000, 1400000, 50000, 'paid_transfer'),
  ('P17', 3746, 3823, 3000, 1400000, 50000, 'paid_transfer'),
  ('P18', 3882, 4028, 3000, 1700000, 50000, 'paid_transfer'),
  ('P19', 3441, 3501, 3000, 1400000, 50000, 'paid_transfer'),
  ('P20', 3912, 4021, 3000, 1400000, 50000, 'paid_transfer'),
  ('P21', 3742, 3850, 3000, 1400000, 50000, 'paid_cash'),
  ('P22', 2630, 2698, 3000, 1400000, 50000, 'paid_transfer'),
  ('P23', 4654, 4695, 3000, 1400000, 50000, 'paid_cash'),
  ('P24', 4592, 4627, 3000, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2025 and m.month = 8
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2025, 9, '2025-08-10', '2025-09-10', 'xong','xong','xong', 10871285)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3560, 3577, 3300, 2500000, 50000, 'paid_transfer'),
  ('K2', 6166, 6291, 3300, 2500000, 50000, 'paid_transfer'),
  ('P1', 3582, 3613, 3300, 1400000, 50000, 'paid_transfer'),
  ('P2', 1502, 1551, 3300, 1400000, 50000, 'paid_transfer'),
  ('P3', 1975, 2009, 3300, 1400000, 50000, 'paid_transfer'),
  ('P4', 3836, 3894, 3300, 1400000, 50000, 'paid_transfer'),
  ('P5', 3357, 3462, 3300, 0, 50000, 'paid_transfer'),
  ('P6', 3137, 3248, 3300, 1400000, 50000, 'paid_transfer'),
  ('P7', 931, 1061, 3300, 1400000, 50000, 'paid_transfer'),
  ('P8', 4524, 4794, 3300, 1400000, 50000, 'paid_transfer'),
  ('P9', 2921, 2942, 3300, 1400000, 50000, 'paid_transfer'),
  ('P10', 1779, 1779, 3300, 1400000, 50000, 'paid_transfer'),
  ('P11', 3036, 3201, 3300, 1400000, 50000, 'paid_transfer'),
  ('P12', 2120, 2188, 3300, 1400000, 50000, 'paid_transfer'),
  ('P13', 3690, 3758, 3300, 1400000, 50000, 'paid_transfer'),
  ('P14', 5147, 5199, 3300, 1800000, 50000, 'paid_transfer'),
  ('P15', 4444, 4470, 3300, 1400000, 50000, 'paid_transfer'),
  ('P16', 7060, 7188, 3300, 1400000, 50000, 'paid_transfer'),
  ('P17', 3823, 3903, 3300, 1400000, 50000, 'paid_transfer'),
  ('P18', 4028, 4190, 3300, 1700000, 50000, 'paid_transfer'),
  ('P19', 3501, 3537, 3300, 1400000, 50000, 'paid_transfer'),
  ('P20', 4021, 4126, 3300, 1400000, 50000, 'paid_transfer'),
  ('P21', 3850, 3944, 3300, 1400000, 50000, 'paid_transfer'),
  ('P22', 2698, 2772, 3300, 1400000, 50000, 'paid_transfer'),
  ('P23', 4695, 4722, 3300, 1400000, 50000, 'paid_transfer'),
  ('P24', 4627, 4668, 3300, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2025 and m.month = 9
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2025, 10, '2025-09-10', '2025-10-10', 'xong','xong','xong', 7752600)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3577, 3604, 3300, 2500000, 50000, 'paid_transfer'),
  ('K2', 6291, 6413, 3300, 2500000, 50000, 'unpaid'),
  ('P1', 3613, 3697, 3300, 1400000, 50000, 'paid_transfer'),
  ('P2', 1551, 1585, 3300, 1400000, 50000, 'paid_cash'),
  ('P3', 2009, 2041, 3300, 1400000, 50000, 'paid_transfer'),
  ('P4', 3894, 3957, 3300, 1400000, 50000, 'paid_transfer'),
  ('P5', 3462, 3551, 3300, 0, 50000, 'paid_transfer'),
  ('P6', 3248, 3337, 3300, 1400000, 50000, 'paid_transfer'),
  ('P7', 1061, 1195, 3300, 1400000, 50000, 'paid_transfer'),
  ('P8', 4794, 5053, 3300, 1400000, 50000, 'paid_transfer'),
  ('P9', 2942, 2965, 3300, 1400000, 50000, 'paid_transfer'),
  ('P10', 1779, 1779, 3300, 1400000, 50000, 'paid_transfer'),
  ('P11', 3201, 3209, 3300, 1400000, 50000, 'paid_cash'),
  ('P12', 2188, 2256, 3300, 1400000, 50000, 'paid_transfer'),
  ('P13', 3758, 3820, 3300, 1400000, 50000, 'paid_transfer'),
  ('P14', 5199, 5258, 3300, 1800000, 50000, 'paid_transfer'),
  ('P15', 4470, 4496, 3300, 1400000, 50000, 'paid_transfer'),
  ('P16', 7188, 7310, 3300, 1400000, 50000, 'paid_transfer'),
  ('P17', 3903, 3979, 3300, 1400000, 50000, 'paid_transfer'),
  ('P18', 4190, 4350, 3300, 1700000, 50000, 'paid_transfer'),
  ('P19', 3537, 3577, 3300, 1400000, 50000, 'paid_transfer'),
  ('P20', 4126, 4209, 3300, 1400000, 50000, 'paid_transfer'),
  ('P21', 3944, 4025, 3300, 1400000, 50000, 'paid_cash'),
  ('P22', 2772, 2839, 3300, 1400000, 50000, 'paid_transfer'),
  ('P23', 4722, 4798, 3300, 1400000, 50000, 'paid_transfer'),
  ('P24', 4668, 4702, 3300, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2025 and m.month = 10
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2025, 11, '2025-10-10', '2025-11-10', 'xong','xong','xong', 4800000)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3604, 3624, 3300, 2500000, 50000, 'paid_transfer'),
  ('K2', 6413, 6539, 3300, 2500000, 50000, 'paid_transfer'),
  ('P1', 3697, 3786, 3300, 1400000, 50000, 'paid_transfer'),
  ('P2', 1585, 1608, 3300, 1400000, 50000, 'paid_cash'),
  ('P3', 2041, 2073, 3300, 1400000, 50000, 'paid_transfer'),
  ('P4', 3957, 4022, 3300, 1400000, 50000, 'paid_transfer'),
  ('P5', 3551, 3643, 3300, 0, 50000, 'paid_transfer'),
  ('P6', 3337, 3434, 3300, 1400000, 50000, 'paid_transfer'),
  ('P7', 1195, 1324, 3300, 1400000, 50000, 'paid_transfer'),
  ('P8', 5053, 5285, 3300, 1400000, 50000, 'paid_transfer'),
  ('P9', 2965, 2989, 3300, 1400000, 50000, 'paid_transfer'),
  ('P10', 1779, 1779, 3300, 1400000, 50000, 'paid_transfer'),
  ('P11', 3209, 3282, 3300, 1400000, 50000, 'paid_transfer'),
  ('P12', 2256, 2315, 3300, 1400000, 50000, 'paid_cash'),
  ('P13', 3820, 3896, 3300, 1400000, 50000, 'paid_transfer'),
  ('P14', 5258, 5315, 3300, 1800000, 50000, 'paid_transfer'),
  ('P15', 4496, 4511, 3300, 1400000, 50000, 'paid_transfer'),
  ('P16', 7310, 7439, 3300, 1400000, 50000, 'paid_transfer'),
  ('P17', 3979, 4060, 3300, 1400000, 50000, 'paid_transfer'),
  ('P18', 4350, 4454, 3300, 1700000, 50000, 'paid_transfer'),
  ('P19', 3577, 3615, 3300, 1400000, 50000, 'paid_transfer'),
  ('P20', 4209, 4308, 3300, 1400000, 50000, 'paid_transfer'),
  ('P21', 4025, 4094, 3300, 1400000, 50000, 'paid_transfer'),
  ('P22', 2839, 2906, 3300, 1400000, 50000, 'paid_transfer'),
  ('P23', 4798, 4872, 3300, 1400000, 50000, 'paid_transfer'),
  ('P24', 4702, 4717, 3300, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2025 and m.month = 11
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2025, 12, '2025-11-10', '2025-12-10', 'xong','xong','xong', 4800000)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3624, 3640, 3300, 2500000, 50000, 'paid_transfer'),
  ('K2', 6539, 6669, 3300, 2500000, 50000, 'paid_transfer'),
  ('P1', 3786, 3880, 3300, 1600000, 50000, 'paid_transfer'),
  ('P2', 1608, 1632, 3300, 1400000, 50000, 'paid_transfer'),
  ('P3', 2073, 2094, 3300, 1400000, 50000, 'paid_transfer'),
  ('P4', 4022, 4064, 3300, 1400000, 50000, 'paid_transfer'),
  ('P5', 3643, 3731, 3300, 0, 50000, 'paid_transfer'),
  ('P6', 3434, 3517, 3300, 1400000, 50000, 'paid_transfer'),
  ('P7', 1324, 1436, 3300, 1400000, 50000, 'paid_transfer'),
  ('P8', 5285, 5336, 3300, 1400000, 50000, 'paid_transfer'),
  ('P9', 2989, 3011, 3300, 1400000, 50000, 'paid_transfer'),
  ('P10', 1779, 1779, 3300, 1400000, 50000, 'paid_transfer'),
  ('P11', 3282, 3419, 3300, 1400000, 50000, 'paid_transfer'),
  ('P12', 2315, 2382, 3300, 1400000, 50000, 'paid_cash'),
  ('P13', 3896, 3951, 3300, 1400000, 50000, 'paid_transfer'),
  ('P14', 5315, 5411, 3300, 1800000, 50000, 'paid_transfer'),
  ('P15', 4511, 4528, 3300, 1400000, 50000, 'paid_transfer'),
  ('P16', 7439, 7574, 3300, 1400000, 50000, 'paid_transfer'),
  ('P17', 4060, 4133, 3300, 1400000, 50000, 'paid_transfer'),
  ('P18', 4454, 4501, 3300, 1700000, 50000, 'paid_transfer'),
  ('P19', 3615, 3649, 3300, 1400000, 50000, 'paid_transfer'),
  ('P20', 4308, 4400, 3300, 1400000, 50000, 'paid_transfer'),
  ('P21', 4094, 4213, 3300, 1400000, 50000, 'paid_transfer'),
  ('P22', 2906, 2979, 3300, 1400000, 50000, 'paid_transfer'),
  ('P23', 4872, 4943, 3300, 1400000, 50000, 'paid_transfer'),
  ('P24', 4717, 4730, 3300, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2025 and m.month = 12
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2026, 1, '2025-12-10', '2026-01-10', 'xong','xong','xong', 4800000)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3640, 3660, 3300, 2500000, 50000, 'paid_transfer'),
  ('K2', 6669, 6813, 3300, 2500000, 50000, 'paid_transfer'),
  ('P1', 3880, 3945, 3300, 1600000, 50000, 'paid_transfer'),
  ('P2', 1632, 1655, 3300, 1400000, 50000, 'paid_cash'),
  ('P3', 2094, 2121, 3300, 1400000, 50000, 'paid_transfer'),
  ('P4', 4064, 4129, 3300, 1400000, 50000, 'paid_transfer'),
  ('P5', 3731, 3825, 3300, 0, 50000, 'paid_transfer'),
  ('P6', 3517, 3600, 3300, 1400000, 50000, 'paid_transfer'),
  ('P7', 1436, 1566, 3300, 1400000, 50000, 'paid_transfer'),
  ('P8', 5336, 5402, 3300, 1400000, 50000, 'paid_transfer'),
  ('P9', 3011, 3028, 3300, 1400000, 50000, 'paid_transfer'),
  ('P10', 1779, 1779, 3300, 1400000, 50000, 'paid_transfer'),
  ('P11', 3419, 3556, 3300, 1400000, 50000, 'paid_cash'),
  ('P12', 2382, 2451, 3300, 1400000, 50000, 'paid_transfer'),
  ('P13', 3951, 4021, 3300, 1400000, 50000, 'paid_transfer'),
  ('P14', 5411, 5499, 3300, 1800000, 50000, 'paid_transfer'),
  ('P15', 4528, 4530, 3300, 1400000, 50000, 'paid_transfer'),
  ('P16', 7574, 7691, 3300, 1400000, 50000, 'paid_transfer'),
  ('P17', 4133, 4213, 3300, 1400000, 50000, 'paid_transfer'),
  ('P18', 4501, 4562, 3300, 1700000, 50000, 'paid_transfer'),
  ('P19', 3649, 3681, 3300, 1400000, 50000, 'paid_transfer'),
  ('P20', 4400, 4501, 3300, 1400000, 50000, 'paid_transfer'),
  ('P21', 4213, 4311, 3300, 1400000, 50000, 'paid_transfer'),
  ('P22', 2979, 3046, 3300, 1400000, 50000, 'paid_transfer'),
  ('P23', 4943, 5011, 3300, 1400000, 50000, 'paid_transfer'),
  ('P24', 4730, 4749, 3300, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2026 and m.month = 1
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2026, 2, '2026-01-10', '2026-02-10', 'xong','xong','xong', 9519254)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3660, 3680, 3300, 2500000, 50000, 'paid_transfer'),
  ('K2', 6813, 6958, 3300, 2500000, 50000, 'paid_transfer'),
  ('P1', 3945, 4028, 3300, 1600000, 50000, 'paid_transfer'),
  ('P2', 1655, 1678, 3300, 1400000, 50000, 'paid_cash'),
  ('P3', 2121, 2148, 3300, 1400000, 50000, 'paid_transfer'),
  ('P4', 4129, 4190, 3300, 1400000, 50000, 'paid_transfer'),
  ('P5', 3825, 3914, 3300, 0, 50000, 'paid_transfer'),
  ('P6', 3600, 3648, 3300, 1400000, 50000, 'paid_transfer'),
  ('P7', 1566, 1684, 3300, 1400000, 50000, 'paid_transfer'),
  ('P8', 5402, 5492, 3300, 1400000, 50000, 'paid_transfer'),
  ('P9', 3028, 3049, 3300, 1400000, 50000, 'paid_transfer'),
  ('P10', 1779, 1779, 3300, 1400000, 50000, 'paid_transfer'),
  ('P11', 3556, 3617, 3300, 1400000, 50000, 'paid_transfer'),
  ('P12', 2451, 2535, 3300, 1400000, 50000, 'paid_transfer'),
  ('P13', 4021, 4081, 3300, 1400000, 50000, 'paid_transfer'),
  ('P14', 5499, 5573, 3300, 1800000, 50000, 'paid_transfer'),
  ('P15', 4530, 4532, 3300, 1400000, 50000, 'paid_transfer'),
  ('P16', 7691, 7816, 3300, 1400000, 50000, 'paid_transfer'),
  ('P17', 4213, 4280, 3300, 1400000, 50000, 'paid_transfer'),
  ('P18', 4562, 4666, 3300, 1700000, 50000, 'paid_transfer'),
  ('P19', 3681, 3715, 3300, 1400000, 50000, 'paid_transfer'),
  ('P20', 4501, 4588, 3300, 1400000, 50000, 'paid_transfer'),
  ('P21', 4311, 4402, 3300, 1400000, 50000, 'paid_transfer'),
  ('P22', 3046, 3106, 3300, 1400000, 50000, 'paid_transfer'),
  ('P23', 5011, 5080, 3300, 1400000, 50000, 'paid_transfer'),
  ('P24', 4749, 4765, 3300, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2026 and m.month = 2
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2026, 3, '2026-02-10', '2026-03-10', 'xong','xong','xong', 4800000)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3680, 3710, 3300, 2500000, 50000, 'paid_transfer'),
  ('K2', 6958, 7084, 3300, 2500000, 50000, 'paid_transfer'),
  ('P1', 4028, 4102, 3300, 1600000, 50000, 'paid_transfer'),
  ('P2', 1678, 1697, 3300, 1400000, 50000, 'paid_cash'),
  ('P3', 2148, 2165, 3300, 1400000, 50000, 'paid_transfer'),
  ('P4', 4190, 4212, 3300, 1400000, 50000, 'paid_transfer'),
  ('P5', 3914, 4005, 3300, 0, 50000, 'paid_transfer'),
  ('P6', 3648, 3741, 3300, 1400000, 50000, 'paid_transfer'),
  ('P7', 1684, 1801, 3300, 1400000, 50000, 'paid_transfer'),
  ('P8', 5492, 5697, 3300, 1400000, 50000, 'paid_transfer'),
  ('P9', 3049, 3075, 3300, 1400000, 50000, 'paid_transfer'),
  ('P10', 1779, 1779, 3300, 1400000, 50000, 'paid_transfer'),
  ('P11', 3617, 3663, 3300, 1400000, 50000, 'paid_transfer'),
  ('P12', 2535, 2578, 3300, 1400000, 50000, 'paid_transfer'),
  ('P13', 4081, 4145, 3300, 1400000, 50000, 'paid_transfer'),
  ('P14', 5573, 5611, 3300, 1800000, 50000, 'paid_transfer'),
  ('P15', 4532, 4533, 3300, 1400000, 50000, 'paid_transfer'),
  ('P16', 7816, 7916, 3300, 1400000, 50000, 'paid_transfer'),
  ('P17', 4280, 4347, 3300, 1400000, 50000, 'paid_transfer'),
  ('P18', 4666, 4679, 3300, 1700000, 50000, 'paid_cash'),
  ('P19', 3715, 3737, 3300, 1400000, 50000, 'paid_transfer'),
  ('P20', 4588, 4675, 3300, 1400000, 50000, 'paid_transfer'),
  ('P21', 4402, 4491, 3300, 1400000, 50000, 'paid_transfer'),
  ('P22', 3106, 3168, 3300, 1400000, 50000, 'paid_transfer'),
  ('P23', 5080, 5122, 3300, 1400000, 50000, 'paid_transfer'),
  ('P24', 4765, 4776, 3300, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2026 and m.month = 3
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2026, 4, '2026-03-10', '2026-04-10', 'xong','xong','xong', 11020368)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3710, 3732, 3300, 2500000, 50000, 'paid_transfer'),
  ('K2', 7084, 7234, 3300, 2500000, 50000, 'paid_transfer'),
  ('P1', 4102, 4193, 3300, 1600000, 50000, 'paid_transfer'),
  ('P2', 1697, 1765, 3300, 1400000, 50000, 'paid_transfer'),
  ('P3', 2165, 2198, 3300, 1400000, 50000, 'paid_transfer'),
  ('P4', 4212, 4267, 3300, 1400000, 50000, 'paid_transfer'),
  ('P5', 4005, 4102, 3300, 0, 50000, 'paid_transfer'),
  ('P6', 3741, 3828, 3300, 1400000, 50000, 'paid_transfer'),
  ('P7', 1801, 1978, 3300, 1400000, 50000, 'paid_transfer'),
  ('P8', 5697, 6013, 3300, 1400000, 50000, 'paid_transfer'),
  ('P9', 3075, 3105, 3300, 1400000, 50000, 'paid_transfer'),
  ('P10', 1779, 1779, 3300, 1400000, 50000, 'paid_transfer'),
  ('P11', 3663, 3781, 3300, 1400000, 50000, 'paid_transfer'),
  ('P12', 2578, 2642, 3300, 1400000, 50000, 'paid_cash'),
  ('P13', 4145, 4208, 3300, 1400000, 50000, 'paid_transfer'),
  ('P14', 5611, 5727, 3300, 1800000, 50000, 'paid_transfer'),
  ('P15', 4533, 4546, 3300, 1400000, 50000, 'paid_transfer'),
  ('P16', 7916, 8052, 3300, 1400000, 50000, 'paid_transfer'),
  ('P17', 4347, 4421, 3300, 1400000, 50000, 'paid_transfer'),
  ('P18', 4679, 4949, 3300, 1400000, 50000, 'paid_transfer'),
  ('P19', 3737, 3765, 3300, 1400000, 50000, 'paid_cash'),
  ('P20', 4675, 4788, 3300, 1400000, 50000, 'paid_transfer'),
  ('P21', 4491, 4638, 3300, 1400000, 50000, 'paid_transfer'),
  ('P22', 3168, 3268, 3300, 1400000, 50000, 'paid_transfer'),
  ('P23', 5122, 5206, 3300, 1400000, 50000, 'paid_transfer'),
  ('P24', 4776, 4793, 3300, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2026 and m.month = 4
on conflict (month_id, room_id) do nothing;

insert into months (year, month, period_start, period_end, meter_status, fee_status, collection_status, other_fees)
values (2026, 5, '2026-04-10', '2026-05-10', 'xong','xong','xong', 13405699)
on conflict (year, month) do nothing;

insert into bills (month_id, room_id, reading_old, reading_new, electricity_rate, room_fee, trash_fee, payment_status)
select m.id, r.id, v.ro, v.rn, v.rate, v.rf, v.tf, v.st::payment_status_t
from (values
  ('K1', 3732, 3740, 3300, 2500000, 50000, 'paid_transfer'),
  ('K2', 7234, 7428, 3300, 2500000, 50000, 'paid_transfer'),
  ('P1', 4193, 4299, 3300, 1600000, 50000, 'paid_transfer'),
  ('P2', 1765, 1974, 3300, 1400000, 50000, 'paid_transfer'),
  ('P3', 2198, 2232, 3300, 1400000, 50000, 'paid_transfer'),
  ('P4', 4267, 4326, 3300, 1400000, 50000, 'paid_transfer'),
  ('P5', 4102, 4210, 3300, 0, 50000, 'paid_transfer'),
  ('P6', 3828, 3924, 3300, 1400000, 50000, 'paid_transfer'),
  ('P7', 1978, 2143, 3300, 1400000, 50000, 'paid_transfer'),
  ('P8', 6013, 6216, 3300, 1400000, 50000, 'paid_transfer'),
  ('P9', 3105, 3122, 3300, 1400000, 50000, 'paid_transfer'),
  ('P10', 1779, 1779, 3300, 1400000, 50000, 'paid_transfer'),
  ('P11', 3781, 3810, 3300, 1400000, 50000, 'paid_transfer'),
  ('P12', 2642, 2700, 3300, 1400000, 50000, 'paid_cash'),
  ('P13', 4208, 4275, 3300, 1400000, 50000, 'paid_transfer'),
  ('P14', 5727, 5866, 3300, 1800000, 50000, 'paid_transfer'),
  ('P15', 4546, 4573, 3300, 1400000, 50000, 'paid_transfer'),
  ('P16', 8052, 8174, 3300, 1400000, 50000, 'paid_transfer'),
  ('P17', 4421, 4499, 3300, 1400000, 50000, 'paid_transfer'),
  ('P18', 4949, 5172, 3300, 1400000, 50000, 'paid_transfer'),
  ('P19', 3765, 3794, 3300, 1400000, 50000, 'paid_transfer'),
  ('P20', 4788, 4954, 3300, 1400000, 50000, 'paid_transfer'),
  ('P21', 4638, 4791, 3300, 1400000, 50000, 'paid_transfer'),
  ('P22', 3268, 3358, 3300, 1400000, 50000, 'paid_transfer'),
  ('P23', 5206, 5285, 3300, 1400000, 50000, 'paid_transfer'),
  ('P24', 4793, 4809, 3300, 1400000, 50000, 'paid_transfer')
) as v(code, ro, rn, rate, rf, tf, st)
join rooms r on r.code = v.code
join months m on m.year = 2026 and m.month = 5
on conflict (month_id, room_id) do nothing;

