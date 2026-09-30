'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { unduhExcel, bacaExcel } from '@/utils/excel'
import { createClient } from '@/utils/supabase/client'
import { useIsMobile } from '@/hooks/useIsMobile'
import Sidebar from '@/components/Sidebar'
import { shared } from '@/styles/shared'
import { colors, font, radius } from '@/styles/tokens'

interface Mustahik {
  id: number
  nama: string
  golongan: string
  nomor_hp: string | null
  alamat: string | null
  keterangan: string | null
  created_at: string
}

interface AnggotaKeluarga {
  id: number
  mustahik_id: number
  nama: string
  hubungan: string
  created_at: string
}

// ── Import Excel ──────────────────────────────────────────
// Satu baris Excel = satu ORANG. Barisnya dikelompokkan pakai konvensi yang
// sama dengan hasil export: baris dengan kolom "Nama Kepala Keluarga" terisi
// membuka keluarga baru, baris di bawahnya yang kolom itu KOSONG dianggap
// anggota keluarga dari kepala keluarga terakhir.
interface ImportAnggota {
  nama: string
  hubungan: string
}

interface ImportGroup {
  baris: number // nomor baris di file Excel, dipakai buat pesan error
  nama: string
  golongan: string
  nomor_hp: string
  alamat: string
  keterangan: string
  anggota: ImportAnggota[]
}

const HUBUNGAN_LIST = ['Istri', 'Suami', 'Anak', 'Orang Tua', 'Saudara', 'Lainnya']

const GOLONGAN_LIST = [
  { value: 'Fakir',        label: 'Fakir',        desc: 'Tidak memiliki harta dan pekerjaan' },
  { value: 'Miskin',       label: 'Miskin',       desc: 'Memiliki harta tapi tidak mencukupi' },
  { value: 'Amil',         label: 'Amil',         desc: 'Pengelola dan pengurus zakat' },
  { value: 'Mualaf',       label: 'Mualaf',       desc: 'Orang yang baru masuk Islam' },
  { value: 'Riqab',        label: 'Riqab',        desc: 'Hamba sahaya yang ingin memerdekakan diri' },
  { value: 'Gharimin',     label: 'Gharimin',     desc: 'Orang yang terlilit hutang' },
  { value: 'Fisabilillah', label: 'Fisabilillah', desc: 'Pejuang di jalan Allah' },
  { value: 'Ibnu Sabil',   label: 'Ibnu Sabil',   desc: 'Musafir yang kehabisan bekal' },
]

