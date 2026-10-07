import type { Locale } from "./i18n/config";

type Page = { title: string; sections: { h?: string; p: string[] }[] };

// Store policies. Drafted as sensible defaults (PRD Q5) — the owner should review before launch.
export const HELP: Record<string, Record<Locale, Page>> = {
  "how-to-buy": {
    id: {
      title: "Cara belanja & bayar",
      sections: [
        { h: "1. Pilih barang", p: ["Cek ukuran detail (cm) dan skor kondisi di halaman produk. Barang thrift cuma ada 1, jadi siapa cepat dia dapat.", "Masukkan ke keranjang, lalu klik Checkout."] },
        { h: "2. Checkout", p: ["Isi nama, email, nomor WhatsApp, dan alamat lengkap. Tidak perlu bikin akun.", "Setelah pesanan dibuat, barang langsung kami tahan untuk kamu."] },
        { h: "3. Tunggu konfirmasi ongkir", p: ["Admin menghitung ongkir sesuai alamat dan mengirim total bayar lewat WhatsApp & email, biasanya dalam beberapa jam di jam operasional.", "Total bayar sudah termasuk kode unik 3 digit supaya pembayaranmu gampang dicocokkan."] },
        { h: "4. Bayar via QRIS", p: ["Buka halaman pesanan, scan QRIS dengan e-wallet atau m-banking apa pun, lalu masukkan nominal PERSIS sesuai yang tertera.", "Batas bayar 24 jam sejak ongkir dikirim. Lewat dari itu pesanan otomatis batal."] },
        { h: "5. Upload bukti bayar", p: ["Upload screenshot bukti bayar di halaman pesanan. Kami verifikasi lalu kemas pesananmu.", "Nomor resi dikirim lewat WhatsApp & email begitu paket berangkat."] },
      ],
    },
    en: {
      title: "How to buy & pay",
      sections: [
        { h: "1. Pick your items", p: ["Check the measurements (cm) and condition score on each product page. Thrift pieces are one of one — first come, first served.", "Add to cart, then click Checkout."] },
        { h: "2. Checkout", p: ["Enter your name, email, WhatsApp number, and full address. No account needed.", "Once you place the order, we hold the items for you."] },
        { h: "3. Wait for the shipping quote", p: ["Our admin calculates shipping for your address and sends the total via WhatsApp & email, usually within a few hours during opening hours.", "The total includes a 3-digit unique code so we can match your payment easily."] },
        { h: "4. Pay with QRIS", p: ["Open your order page, scan the QRIS with any e-wallet or mobile banking app, and enter EXACTLY the amount shown.", "You have 24 hours after the quote is sent. After that the order is cancelled automatically."] },
        { h: "5. Upload your payment proof", p: ["Upload a screenshot on the order page. We verify it and pack your order.", "The tracking number is sent via WhatsApp & email once it ships."] },
      ],
    },
  },
  "size-guide": {
    id: {
      title: "Panduan ukuran",
      sections: [
        { p: ["Semua ukuran diukur flat (barang diletakkan rata di meja) dalam sentimeter, toleransi ±1 cm.", "Label ukuran (W30, M, dll.) di barang thrift bisa beda antar brand. Selalu cocokkan dengan ukuran detail, bukan labelnya."] },
        { h: "Celana", p: ["Lingkar pinggang: lebar pinggang flat × 2.", "Panjang: dari pinggang atas sampai ujung bawah.", "Inseam: dari selangkangan sampai ujung bawah.", "Paha & lebar bawah: lebar flat di bagian tersebut."] },
        { h: "Atasan & jaket", p: ["Lebar dada (pit to pit): dari ketiak kiri ke ketiak kanan.", "Panjang: dari bahu tertinggi sampai ujung bawah.", "Panjang lengan: dari jahitan bahu sampai ujung lengan."] },
        { h: "Tips", p: ["Ukur celana favoritmu dengan cara yang sama lalu bandingkan. Ragu? Chat kami di WhatsApp, kami bantu cek."] },
      ],
    },
    en: {
      title: "Size guide",
      sections: [
        { p: ["All measurements are taken flat (garment laid on a table) in centimetres, ±1 cm.", "Size tags (W30, M, etc.) on vintage pieces vary by brand. Always go by the measurements, not the tag."] },
        { h: "Pants", p: ["Waist: flat waist width × 2.", "Length: from the top of the waistband to the hem.", "Inseam: from the crotch seam to the hem.", "Thigh & leg opening: flat width at those points."] },
        { h: "Tops & jackets", p: ["Pit to pit: armpit to armpit.", "Length: from the highest point of the shoulder to the hem.", "Sleeve: from the shoulder seam to the cuff."] },
        { h: "Tip", p: ["Measure your favourite pair the same way and compare. Not sure? Chat with us on WhatsApp and we'll help."] },
      ],
    },
  },
  returns: {
    id: {
      title: "Kebijakan retur",
      sections: [
        { p: ["Karena setiap barang thrift unik dan sudah dideskripsikan lengkap (ukuran, kondisi, minus), kami tidak menerima retur karena salah ukuran atau berubah pikiran."] },
        { h: "Kami terima retur/refund jika", p: ["Barang yang diterima berbeda dengan yang dipesan.", "Ada kerusakan besar yang tidak disebutkan di deskripsi."] },
        { h: "Caranya", p: ["Hubungi kami via WhatsApp maksimal 2×24 jam setelah paket diterima, sertakan kode pesanan dan video unboxing.", "Setelah dicek, kami tukar atau refund penuh termasuk ongkir."] },
      ],
    },
    en: {
      title: "Returns policy",
      sections: [
        { p: ["Every thrift piece is unique and fully described (measurements, condition, flaws), so we don't accept returns for wrong size or change of mind."] },
        { h: "We accept returns/refunds when", p: ["You received a different item from what you ordered.", "There is major damage that wasn't mentioned in the description."] },
        { h: "How", p: ["Contact us on WhatsApp within 48 hours of receiving the parcel, with your order code and an unboxing video.", "Once checked, we exchange or refund in full, shipping included."] },
      ],
    },
  },
  faq: {
    id: {
      title: "FAQ",
      sections: [
        { h: "Barangnya asli dan bersih?", p: ["Setiap barang kami pilih, cek, dan cuci sebelum difoto. Kondisi dan minus ditulis jujur di halaman produk."] },
        { h: "Kenapa ongkir tidak langsung muncul?", p: ["Kami hitung manual supaya dapat kurir dan tarif terbaik untuk alamatmu. Total dikirim lewat WhatsApp & email."] },
        { h: "Kenapa ada kode unik di total bayar?", p: ["QRIS kami statis, jadi kode unik 3 digit membantu kami mencocokkan pembayaranmu secara tepat. Bayar persis sesuai nominal ya."] },
        { h: "Sudah bayar tapi lupa upload bukti?", p: ["Buka lagi halaman pesanan dari link di email/WhatsApp, atau lewat menu Cek Pesanan, lalu upload."] },
        { h: "Bisa COD atau ambil di toko?", p: ["Saat ini belum ada COD. Untuk ambil di toko, tulis di catatan saat checkout dan kami konfirmasi."] },
        { h: "Barang di keranjang tiba-tiba hilang?", p: ["Barang thrift hanya 1. Kalau sudah dibeli orang lain, otomatis terhapus dari keranjangmu."] },
      ],
    },
    en: {
      title: "FAQ",
      sections: [
        { h: "Are the items authentic and clean?", p: ["We pick, check, and wash every piece before photographing it. Condition and flaws are listed honestly on the product page."] },
        { h: "Why isn't shipping shown at checkout?", p: ["We calculate it manually to get the best courier and rate for your address. The total is sent via WhatsApp & email."] },
        { h: "Why is there a unique code in the total?", p: ["Our QRIS is static, so a 3-digit unique code lets us match your payment exactly. Please pay the exact amount."] },
        { h: "Paid but forgot to upload the proof?", p: ["Open the order page again from the link in your email/WhatsApp, or via Track Order, and upload it."] },
        { h: "Cash on delivery or pickup?", p: ["No COD for now. For pickup, mention it in the order note and we'll confirm."] },
        { h: "An item disappeared from my cart?", p: ["Thrift pieces are one of one. If someone else bought it first, it's removed from your cart automatically."] },
      ],
    },
  },
  privacy: {
    id: {
      title: "Kebijakan privasi",
      sections: [
        { p: ["Kami mengumpulkan nama, email, nomor WhatsApp, dan alamat hanya untuk memproses dan mengirim pesananmu, sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi."] },
        { h: "Yang kami simpan", p: ["Data pesanan, bukti bayar (disimpan privat dan hanya bisa dilihat admin), dan riwayat komunikasi terkait pesanan.", "Kami tidak pernah meminta atau menyimpan data kartu, PIN, atau OTP."] },
        { h: "Dengan siapa dibagikan", p: ["Hanya dengan kurir pengiriman (nama, nomor telepon, alamat). Kami tidak menjual data ke pihak mana pun."] },
        { h: "Hak kamu", p: ["Kamu bisa meminta salinan atau penghapusan datamu kapan saja dengan menghubungi kami. Bukti bayar dihapus otomatis setelah 90 hari."] },
      ],
    },
    en: {
      title: "Privacy policy",
      sections: [
        { p: ["We collect your name, email, WhatsApp number, and address only to process and ship your order, in line with Indonesia's Personal Data Protection Law (UU 27/2022)."] },
        { h: "What we store", p: ["Order data, payment proofs (stored privately, visible only to our admins), and order-related messages.", "We never ask for or store card details, PINs, or OTPs."] },
        { h: "Who we share it with", p: ["Only the shipping courier (name, phone, address). We never sell your data."] },
        { h: "Your rights", p: ["You can request a copy or deletion of your data at any time by contacting us. Payment proofs are deleted automatically after 90 days."] },
      ],
    },
  },
  terms: {
    id: {
      title: "Syarat & ketentuan",
      sections: [
        { h: "Pesanan", p: ["Pesanan sah setelah pembayaran terverifikasi. Barang ditahan maksimal 48 jam menunggu ongkir dan 24 jam menunggu pembayaran; lewat dari itu pesanan batal otomatis."] },
        { h: "Harga & pembayaran", p: ["Harga dalam Rupiah dan dapat berubah sewaktu-waktu. Pembayaran hanya melalui QRIS resmi OnlyPants yang tampil di halaman pesanan. Bayar sesuai nominal yang tertera termasuk kode unik."] },
        { h: "Kondisi barang", p: ["Barang thrift adalah barang bekas pakai. Kondisi dan minus dijelaskan di deskripsi dan foto."] },
        { h: "Pengiriman", p: ["Pesanan dikirim maksimal 2 hari kerja setelah pembayaran terverifikasi. Risiko keterlambatan dari pihak kurir di luar kendali kami."] },
        { h: "Pembatalan", p: ["Pembatalan setelah bayar mengikuti Kebijakan Retur. Refund diproses manual ke rekening/e-wallet pembeli."] },
      ],
    },
    en: {
      title: "Terms & conditions",
      sections: [
        { h: "Orders", p: ["An order is confirmed once payment is verified. Items are held for up to 48 hours awaiting the shipping quote and 24 hours awaiting payment; after that the order is cancelled automatically."] },
        { h: "Prices & payment", p: ["Prices are in Indonesian Rupiah and may change. Payment is only via the official OnlyPants QRIS shown on your order page. Pay the exact amount including the unique code."] },
        { h: "Item condition", p: ["Thrift items are pre-owned. Condition and flaws are described in the text and photos."] },
        { h: "Shipping", p: ["Orders ship within 2 business days after payment is verified. Courier delays are outside our control."] },
        { h: "Cancellation", p: ["Cancellations after payment follow the Returns policy. Refunds are processed manually to the buyer's bank account or e-wallet."] },
      ],
    },
  },
};
