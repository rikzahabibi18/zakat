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
  dashboard/
  login/
  muzakki/
  mustahik/
  profil/
  transaksi/
    tambah/
      fidyah/ infaq/ zakat-fitrah/ zakat-mal/
  konfirmasi/[id]/    ← halaman PUBLIK (tanpa Sidebar), dibuka muzakki setelah scan QR
  distribusi/
    _lib.ts           ← tipe & helper lokal khusus fitur distribusi (bukan shared/ global)
    [id]/             ← detail sesi: status penerimaan per orang + tanda terima
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
> Catatan: tidak ada route group `(dashboard)` atau `lib/supabaseClient.ts` — struktur di atas yang aktual per 2026-09-18 (folder `hooks/` baru ditambahkan tanggal ini, lihat di bawah).

### Deteksi Mobile
- **Sudah ada satu hook bersama:** `src/hooks/useIsMobile.ts`, dipakai lewat `import { useIsMobile } from '@/hooks/useIsMobile'` di semua halaman yang butuh deteksi mobile (dashboard, login, muzakki, mustahik, transaksi, transaksi/tambah + subhalamannya, distribusi + subhalamannya, profil, panel-zakat, Sidebar).
- Ini pengecualian dari prinsip "duplikasi antar halaman" yang berlaku di bagian lain codebase — layak di-share karena isinya benar-benar identik di semua tempat dan tidak ada alasan bisnis buat beda per halaman (beda dengan `formatTanggal` dkk yang sengaja diduplikasi karena berpotensi butuh nuansa per halaman).
- Breakpoint: `window.innerWidth <= 768` → mobile (konsisten di satu tempat sekarang, defaultnya `breakpoint = 768` tapi bisa di-override lewat argumen).
- Kalau nemu logic serupa (identik persis, tanpa variasi bisnis) di banyak tempat, pertimbangkan pola yang sama: tarik ke `hooks/` bukan diduplikasi lagi.

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

*Last updated: 2026-09-18 — `useIsMobile` dikonsolidasi jadi satu hook bersama di `src/hooks/useIsMobile.ts` (sebelumnya duplikat manual di 13+ file); lihat "Deteksi Mobile" di atas.*
