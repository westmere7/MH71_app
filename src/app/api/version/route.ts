import { NextResponse } from "next/server";

// Identifies the current deployment so open tabs can detect a new release.
// Vercel sets VERCEL_GIT_COMMIT_SHA per deploy; "dev" locally (never changes).
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { v: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
