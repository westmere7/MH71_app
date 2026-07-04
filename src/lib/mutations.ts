"use client";

import { addMonths, parseISO, formatISO } from "date-fns";
import { getSupabaseBrowser } from "./supabase/client";
import { DEFAULT_TOTAL_COST } from "./constants";
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
  // Setting a room to "Trống" clears the tenant + rent/trash for that month,
  // but KEEPS the electricity (reading_old/new) so tiền điện is still shown,
  // and keeps the status log.
  const base: Record<string, unknown> =
    status === "vacant"
      ? { payment_status: status, tenant_id: null, tenant_name: null, room_fee: 0, trash_fee: 0 }
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
/** Re-activate a vacant room's bill when a new tenant moves in. */
export async function reactivateBill(
  billId: string,
  roomFee: number,
  trashFee: number,
  tenantId: string,
  tenantName: string,
  tenantPhone: string | null,
) {
  const sb = getSupabaseBrowser();
  const base = {
    payment_status: "unpaid" as PaymentStatus,
    room_fee: roomFee,
    trash_fee: trashFee,
    tenant_id: tenantId,
    tenant_name: tenantName,
  };
  // include the phone snapshot; gracefully fall back if migration 0008 is missing
  let res = await sb
    .from("bills")
    .update({ ...base, tenant_phone: tenantPhone })
    .eq("id", billId)
    .select()
    .single();
  if (res.error && /tenant_phone/i.test(res.error.message ?? "")) {
    res = await sb.from("bills").update(base).eq("id", billId).select().single();
  }
  return unwrap(res);
}

/** Sync ONLY the given month's bill snapshot (name/phone/id) when a tenant is
 *  edited. Other months keep their own snapshot — edits never propagate back. */
export async function updateBillTenant(
  billId: string,
  tenantId: string | null,
  tenantName: string | null,
  tenantPhone: string | null,
) {
  const sb = getSupabaseBrowser();
  const base = { tenant_id: tenantId, tenant_name: tenantName };
  let res = await sb
    .from("bills")
    .update({ ...base, tenant_phone: tenantPhone })
    .eq("id", billId)
    .select()
    .single();
  if (res.error && /tenant_phone/i.test(res.error.message ?? "")) {
    res = await sb.from("bills").update(base).eq("id", billId).select().single();
  }
  return unwrap(res);
}

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

/**
 * Month-specific pricing: saves the price list (rooms + settings) AND stamps the
 * prices onto the GIVEN month's bills only. Past months (other bills) are never
 * touched, so historical financials stay intact. Vacant bills keep their 0 fees
 * (only the electricity rate is refreshed).
 */
export async function saveMonthPricing(
  monthId: string,
  rooms: PricingRoom[],
  trashFee: number,
  electricityRate: number,
) {
  const sb = getSupabaseBrowser();
  await savePricing(rooms, trashFee, electricityRate);

  const { data: bills } = await sb
    .from("bills")
    .select("id, room_id, payment_status")
    .eq("month_id", monthId);
  const byRoom = new Map(rooms.map((r) => [r.id, r]));
  await Promise.all(
    (bills ?? []).map((b: { id: string; room_id: string; payment_status: PaymentStatus }) => {
      const pr = byRoom.get(b.room_id);
      if (!pr) return Promise.resolve(undefined);
      const rate = pr.default_rate ?? electricityRate;
      const patch =
        b.payment_status === "vacant"
          ? { electricity_rate: rate }
          : {
              room_fee: pr.default_rent,
              trash_fee: pr.default_trash ?? trashFee,
              electricity_rate: rate,
            };
      return sb.from("bills").update(patch).eq("id", b.id);
    }),
  );
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

  // create the month — carry "Chi phí tổng cộng" forward (default if first month)
  const otherFees = latest?.other_fees ?? DEFAULT_TOTAL_COST;
  const newMonth = unwrap(
    await sb
      .from("months")
      .insert({ year, month, period_start: periodStart, period_end: periodEnd, other_fees: otherFees })
      .select()
      .single(),
  ) as MonthRow;

  // previous bills indexed by room — the new month is a strict clone of these,
  // NOT of the rooms/settings defaults (which a since-deleted month may have edited)
  const prevByRoom = new Map<string, Bill>();
  if (latest) {
    const { data: prevBills } = await sb.from("bills").select("*").eq("month_id", latest.id);
    for (const b of (prevBills ?? []) as Bill[]) prevByRoom.set(b.room_id, b);
  }
  const tenantByRoom = new Map<string, Tenant>();
  for (const t of tenantList) tenantByRoom.set(t.room_id, t);

  const rows = roomList.map((r) => {
    const prev = prevByRoom.get(r.id);

    // No previous bill for this room (very first month, or a newly-added room):
    // fall back to the room/settings defaults + current tenant.
    if (!prev) {
      const tenant = tenantByRoom.get(r.id);
      return {
        month_id: newMonth.id,
        room_id: r.id,
        tenant_id: tenant?.id ?? null,
        tenant_name: tenant?.name ?? null,
        tenant_phone: tenant?.phone ?? null,
        reading_old: 0,
        reading_new: null,
        electricity_rate: r.default_rate ?? s.electricity_rate,
        room_fee: r.default_rent,
        trash_fee: r.default_trash ?? s.trash_fee,
        payment_status: (tenant ? "unpaid" : "vacant") as PaymentStatus,
      };
    }

    // Otherwise mirror the previous month EXACTLY — every value comes straight
    // from the previous bill (never the live/edited tenant or pricing tables);
    // only roll the meter reading forward and reset reading + payment status.
    const hasTenant = prev.tenant_id != null;
    return {
      month_id: newMonth.id,
      room_id: r.id,
      tenant_id: prev.tenant_id,
      tenant_name: prev.tenant_name,
      tenant_phone: prev.tenant_phone,
      reading_old: prev.reading_new ?? prev.reading_old,
      reading_new: null,
      electricity_rate: prev.electricity_rate,
      room_fee: prev.room_fee,
      trash_fee: prev.trash_fee,
      payment_status: (hasTenant ? "unpaid" : "vacant") as PaymentStatus,
    };
  });

  if (rows.length) {
    let { error } = await sb.from("bills").insert(rows);
    // gracefully fall back if migration 0008 (tenant_phone) isn't applied yet
    if (error && /tenant_phone/i.test(error.message ?? "")) {
      const stripped = rows.map(({ tenant_phone, ...rest }) => rest);
      ({ error } = await sb.from("bills").insert(stripped));
    }
    if (error) throw error;
  }

  return newMonth;
}

