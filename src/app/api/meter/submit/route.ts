import { NextResponse } from "next/server";
import { isMeterAuthed } from "@/lib/meter-auth";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  if (!(await isMeterAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { monthId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body.monthId) return NextResponse.json({ error: "missing_month" }, { status: 400 });

  const sb = createServiceClient();
  // record completion + timestamp; gracefully fall back if 0006 isn't applied yet
  let { error } = await sb
    .from("months")
    .update({ meter_status: "xong", meter_filled_at: new Date().toISOString() })
    .eq("id", body.monthId);
  if (error && /meter_filled_at/i.test(error.message ?? "")) {
    ({ error } = await sb.from("months").update({ meter_status: "xong" }).eq("id", body.monthId));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
