-- ⚠️ JALANKAN SEKALI SAJA. Ini bukan migrasi skema, tapi seed data lembaga
-- (36 masjid/musholla wilayah Cibubur) supaya tidak perlu input satu-satu
-- lewat panel super admin.
--
-- Aman kalau tidak sengaja dijalankan dua kali: ada guard NOT EXISTS yang
-- mencocokkan nama + alamat, jadi run kedua tidak menghasilkan apa-apa
-- (0 baris), bukan 36 lembaga duplikat.
--
-- Seluruhnya satu statement atomik -- kalau ada satu baris gagal, semuanya
-- dibatalkan, tidak ada lembaga setengah jadi tanpa kode registrasi.
--
-- HASILNYA: tabel berisi nama, slug, dan KODE REGISTRASI tiap lembaga.
-- Simpan/copy hasil itu -- kode registrasi inilah yang dibagikan ke amil
-- masing-masing masjid supaya mereka bisa daftar sendiri lewat /register.

-- Pembuat kode registrasi. WAJIB fungsi terpisah bertanda `volatile`:
-- PostgreSQL menjamin fungsi volatile dipanggil ulang untuk SETIAP baris.
-- Versi sebelumnya memakai LATERAL yang tidak berkorelasi dengan tabel luar,
-- sehingga planner boleh mengevaluasinya sekali saja dan memberi kode yang
-- SAMA ke semua lembaga -- langsung kena unique constraint di baris kedua.
--
-- Alfabet 16 karakter tanpa 0/O/1/I, sama persis dengan generateKode()
-- di src/app/api/panel-zakat/lembaga/route.ts.
create or replace function public._seed_buat_kode() returns text
language sql volatile as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1), ''
  )
  from generate_series(1, 16);
$$;

with masukan(no, nama, alamat) as (
  values
    (1,  'Masjid Baiturrahman',    'Jl. Cibubur I No.1 RT.001 RW.001 Cibubur'),
    (2,  'Masjid Umar Bin Khotob', 'Jl. Cibubur IV No.29 RT.005 RW.02 Cibubur'),
    (3,  'Masjid Al Barokah',      'Jl. Cibubur II No.1 RT.012 RW.02 Cibubur'),
    (4,  'Masjid Al Muhibbah',     'Jl. Cibubur 2 RT.001 RW.03 Cibubur'),
    (5,  'Masjid At Taubah',       'Jl. SMUN RT.011 RW.03 Cibubur'),
    (6,  'Masjid Fathul Ghofur',   'Jl. Masjid No.4 RT.002 RW.04 Cibubur'),
    (7,  'Masjid Nurul Fathonah',  'Jl. H. Abdurrahman RT.016 RW.05 Cibubur'),
    (8,  'Masjid Al Muttaqin',     'Jl. Taruna Jaya RT.008 RW.05 Cibubur'),
    (9,  'Masjid Al Istiqomah',    'Jl. Masjid RT.001 RW.06 Cibubur'),
    (10, 'Masjid Al Ikhlas',       'Kav. DPRD DKI Jakarta, Blok J-5 Cibubur'),
    (11, 'Masjid Darul Ulum',      'Jl. Kumis Kucing III RT.002 RW.97 Cibubur (Komp. KPAD)'),
    (12, 'Masjid Nurul Huda',      'Jl. Sambiroto Raya RT.010 RW.08 Cibubur (Komp. KPAD)'),
    (13, 'Masjid An Nur',          'Jl. Cibubur VIII RT.002 RW.09 Cibubur'),
    (14, 'Masjid Tanzilul Huda',   'Jl. Cibubur II RT.014 RW.010 Cibubur'),
    (15, 'Masjid Al Ittihad',      'Jl. Argopuro Bukit Permai Cibubur'),
    (16, 'Masjid Al Ikhlas',       'Jl. Jambore, Komplek Cibubur Indah Villa'),
    (17, 'Masjid Al Ikhlas',       'Perumahan Cibubur Indah III RT.005 RW.011 Cibubur'),
    (18, 'Masjid Nurul Huda',      'Jl. Cibubur I RT.003 RW.012 Cibubur'),
    (19, 'Masjid An Nur',          'Jl. Raya PKP RT.009 RW.012 Cibubur'),
    (20, 'Masjid Baitussalam',     'Jl. Elit RT.007 RW.12 Cibubur'),
    (21, 'Masjid Al Amin',         'Cibubur VIII RT.008 RW.013 Cibubur'),
    (22, 'Masjid Bilal Bin Robah', 'Jl. Taruna Jaya RT.002 RW.013 Cibubur'),
    (23, 'Masjid Ar Ridho',        'Jl. Taruna Jaya RT.003 RW.013 Cibubur'),
    (24, 'Masjid Al Khoiriyyah',   'Jl. Taruna Jaya RT.004 RW.013 Cibubur'),
    (25, 'Masjid At Taqwa',        'Jl. H. Abdurrahman RT.002 RW.014 Cibubur'),
    (26, 'Masjid Al Wahyu',        'Jl. Madrasah No.24 RT.004 RW.014 Cibubur'),
    (27, 'Masjid Miftahul Jannah', 'Jl. Ramitor RT.008 RW.014 Cibubur'),
    (28, 'Masjid Al Mukhlisin',    'Jl. Mualim Aminudin RT.006 RW.014 Cibubur'),
    (29, 'Masjid Pemuda Cibubur',  'Jl. Jambore Raya No.1 Cibubur'),
    (30, 'Masjid Bahrul Ulum',     'Jl. Jambore Raya No.9 Cibubur (Sekolah Al Azhar)'),
    (31, 'Masjid Al Fajr',         'Jl. Kunjin No.4 RT.004 RW.014 Cibubur'),
    (32, 'Musholla Al Karomah',    'RT.001 RW.013 Cibubur'),
    (33, 'Musholla Al Ihsan',      'RT.005 RW.013 Cibubur'),
    (34, 'Musholla Nurul Hidayah', 'RT.006 RW.013 Cibubur'),
    (35, 'Masjid Al Mukhlisin',    'RT.002 RW.05 Cibubur'),
    (36, 'Masjid Arrahman',        'RT.05 RW.08 Cibubur (Komp. KPAD)')
),

