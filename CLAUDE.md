# CLAUDE.md — Zakat App Project Context

> File ini dibaca otomatis oleh Claude Code setiap sesi.
> Letakkan di root folder `zakat-app/`.

---

## 🗂️ Project Overview

**Nama:** Zakat App  
**Tujuan:** Admin panel untuk pengelolaan zakat, infaq, sedekah, dan fidyah oleh amil (administrator masjid/lembaga zakat).  
**Target pengguna:** Amil (admin lembaga), bukan muzakki/mustahik secara langsung.  
**Status:** Aktif dikembangkan — demo milestone terdekat, target scale ke multi-tenant enterprise.

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 15/16 (App Router) |
| Language | TypeScript (strict) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Authorization | Supabase Row Level Security (RLS) |
| Styling | Inline styles (`React.CSSProperties`), disusun lewat design system internal `src/styles/tokens.ts` + `src/styles/shared/` (selesai direfactor 2026-08-26) — migrasi ke CSS Modules masih direncanakan setelah fitur selesai |
| Deployment | Vercel |
| Dev OS | Windows |
| PDF | jsPDF |
| Excel | `exceljs` — semua baca/tulis lewat `src/utils/excel.ts` (lihat "Excel" di bawah) |
| Linting | ESLint 9, flat config (`eslint.config.mjs`), `eslint-config-next` |

---

## 🏛️ Domain Entities

### Entitas Utama

| Entitas | Deskripsi |
|---------|-----------|
| `lembaga` | Institusi/organisasi zakat (unit multi-tenancy) |
| `amil` | Administrator yang mengelola lembaga |
| `muzakki` | Pembayar zakat |
| `mustahik` | Penerima zakat (8 asnaf) |

### Jenis Transaksi

| Jenis | Keterangan |
|-------|------------|
| Zakat Mal | Zakat harta — dihitung 2.5% dari nisab |
| Zakat Fitrah | Zakat jiwa — 3 mode: per jiwa (Rp), nominal bebas, atau beras (kg/liter) |
| Infaq/Sedekah | Donasi sukarela tanpa nisab |
| Fidyah | Pengganti puasa — dihitung per hari |

---

## 🗄️ Database Schema (Supabase)

### Tabel Penting

```
lembaga          — id, nama, alamat, satuan_beras (kg|liter), ...
amil             — id, lembaga_id, user_id (FK ke auth.users), nama, ...
muzakki          — id, lembaga_id, nama, alamat, no_hp, ...
mustahik         — id, lembaga_id, nama, kategori_asnaf, ...
transaksi        — id, lembaga_id, muzakki_id, jenis, jumlah_uang, jumlah_beras, ...
```

### Multi-Tenancy via RLS
- Semua tabel punya kolom `lembaga_id`
- RLS policy memastikan setiap amil hanya bisa akses data `lembaga`-nya sendiri
- `lembaga_id` di-resolve dari session user → tabel `amil` → `lembaga_id`

---

## 📐 Arsitektur & Pola Kode

### Struktur Folder (App Router)
```
app/
  [lembaga]/          ← dynamic segment slug lembaga -- SEMUA halaman amil ada
                        di bawah sini sekarang (myzakat.id/nama-lembaga/dashboard dst)
    dashboard/
    muzakki/
    mustahik/
    profil/
    transaksi/
      tambah/
        fidyah/ infaq/ zakat-fitrah/ zakat-mal/
    distribusi/
      _lib.ts         ← tipe & helper lokal khusus fitur distribusi (bukan shared/ global)
      [id]/           ← detail sesi: status penerimaan per orang + tanda terima
  login/              ← TIDAK di bawah [lembaga] -- belum tau slug amil sebelum login
  register/           ← sama, alur kode registrasi
  konfirmasi/[id]/    ← halaman PUBLIK (tanpa Sidebar), dibuka muzakki setelah scan QR
  panel-zakat/        ← super admin, TIDAK terikat lembaga manapun, tetap top-level
  api/
    harga-emas/       ← proxy route untuk Gold Price API (bypass CORS)
components/
  Sidebar.tsx
  QRConfirmModal.tsx
  StrukModal.tsx
hooks/
  useIsMobile.ts      ← satu-satunya custom hook bersama di project ini (lihat "Deteksi Mobile")
styles/
  tokens.ts           ← nilai mentah: colors, font, radius, shadow, gradient, spacing
  shared/              ← style siap pakai (lihat section Design System di bawah)
utils/
  supabase/
    client.ts         ← Supabase client-side
    server.ts         ← Supabase server-side (SSR)
```
> Catatan: tidak ada route group `(dashboard)` atau `lib/supabaseClient.ts` — struktur di atas yang aktual per 2026-09-26 (URL tenant-scoped `[lembaga]` baru ditambahkan tanggal ini, lihat "URL Tenant-Scoped" di bawah).

