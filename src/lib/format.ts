import { format, parseISO, differenceInMonths } from "date-fns";
import { vi } from "date-fns/locale";

const viNum = new Intl.NumberFormat("vi-VN");

/** 2500000 -> "2.500.000 đ" */
export function formatVND(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${viNum.format(Math.round(value))} đ`;
}

/** Plain grouped number: 12345 -> "12.345" */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return viNum.format(value);
}

/** Short money for tight chips: 2500000 -> "2,5tr"; 386600 -> "387k" */
export function formatVNDShort(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 ? 1 : 0)}tr`;
  if (abs >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function toDate(d: string | Date): Date {
  return typeof d === "string" ? parseISO(d) : d;
}

/** dd.MM.yyyy */
export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return format(toDate(d), "dd.MM.yyyy", { locale: vi });
}

/** dd.MM • HH:mm */
export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return format(toDate(d), "dd.MM • HH:mm", { locale: vi });
}

/** "Tháng 6 / 2026" */
export function monthLabel(year: number, month: number): string {
  return `Tháng ${month} / ${year}`;
}

/** "10.05 → 10.06" */
export function periodLabel(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start || !end) return "";
  return `${format(toDate(start), "dd.MM")} → ${format(toDate(end), "dd.MM")}`;
}

/** "đã ở 3 tháng" / "đã ở 1 năm 2 tháng" — null when no move-in date */
export function tenancyDuration(moveIn: string | null | undefined): string | null {
  if (!moveIn) return null;
  const months = differenceInMonths(new Date(), parseISO(moveIn));
  if (months < 0) return null;
  if (months < 1) return "mới vào ở";
  if (months < 12) return `đã ở ${months} tháng`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `đã ở ${y} năm ${m} tháng` : `đã ở ${y} năm`;
}

/** initials for the avatar fallback: "Phúc & Tuyền" -> "PT", "Toán" -> "TO" */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const clean = name.replace(/\(.*?\)/g, "").trim();
  const parts = clean.split(/[\s&]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  // single-word name → a single letter; multi-word → first + last initials
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
