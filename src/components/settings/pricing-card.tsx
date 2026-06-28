"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Coins, Loader2, Save, Undo2, Lock } from "lucide-react";
import { useRooms, useSettings, qk } from "@/lib/queries";
import { useMonthCtx } from "@/components/month-provider";
import { saveMonthPricing, type PricingRoom } from "@/lib/mutations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { monthLabel } from "@/lib/format";
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

export function PricingCard() {
  const qc = useQueryClient();
  const roomsQ = useRooms();
  const settingsQ = useSettings();
  const { selectedMonth, selectedLocked } = useMonthCtx();
  const rooms = React.useMemo(() => roomsQ.data ?? [], [roomsQ.data]);
  const settings = settingsQ.data;

  const [draft, setDraft] = React.useState<Draft | null>(null);
  React.useEffect(() => {
    if (rooms.length && settings) setDraft(seed(rooms, settings));
  }, [rooms, settings]);

  const save = useMutation({
    mutationFn: async () => {
      if (!draft || !selectedMonth) return;
      const payload: PricingRoom[] = rooms.map((r) => ({
        id: r.id,
        default_rent: draft.base[r.id],
        default_trash: draft.uniformTrash ? null : draft.trashPer[r.id],
        default_rate: draft.uniformRate ? null : draft.ratePer[r.id],
      }));
      await saveMonthPricing(selectedMonth.id, payload, draft.trashAll, draft.rateAll);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.rooms });
      qc.invalidateQueries({ queryKey: qk.settings });
      qc.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Đã lưu thiết lập giá");
    },
    onError: () =>
      toast.error("Lưu thất bại. Hãy chắc chắn đã chạy 0004_pricing.sql trên Supabase."),
  });

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d!, ...patch }));

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Coins className="h-5 w-5 text-primary" />
        <CardTitle>Thiết lập giá</CardTitle>
        {selectedMonth && (
          <span className="ml-auto text-sm font-semibold text-muted">
            {monthLabel(selectedMonth.year, selectedMonth.month)}
          </span>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {selectedLocked && (
          <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning-surface px-4 py-3 text-sm font-semibold text-warning">
            <Lock className="h-5 w-5 shrink-0" />
            Tháng này đã qua nên đã khoá — không thể sửa giá.
          </div>
        )}

        {!draft ? (
          <p className="text-sm text-muted">Đang tải…</p>
        ) : (
          <div className={cn("flex flex-col gap-4", selectedLocked && "pointer-events-none opacity-60")}>
            {/* shared toggles */}
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>

            {/* per-room table */}
            <div className="overflow-x-auto rounded-xl border border-border">
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

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => settings && setDraft(seed(rooms, settings))}
                disabled={save.isPending || selectedLocked}
              >
                <Undo2 className="h-4 w-4" />
                Hoàn tác
              </Button>
              <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || selectedLocked}>
                {save.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Lưu giá
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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
        <CellInput value={value} onChange={onValue} full />
      ) : (
        <p className="text-sm text-muted">Nhập riêng cho từng phòng ở bảng bên dưới.</p>
      )}
    </div>
  );
}

function CellInput({
  value,
  onChange,
  full,
}: {
  value: number;
  onChange: (v: number) => void;
  full?: boolean;
}) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn("h-10", full ? "w-full" : "w-32")}
    />
  );
}
