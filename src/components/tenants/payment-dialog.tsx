"use client";

import * as React from "react";
import { Banknote, ArrowLeftRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatVND, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type Method = "paid_cash" | "paid_transfer";

export function PaymentDialog({
  open,
  onOpenChange,
  roomCode,
  tenantName,
  total,
  defaultMethod,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  roomCode: string;
  tenantName?: string | null;
  total: number;
  defaultMethod: Method;
  onConfirm: (method: Method, amountPaid: number | null) => void;
}) {
  const [method, setMethod] = React.useState<Method>(defaultMethod);
  const [partial, setPartial] = React.useState(false);
  const [amount, setAmount] = React.useState(total);
  const [inputVal, setInputVal] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setMethod(defaultMethod);
      setPartial(false);
      setAmount(total);
      setInputVal(formatNumber(total));
    }
  }, [open, defaultMethod, total]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    if (!rawDigits) {
      setInputVal("");
      setAmount(0);
    } else {
      const val = parseInt(rawDigits, 10);
      setInputVal(formatNumber(val));
      setAmount(val);
    }
  };

  const owed = Math.max(total - amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Thu tiền — {roomCode}
            {tenantName ? ` · ${tenantName}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
          <span className="text-muted">Tổng phải thu</span>
          <span className="text-lg font-extrabold">{formatVND(total)}</span>
        </div>

        {/* method */}
        <div className="grid grid-cols-2 gap-2">
          <MethodBtn
            active={method === "paid_cash"}
            onClick={() => setMethod("paid_cash")}
            icon={<Banknote className="h-5 w-5" />}
            label="Tiền mặt"
          />
          <MethodBtn
            active={method === "paid_transfer"}
            onClick={() => setMethod("paid_transfer")}
            icon={<ArrowLeftRight className="h-5 w-5" />}
            label="Chuyển khoản"
          />
        </div>

        {/* trả thiếu */}
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={partial}
            onChange={(e) => {
              setPartial(e.target.checked);
              if (e.target.checked) {
                setAmount(total);
                setInputVal(formatNumber(total));
              }
            }}
            className="h-5 w-5 rounded-md accent-[var(--color-primary)]"
          />
          <span className="text-base font-medium">Trả thiếu (thu chưa đủ)</span>
        </label>

        {partial && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Số tiền đã thu</span>
            <Input
              type="text"
              inputMode="numeric"
              value={inputVal}
              onChange={handleInputChange}
              autoFocus
            />
            <span className="text-sm text-warning">Còn nợ: {formatVND(owed)}</span>
          </div>
        )}

        <Button
          size="lg"
          className="mt-1"
          onClick={() => onConfirm(method, partial ? amount : null)}
        >
          Xác nhận
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function MethodBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted hover:bg-surface-2",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
