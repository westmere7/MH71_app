"use client";

import * as React from "react";
import {
  Zap,
  Loader2,
  Check,
  AlertTriangle,
  TriangleAlert,
  Camera,
  CheckCircle2,
  Lock,
  Trash2,
  Pencil,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatNumber, formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Row {
  id: string;
  code: string;
  reading_old: number;
  reading_new: number | null;
  electricity_rate: number;
  tenant_name: string | null;
}
interface MeterData {
  month: {
    id: string;
    year: number;
    month: number;
    meter_status: string;
    meter_note_photo_url: string | null;
  } | null;
  rows: Row[];
}

type Phase = "checking" | "login" | "ready";

export default function MeterPage() {
  const [phase, setPhase] = React.useState<Phase>("checking");
  const [data, setData] = React.useState<MeterData | null>(null);

  const load = React.useCallback(async () => {
    const res = await fetch("/api/meter/data", { cache: "no-store" });
    if (res.status === 401) {
      setPhase("login");
      return;
    }
    if (!res.ok) {
      toast.error("Không tải được dữ liệu.");
      setPhase("login");
      return;
    }
    setData(await res.json());
    setPhase("ready");
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  if (phase === "checking") {
    return (
      <Center>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Center>
    );
  }
  if (phase === "login") return <LoginGate onSuccess={load} />;
  return <MeterForm data={data!} reload={load} />;
}

/* ------------------------------ gate ------------------------------- */
function LoginGate({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [pw, setPw] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(false);
    try {
      const res = await fetch("/api/meter/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        await onSuccess();
      } else {
        setErr(true);
        setLoading(false);
      }
    } catch {
      setErr(true);
      setLoading(false);
    }
  }

  return (
    <Center>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-brand-foreground">
            <Zap className="h-8 w-8" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold">Ghi số điện</h1>
            <p className="mt-1 text-muted">Nhập mật khẩu để tiếp tục</p>
          </div>
        </div>
        <Card className="p-5">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <Input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
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
            <Button type="submit" size="lg" disabled={loading || !pw}>
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              Vào trang
            </Button>
          </form>
        </Card>
      </div>
    </Center>
  );
}

/* ------------------------------ form ------------------------------- */
type RowState = "empty" | "invalid" | "ok";

function classify(value: string, readingOld: number): RowState {
  if (value === "") return "empty";
  const n = Number(value);
  if (Number.isNaN(n) || n < readingOld) return "invalid";
  return "ok";
}

function MeterForm({ data, reload }: { data: MeterData; reload: () => void }) {
  const rows = data.rows;
  const [submitting, setSubmitting] = React.useState(false);
  const [showDoneModal, setShowDoneModal] = React.useState(false);

  // All edits are staged locally and only written on "submit" — nothing is sent
  // to the server until the button is pressed, so leaving the page discards them.
  const [readings, setReadings] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.reading_new != null ? String(r.reading_new) : ""])),
  );

  // staged note photo (not uploaded until submit)
  const existingUrl = data.month?.meter_note_photo_url ?? null;
  const [stagedFile, setStagedFile] = React.useState<File | null>(null);
  const [stagedPreview, setStagedPreview] = React.useState<string | null>(null);
  const [removeExisting, setRemoveExisting] = React.useState(false);

  // revoke object URLs we created when they change / on unmount
  React.useEffect(() => {
    return () => {
      if (stagedPreview) URL.revokeObjectURL(stagedPreview);
    };
  }, [stagedPreview]);

  const setReading = React.useCallback((id: string, v: string) => {
    setReadings((p) => ({ ...p, [id]: v }));
  }, []);

  function pickPhoto(file: File) {
    if (stagedPreview) URL.revokeObjectURL(stagedPreview);
    setStagedFile(file);
    setStagedPreview(URL.createObjectURL(file));
    setRemoveExisting(false);
  }
  function clearPhoto() {
    if (stagedPreview) URL.revokeObjectURL(stagedPreview);
    setStagedFile(null);
    setStagedPreview(null);
    setRemoveExisting(true);
  }

  if (!data.month) {
    return (
      <Center>
        <Card className="max-w-sm p-8 text-center text-muted">
          Chưa có tháng nào để ghi điện. Chủ trọ cần tạo tháng mới trước.
        </Card>
      </Center>
    );
  }
  const month = data.month;
  // "xong" = the manager already finished this month → editing now revises figures
  const revising = month.meter_status === "xong";

  const previewUrl = stagedPreview ?? (removeExisting ? null : existingUrl);
  const hasPhoto = !!stagedFile || (!!existingUrl && !removeExisting);

  const rowStateList = rows.map((r) => classify(readings[r.id] ?? "", r.reading_old));
  const anyInvalid = rowStateList.some((s) => s === "invalid");
  const anyEmpty = rowStateList.some((s) => s === "empty");
  const canSubmit = !submitting && hasPhoto && !anyInvalid && !anyEmpty;

  const blockMsg = anyInvalid
    ? "Có phòng nhập số mới nhỏ hơn số cũ — sửa lại trước khi hoàn tất."
    : anyEmpty
      ? "Còn phòng chưa nhập số điện mới — phải nhập đủ tất cả các phòng."
      : !hasPhoto
        ? "Cần chụp ảnh giấy ghi số điện trước khi hoàn tất."
        : null;

  async function submit() {
    if (!canSubmit) return;
    // updating a finished month overwrites figures the owner may already have seen
    if (revising && !confirm(`Cập nhật lại số điện Tháng ${month.month}/${month.year}? Số liệu hiện tại sẽ bị ghi đè.`)) {
      return;
    }
    setSubmitting(true);
    try {
      // 1) upload the staged photo now (if any), else keep/remove the existing one
      let notePhotoUrl = removeExisting ? null : existingUrl;
      if (stagedFile) {
        // Dynamic import to keep page load fast
        const imageCompression = (await import("browser-image-compression")).default;
        const options = {
          maxSizeMB: 0.2, // Aggressive limit: 200KB
          maxWidthOrHeight: 1280,
          useWebWorker: true,
          fileType: "image/webp",
          initialQuality: 0.7, // Aggressive compression: 70% quality
        };
        const compressedBlob = await imageCompression(stagedFile, options);
        const compressedFile = new File([compressedBlob], "note.webp", { type: "image/webp" });

        const form = new FormData();
        form.append("file", compressedFile);
        form.append("monthId", month.id);
        const up = await fetch("/api/meter/note", { method: "POST", body: form });
        if (!up.ok) throw new Error("upload");
        notePhotoUrl = ((await up.json()) as { url: string }).url;
      }
      // 2) write all readings + finalize the month in one request
      const res = await fetch("/api/meter/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          monthId: month.id,
          notePhotoUrl,
          readings: rows.map((r) => ({ billId: r.id, reading_new: Number(readings[r.id]) })),
        }),
      });
      if (!res.ok) throw new Error("submit");
      setShowDoneModal(true);
      reload();
    } catch {
      toast.error("Không gửi được, thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-40 pt-6">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-brand-foreground">
          <Zap className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold leading-tight">
            Ghi số điện — Tháng {month.month}/{month.year}
          </h1>
          <p className="text-muted">
            Nhập số mới trên đồng hồ. Số liệu chỉ được lưu khi bấm nút bên dưới.
          </p>
        </div>
      </header>

      {revising && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning-surface px-4 py-3 font-semibold text-warning">
          <Pencil className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            Tháng này ĐÃ ghi xong. Sửa số bên dưới sẽ{" "}
            <span className="underline">cập nhật số điện hiện tại</span>, không tạo đợt ghi mới.
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <MeterRow
            key={row.id}
            row={row}
            revising={revising}
            value={readings[row.id] ?? ""}
            onValueChange={setReading}
          />
        ))}
      </div>

      <NoteUpload previewUrl={previewUrl} onPick={pickPhoto} onClear={clearPhoto} />

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {blockMsg && !submitting && (
            <p className="flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-danger">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              {blockMsg}
            </p>
          )}
          <Button
            onClick={submit}
            disabled={!canSubmit}
            size="lg"
            className="w-full"
            variant={revising ? "outline" : "primary"}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : revising ? (
              <Pencil className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            {revising ? "Cập nhật số điện" : "Hoàn tất ghi điện"}
          </Button>
        </div>
      </div>

      <Dialog open={showDoneModal} onOpenChange={setShowDoneModal}>
        <DialogContent className="max-w-sm text-center p-6 flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success border border-success/15">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          
          <div className="space-y-1">
            <DialogTitle className="text-xl font-bold">Gửi số điện thành công!</DialogTitle>
            <DialogDescription className="text-sm text-muted">
              {revising
                ? "Số điện mới của các phòng đã được cập nhật thành công lên hệ thống."
                : `Đã hoàn tất ghi điện Tháng ${month.month}/${month.year} và gửi cho chủ trọ thành công.`}
            </DialogDescription>
          </div>

          <Button onClick={() => setShowDoneModal(false)} className="w-full mt-2" size="lg">
            Đóng
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MeterRow({
  row,
  revising,
  value,
  onValueChange,
}: {
  row: Row;
  revising: boolean;
  value: string;
  onValueChange: (id: string, v: string) => void;
}) {
  const num = value === "" ? null : Number(value);
  const valid = num != null && !Number.isNaN(num);
  const delta = valid ? num! - row.reading_old : null;
  const cost = delta != null && delta > 0 ? delta * row.electricity_rate : 0;

  const rowState = classify(value, row.reading_old);
  const blocking = rowState === "invalid";

  let warn: { tone: "danger" | "warning" | "info"; msg: string } | null = null;
  if (valid && num! < row.reading_old) {
    warn = { tone: "danger", msg: "Số mới NHỎ HƠN số cũ — kiểm tra lại!" };
  } else if (delta != null && delta > 1000) {
    warn = { tone: "warning", msg: `Tăng bất thường: ${formatNumber(delta)} số` };
  } else if (delta === 0 && valid) {
    warn = { tone: "info", msg: "Không thay đổi so với tháng trước" };
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const target = e.target;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
  };

  return (
    <Card className={cn("p-4", rowState === "empty" && "border-danger/30")}>
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <span className="text-lg font-extrabold tracking-tight">{row.code}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-muted">{row.tenant_name ?? "Phòng trống"}</div>
          <div className="text-sm">
            Tháng trước: <span className="font-bold">{formatNumber(row.reading_old)}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Input
            inputMode="numeric"
            type="number"
            value={value}
            onChange={(e) => onValueChange(row.id, e.target.value)}
            onFocus={handleFocus}
            placeholder="Số mới"
            className={cn(
              "w-28 text-center text-lg font-bold",
              warn?.tone === "danger" && "border-danger",
              warn?.tone !== "danger" && revising && "border-warning bg-warning-surface/30",
            )}
          />
          <span className="flex w-5 justify-center">
            {blocking ? (
              <AlertTriangle className="h-5 w-5 text-danger" />
            ) : rowState === "ok" ? (
              <Check className="h-5 w-5 text-success" />
            ) : (
              <Circle className="h-5 w-5 text-muted/40" />
            )}
          </span>
        </div>
      </div>

      {((delta != null && delta > 0) || warn) && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-3 text-sm">
          {delta != null && delta > 0 && (
            <span className="text-muted">
              Đã dùng <span className="font-bold text-foreground">{formatNumber(delta)}</span> số ={" "}
              <span className="font-bold text-primary">{formatVND(cost)}</span>
            </span>
          )}
          {warn && (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-semibold",
                warn.tone === "danger" && "text-danger",
                warn.tone === "warning" && "text-warning",
                warn.tone === "info" && "text-muted",
              )}
            >
              <TriangleAlert className="h-4 w-4" />
              {warn.msg}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

function NoteUpload({
  previewUrl,
  onPick,
  onClear,
}: {
  previewUrl: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onPick(file);
  }

  return (
    <Card className={cn("mt-4 p-4", !previewUrl && "border-danger/40 bg-danger-surface/40")}>
      <div className="flex items-center gap-3">
        <Camera className={cn("h-5 w-5", previewUrl ? "text-primary" : "text-danger")} />
        <div className="flex-1">
          <div className="font-semibold">
            Ảnh giấy ghi số điện <span className="text-danger">*</span>
          </div>
          <div className="text-sm text-muted">
            {previewUrl
              ? "Ảnh sẽ được gửi khi bấm nút bên dưới."
              : "Bắt buộc — chụp tờ giấy bạn đã ghi tay trước khi hoàn tất."}
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-border px-4 py-2.5 font-semibold hover:bg-surface-2">
          <Camera className="h-5 w-5" />
          {previewUrl ? "Chụp lại" : "Tải ảnh"}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
        </label>
      </div>
      {previewUrl && (
        <div className="mt-3 flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Ghi chú số điện" className="max-h-64 rounded-xl object-contain" />
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-danger"
          >
            <Trash2 className="h-4 w-4" />
            Xoá ảnh
          </button>
        </div>
      )}
    </Card>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-5">{children}</main>
  );
}
