// Hand-written DB types (mirror supabase/migrations/0001_schema.sql).
// Regenerate with `supabase gen types typescript` once the CLI is linked.

export type PaymentStatus =
  | "unpaid"
  | "paid_cash"
  | "paid_transfer"
  | "partial"
  | "vacant";

export type ProgressStatus = "chua" | "dang" | "xong";
export type RoomKind = "kiosk" | "room";

export interface Settings {
  id: number;
  building_name: string;
  electricity_rate: number;
  trash_fee: number;
  collection_target_pct: number;
  updated_at: string;
}

export interface Room {
  id: string;
  code: string;
  kind: RoomKind;
  default_rent: number;
  default_trash: number | null; // null = dùng giá chung (settings.trash_fee)
  default_rate: number | null; // null = dùng giá chung (settings.electricity_rate)
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Tenant {
  id: string;
  room_id: string;
  name: string;
  phone: string | null;
  move_in_date: string | null;
  move_out_date: string | null;
  photo_url: string | null;
  notes: string | null;
  same_household: boolean;
  camera_access: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonthRow {
  id: string;
  year: number;
  month: number;
  period_start: string | null;
  period_end: string | null;
  meter_status: ProgressStatus;
  fee_status: ProgressStatus;
  collection_status: ProgressStatus;
  other_fees: number;
  meter_note_photo_url: string | null;
  created_at: string;
}

export interface Bill {
  id: string;
  month_id: string;
  room_id: string;
  tenant_id: string | null;
  tenant_name: string | null;
  reading_old: number;
  reading_new: number | null;
  units: number;
  electricity_rate: number;
  electricity_amount: number;
  room_fee: number;
  trash_fee: number;
  total: number;
  payment_status: PaymentStatus;
  amount_paid: number | null; // số tiền đã thu thực tế; null = thu đủ (= total)
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentLog {
  id: string;
  bill_id: string;
  old_status: PaymentStatus | null;
  new_status: PaymentStatus;
  changed_at: string;
  changed_by: string | null;
}

// Minimal Database shape for supabase-js generics. The `Relationships` and
// `CompositeTypes` keys are required by recent @supabase/supabase-js versions —
// omitting them makes Insert/Update resolve to `never`.
type Tbl<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      settings: Tbl<Settings>;
      rooms: Tbl<Room>;
      tenants: Tbl<Tenant>;
      months: Tbl<MonthRow>;
      bills: Tbl<Bill>;
      payment_logs: Tbl<PaymentLog>;
    };
    Views: {
      v_bills_full: { Row: Record<string, unknown>; Relationships: [] };
    };
    Functions: Record<string, never>;
    Enums: {
      payment_status_t: PaymentStatus;
      progress_status_t: ProgressStatus;
      room_kind_t: RoomKind;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Convenience: a bill joined with its room + current tenant (used in the UI).
export interface BillWithRoom extends Bill {
  room: Pick<Room, "id" | "code" | "kind" | "sort_order">;
  tenant: Tenant | null;
}
