import type { Bill, MonthRow, ProgressStatus } from "./supabase/types";
import { isPaidStatus, paidAmountOf } from "./constants";

// =====================================================================
// Money model (matches the owner's sheet):
//
//   Lợi nhuận = Tổng thu − Tổng chi
//
// "Tổng chi" (total monthly expenses: EVN electricity, trash, internet,
// security, management, misc) is entered per month as `months.other_fees`.
// Profit is total income minus that single expense figure.
// =====================================================================

export interface MonthStats {
  roomCount: number; // số phòng có hoá đơn trong tháng
  occupied: number; // số phòng có khách
  paidCount: number; // số phòng đã thu xong
  totalBilled: number; // tổng sẽ thu (đã chốt số điện)
  collected: number; // đã thu
  electricityTotal: number; // tổng tiền điện thu của khách
  unitsTotal: number; // tổng số điện tiêu thụ (kWh)
  trashTotal: number;
  roomFeeTotal: number;
  expenses: number; // Tổng chi (months.other_fees)
  profitFull: number; // lợi nhuận nếu thu đủ 100% = totalBilled − Tổng chi
  profitCurrent: number; // lợi nhuận theo số đã thu = collected − Tổng chi
  meterFilled: boolean; // quản lý đã nhập số điện chưa (có reading_new)
}

function billCounts(b: Bill) {
  return {
    occupied: b.payment_status !== "vacant",
    paid: isPaidStatus(b.payment_status),
  };
}

export function computeMonthStats(bills: Bill[], month?: MonthRow | null): MonthStats {
  const expenses = month?.other_fees ?? 0;
  let occupied = 0;
  let paidCount = 0;
  let totalBilled = 0;
  let collected = 0;
  let electricityTotal = 0;
  let unitsTotal = 0;
  let trashTotal = 0;
  let roomFeeTotal = 0;
  let meterFilled = false;

  for (const b of bills) {
    const { occupied: occ, paid } = billCounts(b);
    if (b.reading_new != null) meterFilled = true;
    if (b.payment_status === "vacant") continue;
    if (occ) occupied += 1;
    totalBilled += b.total;
    electricityTotal += b.electricity_amount;
    unitsTotal += b.units;
    trashTotal += b.trash_fee;
    roomFeeTotal += b.room_fee;
    if (paid) {
      paidCount += 1;
      collected += paidAmountOf(b); // counts the real amount when "trả thiếu"
    }
  }

  return {
    roomCount: bills.length,
    occupied,
    paidCount,
    totalBilled,
    collected,
    electricityTotal,
    unitsTotal,
    trashTotal,
    roomFeeTotal,
    expenses,
    profitFull: totalBilled - expenses,
    profitCurrent: collected - expenses,
    meterFilled,
  };
}

/** profit used for the history chart / month comparison (collected basis) */
export function profitOf(stats: MonthStats): number {
  return stats.profitCurrent;
}

/** "Thu tiền" status, derived automatically from how many rooms have paid. */
export function deriveCollectionStatus(stats: MonthStats): ProgressStatus {
  if (stats.occupied === 0 || stats.paidCount === 0) return "chua";
  if (stats.paidCount >= stats.occupied) return "xong";
  return "dang";
}

/** % change of `current` vs `previous` (null when no baseline) */
export function pctChange(current: number, previous: number | null): number | null {
  if (previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
