import type { PaymentStatus, ProgressStatus } from "./supabase/types";

export const APP_NAME = "MH71";
// Bump on every deploy, even the smallest change (drives the "new version"
// footer + the open-tab update prompt).
export const APP_VERSION = "1.7.3";

// "Chi phí tổng cộng": a fixed monthly bundle of external service fees the owner
// pays (NOT electricity). Stored per month on months.other_fees; this is the
// default applied to newly-created months.
export const DEFAULT_TOTAL_COST = 4_800_000;

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
  // both methods read as a single "Đã thanh toán" status (the method is chosen
  // in the payment dialog; it's still stored, just not surfaced as the label).
  paid_cash: {
    label: "Đã thanh toán",
    short: "Đã TT",
    chip: "bg-success-surface text-success",
    dot: "bg-success",
    isPaid: true,
  },
  paid_transfer: {
    label: "Đã thanh toán",
    short: "Đã TT",
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
    label: "Trống (chưa có người thuê)",
    short: "Trống",
    chip: "bg-surface-2 text-muted",
    dot: "bg-muted",
    isPaid: false,
  },
};

export function isPaidStatus(s: PaymentStatus): boolean {
  return s === "paid_cash" || s === "paid_transfer";
}

// The status picker shows three choices. "paid" opens the payment dialog (where
// the cash/transfer method + any "trả thiếu" amount is chosen); the two paid
// methods both map back to this single choice.
export type StatusChoice = "unpaid" | "paid" | "vacant";

export const STATUS_CHOICES: { value: StatusChoice; label: string; dot: string }[] = [
  { value: "unpaid", label: "Chưa thanh toán", dot: "bg-danger" },
  { value: "paid", label: "Đã thanh toán", dot: "bg-success" },
  { value: "vacant", label: "Trống", dot: "bg-muted" },
];

export function statusChoiceOf(s: PaymentStatus): StatusChoice {
  if (isPaidStatus(s)) return "paid";
  if (s === "vacant") return "vacant";
  return "unpaid";
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