### URL Tenant-Scoped (`/[lembaga]/...`)
- `lembaga.slug` (kolom baru, migration `0009`) itu murni buat navigasi/kosmetik URL — **BUKAN** sumber otorisasi. Akses data tetap di-scope lewat `lembaga_id` yang di-resolve dari `profil_amil` di server (RLS), persis seperti sebelumnya.
- `middleware.ts` yang jaga konsistensinya: tiap request ke halaman tenant (`dashboard`, `transaksi`, `muzakki`, `mustahik`, `profil`, `distribusi`), middleware query `profil_amil` → `lembaga.slug` amil yang login, terus dibandingkan ke slug di URL. Kalau beda (amil coba akses/ketik slug lembaga lain), langsung di-redirect balik ke slug yang benar — path & query string-nya dipertahankan, cuma slug-nya yang dikoreksi.
- Slug lembaga baru **digenerate otomatis** dari nama saat super admin bikin lembaga (`slugify()` di `/api/panel-zakat/lembaga` + loop unique di RPC `admin_create_lembaga_with_kode` — nambah suffix `-2`, `-3`, dst kalau nama sama).
- Karena semua halaman amil sekarang butuh tau slug-nya, tiap halaman/komponen di bawah `[lembaga]/` ambil slug lewat `useParams<{ lembaga: string }>()` (bukan context/prop-drilling) — dipakai buat prefix tiap `router.push`/`Link href` internal ke halaman tenant lain.
- `login` dan `register` **sengaja tetap di luar** `[lembaga]/` — sebelum berhasil autentikasi, sistem belum tau amil ini punya slug apa. Setelah login/signup sukses, baru resolve `profil_amil → lembaga.slug` dan redirect ke `/${slug}/dashboard`. Super admin (`SUPER_ADMIN_EMAIL`) dikecualikan dari lookup ini, langsung diarahkan ke `/panel-zakat`.
- `panel-zakat` juga tetap top-level (super admin tidak terikat lembaga manapun, lihat dokumentasi lama soal ini).

### Deteksi Mobile
- **Sudah ada satu hook bersama:** `src/hooks/useIsMobile.ts`, dipakai lewat `import { useIsMobile } from '@/hooks/useIsMobile'` di semua halaman yang butuh deteksi mobile (dashboard, login, muzakki, mustahik, transaksi, transaksi/tambah + subhalamannya, distribusi + subhalamannya, profil, panel-zakat, Sidebar).
- Ini pengecualian dari prinsip "duplikasi antar halaman" yang berlaku di bagian lain codebase — layak di-share karena isinya benar-benar identik di semua tempat dan tidak ada alasan bisnis buat beda per halaman (beda dengan `formatTanggal` dkk yang sengaja diduplikasi karena berpotensi butuh nuansa per halaman).
- Breakpoint: `window.innerWidth <= 768` → mobile (konsisten di satu tempat sekarang, defaultnya `breakpoint = 768` tapi bisa di-override lewat argumen).
- Kalau nemu logic serupa (identik persis, tanpa variasi bisnis) di banyak tempat, pertimbangkan pola yang sama: tarik ke `hooks/` bukan diduplikasi lagi.

