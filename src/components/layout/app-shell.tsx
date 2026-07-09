"use client";

import * as React from "react";
import Link from "next/link";
import { MonthProvider } from "@/components/month-provider";
import { APP_VERSION } from "@/lib/constants";
import { useAccount } from "@/lib/account";
import { Avatar } from "@/components/ui/avatar";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { MonthSwitcher } from "./month-switcher";
import { ThemeToggle } from "./theme-toggle";
import { UiScaleApplier } from "./ui-scale-applier";
import { UpdateWatcher } from "./update-watcher";

export function AppShell({ children }: { children: React.ReactNode }) {
  const account = useAccount();
  return (
    <MonthProvider>
      <UiScaleApplier />
      <UpdateWatcher />
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
              <div className="flex items-center gap-3">
                <span className="text-xl font-extrabold md:hidden">MH71</span>
                <MonthSwitcher />
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                {/* mobile-only account shortcut (desktop uses the sidebar) */}
                {account && (
                  <Link href="/account" aria-label="Tài khoản" className="md:hidden">
                    <Avatar name={account.name} photoUrl={account.avatarUrl} size={30} />
                  </Link>
                )}
              </div>
            </div>
          </header>
          <main className="w-full flex-1 px-4 pb-28 pt-5 md:px-6 md:pb-10">
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
