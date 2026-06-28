"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Coins, Loader2, Save, Undo2, Lock, ListChecks, ChevronDown } from "lucide-react";
import { useRooms, useSettings, qk } from "@/lib/queries";
import { useMonthCtx } from "@/components/month-provider";
import { saveMonthPricing, updateMonthMeta, type PricingRoom } from "@/lib/mutations";
import { DEFAULT_TOTAL_COST } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { monthLabel, formatVND } from "@/lib/format";
import type { MonthRow, Room, Settings } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Draft {
  totalCost: number; // Chi phí tổng cộng (months.other_fees)
  base: Record<string, number>;
  uniformTrash: boolean;
  trashAll: number;
  trashPer: Record<string, number>;
  uniformRate: boolean;
  rateAll: number;
  ratePer: Record<string, number>;
}

function seed(rooms: Room[], s: Settings, month: MonthRow): Draft {
  return {
    totalCost: month.other_fees ?? 0,
    base: Object.fromEntries(rooms.map((r) => [r.id, r.default_rent])),
    uniformTrash: rooms.every((r) => r.default_trash == null),
    trashAll: s.trash_fee,
    trashPer: Object.fromEntries(rooms.map((r) => [r.id, r.default_trash ?? s.trash_fee])),
    uniformRate: rooms.every((r) => r.default_rate == null),
    rateAll: s.electricity_rate,
    ratePer: Object.fromEntries(rooms.map((r) => [r.id, r.default_rate ?? s.electricity_rate])),
  };
}

interface Change {
  label: string;
  from: number;
  to: number;
}

function diff(a: Draft, b: Draft, rooms: Room[]): Change[] {
  const out: Change[] = [];
  if (a.totalCost !== b.totalCost)
    out.push({ label: "Chi phí tổng cộng", from: a.totalCost, to: b.totalCost });
  if (b.uniformTrash && a.trashAll !== b.trashAll)
    out.push({ label: "Tiền rác (chung)", from: a.trashAll, to: b.trashAll });
  if (b.uniformRate && a.rateAll !== b.rateAll)
    out.push({ label: "Đơn giá điện (chung)", from: a.rateAll, to: b.rateAll });
  for (const r of rooms) {
    if (a.base[r.id] !== b.base[r.id])
      out.push({ label: `Tiền phòng ${r.code}`, from: a.base[r.id], to: b.base[r.id] });
    if (!b.uniformTrash && a.trashPer[r.id] !== b.trashPer[r.id])
      out.push({ label: `Tiền rác ${r.code}`, from: a.trashPer[r.id], to: b.trashPer[r.id] });
    if (!b.uniformRate && a.ratePer[r.id] !== b.ratePer[r.id])
      out.push({ label: `Đơn giá điện ${r.code}`, from: a.ratePer[r.id], to: b.ratePer[r.id] });
  }
  return out;
}

