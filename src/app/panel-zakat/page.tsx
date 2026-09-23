'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useIsMobile } from '@/hooks/useIsMobile'
import { shared } from '@/styles/shared'
import { colors, font, radius } from '@/styles/tokens'

interface Lembaga {
  id: number
  nama: string
  alamat: string | null
  satuan_beras: 'kg' | 'liter'
  kode_registrasi: { kode: string } | null
}

interface Amil {
  id: string
  nama: string
  email: string
  joinedAt: string | null
}

function formatTanggal(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function maskKode(kode: string) {
  return `${kode.slice(0, 4)}••••••••${kode.slice(-4)}`
}

export default function PanelZakatPage() {
  const router = useRouter()
  const supabase = createClient()
  const isMobile = useIsMobile()

  const [lembagaList, setLembagaList] = useState<Lembaga[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null)

  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ nama: '', alamat: '', satuan_beras: 'kg' as 'kg' | 'liter' })
  const [addError, setAddError] = useState('')
  const [saving, setSaving] = useState(false)

  const [amilModal, setAmilModal] = useState<{ lembagaNama: string; loading: boolean; data: Amil[] } | null>(null)

  async function fetchLembaga() {
    setLoading(true)
    const res = await fetch('/api/panel-zakat/lembaga')
    if (res.status === 403) { setForbidden(true); setLoading(false); return }
    const json = await res.json()
    setLembagaList(json.data ?? [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch awal saat mount, disengaja
  useEffect(() => { fetchLembaga() }, [])

  function toggleReveal(id: number) {
    setRevealed(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  async function handleCopy(id: number, kode: string) {
    try {
      await navigator.clipboard.writeText(kode)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {}
  }

  async function handleRegenerate(id: number) {
    setRegeneratingId(id)
    const res = await fetch(`/api/panel-zakat/lembaga/${id}/regenerate-kode`, { method: 'POST' })
    const json = await res.json()
    setRegeneratingId(null)
    if (!res.ok) return
    setLembagaList(list => list.map(l => l.id === id ? { ...l, kode_registrasi: { kode: json.kode } } : l))
  }

  async function handleViewAmil(lembaga: Lembaga) {
    setAmilModal({ lembagaNama: lembaga.nama, loading: true, data: [] })
    const res = await fetch(`/api/panel-zakat/lembaga/${lembaga.id}/amil`)
    const json = await res.json()
    setAmilModal(m => m && { ...m, loading: false, data: json.data ?? [] })
  }

  async function handleAddLembaga() {
    if (!addForm.nama.trim()) { setAddError('Nama lembaga wajib diisi.'); return }
    setSaving(true)
    setAddError('')
    const res = await fetch('/api/panel-zakat/lembaga', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setAddError(json.error ?? 'Gagal menambah lembaga.'); return }
    setShowAddModal(false)
    setAddForm({ nama: '', alamat: '', satuan_beras: 'kg' })
    fetchLembaga()
  }

  function handleCloseAddModal() {
    setShowAddModal(false)
    setAddForm({ nama: '', alamat: '', satuan_beras: 'kg' })
    setAddError('')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (forbidden) {
    return (
      <div style={{ ...shared.shell, alignItems: 'center', justifyContent: 'center' }}>
        <div style={shared.centerState}>
          <p style={shared.emptyIcon}>🚫</p>
          <p style={shared.stateTitle}>Akses Ditolak</p>
          <p style={shared.stateText}>Halaman ini cuma bisa diakses oleh super admin.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={shared.shell}>
      <main style={{ ...shared.main, padding: isMobile ? '20px 16px' : '32px 36px' }}>

        <div style={{
          ...shared.pageHeader,
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          gap: isMobile ? '14px' : '0',
        }}>
          <div>
            <h1 style={{ ...shared.headerTitle, fontSize: isMobile ? font.h2 : font.h1 }}>Panel Super Admin</h1>
            <p style={shared.headerSub}>Kelola lembaga, kode registrasi, dan amil</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column' : 'row' }}>
            <button onClick={() => setShowAddModal(true)} style={{ ...shared.btnPrimary, width: isMobile ? '100%' : 'auto', padding: '10px 18px' }}>
              + Tambah Lembaga
            </button>
            <button onClick={handleLogout} style={{ ...shared.btnOutline, width: isMobile ? '100%' : 'auto' }}>
              Keluar
            </button>
          </div>
        </div>

        {loading ? (
          <div style={shared.tableCard}>
            <div style={shared.centerState}>
              <div style={shared.spinner} />
              <p style={shared.stateText}>Memuat data lembaga...</p>
            </div>
          </div>
        ) : lembagaList.length === 0 ? (
          <div style={shared.tableCard}>
            <div style={shared.centerState}>
              <p style={shared.emptyIcon}>🏢</p>
              <p style={shared.stateTitle}>Belum ada lembaga</p>
              <p style={shared.stateText}>Klik &quot;Tambah Lembaga&quot; untuk mendaftarkan lembaga pertama.</p>
            </div>
          </div>
        ) : isMobile ? (
          <div style={s.mobileListContainer}>
            {lembagaList.map(l => {
              const kode = l.kode_registrasi?.kode ?? '—'
              const isRevealed = revealed.has(l.id)
              return (
                <div key={l.id} style={s.mobileCard}>
                  <p style={s.namaText}>{l.nama}</p>
                  {l.alamat && <p style={s.alamatText}>{l.alamat}</p>}
                  <div style={s.kodeRow}>
                    <span style={s.kodeText}>{isRevealed ? kode : maskKode(kode)}</span>
                    <button onClick={() => toggleReveal(l.id)} style={s.iconBtn}>{isRevealed ? '🙈' : '👁'}</button>
                    <button onClick={() => handleCopy(l.id, kode)} style={s.iconBtn}>
                      {copiedId === l.id ? '✓' : '📋'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleRegenerate(l.id)}
                      disabled={regeneratingId === l.id}
                      style={{ ...shared.btnOutline, flex: 1, ...(regeneratingId === l.id ? shared.btnDisabled : {}) }}
                    >
                      {regeneratingId === l.id ? 'Memproses...' : 'Generate Ulang'}
                    </button>
                    <button onClick={() => handleViewAmil(l)} style={{ ...shared.btnOutline, flex: 1 }}>
                      Lihat Amil
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={shared.tableCard}>
            <table style={shared.table}>
              <thead>
                <tr>
                  {['Nama Lembaga', 'Alamat', 'Kode Registrasi', 'Aksi'].map(h => (
                    <th key={h} style={shared.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lembagaList.map((l, i) => {
                  const kode = l.kode_registrasi?.kode ?? '—'
                  const isRevealed = revealed.has(l.id)
                  return (
                    <tr key={l.id} style={{ background: i % 2 === 0 ? colors.surface : colors.surfaceAlt }}>
                      <td style={shared.td}><span style={s.namaText}>{l.nama}</span></td>
                      <td style={shared.td}>{l.alamat ?? <span style={s.emptyCell}>—</span>}</td>
                      <td style={shared.td}>
                        <div style={s.kodeRow}>
                          <span style={s.kodeText}>{isRevealed ? kode : maskKode(kode)}</span>
                          <button onClick={() => toggleReveal(l.id)} style={s.iconBtn}>{isRevealed ? '🙈' : '👁'}</button>
                          <button onClick={() => handleCopy(l.id, kode)} style={s.iconBtn}>
                            {copiedId === l.id ? '✓' : '📋'}
                          </button>
                        </div>
                      </td>
                      <td style={shared.td}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleRegenerate(l.id)}
                            disabled={regeneratingId === l.id}
                            style={{ ...shared.btnOutline, ...(regeneratingId === l.id ? shared.btnDisabled : {}) }}
                          >
                            {regeneratingId === l.id ? '...' : 'Generate Ulang'}
                          </button>
                          <button onClick={() => handleViewAmil(l)} style={shared.btnOutline}>
                            Lihat Amil
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal Tambah Lembaga */}
      {showAddModal && (
        <div style={shared.overlay} onClick={handleCloseAddModal}>
          <div
            style={{ ...shared.card, width: '100%', maxWidth: isMobile ? '100%' : '440px', margin: isMobile ? '0' : undefined }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ ...shared.cardHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${colors.border}` }}>
              <h2 style={{ ...shared.cardTitle, fontSize: font.lg, margin: 0 }}>Tambah Lembaga</h2>
              <button onClick={handleCloseAddModal} style={s.closeBtn}>✕</button>
            </div>
            <div style={{ ...shared.modalBody, maxHeight: '60vh' }}>
              <div style={shared.field}>
                <label style={shared.label}>Nama Lembaga <span style={shared.required}>*</span></label>
                <input type="text" placeholder="Masjid Al-Ikhlas" value={addForm.nama}
                  onChange={e => setAddForm(f => ({ ...f, nama: e.target.value }))}
                  style={shared.input} autoFocus />
              </div>
              <div style={shared.field}>
                <label style={shared.label}>Alamat</label>
                <textarea placeholder="Alamat lengkap (opsional)" value={addForm.alamat}
                  onChange={e => setAddForm(f => ({ ...f, alamat: e.target.value }))}
                  style={shared.textarea} rows={2} />
              </div>
              <div style={shared.field}>
                <label style={shared.label}>Satuan Beras Zakat Fitrah</label>
                <select value={addForm.satuan_beras}
                  onChange={e => setAddForm(f => ({ ...f, satuan_beras: e.target.value as 'kg' | 'liter' }))}
                  style={shared.select}>
                  <option value="kg">Kilogram (Kg)</option>
                  <option value="liter">Liter</option>
                </select>
              </div>
              {addError && <div style={shared.errorBox}>⚠ {addError}</div>}
            </div>
            <div style={shared.modalFooter}>
              <button onClick={handleCloseAddModal} style={shared.btnOutline}>Batal</button>
              <button onClick={handleAddLembaga} disabled={saving} style={{ ...shared.btnPrimary, ...(saving ? shared.btnDisabled : {}) }}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Daftar Amil */}
      {amilModal && (
        <div style={shared.overlay} onClick={() => setAmilModal(null)}>
          <div
            style={{ ...shared.card, width: '100%', maxWidth: isMobile ? '100%' : '480px', margin: isMobile ? '0' : undefined }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ ...shared.cardHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${colors.border}` }}>
              <h2 style={{ ...shared.cardTitle, fontSize: font.lg, margin: 0 }}>Amil — {amilModal.lembagaNama}</h2>
              <button onClick={() => setAmilModal(null)} style={s.closeBtn}>✕</button>
            </div>
            <div style={{ ...shared.modalBody, maxHeight: '60vh' }}>
              {amilModal.loading ? (
                <div style={shared.centerState}>
                  <div style={shared.spinner} />
                  <p style={shared.stateText}>Memuat data amil...</p>
                </div>
              ) : amilModal.data.length === 0 ? (
                <p style={shared.stateText}>Belum ada amil yang join lembaga ini.</p>
              ) : (
                amilModal.data.map(a => (
                  <div key={a.id} style={shared.konfRow}>
                    <div>
                      <p style={s.amilNama}>{a.nama}</p>
                      <p style={s.amilEmail}>{a.email}</p>
                    </div>
                    <span style={s.amilJoined}>{formatTanggal(a.joinedAt)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  namaText: { fontWeight: 700, color: colors.text, fontSize: font.md },
  alamatText: { fontSize: font.sm, color: colors.textSubtle },
  emptyCell: { color: '#D4CEC7' },
  kodeRow: { display: 'flex', alignItems: 'center', gap: '6px' },
  kodeText: { fontFamily: 'monospace', fontSize: font.sm, color: colors.text, letterSpacing: '0.5px' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: font.base, padding: '2px 4px' },
  closeBtn: { background: 'none', border: 'none', fontSize: font.xl, color: colors.textDisabled, cursor: 'pointer', padding: '4px' },
  amilNama: { fontWeight: 600, color: colors.text, fontSize: font.base },
  amilEmail: { fontSize: font.sm, color: colors.textSubtle },
  amilJoined: { fontSize: font.sm, color: colors.textDisabled },

  mobileListContainer: { display: 'flex', flexDirection: 'column', gap: '10px' },
  mobileCard: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' },
}