export async function resetMonth(monthId: string): Promise<void> {
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

  const monthList = (months ?? []) as MonthRow[];
  const s = settings as Settings;
  const roomList = (rooms ?? []) as Pick<
    import("./supabase/types").Room,
    "id" | "default_rent" | "default_trash" | "default_rate"
  >[];
  const tenantList = (tenants ?? []) as Tenant[];

  const targetIndex = monthList.findIndex((m) => m.id === monthId);
  if (targetIndex === -1) throw new Error("Month not found");
  const targetMonth = monthList[targetIndex];
  const prevMonth = targetIndex < monthList.length - 1 ? monthList[targetIndex + 1] : null;

  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  if (prevMonth) {
    if (prevMonth.period_end) {
      periodStart = prevMonth.period_end;
      periodEnd = formatISO(addMonths(parseISO(prevMonth.period_end), 1), {
        representation: "date",
      });
    }
  } else {
    periodStart = targetMonth.period_start;
    periodEnd = targetMonth.period_end;
  }
  const otherFees = prevMonth?.other_fees ?? DEFAULT_TOTAL_COST;

  const prevByRoom = new Map<string, Bill>();
  if (prevMonth) {
    const { data: prevBills } = await sb.from("bills").select("*").eq("month_id", prevMonth.id);
    for (const b of (prevBills ?? []) as Bill[]) prevByRoom.set(b.room_id, b);
  }
  const tenantByRoom = new Map<string, Tenant>();
  for (const t of tenantList) tenantByRoom.set(t.room_id, t);

  // Delete all existing bills first
  const { error: deleteError } = await sb.from("bills").delete().eq("month_id", monthId);
  if (deleteError) throw deleteError;

  // Reset target month metadata
  const monthMetaPatch: Record<string, any> = {
    meter_status: "chua",
    fee_status: "chua",
    collection_status: "chua",
    other_fees: otherFees,
    meter_note_photo_url: null,
    meter_filled_at: null,
  };
  if ("evn_bill" in targetMonth) {
    monthMetaPatch.evn_bill = 0;
  }
  if (periodStart) monthMetaPatch.period_start = periodStart;
  if (periodEnd) monthMetaPatch.period_end = periodEnd;

  const { error: updateMonthError } = await sb
    .from("months")
    .update(monthMetaPatch)
    .eq("id", monthId);
  if (updateMonthError) throw updateMonthError;

  // Re-generate rows
  const rows = roomList.map((r) => {
    const prev = prevByRoom.get(r.id);

    if (!prev) {
      const tenant = tenantByRoom.get(r.id);
      return {
        month_id: monthId,
        room_id: r.id,
        tenant_id: tenant?.id ?? null,
        tenant_name: tenant?.name ?? null,
        tenant_phone: tenant?.phone ?? null,
        reading_old: 0,
        reading_new: null,
        electricity_rate: r.default_rate ?? s.electricity_rate,
        room_fee: r.default_rent,
        trash_fee: r.default_trash ?? s.trash_fee,
        payment_status: (tenant ? "unpaid" : "vacant") as PaymentStatus,
      };
    }

    const hasTenant = prev.tenant_id != null;
    return {
      month_id: monthId,
      room_id: r.id,
      tenant_id: prev.tenant_id,
      tenant_name: prev.tenant_name,
      tenant_phone: prev.tenant_phone,
      reading_old: prev.reading_new ?? prev.reading_old,
      reading_new: null,
      electricity_rate: prev.electricity_rate,
      room_fee: prev.room_fee,
      trash_fee: prev.trash_fee,
      payment_status: (hasTenant ? "unpaid" : "vacant") as PaymentStatus,
    };
  });

  if (rows.length) {
    let { error } = await sb.from("bills").insert(rows);
    if (error && /tenant_phone/i.test(error.message ?? "")) {
      const stripped = rows.map(({ tenant_phone, ...rest }) => rest);
      ({ error } = await sb.from("bills").insert(stripped));
    }
    if (error) throw error;
  }
}

