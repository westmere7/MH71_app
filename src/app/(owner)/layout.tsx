import { AppShell } from "@/components/layout/app-shell";

// Auth is enforced by middleware (src/middleware.ts). We deliberately do NOT call
// supabase here — an awaited getUser() on every navigation forces dynamic SSR and a
// network round-trip, which made page switches slow. The shell reads the email
// client-side from the cached session instead.
export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