export function PricingCard() {
  const qc = useQueryClient();
  const roomsQ = useRooms();
  const settingsQ = useSettings();
  const { selectedMonth, selectedLocked } = useMonthCtx();
  const rooms = React.useMemo(() => roomsQ.data ?? [], [roomsQ.data]);
  const settings = settingsQ.data;

  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [original, setOriginal] = React.useState<Draft | null>(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [tableOpen, setTableOpen] = React.useState(false); // per-room table collapsed by default

  React.useEffect(() => {
    if (rooms.length && settings && selectedMonth) {
      const s = seed(rooms, settings, selectedMonth);
      setOriginal(s);
      // pre-fill the default cost when this month has none set yet (shows as a
      // pending change vs the saved 0, so it's saved on confirm)
      setDraft(s.totalCost === 0 ? { ...s, totalCost: DEFAULT_TOTAL_COST } : s);
    }
  }, [rooms, settings, selectedMonth]);

  const changes = draft && original ? diff(original, draft, rooms) : [];

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
      await updateMonthMeta(selectedMonth.id, { other_fees: draft.totalCost });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.rooms });
      qc.invalidateQueries({ queryKey: qk.settings });
      qc.invalidateQueries({ queryKey: qk.months });
      qc.invalidateQueries({ queryKey: ["bills"] });
      setReviewOpen(false);
      toast.success("Đã lưu thiết lập giá");
    },
    onError: () => toast.error("Lưu thất bại."),
  });

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d!, ...patch }));
  const reset = () => settings && selectedMonth && setDraft(seed(rooms, settings, selectedMonth));

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
      <CardContent className="flex flex-col gap-5">
        {selectedLocked && (
          <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning-surface px-4 py-3 text-sm font-semibold text-warning">
            <Lock className="h-5 w-5 shrink-0" />
            Tháng này đã qua nên đã khoá — không thể sửa giá.
          </div>
        )}

        {!draft ? (
          <p className="text-sm text-muted">Đang tải…</p>
        ) : (
          <div className={cn("flex flex-col gap-5", selectedLocked && "pointer-events-none opacity-60")}>
            {/* 1. fixed monthly cost */}
            <Section title="Chi phí tổng cộng" hint="Chi phí dịch vụ bên ngoài cố định hàng tháng (internet, an ninh, quản lý…). Không liên quan tiền điện. Mặc định 4.800.000đ.">
              <MoneyInput
                value={draft.totalCost}
                onChange={(v) => set({ totalCost: v })}
                placeholder={String(DEFAULT_TOTAL_COST)}
              />
            </Section>

            {/* 2. shared fees */}
            <Section title="Giá chung" hint="Tiền rác và đơn giá điện áp dụng cho mọi phòng (bật “riêng” để nhập từng phòng).">
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
            </Section>

            {/* 3. per-room table (collapsed by default) */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setTableOpen((o) => !o)}
                className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-left"
              >
                <span className="text-sm font-bold">Bảng giá từng phòng</span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                  {tableOpen ? "Thu gọn" : "Mở rộng"}
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", tableOpen && "rotate-180")}
                  />
                </span>
              </button>
              {tableOpen && (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-2 text-left text-muted">
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
                          <MoneyInput
                            value={draft.base[r.id]}
                            onChange={(v) => set({ base: { ...draft.base, [r.id]: v } })}
                            compact
                          />
                        </td>
                        {!draft.uniformTrash && (
                          <td className="px-4 py-2">
                            <MoneyInput
                              value={draft.trashPer[r.id]}
                              onChange={(v) => set({ trashPer: { ...draft.trashPer, [r.id]: v } })}
                              compact
                            />
                          </td>
                        )}
                        {!draft.uniformRate && (
                          <td className="px-4 py-2">
                            <MoneyInput
                              value={draft.ratePer[r.id]}
                              onChange={(v) => set({ ratePer: { ...draft.ratePer, [r.id]: v } })}
                              compact
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted">
                {changes.length > 0 ? `${changes.length} thay đổi chưa lưu` : "Chưa có thay đổi"}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={reset} disabled={save.isPending || !changes.length}>
                  <Undo2 className="h-4 w-4" />
                  Hoàn tác
                </Button>
                <Button
                  size="sm"
                  onClick={() => (changes.length ? setReviewOpen(true) : toast("Chưa có thay đổi"))}
                  disabled={save.isPending || !changes.length}
                >
                  <Save className="h-4 w-4" />
                  Lưu giá
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* review changes before saving — guards against accidental edits */}
      <Dialog open={reviewOpen} onOpenChange={(o) => !o && setReviewOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              Xem lại thay đổi
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted">
            {selectedMonth && monthLabel(selectedMonth.year, selectedMonth.month)} — kiểm tra trước
            khi lưu:
          </p>
          <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
            {changes.map((c, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm"
              >
                <span className="font-medium">{c.label}</span>
                <span className="tabular-nums">
                  <span className="text-muted line-through">{formatVND(c.from)}</span>
                  <span className="font-bold text-foreground"> → {formatVND(c.to)}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={save.isPending}>
              Huỷ
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Xác nhận lưu
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {children}
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
    <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
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
        <MoneyInput value={value} onChange={onValue} />
      ) : (
        <p className="text-sm text-muted">Nhập riêng cho từng phòng ở bảng bên dưới.</p>
      )}
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  compact,
  placeholder,
}: {
  value: number;
  onChange: (v: number) => void;
  compact?: boolean;
  placeholder?: string;
}) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
      placeholder={placeholder}
      className={cn("h-10", compact ? "w-32" : "w-full")}
    />
  );
}
