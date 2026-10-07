# PRD — OnlyPants v1 (Rebuild)

| | |
|---|---|
| Status | v1.1 — disetujui untuk eksekusi (pakai data dummy) |
| Owner | @maali29_ |
| Tanggal | 7 Oktober 2026 |
| Snapshot lama | tag `v0-legacy` (commit `6a69bc5`) |

---

## 1. Latar belakang

OnlyPants adalah toko thrift streetwear/vintage (fokus celana) plus merch. Situs saat ini adalah HTML statis dengan produk yang di-hardcode. Hasil audit 7 Okt 2026:

- Total keranjang salah hitung (contoh: seharusnya Rp 4.670.000, tampil IDR 174.500).
- Keranjang tidak bisa dibuka di HP, isinya hilang saat reload, dan tidak terhubung ke halaman pembayaran.
- Halaman payment meminta nomor kartu + CVV tanpa payment gateway (berisiko).
- Tidak ada konsep stok: barang thrift 1 pcs bisa dibeli berkali-kali.
- Modal detail selalu menampilkan produk yang sama, search dan form kontak tidak berfungsi.
- Layout overflow horizontal, aksesibilitas dan SEO minim.

Struktur sekarang tidak bisa menampung stok, order, dan pembayaran, sehingga situs **dibangun ulang**. Aset dan ciri khas brand tetap dipertahankan.

## 2. Tujuan

1. Customer bisa menemukan produk, memilih ukuran, checkout sebagai tamu, dan membayar lewat **QRIS statis**, lancar di HP.
2. **Stok selalu akurat.** Tidak ada barang terjual dua kali (overselling = 0).
3. Owner dan staff bisa mengelola produk, stok, ongkir, verifikasi pembayaran, dan pengiriman dari dashboard admin.
4. Situs bilingual **Indonesia / English** dengan tombol switch.
5. Berjalan di **Vercel Hobby (gratis)** + layanan free tier.

### Non-goals v1
- Payment gateway otomatis (QRIS dinamis, VA, kartu). Disiapkan jalurnya untuk fase 3.
- Akun customer, wishlist, review produk.
- Kalkulasi ongkir otomatis via API kurir.
- Aplikasi mobile.

### Metrik keberhasilan
| Metrik | Target |
|---|---|
| Kasus overselling | 0 |
| Lighthouse mobile (Performance / A11y / SEO) | ≥ 90 / ≥ 95 / ≥ 95 |
| Waktu admin memberi ongkir sejak order masuk | median < 3 jam (jam operasional) |
| Order expired karena tidak dibayar | dipantau, baseline di bulan pertama |

## 3. Keputusan yang sudah dikunci

| Topik | Keputusan |
|---|---|
| Model stok | Thrift = 1 varian qty 1. Merch = banyak varian ukuran, masing-masing punya qty |
| Ongkir | Diinput **manual per order** oleh admin |
| Checkout | **Guest only** (tanpa akun) |
| Batas bayar | **1 hari (24 jam)** |
| Admin | 2 role: **Owner** dan **Staff** |
| Notifikasi | **Email + WhatsApp** |
| Bahasa | **ID + EN**, bisa switch. Default ID |
| Brand | Tetap **biru**. Desain boleh diperbarui asal ciri khas (logo, nuansa streetwear, ilustrasi maskot) dipertahankan |
| Hosting | **Vercel Hobby** |
| Repo | `github.com/tohurmaali29/onlypants`, branch `main` |

## 4. Pengguna & peran

| Peran | Kebutuhan utama |
|---|---|
| **Customer (tamu)** | Lihat katalog, cek ukuran/kondisi, checkout cepat, tahu persis berapa dan ke mana harus bayar, pantau status order |
| **Staff** | Kelola produk dan stok, proses order (input ongkir, verifikasi bayar, input resi) |
| **Owner** | Semua akses Staff, plus kelola akun staff, pengaturan toko (QRIS, kontak, kebijakan), laporan penjualan, hapus permanen produk |

## 5. Alur utama

### 5.1 Alur order (QRIS statis + ongkir manual)

