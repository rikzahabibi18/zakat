'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/components/Sidebar'

interface Muzakki {
  id: number
  nama: string
  nomor_hp: string | null
  alamat: string | null
  created_at: string
}

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function MuzakkiPage() {
  const supabase = createClient()
  const [data, setData] = useState<Muzakki[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ nama: '', nomor_hp: '', alamat: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data: rows } = await supabase
      .from('muzakki')
      .select('*')
      .order('nama', { ascending: true })
    setData(rows ?? [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch awal saat mount, disengaja
  useEffect(() => { fetchData() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return data.filter(m =>
      m.nama.toLowerCase().includes(q) ||
      (m.nomor_hp ?? '').includes(q) ||
      (m.alamat ?? '').toLowerCase().includes(q)
    )
  }, [data, search])

const handleSave = async () => {
  if (!form.nama.trim()) { setError('Nama wajib diisi.'); return }
  setSaving(true)
  setError('')

  // 1. Ambil user ID & lembaga_id dari profil_amil
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profil } = await supabase
    .from('profil_amil')
    .select('lembaga_id')
    .eq('id', user!.id)
    .single()

  // 2. Insert muzakki beserta lembaga_id
  const { error: err } = await supabase.from('muzakki').insert({
    nama: form.nama.trim(),
    nomor_hp: form.nomor_hp.trim() || null,
    alamat: form.alamat.trim() || null,
    lembaga_id: profil?.lembaga_id ?? null, // <-- Ditambahkan di sini
  })

  setSaving(false)
  if (err) { setError('Gagal menyimpan. Coba lagi.'); return }
  setShowModal(false)
  setForm({ nama: '', nomor_hp: '', alamat: '' })
  fetchData()
}

  const handleCloseModal = () => {
    setShowModal(false)
    setForm({ nama: '', nomor_hp: '', alamat: '' })
    setError('')
  }

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
            <h1 style={s.headerTitle}>Muzakki</h1>
            <p style={s.headerSub}>Daftar pembayar zakat yang terdaftar</p>
          </div>
          <button onClick={() => setShowModal(true)} style={{
            ...s.addBtn,
            width: isMobile ? '100%' : 'auto',
            justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Tambah Muzakki
          </button>
        </div>

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
          {search && (
            <button onClick={() => setSearch('')} style={s.clearBtn}>✕</button>
          )}
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
              <p style={s.emptyIcon}>{search ? '🔍' : '👤'}</p>
              <p style={s.stateTitle}>
                {search ? 'Tidak ditemukan' : 'Belum ada muzakki'}
              </p>
              <p style={s.stateText}>
                {search
                  ? `Tidak ada hasil untuk "${search}"`
                  : 'Klik "Tambah Muzakki" untuk mendaftarkan pembayar zakat pertama.'}
              </p>
            </div>
          </div>
        ) : isMobile ? (
          /* Card List View — Mobile */
          <div style={s.mobileListContainer}>
            <p style={s.tableCountMobile}>
              {filtered.length} muzakki{search ? ' ditemukan' : ' terdaftar'}
            </p>
            {filtered.map(m => (
              <div key={m.id} style={s.mobileCard}>
                <div style={s.mobileCardHeader}>
                  <span style={s.namaText}>{m.nama}</span>
                  <span style={s.mobileTimeText}>{formatTanggal(m.created_at)}</span>
                </div>
                <div style={s.mobileCardBody}>
                  <div>
                    <p style={s.mobileLabelText}>Nomor HP</p>
                    <p style={s.mobileValueText}>
                      {m.nomor_hp ? (
                        <a href={`tel:${m.nomor_hp}`} style={s.hpLink}>
                          {m.nomor_hp}
                        </a>
                      ) : (
                        <span style={s.emptyCell}>—</span>
                      )}
                    </p>
                  </div>
                </div>
                {m.alamat && (
                  <div style={s.mobileCardFooter}>
                    <p style={s.mobileFooterText}>📍 {m.alamat}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Tabel — Desktop */
          <div style={s.tableCard}>
            <div style={s.tableInfo}>
              <span style={s.tableCount}>
                {filtered.length} muzakki{search ? ' ditemukan' : ' terdaftar'}
              </span>
            </div>
            <div style={s.tableScrollWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['No', 'Nama', 'Nomor HP', 'Alamat', 'Terdaftar'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, i) => (
                    <tr key={m.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAF9' }}>
                      <td style={{ ...s.td, ...s.tdNo }}>{i + 1}</td>
                      <td style={s.td}>
                        <span style={s.namaText}>{m.nama}</span>
                      </td>
                      <td style={s.td}>
                        {m.nomor_hp
                          ? <a href={`tel:${m.nomor_hp}`} style={s.hpLink}>{m.nomor_hp}</a>
                          : <span style={s.emptyCell}>—</span>}
                      </td>
                      <td style={s.td}>
                        {m.alamat ?? <span style={s.emptyCell}>—</span>}
                      </td>
                      <td style={{ ...s.td, color: '#A8A29E' }}>
                        {formatTanggal(m.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal Tambah Muzakki */}
      {showModal && (
        <div style={s.overlay} onClick={handleCloseModal}>
          <div
            style={{
              ...s.modal,
              maxWidth: isMobile ? '100%' : '440px',
              margin: isMobile ? '0' : undefined,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Tambah Muzakki</h2>
              <button onClick={handleCloseModal} style={s.closeBtn}>✕</button>
            </div>

            <div style={s.modalBody}>
              <div style={s.field}>
                <label style={s.label}>Nama <span style={s.required}>*</span></label>
                <input
                  type="text"
                  placeholder="Nama lengkap"
                  value={form.nama}
                  onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                  style={s.input}
                  autoFocus
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Nomor HP</label>
                <input
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={form.nomor_hp}
                  onChange={e => setForm(f => ({ ...f, nomor_hp: e.target.value }))}
                  style={s.input}
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Alamat</label>
                <textarea
                  placeholder="Alamat lengkap (opsional)"
                  value={form.alamat}
                  onChange={e => setForm(f => ({ ...f, alamat: e.target.value }))}
                  style={s.textarea}
                  rows={3}
                />
              </div>

              {error && <p style={s.errorText}>⚠ {error}</p>}
            </div>

            <div
              style={{
                ...s.modalFooter,
                flexDirection: isMobile ? 'column-reverse' : 'row',
              }}
            >
              <button
                onClick={handleCloseModal}
                style={{
                  ...s.cancelBtn,
                  width: isMobile ? '100%' : 'auto',
                }}
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  ...s.saveBtn,
                  width: isMobile ? '100%' : 'auto',
                }}
              >
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
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: '#F8F4ED',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    overflowX: 'hidden',
  },
  main: {
    flex: 1,
    boxSizing: 'border-box',
    minWidth: 0,
    maxWidth: '100%',
    overflowX: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: '1px solid #EDE8E0',
  },
  headerTitle: {
    fontSize: '26px',
    fontWeight: 700,
    color: '#1C1917',
    letterSpacing: '-0.5px',
    marginBottom: '4px',
  },
  headerSub: {
    fontSize: '13px',
    color: '#A8A29E',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    background: 'linear-gradient(135deg, #2D7A50, #1A4731)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13.5px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  searchWrap: {
    position: 'relative',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '11px 40px',
    fontSize: '14px',
    background: '#fff',
    border: '1.5px solid #EDE8E0',
    borderRadius: '10px',
    outline: 'none',
    fontFamily: 'inherit',
    color: '#1C1917',
    boxSizing: 'border-box',
  },
  clearBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#A8A29E',
    fontSize: '13px',
    padding: '4px',
  },
  tableCard: {
    background: '#fff',
    borderRadius: '14px',
    border: '1px solid #EDE8E0',
    overflow: 'hidden',
  },
  tableInfo: {
    padding: '12px 16px',
    borderBottom: '1px solid #F5F0E8',
    background: '#FAFAF9',
  },
  tableCount: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#A8A29E',
    letterSpacing: '0.3px',
  },
  tableScrollWrap: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    minWidth: '600px',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left' as const,
    fontSize: '11px',
    fontWeight: 700,
    color: '#A8A29E',
    letterSpacing: '0.5px',
    background: '#FAFAF9',
    borderBottom: '1px solid #EDE8E0',
  },
  td: {
    padding: '12px 16px',
    color: '#44403C',
    borderBottom: '1px solid #F5F0E8',
    fontSize: '13px',
  },
  tdNo: {
    color: '#C4BDB4',
    fontWeight: 600,
    width: '48px',
  },
  namaText: {
    fontWeight: 600,
    color: '#1C1917',
  },
  hpLink: {
    color: '#2D7A50',
    textDecoration: 'none',
    fontWeight: 500,
  },
  emptyCell: {
    color: '#D4CEC7',
  },
  centerState: {
    padding: '64px 32px',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
  },
  spinner: {
    width: '28px',
    height: '28px',
    border: '3px solid #EDE8E0',
    borderTop: '3px solid #2D7A50',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    marginBottom: '8px',
  },
  emptyIcon: { fontSize: '32px', marginBottom: '4px' },
  stateTitle: { fontSize: '15px', fontWeight: 600, color: '#57534E' },
  stateText: { fontSize: '13px', color: '#A8A29E' },

  /* Mobile card list */
  mobileListContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  tableCountMobile: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#A8A29E',
    marginBottom: '2px',
  },
  mobileCard: {
    background: '#fff',
    border: '1px solid #EDE8E0',
    borderRadius: '12px',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  mobileCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #F5F0E8',
    paddingBottom: '8px',
  },
  mobileCardBody: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  mobileCardFooter: {
    borderTop: '1px solid #F5F0E8',
    paddingTop: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '3px',
  },
  mobileFooterText: {
    fontSize: '12px',
    color: '#78716C',
  },
  mobileLabelText: {
    fontSize: '11px',
    color: '#A8A29E',
    marginBottom: '2px',
  },
  mobileValueText: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#1C1917',
  },
  mobileTimeText: {
    fontSize: '11px',
    color: '#78716C',
  },

  // Modal
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '0',
  },
  modal: {
    background: '#fff',
    borderRadius: '16px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    overflow: 'hidden',
    maxHeight: '100vh',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #EDE8E0',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1C1917',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    color: '#A8A29E',
    cursor: 'pointer',
    padding: '4px',
  },
  modalBody: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    maxHeight: '60vh',
    overflowY: 'auto',
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#44403C',
  },
  required: {
    color: '#E11D48',
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1.5px solid #EDE8E0',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
    color: '#1C1917',
    background: '#FAFAF9',
    boxSizing: 'border-box',
  },
  textarea: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1.5px solid #EDE8E0',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
    color: '#1C1917',
    background: '#FAFAF9',
    resize: 'vertical' as const,
    boxSizing: 'border-box',
  },
  errorText: {
    fontSize: '13px',
    color: '#B91C1C',
    fontWeight: 500,
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '16px 24px',
    borderTop: '1px solid #EDE8E0',
    background: '#FAFAF9',
  },
  cancelBtn: {
    padding: '9px 18px',
    fontSize: '13.5px',
    fontWeight: 600,
    color: '#57534E',
    background: '#fff',
    border: '1.5px solid #EDE8E0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  saveBtn: {
    padding: '9px 18px',
    fontSize: '13.5px',
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #2D7A50, #1A4731)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
}
