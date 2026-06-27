"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAYMENT_STATUS, PAYMENT_STATUS_ORDER } from "@/lib/constants";
import type { PaymentStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export function StatusChip({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const meta = PAYMENT_STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        meta.chip,
        className,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
      {meta.short}
    </span>
  );
}

export function StatusMenu({
  status,
  onSelect,
  disabled,
}: {
  status: PaymentStatus;
  onSelect: (s: PaymentStatus) => void;
  disabled?: boolean;
}) {
  const meta = PAYMENT_STATUS[status];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold disabled:opacity-50",
          meta.chip,
        )}
      >
        <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
        {meta.short}
        <ChevronDown className="h-4 w-4 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {PAYMENT_STATUS_ORDER.map((s) => (
          <DropdownMenuItem
            key={s}
            selected={s === status}
            onSelect={() => s !== status && onSelect(s)}
          >
            <span className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", PAYMENT_STATUS[s].dot)} />
              {PAYMENT_STATUS[s].label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