```
[Checkout] ──► MENUNGGU_ONGKIR ──(admin input ongkir)──► MENUNGGU_PEMBAYARAN
                    │                                          │
             (48 jam tanpa ongkir)                  (upload bukti bayar)
                    ▼                                          ▼
               DIBATALKAN                              VERIFIKASI_PEMBAYARAN
                                                   │                   │
                                         (admin approve)        (admin tolak)
                                                   ▼                   ▼
   (24 jam tanpa bukti)  ◄──────────────────── DIBAYAR       kembali ke MENUNGGU_PEMBAYARAN
   MENUNGGU_PEMBAYARAN → KEDALUWARSA               ▼          (dengan alasan, deadline tetap)
                                               DIPROSES ──► DIKIRIM (resi) ──► SELESAI
```

1. **Checkout.** Customer mengisi nama, email, nomor WA, alamat lengkap (provinsi, kota, kecamatan, kode pos), dan catatan. Saat submit, stok **di-reserve** secara atomik. Status jadi `MENUNGGU_ONGKIR`. Customer menerima email + link halaman order.
2. **Admin input ongkir.** Admin mengisi kurir/layanan dan biaya ongkir. Sistem lalu:
   - membuat **kode unik** Rp 1–999 yang tidak bentrok dengan order aktif lain,
   - menghitung `total = subtotal + ongkir + kode unik`,
   - memasang `deadline_bayar = sekarang + 24 jam`,
   - mengubah status jadi `MENUNGGU_PEMBAYARAN`, dan mengirim notif email + WA.
3. **Bayar.** Halaman order menampilkan gambar QRIS, **nominal persis** (tombol salin), countdown, dan panduan "masukkan nominal sesuai angka di atas". Customer upload bukti (JPG/PNG/PDF, maks 5 MB). Status jadi `VERIFIKASI_PEMBAYARAN`, dan admin mendapat notifikasi.
4. **Verifikasi.** Admin mencocokkan dengan mutasi QRIS (nominal unik).
   - **Approve:** status `DIBAYAR`, stok reserved dikonversi jadi terjual.
   - **Tolak:** wajib isi alasan. Status kembali ke `MENUNGGU_PEMBAYARAN` jika deadline belum lewat, dan customer dinotifikasi.
5. **Kirim.** Admin menandai `DIPROSES`, lalu input resi sehingga status jadi `DIKIRIM` (notif ke customer dengan resi). Setelah itu `SELESAI` (manual, atau otomatis 14 hari setelah dikirim).
6. **Batal/kedaluwarsa.** Reservasi stok dilepas otomatis, tercatat di log stok, dan customer dinotifikasi.

> **Asumsi:** hold stok sebelum ongkir diinput maksimal 48 jam. Kalau admin belum memberi ongkir dalam 48 jam, order batal otomatis. Batas 1 hari pembayaran dihitung sejak ongkir dikirim, supaya customer tidak kehilangan waktu karena admin lambat.

### 5.2 Akses halaman order (tanpa akun)
- Setiap order punya kode publik `OP-YYMMDD-XXXX` dan **token acak** di URL: `/order/OP-...?t=<token>`.
- Alternatif: form "Cek Pesanan" dengan kode order + nomor WA/email.

## 6. Kebutuhan fungsional

### 6.1 Storefront

