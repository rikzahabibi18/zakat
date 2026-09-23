-- Jalankan file ini manual di Supabase SQL Editor, SETELAH 0007 berhasil.
--
-- Melengkapi form tanda terima: selain nama & tanda tangan, amil juga catat
-- STATUS orang yang benar-benar menerima relatif ke mustahik/anggota terdaftar
-- (Kepala Keluarga / Istri / Anak / Saudara / Perwakilan) -- karena yang
-- menerima di lapangan kadang bukan orang yang sama persis dengan yang
-- terdaftar di sistem.

alter table public.distribusi_zakat
  add column if not exists status_penerima text;
