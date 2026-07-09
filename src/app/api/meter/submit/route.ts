import { NextResponse, after } from "next/server";
import { isMeterAuthed } from "@/lib/meter-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { sendMeterEmail } from "@/lib/email";

interface SubmitBody {
  monthId?: string;
  notePhotoUrl?: string | null;
  readings?: { billId: string; reading_new: number | null }[];
}

// Commits a whole month in one go: writes every room's reading, sets the note
// photo, and marks the month finished. This is the ONLY place the manager's
// edits are persisted — nothing is saved before this is called.
export async function POST(request: Request) {
  if (!(await isMeterAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: SubmitBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body.monthId) return NextResponse.json({ error: "missing_month" }, { status: 400 });
  if (!body.notePhotoUrl) return NextResponse.json({ error: "photo_required" }, { status: 400 });
  if (!Array.isArray(body.readings)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const sb = createServiceClient();
  const readingById = new Map(body.readings.map((r) => [r.billId, r.reading_new]));

  // validate against the real số cũ for every bill in the month
  const { data: bills } = await sb
    .from("bills")
    .select("id, reading_old, room:rooms(code, sort_order)")
    .eq("month_id", body.monthId);
  type RoomEmbed = { code: string; sort_order: number };
  const billRows = (bills ?? []) as unknown as {
    id: string;
    reading_old: number;
    room: RoomEmbed | RoomEmbed[] | null;
  }[];
  if (billRows.length === 0) {
    return NextResponse.json({ error: "no_bills" }, { status: 400 });
  }
  for (const b of billRows) {
    const r = readingById.get(b.id);
    if (r == null || Number.isNaN(Number(r))) {
      return NextResponse.json({ error: "incomplete" }, { status: 400 });
    }
    if (Number(r) < b.reading_old) {
      return NextResponse.json({ error: "invalid_reading" }, { status: 400 });
    }
  }

  // write every reading
  const writes = await Promise.all(
    billRows.map((b) =>
      sb.from("bills").update({ reading_new: Number(readingById.get(b.id)) }).eq("id", b.id),
    ),
  );
  const writeErr = writes.find((w) => w.error);
  if (writeErr?.error) {
    return NextResponse.json({ error: writeErr.error.message }, { status: 500 });
  }

  // read the month BEFORE finalizing: whether we've already emailed decides
  // "first fill" vs "correction" (gracefully handle a missing 0013 column).
  let month: { year: number; month: number; meter_notified_at: string | null } | null = null;
  {
    const r = await sb
      .from("months")
      .select("year, month, meter_notified_at")
      .eq("id", body.monthId)
      .single();
    if (r.error && /meter_notified_at/i.test(r.error.message ?? "")) {
      const r2 = await sb.from("months").select("year, month").eq("id", body.monthId).single();
      month = r2.data ? { ...(r2.data as { year: number; month: number }), meter_notified_at: null } : null;
    } else {
      month = (r.data as typeof month) ?? null;
    }
  }
  const firstFill = !month?.meter_notified_at;
  const filledAt = new Date().toISOString();

  // finalize the month: note photo + completion + timestamp. On the first fill,
  // stamp meter_notified_at so retries/redeploys never re-send the first email.
  // Gracefully fall back if migration 0006/0013 columns aren't applied yet.
  const finalize: Record<string, unknown> = {
    meter_note_photo_url: body.notePhotoUrl,
    meter_status: "xong",
    meter_filled_at: filledAt,
  };
  if (firstFill) finalize.meter_notified_at = filledAt;

  let { error } = await sb.from("months").update(finalize).eq("id", body.monthId);
  if (error && /(meter_filled_at|meter_notified_at)/i.test(error.message ?? "")) {
    ({ error } = await sb
      .from("months")
      .update({ meter_note_photo_url: body.notePhotoUrl, meter_status: "xong" })
      .eq("id", body.monthId));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // notify the owner AFTER responding — never block or fail the submit on email.
  const origin = new URL(request.url).origin;
  const roomUnits = billRows
    .map((b) => {
      const rm = Array.isArray(b.room) ? b.room[0] : b.room;
      return {
        code: rm?.code ?? "?",
        sort: rm?.sort_order ?? 0,
        units: Number(readingById.get(b.id)) - b.reading_old,
      };
    })
    .sort((a, b) => a.sort - b.sort);
  const rooms = roomUnits.map(({ code, units }) => ({ code, units }));
  const unitsTotal = roomUnits.reduce((sum, r) => sum + r.units, 0);
  after(async () => {
    try {
      let to = process.env.OWNER_NOTIFY_EMAIL || null;
      const s = await sb.from("settings").select("notify_email").eq("id", 1).single();
      if (!s.error && s.data?.notify_email) to = s.data.notify_email as string;
      if (!to) return; // nobody to notify

      await sendMeterEmail({
        to,
        kind: firstFill ? "filled" : "updated",
        monthLabel: month ? `Tháng ${month.month}/${month.year}` : "",
        rooms,
        unitsTotal,
        filledAt,
        notePhotoUrl: body.notePhotoUrl ?? null,
        appUrl: origin,
      });
    } catch (e) {
      console.error("[meter/submit] notify email failed:", e);
    }
  });

  return NextResponse.json({ ok: true });
}