| ID | Fitur | Detail | Prioritas |
|---|---|---|---|
| S1 | Beranda | Hero (maskot + CTA), New Drops, kategori, highlight merch, tentang singkat, CTA WhatsApp | P0 |
| S2 | Katalog `/shop` | Filter kategori, ukuran, rentang harga, tersedia/sold out. Sort terbaru/harga. Search nama. Pagination atau infinite scroll | P0 |
| S3 | Detail produk `/p/[slug]` | Galeri multi-foto (swipe, zoom). Harga + harga coret. Pilih ukuran (merch). **Measurement** (lingkar pinggang, panjang, inseam, paha, bukaan kaki) untuk thrift. **Kondisi** (skor x/10 + catatan minus). Deskripsi ID/EN. Badge SOLD OUT. Produk terkait | P0 |
| S4 | Keranjang (drawer) | Disimpan di perangkat (localStorage). Qty dibatasi stok tersedia (thrift maks 1). Badge jumlah di navbar. Toast saat ditambah. Empty state. Stok divalidasi ulang dari server saat dibuka/checkout | P0 |
| S5 | Checkout `/checkout` | Form guest dengan validasi (Zod) dan ringkasan order. Info "ongkir akan dikonfirmasi admin". Centang syarat & ketentuan. Anti-spam: honeypot + rate limit | P0 |
| S6 | Halaman order | Timeline status, rincian, instruksi QRIS, countdown, upload bukti, info resi | P0 |
| S7 | Cek pesanan | Lookup kode order + WA/email | P0 |
| S8 | Kontak | Form tersimpan di DB + email ke toko, peta, link WA/IG | P1 |
| S9 | Halaman statis | Cara Belanja & Bayar, FAQ, Panduan Ukuran, Kebijakan Retur, Privasi, S&K (ID/EN) | P1 |
| S10 | Switch bahasa | Route `/id/...` dan `/en/...`. Tersimpan di cookie. Konten produk punya field ID/EN dengan fallback ke ID | P0 |

### 6.2 Admin `/admin`

| ID | Fitur | Detail | Owner | Staff |
|---|---|---|:-:|:-:|
| A1 | Login | Email + password (Supabase Auth). Tidak ada registrasi publik, akun dibuat Owner | ✓ | ✓ |
| A2 | Dashboard | Jumlah order per status yang butuh aksi, order mendekati deadline, stok menipis, penjualan hari ini/bulan ini | ✓ | ✓ (tanpa omzet) |
| A3 | Produk | CRUD, upload + urutkan foto, field ID/EN, kategori, tipe (thrift/merch), varian + stok, measurement, kondisi, status draft/aktif/arsip | ✓ | ✓ (tanpa hapus permanen) |
| A4 | Stok | Restock / penyesuaian dengan alasan wajib. Riwayat pergerakan stok per varian | ✓ | ✓ |
| A5 | Order | List + filter status/tanggal/search. Detail: input ongkir, lihat bukti (signed URL), approve/tolak, input resi, batalkan (dengan alasan), catatan internal, tombol WA ke customer dengan pesan siap kirim | ✓ | ✓ |
| A6 | Pengaturan | Gambar QRIS + nama merchant, nomor WA toko, email toko, alamat, teks kebijakan, batas waktu (24 jam / 48 jam) | ✓ | — |
| A7 | Staff | Undang/nonaktifkan staff | ✓ | — |
| A8 | Laporan | Penjualan per periode, produk terlaris, export CSV order | ✓ | — |
| A9 | Audit log | Siapa melakukan apa (approve, tolak, ubah stok, ubah harga) | ✓ | lihat milik sendiri |

### 6.3 Notifikasi

| Event | Customer | Admin |
|---|---|---|
| Order dibuat | Email + WA | Email + WA |
| Ongkir dikonfirmasi (instruksi bayar) | Email + WA | — |
| Bukti bayar diupload | — | Email + WA |
| Pembayaran disetujui / ditolak | Email + WA | — |
| Pengingat 3 jam sebelum deadline | Email + WA | — |
| Dikirim (resi) | Email + WA | — |
| Kedaluwarsa / dibatalkan | Email + WA | — |

- **Email:** template bilingual sesuai bahasa yang dipakai customer saat checkout.
- **WhatsApp:** lewat adapter `NotificationChannel` supaya provider bisa diganti. Lihat Open Questions Q2.
  - v1 default: tombol "Kirim WA" di admin (`wa.me` dengan pesan otomatis terisi). Gratis, tapi admin yang menekan.
  - Opsi otomatis: provider gateway WA (mis. Fonnte, berbayar ±puluhan ribu/bulan) atau WhatsApp Cloud API resmi.

## 7. Manajemen stok — spesifikasi

