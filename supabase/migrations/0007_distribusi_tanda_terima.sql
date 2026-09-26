-- Jalankan file ini manual di Supabase SQL Editor, SETELAH 0006 berhasil.
--
-- Melengkapi tanda terima: sekarang "Tandai Diterima" bukan cuma toggle, tapi
-- lewat form kecil yang catat SIAPA yang menerima (bisa beda dari mustahik/
-- anggota terdaftar, misal dititipkan ke tetangga/wakil) plus tanda tangan
-- digital sederhana (gambar hasil canvas, disimpan sebagai data URL base64)
-- sebagai bukti validitas. diterima_at (dari migration 0006) tetap dipakai
-- buat timestamp kapan form ini disubmit.

alter table public.distribusi_zakat
  add column if not exists diterima_oleh text,
  add column if not exists tanda_tangan text;
