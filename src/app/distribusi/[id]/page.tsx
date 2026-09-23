'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useIsMobile } from '@/hooks/useIsMobile'
import Sidebar from '@/components/Sidebar'
import { shared } from '@/styles/shared'
import { colors, font, radius } from '@/styles/tokens'

type Jenis = 'Zakat Mal' | 'Zakat Fitrah'

const STATUS_PENERIMA_LIST = ['Kepala Keluarga', 'Istri', 'Anak', 'Saudara', 'Perwakilan']

interface Sesi {
  id: number
  jenis: Jenis
  total_uang: number
  total_beras: number
  jumlah_penerima: number
  tanggal: string
  amil_pencatat: string | null
}

interface PenerimaRow {
  id: number
  mustahik_id: number
  jumlah_uang: number
  jumlah_beras: number
  sudah_diterima: boolean
  diterima_at: string | null
  diterima_oleh: string | null
  status_penerima: string | null
  tanda_tangan: string | null
  mustahik: { nama: string } | null
  anggota: { nama: string; hubungan: string } | null
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}
function formatTanggal(iso: string) {
  return new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Bantalan tanda tangan sederhana pakai canvas polos -- tanpa library baru.
// Internal resolution canvas dipatok tetap (600x220) sementara ukuran
// tampilnya responsif lewat CSS, jadi posisi kursor/jari perlu diskalakan
// balik ke resolusi internal supaya gak meleset di layar sempit.
function SignaturePad({ canvasRef, onDraw }: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onDraw: () => void
}) {
  const drawingRef = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const point = 'touches' in e ? e.touches[0] : e
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return { x: (point.clientX - rect.left) * scaleX, y: (point.clientY - rect.top) * scaleY }
  }

  function start(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current
    if (!canvas) return
    drawingRef.current = true
    lastPos.current = getPos(e, canvas)
  }
  function move(e: React.MouseEvent | React.TouchEvent) {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas || !lastPos.current) return
    e.preventDefault()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.strokeStyle = colors.text
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
    onDraw()
  }
  function end() { drawingRef.current = false; lastPos.current = null }

  return (
    <canvas
      ref={canvasRef}
      width={600} height={220}
      style={s.signatureCanvas}
      onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
      onTouchStart={start} onTouchMove={move} onTouchEnd={end}
    />
  )
}