### Excel (`src/utils/excel.ts`)
- **Semua** baca/tulis Excel lewat `unduhExcel()` dan `bacaExcel()` di `src/utils/excel.ts` — jangan panggil library-nya langsung dari halaman. Pemakainya sekarang: export transaksi, export + template import + parser mustahik, export sebaran sesi distribusi.
- Dipusatkan (bukan diduplikasi per halaman seperti `formatTanggal`) dengan alasan yang sama seperti `useIsMobile`: isinya murni plumbing format file, nol nuansa bisnis, dan justru penting supaya semua file yang keluar dari sistem ini tampilannya seragam.
- `unduhExcel(namaFile, sheets)` minta `kolom: { header, width }[]` **berpasangan eksplisit**. Ini disengaja: pola lama (`xlsx` + array `!cols` posisional) pernah bikin lebar kolom tidak sejajar headernya tanpa ada error — nambah satu kolom langsung menggeser semuanya diam-diam.
- **JANGAN balik ke `xlsx` (SheetJS npm).** Dua alasan, dua-duanya sudah diuji empiris (2026-09-30):
  1. Paket `xlsx` di npm itu Community Edition — writer-nya **membuang properti style tanpa error**. Border/bold/warna latar cuma ada di SheetJS Pro (berbayar). Kodenya bisa lolos tsc & eslint tapi hasilnya polos.
  2. `xlsx@0.18.5` (versi terakhir & selamanya di npm — SheetJS pindah ke CDN sendiri) kena prototype pollution + ReDoS dengan **`fixAvailable: false`**. Dulu tidak penting karena app ini cuma *menulis* file; sejak ada import mustahik, jalur parser itu bisa dijangkau file dari user.
- `exceljs` sendiri muncul di `npm audit` sebagai moderate, tapi hanya transitif lewat `uuid` dan **tidak terjangkau**: exceljs cuma memanggil `uuidv4()` tanpa argumen di satu file conditional-formatting yang tidak dipakai, sementara advisory-nya soal `v3`/`v5`/`v6` dengan argumen `buf`. Saran `npm audit fix` di sini justru **downgrade** ke exceljs 3.4.0 — jangan diikuti.
- Warna garis tabel pakai `colors.textPlaceholder`, **bukan** `colors.border`. `colors.border` (`#EDE8E0`) pas untuk layar tapi terlalu pucat sebagai garis tabel yang ikut tercetak — contoh kasus "jangan paksa ke token terdekat" di bagian Design System.

### Pola Umum

**Filter/derived state → pakai `useMemo`, BUKAN `useState + useEffect`:**
```typescript
// ✅ BENAR
const filtered = useMemo(() =>
  data.filter(item => item.nama.includes(search)), [data, search]
);

// ❌ SALAH
const [filtered, setFiltered] = useState([]);
useEffect(() => {
  setFiltered(data.filter(...));
}, [data, search]);
```

**State reset → di event handler, BUKAN `useEffect`:**
```typescript
// ✅ BENAR
const handleClose = () => {
  setForm(initialForm);
  setIsOpen(false);
};

// ❌ SALAH
useEffect(() => {
  if (!isOpen) setForm(initialForm);
}, [isOpen]);
```

**`useSearchParams()` → wajib dibungkus `Suspense` untuk Vercel build:**
```typescript
// ✅ BENAR
export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PageContent />
    </Suspense>
  );
}
function PageContent() {
  const searchParams = useSearchParams();
  // ...
}
```

### Design System: Tokens & Shared Styles
Semua halaman & komponen sudah selesai direfactor (2026-08-26) untuk pakai sistem token internal, bukan hex/px mentah:

- **`src/styles/tokens.ts`** — nilai mentah: `colors`, `font`, `radius`, `shadow`, `gradient`, `spacing`
- **`src/styles/shared/`** — style siap pakai yang disusun dari token di atas, dipecah per kategori file (`layout.ts`, `card.ts`, `form.ts`, `button.ts`, `feedback.ts`, `modal.ts`, `table.ts`, `transaksi-form.ts`, `misc.ts`), lalu digabung jadi satu object lewat `index.ts`. Semua file konsumen tetap pakai `import { shared } from '@/styles/shared'` — pemecahan file per kategori itu murni reorganisasi internal, tidak mengubah cara pakai di halaman.
- Style yang **spesifik ke satu halaman** (bukan reusable) tetap didefinisikan lokal di object `s` pada file itu sendiri, tapi nilainya harus tetap referensi ke `tokens.ts` (`colors.primary`, bukan `'#2D7A50'`).
- Kalau ada warna/ukuran hex mentah yang kebetulan sama persis dengan token yang sudah ada, tarik ke token itu. Kalau tidak ada token yang cocok persis, boleh tetap pakai nilai mentah — jangan paksa ke token terdekat kalau nilainya beda (bisa menggeser tampilan diam-diam tanpa disadari).

