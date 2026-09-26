-- Jalankan file ini manual di Supabase SQL Editor, SETELAH 0008 berhasil.
--
-- Menambah kolom `slug` di tabel lembaga -- dipakai buat URL tenant-scoped
-- (myzakat.id/nama-lembaga/dashboard dst). Slug murni kosmetik/navigasi;
-- akses data tetap di-scope lewat lembaga_id yang di-resolve dari
-- profil_amil di server (RLS + middleware), BUKAN dipercaya dari slug
-- di URL begitu saja -- middleware yang mencocokkan slug URL dengan
-- lembaga_id amil yang login sebelum halaman dirender.

alter table public.lembaga
  add column if not exists slug text;

-- Backfill lembaga yang sudah ada: slug dari nama (lowercase, spasi/simbol
-- jadi strip, rapikan strip ganda & di ujung).
update public.lembaga
set slug = trim(both '-' from regexp_replace(lower(nama), '[^a-z0-9]+', '-', 'g'))
where slug is null;

-- Kalau ada 2+ lembaga yang nama-nya menghasilkan slug persis sama, kasih
-- suffix id (selalu unik) ke semuanya yang bentrok.
update public.lembaga l
set slug = l.slug || '-' || l.id::text
where exists (
  select 1 from public.lembaga l2
  where l2.slug = l.slug and l2.id <> l.id
);

alter table public.lembaga alter column slug set not null;
alter table public.lembaga add constraint lembaga_slug_key unique (slug);

-- RPC bikin-lembaga diganti: sekarang generate & pastikan slug unik sendiri
-- (loop tambah suffix -2, -3, dst kalau bentrok), dan balikin slug-nya juga.
-- Return type berubah (nambah kolom slug) jadi harus drop dulu, gak bisa
-- langsung create-or-replace.
drop function if exists public.admin_create_lembaga_with_kode(text, text, text, text);

create or replace function public.admin_create_lembaga_with_kode(
  p_nama text, p_alamat text, p_satuan_beras text, p_kode text, p_slug_dasar text
) returns table (lembaga_id bigint, kode text, slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lembaga_id bigint;
  v_slug text;
  v_suffix int := 0;
begin
  loop
    v_slug := case when v_suffix = 0 then p_slug_dasar else p_slug_dasar || '-' || v_suffix end;
    -- Alias `l` WAJIB di sini. `returns table (... slug text)` bikin `slug`
    -- jadi variabel OUT, jadi `where slug = ...` tanpa alias dianggap ambigu
    -- oleh PL/pgSQL dan fungsinya error saat DIJALANKAN (bukan saat dibuat).
    exit when not exists (select 1 from public.lembaga l where l.slug = v_slug);
    v_suffix := v_suffix + 1;
  end loop;

  insert into public.lembaga (nama, alamat, satuan_beras, slug)
  values (p_nama, p_alamat, p_satuan_beras, v_slug)
  returning id into v_lembaga_id;

  insert into public.kode_registrasi (lembaga_id, kode)
  values (v_lembaga_id, p_kode);

  return query select v_lembaga_id, p_kode, v_slug;
end;
$$;
