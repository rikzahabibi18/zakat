# SiZakat — Sistem Manajemen Zakat

Aplikasi web untuk amil zakat dalam mencatat dan mengelola zakat mal, zakat fitrah, dan infaq.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Database & Auth:** Supabase (PostgreSQL + Auth)
- **Bahasa:** TypeScript
- **Styling:** Inline styles + CSS Variables

## Struktur Proyek

```
src/
├── app/
│   ├── login/            # Halaman masuk untuk Amil
│   ├── dashboard/        # Ringkasan total zakat & infaq
│   ├── transaksi/        # Riwayat semua transaksi
│   │   └── tambah/       # Form input transaksi cepat
│   ├── muzakki/          # Data pembayar zakat (CRUD)
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Design tokens & reset
├── components/
│   ├── Sidebar.tsx       # Navigasi sidebar
│   └── ui/               # Komponen reusable (Button, Card, dll)
└── utils/
    └── supabase/
        ├── client.ts     # Supabase browser client
        └── server.ts     # Supabase server client (Server Components)
```

## Setup

### 1. Install dependencies

```bash
npm install
npm install @supabase/supabase-js @supabase/ssr
```

### 2. Konfigurasi environment

Buat file `.env.local` di root project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Skema database Supabase

Jalankan SQL berikut di Supabase SQL Editor:

```sql
-- Tabel Muzakki (pembayar zakat)
CREATE TABLE muzakki (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  alamat TEXT,
  no_hp TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Transaksi
CREATE TYPE jenis_zakat AS ENUM ('mal', 'fitrah', 'infaq');
CREATE TYPE metode_bayar AS ENUM ('tunai', 'transfer');
CREATE TYPE satuan_fitrah AS ENUM ('uang', 'beras');

CREATE TABLE transaksi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  muzakki_id UUID REFERENCES muzakki(id),
  jenis jenis_zakat NOT NULL,
  jumlah_uang DECIMAL(15,2),       -- untuk mal, infaq, atau fitrah uang
  jumlah_beras DECIMAL(8,2),       -- kg, untuk fitrah beras
  metode metode_bayar NOT NULL DEFAULT 'tunai',
  catatan TEXT,
  tanggal TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE muzakki ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi ENABLE ROW LEVEL SECURITY;

-- Policy: hanya user yang login bisa akses
CREATE POLICY "Amil dapat melihat semua muzakki"
  ON muzakki FOR SELECT TO authenticated USING (true);

CREATE POLICY "Amil dapat mengelola muzakki"
  ON muzakki FOR ALL TO authenticated USING (true);

CREATE POLICY "Amil dapat melihat semua transaksi"
  ON transaksi FOR SELECT TO authenticated USING (true);

CREATE POLICY "Amil dapat mengelola transaksi"
  ON transaksi FOR ALL TO authenticated USING (true);
```

### 4. Jalankan development server

```bash
npm run dev
```

Buka [http://localhost:3000/login](http://localhost:3000/login)

## Fitur yang Direncanakan

- [x] Halaman login amil
- [x] Sidebar navigasi
- [x] Dashboard: total zakat mal, fitrah (uang + beras), infaq
- [x] Form input transaksi cepat
- [x] Riwayat transaksi dengan filter
- [x] Manajemen data muzakki
- [x] Export laporan (PDF/Excel)