### Mobile Responsiveness
- Deteksi: `useIsMobile()` hook
- Mobile: card-list view menggantikan data table
- Layout: `marginLeft`, `padding`, `flexDirection` diubah conditional
- Breakpoint: `window.innerWidth <= 768`

---

## 🔑 Alur Lupa Password

File terkait: `app/lupa-password/` (minta link), `app/reset-password/` (set password baru), `app/auth/confirm/route.ts` (verifikasi token dari email).

### Kondisi saat ini (sementara, sengaja)

Memakai **template email BAWAAN Supabase** + alur **PKCE**. Ini dipilih karena Supabase mengunci pengeditan template email selama project belum memakai custom SMTP, dan pemasangan SMTP ditunda sampai setelah rilis.

Dua keterbatasan yang **diketahui dan diterima**:
1. **Link reset harus dibuka di browser yang sama** dengan yang meminta reset — PKCE menyimpan `code_verifier` di browser tersebut. Buka di HP padahal minta di laptop = gagal. Batasan ini sudah ditulis eksplisit di UI (`/lupa-password` dan `/reset-password`) supaya amil tidak bingung.
2. **SMTP bawaan Supabase limitnya ~2-4 email/jam untuk SELURUH project.** Cukup untuk volume kecil saat rilis, tapi akan mencekik begitu ramai.

### Jalur upgrade (sudah disiapkan, tinggal aktifkan)

`app/auth/confirm/route.ts` **sudah ada dan berfungsi** — memakai pola `token_hash` + `verifyOtp` di server yang aman lintas perangkat. Route ini belum aktif karena template email belum diarahkan ke sana. Untuk mengaktifkan, **tidak perlu ubah kode sama sekali**:

1. Pasang custom SMTP (Resend/Brevo) di **Authentication → Emails → SMTP Settings**.
2. Template terbuka → **Reset password** diisi link ke `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery`.
3. Ubah `redirectTo` di `app/lupa-password/page.tsx` dari `/reset-password` jadi `/auth/confirm?next=/reset-password`.
4. Naikkan batas di **Authentication → Rate Limits**.

Semua setting di atas **per project** — staging & production terpisah.

`Authentication → URL Configuration`: Site URL = domain produksi, dan semua origin (localhost, preview Vercel, produksi) wajib terdaftar di Redirect URLs.

---

## 💳 Status Pembayaran Transaksi (WAJIB DIPATUHI)

`transaksi.status` menentukan apakah sebuah transaksi dihitung sebagai **dana nyata** atau belum:

- `'terkonfirmasi'` → dana sudah diterima, **ikut dihitung**.
- `'pending'` → dana **belum** diterima, **TIDAK boleh ikut dihitung** di manapun.

**Aturan mutlak:** setiap query yang menjumlahkan uang/beras dari tabel `transaksi` **WAJIB** memfilter `.eq('status', 'terkonfirmasi')`. Berlaku untuk Dashboard, saldo Distribusi, laporan, export — apa pun yang menghasilkan angka rupiah/kg. Kalau lupa, dana yang belum dibayar akan terhitung sebagai uang masuk dan (lebih bahaya lagi) bisa ikut didistribusikan ke mustahik.

Siapa yang `pending` saat dicatat:
- **QRIS & Transfer Bank** → `'pending'`. Dua-duanya sama-sama tidak bisa diverifikasi otomatis oleh sistem: QRIS statis (gambar upload, bukan QRIS dinamis dari payment gateway) dan transfer bank sama-sama baru sebatas "amil kasih info tujuan pembayaran", bukan bukti dana benar-benar sudah masuk. Konfirmasi selalu manual oleh amil lewat tombol di halaman Transaksi setelah cek mutasi/rekening. `RekeningModal` (Transfer Bank) dan `QrisModal` (QRIS) sama-sama menampilkan pesan "Status transaksi: Belum dibayar" setelah disimpan.
- **Tunai, Beras** → langsung `'terkonfirmasi'` (uang/barang fisik diterima saat itu juga, keputusan user 2026-09-27; Transfer Bank diperluas ke pending pada 2026-09-28).

Default kolom di DB sudah diset `'terkonfirmasi'`, tapi tiap `insert` transaksi tetap mengirim `status` eksplisit supaya niatnya terbaca jelas di kode.

> Catatan: halaman `/konfirmasi/[id]` (alur lama muzakki scan QR untuk konfirmasi sendiri) sudah **tidak di-link dari manapun** sejak QRIS diganti gambar statis. Halamannya masih ada dan bisa diakses via URL langsung.

