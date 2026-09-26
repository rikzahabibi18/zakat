-- Jalankan file ini manual di Supabase SQL Editor, SETELAH 0010 berhasil.
--
-- "No. Transaksi" di struk sekarang per-lembaga mulai dari 1 (bukan id
-- global tabel transaksi yang di-share semua lembaga) -- lembaga baru yang
-- baru pertama kali transaksi bakal nampilin #01, bukan lanjut dari angka
-- lembaga lain. `id` asli TETAP dipakai apa adanya untuk keperluan internal
-- (RLS, URL /konfirmasi/[id] di QRIS) -- kolom baru ini murni buat tampilan.

-- Tabel counter internal -- satu baris per lembaga, nyimpen nomor urut
-- transaksi terakhir yang sudah dipakai. TIDAK PERNAH diakses langsung dari
-- client (RLS enabled, nol policy = default-deny total, sama seperti
-- kode_registrasi) -- cuma trigger SECURITY DEFINER di bawah yang boleh
-- baca/tulis.
create table public.lembaga_transaksi_counter (
  lembaga_id bigint primary key references public.lembaga(id) on delete cascade,
  counter    bigint not null default 0
);
alter table public.lembaga_transaksi_counter enable row level security;

alter table public.transaksi
  add column if not exists nomor_urut bigint;

-- Backfill data lama: nomor urut per lembaga berdasarkan urutan id (urutan
-- waktu insert, karena id auto-increment).
with numbered as (
  select id, row_number() over (partition by lembaga_id order by id) as rn
  from public.transaksi
  where lembaga_id is not null
)
update public.transaksi t
set nomor_urut = numbered.rn
from numbered
where t.id = numbered.id;

-- Inisialisasi counter sesuai nomor tertinggi yang sudah kepakai per lembaga,
-- supaya transaksi berikutnya lanjut dari situ (bukan mulai dari 1 lagi).
insert into public.lembaga_transaksi_counter (lembaga_id, counter)
select lembaga_id, max(nomor_urut)
from public.transaksi
where lembaga_id is not null
group by lembaga_id
on conflict (lembaga_id) do update set counter = excluded.counter;

-- Trigger: assign nomor_urut otomatis tiap insert baru. Atomik per-lembaga
-- lewat UPSERT (insert ... on conflict do update ... returning) -- ini
-- pattern standar Postgres yang aman dari race condition kalau dua transaksi
-- untuk lembaga yang sama kebetulan disimpan nyaris bersamaan.
create or replace function public.assign_nomor_transaksi_lembaga()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next bigint;
begin
  if new.lembaga_id is null then
    return new;
  end if;

  insert into public.lembaga_transaksi_counter (lembaga_id, counter)
  values (new.lembaga_id, 1)
  on conflict (lembaga_id) do update set counter = lembaga_transaksi_counter.counter + 1
  returning counter into v_next;

  new.nomor_urut := v_next;
  return new;
end;
$$;

drop trigger if exists trg_assign_nomor_transaksi_lembaga on public.transaksi;
create trigger trg_assign_nomor_transaksi_lembaga
  before insert on public.transaksi
  for each row
  execute function public.assign_nomor_transaksi_lembaga();
