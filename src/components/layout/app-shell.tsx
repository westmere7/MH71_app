"use client";

import * as React from "react";
import { MonthProvider } from "@/components/month-provider";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { APP_VERSION } from "@/lib/constants";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { MonthSwitcher } from "./month-switcher";
import { ThemeToggle } from "./theme-toggle";

export function AppShell({ children }: { children: React.ReactNode }) {
  // read the email from the locally-cached session (no network round-trip)
  const [userEmail, setUserEmail] = React.useState<string>();
  React.useEffect(() => {
    getSupabaseBrowser()
      .auth.getSession()
      .then(({ data }) => setUserEmail(data.session?.user?.email ?? undefined));
  }, []);

  return (
    <MonthProvider>
      <div className="flex min-h-screen">
        <Sidebar userEmail={userEmail} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
              <div className="flex items-center gap-3">
                <span className="text-xl font-extrabold md:hidden">MH71</span>
                <MonthSwitcher />
              </div>
              <ThemeToggle />
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 md:px-6 md:pb-10">
            {children}
            <div className="mt-8 text-center text-xs text-muted/60 md:hidden">
              MH71 • phiên bản v{APP_VERSION}
            </div>
          </main>
        </div>
        <BottomNav />
      </div>
    </MonthProvider>
  );
}
