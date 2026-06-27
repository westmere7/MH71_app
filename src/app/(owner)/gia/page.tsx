"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Coins, Loader2, Save, Undo2, Lock } from "lucide-react";
import { useRooms, useSettings, qk } from "@/lib/queries";
import { savePricing, type PricingRoom } from "@/lib/mutations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Room, Settings } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Draft {
  base: Record<string, number>;
  uniformTrash: boolean;
  trashAll: number;
  trashPer: Record<string, number>;
  uniformRate: boolean;
  rateAll: number;
  ratePer: Record<string, number>;
}

function seed(rooms: Room[], s: Settings): Draft {
  return {
    base: Object.fromEntries(rooms.map((r) => [r.id, r.default_rent])),
    uniformTrash: rooms.every((r) => r.default_trash == null),
    trashAll: s.trash_fee,
    trashPer: Object.fromEntries(rooms.map((r) => [r.id, r.default_trash ?? s.trash_fee])),
    uniformRate: rooms.every((r) => r.default_rate == null),
    rateAll: s.electricity_rate,
    ratePer: Object.fromEntries(rooms.map((r) => [r.id, r.default_rate ?? s.electricity_rate])),
  };
}

export default function PricingPage() {
  const qc = useQueryClient();
  const roomsQ = useRooms();
  const settingsQ = useSettings();
  const rooms = React.useMemo(() => roomsQ.data ?? [], [roomsQ.data]);
  const settings = settingsQ.data;

  const [draft, setDraft] = React.useState<Draft | null>(null);
  React.useEffect(() => {
    if (rooms.length && settings) setDraft(seed(rooms, settings));
  }, [rooms, settings]);

  // secondary password gate (owner already logged in; this guards price edits)
  const [mounted, setMounted] = React.useState(false);
  const [unlocked, setUnlocked] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
    setUnlocked(sessionStorage.getItem("mh71.pricingUnlocked") === "1");
  }, []);

  const save = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      const payload: PricingRoom[] = rooms.map((r) => ({
        id: r.id,
        default_rent: draft.base[r.id],
        default_trash: draft.uniformTrash ? null : draft.trashPer[r.id],
        default_rate: draft.uniformRate ? null : draft.ratePer[r.id],
      }));
      await savePricing(payload, draft.trashAll, draft.rateAll);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.rooms });
      qc.invalidateQueries({ queryKey: qk.settings });
      toast.success("Đã lưu thiết lập giá");
    },
    onError: () =>
      toast.error("Lưu thất bại. Hãy chắc chắn đã chạy 0004_pricing.sql trên Supabase."),
  });

  if (!mounted) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!unlocked) {
    return <PricingGate onUnlock={() => setUnlocked(true)} />;
  }

  if (roomsQ.isLoading || settingsQ.isLoading || !draft) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d!, ...patch }));

  return (
    <div className="flex flex-col gap-5 pb-24">
      <div className="flex items-center gap-2">
        <Coins className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-extrabold tracking-tight">Thiết lập giá</h1>
      </div>

      {/* shared toggles */}
      <Card>
        <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
          <SharedFee
            label="Tiền rác (đ / phòng)"
            uniform={draft.uniformTrash}
            onToggle={(v) => set({ uniformTrash: v })}
            value={draft.trashAll}
            onValue={(v) => set({ trashAll: v })}
          />
          <SharedFee
            label="Đơn giá điện (đ / số)"
            uniform={draft.uniformRate}
            onToggle={(v) => set({ uniformRate: v })}
            value={draft.rateAll}
            onValue={(v) => set({ rateAll: v })}
          />
        </CardContent>
      </Card>

      {/* per-room table */}
      <Card>
        <CardHeader>
          <CardTitle>Bảng giá từng phòng</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-semibold">Phòng</th>
                  <th className="px-4 py-2 font-semibold">Tiền phòng</th>
                  {!draft.uniformTrash && <th className="px-4 py-2 font-semibold">Tiền rác</th>}
                  {!draft.uniformRate && <th className="px-4 py-2 font-semibold">Đơn giá điện</th>}
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2">
                      <span className="inline-flex min-w-10 justify-center rounded-lg bg-surface-2 px-2 py-1 font-bold">
                        {r.code}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <CellInput
                        value={draft.base[r.id]}
                        onChange={(v) => set({ base: { ...draft.base, [r.id]: v } })}
                      />
                    </td>
                    {!draft.uniformTrash && (
                      <td className="px-4 py-2">
                        <CellInput
                          value={draft.trashPer[r.id]}
                          onChange={(v) => set({ trashPer: { ...draft.trashPer, [r.id]: v } })}
                        />
                      </td>
                    )}
                    {!draft.uniformRate && (
                      <td className="px-4 py-2">
                        <CellInput
                          value={draft.ratePer[r.id]}
                          onChange={(v) => set({ ratePer: { ...draft.ratePer, [r.id]: v } })}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 p-3 backdrop-blur md:left-60">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-2 px-1">
          <Button
            variant="outline"
            onClick={() => settings && setDraft(seed(rooms, settings))}
            disabled={save.isPending}
          >
            <Undo2 className="h-5 w-5" />
            Hoàn tác
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </div>
  );
}

function SharedFee({
  label,
  uniform,
  onToggle,
  value,
  onValue,
}: {
  label: string;
  uniform: boolean;
  onToggle: (v: boolean) => void;
  value: number;
  onValue: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <span className={cn("font-medium", uniform ? "text-primary" : "text-muted")}>
            Giống nhau
          </span>
          <input
            type="checkbox"
            checked={uniform}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-5 w-5 rounded-md accent-[var(--color-primary)]"
          />
        </label>
      </div>
      {uniform ? (
        <CellInput value={value} onChange={onValue} />
      ) : (
        <p className="text-sm text-muted">Nhập riêng cho từng phòng ở bảng bên dưới.</p>
      )}
    </div>
  );
}

function PricingGate({ onUnlock }: { onUnlock: () => void }) {
  const PASSWORD = process.env.NEXT_PUBLIC_PRICING_PASSWORD || "77777776";
  const [pw, setPw] = React.useState("");
  const [err, setErr] = React.useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw === PASSWORD) {
      sessionStorage.setItem("mh71.pricingUnlocked", "1");
      onUnlock();
    } else {
      setErr(true);
    }
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-sm">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-brand-foreground">
          <Lock className="h-7 w-7" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold">Thiết lập giá</h1>
          <p className="mt-1 text-muted">Nhập mật khẩu để xem và sửa bảng giá</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-5">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <Input
                type="password"
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  setErr(false);
                }}
                placeholder="Mật khẩu"
                className="pl-10 text-lg"
                autoFocus
              />
            </div>
            {err && (
              <p className="rounded-lg bg-danger-surface px-3 py-2 text-sm font-medium text-danger">
                Mật khẩu không đúng.
              </p>
            )}
            <Button type="submit" size="lg" disabled={!pw}>
              Mở khoá
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function CellInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-10 w-32"
    />
  );
}
