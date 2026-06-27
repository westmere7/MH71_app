import { NextResponse } from "next/server";
import { isMeterAuthed } from "@/lib/meter-auth";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  if (!(await isMeterAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const monthId = form.get("monthId");

  if (!(file instanceof File) || typeof monthId !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const sb = createServiceClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${monthId}/note-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await sb.storage
    .from("meter-notes")
    .upload(path, buffer, { contentType: file.type || "image/jpeg", upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = sb.storage.from("meter-notes").getPublicUrl(path);
  const { error: updErr } = await sb
    .from("months")
    .update({ meter_note_photo_url: pub.publicUrl })
    .eq("id", monthId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, url: pub.publicUrl });
}
