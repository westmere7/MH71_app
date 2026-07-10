"use client";

import type { BackupRow } from "./supabase/types";
import { PAYMENT_STATUS } from "./constants";

function esc(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a CSV from a frozen backup and trigger a download. */
export function downloadBackupCsv(b: BackupRow) {
  const headers = [
    "Phòng", "Người thuê", "SĐT", "Số cũ", "Số mới", "Số điện", "Giá điện",
    "Tiền điện", "Tiền phòng", "Tiền rác", "Tổng", "Trạng thái", "Thời gian TT",
  ];
  const lines = [headers.map(esc).join(",")];
  for (const r of b.data) {
    lines.push(
      [
        r.code,
        r.tenant_name ?? "",
        r.tenant_phone ?? "",
        r.reading_old ?? "",
        r.reading_new ?? "",
        r.units ?? "",
        r.electricity_rate ?? "",
        r.electricity_amount ?? "",
        r.room_fee ?? "",
        r.trash_fee ?? "",
        r.total ?? "",
        PAYMENT_STATUS[r.payment_status]?.label ?? r.payment_status,
        r.paid_at ? new Date(r.paid_at).toLocaleString("vi-VN") : "",
      ]
        .map(esc)
        .join(","),
    );
  }
  lines.push(
    ["Tổng cộng", "", "", "", "", b.units_total, "", "", "", "", b.total_billed, "", ""]
      .map(esc)
      .join(","),
  );

  // BOM so Excel reads UTF-8 (Vietnamese) correctly
  const csv = "﻿" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ts = new Date(b.created_at).toISOString().slice(0, 16).replace(/[:T]/g, "-");
  a.href = url;
  a.download = `MH71_T${b.month}-${b.year}_${ts}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