---

## 💰 Kalkulasi Bisnis (Zakat Fitrah)

```
BAZNAS Reference Rate:
- Per jiwa    : Rp 45.000
- Beras       : 2.5 kg per jiwa
- Konversi    : 2.5 kg = 3.5 liter

Satuan beras dikonfigurasi per lembaga (kg atau liter)
→ disimpan di kolom `lembaga.satuan_beras`

Selalu simpan KEDUANYA ke DB:
- jumlah_uang  (nilai rupiah)
- jumlah_beras (nilai dalam kg, konversi jika input liter)
```

---

## 🔌 External API

### Gold Price API (Harga Emas untuk Nisab Zakat Mal)
- Diakses via **proxy route** Next.js: `/api/harga-emas`
- Alasan: CORS block jika diakses langsung dari browser
- Pattern: semua external API yang CORS-sensitif harus lewat `/api/...`

---

## 🧹 ESLint & Code Quality

### Setup
```bash
# Gunakan ini, BUKAN `next lint`
eslint .

# ESLint versi
ESLint 9 (flat config)
File config: eslint.config.mjs
```

### Aturan Disable yang Diizinkan
Gunakan `// eslint-disable-next-line` dengan komentar alasan — **jangan blanket suppression**:
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps — intentional: only run on mount
useEffect(() => { fetchData(); }, []);
```

---

## 🚫 Hal yang JANGAN Dilakukan

1. **Jangan rewrite full file** kalau hanya butuh perubahan kecil — edit targeted saja
2. **Jangan pakai `useEffect` untuk derived state** — gunakan `useMemo`
3. **Jangan reset state di `useEffect`** — lakukan di event handler
4. **Jangan akses external API langsung dari client** — proxy via `/api/...`
5. **Jangan skip RLS** — semua query Supabase harus aman dengan `lembaga_id`
6. **Jangan refactor CSS/styling** sebelum semua fitur selesai — *(update 2026-08-26: pengecualian sudah dilakukan atas permintaan eksplisit user — seluruh app sudah dipindah ke sistem `tokens.ts` + `shared/`. Aturan ini tetap berlaku untuk migrasi CSS Modules berikutnya.)*
7. **Jangan tambah dependency baru** tanpa konfirmasi
8. **Jangan campur `border` (shorthand) dengan `borderColor` (longhand) untuk style yang di-toggle** (misal tombol aktif/nonaktif) — kalau `borderColor` cuma ditambahkan di varian aktif lalu dihapus saat nonaktif, React kadang gagal reset warnanya di DOM karena nilai `border` tidak berubah antar render, border lama jadi "nempel" secara visual. Selalu tulis `border` penuh (`border: '2px solid warna'`) di kedua varian.

---

## ✅ Prioritas Pengerjaan

```
1. 🔴 Fitur baru / bug fix          ← prioritas utama
2. 🟡 ESLint & code quality         ← paralel, subordinat
3. 🟢 CSS Modules migration         ← defer sampai fitur complete
4. 🔵 Penetration testing & security ← sebelum production launch
```

---

## 🔐 Security Notes

- Security adalah **non-negotiable** sebelum production
- Setiap fitur baru harus mempertimbangkan implikasi RLS
- Penetration testing menyeluruh direncanakan sebelum go-live
- Jangan surface-level fix — fix harus ke akar masalah

---

## 📝 Cara Kerja yang Disukai

- Berikan **hanya file yang berubah**, bukan full project dump
- Identifikasi **baris/section spesifik** sebelum melakukan perubahan
- Jelaskan **"kenapa"** di balik setiap fix, bukan hanya "apa"
- Kalau ada ambiguitas, **tanya dulu** sebelum eksekusi
- Gunakan Bahasa Indonesia untuk komunikasi

---

*Last updated: 2026-09-30 — import mustahik dari Excel (termasuk anggota keluarga), dan `xlsx` diganti `exceljs` lewat `src/utils/excel.ts`; lihat "Excel" di atas. Sebelumnya (2026-09-27): QRIS diganti gambar statis yang di-upload amil (Supabase Storage bucket `qris`), dan `transaksi.status` sekarang menentukan apakah dana dihitung. Sebelumnya (2026-09-26): URL tenant-scoped `/[lembaga]/...`.*
