// Server-only: this reads RESEND_API_KEY and must never be imported by a client
// component. It's used solely from the /api/meter/submit route handler.

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const viNum = new Intl.NumberFormat("vi-VN");

export type MeterEmailKind = "filled" | "updated";

export interface MeterEmailOpts {
  to: string;
  kind: MeterEmailKind; // "filled" = first time, "updated" = manager resubmitted corrections
  monthLabel: string; // e.g. "Tháng 6/2026"
  rooms: { code: string; units: number }[]; // per-room số điện, in display order
  unitsTotal: number; // total số điện recorded across all rooms
  filledAt: string; // ISO timestamp
  notePhotoUrl: string | null; // photo of the handwritten meter note
  appUrl: string; // link to the app home page
}

/**
 * Notify the owner that the manager filled (or updated) số điện for a month.
 * Uses Resend's REST API directly so there's no extra dependency. Throws on
 * failure — the caller is expected to swallow errors (a mail hiccup must never
 * break the meter submission).
 */
export async function sendMeterEmail(opts: MeterEmailOpts): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  // onboarding@resend.dev works out of the box but only delivers to your own
  // Resend account email. Set RESEND_FROM to a verified-domain address to send
  // to anyone (e.g. "MH71 <thongbao@mail.davieunitedsoccer.com>").
  const from = process.env.RESEND_FROM || "MH71 <onboarding@resend.dev>";

  const isUpdate = opts.kind === "updated";
  const subject = isUpdate
    ? `MH71 — Đã cập nhật lại số điện ${opts.monthLabel}`
    : `MH71 — Đã ghi số điện ${opts.monthLabel}`;
  const heading = isUpdate ? "Quản lý đã cập nhật lại số điện" : "Quản lý đã ghi xong số điện";

  const when = new Date(opts.filledAt).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });

  const roomRows = opts.rooms
    .map(
      (r) =>
        `<tr><td style="padding:5px 0;border-bottom:1px solid #f1f5f9">${r.code}</td>
             <td style="padding:5px 0;text-align:right;border-bottom:1px solid #f1f5f9;font-variant-numeric:tabular-nums">${viNum.format(r.units)}</td></tr>`,
    )
    .join("");

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
    <h2 style="margin:0 0 4px">${heading}</h2>
    <p style="margin:0 0 8px;color:#64748b">${opts.monthLabel} · ghi lúc ${when}</p>

    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr>
          <th style="padding:6px 0;text-align:left;color:#64748b;border-bottom:2px solid #e2e8f0">Phòng</th>
          <th style="padding:6px 0;text-align:right;color:#64748b;border-bottom:2px solid #e2e8f0">Số điện</th>
        </tr>
      </thead>
      <tbody>${roomRows}</tbody>
      <tfoot>
        <tr>
          <td style="padding:8px 0;font-weight:700">Tổng cộng</td>
          <td style="padding:8px 0;text-align:right;font-weight:700;font-variant-numeric:tabular-nums">${viNum.format(opts.unitsTotal)} số</td>
        </tr>
      </tfoot>
    </table>
    ${
      opts.notePhotoUrl
        ? `<p style="margin:16px 0 4px;color:#64748b">Ảnh giấy ghi số:</p>
           <a href="${opts.notePhotoUrl}"><img src="${opts.notePhotoUrl}" alt="Ảnh ghi số điện"
              style="width:100%;max-width:480px;border-radius:12px;border:1px solid #e2e8f0"/></a>`
        : ""
    }
    <p style="margin:20px 0 0"><a href="${opts.appUrl}" style="color:#0e8aa3;font-weight:600">Mở ứng dụng MH71</a></p>
    <p style="margin:6px 0 0;color:#94a3b8;font-size:12px">Email tự động từ MH71 · Quản lý nhà trọ</p>
  </div>`;

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [opts.to], subject, html }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${text}`);
  }
}
