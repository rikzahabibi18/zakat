'use client'

import React, { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
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

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Mustahik')
  ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 16 }]
  const tanggal = new Date().toLocaleDateString('id-ID').replace(/\//g, '-')
  XLSX.writeFile(wb, `mustahik-${tanggal}.xlsx`)
}

export default function MustahikPage() {
  const supabase = createClient()

  const [data, setData] = useState<Mustahik[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterGolongan, setFilterGolongan] = useState('Semua')
  const [showModal, setShowModal] = useState(false)
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
    setShowModal(false)
    setForm({ nama: '', golongan: 'Fakir', nomor_hp: '', alamat: '', keterangan: '' })
    fetchData()
  }

  function handleCloseModal() {
    setShowModal(false)
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
                    <span style={{ ...s.golonganBadge, background: color.bg, color: color.color }}>
                      {m.golongan}
                    </span>
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
                    {['No', 'Nama', 'Golongan', 'Nomor HP', 'Alamat', 'Keterangan', 'Terdaftar'].map(h => (
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
              <h2 style={{ ...shared.cardTitle, fontSize: font.lg, margin: 0 }}>Tambah Mustahik</h2>
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
                {saving ? 'Menyimpan...' : 'Simpan'}
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
