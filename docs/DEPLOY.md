# Deploy OnlyPants ke Supabase + Vercel

Estimasi waktu: ±45 menit. Semua layanan memakai paket gratis.

## 1. Buat project Supabase

1. Daftar di https://supabase.com, lalu **New project**.
   - Region: **Southeast Asia (Singapore)**, paling dekat ke Indonesia.
   - Simpan **database password**-nya.
2. Dari terminal di folder project:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>   # ref ada di URL dashboard
npx supabase db push --include-seed              # tabel, fungsi stok, cron, bucket + produk dummy
```

3. Catat nilai berikut dari dashboard:
   - **Project Settings → API**: Project URL, Publishable key, Secret key.
   - **Connect → Transaction pooler** (port 6543): connection string untuk `DATABASE_URL`.
   - **Connect → Session pooler** (port 5432): untuk backup mingguan.

## 2. Siapkan email (Gmail)

1. Pakai akun Gmail toko, lalu aktifkan **2-Step Verification**.
2. Buka https://myaccount.google.com/apppasswords dan buat App Password "OnlyPants".
3. Nilai SMTP-nya: host `smtp.gmail.com`, port `465`, user = alamat Gmail, pass = App Password.

Batas Gmail ±500 email/hari. Kalau nanti punya domain, ganti ke Resend atau SMTP domain supaya email tidak masuk spam.

## 3. Deploy ke Vercel

1. https://vercel.com → **Add New → Project** → import repo `tohurmaali29/onlypants`.
2. Isi **Environment Variables**:

| Nama | Nilai |
|---|---|
| `DATABASE_URL` | Transaction pooler URL (port 6543) |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_SECRET_KEY` | Secret key |
| `NEXT_PUBLIC_SITE_URL` | `https://<nama-project>.vercel.app` |
| `ORDER_LINK_SECRET` | string acak panjang. **Jangan diganti setelah live**, link pesanan lama akan mati |
| `CRON_SECRET` | string acak panjang |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | dari langkah 2 |
| `MAIL_FROM` | `OnlyPants <alamat@gmail.com>` |
| `ADMIN_NOTIFY_EMAIL` | email yang menerima notifikasi pesanan baru |

String acak bisa dibuat dengan: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`

3. Klik **Deploy**.

## 4. Akun admin

Jalankan sekali dari laptop, dengan env yang mengarah ke Supabase **produksi** (`DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`):

```bash
OWNER_EMAIL=emailowner@gmail.com STAFF_EMAIL=emailstaff@gmail.com ADMIN_PASSWORD='password-kuat-sementara' npm run seed:admins
```

Setelah itu login ke `/admin` dan ganti password di menu **Staff → Ganti password saya**.

## 5. Notifikasi otomatis tiap 10 menit

Paket Vercel gratis hanya boleh cron 1×/hari (sudah diatur di `vercel.json`). Supaya email kedaluwarsa dan pengingat bayar terkirim tepat waktu, pakai cron Supabase. Buka **SQL Editor** di dashboard Supabase, lalu jalankan:

```sql
create extension if not exists pg_net;

select cron.schedule(
  'notify-sweep',
  '*/10 * * * *',
  $$
  select net.http_get(
    url := 'https://<nama-project>.vercel.app/api/cron/sweep',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  )
  $$
);
```

Pelepasan stok tetap berjalan meskipun langkah ini dilewati, karena job `sweep-orders` di database sudah aktif dari migration. Langkah ini hanya untuk pengiriman email.

## 6. Sebelum menerima pembeli asli

Checklist di `/admin/settings`:

- [ ] Upload **QRIS asli**, isi nama merchant, lalu **matikan Mode demo**.
- [ ] Isi WhatsApp, email, Instagram, dan alamat toko yang benar.
- [ ] Ganti harga, foto, ukuran, dan stok produk dummy di `/admin/products`.
- [ ] Baca ulang halaman kebijakan di `src/lib/help-content.ts` (retur, privasi, S&K).
- [ ] Lakukan 1 transaksi uji kecil end-to-end, lalu batalkan.

## 7. Backup mingguan (opsional, direkomendasikan)

Di GitHub repo: **Settings → Secrets and variables → Actions**, tambahkan:

- `SUPABASE_DB_URL`: Session pooler URL (port 5432).
- `BACKUP_PASSPHRASE`: kata sandi acak. **Simpan di tempat aman**, tanpa ini backup tidak bisa dibuka.

Workflow `.github/workflows/backup.yml` berjalan tiap Senin 02.00 WIB. File backup terenkripsi karena repo publik.

## Catatan paket gratis

- **Vercel Hobby** menurut ketentuannya untuk penggunaan non-komersial. Aman untuk mulai. Saat toko mulai ramai, upgrade ke Pro tanpa perubahan kode.
- **Supabase Free** di-pause setelah 7 hari tanpa aktivitas. Cron dari langkah 5 menjaga database tetap aktif.
