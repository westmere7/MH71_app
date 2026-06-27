import { NextResponse } from "next/server";
import { isMeterAuthed } from "@/lib/meter-auth";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  if (!(await isMeterAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = createServiceClient();

  const { data: months, error: mErr } = await sb
    .from("months")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(1);
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const month = months?.[0] ?? null;
  if (!month) return NextResponse.json({ month: null, rows: [] });

  const [{ data: rooms, error: rErr }, { data: bills, error: bErr }] = await Promise.all([
    sb.from("rooms").select("id, code, sort_order"),
    sb
      .from("bills")
      .select("id, room_id, reading_old, reading_new, electricity_rate, tenant_name")
      .eq("month_id", month.id),
  ]);
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

  const roomMap = new Map((rooms ?? []).map((r) => [r.id, r]));

  const rows = (bills ?? [])
    .map((b) => {
      const room = roomMap.get(b.room_id);
      return {
        id: b.id,
        code: room?.code ?? "",
        sort_order: room?.sort_order ?? 0,
        reading_old: b.reading_old,
        reading_new: b.reading_new,
        electricity_rate: b.electricity_rate,
        tenant_name: b.tenant_name,
      };
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  return NextResponse.json({
    month: {
      id: month.id,
      year: month.year,
      month: month.month,
      meter_status: month.meter_status,
      meter_note_photo_url: month.meter_note_photo_url,
    },
    rows,
  });
}
