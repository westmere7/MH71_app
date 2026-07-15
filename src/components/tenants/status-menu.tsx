"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAYMENT_STATUS, STATUS_CHOICES, statusChoiceOf } from "@/lib/constants";
import type { StatusChoice } from "@/lib/constants";
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
  onChoose,
  disabled,
  allowPaidOnly,
  onOpenChange,
}: {
  status: PaymentStatus;
  onChoose: (c: StatusChoice) => void;
  disabled?: boolean;
  allowPaidOnly?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const meta = PAYMENT_STATUS[status];
  const current = statusChoiceOf(status);
  const [open, setOpen] = React.useState(false);
  // open state captured at pointer-down, before any dismiss fires
  const wasOpenOnDown = React.useRef(false);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        disabled={disabled}
        // Radix opens on pointer-down, which a touch-scroll triggers too. Suppress
        // that and open on a real click instead — a scroll fires no click event.
        onPointerDown={(e) => {
          wasOpenOnDown.current = open;
          e.preventDefault();
        }}
        onClick={() => {
          if (!disabled) {
            const nextOpen = !wasOpenOnDown.current;
            setOpen(nextOpen);
            onOpenChange?.(nextOpen);
          }
        }}
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold disabled:opacity-50",
          meta.chip,
        )}
      >
        <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
        {meta.short}
        <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {STATUS_CHOICES.map((c) => {
          const itemDisabled = allowPaidOnly && c.value !== "paid";
          return (
            <DropdownMenuItem
              key={c.value}
              selected={c.value === current}
              disabled={itemDisabled}
              onSelect={() => !itemDisabled && onChoose(c.value)}
            >
              <span className={cn("flex items-center gap-2", itemDisabled && "opacity-50 pointer-events-none")}>
                <span className={cn("h-2.5 w-2.5 rounded-full", c.dot)} />
                {c.label}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
