# MH71 — Knowledge Base (for AI agents)

> Read this before working on the codebase. It captures domain rules, the data
> model, and conventions/gotchas that are **not** obvious from the code alone.
> Pair it with `AGENTS.md` (Next.js version warning) and `CLAUDE.md`.

---

## 1. What this is

**MH71** is a Vietnamese-language rental-management web app for a single
building: **2 kiosks (`K1`, `K2`) + 24 rooms (`P1`–`P24`) = 26 units**. It
replaces a Google Sheet (`records/` holds the original PDF export). The whole UI
is in Vietnamese; money is VND.

Two surfaces:

- **Owner app** — single owner login. Tabs: **Thống kê** (dashboard/stats),
  **Phòng thuê** (tenant manager), **Tổng quan** (read-only kiosk table), **Cài đặt** (settings, which now contains **Thiết lập giá** / pricing).
- **Manager meter page** (`/dien`) — separate, password-gated page for the
  on-site manager to enter electricity readings. The manager has **no Supabase
  account**; access is a password → signed cookie.

Real-time sync across devices via Supabase Realtime.

---

## 2. Tech stack

- **Next.js 16** (App Router, Turbopack) — ⚠️ see `AGENTS.md`; APIs differ from
  older Next. The route-interceptor file is **`src/proxy.ts`** exporting
  `proxy()` (Next 16 renamed `middleware` → `proxy`).
- **React 19**, **TypeScript**, **Tailwind CSS v4** (CSS `@theme`, `@custom-variant dark`, rem-based spacing).
- **Supabase** — Postgres + Auth + Realtime + Storage.
- **TanStack Query** (React Query) for data; **Radix UI** primitives (wrapped in
  `src/components/ui`); **lucide-react** (pinned `^1.21.0` — verify icon names
  exist before importing); **Recharts**; **next-themes**; **sonner** (toasts);
  **date-fns**.
- Deploy target: **Vercel** (migrated from Netlify). Auto-deploys on push; no
  build-minute cap concern. `netlify.toml` may still exist and is ignored by Vercel.

---

## 3. How to run / verify (and hard constraints)

```
npm run dev      # next dev (Turbopack)
npm run build    # production build — run this to verify
npx tsc --noEmit # typecheck
```

**Constraints an agent must respect:**

- **Do NOT commit.** The owner commits manually with git. `.gitignore` is set up.
- **Agents cannot run DDL** on Supabase. Migrations live in `supabase/migrations/`
  and are applied **by the user** in the Supabase SQL editor. Write the migration
  file + add graceful fallbacks in code (see §7).
- **Live browser preview usually can't run** — a `next dev` server is typically
  already holding the project dir, and Next refuses a second instance from the
  same folder. Verify via `tsc` + `npm run build` + the dev server's recompile
  log (`.next/dev/logs/next-development.log`) instead.
- After deleting a route, **clear `.next/types`** (`rm -rf .next/types`) before
  `tsc`/build, or stale generated validators reference the gone route.

---

## 4. Routes & navigation

Owner pages live in the `(owner)` route group under `src/app/(owner)/`, wrapped
by `AppShell` (sidebar + sticky top header with the month switcher + theme toggle).

| Route | Label (nav) | File |
|---|---|---|
| `/` | **Tổng quan** | `(owner)/page.tsx` — read-only kiosk table |
| `/tenants` | **Phòng thuê** | `(owner)/tenants/page.tsx` — tenant cards |
| `/thong-ke` | **Thống kê** | `(owner)/thong-ke/page.tsx` — dashboard/stats + chart |
| `/settings` | **Cài đặt** | `(owner)/settings/page.tsx` — incl. pricing |
| `/login` | — | `(owner)`-excluded; owner sign-in |
| `/dien` | — | manager meter page (password `mh71`) |

Nav order/labels: `src/components/layout/nav-items.ts`. Sidebar + bottom bar
read the same list. There is a shared `(owner)/loading.tsx` skeleton so dynamic
navigations feel instant (Next prefetches the loading state).

API routes (server, service-role): `src/app/api/meter/{auth,data,note,submit}/route.ts`.

---

## 5. Auth

- **Owner**: Supabase email/password. `proxy.ts` gates `(owner)` routes. It uses
  **`getSession()` (local cookie read, no network)** — NOT `getUser()` — to keep
  navigation fast on mobile after idle. Data is protected by **RLS** on every
  query regardless, so the cheap routing check is safe.
