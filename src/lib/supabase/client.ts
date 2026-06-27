"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client (owner app). Session is persisted in cookies via
// @supabase/ssr so the owner stays logged in across visits.
// Untyped client; query results are cast to the Row types in src/lib/queries.ts.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Single shared instance for client components / realtime.
let browserClient: ReturnType<typeof createClient> | undefined;
export function getSupabaseBrowser() {
  if (!browserClient) browserClient = createClient();
  return browserClient;
}
