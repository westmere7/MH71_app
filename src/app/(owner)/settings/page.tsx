"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Save, Building2, CalendarPlus, Coins, ChevronRight } from "lucide-react";
import { useMonthCtx } from "@/components/month-provider";
import { qk } from "@/lib/queries";
import { updateSettings, updateMonthMeta, createNextMonth } from "@/lib/mutations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { PROGRESS_STATUS, PHASE_LABELS } from "@/lib/constants";
import { monthLabel } from "@/lib/format";
import type { ProgressStatus, MonthRow } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { settings, selectedMonth, setSelectedMonthId } = useMonthCtx();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold tracking-tight">Cài đặt</h1>

      <GeneralSettings key={settings?.updated_at} qc={qc} settings={settings} />

      {/* fees live in Thiết lập giá now */}
      <Link href="/gia">
        <Card className="transition-colors hover:bg-surface-2">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Coins className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <div className="font-bold">Thiết lập giá</div>
              <div className="text-sm text-muted">Tiền phòng, tiền rác, đơn giá điện theo từng phòng</div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted" />
          </CardContent>
        </Card>
      </Link>

      {selectedMonth && <MonthSettings key={selectedMonth.id} qc={qc} month={selectedMonth} />}

      <NewMonthCard
        onCreated={(m) => {
          qc.invalidateQueries({ queryKey: qk.months });
          qc.invalidateQueries({ queryKey: ["bills"] });
          setSelectedMonthId(m.id);
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Tài khoản</CardTitle>
        </CardHeader>
        <CardContent>
          <SignOutButton className="border-2 border-border" />
        </CardContent>
      </Card>
    </div>
  );
}

/* ----------------------------- general ----------------------------- */
function GeneralSettings({
  qc,
  settings,
}: {
  qc: ReturnType<typeof useQueryClient>;
  settings: ReturnType<typeof useMonthCtx>["settings"];
}) {
  const [name, setName] = React.useState(settings?.building_name ?? "MH71");
  const [target, setTarget] = React.useState(settings?.collection_target_pct ?? 88);

  const save = useMutation({
    mutationFn: () =>
      updateSettings({ building_name: name, collection_target_pct: target }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.settings });
      toast.success("Đã lưu cài đặt chung");
    },
    onError: () => toast.error("Lưu thất bại."),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        <CardTitle>Cài đặt chung</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên nhà trọ">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Mục tiêu thu (%)">
          <Input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} />
        </Field>
        <div className="sm:col-span-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Lưu cài đặt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* --------------------------- current month -------------------------- */
function MonthSettings({
  qc,
  month,
}: {
  qc: ReturnType<typeof useQueryClient>;
  month: MonthRow;
}) {
  const [otherFees, setOtherFees] = React.useState(month.other_fees);

  const setStatus = useMutation({
    mutationFn: (patch: Partial<MonthRow>) => updateMonthMeta(month.id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.months });
      toast.success("Đã cập nhật tháng");
    },
    onError: () => toast.error("Cập nhật thất bại."),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tháng hiện tại — {monthLabel(month.year, month.month)}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>{PHASE_LABELS.meter_status}</Label>
          <SegStatus
            value={month.meter_status}
            onChange={(v) => setStatus.mutate({ meter_status: v })}
          />
        </div>
        <p className="text-sm text-muted">
          “Thu tiền” tự động cập nhật theo số phòng đã thanh toán — không cần chỉnh tay.
        </p>
        <Field label="Tổng chi tháng (đ) — EVN, rác, internet… (Lợi nhuận = Tổng thu − Tổng chi)">
          <div className="flex gap-2">
            <Input
              type="number"
              value={otherFees}
              onChange={(e) => setOtherFees(Number(e.target.value))}
            />
            <Button variant="outline" onClick={() => setStatus.mutate({ other_fees: otherFees })}>
              Lưu
            </Button>
          </div>
        </Field>
      </CardContent>
    </Card>
  );
}

function SegStatus({
  value,
  onChange,
}: {
  value: ProgressStatus;
  onChange: (v: ProgressStatus) => void;
}) {
  return (
    <div className="flex gap-2">
      {(["chua", "dang", "xong"] as ProgressStatus[]).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={cn(
            "flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
            value === s ? PROGRESS_STATUS[s].chip + " ring-2 ring-current" : "bg-surface-2 text-muted",
          )}
        >
          {PROGRESS_STATUS[s].label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------- new month ----------------------------- */
function NewMonthCard({ onCreated }: { onCreated: (m: MonthRow) => void }) {
  const create = useMutation({
    mutationFn: createNextMonth,
    onSuccess: (m) => {
      onCreated(m);
      toast.success(`Đã tạo ${monthLabel(m.year, m.month)}`);
    },
    onError: () => toast.error("Không tạo được tháng mới."),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <CalendarPlus className="h-5 w-5 text-primary" />
        <CardTitle>Tạo tháng mới</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Tạo kỳ tiếp theo: tự động chuyển số điện cuối kỳ thành số đầu kỳ mới, áp dụng bảng
          giá hiện tại và giữ nguyên khách thuê. Quản lý sẽ nhập số điện mới ở trang ghi điện.
        </p>
        <Button
          onClick={() => {
            if (confirm("Tạo tháng mới và sinh hoá đơn cho tất cả các phòng?")) create.mutate();
          }}
          disabled={create.isPending}
        >
          {create.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          Tạo tháng mới
        </Button>
      </CardContent>
    </Card>
  );
}

/* ------------------------------ helpers ----------------------------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
