'use client'

import React, { useEffect, useState } from 'react'
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
  const [filtered, setFiltered] = useState<Muzakki[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ nama: '', nomor_hp: '', alamat: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function fetchData() {
    setLoading(true)
    const { data: rows } = await supabase
      .from('muzakki')
      .select('*')
      .order('created_at', { ascending: false })
    setData(rows ?? [])
    setFiltered(rows ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      data.filter(m =>
        m.nama.toLowerCase().includes(q) ||
        (m.nomor_hp ?? '').includes(q) ||
        (m.alamat ?? '').toLowerCase().includes(q)
      )
    )
  }, [search, data])

  const handleSave = async () => {
    if (!form.nama.trim()) { setError('Nama wajib diisi.'); return }
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('muzakki').insert({
      nama: form.nama.trim(),
      nomor_hp: form.nomor_hp.trim() || null,
      alamat: form.alamat.trim() || null,
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
      <main style={s.main}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={s.headerTitle}>Muzakki</h1>
            <p style={s.headerSub}>Daftar pembayar zakat yang terdaftar</p>
          </div>
          <button onClick={() => setShowModal(true)} style={s.addBtn}>
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

        {/* Table */}
        <div style={s.tableCard}>
          {loading ? (
            <div style={s.centerState}>
              <div style={s.spinner} />
              <p style={s.stateText}>Memuat data...</p>
            </div>
          ) : filtered.length === 0 ? (
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
          ) : (
            <>
              <div style={s.tableInfo}>
                <span style={s.tableCount}>
                  {filtered.length} muzakki{search ? ` ditemukan` : ' terdaftar'}
                </span>
              </div>
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
            </>
          )}
        </div>
      </main>

      {/* Modal Tambah Muzakki */}
      {showModal && (
        <div style={s.overlay} onClick={handleCloseModal}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
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

            <div style={s.modalFooter}>
              <button onClick={handleCloseModal} style={s.cancelBtn}>Batal</button>
              <button onClick={handleSave} disabled={saving} style={s.saveBtn}>
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
  },
  main: {
    marginLeft: '220px',
    flex: 1,
    padding: '32px 36px',
    maxWidth: '1100px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
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

  // Modal
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    background: '#fff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    overflow: 'hidden',
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