"use client";

import { addMonths, parseISO, formatISO } from "date-fns";
import { getSupabaseBrowser } from "./supabase/client";
import type { Bill, MonthRow, PaymentStatus, Settings, Tenant } from "./supabase/types";

function unwrap<T>({ data, error }: { data: T; error: unknown }): T {
  if (error) throw error;
  return data;
}

// ---- Bills ----
// amountPaid: null = thu đủ (full). A value < total = "trả thiếu" (underpaid).
export async function updateBillStatus(
  billId: string,
  status: PaymentStatus,
  amountPaid: number | null = null,
) {
  const sb = getSupabaseBrowser();
  // Setting a room to "Trống" also clears the tenant link + name snapshot.
  const base: Record<string, unknown> =
    status === "vacant"
      ? { payment_status: status, tenant_id: null, tenant_name: null }
      : { payment_status: status };

  // Try with amount_paid; gracefully fall back if migration 0005 isn't applied yet.
  let res = await sb
    .from("bills")
    .update({ ...base, amount_paid: amountPaid })
    .eq("id", billId)
    .select()
    .single();
  if (res.error && /amount_paid/i.test(res.error.message ?? "")) {
    res = await sb.from("bills").update(base).eq("id", billId).select().single();
  }
  return unwrap(res);
}

export async function updateBillFields(
  billId: string,
  patch: Partial<Pick<Bill, "room_fee" | "trash_fee" | "notes" | "reading_old" | "reading_new">>,
) {
  const sb = getSupabaseBrowser();
  return unwrap(await sb.from("bills").update(patch).eq("id", billId).select().single());
}

// ---- Tenants ----
export interface TenantInput {
  id?: string;
  room_id: string;
  name: string;
  phone: string | null;
  move_in_date: string | null;
  photo_url: string | null;
  notes: string | null;
  same_household: boolean;
  camera_access: boolean;
}

export async function upsertTenant(input: TenantInput) {
  const sb = getSupabaseBrowser();
  if (input.id) {
    const { id, ...patch } = input;
    return unwrap(await sb.from("tenants").update(patch).eq("id", id).select().single());
  }
  return unwrap(await sb.from("tenants").insert(input).select().single());
}

/** Mark the current tenant of a room as moved out (history preserved). */
export async function moveOutTenant(tenantId: string, moveOutDate: string) {
  const sb = getSupabaseBrowser();
  return unwrap(
    await sb
      .from("tenants")
      .update({ move_out_date: moveOutDate })
      .eq("id", tenantId)
      .select()
      .single(),
  );
}

// ---- Settings ----
export async function updateSettings(patch: Partial<Settings>) {
  const sb = getSupabaseBrowser();
  return unwrap(
    await sb.from("settings").update(patch).eq("id", 1).select().single(),
  );
}

/**
 * Update a room's base rent. Optionally also overwrites the matching bill's
 * room_fee (e.g. when edited from the tenant card) so the visible total stays
 * aligned. The base price itself lives only on rooms.default_rent.
 */
export async function updateRoomRent(roomId: string, defaultRent: number, billId?: string) {
  const sb = getSupabaseBrowser();
  await sb.from("rooms").update({ default_rent: defaultRent }).eq("id", roomId);
  if (billId) {
    await sb.from("bills").update({ room_fee: defaultRent }).eq("id", billId);
  }
}

export interface PricingRoom {
  id: string;
  default_rent: number;
  default_trash: number | null;
  default_rate: number | null;
}

/** Save the whole "Thiết lập giá" table: per-room base rent + per-room/shared trash & rate. */
export async function savePricing(rooms: PricingRoom[], trashFee: number, electricityRate: number) {
  const sb = getSupabaseBrowser();
  await Promise.all(
    rooms.map((r) =>
      sb
        .from("rooms")
        .update({
          default_rent: r.default_rent,
          default_trash: r.default_trash,
          default_rate: r.default_rate,
        })
        .eq("id", r.id),
    ),
  );
  const { error } = await sb
    .from("settings")
    .update({ trash_fee: trashFee, electricity_rate: electricityRate })
    .eq("id", 1);
  if (error) throw error;
}

// ---- Month metadata ----
export async function updateMonthMeta(monthId: string, patch: Partial<MonthRow>) {
  const sb = getSupabaseBrowser();
  return unwrap(await sb.from("months").update(patch).eq("id", monthId).select().single());
}

/** Permanently delete a month and all its bills (bills cascade on delete). */
export async function deleteMonth(monthId: string) {
  const sb = getSupabaseBrowser();
  const { error } = await sb.from("months").delete().eq("id", monthId);
  if (error) throw error;
}

/**
 * Create the next month: clones every room into a fresh set of bills, rolling
 * each room's previous `reading_new` forward into the new `reading_old`, and
 * snapshotting current rent / trash / electricity rate + current tenant.
 */
export async function createNextMonth(): Promise<MonthRow> {
  const sb = getSupabaseBrowser();

  const [{ data: months }, { data: settings }, { data: rooms }, { data: tenants }] =
    await Promise.all([
      sb.from("months").select("*").order("year", { ascending: false }).order("month", {
        ascending: false,
      }),
      sb.from("settings").select("*").eq("id", 1).single(),
      sb.from("rooms").select("*").eq("is_active", true).order("sort_order"),
      sb.from("tenants").select("*").is("move_out_date", null),
    ]);

  const latest = months?.[0] as MonthRow | undefined;
  const s = settings as Settings;
  const roomList = (rooms ?? []) as Pick<
    import("./supabase/types").Room,
    "id" | "default_rent" | "default_trash" | "default_rate"
  >[];
  const tenantList = (tenants ?? []) as Tenant[];

  // next period
  let year: number;
  let month: number;
  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  if (latest) {
    if (latest.month === 12) {
      year = latest.year + 1;
      month = 1;
    } else {
      year = latest.year;
      month = latest.month + 1;
    }
    if (latest.period_end) {
      periodStart = latest.period_end;
      periodEnd = formatISO(addMonths(parseISO(latest.period_end), 1), {
        representation: "date",
      });
    }
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  // create the month
  const newMonth = unwrap(
    await sb
      .from("months")
      .insert({ year, month, period_start: periodStart, period_end: periodEnd })
      .select()
      .single(),
  ) as MonthRow;

  // previous bills indexed by room
  const prevByRoom = new Map<string, Bill>();
  if (latest) {
    const { data: prevBills } = await sb.from("bills").select("*").eq("month_id", latest.id);
    for (const b of (prevBills ?? []) as Bill[]) prevByRoom.set(b.room_id, b);
  }
  const tenantByRoom = new Map<string, Tenant>();
  for (const t of tenantList) tenantByRoom.set(t.room_id, t);

  const rows = roomList.map((r) => {
    const prev = prevByRoom.get(r.id);
    const tenant = tenantByRoom.get(r.id);
    const readingOld = prev ? (prev.reading_new ?? prev.reading_old) : 0;
    return {
      month_id: newMonth.id,
      room_id: r.id,
      tenant_id: tenant?.id ?? null,
      tenant_name: tenant?.name ?? null,
      reading_old: readingOld,
      reading_new: null,
      electricity_rate: r.default_rate ?? s.electricity_rate,
      room_fee: r.default_rent,
      trash_fee: r.default_trash ?? s.trash_fee,
      payment_status: (tenant ? "unpaid" : "vacant") as PaymentStatus,
    };
  });

  if (rows.length) {
    const { error } = await sb.from("bills").insert(rows);
    if (error) throw error;
  }

  return newMonth;
}
