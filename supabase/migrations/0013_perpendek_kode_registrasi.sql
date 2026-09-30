-- Migration 0013: perpendek kode_registrasi yang SUDAH ADA dari 16 -> 8 karakter
--
-- generateKode() di src/app/api/panel-zakat/lembaga/route.ts dan
-- .../[id]/regenerate-kode/route.ts sudah diturunkan ke 8 karakter
-- (2026-09-30) -- kode ini sering harus dibacakan/diketik manual oleh amil
-- yang belum tentu terbiasa nyalin kode acak panjang. Tapi itu cuma
-- mempengaruhi kode yang BARU digenerate ke depannya. Migration ini
-- nyamain kode-kode yang SUDAH ADA (dibuat sebelum perubahan itu, masih
-- 16 karakter) biar semuanya konsisten 8 karakter.
--
-- CATATAN KEAMANAN: endpoint /api/registrasi/validate-kode masih belum
-- punya rate limit. 8 karakter (32^8 =~ 1,1 triliun kombinasi) itu marginnya,
-- bukan jaminan selamanya -- jangan diturunkan lagi tanpa nambah rate limit
-- dulu. Lihat komentar lengkap di api/panel-zakat/lembaga/route.ts.
--
-- PERINGATAN SEBELUM RUN: sama seperti tombol "Generate Ulang" di
-- panel-zakat, ini bikin SEMUA kode lama (punya SEMUA lembaga sekaligus)
-- langsung tidak berlaku. Kalau kebetulan ada calon amil yang PAS SAAT INI
-- sedang isi kode lama buat daftar, pendaftarannya akan gagal. Sebaiknya
-- dijalankan pas nggak ada yang sedang proses registrasi.

-- Generator sementara, cuma buat migrasi satu kali ini -- VOLATILE supaya
-- benar-benar dievaluasi ulang per baris (bukan sekali lalu dipakai buat
-- semua baris; ini gotcha yang sama yang pernah ketemu di seed 36 masjid).
create or replace function public._regenerasi_kode_8() returns text
language sql volatile as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1), ''
  )
  from generate_series(1, 8);
$$;

-- Kalau baris ini kebetulan gagal karena "duplicate key" (dua kode acak
-- kebetulan sama -- kemungkinannya nyaris nol di 1,1 triliun kombinasi buat
-- cuma puluhan baris), cukup jalankan ulang UPDATE ini saja, kode barunya
-- pasti beda lagi karena di-generate ulang tiap kali dipanggil.
update public.kode_registrasi
set kode = public._regenerasi_kode_8(),
    updated_at = now();

-- Fungsi ini cuma dipakai buat migrasi ini -- dibuang lagi setelah dipakai
-- biar gak numpuk fungsi temporer di database. Beda dari
-- public._seed_buat_kode() di supabase/seed_lembaga_cibubur.sql yang
-- sengaja DIBIARKAN untuk kemungkinan reseed di masa depan.
drop function if exists public._regenerasi_kode_8();
