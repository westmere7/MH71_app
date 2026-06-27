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
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatNumber, formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";

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
function LoginGate({ onSuccess }: { onSuccess: () => void }) {
  const [pw, setPw] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(false);
    const res = await fetch("/api/meter/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    setLoading(false);
    if (res.ok) onSuccess();
    else setErr(true);
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
function MeterForm({ data, reload }: { data: MeterData; reload: () => void }) {
  const [submitting, setSubmitting] = React.useState(false);
  // rooms whose entered reading is invalid (smaller than số cũ) — block submit
  const [blocked, setBlocked] = React.useState<Record<string, boolean>>({});
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(
    data.month?.meter_note_photo_url ?? null,
  );

  const setRoomBlocked = React.useCallback((id: string, isBlocked: boolean) => {
    setBlocked((prev) => {
      if (!!prev[id] === isBlocked) return prev;
      return { ...prev, [id]: isBlocked };
    });
  }, []);

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
  const done = month.meter_status === "xong";

  const hasBlocked = Object.values(blocked).some(Boolean);
  const hasPhoto = !!photoUrl;
  const canSubmit = !submitting && hasPhoto && !hasBlocked;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    const res = await fetch("/api/meter/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ monthId: month.id }),
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success("Đã hoàn tất ghi điện. Cảm ơn!");
      reload();
    } else {
      toast.error("Không gửi được, thử lại.");
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
            Nhập số mới trên đồng hồ. Hệ thống tự tính số điện đã dùng.
          </p>
        </div>
      </header>

      {done && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-success-surface px-4 py-3 font-semibold text-success">
          <CheckCircle2 className="h-5 w-5" /> Tháng này đã ghi xong. Bạn vẫn có thể sửa lại.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {data.rows.map((row) => (
          <MeterRow key={row.id} row={row} onBlockingChange={setRoomBlocked} />
        ))}
      </div>

      <NoteUpload monthId={month.id} url={photoUrl} onChange={setPhotoUrl} />

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {!canSubmit && !submitting && (
            <p className="flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-danger">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              {hasBlocked
                ? "Có phòng nhập số mới nhỏ hơn số cũ — sửa lại trước khi hoàn tất."
                : "Cần tải ảnh giấy ghi số điện trước khi hoàn tất."}
            </p>
          )}
          <Button onClick={submit} disabled={!canSubmit} size="lg" className="w-full">
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            Hoàn tất ghi điện
          </Button>
        </div>
      </div>
    </div>
  );
}

function MeterRow({
  row,
  onBlockingChange,
}: {
  row: Row;
  onBlockingChange: (id: string, blocked: boolean) => void;
}) {
  const [value, setValue] = React.useState<string>(
    row.reading_new != null ? String(row.reading_new) : "",
  );
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");

  const num = value === "" ? null : Number(value);
  const valid = num != null && !Number.isNaN(num);
  const delta = valid ? num! - row.reading_old : null;
  const cost = delta != null && delta > 0 ? delta * row.electricity_rate : 0;

  // a "blocking" row is a typed-in reading that is invalid (NaN or below số cũ).
  // these can't be saved and prevent the whole month from being submitted.
  const blocking = value !== "" && (!valid || num! < row.reading_old);

  let warn: { tone: "danger" | "warning" | "info"; msg: string } | null = null;
  if (valid && num! < row.reading_old) {
    warn = { tone: "danger", msg: "Số mới NHỎ HƠN số cũ — kiểm tra lại!" };
  } else if (delta != null && delta > 1000) {
    warn = { tone: "warning", msg: `Tăng bất thường: ${formatNumber(delta)} số` };
  } else if (delta === 0 && valid) {
    warn = { tone: "info", msg: "Không thay đổi so với tháng trước" };
  }

  React.useEffect(() => {
    onBlockingChange(row.id, blocking);
  }, [blocking, row.id, onBlockingChange]);

  async function save() {
    // never persist an invalid reading; leave it flagged for the manager to fix
    if (blocking) {
      setStatus("error");
      return;
    }
    setStatus("saving");
    const res = await fetch("/api/meter/reading", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ billId: row.id, reading_new: value === "" ? null : num }),
    });
    setStatus(res.ok ? "saved" : "error");
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-2">
          <span className="text-lg font-extrabold">{row.code}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-muted">{row.tenant_name ?? "Phòng trống"}</div>
          <div className="text-sm">
            Số cũ: <span className="font-bold">{formatNumber(row.reading_old)}</span>
          </div>
        </div>
        <div className="w-32 shrink-0">
          <Input
            inputMode="numeric"
            type="number"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setStatus("idle");
            }}
            onBlur={save}
            placeholder="Số mới"
            className={cn(
              "text-center text-lg font-bold",
              warn?.tone === "danger" && "border-danger",
            )}
          />
        </div>
        <div className="w-6 shrink-0">
          {status === "saving" ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          ) : blocking || status === "error" ? (
            <AlertTriangle className="h-5 w-5 text-danger" />
          ) : status === "saved" ? (
            <Check className="h-5 w-5 text-success" />
          ) : null}
        </div>
      </div>

      {(delta != null && delta > 0) || warn ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          {delta != null && delta > 0 ? (
            <span className="text-muted">
              Đã dùng <span className="font-bold text-foreground">{formatNumber(delta)}</span> số ={" "}
              <span className="font-bold text-primary">{formatVND(cost)}</span>
            </span>
          ) : (
            <span />
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
      ) : null}
    </Card>
  );
}

function NoteUpload({
  monthId,
  url,
  onChange,
}: {
  monthId: string;
  url: string | null;
  onChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("monthId", monthId);
    const res = await fetch("/api/meter/note", { method: "POST", body: form });
    setUploading(false);
    e.target.value = "";
    if (res.ok) {
      const json = await res.json();
      onChange(json.url);
      toast.success("Đã tải ảnh ghi chú");
    } else {
      toast.error("Tải ảnh thất bại.");
    }
  }

  async function remove() {
    setRemoving(true);
    const res = await fetch("/api/meter/note", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ monthId, remove: true }),
    });
    setRemoving(false);
    if (res.ok) {
      onChange(null);
      toast.success("Đã xoá ảnh");
    } else {
      toast.error("Xoá ảnh thất bại.");
    }
  }

  return (
    <Card className={cn("mt-4 p-4", !url && "border-danger/40 bg-danger-surface/40")}>
      <div className="flex items-center gap-3">
        <Camera className={cn("h-5 w-5", url ? "text-primary" : "text-danger")} />
        <div className="flex-1">
          <div className="font-semibold">
            Ảnh giấy ghi số điện <span className="text-danger">*</span>
          </div>
          <div className="text-sm text-muted">
            {url
              ? "Chụp lại tờ giấy bạn đã ghi tay."
              : "Bắt buộc — chụp tờ giấy bạn đã ghi tay trước khi hoàn tất."}
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-border px-4 py-2.5 font-semibold hover:bg-surface-2">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
          {url ? "Chụp lại" : "Tải ảnh"}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
        </label>
      </div>
      {url && (
        <div className="mt-3 flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Ghi chú số điện" className="max-h-64 rounded-xl object-contain" />
          <button
            type="button"
            onClick={remove}
            disabled={removing}
            className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-danger disabled:opacity-50"
          >
            {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
