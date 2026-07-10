import { PAYMENT_STATUS } from "./constants";
import type { AuditRow, AuditOp, PaymentStatus } from "./supabase/types";

export const TABLE_LABEL: Record<string, string> = {
  bills: "Hoá đơn",
  tenants: "Người thuê",
  rooms: "Phòng",
  months: "Tháng",
  settings: "Cài đặt",
};

export const OP_LABEL: Record<AuditOp, string> = {
  INSERT: "Thêm",
  UPDATE: "Sửa",
  DELETE: "Xoá",
};

const FIELD_LABEL: Record<string, string> = {
  name: "Tên",
  phone: "SĐT",
  reading_old: "Số cũ",
  reading_new: "Số mới",
  electricity_rate: "Giá điện",
  room_fee: "Tiền phòng",
  trash_fee: "Tiền rác",
  payment_status: "Trạng thái",
  amount_paid: "Đã thu",
  paid_at: "Thời gian TT",
  tenant_name: "Tên người thuê",
  tenant_phone: "SĐT",
  tenant_id: "Người thuê",
  notes: "Ghi chú",
  photo_url: "Ảnh đại diện",
  camera_access: "Camera",
  move_in_date: "Ngày vào ở",
  move_out_date: "Ngày rời đi",
  documents: "Giấy tờ",
  evn_bill: "Tiền điện EVN",
  other_fees: "Chi phí tổng cộng",
  meter_status: "TT ghi điện",
  meter_note_photo_url: "Ảnh ghi số",
  lock_past_months: "Khoá tháng cũ",
  notify_email: "Email thông báo",
  ui_scale: "Cỡ hiển thị",
  qr_code_url: "QR chuyển khoản",
  default_rent: "Giá phòng mặc định",
  building_name: "Tên nhà",
};

// derived / noisy columns not worth showing in a change list
const SKIP = new Set(["id", "created_at", "updated_at", "units", "electricity_amount", "total"]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

export function actorLabel(actor: string | null): string {
  if (!actor) return "Hệ thống";
  if (UUID_RE.test(actor)) return "Chủ nhà";
  if (/service/i.test(actor)) return "Trang ghi điện";
  return actor;
}

function fmtVal(v: unknown): string {
  if (v == null || v === "") return "trống";
  if (typeof v === "boolean") return v ? "bật" : "tắt";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 48 ? s.slice(0, 48) + "…" : s;
}

function renderField(key: string, v: unknown): string {
  if (key === "payment_status" && typeof v === "string") {
    return PAYMENT_STATUS[v as PaymentStatus]?.label ?? v;
  }
  return fmtVal(v);
}

/** A short human identity for the changed row (room code, tenant, month…). */
export function identityOf(e: AuditRow, roomCode: Map<string, string>): string {
  const row = (e.after ?? e.before ?? {}) as Record<string, unknown>;
  switch (e.table_name) {
    case "bills": {
      const code = roomCode.get(String(row.room_id)) ?? "";
      const name = row.tenant_name ? ` · ${row.tenant_name}` : "";
      return `${code}${name}`;
    }
    case "rooms":
      return String(row.code ?? "");
    case "tenants":
      return String(row.name ?? "");
    case "months":
      return row.year && row.month ? `Tháng ${row.month}/${row.year}` : "";
    case "settings":
      return "chung";
    default:
      return "";
  }
}

/** Field-level diff for UPDATE rows (skips derived/noise columns). */
export function changedFields(e: AuditRow): { label: string; from: string; to: string }[] {
  if (e.op !== "UPDATE" || !e.before || !e.after) return [];
  const keys = new Set([...Object.keys(e.before), ...Object.keys(e.after)]);
  const out: { label: string; from: string; to: string }[] = [];
  for (const k of keys) {
    if (SKIP.has(k)) continue;
    const a = e.before[k];
    const b = e.after[k];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    out.push({ label: FIELD_LABEL[k] ?? k, from: renderField(k, a), to: renderField(k, b) });
  }
  return out;
}