- **Manager** (`/dien`): password (`METER_PASSWORD`, default `mh71`) → HMAC-signed
  httpOnly cookie. See `src/lib/meter-auth.ts`. The `/api/meter/*` routes check
  `isMeterAuthed()` and use the **service-role** client (`src/lib/supabase/service.ts`).

---

## 6. Data model

Postgres (see `supabase/migrations/0001_schema.sql`). Hand-written TS Row types
in `src/lib/supabase/types.ts` (the Supabase clients are **untyped** — generics
collapse to `never`, so results are cast to these types).

- **settings** (singleton, `id = 1`): `building_name`, `electricity_rate`,
  `trash_fee`, `collection_target_pct`, **`ui_scale`** (0007), **`lock_past_months`** (0009), `updated_at`.
- **rooms**: `code` (K1/K2/P1–P24), `kind`, `default_rent`, **`default_trash`**,
  **`default_rate`** (0004; null = use the shared `settings` value), `sort_order`, `is_active`.
- **tenants** (full history; **current = `move_out_date is null`**, enforced by a
  unique partial index — one current tenant per room): `room_id`, `name`, `phone`,
  `move_in_date`, `move_out_date`, `photo_url`, `notes`, `same_household`,
  `camera_access`.
- **months** (per-month metadata): `year`, `month`, `period_start/end`,
  `meter_status`/`fee_status`/`collection_status` (enum `chua|dang|xong`),
  **`other_fees`** = "Chi phí tổng cộng", `meter_note_photo_url`,
  **`meter_filled_at`** (0006), **`evn_bill`** (0010). `unique(year, month)`.
- **bills** (1 per room per month — the core record): `month_id`, `room_id`,
  `tenant_id`, **`tenant_name`** + **`tenant_phone`** (0008) snapshots,
  `reading_old`, `reading_new`, `electricity_rate`, `room_fee`, `trash_fee`,
  `payment_status`, **`amount_paid`** (0005; null = paid in full),
  `paid_at`, `notes`. `unique(month_id, room_id)`.
  - **Generated columns (DB-computed, never write them):** `units = max(reading_new - reading_old, 0)`, `electricity_amount = units * electricity_rate`, `total = electricity_amount + room_fee + trash_fee`.
- **payment_logs** (append-only): written automatically by a **trigger** on any
  `bills.payment_status` change (also auto-manages `paid_at`). Do not insert manually.

Enums: `room_kind_t`, `progress_status_t (chua|dang|xong)`,
`payment_status_t (unpaid|paid_cash|paid_transfer|partial|vacant)`. `partial` is
legacy — the UI treats it as `unpaid`.

---

## 7. Migrations (applied by the USER)

`supabase/migrations/`, run in order in the Supabase SQL editor:

| # | Adds |
|---|---|
| 0001 | base schema (tables, enums, generated cols, triggers) |
| 0002 | seed (settings, rooms) |
| 0003 | history import (33 months of bills — financials only) |
| 0004 | per-room pricing (`rooms.default_trash`, `default_rate`) |
| 0005 | `bills.amount_paid` (trả thiếu / partial collection) |
| 0006 | `months.meter_filled_at` |
| 0007 | `settings.ui_scale` |
| 0008 | `bills.tenant_phone` (month-specific phone) |
| 0009 | `settings.lock_past_months` (default **true**) |
| 0010 | `months.evn_bill` (owner's actual EVN electricity bill) |

**Graceful-fallback pattern:** because code may run before a migration is applied,
write paths try the new column and retry without it on a column-not-found error
(see `updateBillStatus` / `reactivateBill` / `updateBillTenant` / the
`createNextMonth` insert in `src/lib/mutations.ts`). Reads use `select("*")` and
`?? default` so a missing column degrades to a sensible default.

---

## 8. Core domain logic — the **snapshot model**

Each **bill is a self-contained snapshot of one room for one month.** It stores
its own `tenant_name`, `tenant_phone`, `room_fee`, `trash_fee`, `electricity_rate`
— so editing or changing tenants in one month **never** alters another month.

- **New month** (`createNextMonth`, `src/lib/mutations.ts`): **strictly mirrors
  the previous month's bills** — copies `tenant_id`/`tenant_name`/`tenant_phone`/
  fees/rate, rolls `reading_new → reading_old`, resets `reading_new` to null and
  payment to `unpaid` (or `vacant` if no tenant). It does **NOT** read the live
  `tenants`/`rooms`/`settings` tables for existing rooms (only as a fallback for a
  brand-new room or the very first month). `other_fees` is carried forward, default
  `DEFAULT_TOTAL_COST` (4,800,000) if none.
- **Editing a tenant** (`tenant-form-dialog.tsx`): updates the `tenants` row AND
  snapshots name/phone onto **the current month's bill only** (`updateBillTenant`).
  Adding to a vacant room uses `reactivateBill`.
- **Display prefers the snapshot:** name = `bill.tenant_name ?? tenant.name`,
  phone = `bill.tenant_phone ?? tenant.phone`.
- **Avatar/photo is tied to the tenant**, resolved via `bill.tenant_id` →
  `tenant.photo_url` (so it follows the person across months/rooms, not the room).
  Use `useAllTenants()` (incl. moved-out) to resolve by id.
- The original PDF only had financials, so historical `tenant_name`/`tenant_phone`
  were backfilled from `records/…pdf` via one-off scripts (see §14).

---

## 9. Money / finance model

`src/lib/finance.ts` → `computeMonthStats(bills, month)`:

- **Doanh thu (revenue)** = `total` billed = electricity charged + room + trash.
  The dashboard "Doanh thu" card shows **collected / totalBilled** (current / max).
- **Chi phí tổng cộng** = `months.other_fees` — a fixed monthly bundle of external
  service fees (internet, security, mgmt…). Default 4,800,000 (`DEFAULT_TOTAL_COST`
  in `constants.ts`). Edited per month in **Thiết lập giá**.
- **Điện EVN** = `months.evn_bill` — the owner's **actual** electricity bill,
  entered **manually** in Cài đặt → **Tiền điện**. This is *different* from the
  electricity fee charged to tenants (`electricityTotal`, which is part of revenue).
- **Lợi nhuận (profit)** = **collected income** − (Chi phí tổng cộng + Điện EVN).
  i.e. `profitCurrent = collected − other_fees − evn_bill`. (`profitFull` uses
  `totalBilled` instead of `collected`; the dashboard + chart use the **collected**
  basis.)

`paidAmountOf(bill)` = `amount_paid ?? total` for paid bills (handles "trả thiếu").

---

## 10. Locking ("Khoá tháng đã qua")

Toggle: `settings.lock_past_months` (default **true**), in Cài đặt.
`MonthProvider` exposes `selectedLocked`:

> A month is **locked** when the setting is on **AND** it is **before the current
> calendar month** **AND** it is not the newest month. The current month, future
> months, and the newest month are always editable.

Locked months: no status changes, no tenant add/edit/checkout, no `other_fees`/
`evn_bill` edits, no pricing edits, and cannot be deleted. **Deletion** is also
blocked for the **current** calendar month (only future months can be deleted).

---

## 11. Manager meter page (`/dien`)

- Always serves the **latest** month (`/api/meter/data` picks newest).
- All edits are **staged locally and only persisted on submit** — leaving the page
  discards them. Submit (`/api/meter/submit`) does it in one batch: upload the
  staged note photo, write every reading, set the photo URL, mark month `xong`.
- **Validation before submit:** a note photo is required, every room must have a
  reading, and no reading may be below its `số cũ`. The status pip is green only
  when a row is filled & valid; empty/invalid rows block submission.
- **Revising mode** (month already `xong`): inputs are amber, banner explains it
  updates current figures, button = "Cập nhật số điện" + a confirm dialog.
- `/api/meter/note` is **upload-only** (returns a URL; does NOT touch the month —
  the photo only appears in the owner app after submit).

---

## 12. Conventions & gotchas

- **Supabase clients are untyped** (Database generics → `never`). Cast results to
  the hand-written types in `types.ts`. Browser client: `getSupabaseBrowser()`;
  server: `src/lib/supabase/server.ts`; service-role (server only): `service.ts`.
- **React Query keys** live in `qk` (`src/lib/queries.ts`). Realtime
  (`useRealtimeSync`) invalidates `["bills"]`, `qk.months`, `qk.tenants` on
  postgres changes; it must `realtime.setAuth(session token)` for RLS.
- **Currency**: `formatVND` renders the dong sign **`₫`** (e.g. `2.500.000 ₫`).
  `formatNumber` for plain grouped numbers; `formatDateTime` / `formatDateTimeLong`
  for timestamps.
- **Accent color** is cyan `#25c8e8` (`--primary`) in **both** themes, with **dark
  text** on the accent (`--primary-foreground`). Theme via next-themes (class).
- **UI scale** (`settings.ui_scale`) is applied app-wide by setting the root
  `font-size` (rem-based utilities scale). Applied by `UiScaleApplier` in `AppShell`
  (localStorage for instant, Supabase for cross-device).
- **Payment status display**: `paid_cash` and `paid_transfer` both show
  **"Đã TT"** (chip) / **"Đã thanh toán"** (full). The status picker offers 3
  choices — `unpaid`, `paid`, `vacant`; picking `paid` opens the PaymentDialog where
  the method + "trả thiếu" amount are chosen (`STATUS_CHOICES` / `statusChoiceOf`).
- **lucide-react is `^1.21.0`** — unusual versioning; confirm an icon export exists
  before importing (`node -e "console.log(!!require('lucide-react').X)"`).
- **Next 16 = `proxy.ts`**, not `middleware.ts`.
- **Hydration**: a `darkreader-lock` meta is rendered in the root layout; the month
  switcher uses a `mounted` guard. A residual `disabled`-attribute hydration warning
  on the month-switcher buttons is known/benign (browser-extension-ish).

---

## 13. Environment variables

In `.env.local` (gitignored) and on Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — required (client).
- `SUPABASE_SERVICE_ROLE_KEY` — **server only** (used by `/api/meter/*` and the
  one-off scripts). Never expose to the client.
- `METER_PASSWORD` (default `mh71`), `METER_COOKIE_SECRET` — `/dien` gate.

---

## 14. One-off scripts (`scripts/`, run with `node`)

Use the service-role key from `.env.local`. Intended for maintenance, not the app.

- `meter-test.mjs finish|reset|status [YYYY-M]` — put a month into the
  finished/fresh state to test the meter page's update vs new flow.
- `backfill-phones.mjs [write]` — parse the records PDF (`pdftotext`) and fill
  `bills.tenant_phone` per month. (Names were backfilled by a similar throwaway
  script.) Aligns PDF pages to DB months by index, verifying year/month.

History source: `records/MH71_10-2023 to 6-2026 records.pdf` (one page per month;
the "Người thuê"/"Sdt/Zalo" columns are the name/phone source of truth).

---

## 15. Ops

- **Supabase free tier auto-pauses after 7 days idle.** A GitHub Actions cron
  (`.github/workflows/keepalive.yml`) pings the REST API daily to prevent it.
  Needs repo secrets `SUPABASE_URL` + `SUPABASE_ANON_KEY`. It only *prevents*
  pauses; an already-paused project must be restored once from the dashboard.

---

## 16. Key files

```
src/proxy.ts                         # auth gate (getSession, RLS-backed)
src/middleware.ts                    # (removed — replaced by proxy.ts)
src/app/(owner)/layout.tsx           # → AppShell
src/components/layout/app-shell.tsx  # sidebar + header + month switcher + UiScaleApplier
src/components/layout/nav-items.ts   # nav order/labels
src/components/month-provider.tsx    # selected month, months list, selectedLocked, latestMonthId
src/lib/queries.ts                   # React Query hooks + qk keys + realtime sync
src/lib/mutations.ts                 # all writes (createNextMonth, saveMonthPricing, bills, tenants…)
src/lib/finance.ts                   # computeMonthStats (revenue/profit model)
src/lib/constants.ts                 # PAYMENT_STATUS, STATUS_CHOICES, DEFAULT_TOTAL_COST, APP_VERSION
src/lib/format.ts                    # formatVND (₫), formatNumber, dates, initials
src/lib/supabase/{client,server,service,types}.ts
src/components/tenants/tenant-row.tsx        # the editable tenant card (reused in a dialog on Tổng quan)
src/components/tenants/tenant-form-dialog.tsx
src/components/tenants/status-menu.tsx       # StatusChip + StatusMenu (tap-not-scroll guard)
src/components/settings/pricing-card.tsx     # Thiết lập giá (month-specific + review-before-save)
src/components/dashboard/{stat-card,count-up,history-chart}.tsx
src/lib/meter-auth.ts                # /dien cookie auth
src/app/api/meter/*/route.ts         # manager meter endpoints (service role)
supabase/migrations/*.sql            # schema (user-applied)
scripts/*.mjs                        # maintenance scripts
records/*.pdf                        # original Google-Sheet export (history source)
```

---

## 17. Working agreement (how the owner expects agents to behave)

- Make the change, then **verify with `tsc` + `npm run build`**; report results
  honestly (note when preview couldn't run).
- **Never commit**; leave changes staged for the owner.
- New DB columns → write the migration file, add code fallbacks, and **tell the
  owner to run it** (you can't).
- Keep everything **Vietnamese** in the UI and **VND** for money.
- Bump `APP_VERSION` (in `constants.ts`) **and** `package.json` when asked for a
  version bump (kept in sync; shown as `v…` in the sidebar/footer).