**Model data per varian:** `stock_on_hand` (fisik) dan `reserved` (ditahan order belum lunas). Rumus: `tersedia = stock_on_hand − reserved`.

| Operasi | Efek | Tipe log |
|---|---|---|
| Checkout | `reserved += qty` jika `tersedia ≥ qty` | `RESERVE` |
| Approve bayar | `stock_on_hand −= qty`, `reserved −= qty` | `SALE` |
| Expired / batal sebelum bayar | `reserved −= qty` | `RELEASE` |
| Batal setelah bayar (refund) | `stock_on_hand += qty` (opsional, pilihan admin) | `RETURN` |
| Restock / koreksi admin | `stock_on_hand ± n`, alasan wajib | `RESTOCK` / `ADJUST` |

**Aturan:**
- Reservasi memakai **satu transaksi Postgres** untuk semua item order, dengan `UPDATE ... WHERE stock_on_hand - reserved >= qty`. Jika ada item yang gagal, seluruh order di-rollback dan customer diberi tahu item mana yang habis.
- `CHECK (reserved >= 0 AND reserved <= stock_on_hand)` di level DB.
- Setiap perubahan stok wajib menulis baris di `stock_movements` (siapa, kapan, order terkait, catatan).
- **Expiry** dijalankan dua lapis, karena cron Vercel Hobby hanya 1×/hari:
  1. `pg_cron` Supabase tiap 10 menit melepas order lewat deadline.
  2. Pengecekan *lazy* setiap kali halaman order/produk/admin dibuka.
- Produk dengan semua varian `tersedia = 0` tampil sebagai **SOLD OUT** (tetap tampil di katalog, bisa difilter).

## 8. Kebutuhan non-fungsional

- **Performa:** gambar dikonversi ke WebP/AVIF dengan ukuran responsif, lazy load, dan `width/height` eksplisit. Halaman katalog dan produk di-cache (ISR) dan di-revalidate saat produk/stok berubah.
- **Aksesibilitas:** WCAG 2.1 AA. Fokus keyboard terlihat, semua tombol ikon ber-`aria-label`, kontras ≥ 4.5:1, drawer/modal dengan focus trap dan bisa ditutup dengan Esc.
- **SEO:** metadata per halaman per bahasa, `hreflang`, Open Graph (preview di WA/IG), `sitemap.xml`, `robots.txt`, JSON-LD `Product` dengan availability.
- **Keamanan:**
  - Tidak pernah menyimpan data kartu.
  - Service key Supabase hanya di server, dan RLS aktif di semua tabel.
  - Bucket bukti bayar **private** (akses via signed URL berumur pendek).
  - Validasi tipe dan ukuran file upload.
  - Rate limit checkout, upload, dan kontak.
  - Semua aksi admin dicek role di server.
- **Privasi (UU PDP):** halaman kebijakan privasi, data customer hanya untuk pemrosesan order, dan bukti bayar dapat dihapus setelah 90 hari.
- **Backup:** Supabase free tidak punya point-in-time recovery, jadi ada GitHub Action mingguan `pg_dump` ke artifact privat.
- **Responsif:** mobile-first, tanpa horizontal scroll di 320–1920px.

## 9. Arsitektur & tech stack

| Lapisan | Pilihan |
|---|---|
| Framework | Next.js (App Router, versi stabil terbaru) + TypeScript |
| UI | Tailwind CSS + shadcn/ui, ikon Lucide |
| i18n | next-intl (route `/[locale]`) |
| DB | Supabase Postgres + Drizzle ORM (migrasi di repo) |
| Auth admin | Supabase Auth + tabel `staff` (role) |
| Storage | Supabase Storage: `product-images` (public), `payment-proofs` (private), `settings` (QRIS) |
| Validasi & form | Zod + React Hook Form |
| Email | Nodemailer + SMTP Gmail (belum ada domain). Resend saat domain dibeli. Di dev, email ditangkap Inbucket/Mailpit lokal Supabase |
| Jobs | Supabase `pg_cron` (expiry, pengingat) + Vercel Cron harian (keep-alive DB, cleanup) |
| Analytics | Vercel Web Analytics |
| Testing | Vitest (logika stok/harga), Playwright (alur checkout end-to-end) |
| CI | GitHub Actions: lint, typecheck, test. Vercel preview deploy per PR |

