-- Jalankan file ini manual di Supabase SQL Editor, SETELAH 0009 berhasil.
--
-- Info rekening bank lembaga -- ditampilkan ke amil (lewat pop up) setiap
-- transaksi dicatat dengan metode "Transfer Bank", supaya amil punya
-- referensi rekening tujuan yang benar buat divalidasi/diteruskan ke muzakki.
-- Diatur amil sendiri lewat halaman Profil.

alter table public.lembaga
  add column if not exists nama_bank text,
  add column if not exists nomor_rekening text,
  add column if not exists atas_nama_rekening text;
