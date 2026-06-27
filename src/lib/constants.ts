import type { PaymentStatus, ProgressStatus } from "./supabase/types";

export const APP_NAME = "MH71";

// ---- Payment status (tenant) ----
export interface StatusMeta {
  label: string;
  short: string;
  // tailwind utility groups using our theme tokens
  chip: string; // chip bg + text
  dot: string; // small status dot bg
  isPaid: boolean;
}

export const PAYMENT_STATUS: Record<PaymentStatus, StatusMeta> = {
  paid_cash: {
    label: "Đã trả tiền mặt",
    short: "Tiền mặt",
    chip: "bg-success-surface text-success",
    dot: "bg-success",
    isPaid: true,
  },
  paid_transfer: {
    label: "Đã chuyển khoản",
    short: "C.Khoản",
    chip: "bg-success-surface text-success",
    dot: "bg-success",
    isPaid: true,
  },
  partial: {
    label: "Còn nợ (trả một phần)",
    short: "Còn nợ",
    chip: "bg-warning-surface text-warning",
    dot: "bg-warning",
    isPaid: false,
  },
  unpaid: {
    label: "Chưa thanh toán",
    short: "Chưa TT",
    chip: "bg-danger-surface text-danger",
    dot: "bg-danger",
    isPaid: false,
  },
  vacant: {
    label: "Trống (chưa có khách)",
    short: "Trống",
    chip: "bg-surface-2 text-muted",
    dot: "bg-muted",
    isPaid: false,
  },
};

// Order shown in the status picker ("partial" is gone — use the "trả thiếu"
// toggle on a cash/transfer payment instead).
export const PAYMENT_STATUS_ORDER: PaymentStatus[] = [
  "unpaid",
  "paid_cash",
  "paid_transfer",
  "vacant",
];

export function isPaidStatus(s: PaymentStatus): boolean {
  return s === "paid_cash" || s === "paid_transfer";
}

/** số tiền đã thu của một hoá đơn (null amount_paid = thu đủ) */
export function paidAmountOf(b: {
  payment_status: PaymentStatus;
  amount_paid: number | null;
  total: number;
}): number {
  if (!isPaidStatus(b.payment_status)) return 0;
  return b.amount_paid ?? b.total;
}

/** hoá đơn đã trả nhưng còn thiếu */
export function isUnderpaid(b: {
  payment_status: PaymentStatus;
  amount_paid: number | null;
  total: number;
}): boolean {
  return isPaidStatus(b.payment_status) && b.amount_paid != null && b.amount_paid < b.total;
}

// ---- Progress status (month-level: ghi điện / thanh toán / thu tiền) ----
export const PROGRESS_STATUS: Record<ProgressStatus, { label: string; chip: string }> = {
  chua: { label: "Chưa làm", chip: "bg-danger-surface text-danger" },
  dang: { label: "Đang làm", chip: "bg-warning-surface text-warning" },
  xong: { label: "Xong", chip: "bg-success-surface text-success" },
};

export const PHASE_LABELS = {
  meter_status: "Ghi điện", // do quản lý nhập số điện
  collection_status: "Thu tiền", // tự động theo trạng thái thanh toán của khách
} as const;