### Skema data (ringkas)
- `categories` (id, slug, name_id, name_en, sort)
- `products` (id, slug, type[thrift|merch], category_id, name_id/en, description_id/en, price, compare_at_price, condition_score, condition_note_id/en, measurements jsonb, status[draft|active|archived], created_at)
- `product_images` (id, product_id, path, alt, sort)
- `variants` (id, product_id, size_label, sku, stock_on_hand, reserved)
- `orders` (id, code, access_token_hash, status, locale, customer_name, email, phone, address jsonb, note, subtotal, shipping_cost, courier, unique_code, total, shipping_quoted_at, payment_deadline, paid_at, tracking_number, shipped_at, cancel_reason, created_at)
- `order_items` (id, order_id, variant_id, product snapshot: name, size, price, image, qty)
- `payment_proofs` (id, order_id, path, uploaded_at, status, reviewed_by, review_note)
- `stock_movements` (id, variant_id, type, qty, order_id, actor_id, note, created_at)
- `staff` (user_id, name, role[owner|staff], active)
- `settings` (key, value jsonb)
- `contact_messages`, `audit_logs`, `notifications_log`

Harga disimpan sebagai **integer rupiah** (bukan float atau string "1800k").

## 10. Desain

- **Ciri khas yang dipertahankan:** wordmark "Only*Pants*" (biru + italic), maskot ilustrasi hero, dan foto lifestyle streetwear.
- **Arah visual:** tema gelap streetwear dengan aksen biru yang lebih tegas.
  - Primary `#3944BC`, accent `#52B1FF`, base `#0B0D12`, surface `#151922`.
  - Tipografi: Poppins dipertahankan untuk body. Heading memakai display font yang lebih bold/condensed (finalisasi di mockup).
- Kartu produk konsisten (rasio 4:5) dengan badge kondisi, ukuran, dan SOLD OUT.
- Harga diformat `Rp 1.800.000` (ID) atau `IDR 1,800,000` (EN).
- Deliverable desain: mockup beranda, katalog, detail, checkout, halaman order, dan admin order. Di-review owner sebelum M2.

## 11. Rencana rilis

| Milestone | Isi | Kriteria selesai |
|---|---|---|
| **M0 Setup** | Repo Next.js, Tailwind, shadcn, next-intl, Supabase project, Drizzle schema + migrasi, CI, deploy Vercel | Halaman kosong live di Vercel, `/id` dan `/en` jalan |
| **M1 Katalog** | Beranda, katalog, detail, seed 10 produk lama, desain final | Semua produk lama tampil benar di kedua bahasa, Lighthouse mobile ≥ 90 |
| **M2 Cart + Checkout** | Cart drawer, checkout, reservasi stok atomik, halaman order | Uji paralel: 2 checkout bersamaan untuk item qty 1, hanya 1 yang berhasil |
| **M3 Pembayaran** | Input ongkir, kode unik, QRIS, upload bukti, verifikasi, expiry | Alur penuh sampai `DIBAYAR` dan `KEDALUWARSA` lolos uji E2E |
| **M4 Admin** | Produk/stok/order/settings/staff/laporan, role owner vs staff | Staff tidak bisa membuka halaman/aksi khusus owner (diuji) |
| **M5 Notifikasi** | Email + WA sesuai tabel 6.3 | Setiap event mengirim notif dan tercatat di `notifications_log` |
| **M6 Launch** | Halaman statis, SEO, a11y, QA lintas perangkat, backup | Checklist QA hijau, domain/URL final aktif |

## 12. Risiko

