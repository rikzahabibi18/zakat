-- Jalankan file ini manual di Supabase SQL Editor, SETELAH 0005 berhasil.
--
-- Sesi yang sudah "terkunci" (create_sesi_distribusi) cuma berarti alokasinya
-- sudah tercatat di sistem -- bukan berarti barangnya/uangnya sudah benar-benar
-- diserahkan ke mustahik/anggota keluarga secara fisik. Kolom ini dipakai amil
-- buat centang manual per-orang begitu penyerahan beneran terjadi di lapangan.

alter table public.distribusi_zakat
  add column if not exists sudah_diterima boolean not null default false,
  add column if not exists diterima_at timestamptz;
