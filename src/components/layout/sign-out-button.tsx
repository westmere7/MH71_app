"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  async function signOut() {
    await getSupabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={signOut}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-base font-medium text-muted hover:bg-surface-2 hover:text-foreground",
        className,
      )}
    >
      <LogOut className="h-5 w-5" />
      Đăng xuất
    </button>
  );
}