export default function DetailSesiPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const isMobile = useIsMobile()

  const [sesi, setSesi] = useState<Sesi | null>(null)
  const [rows, setRows] = useState<PenerimaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  // ── Form "Tandai Diterima" ──
  const [formRow, setFormRow] = useState<PenerimaRow | null>(null)
  const [namaPenerima, setNamaPenerima] = useState('')
  const [statusPenerima, setStatusPenerima] = useState('')
  const [hasSignature, setHasSignature] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // ── Viewer bukti (buat yang sudah diterima) ──
  const [viewRow, setViewRow] = useState<PenerimaRow | null>(null)

  async function fetchAll() {
    setLoading(true)
    const { data: sesiData, error: sesiErr } = await supabase
      .from('sesi_distribusi').select('*').eq('id', id).single()

    if (sesiErr || !sesiData) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setSesi(sesiData)

    const { data: itemRows } = await supabase
      .from('distribusi_zakat')
      .select('id, mustahik_id, jumlah_uang, jumlah_beras, sudah_diterima, diterima_at, diterima_oleh, status_penerima, tanda_tangan, mustahik ( nama ), anggota:anggota_id ( nama, hubungan )')
      .eq('sesi_id', id)
      .order('mustahik_id')

    setRows((itemRows as unknown as PenerimaRow[]) ?? [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch awal saat mount, disengaja
  useEffect(() => { fetchAll() }, [id])

  async function handleBatalkan(row: PenerimaRow) {
    setTogglingId(row.id)
    const { error } = await supabase
      .from('distribusi_zakat')
      .update({ sudah_diterima: false, diterima_at: null, diterima_oleh: null, status_penerima: null, tanda_tangan: null })
      .eq('id', row.id)

    if (!error) {
      setRows(rs => rs.map(r => r.id === row.id ? { ...r, sudah_diterima: false, diterima_at: null, diterima_oleh: null, status_penerima: null, tanda_tangan: null } : r))
    }
    setTogglingId(null)
  }

  function handleOpenForm(row: PenerimaRow) {
    setFormRow(row)
    setNamaPenerima(row.anggota ? row.anggota.nama : row.mustahik?.nama ?? '')
    setStatusPenerima(!row.anggota ? 'Kepala Keluarga' : STATUS_PENERIMA_LIST.includes(row.anggota.hubungan) ? row.anggota.hubungan : '')
    setHasSignature(false)
    setFormError('')
  }
  function handleCloseForm() { setFormRow(null) }

  function handleClearSignature() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  async function handleSubmitTerima() {
    if (!formRow) return
    if (!namaPenerima.trim()) { setFormError('Nama penerima wajib diisi.'); return }
    if (!statusPenerima) { setFormError('Status penerima wajib dipilih.'); return }
    if (!hasSignature) { setFormError('Tanda tangan wajib diisi.'); return }

    setFormSubmitting(true)
    setFormError('')

    const tandaTangan = canvasRef.current?.toDataURL('image/png') ?? null
    const now = new Date().toISOString()
    const namaTrim = namaPenerima.trim()

    const { error } = await supabase
      .from('distribusi_zakat')
      .update({ sudah_diterima: true, diterima_at: now, diterima_oleh: namaTrim, status_penerima: statusPenerima, tanda_tangan: tandaTangan })
      .eq('id', formRow.id)

    setFormSubmitting(false)
    if (error) { setFormError('Gagal menyimpan. Coba lagi.'); return }

    setRows(rs => rs.map(r => r.id === formRow.id
      ? { ...r, sudah_diterima: true, diterima_at: now, diterima_oleh: namaTrim, status_penerima: statusPenerima, tanda_tangan: tandaTangan }
      : r))
    setFormRow(null)
  }

  const totalDiterima = rows.filter(r => r.sudah_diterima).length

  return (
    <div style={shared.shell}>
      <Sidebar />
      <main style={{
        ...shared.main,
        marginLeft: isMobile ? 0 : '220px',
        padding: isMobile ? '64px 16px 20px' : '32px 36px',
      }}>
        <button onClick={() => router.push('/distribusi')} style={s.backBtn}>← Kembali ke Distribusi</button>

        {loading ? (
          <div style={shared.tableCard}>
            <div style={shared.centerState}><div style={shared.spinner} /><p style={shared.stateText}>Memuat sesi...</p></div>
          </div>
        ) : notFound || !sesi ? (
          <div style={shared.tableCard}>
            <div style={shared.centerState}>
              <p style={shared.emptyIcon}>❓</p>
              <p style={shared.stateTitle}>Sesi tidak ditemukan</p>
            </div>
          </div>
        ) : (
          <>
            <div style={{ ...shared.pageHeader, marginBottom: '20px', paddingBottom: '20px' }}>
              <div>
                <h1 style={{ ...shared.headerTitle, fontSize: isMobile ? font.h2 : font.h1 }}>
                  Status Penerimaan — {sesi.jenis}
                </h1>
                <p style={shared.headerSub}>{formatTanggal(sesi.tanggal)} · dicatat oleh {sesi.amil_pencatat ?? '—'}</p>
              </div>
              <span style={{ ...shared.badge, ...(sesi.jenis === 'Zakat Mal' ? shared.badgePrimary : shared.badgeGold) }}>{sesi.jenis}</span>
            </div>

            <div style={s.progressBox}>
              <p style={s.progressLabel}>Progres Penyerahan</p>
              <p style={s.progressValue}>{totalDiterima} / {rows.length} penerima sudah menerima</p>
              <div style={s.progressBarTrack}>
                <div style={{ ...s.progressBarFill, width: rows.length ? `${(totalDiterima / rows.length) * 100}%` : '0%' }} />
              </div>
            </div>

            {isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {rows.map(r => (
                  <div key={r.id} style={s.card}>
                    <div style={s.cardHeader}>
                      <div>
                        <span style={s.nama}>{r.anggota ? r.anggota.nama : r.mustahik?.nama ?? '—'}</span>
                        <p style={s.peran}>{r.anggota ? `${r.mustahik?.nama ?? '—'} · ${r.anggota.hubungan}` : 'Kepala Keluarga'}</p>
                      </div>
                      <span style={{ ...shared.badge, ...(r.sudah_diterima ? shared.badgePrimary : {}) }}>
                        {r.sudah_diterima ? 'Diterima' : 'Belum'}
                      </span>
                    </div>
                    <p style={s.jumlah}>
                      {r.jumlah_uang > 0 ? formatRupiah(r.jumlah_uang) : ''}
                      {r.jumlah_uang > 0 && r.jumlah_beras > 0 ? ' + ' : ''}
                      {r.jumlah_beras > 0 ? `${r.jumlah_beras} Kg` : ''}
                    </p>
                    {r.sudah_diterima && (
                      <p style={s.buktiMeta}>oleh {r.diterima_oleh ?? '—'} ({r.status_penerima ?? '—'}) · {r.diterima_at ? formatTanggal(r.diterima_at) : '—'}</p>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {r.sudah_diterima ? (
                        <>
                          <button onClick={() => setViewRow(r)} style={{ ...shared.btnOutline, flex: 1 }}>Lihat Bukti</button>
                          <button
                            onClick={() => handleBatalkan(r)}
                            disabled={togglingId === r.id}
                            style={{ ...shared.btnOutline, flex: 1, ...(togglingId === r.id ? shared.btnDisabled : {}) }}
                          >
                            {togglingId === r.id ? '...' : 'Batalkan'}
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleOpenForm(r)} style={{ ...shared.btnPrimary, flex: 1 }}>Tandai Diterima</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={shared.tableCard}>
                <div style={shared.tableScrollWrap}>
                  <table style={{ ...shared.table, minWidth: '700px' }}>
                    <thead>
                      <tr>
                        {['Keluarga', 'Penerima', 'Peran', 'Jumlah', 'Status', 'Aksi'].map(h => (
                          <th key={h} style={shared.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.id} style={{ background: i % 2 === 0 ? colors.surface : colors.surfaceAlt }}>
                          <td style={{ ...shared.td, color: colors.textSubtle }}>{r.mustahik?.nama ?? '—'}</td>
                          <td style={shared.td}>{r.anggota ? r.anggota.nama : r.mustahik?.nama ?? '—'}</td>
                          <td style={{ ...shared.td, color: colors.textSubtle, fontSize: font.sm }}>{r.anggota ? r.anggota.hubungan : 'Kepala Keluarga'}</td>
                          <td style={shared.td}>
                            {r.jumlah_uang > 0 ? formatRupiah(r.jumlah_uang) : ''}
                            {r.jumlah_uang > 0 && r.jumlah_beras > 0 ? ' + ' : ''}
                            {r.jumlah_beras > 0 ? `${r.jumlah_beras} Kg` : ''}
                          </td>
                          <td style={shared.td}>
                            <span style={{ ...shared.badge, ...(r.sudah_diterima ? shared.badgePrimary : {}) }}>
                              {r.sudah_diterima ? 'Diterima' : 'Belum'}
                            </span>
                          </td>
                          <td style={shared.td}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {r.sudah_diterima ? (
                                <>
                                  <button onClick={() => setViewRow(r)} style={{ ...shared.btnOutline, padding: '6px 12px', fontSize: font.sm }}>
                                    Lihat Bukti
                                  </button>
                                  <button
                                    onClick={() => handleBatalkan(r)}
                                    disabled={togglingId === r.id}
                                    style={{ ...shared.btnOutline, padding: '6px 12px', fontSize: font.sm, ...(togglingId === r.id ? shared.btnDisabled : {}) }}
                                  >
                                    {togglingId === r.id ? '...' : 'Batalkan'}
                                  </button>
                                </>
                              ) : (
                                <button onClick={() => handleOpenForm(r)} style={{ ...shared.btnPrimary, padding: '6px 12px', fontSize: font.sm }}>
                                  Tandai Diterima
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal: form tandai diterima */}
      {formRow && (
        <div style={shared.overlay} onClick={handleCloseForm}>
          <div style={{ ...shared.modal, maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={shared.modalHeader}>
              <div>
                <h2 style={shared.modalTitle}>Konfirmasi Penerimaan</h2>
                <p style={shared.modalSub}>
                  {formRow.anggota ? `${formRow.anggota.nama} (${formRow.mustahik?.nama ?? '—'})` : formRow.mustahik?.nama ?? '—'}
                  {' · '}
                  {formRow.jumlah_uang > 0 ? formatRupiah(formRow.jumlah_uang) : ''}
                  {formRow.jumlah_uang > 0 && formRow.jumlah_beras > 0 ? ' + ' : ''}
                  {formRow.jumlah_beras > 0 ? `${formRow.jumlah_beras} Kg` : ''}
                </p>
              </div>
              <button onClick={handleCloseForm} style={shared.closeBtn}>✕</button>
            </div>
            <div style={shared.modalBody}>
              <div style={shared.field}>
                <label style={shared.label}>Diterima oleh <span style={shared.required}>*</span></label>
                <input
                  type="text" value={namaPenerima}
                  onChange={e => setNamaPenerima(e.target.value)}
                  style={shared.input}
                  placeholder="Nama yang menerima langsung"
                />
                <p style={shared.fieldHint}>Bisa diubah kalau yang menerima bukan mustahik/anggota itu sendiri (misal dititipkan ke wakilnya).</p>
              </div>

              <div style={shared.field}>
                <label style={shared.label}>Status Penerima <span style={shared.required}>*</span></label>
                <select
                  value={statusPenerima}
                  onChange={e => setStatusPenerima(e.target.value)}
                  style={shared.select}
                >
                  <option value="">-- Pilih Status --</option>
                  {STATUS_PENERIMA_LIST.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>

              <div style={shared.field}>
                <label style={shared.label}>Tanda Tangan Digital <span style={shared.required}>*</span></label>
                <SignaturePad canvasRef={canvasRef} onDraw={() => setHasSignature(true)} />
                <button type="button" onClick={handleClearSignature} style={{ ...shared.btnOutline, marginTop: '8px', padding: '6px 14px', fontSize: font.sm }}>
                  Bersihkan
                </button>
              </div>

              {formError && <div style={shared.errorBox}>⚠ {formError}</div>}
            </div>
            <div style={shared.modalFooter}>
              <button onClick={handleCloseForm} style={shared.btnOutline}>Batal</button>
              <button
                onClick={handleSubmitTerima}
                disabled={formSubmitting}
                style={{ ...shared.btnPrimary, ...(formSubmitting ? shared.btnDisabled : {}) }}
              >
                {formSubmitting ? 'Menyimpan...' : '✓ Konfirmasi & Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: lihat bukti penerimaan */}
      {viewRow && (
        <div style={shared.overlay} onClick={() => setViewRow(null)}>
          <div style={{ ...shared.modal, maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={shared.modalHeader}>
              <div>
                <h2 style={shared.modalTitle}>Bukti Penerimaan</h2>
                <p style={shared.modalSub}>
                  {viewRow.anggota ? `${viewRow.anggota.nama} (${viewRow.mustahik?.nama ?? '—'})` : viewRow.mustahik?.nama ?? '—'}
                </p>
              </div>
              <button onClick={() => setViewRow(null)} style={shared.closeBtn}>✕</button>
            </div>
            <div style={shared.modalBody}>
              <div style={shared.konfRow}>
                <span style={shared.konfLabel}>Diterima oleh</span>
                <span style={shared.konfValue}>{viewRow.diterima_oleh ?? '—'}</span>
              </div>
              <div style={shared.konfRow}>
                <span style={shared.konfLabel}>Status</span>
                <span style={shared.konfValue}>{viewRow.status_penerima ?? '—'}</span>
              </div>
              <div style={shared.konfRow}>
                <span style={shared.konfLabel}>Waktu</span>
                <span style={shared.konfValue}>{viewRow.diterima_at ? formatTanggal(viewRow.diterima_at) : '—'}</span>
              </div>
              <div style={{ marginTop: '8px' }}>
                <p style={shared.label}>Tanda Tangan</p>
                {viewRow.tanda_tangan ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL base64, bukan aset statis, next/image gak berlaku
                  <img src={viewRow.tanda_tangan} alt="Tanda tangan digital" style={s.signaturePreview} />
                ) : (
                  <p style={{ fontSize: font.sm, color: colors.textDisabled }}>Tidak ada tanda tangan tersimpan.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  backBtn: {
    background: 'none', border: 'none', color: colors.primary, fontWeight: 600,
    fontSize: font.base, cursor: 'pointer', padding: '0 0 16px', fontFamily: font.family,
  },
  progressBox: { background: colors.primaryLight, borderRadius: radius.md, border: `1.5px solid ${colors.primary}`, padding: '14px 16px', marginBottom: '20px' },
  progressLabel: { fontSize: '11px', fontWeight: 700, color: colors.primaryDark, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '4px' },
  progressValue: { fontSize: font.md, fontWeight: 700, color: colors.primary, marginBottom: '8px' },
  progressBarTrack: { height: '8px', borderRadius: radius.sm, background: colors.surface, overflow: 'hidden' },
  progressBarFill: { height: '100%', background: colors.primary, borderRadius: radius.sm },

  card: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  nama: { fontWeight: 700, color: colors.text, fontSize: font.md },
  peran: { fontSize: font.xs, color: colors.textDisabled, marginTop: '4px' },
  jumlah: { fontSize: font.base, fontWeight: 600, color: colors.text },
  buktiMeta: { fontSize: font.xs, color: colors.textSubtle },

  signatureCanvas: {
    width: '100%', height: '160px', background: colors.surface,
    border: `1.5px dashed ${colors.border}`, borderRadius: radius.md,
    touchAction: 'none', cursor: 'crosshair',
  },
  signaturePreview: {
    width: '100%', maxWidth: '320px', border: `1px solid ${colors.border}`,
    borderRadius: radius.md, background: colors.surface,
  },
}
