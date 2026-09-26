-- Jalankan file ini manual di Supabase SQL Editor.
-- Menambah 2 kolom di tabel lembaga supaya amil bisa kustomisasi
-- berat beras per jiwa dan harga beras per kg untuk zakat fitrah.
-- Nilai default sesuai standar BAZNAS yang sudah dipakai sebelumnya
-- (2.5 kg per jiwa, Rp 18.000/kg -> setara Rp 45.000/jiwa).

alter table public.lembaga
  add column if not exists zakat_fitrah_kg numeric not null default 2.5,
  add column if not exists harga_beras_per_kg numeric not null default 18000;
