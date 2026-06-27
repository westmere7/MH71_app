# MH71 — Quản lý nhà trọ

Ứng dụng web quản lý nhà trọ (mobile-first, đầy đủ tính năng trên máy tính), tiếng Việt,
đồng bộ gần như tức thời giữa các thiết bị. Thay thế cho file Google Sheet.

- **Chủ trọ**: 1 tài khoản, đăng nhập 1 lần (lưu cookie). Xem tổng quan + quản lý phòng/thu tiền.
- **Quản lý tại chỗ**: chỉ vào trang `/dien` (mật khẩu `mh71`) để nhập số điện hàng tháng.

Tech: **Next.js 16 + React + TypeScript**, **Tailwind v4 + Radix**, **Supabase** (Postgres + Auth +
Realtime + Storage), **Recharts**, **TanStack Query**.

---

## 1. Tạo dự án Supabase (miễn phí)

1. Vào https://supabase.com → **New project**. Đặt tên `mh71`, chọn region gần VN (Singapore), đặt
   **Database password** và lưu lại.
2. Đợi ~2 phút cho project khởi tạo.

## 2. Nạp cơ sở dữ liệu

Trong Supabase: **SQL Editor → New query**, dán và **Run** lần lượt 2 file (theo đúng thứ tự):

1. `supabase/migrations/0001_schema.sql` — tạo bảng, RLS, trigger, view, bucket ảnh.
2. `supabase/migrations/0002_seed.sql` — nạp 26 phòng + dữ liệu tháng 6/2026.
3. `supabase/migrations/0003_history.sql` — toàn bộ lịch sử T10/2023 → T5/2026 (32 tháng,
   đã đối chiếu khớp “Tổng thu” từng tháng với file PDF gốc).

## 3. Tạo tài khoản chủ trọ

**Authentication → Users → Add user** → nhập email + mật khẩu → **bật "Auto confirm user"**.
Đây là tài khoản duy nhất dùng để đăng nhập app.

## 4. Lấy khoá API và cấu hình

**Project Settings → API**, copy 3 giá trị vào file `.env.local` (đã có sẵn, copy từ
`.env.local.example` nếu chưa có):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon / publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service_role / secret key>   # CHỈ dùng ở server, không lộ ra ngoài
METER_PASSWORD=mh71
METER_COOKIE_SECRET=<chuỗi ngẫu nhiên dài>
```

Tạo `METER_COOKIE_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 5. Chạy app

```bash
npm install      # nếu chưa cài
npm run dev      # http://localhost:3000
```

- Chủ trọ: mở `http://localhost:3000` → đăng nhập.
- Quản lý: mở `http://localhost:3000/dien` → mật khẩu `mh71`.

> ⚠️ Biến `NEXT_PUBLIC_*` được nhúng lúc **build**. Khi chạy `npm run dev` thì luôn đọc `.env.local`
> mới nhất. Nếu deploy production (`npm run build`), phải đặt env **trước khi build**.

Truy cập từ điện thoại trong cùng mạng LAN: `npm run dev -- -H 0.0.0.0` rồi mở
`http://<địa-chỉ-IP-máy>:3000`.

---

## Tải dữ liệu ra file (khi cần)

Dữ liệu được thiết kế “phẳng” để xuất CSV dễ đọc kể cả khi không dùng app:

- **Table Editor → bảng `bills`** (hoặc `tenants`, `months`) → **Export → CSV**.
- **`v_bills_full`**: view gộp sẵn (kỳ, phòng, người thuê, số điện, tiền điện, tiền phòng, tiền rác,
  tổng, trạng thái…) — giống bố cục sheet cũ. Mở trong SQL Editor: `select * from v_bills_full;` rồi
  **Download CSV**.

## Cấu trúc chính

```
supabase/migrations/   0001_schema.sql, 0002_seed.sql
src/app/(owner)/        Dashboard (/), /tenants, /settings  — cần đăng nhập
src/app/login/          Đăng nhập chủ trọ
src/app/dien/           Trang ghi điện cho quản lý (mật khẩu)
src/app/api/meter/      API server cho trang ghi điện (dùng service-role key)
src/lib/                supabase clients, queries, mutations, finance, format
src/components/         ui/ (Radix), layout/, dashboard/, tenants/
```

## Ghi chú

- **Lợi nhuận**: hiện coi tiền điện & tiền rác là khoản thu hộ (pass-through), nên
  `lợi nhuận = tổng tiền phòng − chi phí ngoài khác`. Công thức nằm gọn trong
  `src/lib/finance.ts`, chỉnh 1 chỗ nếu cách tính khác.
- **Tạo tháng mới**: vào **Cài đặt → Tạo tháng mới** — tự chuyển số điện cuối kỳ thành số đầu kỳ mới.
- **Thiết lập giá** có khoá mật khẩu riêng (mặc định `77777776`, đổi bằng `NEXT_PUBLIC_PRICING_PASSWORD`).

---

## Deploy lên Netlify

Đã có sẵn `netlify.toml`. Các bước:

1. Đẩy code lên một repo GitHub/GitLab (hoặc dùng Netlify CLI — xem dưới).
2. Trên https://app.netlify.com → **Add new site → Import an existing project** → chọn repo.
   Netlify tự nhận diện Next.js (`@netlify/plugin-nextjs`). Build command `npm run build`.
3. **Site configuration → Environment variables** — thêm đúng các biến (giống `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `METER_PASSWORD`
   - `METER_COOKIE_SECRET`
   - `NEXT_PUBLIC_PRICING_PASSWORD` (tuỳ chọn)
   > Lưu ý: các biến `NEXT_PUBLIC_*` được nhúng **lúc build**, nên phải đặt **trước** khi deploy.
4. **Deploy**. Sau khi xong, vào Supabase → **Authentication → URL Configuration** thêm domain
   Netlify (vd `https://mh71.netlify.app`) vào **Site URL / Redirect URLs**.

**Cách nhanh bằng CLI** (không cần Git):
```bash
npm i -g netlify-cli
netlify login
netlify init        # tạo site mới, liên kết thư mục này
netlify env:import .env.local   # nạp biến môi trường
netlify deploy --build --prod
```

Realtime, ảnh (Storage) và trang `/dien` đều chạy qua internet sau khi deploy — vẫn dùng chung
project Supabase hiện tại.
