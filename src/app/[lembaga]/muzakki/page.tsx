'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useIsMobile } from '@/hooks/useIsMobile'
import Sidebar from '@/components/Sidebar'
import { shared } from '@/styles/shared'
import { colors, font } from '@/styles/tokens'

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
  const isMobile = useIsMobile()

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
      .order('nama', { ascending: true })
    setData(rows ?? [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch awal saat mount
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

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profil } = await supabase
      .from('profil_amil')
      .select('lembaga_id')
      .eq('id', user!.id)
      .single()

    const { error: err } = await supabase.from('muzakki').insert({
      nama: form.nama.trim(),
      nomor_hp: form.nomor_hp.trim() || null,
      alamat: form.alamat.trim() || null,
      lembaga_id: profil?.lembaga_id ?? null,
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
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          gap: isMobile ? '14px' : '0',
        }}>
          <div>
            <h1 style={{ ...shared.headerTitle, fontSize: isMobile ? font.h2 : font.h1 }}>Muzakki</h1>
            <p style={shared.headerSub}>Daftar pembayar zakat yang terdaftar</p>
          </div>
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
            Tambah Muzakki
          </button>
        </div>

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
          {search && (
            <button onClick={() => setSearch('')} style={shared.clearBtn}>✕</button>
          )}
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
              <p style={shared.emptyIcon}>{search ? '🔍' : '👤'}</p>
              <p style={shared.stateTitle}>
                {search ? 'Tidak ditemukan' : 'Belum ada muzakki'}
              </p>
              <p style={shared.stateText}>
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
                        <span style={{ color: colors.textPlaceholder }}>—</span>
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
          <div style={shared.tableCard}>
            <div style={shared.tableInfo}>
              <span style={shared.tableCount}>
                {filtered.length} muzakki{search ? ' ditemukan' : ' terdaftar'}
              </span>
            </div>
            <div style={shared.tableScrollWrap}>
              <table style={shared.table}>
                <thead>
                  <tr>
                    {['No', 'Nama', 'Nomor HP', 'Alamat', 'Terdaftar'].map(h => (
                      <th key={h} style={shared.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, i) => (
                    <tr key={m.id} style={{ background: i % 2 === 0 ? colors.surface : colors.surfaceAlt }}>
                      <td style={{ ...shared.td, color: colors.textPlaceholder, fontWeight: 600, width: '48px' }}>{i + 1}</td>
                      <td style={shared.td}>
                        <span style={s.namaText}>{m.nama}</span>
                      </td>
                      <td style={shared.td}>
                        {m.nomor_hp
                          ? <a href={`tel:${m.nomor_hp}`} style={s.hpLink}>{m.nomor_hp}</a>
                          : <span style={{ color: colors.textPlaceholder }}>—</span>}
                      </td>
                      <td style={shared.td}>
                        {m.alamat ?? <span style={{ color: colors.textPlaceholder }}>—</span>}
                      </td>
                      <td style={{ ...shared.td, color: colors.textDisabled }}>
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
              ...shared.card,
              width: '100%',
              maxWidth: isMobile ? '100%' : '440px',
              margin: isMobile ? '0' : undefined,
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              maxHeight: '100vh',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ ...shared.cardHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${colors.border}` }}>
              <h2 style={{ ...shared.cardTitle, fontSize: font.lg, margin: 0 }}>Tambah Muzakki</h2>
              <button onClick={handleCloseModal} style={shared.clearBtn}>✕</button>
            </div>

            <div style={{ ...shared.cardBody, padding: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={shared.field}>
                <label style={shared.label}>Nama <span style={s.required}>*</span></label>
                <input
                  type="text"
                  placeholder="Nama lengkap"
                  value={form.nama}
                  onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                  style={shared.input}
                  autoFocus
                />
              </div>
              <div style={shared.field}>
                <label style={shared.label}>Nomor HP</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={13}
                  placeholder="08xxxxxxxxxx"
                  value={form.nomor_hp}
                  onChange={e => setForm(f => ({ ...f, nomor_hp: e.target.value.replace(/\D/g, '').slice(0, 13) }))}
                  style={shared.input}
                />
              </div>
              <div style={shared.field}>
                <label style={shared.label}>Alamat</label>
                <textarea
                  placeholder="Alamat lengkap (opsional)"
                  value={form.alamat}
                  onChange={e => setForm(f => ({ ...f, alamat: e.target.value }))}
                  style={shared.textarea}
                  rows={3}
                />
              </div>

              {error && <div style={shared.errorBox}>⚠ {error}</div>}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                padding: '16px 24px',
                borderTop: `1px solid ${colors.border}`,
                background: colors.surfaceAlt,
                flexDirection: isMobile ? 'column-reverse' : 'row',
              }}
            >
              <button
                onClick={handleCloseModal}
                style={{
                  ...shared.btnOutline,
                  width: isMobile ? '100%' : 'auto',
                }}
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  ...shared.btnPrimary,
                  width: isMobile ? '100%' : 'auto',
                  opacity: saving ? 0.6 : 1,
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
  searchIcon: { position: 'absolute', left: '12px', pointerEvents: 'none' },
  namaText: { fontWeight: 600, color: colors.text },
  hpLink: { color: colors.primary, textDecoration: 'none', fontWeight: 500 },
  required: { color: colors.danger },
  
  /* Mobile card list */
  mobileListContainer: { display: 'flex', flexDirection: 'column', gap: '10px' },
  tableCountMobile: { fontSize: font.sm, fontWeight: 600, color: colors.textDisabled, marginBottom: '2px' },
  mobileCard: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  mobileCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.borderLight}`, paddingBottom: '8px' },
  mobileCardBody: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
  mobileCardFooter: { borderTop: `1px solid ${colors.borderLight}`, paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' },
  mobileFooterText: { fontSize: font.sm, color: colors.textSubtle },
  mobileLabelText: { fontSize: font.xs, color: colors.textDisabled, marginBottom: '2px' },
  mobileValueText: { fontSize: font.md, fontWeight: 600, color: colors.text },
  mobileTimeText: { fontSize: font.xs, color: colors.textSubtle },

  /* Modal Overlay */
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
}