| Risiko | Mitigasi |
|---|---|
| **Vercel Hobby hanya untuk penggunaan non-komersial** (ToS) | Mulai di Hobby. Siapkan migrasi ke Pro saat mulai ramai, tanpa perubahan kode |
| Supabase free di-pause setelah 7 hari tanpa aktivitas | Vercel Cron harian melakukan query ringan (keep-alive) |
| Batas free tier (Resend 100 email/hari, kuota optimasi gambar Vercel) | Cukup untuk volume awal. Pantau di dashboard |
| QRIS statis: customer salah input nominal | Kode unik + tombol salin + peringatan jelas. Admin bisa approve manual dengan catatan selisih |
| Admin lambat memberi ongkir sehingga customer batal | Notif instan ke admin + indikator SLA di dashboard + auto-cancel 48 jam |
| Bukti bayar palsu | Verifikasi wajib dicocokkan dengan mutasi, bukan hanya dari gambar |

## 13. Fase berikutnya
- **Fase 2:** voucher/diskon, ongkir otomatis (Biteship/RajaOngkir), WA otomatis penuh, notifikasi "drop baru".
- **Fase 3:** QRIS dinamis via Midtrans/Xendit (verifikasi otomatis via webhook), akun customer, wishlist.

## 14. Open questions
| # | Pertanyaan | Status / keputusan |
|---|---|---|
| Q1 | Domain | **Belum ada.** Pakai `*.vercel.app`. Email dikirim via SMTP Gmail toko (Nodemailer). Pindah ke Resend saat domain dibeli |
| Q2 | WA otomatis berbayar atau tombol manual? | Default: tombol WA manual di admin (adapter siap untuk provider otomatis) |
| Q3 | File QRIS statis + nama merchant | **Dummy** (QR placeholder bertanda "CONTOH"). Diganti owner via Pengaturan sebelum launch |
| Q4 | Data produk | **Dummy**, harga dari estimasi pasar (lampiran A). Diedit via admin |
| Q5 | Kebijakan retur/refund | Default: thrift tidak menerima retur kecuali barang tidak sesuai deskripsi |
| Q6 | Akun admin + nomor WA toko | **Dummy:** `owner@onlypants.test`, `staff@onlypants.test`, WA `6281200000000` |
| Q7 | Jam operasional admin | Default 09.00–21.00 WIB |

## Lampiran A — Data produk dummy (seed)

Estimasi harga berdasarkan riset pasar thrift Indonesia (Okt 2026). Barang thrift di pasar umum Rp 50–150 rb, toko *curated* online streetwear/vintage umumnya Rp 250 rb–1 jt+, tergantung kelangkaan dan kondisi. Semua angka di bawah ini **dummy dan bisa diedit** di admin.

| Produk | Kategori | Tipe | Ukuran (dummy) | Stok | Harga | Harga coret |
|---|---|---|---|---|---|---|
| Brown Graphic Cargo | Pants | thrift | W32 L31 | 1 | Rp 650.000 | Rp 850.000 |
| Artwork Painted Jeans | Pants | thrift | W30 L30 | 1 | Rp 750.000 | — |
| Brown Double-Knee Carpenter | Pants | thrift | W34 L30 | 1 | Rp 450.000 | — |
| Black Faded Wide Jeans | Pants | thrift | W31 L32 | 1 | Rp 350.000 | Rp 425.000 |
| OnlyPants Gray Sweatpants | Pants | merch | S/M/L/XL | 4/6/6/3 | Rp 249.000 | Rp 299.000 |
| Distressed Metal Cargo | Pants | thrift | W30 L32 | 1 | Rp 850.000 | — |
| Vintage Peanuts Snapback | Accessories | merch | All Size | 3 | Rp 225.000 | Rp 275.000 |
| "Thrill Ride" Messenger Bag | Accessories | thrift | One Size | 1 | Rp 275.000 | Rp 350.000 |
| Chunky Tassel Loafers | Footwear | thrift | EU 42 | 1 | Rp 750.000 | Rp 950.000 |
| Vintage A-2 Leather Jacket | Outerwear | thrift | L | 1 | Rp 950.000 | Rp 1.250.000 |
| Mohair Plaid Cardigan | Outerwear | thrift | M | 1 | Rp 425.000 | — |

`foto product 1.jpg` (foto kopi) tidak dipakai karena tidak relevan.
