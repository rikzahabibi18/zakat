'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/components/Sidebar'

interface Mustahik {
  id: number
  nama: string
  golongan: string
  nomor_hp: string | null
  alamat: string | null
  keterangan: string | null
  created_at: string
}

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
  'Fakir':        { bg: '#FEF2F2', color: '#B91C1C' },
  'Miskin':       { bg: '#FFF7ED', color: '#C2410C' },
  'Amil':         { bg: '#F0F7F3', color: '#1A4731' },
  'Mualaf':       { bg: '#EFF6FF', color: '#1D4ED8' },
  'Riqab':        { bg: '#F5F3FF', color: '#7C3AED' },
  'Gharimin':     { bg: '#FDF4FF', color: '#A21CAF' },
  'Fisabilillah': { bg: '#FDF8EE', color: '#92681A' },
  'Ibnu Sabil':   { bg: '#F0FDF4', color: '#15803D' },
}

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

  const countPerGolongan = GOLONGAN_LIST.reduce((acc, g) => {
    acc[g.value] = data.filter(m => m.golongan === g.value).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div style={s.shell}>
      <Sidebar />
      <main style={{
        ...s.main,
        marginLeft: isMobile ? 0 : '220px',
        padding: isMobile ? '64px 16px 20px' : '32px 36px',
      }}>

        {/* Header */}
        <div style={{
          ...s.header,
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          gap: isMobile ? '14px' : '0',
        }}>
          <div>
            <h1 style={s.headerTitle}>Mustahik</h1>
            <p style={s.headerSub}>Daftar penerima zakat berdasarkan 8 golongan asnaf</p>
          </div>
          <button onClick={() => setShowModal(true)} style={{
            ...s.addBtn,
            width: isMobile ? '100%' : 'auto',
            justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Tambah Mustahik
          </button>
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
                    background: isActive ? color.bg : '#fff',
                    borderColor: isActive ? color.color : '#EDE8E0',
                    color: isActive ? color.color : '#78716C',
                    flexShrink: 0,
                  }}>
                  {g.label}
                  <span style={{
                    ...s.golonganCount,
                    background: isActive ? color.color : '#EDE8E0',
                    color: isActive ? '#fff' : '#78716C',
                  }}>{count}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Search */}
        <div style={s.searchWrap}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={s.searchIcon}>
            <circle cx="7" cy="7" r="5" stroke="#A8A29E" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="#A8A29E" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Cari nama, nomor HP, atau alamat..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={s.searchInput}
          />
          {search && <button onClick={() => setSearch('')} style={s.clearBtn}>✕</button>}
        </div>

        {/* Table / Card List */}
        {loading ? (
          <div style={s.tableCard}>
            <div style={s.centerState}>
              <div style={s.spinner} />
              <p style={s.stateText}>Memuat data...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={s.tableCard}>
            <div style={s.centerState}>
              <p style={s.emptyIcon}>{search || filterGolongan !== 'Semua' ? '🔍' : '🤲'}</p>
              <p style={s.stateTitle}>
                {search || filterGolongan !== 'Semua' ? 'Tidak ditemukan' : 'Belum ada mustahik'}
              </p>
              <p style={s.stateText}>
                {search || filterGolongan !== 'Semua'
                  ? 'Coba ubah filter atau kata kunci.'
                  : 'Klik "Tambah Mustahik" untuk mendaftarkan penerima zakat.'}
              </p>
            </div>
          </div>
        ) : isMobile ? (
          /* Card List View — Mobile */
          <div style={s.mobileListContainer}>
            <p style={s.tableCountMobile}>{filtered.length} mustahik{filterGolongan !== 'Semua' ? ` · ${filterGolongan}` : ''}</p>
            {filtered.map(m => {
              const color = GOLONGAN_COLOR[m.golongan] ?? { bg: '#F8F4ED', color: '#78716C' }
              return (
                <div key={m.id} style={s.mobileCard}>
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
                          ? <a href={`tel:${m.nomor_hp}`} style={s.hpLink}>{m.nomor_hp}</a>
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
          <div style={s.tableCard}>
            <div style={s.tableInfo}>
              <span style={s.tableCount}>{filtered.length} mustahik</span>
              {filterGolongan !== 'Semua' && (
                <span style={s.tableInfoHint}>· golongan {filterGolongan}</span>
              )}
            </div>
            <div style={s.tableScrollWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['No', 'Nama', 'Golongan', 'Nomor HP', 'Alamat', 'Keterangan', 'Terdaftar'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, i) => {
                    const color = GOLONGAN_COLOR[m.golongan] ?? { bg: '#F8F4ED', color: '#78716C' }
                    return (
                      <tr key={m.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAF9' }}>
                        <td style={{ ...s.td, ...s.tdNo }}>{i + 1}</td>
                        <td style={s.td}><span style={s.namaText}>{m.nama}</span></td>
                        <td style={s.td}>
                          <span style={{ ...s.golonganBadge, background: color.bg, color: color.color }}>
                            {m.golongan}
                          </span>
                        </td>
                        <td style={s.td}>
                          {m.nomor_hp
                            ? <a href={`tel:${m.nomor_hp}`} style={s.hpLink}>{m.nomor_hp}</a>
                            : <span style={s.emptyCell}>—</span>}
                        </td>
                        <td style={s.td}>{m.alamat ?? <span style={s.emptyCell}>—</span>}</td>
                        <td style={{ ...s.td, color: '#78716C', fontSize: '12px' }}>
                          {m.keterangan ?? <span style={s.emptyCell}>—</span>}
                        </td>
                        <td style={{ ...s.td, color: '#A8A29E' }}>{formatTanggal(m.created_at)}</td>
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
            ...s.modal,
            maxWidth: isMobile ? '100%' : '480px',
            margin: isMobile ? '0' : undefined,
          }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Tambah Mustahik</h2>
              <button onClick={handleCloseModal} style={s.closeBtn}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div style={s.field}>
                <label style={s.label}>Nama <span style={s.required}>*</span></label>
                <input type="text" placeholder="Nama lengkap"
                  value={form.nama}
                  onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                  style={s.input} autoFocus />
              </div>
              <div style={s.field}>
                <label style={s.label}>Golongan <span style={s.required}>*</span></label>
                <select value={form.golongan}
                  onChange={e => setForm(f => ({ ...f, golongan: e.target.value }))}
                  style={s.select}>
                  {GOLONGAN_LIST.map(g => (
                    <option key={g.value} value={g.value}>{g.label} — {g.desc}</option>
                  ))}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Nomor HP</label>
                <input type="tel" placeholder="08xxxxxxxxxx"
                  value={form.nomor_hp}
                  onChange={e => setForm(f => ({ ...f, nomor_hp: e.target.value }))}
                  style={s.input} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Alamat</label>
                <textarea placeholder="Alamat lengkap (opsional)"
                  value={form.alamat}
                  onChange={e => setForm(f => ({ ...f, alamat: e.target.value }))}
                  style={s.textarea} rows={2} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Keterangan</label>
                <textarea placeholder="Catatan tambahan (opsional)"
                  value={form.keterangan}
                  onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                  style={s.textarea} rows={2} />
              </div>
              {error && <p style={s.errorText}>⚠ {error}</p>}
            </div>
            <div style={{
              ...s.modalFooter,
              flexDirection: isMobile ? 'column-reverse' : 'row',
            }}>
              <button onClick={handleCloseModal} style={{
                ...s.cancelBtn,
                width: isMobile ? '100%' : 'auto',
              }}>Batal</button>
              <button onClick={handleSave} disabled={saving} style={{
                ...s.saveBtn,
                width: isMobile ? '100%' : 'auto',
              }}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', minHeight: '100vh', background: '#F8F4ED', fontFamily: "'Plus Jakarta Sans', sans-serif", overflowX: 'hidden' },
  main: { flex: 1, boxSizing: 'border-box', minWidth: 0, maxWidth: '100%', overflowX: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #EDE8E0' },
  headerTitle: { fontSize: '26px', fontWeight: 700, color: '#1C1917', letterSpacing: '-0.5px', marginBottom: '4px' },
  headerSub: { fontSize: '13px', color: '#A8A29E' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'linear-gradient(135deg, #2D7A50, #1A4731)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  golonganRow: { display: 'flex', gap: '8px', marginBottom: '16px', paddingBottom: '4px' },
  golonganChip: { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', border: '1.5px solid', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap' },
  golonganCount: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', fontSize: '10px', fontWeight: 700 },
  searchWrap: { position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '16px' },
  searchIcon: { position: 'absolute', left: '12px', pointerEvents: 'none' },
  searchInput: { width: '100%', padding: '11px 40px', fontSize: '14px', background: '#fff', border: '1.5px solid #EDE8E0', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', color: '#1C1917', boxSizing: 'border-box' },
  clearBtn: { position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#A8A29E', fontSize: '13px', padding: '4px' },
  tableCard: { background: '#fff', borderRadius: '14px', border: '1px solid #EDE8E0', overflow: 'hidden' },
  tableInfo: { padding: '12px 16px', borderBottom: '1px solid #F5F0E8', background: '#FAFAF9', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' },
  tableCount: { fontSize: '12px', fontWeight: 600, color: '#A8A29E' },
  tableInfoHint: { fontSize: '12px', color: '#C4BDB4' },
  tableScrollWrap: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '760px' },
  th: { padding: '12px 14px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 700, color: '#A8A29E', letterSpacing: '0.5px', background: '#FAFAF9', borderBottom: '1px solid #EDE8E0' },
  td: { padding: '11px 14px', color: '#44403C', borderBottom: '1px solid #F5F0E8' },
  tdNo: { color: '#C4BDB4', fontWeight: 600, width: '40px' },
  namaText: { fontWeight: 700, color: '#1C1917', fontSize: '14px' },
  golonganBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' },
  hpLink: { color: '#2D7A50', textDecoration: 'none', fontWeight: 500 },
  emptyCell: { color: '#D4CEC7' },
  centerState: { padding: '64px 32px', textAlign: 'center' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '8px' },
  spinner: { width: '28px', height: '28px', border: '3px solid #EDE8E0', borderTop: '3px solid #2D7A50', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginBottom: '8px' },
  emptyIcon: { fontSize: '32px', marginBottom: '4px' },
  stateTitle: { fontSize: '15px', fontWeight: 600, color: '#57534E' },
  stateText: { fontSize: '13px', color: '#A8A29E' },
  /* Mobile card list */
  mobileListContainer: { display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  tableCountMobile: { fontSize: '12px', fontWeight: 600, color: '#A8A29E', marginBottom: '2px' },
  mobileCard: { background: '#fff', border: '1px solid #EDE8E0', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  mobileCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F5F0E8', paddingBottom: '8px' },
  mobileCardBody: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
  mobileCardFooter: { borderTop: '1px solid #F5F0E8', paddingTop: '8px', display: 'flex', flexDirection: 'column' as const, gap: '3px' },
  mobileFooterText: { fontSize: '12px', color: '#78716C' },
  mobileLabelText: { fontSize: '11px', color: '#A8A29E', marginBottom: '2px' },
  mobileValueText: { fontSize: '13px', fontWeight: 600, color: '#1C1917' },
  mobileTimeText: { fontSize: '11px', color: '#78716C' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '0' },
  modal: { background: '#fff', borderRadius: '16px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden', maxHeight: '100vh' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #EDE8E0' },
  modalTitle: { fontSize: '16px', fontWeight: 700, color: '#1C1917' },
  closeBtn: { background: 'none', border: 'none', fontSize: '16px', color: '#A8A29E', cursor: 'pointer', padding: '4px' },
  modalBody: { padding: '24px', display: 'flex', flexDirection: 'column' as const, gap: '16px', maxHeight: '60vh', overflowY: 'auto' },
  field: { display: 'flex', flexDirection: 'column' as const, gap: '6px' },
  label: { fontSize: '13px', fontWeight: 600, color: '#44403C' },
  required: { color: '#E11D48' },
  input: { padding: '10px 12px', fontSize: '14px', border: '1.5px solid #EDE8E0', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', color: '#1C1917', background: '#FAFAF9', boxSizing: 'border-box' },
  select: { padding: '10px 12px', fontSize: '14px', border: '1.5px solid #EDE8E0', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', color: '#1C1917', background: '#FAFAF9', cursor: 'pointer', boxSizing: 'border-box' },
  textarea: { padding: '10px 12px', fontSize: '14px', border: '1.5px solid #EDE8E0', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', color: '#1C1917', background: '#FAFAF9', resize: 'vertical' as const, boxSizing: 'border-box' },
  errorText: { fontSize: '13px', color: '#B91C1C', fontWeight: 500 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 24px', borderTop: '1px solid #EDE8E0', background: '#FAFAF9' },
  cancelBtn: { padding: '9px 18px', fontSize: '13.5px', fontWeight: 600, color: '#57534E', background: '#fff', border: '1.5px solid #EDE8E0', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' },
  saveBtn: { padding: '9px 18px', fontSize: '13.5px', fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg, #2D7A50, #1A4731)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' },
}
