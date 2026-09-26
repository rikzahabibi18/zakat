import { createClient } from '@/utils/supabase/client'

export type Jenis = 'Zakat Mal' | 'Zakat Fitrah'

export interface SesiRow {
  key: string
  mustahik_id: number
  anggota_id: number | null
  namaKeluarga: string
  nama: string
  peran: string
  jumlah_uang: number
  jumlah_beras: number
}

export interface Sesi {
  id: number
  jenis: Jenis
  total_uang: number
  total_beras: number
  jumlah_penerima: number
  tanggal: string
  amil_pencatat: string | null
}

interface OrangMustahik {
  mustahik_id: number
  anggota_id: number | null
  namaKeluarga: string
  nama: string
  peran: string
}

export function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}
export function formatTanggal(iso: string) {
  return new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
export function formatInput(val: string) {
  const digits = val.replace(/\D/g, '')
  return digits ? Number(digits).toLocaleString('id-ID') : ''
}
export function parseInput(val: string) { return Number(val.replace(/\D/g, '')) }

// Pecah tiap mustahik jadi baris per-ORANG: kepala keluarga + tiap anggota
// keluarganya masing-masing jadi satu entri sendiri (bukan satu entri per
// keluarga lagi) -- supaya bisa dihitung & diedit per-individu.
export async function hitungOrangMustahik(supabase: ReturnType<typeof createClient>) {
  const { data: mustahikRows } = await supabase.from('mustahik').select('id, nama').order('nama')
  const { data: anggotaRows } = await supabase.from('anggota_keluarga_mustahik').select('id, mustahik_id, nama, hubungan')

  const anggotaByMustahik = new Map<number, { id: number; nama: string; hubungan: string }[]>()
  for (const a of anggotaRows ?? []) {
    const list = anggotaByMustahik.get(a.mustahik_id) ?? []
    list.push({ id: a.id, nama: a.nama, hubungan: a.hubungan })
    anggotaByMustahik.set(a.mustahik_id, list)
  }

  const people: OrangMustahik[] = []
  for (const m of mustahikRows ?? []) {
    people.push({ mustahik_id: m.id, anggota_id: null, namaKeluarga: m.nama, nama: m.nama, peran: 'Kepala Keluarga' })
    for (const a of anggotaByMustahik.get(m.id) ?? []) {
      people.push({ mustahik_id: m.id, anggota_id: a.id, namaKeluarga: m.nama, nama: a.nama, peran: a.hubungan })
    }
  }
  return { people, totalJiwa: people.length }
}