const GOLONGAN_COLOR: Record<string, { bg: string; color: string }> = {
  'Fakir':        { bg: colors.dangerBg,   color: colors.danger },
  'Miskin':       { bg: '#FFF7ED',         color: '#C2410C' },
  'Amil':         { bg: colors.primaryLight, color: colors.primaryDark },
  'Mualaf':       { bg: colors.blueBg,     color: colors.blue },
  'Riqab':        { bg: colors.purpleBg,   color: colors.purple },
  'Gharimin':     { bg: '#FDF4FF',         color: '#A21CAF' },
  'Fisabilillah': { bg: colors.goldBg,     color: colors.gold },
  'Ibnu Sabil':   { bg: '#F0FDF4',         color: '#15803D' },
}

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function exportToExcel(data: Mustahik[], supabase: ReturnType<typeof createClient>) {
  const ids = data.map(m => m.id)
  const { data: anggotaRows } = ids.length
    ? await supabase.from('anggota_keluarga_mustahik').select('*').in('mustahik_id', ids)
    : { data: [] as AnggotaKeluarga[] }

  const anggotaByMustahik = new Map<number, AnggotaKeluarga[]>()
  for (const a of anggotaRows ?? []) {
    const list = anggotaByMustahik.get(a.mustahik_id) ?? []
    list.push(a)
    anggotaByMustahik.set(a.mustahik_id, list)
  }

  const rows: Record<string, string | number>[] = []
  let no = 1
  for (const m of data) {
    const anggota = anggotaByMustahik.get(m.id) ?? []
    const jumlahJiwa = 1 + anggota.length

    // Golongan/Alamat/Keterangan/Terdaftar tetap diulang di tiap baris (masih relevan per baris).
    // Cuma Nama Kepala Keluarga, Nomor HP, dan Jumlah Jiwa yang dikosongkan di baris anggota —
    // dianggap sudah jelas masih satu kelompok dengan baris kepala keluarga di atasnya.
    const infoKeluarga = {
      'Golongan': m.golongan,
      'Alamat': m.alamat ?? '',
      'Keterangan': m.keterangan ?? '',
      'Terdaftar': formatTanggal(m.created_at),
    }

    rows.push({
      'No': no++,
      'Nama Kepala Keluarga': m.nama,
      ...infoKeluarga,
      'Nomor HP': m.nomor_hp ?? '',
      'Jumlah Jiwa': jumlahJiwa,
      'Nama Anggota': m.nama,
      'Hubungan': 'Kepala Keluarga',
    })
    for (const a of anggota) {
      rows.push({
        'No': no++,
        'Nama Kepala Keluarga': '',
        ...infoKeluarga,
        'Nomor HP': '',
        'Jumlah Jiwa': '',
        'Nama Anggota': a.nama,
        'Hubungan': a.hubungan,
      })
    }
  }

  const tanggal = new Date().toLocaleDateString('id-ID').replace(/\//g, '-')
  await unduhExcel(`mustahik-${tanggal}.xlsx`, [{
    nama: 'Mustahik',
    kolom: [
      { header: 'No', width: 5 },
      { header: 'Nama Kepala Keluarga', width: 25 },
      { header: 'Golongan', width: 15 },
      { header: 'Alamat', width: 30 },
      { header: 'Keterangan', width: 30 },
      { header: 'Terdaftar', width: 15 },
      { header: 'Nomor HP', width: 16 },
      { header: 'Jumlah Jiwa', width: 12 },
      { header: 'Nama Anggota', width: 25 },
      { header: 'Hubungan', width: 16 },
    ],
    baris: rows,
  }])
}

function downloadTemplateImport() {
  // Nama kolom sengaja dibuat subset dari kolom hasil export, supaya file hasil
  // "Export Excel" bisa langsung dipakai balik sebagai bahan import tanpa diedit —
  // kolom turunan di export (No, Terdaftar, Jumlah Jiwa) diabaikan oleh parser.
  const contoh = [
    { 'Nama Kepala Keluarga': 'Budi Santoso', 'Golongan': 'Fakir',  'Nomor HP': '081234567890', 'Alamat': 'Jl. Melati No. 5', 'Keterangan': 'Rumah tidak layak huni', 'Nama Anggota': '', 'Hubungan': '' },
    { 'Nama Kepala Keluarga': '',             'Golongan': '',       'Nomor HP': '',             'Alamat': '',                 'Keterangan': '',                       'Nama Anggota': 'Siti Aminah', 'Hubungan': 'Istri' },
    { 'Nama Kepala Keluarga': '',             'Golongan': '',       'Nomor HP': '',             'Alamat': '',                 'Keterangan': '',                       'Nama Anggota': 'Ahmad Fauzi',  'Hubungan': 'Anak' },
    { 'Nama Kepala Keluarga': 'Dewi Lestari', 'Golongan': 'Miskin', 'Nomor HP': '',             'Alamat': 'Jl. Mawar No. 2',  'Keterangan': '',                       'Nama Anggota': '', 'Hubungan': '' },
  ]

  return unduhExcel('template-import-mustahik.xlsx', [
    {
      nama: 'Data Mustahik',
      kolom: [
        { header: 'Nama Kepala Keluarga', width: 25 },
        { header: 'Golongan', width: 14 },
        { header: 'Nomor HP', width: 16 },
        { header: 'Alamat', width: 28 },
        { header: 'Keterangan', width: 26 },
        { header: 'Nama Anggota', width: 22 },
        { header: 'Hubungan', width: 14 },
      ],
      baris: contoh,
    },
    {
      // Sheet kedua: daftar nilai yang sah, biar amil tidak menebak ejaan.
      nama: 'Pilihan Nilai',
      kolom: [
        { header: 'Kolom', width: 12 },
        { header: 'Nilai yang sah', width: 18 },
        { header: 'Keterangan', width: 42 },
      ],
      baris: [
        ...GOLONGAN_LIST.map(g => ({ 'Kolom': 'Golongan', 'Nilai yang sah': g.value, 'Keterangan': g.desc })),
        ...HUBUNGAN_LIST.map(h => ({ 'Kolom': 'Hubungan', 'Nilai yang sah': h, 'Keterangan': 'Hanya untuk baris anggota keluarga' })),
      ],
    },
  ])
}

async function parseImportFile(file: File): Promise<{ groups: ImportGroup[]; errors: string[] }> {
  const rows = await bacaExcel(file)
  if (rows.length === 0) return { groups: [], errors: ['File tidak punya baris data yang bisa dibaca.'] }

  const teks = (v: unknown) => String(v ?? '').trim()

  const groups: ImportGroup[] = []
  const errors: string[] = []

  rows.forEach((raw, i) => {
    const baris = i + 2 // +1 karena baris 1 adalah header, +1 karena index mulai dari 0
    const namaKK = teks(raw['Nama Kepala Keluarga'])
    const namaAnggota = teks(raw['Nama Anggota'])

    if (!namaKK && !namaAnggota) return // baris kosong — lewati tanpa protes

    if (namaKK) {
      const golongan = teks(raw['Golongan'])
      if (!GOLONGAN_LIST.some(g => g.value.toLowerCase() === golongan.toLowerCase())) {
        errors.push(`Baris ${baris}: golongan "${golongan || '(kosong)'}" tidak dikenal — lihat sheet "Pilihan Nilai" di template.`)
        return
      }
      groups.push({
        baris,
        nama: namaKK,
        // dinormalkan ke ejaan resmi supaya filter golongan di halaman ini tetap cocok
        golongan: GOLONGAN_LIST.find(g => g.value.toLowerCase() === golongan.toLowerCase())!.value,
        nomor_hp: teks(raw['Nomor HP']).replace(/\D/g, '').slice(0, 13),
        alamat: teks(raw['Alamat']),
        keterangan: teks(raw['Keterangan']),
        anggota: [],
      })
      return
    }

    // Baris anggota — harus nempel ke kepala keluarga di atasnya.
    if (groups.length === 0) {
      errors.push(`Baris ${baris}: "${namaAnggota}" ditulis sebagai anggota, tapi belum ada baris kepala keluarga di atasnya.`)
      return
    }
    const hubungan = teks(raw['Hubungan'])
    const cocok = HUBUNGAN_LIST.find(h => h.toLowerCase() === hubungan.toLowerCase())
    if (!cocok) {
      errors.push(`Baris ${baris}: hubungan "${hubungan || '(kosong)'}" tidak dikenal — pilih salah satu dari ${HUBUNGAN_LIST.join(', ')}.`)
      return
    }
    groups[groups.length - 1].anggota.push({ nama: namaAnggota, hubungan: cocok })
  })

  if (groups.length === 0 && errors.length === 0) {
    errors.push('Tidak ada data terbaca. Pastikan nama kolomnya sama dengan template (kolom "Nama Kepala Keluarga" wajib ada).')
  }

  return { groups, errors }
}

export default function MustahikPage() {
  const supabase = createClient()

  const [data, setData] = useState<Mustahik[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterGolongan, setFilterGolongan] = useState('Semua')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ nama: '', golongan: 'Fakir', nomor_hp: '', alamat: '', keterangan: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isMobile = useIsMobile()

  // Modal detail mustahik + anggota keluarga
  const [detailMustahik, setDetailMustahik] = useState<Mustahik | null>(null)
  const [anggotaList, setAnggotaList] = useState<AnggotaKeluarga[]>([])
  const [loadingAnggota, setLoadingAnggota] = useState(false)
  const [anggotaForm, setAnggotaForm] = useState({ nama: '', hubungan: 'Anak' })
  const [savingAnggota, setSavingAnggota] = useState(false)
  const [anggotaError, setAnggotaError] = useState('')
  const [exporting, setExporting] = useState(false)

  // Import Excel
  const [showImport, setShowImport] = useState(false)
  const [importFileName, setImportFileName] = useState('')
  const [importGroups, setImportGroups] = useState<ImportGroup[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importParsing, setImportParsing] = useState(false)
  const [importSaving, setImportSaving] = useState(false)
  const [importError, setImportError] = useState('')

  async function fetchData() {
    setLoading(true)
    const { data: rows } = await supabase
      .from('mustahik')
      .select('*')
      .order('golongan', { ascending: true })
      .order('nama', { ascending: true })
    setData(rows ?? [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch awal saat mount, disengaja
  useEffect(() => { fetchData() }, [])

  const filtered = useMemo(() => {
    let result = data
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(m =>
        m.nama.toLowerCase().includes(q) ||
        (m.alamat ?? '').toLowerCase().includes(q) ||
        (m.nomor_hp ?? '').includes(q)
      )
    }
    if (filterGolongan !== 'Semua') {
      result = result.filter(m => m.golongan === filterGolongan)
    }
    return result
  }, [data, search, filterGolongan])

  async function handleSave() {
    if (!form.nama.trim()) { setError('Nama wajib diisi.'); return }
    setSaving(true)
    setError('')

    if (editingId) {
      const { error: err } = await supabase.from('mustahik').update({
        nama: form.nama.trim(),
        golongan: form.golongan,
        nomor_hp: form.nomor_hp.trim() || null,
        alamat: form.alamat.trim() || null,
        keterangan: form.keterangan.trim() || null,
      }).eq('id', editingId)

      setSaving(false)
      if (err) { setError('Gagal menyimpan. Coba lagi.'); return }
      handleCloseModal()
      fetchData()
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profil } = await supabase
      .from('profil_amil').select('lembaga_id').eq('id', user!.id).single()

    const { error: err } = await supabase.from('mustahik').insert({
      nama: form.nama.trim(),
      golongan: form.golongan,
      nomor_hp: form.nomor_hp.trim() || null,
      alamat: form.alamat.trim() || null,
      keterangan: form.keterangan.trim() || null,
      lembaga_id: profil?.lembaga_id ?? null,
    })

    setSaving(false)
    if (err) { setError('Gagal menyimpan. Coba lagi.'); return }
    handleCloseModal()
    fetchData()
  }

  function handleOpenEdit(m: Mustahik) {
    setEditingId(m.id)
    setForm({
      nama: m.nama, golongan: m.golongan,
      nomor_hp: m.nomor_hp ?? '', alamat: m.alamat ?? '', keterangan: m.keterangan ?? '',
    })
    setError('')
    setShowModal(true)
  }

  function handleCloseModal() {
    setShowModal(false)
    setEditingId(null)
    setForm({ nama: '', golongan: 'Fakir', nomor_hp: '', alamat: '', keterangan: '' })
    setError('')
  }

  async function fetchAnggota(mustahikId: number) {
    setLoadingAnggota(true)
    const { data: rows } = await supabase
      .from('anggota_keluarga_mustahik')
      .select('*')
      .eq('mustahik_id', mustahikId)
      .order('created_at', { ascending: true })
    setAnggotaList(rows ?? [])
    setLoadingAnggota(false)
  }

  function handleOpenDetail(m: Mustahik) {
    setDetailMustahik(m)
    setAnggotaForm({ nama: '', hubungan: 'Anak' })
    setAnggotaError('')
    fetchAnggota(m.id)
  }

  function handleCloseDetail() {
    setDetailMustahik(null)
    setAnggotaList([])
    setAnggotaForm({ nama: '', hubungan: 'Anak' })
    setAnggotaError('')
  }

  async function handleAddAnggota() {
    if (!detailMustahik) return
    if (!anggotaForm.nama.trim()) { setAnggotaError('Nama anggota wajib diisi.'); return }

    setSavingAnggota(true)
    setAnggotaError('')

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profil } = await supabase
      .from('profil_amil').select('lembaga_id').eq('id', user!.id).single()

    const { error: err } = await supabase.from('anggota_keluarga_mustahik').insert({
      mustahik_id: detailMustahik.id,
      nama: anggotaForm.nama.trim(),
      hubungan: anggotaForm.hubungan,
      lembaga_id: profil?.lembaga_id ?? null,
    })

    setSavingAnggota(false)
    if (err) { setAnggotaError('Gagal menyimpan anggota. Coba lagi.'); return }
    setAnggotaForm({ nama: '', hubungan: 'Anak' })
    fetchAnggota(detailMustahik.id)
  }

  async function handleDeleteAnggota(id: number) {
    if (!detailMustahik) return
    await supabase.from('anggota_keluarga_mustahik').delete().eq('id', id)
    fetchAnggota(detailMustahik.id)
  }

  function handleCloseImport() {
    setShowImport(false)
    setImportFileName('')
    setImportGroups([])
    setImportErrors([])
    setImportError('')
  }

  async function handlePilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // reset, biar memilih file yang sama lagi tetap memicu onChange
    if (!file) return

    setImportParsing(true)
    setImportError('')
    setImportFileName(file.name)
    try {
      const hasil = await parseImportFile(file)
      setImportGroups(hasil.groups)
      setImportErrors(hasil.errors)
    } catch {
      setImportGroups([])
      setImportErrors([])
      setImportError('File tidak bisa dibaca. Pastikan formatnya .xlsx atau .xls.')
    }
    setImportParsing(false)
  }

  // Nama yang sudah ada di daftar — bukan error, cuma peringatan supaya amil
  // tidak diam-diam bikin mustahik kembar karena meng-import file yang sama dua kali.
  const importDuplikat = useMemo(() => {
    const existing = new Set(data.map(m => m.nama.trim().toLowerCase()))
    return new Set(importGroups.filter(g => existing.has(g.nama.toLowerCase())).map(g => g.baris))
  }, [data, importGroups])

  const importTotalJiwa = importGroups.reduce((n, g) => n + 1 + g.anggota.length, 0)

  async function handleSimpanImport() {
    if (importGroups.length === 0) return
    setImportSaving(true)
    setImportError('')

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profil } = await supabase
      .from('profil_amil').select('lembaga_id').eq('id', user!.id).single()
    const lembagaId = profil?.lembaga_id ?? null

    const { data: mustahikBaru, error: errMustahik } = await supabase
      .from('mustahik')
      .insert(importGroups.map(g => ({
        nama: g.nama,
        golongan: g.golongan,
        nomor_hp: g.nomor_hp || null,
        alamat: g.alamat || null,
        keterangan: g.keterangan || null,
        lembaga_id: lembagaId,
      })))
      .select('id')

    if (errMustahik || !mustahikBaru) {
      setImportSaving(false)
      setImportError(`Gagal menyimpan mustahik. ${errMustahik?.message ?? ''}`)
      return
    }

    // Postgres mengembalikan baris INSERT ... RETURNING dalam urutan yang sama
    // dengan urutan input, jadi hasilnya dipasangkan balik ke grup lewat index.
    const anggotaRows = importGroups.flatMap((g, i) =>
      g.anggota.map(a => ({
        mustahik_id: mustahikBaru[i].id,
        nama: a.nama,
        hubungan: a.hubungan,
        lembaga_id: lembagaId,
      }))
    )

    if (anggotaRows.length > 0) {
      const { error: errAnggota } = await supabase.from('anggota_keluarga_mustahik').insert(anggotaRows)
      if (errAnggota) {
        setImportSaving(false)
        setImportError(
          `${importGroups.length} kepala keluarga sudah tersimpan, tapi anggota keluarganya gagal (${errAnggota.message}). ` +
          'Anggota bisa ditambahkan manual dari detail tiap mustahik — jangan meng-import ulang file ini supaya tidak kembar.'
        )
        fetchData()
        return
      }
    }

    setImportSaving(false)
    handleCloseImport()
    fetchData()
  }

  const countPerGolongan = GOLONGAN_LIST.reduce((acc, g) => {
    acc[g.value] = data.filter(m => m.golongan === g.value).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div style={shared.shell}>
      <Sidebar />
      <main style={{
        ...shared.main,
        marginLeft: isMobile ? 0 : '220px',
        padding: isMobile ? '64px 16px 20px' : '32px 36px',
      }}>

        {/* Header */}
        <div style={{
          ...shared.pageHeader,
          marginBottom: '24px',
          paddingBottom: '24px',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          gap: isMobile ? '14px' : '0',
        }}>
          <div>
            <h1 style={{ ...shared.headerTitle, fontSize: font.h1 }}>Mustahik</h1>
            <p style={shared.headerSub}>Daftar penerima zakat berdasarkan 8 golongan asnaf</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto' }}>
            {!loading && filtered.length > 0 && (
              <button
                onClick={async () => {
                  setExporting(true)
                  await exportToExcel(filtered, supabase)
                  setExporting(false)
                }}
                disabled={exporting}
                style={{
                  ...shared.btnSecondary,
                  width: isMobile ? '100%' : 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 16px',
                  fontWeight: 600,
                  ...(exporting ? shared.btnDisabled : {}),
                }}
              >
                {exporting ? 'Menyiapkan...' : '⬇ Export Excel'}
              </button>
            )}
            <button
              onClick={() => setShowImport(true)}
              style={{
                ...shared.btnSecondary,
                width: isMobile ? '100%' : 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 16px',
                fontWeight: 600,
              }}
            >
              ⬆ Import Excel
            </button>
            <button onClick={() => setShowModal(true)} style={{
              ...shared.btnPrimary,
              width: isMobile ? '100%' : 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 18px',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Tambah Mustahik
            </button>
          </div>
        </div>

        {/* Golongan summary chips — scrollable horizontal di mobile */}
        {!loading && (
          <div style={{
            ...s.golonganRow,
            flexWrap: isMobile ? 'nowrap' : 'wrap',
            overflowX: isMobile ? 'auto' : 'visible',
            WebkitOverflowScrolling: 'touch',
          }}>
            {GOLONGAN_LIST.map(g => {
              const count = countPerGolongan[g.value] ?? 0
              const color = GOLONGAN_COLOR[g.value]
              const isActive = filterGolongan === g.value
              return (
                <button key={g.value}
                  onClick={() => setFilterGolongan(isActive ? 'Semua' : g.value)}
                  style={{
                    ...s.golonganChip,
                    background: isActive ? color.bg : colors.surface,
                    borderColor: isActive ? color.color : colors.border,
                    color: isActive ? color.color : colors.textSubtle,
                    flexShrink: 0,
                  }}>
                  {g.label}
                  <span style={{
                    ...s.golonganCount,
                    background: isActive ? color.color : colors.border,
                    color: isActive ? '#fff' : colors.textSubtle,
                  }}>{count}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Search */}
        <div style={shared.searchWrap}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={s.searchIcon}>
            <circle cx="7" cy="7" r="5" stroke={colors.textDisabled} strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke={colors.textDisabled} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Cari nama, nomor HP, atau alamat..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...shared.searchInput, paddingLeft: '40px' }}
          />
          {search && <button onClick={() => setSearch('')} style={shared.clearBtn}>✕</button>}
        </div>

        {/* Table / Card List */}
        {loading ? (
          <div style={shared.tableCard}>
            <div style={shared.centerState}>
              <div style={shared.spinner} />
              <p style={shared.stateText}>Memuat data...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={shared.tableCard}>
            <div style={shared.centerState}>
              <p style={shared.emptyIcon}>{search || filterGolongan !== 'Semua' ? '🔍' : '🤲'}</p>
              <p style={shared.stateTitle}>
                {search || filterGolongan !== 'Semua' ? 'Tidak ditemukan' : 'Belum ada mustahik'}
              </p>
              <p style={shared.stateText}>
                {search || filterGolongan !== 'Semua'
                  ? 'Coba ubah filter atau kata kunci.'
                  : 'Klik "Tambah Mustahik" untuk mendaftarkan penerima zakat.'}
              </p>
            </div>
          </div>
        ) : isMobile ? (
          /* Card List View — Mobile */
          <div style={s.mobileListContainer}>
            <p style={s.tableCountMobile}>{filtered.length} mustahik{filterGolongan !== 'Semua' ? ` · ${filterGolongan}` : ''} · tap untuk detail</p>
            {filtered.map(m => {
              const color = GOLONGAN_COLOR[m.golongan] ?? { bg: colors.bg, color: colors.textSubtle }
              return (
                <div key={m.id} style={{ ...s.mobileCard, cursor: 'pointer' }} onClick={() => handleOpenDetail(m)}>
                  <div style={s.mobileCardHeader}>
                    <span style={s.namaText}>{m.nama}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ ...s.golonganBadge, background: color.bg, color: color.color }}>
                        {m.golongan}
                      </span>
                      <button onClick={e => { e.stopPropagation(); handleOpenEdit(m) }} style={s.editBtn}>✎</button>
                    </div>
                  </div>
                  <div style={s.mobileCardBody}>
                    <div>
                      <p style={s.mobileLabelText}>Nomor HP</p>
                      <p style={s.mobileValueText}>
                        {m.nomor_hp
                          ? <a href={`tel:${m.nomor_hp}`} style={s.hpLink} onClick={e => e.stopPropagation()}>{m.nomor_hp}</a>
                          : <span style={s.emptyCell}>—</span>}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={s.mobileLabelText}>Terdaftar</p>
                      <p style={s.mobileTimeText}>{formatTanggal(m.created_at)}</p>
                    </div>
                  </div>
                  {(m.alamat || m.keterangan) && (
                    <div style={s.mobileCardFooter}>
                      {m.alamat && <p style={s.mobileFooterText}>📍 {m.alamat}</p>}
                      {m.keterangan && <p style={s.mobileFooterText}>📝 {m.keterangan}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          /* Tabel — Desktop */
          <div style={shared.tableCard}>
            <div style={shared.tableInfo}>
              <span style={shared.tableCount}>{filtered.length} mustahik</span>
              {filterGolongan !== 'Semua' && (
                <span style={s.tableInfoHint}>· golongan {filterGolongan}</span>
              )}
              <span style={s.tableInfoHint}>· klik baris untuk lihat detail</span>
            </div>
            <div style={shared.tableScrollWrap}>
              <table style={{ ...shared.table, minWidth: '760px' }}>
                <thead>
                  <tr>
                    {['No', 'Nama', 'Golongan', 'Nomor HP', 'Alamat', 'Keterangan', 'Terdaftar', 'Aksi'].map(h => (
                      <th key={h} style={shared.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, i) => {
                    const color = GOLONGAN_COLOR[m.golongan] ?? { bg: colors.bg, color: colors.textSubtle }
                    return (
                      <tr
                        key={m.id}
                        style={{ background: i % 2 === 0 ? colors.surface : colors.surfaceAlt, cursor: 'pointer' }}
                        onClick={() => handleOpenDetail(m)}
                      >
                        <td style={{ ...shared.td, ...s.tdNo }}>{i + 1}</td>
                        <td style={shared.td}><span style={s.namaText}>{m.nama}</span></td>
                        <td style={shared.td}>
                          <span style={{ ...s.golonganBadge, background: color.bg, color: color.color }}>
                            {m.golongan}
                          </span>
                        </td>
                        <td style={shared.td}>
                          {m.nomor_hp
                            ? <a href={`tel:${m.nomor_hp}`} style={s.hpLink} onClick={e => e.stopPropagation()}>{m.nomor_hp}</a>
                            : <span style={s.emptyCell}>—</span>}
                        </td>
                        <td style={shared.td}>{m.alamat ?? <span style={s.emptyCell}>—</span>}</td>
                        <td style={{ ...shared.td, color: colors.textSubtle, fontSize: font.sm }}>
                          {m.keterangan ?? <span style={s.emptyCell}>—</span>}
                        </td>
                        <td style={{ ...shared.td, color: colors.textDisabled }}>{formatTanggal(m.created_at)}</td>
                        <td style={shared.td}>
                          <button onClick={e => { e.stopPropagation(); handleOpenEdit(m) }} style={s.editBtn}>✎ Edit</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal Tambah */}
      {showModal && (
        <div style={s.overlay} onClick={handleCloseModal}>
          <div style={{
            ...shared.card,
            width: '100%',
            maxWidth: isMobile ? '100%' : '480px',
            margin: isMobile ? '0' : undefined,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            maxHeight: '100vh',
            overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ ...shared.cardHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${colors.border}` }}>
              <h2 style={{ ...shared.cardTitle, fontSize: font.lg, margin: 0 }}>{editingId ? 'Edit Mustahik' : 'Tambah Mustahik'}</h2>
              <button onClick={handleCloseModal} style={s.closeBtn}>✕</button>
            </div>
            <div style={{ ...shared.modalBody, maxHeight: '60vh' }}>
              <div style={shared.field}>
                <label style={shared.label}>Nama <span style={shared.required}>*</span></label>
                <input type="text" placeholder="Nama lengkap"
                  value={form.nama}
                  onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                  style={shared.input} autoFocus />
              </div>
              <div style={shared.field}>
                <label style={shared.label}>Golongan <span style={shared.required}>*</span></label>
                <select value={form.golongan}
                  onChange={e => setForm(f => ({ ...f, golongan: e.target.value }))}
                  style={shared.select}>
                  {GOLONGAN_LIST.map(g => (
                    <option key={g.value} value={g.value}>{g.label} — {g.desc}</option>
                  ))}
                </select>
              </div>
              <div style={shared.field}>
                <label style={shared.label}>Nomor HP</label>
                <input type="tel" inputMode="numeric" maxLength={13} placeholder="08xxxxxxxxxx"
                  value={form.nomor_hp}
                  onChange={e => setForm(f => ({ ...f, nomor_hp: e.target.value.replace(/\D/g, '').slice(0, 13) }))}
                  style={shared.input} />
              </div>
              <div style={shared.field}>
                <label style={shared.label}>Alamat</label>
                <textarea placeholder="Alamat lengkap (opsional)"
                  value={form.alamat}
                  onChange={e => setForm(f => ({ ...f, alamat: e.target.value }))}
                  style={shared.textarea} rows={2} />
              </div>
              <div style={shared.field}>
                <label style={shared.label}>Keterangan</label>
                <textarea placeholder="Catatan tambahan (opsional)"
                  value={form.keterangan}
                  onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                  style={shared.textarea} rows={2} />
              </div>
              {error && <p style={s.errorText}>⚠ {error}</p>}
            </div>
            <div style={{
              ...shared.modalFooter,
              flexDirection: isMobile ? 'column-reverse' : 'row',
            }}>
              <button onClick={handleCloseModal} style={{
                ...shared.btnOutline,
                width: isMobile ? '100%' : 'auto',
              }}>Batal</button>
              <button onClick={handleSave} disabled={saving} style={{
                ...shared.btnPrimary,
                width: isMobile ? '100%' : 'auto',
              }}>
                {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Mustahik + Anggota Keluarga */}
      {detailMustahik && (
        <div style={s.overlay} onClick={handleCloseDetail}>
          <div style={{
            ...shared.card,
            width: '100%',
            maxWidth: isMobile ? '100%' : '520px',
            margin: isMobile ? '0' : undefined,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            maxHeight: '100vh',
            overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ ...shared.cardHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px', borderBottom: `1px solid ${colors.border}` }}>
              <div>
                <h2 style={{ ...shared.cardTitle, fontSize: font.lg, margin: 0 }}>{detailMustahik.nama}</h2>
                <p style={{ fontSize: font.sm, color: colors.textSubtle, marginTop: '4px' }}>Kepala Keluarga · {detailMustahik.golongan}</p>
              </div>
              <button onClick={handleCloseDetail} style={s.closeBtn}>✕</button>
            </div>
            <div style={{ ...shared.modalBody, maxHeight: '70vh' }}>

              {/* Info mustahik */}
              <div style={s.detailInfoGrid}>
                <div>
                  <p style={s.detailInfoLabel}>Nomor HP</p>
                  <p style={s.detailInfoValue}>{detailMustahik.nomor_hp ?? '—'}</p>
                </div>
                <div>
                  <p style={s.detailInfoLabel}>Terdaftar</p>
                  <p style={s.detailInfoValue}>{formatTanggal(detailMustahik.created_at)}</p>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={s.detailInfoLabel}>Alamat</p>
                  <p style={s.detailInfoValue}>{detailMustahik.alamat ?? '—'}</p>
                </div>
                {detailMustahik.keterangan && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <p style={s.detailInfoLabel}>Keterangan</p>
                    <p style={s.detailInfoValue}>{detailMustahik.keterangan}</p>
                  </div>
                )}
              </div>

              {/* Anggota keluarga */}
              <div style={s.sectionDividerDetail}>
                <span style={s.sectionLabelDetail}>ANGGOTA KELUARGA</span>
              </div>

              {loadingAnggota ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
                  <div style={shared.spinner} />
                </div>
              ) : anggotaList.length === 0 ? (
                <p style={{ fontSize: font.sm, color: colors.textDisabled }}>Belum ada anggota keluarga tercatat.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {anggotaList.map(a => (
                    <div key={a.id} style={s.anggotaRow}>
                      <div>
                        <p style={s.anggotaNama}>{a.nama}</p>
                        <p style={s.anggotaHubungan}>{a.hubungan}</p>
                      </div>
                      <button onClick={() => handleDeleteAnggota(a.id)} style={s.anggotaDeleteBtn}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Form tambah anggota */}
              <div style={s.addAnggotaRow}>
                <input
                  type="text"
                  placeholder="Nama anggota keluarga"
                  value={anggotaForm.nama}
                  onChange={e => setAnggotaForm(f => ({ ...f, nama: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAddAnggota()}
                  style={{ ...shared.input, flex: 2 }}
                />
                <select
                  value={anggotaForm.hubungan}
                  onChange={e => setAnggotaForm(f => ({ ...f, hubungan: e.target.value }))}
                  style={{ ...shared.select, flex: 1 }}
                >
                  {HUBUNGAN_LIST.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <button
                  onClick={handleAddAnggota}
                  disabled={savingAnggota}
                  style={{ ...shared.btnPrimary, width: 'auto', padding: '0 16px', ...(savingAnggota ? shared.btnDisabled : {}) }}
                >
                  +
                </button>
              </div>
              {anggotaError && <p style={s.errorText}>⚠ {anggotaError}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Excel */}
      {showImport && (
        <div style={s.overlay} onClick={handleCloseImport}>
          <div style={{
            ...shared.card,
            width: '100%',
            maxWidth: isMobile ? '100%' : '640px',
            margin: isMobile ? '0' : undefined,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            maxHeight: '100vh',
            overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ ...shared.cardHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px', borderBottom: `1px solid ${colors.border}` }}>
              <div>
                <h2 style={{ ...shared.cardTitle, fontSize: font.lg, margin: 0 }}>Import Mustahik dari Excel</h2>
                <p style={{ fontSize: font.sm, color: colors.textSubtle, marginTop: '4px' }}>
                  Kepala keluarga beserta anggotanya sekaligus
                </p>
              </div>
              <button onClick={handleCloseImport} style={s.closeBtn}>✕</button>
            </div>

            <div style={{ ...shared.modalBody, maxHeight: '70vh' }}>

              {/* Langkah 1 — template */}
              <div style={s.importStep}>
                <p style={s.importStepLabel}>1. Unduh template</p>
                <p style={s.importHint}>
                  Satu baris = satu orang. Baris yang kolom <strong>Nama Kepala Keluarga</strong>-nya terisi
                  membuka keluarga baru; baris di bawahnya yang kolom itu dibiarkan <strong>kosong</strong> dihitung
                  sebagai anggota keluarga tersebut. File hasil Export Excel juga bisa dipakai langsung di sini.
                </p>
                <button onClick={downloadTemplateImport} style={{ ...shared.btnOutline, width: 'auto', padding: '8px 14px', fontSize: font.sm }}>
                  ⬇ Unduh template-import-mustahik.xlsx
                </button>
              </div>

              {/* Langkah 2 — pilih file */}
              <div style={s.importStep}>
                <p style={s.importStepLabel}>2. Pilih file yang sudah diisi</p>
                <label style={s.importFileLabel}>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handlePilihFile}
                    disabled={importParsing || importSaving}
                    style={{ display: 'none' }}
                  />
                  <span style={{ ...shared.btnSecondary, display: 'inline-block', padding: '8px 14px', fontSize: font.sm, cursor: 'pointer' }}>
                    {importParsing ? 'Membaca...' : 'Pilih file Excel'}
                  </span>
                  {importFileName && <span style={s.importFileName}>{importFileName}</span>}
                </label>
              </div>

              {/* Langkah 3 — pratinjau */}
              {(importGroups.length > 0 || importErrors.length > 0) && (
                <div style={s.importStep}>
                  <p style={s.importStepLabel}>3. Periksa hasil bacaan</p>

                  {importGroups.length > 0 && (
                    <p style={s.importSummary}>
                      <strong>{importGroups.length}</strong> kepala keluarga · <strong>{importTotalJiwa}</strong> jiwa total
                      {importDuplikat.size > 0 && (
                        <span style={{ color: colors.gold }}> · {importDuplikat.size} nama sudah ada di daftar</span>
                      )}
                    </p>
                  )}

                  {importErrors.length > 0 && (
                    <div style={s.importErrorBox}>
                      <p style={s.importErrorTitle}>⚠ {importErrors.length} baris dilewati:</p>
                      {importErrors.map((msg, i) => (
                        <p key={i} style={s.importErrorItem}>{msg}</p>
                      ))}
                    </div>
                  )}

                  {importGroups.length > 0 && (
                    <div style={s.importPreviewList}>
                      {importGroups.map(g => {
                        const warna = GOLONGAN_COLOR[g.golongan]
                        return (
                          <div key={g.baris} style={{
                            ...s.importPreviewCard,
                            border: importDuplikat.has(g.baris)
                              ? `1px solid ${colors.gold}`
                              : `1px solid ${colors.borderLight}`,
                          }}>
                            <div style={s.importPreviewHead}>
                              <span style={s.namaText}>{g.nama}</span>
                              <span style={{ ...s.golonganBadge, background: warna.bg, color: warna.color }}>{g.golongan}</span>
                              {importDuplikat.has(g.baris) && <span style={s.importDupBadge}>nama sudah ada</span>}
                            </div>
                            {(g.nomor_hp || g.alamat) && (
                              <p style={s.importPreviewMeta}>
                                {[g.nomor_hp, g.alamat].filter(Boolean).join(' · ')}
                              </p>
                            )}
                            {g.anggota.length === 0 ? (
                              <p style={s.importPreviewAnggotaKosong}>Tanpa anggota keluarga</p>
                            ) : (
                              <p style={s.importPreviewAnggota}>
                                +{g.anggota.length} anggota: {g.anggota.map(a => `${a.nama} (${a.hubungan})`).join(', ')}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {importError && <p style={s.errorText}>⚠ {importError}</p>}
            </div>

            <div style={{
              ...shared.modalFooter,
              flexDirection: isMobile ? 'column-reverse' : 'row',
            }}>
              <button onClick={handleCloseImport} style={{
                ...shared.btnOutline,
                width: isMobile ? '100%' : 'auto',
              }}>Batal</button>
              <button
                onClick={handleSimpanImport}
                disabled={importGroups.length === 0 || importSaving}
                style={{
                  ...shared.btnPrimary,
                  width: isMobile ? '100%' : 'auto',
                  ...(importGroups.length === 0 || importSaving ? shared.btnDisabled : {}),
                }}
              >
                {importSaving
                  ? 'Menyimpan...'
                  : importGroups.length > 0
                    ? `Simpan ${importGroups.length} Keluarga`
                    : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Hanya style yang UNIK untuk mustahik ─────────────────
const s: Record<string, React.CSSProperties> = {
  golonganRow: { display: 'flex', gap: '8px', marginBottom: '16px', paddingBottom: '4px' },
  golonganChip: { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: radius.full, border: '1.5px solid', fontSize: font.sm, fontWeight: 600, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.15s', whiteSpace: 'nowrap' },
  golonganCount: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', fontSize: '10px', fontWeight: 700 },
  searchIcon: { position: 'absolute', left: '12px', pointerEvents: 'none' },
  tableInfoHint: { fontSize: font.sm, color: colors.textPlaceholder },
  tdNo: { color: colors.textPlaceholder, fontWeight: 600, width: '40px' },
  namaText: { fontWeight: 700, color: colors.text, fontSize: font.md },
  golonganBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: radius.full, fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' },
  hpLink: { color: colors.primary, textDecoration: 'none', fontWeight: 500 },
  emptyCell: { color: '#D4CEC7' },
  editBtn: {
    padding: '5px 10px', fontSize: font.xs, fontWeight: 700, color: colors.primary,
    background: colors.primaryLight, border: `1px solid ${colors.primary}`, borderRadius: '6px',
    cursor: 'pointer', fontFamily: font.family, whiteSpace: 'nowrap',
  },

  /* Import Excel */
  importStep: { paddingBottom: '18px', marginBottom: '18px', borderBottom: `1px solid ${colors.borderLight}` },
  importStepLabel: { fontSize: font.sm, fontWeight: 700, color: colors.text, marginBottom: '6px' },
  importHint: { fontSize: font.xs, color: colors.textSubtle, lineHeight: 1.6, marginBottom: '10px' },
  importFileLabel: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  importFileName: { fontSize: font.xs, color: colors.textSubtle, wordBreak: 'break-all' },
  importSummary: { fontSize: font.sm, color: colors.text, marginBottom: '10px' },
  importErrorBox: { background: colors.dangerBg, border: `1px solid ${colors.danger}`, borderRadius: radius.md, padding: '10px 12px', marginBottom: '12px' },
  importErrorTitle: { fontSize: font.xs, fontWeight: 700, color: colors.danger, marginBottom: '4px' },
  importErrorItem: { fontSize: font.xs, color: colors.danger, lineHeight: 1.6 },
  importPreviewList: { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' },
  importPreviewCard: { background: colors.surface, borderRadius: radius.md, padding: '10px 12px' },
  importPreviewHead: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  importPreviewMeta: { fontSize: font.xs, color: colors.textSubtle, marginTop: '4px' },
  importPreviewAnggota: { fontSize: font.xs, color: colors.primaryDark, marginTop: '4px', lineHeight: 1.6 },
  importPreviewAnggotaKosong: { fontSize: font.xs, color: colors.textDisabled, marginTop: '4px' },
  importDupBadge: { fontSize: '10px', fontWeight: 700, color: colors.gold, background: colors.goldBg, padding: '2px 8px', borderRadius: radius.full },

  /* Mobile card list */
  mobileListContainer: { display: 'flex', flexDirection: 'column', gap: '10px' },
  tableCountMobile: { fontSize: font.sm, fontWeight: 600, color: colors.textDisabled, marginBottom: '2px' },
  mobileCard: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  mobileCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.borderLight}`, paddingBottom: '8px' },
  mobileCardBody: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
  mobileCardFooter: { borderTop: `1px solid ${colors.borderLight}`, paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' },
  mobileFooterText: { fontSize: font.sm, color: colors.textSubtle },
  mobileLabelText: { fontSize: font.xs, color: colors.textDisabled, marginBottom: '2px' },
  mobileValueText: { fontSize: font.base, fontWeight: 600, color: colors.text },
  mobileTimeText: { fontSize: font.xs, color: colors.textSubtle },

  /* Modal */
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '0' },
  closeBtn: { background: 'none', border: 'none', fontSize: font.xl, color: colors.textDisabled, cursor: 'pointer', padding: '4px' },
  errorText: { fontSize: font.base, color: colors.danger, fontWeight: 500 },

  /* Modal Detail Mustahik */
  detailInfoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' },
  detailInfoLabel: { fontSize: '11px', fontWeight: 700, color: colors.textDisabled, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '3px' },
  detailInfoValue: { fontSize: font.base, color: colors.text, fontWeight: 500 },
  sectionDividerDetail: { display: 'flex', alignItems: 'center', marginBottom: '10px' },
  sectionLabelDetail: { fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: colors.textPlaceholder },
  anggotaRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: colors.surfaceAlt, borderRadius: radius.sm },
  anggotaNama: { fontSize: font.base, fontWeight: 600, color: colors.text },
  anggotaHubungan: { fontSize: font.xs, color: colors.textSubtle },
  anggotaDeleteBtn: { background: 'none', border: 'none', color: colors.textDisabled, cursor: 'pointer', fontSize: font.sm, padding: '4px 6px' },
  addAnggotaRow: { display: 'flex', gap: '8px', marginTop: '14px' },
}
