-- Jalankan file ini manual di Supabase SQL Editor, SETELAH 0004 berhasil.
--
-- Sebelumnya distribusi_zakat cuma nyimpen per-mustahik (per-keluarga).
-- Sekarang ditambah kolom anggota_id -- NULL berarti baris ini mewakili
-- kepala keluarga (si mustahik sendiri), terisi berarti mewakili anggota
-- keluarga tertentu. Ini bikin tiap ORANG (bukan cuma tiap keluarga) bisa
-- punya nominal sendiri, termasuk kalau amil sengaja kasih beda-beda antar
-- anggota dalam satu keluarga.

alter table public.distribusi_zakat
  add column if not exists anggota_id bigint references public.anggota_keluarga_mustahik(id) on delete set null;

-- RPC diganti body-nya supaya terima anggota_id per item.
-- Signature (nama & tipe parameter) tetap sama seperti 0004, jadi aman
-- di-"create or replace" tanpa perlu drop function dulu.
create or replace function public.create_sesi_distribusi(
  p_jenis text,
  p_total_uang numeric,
  p_total_beras numeric,
  p_lembaga_id bigint,
  p_amil_pencatat text,
  p_items jsonb -- array of { mustahik_id, anggota_id (boleh null), jumlah_uang, jumlah_beras }
) returns bigint
language plpgsql
as $$
declare
  v_sesi_id bigint;
  v_item jsonb;
begin
  insert into public.sesi_distribusi (jenis, total_uang, total_beras, jumlah_penerima, lembaga_id, amil_pencatat)
  values (p_jenis, p_total_uang, p_total_beras, jsonb_array_length(p_items), p_lembaga_id, p_amil_pencatat)
  returning id into v_sesi_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.distribusi_zakat (sesi_id, mustahik_id, anggota_id, jumlah_uang, jumlah_beras, lembaga_id)
    values (
      v_sesi_id,
      (v_item->>'mustahik_id')::bigint,
      nullif(v_item->>'anggota_id', '')::bigint,
      coalesce((v_item->>'jumlah_uang')::numeric, 0),
      coalesce((v_item->>'jumlah_beras')::numeric, 0),
      p_lembaga_id
    );
  end loop;

  return v_sesi_id;
end;
$$;
