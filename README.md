# OnlyPants

Toko thrift online untuk celana vintage, streetwear, dan merch OnlyPants. Pembayaran memakai QRIS statis dengan verifikasi manual oleh admin, dan stok dikelola secara atomik di database.

Spesifikasi produk lengkap ada di [docs/PRD.md](docs/PRD.md). Versi situs statis lama tersimpan di tag `v0-legacy`.

## Stack

- Next.js 16 (App Router, Cache Components) + TypeScript + Tailwind CSS 4
- Supabase: Postgres, Auth (admin), Storage (foto produk & bukti bayar)
- Drizzle ORM, Zod, Nodemailer
- Deploy: Vercel

## Menjalankan secara lokal

Prasyarat: Node.js 22+ dan Docker Desktop (untuk Supabase lokal).

```bash
npm install
npm run db:start        # Supabase lokal: Postgres, Auth, Storage, Mailpit
cp .env.example .env.local   # isi dengan nilai dari output db:start
npm run seed:admins     # buat akun owner & staff dummy
npm run dev             # http://localhost:3000
```

| URL | Isi |
|---|---|
| http://localhost:3000 | Toko (redirect ke `/id` atau `/en`) |
| http://localhost:3000/admin | Dashboard admin |
| http://127.0.0.1:54323 | Supabase Studio (lihat isi DB) |
| http://127.0.0.1:54324 | Mailpit (email yang dikirim aplikasi) |

`npm run db:reset` menghapus database lokal lalu menjalankan ulang migration + `supabase/seed.sql`.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run typecheck` | Cek tipe TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Unit test (Vitest) |
| `npm run test:e2e` | Test end-to-end (Playwright) |

## Struktur

```
src/app/[lang]/     halaman toko (id/en)
src/app/admin/      dashboard admin
src/lib/            data, stok, order, i18n, notifikasi
supabase/migrations skema database (sumber kebenaran)
supabase/seed.sql   data produk dummy
```
