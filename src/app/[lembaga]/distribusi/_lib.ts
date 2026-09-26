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

// Bagi `total` rata ke `n` orang dalam kelipatan satuan terkecil `unit`
// (1 buat rupiah, 0.01 buat beras) -- SEMUA orang dapat jatah floor dulu,
// terus sisa yang gak abis dibagi rata dilempar +1 unit terkecil secara ACAK
// ke sejumlah orang (tanpa duplikat), supaya total yang tersalur PERSIS sama
// dengan `total` -- tidak ada recehan yang nyangkut jadi saldo.
export function bagiHabis(total: number, n: number, unit: number): number[] {
  if (n <= 0) return []
  const unitTotal = Math.round(total / unit)
  const base = Math.floor(unitTotal / n)
  const sisaUnit = unitTotal - base * n

  const hasilUnit = new Array(n).fill(base)
  const indeks = Array.from({ length: n }, (_, i) => i)
  for (let i = indeks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indeks[i], indeks[j]] = [indeks[j], indeks[i]]
  }
  for (let i = 0; i < sisaUnit; i++) hasilUnit[indeks[i]] += 1

  return hasilUnit.map(u => Math.round(u * unit * 100) / 100)
}

export type SatuanBeras = 'kg' | 'liter'

// Rasio kepadatan beras (standar BAZNAS: 2.5 kg = 3.5 liter) — nilai fisik, tetap.
// Sama dengan konstanta di halaman Profil. jumlah_beras SELALU disimpan dalam Kg
// di database; konversi ke liter cuma buat tampilan & input sesuai satuan lembaga.
const LITER_PER_KG = 3.5 / 2.5 // = 1.4 liter per kg

// kg tersimpan -> nilai untuk ditampilkan/diinput sesuai satuan lembaga
export function kgKeSatuan(kg: number, satuan: SatuanBeras) {
  return satuan === 'liter' ? kg * LITER_PER_KG : kg
}
// nilai dalam satuan lembaga -> kg untuk disimpan ke database
export function satuanKeKg(nilai: number, satuan: SatuanBeras) {
  return satuan === 'liter' ? nilai / LITER_PER_KG : nilai
}
export function labelSatuanBeras(satuan: SatuanBeras) {
  return satuan === 'liter' ? 'Liter' : 'Kg'
}

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