-- Slug dibentuk dengan aturan yang PERSIS sama dengan slugify() di
-- src/app/api/panel-zakat/lembaga/route.ts: huruf kecil, karakter non
-- alfanumerik jadi strip, strip di ujung dibuang.
dasar as (
  select
    no, nama, alamat,
    trim(both '-' from regexp_replace(lower(nama), '[^a-z0-9]+', '-', 'g')) as slug_dasar
  from masukan
),

-- Penomoran slug harus memperhitungkan DUA sumber bentrokan:
--   1. Nama kembar di dalam daftar ini sendiri -- ada 4 kelompok
--      (Al Ikhlas x3, Nurul Huda x2, An Nur x2, Al Mukhlisin x2).
--   2. Slug yang SUDAH ADA di tabel lembaga (misal lembaga hasil uji coba
--      lewat panel super admin). Ini yang sempat bikin skrip gagal total:
--      "Masjid Al-Amin" yang sudah ada dan "Masjid Al Amin" di daftar ini
--      sama-sama menghasilkan slug `masjid-al-amin`.
--
-- Regex `^dasar-[0-9]+$` dipakai supaya yang terhitung hanya slug bernomor
-- dari basis yang sama -- `masjid-al-ikhlas-2` ikut, tapi slug lain yang
-- kebetulan berawalan sama seperti `masjid-al-ikhlas-jambore` tidak.
bernomor as (
  select
    d.*,
    row_number() over (partition by d.slug_dasar order by d.no)
      + (
        select count(*)
        from public.lembaga l
        where l.slug = d.slug_dasar
           or l.slug ~ ('^' || d.slug_dasar || '-[0-9]+$')
      ) as urutan
  from dasar d
),

final as (
  select
    no, nama, alamat,
    case when urutan = 1 then slug_dasar else slug_dasar || '-' || urutan end as slug
  from bernomor
),

lembaga_baru as (
  insert into public.lembaga (nama, alamat, satuan_beras, slug)
  select f.nama, f.alamat, 'kg', f.slug
  from final f
  where not exists (
    select 1 from public.lembaga l
    where l.nama = f.nama and coalesce(l.alamat, '') = coalesce(f.alamat, '')
  )
  returning id, nama, slug
),

kode_baru as (
  insert into public.kode_registrasi (lembaga_id, kode)
  select lb.id, public._seed_buat_kode()
  from lembaga_baru lb
  returning lembaga_id, kode
)

select
  lb.nama              as "Nama Lembaga",
  lb.slug              as "Slug (URL)",
  kb.kode              as "Kode Registrasi"
from lembaga_baru lb
join kode_baru kb on kb.lembaga_id = lb.id
order by lb.nama;

-- CATATAN: fungsi bantu `public._seed_buat_kode()` sengaja TIDAK di-drop di
-- file ini. Kalau `drop` ditaruh di sini, dia jadi statement terakhir dan
-- editor SQL cuma menampilkan hasil statement terakhir -- tabel kode
-- registrasi di atas jadi tidak terlihat, padahal itu output terpentingnya.
--
-- Setelah kode registrasi tersalin, jalankan ini TERPISAH untuk bersih-bersih:
--   drop function if exists public._seed_buat_kode();
