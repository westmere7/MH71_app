"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HouseMark } from "@/components/brand/house-mark";
import { NAV_ITEMS } from "./nav-items";
import { SignOutButton } from "./sign-out-button";
import { APP_VERSION } from "@/lib/constants";
import { useAccount } from "@/lib/account";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const account = useAccount();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface p-4 md:flex">
      <Link href="/" className="mb-4 flex items-center gap-2 px-2">
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand text-brand-foreground">
          <HouseMark className="h-9 w-9" />
        </span>
        <div className="leading-tight">
          <div className="text-xl font-extrabold">MH71</div>
          <div className="text-xs text-muted">Quản lý nhà trọ</div>
        </div>
      </Link>

      <div className="mb-4 border-t border-border" />

      <nav className="flex flex-col gap-1.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-surface-2",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 pt-4">
        {account && (
          <Link
            href="/account"
            title={account.email}
            className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-surface-2"
          >
            <Avatar name={account.name} photoUrl={account.avatarUrl} size={32} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{account.name}</span>
            <span className="shrink-0 text-xs text-muted/70">v{APP_VERSION}</span>
          </Link>
        )}
        <SignOutButton />
      </div>
    </aside>
  );
}

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
