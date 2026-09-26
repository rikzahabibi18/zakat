-- Jalankan file ini manual di Supabase SQL Editor, SETELAH 0011 berhasil.
--
-- Dua hal sekaligus:
--   1. Bikin kolom `status` transaksi BENAR-BENAR bermakna secara finansial.
--      Sebelum ini `status` cuma diisi/dibaca di halaman /konfirmasi/[id] dan
--      TIDAK pernah difilter di perhitungan uang manapun -- artinya transaksi
--      yang belum dibayar tetap terhitung sebagai uang terkumpul & langsung
--      bisa didistribusikan. Mulai sekarang Dashboard & saldo Distribusi cuma
--      menghitung yang `terkonfirmasi`.
--   2. Tempat simpan gambar QRIS statis milik lembaga (di-upload amil lewat
--      halaman Profil), buat ditampilkan pas metode pembayaran QRIS dipilih.

-- ── 1. Backfill status data lama ────────────────────────────────────────
-- WAJIB dijalankan sebelum filter status dipasang di aplikasi. Semua baris
-- lama diperlakukan sebagai SUDAH SAH -- kalau tidak, 62 transaksi historis
-- (yang selama ini sudah masuk hitungan dashboard & sudah diaudit) bakal
-- mendadak hilang dari semua total begitu filter aktif.
update public.transaksi
set status = 'terkonfirmasi'
where status is distinct from 'terkonfirmasi';

-- Mulai sekarang default-nya eksplisit 'terkonfirmasi'. Hanya QRIS yang
-- dikirim sebagai 'pending' dari aplikasi (lihat handleSave tiap halaman
-- transaksi) -- metode lain (Tunai, Transfer Bank, Beras) dianggap lunas
-- saat dicatat.
alter table public.transaksi
  alter column status set default 'terkonfirmasi';

-- ── 2. Gambar QRIS per lembaga ──────────────────────────────────────────
alter table public.lembaga
  add column if not exists qris_image_url text;

-- Bucket publik: isi QRIS memang buat dipajang & discan siapa saja (sama
-- seperti QRIS yang ditempel di dinding masjid), jadi tidak ada rahasia di
-- dalamnya. Yang dibatasi cuma siapa yang boleh MENG-UPLOAD.
insert into storage.buckets (id, name, public)
values ('qris', 'qris', true)
on conflict (id) do nothing;

-- Baca: siapa saja (termasuk anon) -- supaya <img src> jalan tanpa signed URL.
drop policy if exists "QRIS publik bisa dibaca" on storage.objects;
create policy "QRIS publik bisa dibaca"
  on storage.objects for select
  using (bucket_id = 'qris');

-- Tulis/ubah/hapus: hanya amil yang login, DAN hanya di folder lembaga-nya
-- sendiri (path: {lembaga_id}/qris.png). Jadi amil lembaga A tidak bisa
-- menimpa QRIS lembaga B.
drop policy if exists "Amil upload QRIS lembaga sendiri" on storage.objects;
create policy "Amil upload QRIS lembaga sendiri"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'qris'
    and (storage.foldername(name))[1] = (
      select lembaga_id::text from public.profil_amil where id = auth.uid()
    )
  );

drop policy if exists "Amil ubah QRIS lembaga sendiri" on storage.objects;
create policy "Amil ubah QRIS lembaga sendiri"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'qris'
    and (storage.foldername(name))[1] = (
      select lembaga_id::text from public.profil_amil where id = auth.uid()
    )
  );

drop policy if exists "Amil hapus QRIS lembaga sendiri" on storage.objects;
create policy "Amil hapus QRIS lembaga sendiri"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'qris'
    and (storage.foldername(name))[1] = (
      select lembaga_id::text from public.profil_amil where id = auth.uid()
    )
  );
