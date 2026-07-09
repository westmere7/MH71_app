// Server-only: this reads RESEND_API_KEY and must never be imported by a client
// component. It's used solely from the /api/meter/submit route handler.

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const viNum = new Intl.NumberFormat("vi-VN");

export type MeterEmailKind = "filled" | "updated";

export interface MeterEmailOpts {
  to: string | string[]; // one or more recipients
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

  const when = new Date(opts.filledAt).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });

  const badge = isUpdate
    ? `<span style="display:inline-block;background:#fef3c7;color:#b45309;font-size:11px;font-weight:700;letter-spacing:.5px;padding:4px 10px;border-radius:999px">ĐÃ CẬP NHẬT LẠI</span>`
    : `<span style="display:inline-block;background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;letter-spacing:.5px;padding:4px 10px;border-radius:999px">ĐÃ GHI XONG</span>`;

  const roomRows = opts.rooms
    .map(
      (r, i) =>
        `<tr style="background:${i % 2 ? "#f8fafc" : "#ffffff"}">
           <td style="padding:9px 16px;font-weight:600;color:#0f172a">${r.code}</td>
           <td style="padding:9px 16px;text-align:right;color:#0f172a;font-variant-numeric:tabular-nums">${viNum.format(r.units)}</td>
         </tr>`,
    )
    .join("");

  const photo = opts.notePhotoUrl
    ? `<p style="margin:18px 0 6px;color:#64748b;font-size:13px">Ảnh giấy ghi số</p>
       <a href="${opts.notePhotoUrl}"><img src="${opts.notePhotoUrl}" alt="Ảnh ghi số điện"
          style="width:100%;max-width:512px;border-radius:12px;border:1px solid #e2e8f0"/></a>`
    : "";

  const html = `
  <div style="background:#eef2f6;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <tr><td style="background:#1b2a4a;padding:18px 24px">
        <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:.5px">🏠 MH71</span>
        <span style="color:#93a4c4;font-size:13px;margin-left:8px">Quản lý nhà trọ</span>
      </td></tr>
      <tr><td style="padding:24px">
        ${badge}
        <h1 style="margin:12px 0 2px;font-size:20px;color:#0f172a">Số điện ${opts.monthLabel}</h1>
        <p style="margin:0 0 18px;color:#64748b;font-size:13px">Ghi lúc ${when}</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:18px">
          <tr>
            <td style="padding:14px 16px;color:#15803d;font-size:14px;font-weight:600">Tổng số điện</td>
            <td style="padding:14px 16px;text-align:right;color:#15803d;font-size:24px;font-weight:800;font-variant-numeric:tabular-nums">${viNum.format(opts.unitsTotal)} <span style="font-size:14px;font-weight:600">số</span></td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;font-size:14px">
          <tr style="background:#f1f5f9">
            <th align="left" style="padding:10px 16px;color:#64748b;font-size:11px;font-weight:700;letter-spacing:.5px">PHÒNG</th>
            <th align="right" style="padding:10px 16px;color:#64748b;font-size:11px;font-weight:700;letter-spacing:.5px">SỐ ĐIỆN</th>
          </tr>
          ${roomRows}
          <tr style="background:#f8fafc;border-top:2px solid #e2e8f0">
            <td style="padding:12px 16px;font-weight:800;color:#0f172a">Tổng cộng</td>
            <td style="padding:12px 16px;text-align:right;font-weight:800;color:#0f172a;font-variant-numeric:tabular-nums">${viNum.format(opts.unitsTotal)} số</td>
          </tr>
        </table>

        ${photo}

        <p style="margin:22px 0 0">
          <a href="${opts.appUrl}" style="color:#0e8aa3;font-weight:700;font-size:15px;text-decoration:none">Mở ứng dụng MH71 &rarr;</a>
        </p>
      </td></tr>
      <tr><td style="padding:14px 24px;background:#f8fafc;border-top:1px solid #eef2f6">
        <span style="color:#94a3b8;font-size:12px">Email tự động từ MH71 · Quản lý nhà trọ</span>
      </td></tr>
    </table>
  </div>`;

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${text}`);
  }
}
