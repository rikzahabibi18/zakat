'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/components/Sidebar'
import QRConfirmModal from '@/components/QRConfirmModal'
import StrukModal from '@/components/StrukModal'
import { shared } from '@/styles/shared'
import { colors, font } from '@/styles/tokens'

type Metode = 'Tunai' | 'Transfer Bank' | 'QRIS'
type Step = 'kalkulasi' | 'metode' | 'konfirmasi'
type OpsiKalkulasi = 'hitung' | 'langsung'

const METODE_LIST: Metode[] = ['Tunai', 'Transfer Bank', 'QRIS']
const METODE_ICON: Record<Metode, string> = { Tunai: '💵', 'Transfer Bank': '🏦', QRIS: '📱' }
const STEP_ORDER: Step[] = ['kalkulasi', 'metode', 'konfirmasi']

interface GoldData {
  hargaPerGram: number
  nisab: number
  sumber: string
  tanggal: string
  loading: boolean
  error: string
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}
function formatInput(val: string) {
  const digits = val.replace(/\D/g, '')
  return digits ? Number(digits).toLocaleString('id-ID') : ''
}
function parseInput(val: string) { return Number(val.replace(/\D/g, '')) }

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < breakpoint) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return isMobile
}

function ZakatMalContent() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()
  const isMobile = useIsMobile()

  const muzakkiId = params.get('muzakkiId') ?? ''
  const muzakkiNama = params.get('muzakkiNama') ?? ''

  const [step, setStep] = useState<Step>('kalkulasi')
  const [opsi, setOpsi] = useState<OpsiKalkulasi>('hitung')
  const [gold, setGold] = useState<GoldData>({
    hargaPerGram: 0, nisab: 0, sumber: '', tanggal: '', loading: true, error: '',
  })
  const [totalHarta, setTotalHarta] = useState('')
  const [nominalLangsung, setNominalLangsung] = useState('')
  const [metode, setMetode] = useState<Metode | null>(null)
  const [stepError, setStepError] = useState('')
  const [saving, setSaving] = useState(false)
  const [qrData, setQrData] = useState<{ id: number; nominal: string } | null>(null)
  const [struk, setStruk] = useState<{ id: number; tanggal: string } | null>(null)

  const hartaNum = parseInput(totalHarta)
  const zakatDariHarta = Math.ceil(hartaNum * 0.025)
  const nominalLangsungNum = parseInput(nominalLangsung)
  const wajib = hartaNum >= gold.nisab && gold.nisab > 0
  const nominalFinal = opsi === 'hitung' ? zakatDariHarta : nominalLangsungNum

  const stepIndex = STEP_ORDER.indexOf(step)
  const progress = Math.round(((stepIndex + 1) / STEP_ORDER.length) * 100)

  const cardPad = isMobile ? '16px 16px 0' : '20px 24px 0'
  const bodyPad = isMobile ? '0 16px 16px' : '0 24px 24px'

  useEffect(() => {
    async function fetchGold() {
      setGold(g => ({ ...g, loading: true, error: '' }))
      try {
        const res = await fetch('/api/harga-emas')
        if (!res.ok) throw new Error('Response tidak OK')
        const json = await res.json()
        if (!json.success || !Array.isArray(json.data)) throw new Error('Format response tidak sesuai')
        const entry = json.data.find(
          (d: { material: string; materialType: string; weight: number; sellPrice: number }) =>
            d.material === 'gold' && d.materialType === 'Emas Batangan' &&
            d.weight === 1 && d.sellPrice > 0
        )
        if (!entry) throw new Error('Data emas 1 gram tidak ditemukan')
        const hargaPerGram: number = entry.sellPrice
        setGold({ hargaPerGram, nisab: hargaPerGram * 85, sumber: entry.displayName ?? 'Logam Mulia', tanggal: entry.recordedDate ?? '', loading: false, error: '' })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal mengambil data'
        setGold(g => ({ ...g, loading: false, error: `Gagal mengambil harga emas: ${msg}` }))
      }
    }
    fetchGold()
  }, [])

  function handleOpsiChange(newOpsi: OpsiKalkulasi) {
    setOpsi(newOpsi)
    setTotalHarta('')
    setNominalLangsung('')
    setStepError('')
  }

  function handleNext() {
    if (step === 'kalkulasi') {
      if (opsi === 'hitung') {
        if (!totalHarta) { setStepError('Masukkan total harta.'); return }
        if (gold.nisab > 0 && !wajib) { setStepError(`Harta belum mencapai nisab ${formatRupiah(gold.nisab)}.`); return }
      }
      if (opsi === 'langsung') {
        if (!nominalLangsung || nominalLangsungNum < 1) { setStepError('Masukkan nominal zakat.'); return }
      }
    }
    if (step === 'metode' && !metode) { setStepError('Pilih metode pembayaran.'); return }
    setStepError('')
    setStep(STEP_ORDER[stepIndex + 1])
  }

  function handleBack() {
    setStepError('')
    if (stepIndex === 0) {
      router.push(`/transaksi/tambah?muzakkiId=${muzakkiId}&muzakkiNama=${encodeURIComponent(muzakkiNama)}&step=2`)
      return
    }
    setStep(STEP_ORDER[stepIndex - 1])
  }

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profil } = await supabase.from('profil_amil').select('lembaga_id').eq('id', user!.id).single()
    const { data: kategori } = await supabase.from('kategori_zakat').select('id').eq('nama_kategori', 'Zakat Mal').single()

    const { data, error } = await supabase.from('transaksi').insert({
      muzakki_id: Number(muzakkiId),
      kategori_id: kategori?.id ?? null,
      metode_pembayaran: metode,
      jumlah_uang: nominalFinal,
      jumlah_beras: 0,
      amil_pencatat: user?.user_metadata?.nama ?? user?.email ?? null,
      lembaga_id: profil?.lembaga_id ?? null,
    }).select('id')

    setSaving(false)
    if (error) { setStepError('Gagal menyimpan. Coba lagi.'); return }
    const insertedId = (data as { id: number }[])[0]?.id ?? 0
    const tanggalNow = new Date().toISOString()
    if (metode === 'QRIS') {
      setQrData({ id: insertedId, nominal: '' })
    } else {
      setStruk({ id: insertedId, tanggal: tanggalNow })
    }
  }

  return (
    <div style={shared.shell}>
      <Sidebar />
      <main style={{
        ...shared.main,
        marginLeft: isMobile ? 0 : '220px',
        padding: isMobile ? '84px 16px 24px' : '32px 36px',
      }}>

        {/* Header */}
        <div style={shared.pageHeader}>
          <div>
            <h1 style={{ ...shared.headerTitle, fontSize: isMobile ? font.h2 : font.h1 }}>Zakat Mal</h1>
            <p style={shared.headerSub}>Muzakki: <strong>{muzakkiNama}</strong></p>
          </div>
        </div>

        {/* Progress */}
        <div style={shared.progressWrap}>
          <div style={shared.progressTrack}>
            <div style={{ ...shared.progressFill, width: `${progress}%` }} />
          </div>
          <span style={shared.progressLabel}>
            {step === 'kalkulasi' ? 'Kalkulasi' : step === 'metode' ? 'Metode' : 'Konfirmasi'}
          </span>
        </div>

        <div style={{ ...s.formWrap, maxWidth: isMobile ? '100%' : '560px' }}>

          {/* ── Step: Kalkulasi ── */}
          {step === 'kalkulasi' && (
            <div style={shared.card}>
              <div style={{ ...s.cardHeader, padding: cardPad }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : font.h3 }}>Kalkulasi Zakat Mal</h2>
                <p style={s.cardSub}>Pilih cara penghitungan zakat</p>
              </div>
              <div style={{ ...shared.cardBody, padding: bodyPad }}>

                {/* Toggle opsi */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                  {([
                    { key: 'hitung',   icon: '🏦', label: 'Hitung dari Harta',      desc: 'Input total harta, sistem hitung 2.5%' },
                    { key: 'langsung', icon: '✏️', label: 'Input Nominal Langsung', desc: 'Muzakki sudah tahu nominalnya' },
                  ] as const).map(o => (
                    <button key={o.key}
                      onClick={() => handleOpsiChange(o.key)}
                      style={{ ...shared.opsiBtn, ...(opsi === o.key ? shared.opsiBtnActive : {}) }}>
                      <span style={shared.opsiIcon}>{o.icon}</span>
                      <div>
                        <p style={shared.opsiLabel}>{o.label}</p>
                        <p style={shared.opsiDesc}>{o.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Info harga emas */}
                <div style={{ ...shared.infoBox, padding: isMobile ? '12px' : '14px' }}>
                  {gold.loading ? (
                    <div style={s.loadingRow}>
                      <div style={s.spinnerSmall} />
                      <p style={s.infoText}>Mengambil harga emas Antam...</p>
                    </div>
                  ) : gold.error ? (
                    <p style={{ ...s.infoText, color: colors.danger }}>⚠ {gold.error}</p>
                  ) : (
                    <>
                      <div style={{ ...shared.infoGrid, gap: isMobile ? '10px' : '12px', marginBottom: '8px' }}>
                        <div>
                          <p style={shared.infoLabel}>Harga Antam / gram</p>
                          <p style={{ ...shared.infoValue, fontSize: isMobile ? '13.5px' : '16px' }}>
                            {formatRupiah(gold.hargaPerGram)}
                          </p>
                        </div>
                        <div>
                          <p style={shared.infoLabel}>Nisab (85 gram)</p>
                          <p style={{ ...shared.infoValue, fontSize: isMobile ? '13.5px' : '16px', color: colors.primaryDark }}>
                            {formatRupiah(gold.nisab)}
                          </p>
                        </div>
                      </div>
                      <p style={s.goldMeta}>Sumber: {gold.sumber}{gold.tanggal && ` · ${gold.tanggal}`}</p>
                    </>
                  )}
                </div>

                {/* ── Opsi A: Hitung dari harta ── */}
                {opsi === 'hitung' && (
                  <>
                    <div style={shared.field}>
                      <label style={shared.label}>Total Harta Muzakki (Rp)</label>
                      <div style={shared.inputWrap}>
                        <span style={shared.prefix}>Rp</span>
                        <input type="text" inputMode="numeric" placeholder="0"
                          value={totalHarta}
                          onChange={e => setTotalHarta(formatInput(e.target.value))}
                          style={{ ...shared.input, paddingLeft: '44px', fontSize: isMobile ? font.xl : font.md }}
                          disabled={gold.loading} />
                      </div>
                    </div>

                    {totalHarta && gold.nisab > 0 && (
                      <div style={{
                        ...s.hasilBox,
                        padding: isMobile ? '14px' : '16px',
                        background: wajib ? colors.primaryLight : colors.dangerBg,
                        borderColor: wajib ? colors.primary : colors.dangerBorder,
                      }}>
                        {wajib ? (
                          <>
                            <p style={{ ...s.hasilStatus, color: colors.primaryDark }}>✅ Wajib Zakat Mal</p>
                            <p style={s.hasilDesc}>Total harta telah mencapai nisab</p>
                            <div style={{ ...s.hasilRow, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '4px' : 0 }}>
                              <span style={s.hasilRowLabel}>Zakat yang harus dibayar (2.5%)</span>
                              <span style={{ ...s.hasilRowValue, fontSize: isMobile ? '17px' : '20px' }}>
                                {formatRupiah(zakatDariHarta)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <p style={{ ...s.hasilStatus, color: colors.danger }}>❌ Belum Wajib Zakat</p>
                            <p style={s.hasilDesc}>Harta belum mencapai nisab {formatRupiah(gold.nisab)}</p>
                            <div style={{ ...s.hasilRow, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '4px' : 0 }}>
                              <span style={s.hasilRowLabel}>Kekurangan</span>
                              <span style={{ ...s.hasilRowValue, fontSize: isMobile ? '17px' : '20px', color: colors.danger }}>
                                {formatRupiah(gold.nisab - hartaNum)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* ── Opsi B: Input nominal langsung ── */}
                {opsi === 'langsung' && (
                  <>
                    <div style={shared.field}>
                      <label style={shared.label}>Nominal Zakat (Rp)</label>
                      <div style={shared.inputWrap}>
                        <span style={shared.prefix}>Rp</span>
                        <input type="text" inputMode="numeric" placeholder="0"
                          value={nominalLangsung}
                          onChange={e => setNominalLangsung(formatInput(e.target.value))}
                          style={{ ...shared.input, paddingLeft: '44px', fontSize: isMobile ? font.xl : font.md }}
                          autoFocus={!isMobile} />
                      </div>
                    </div>
                    {nominalLangsung && nominalLangsungNum > 0 && (
                      <div style={{ ...s.hasilBox, padding: isMobile ? '14px' : '16px', background: colors.primaryLight, borderColor: colors.primary }}>
                        <p style={{ ...s.hasilStatus, color: colors.primaryDark }}>📝 Nominal yang akan dicatat</p>
                        <div style={{ ...s.hasilRow, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '4px' : 0 }}>
                          <span style={s.hasilRowLabel}>Zakat Mal</span>
                          <span style={{ ...s.hasilRowValue, fontSize: isMobile ? '17px' : '20px' }}>
                            {formatRupiah(nominalLangsungNum)}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Step: Metode ── */}
          {step === 'metode' && (
            <div style={shared.card}>
              <div style={{ ...s.cardHeader, padding: cardPad }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : font.h3 }}>Metode Pembayaran</h2>
                <p style={s.cardSub}>Zakat Mal: <strong>{formatRupiah(nominalFinal)}</strong></p>
              </div>
              <div style={{ ...shared.cardBody, padding: bodyPad }}>
                {METODE_LIST.map(m => (
                  <button key={m} onClick={() => setMetode(m)}
                    style={{
                      ...shared.metodeBtn,
                      ...(metode === m ? shared.metodeBtnActive : {}),
                      padding: isMobile ? '12px 14px' : '14px 16px',
                    }}>
                    <span style={{ fontSize: isMobile ? '19px' : '22px' }}>{METODE_ICON[m]}</span>
                    <span style={{ ...shared.metodeLabel, fontSize: isMobile ? '13.5px' : font.md }}>{m}</span>
                    {metode === m && <span style={shared.metodeCheck}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step: Konfirmasi ── */}
          {step === 'konfirmasi' && metode && (
            <div style={shared.card}>
              <div style={{ ...s.cardHeader, padding: cardPad }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : font.h3 }}>Konfirmasi Transaksi</h2>
                <p style={s.cardSub}>Periksa kembali sebelum menyimpan</p>
              </div>
              <div style={{ ...shared.cardBody, padding: bodyPad }}>
                <div style={shared.konfirmasiList}>
                  {[
                    { label: 'Muzakki',     value: muzakkiNama },
                    { label: 'Jenis Zakat', value: 'Zakat Mal' },
                    { label: 'Cara Hitung', value: opsi === 'hitung' ? 'Dari Total Harta' : 'Nominal Langsung' },
                    ...(opsi === 'hitung' ? [{ label: 'Total Harta', value: formatRupiah(hartaNum) }] : []),
                    { label: 'Metode',      value: `${METODE_ICON[metode]} ${metode}` },
                  ].map(r => (
                    <div key={r.label} style={shared.konfRow}>
                      <span style={shared.konfLabel}>{r.label}</span>
                      <span style={shared.konfValue}>{r.value}</span>
                    </div>
                  ))}
                  <div style={{ ...shared.konfRow, borderBottom: 'none' }}>
                    <span style={shared.konfLabel}>Nominal Zakat</span>
                    <span style={{ ...shared.konfValue, color: colors.primary, fontSize: isMobile ? '17px' : '20px' }}>
                      {formatRupiah(nominalFinal)}
                    </span>
                  </div>
                </div>

                {stepError && <p style={s.errorInline}>⚠ {stepError}</p>}

                <button onClick={handleSave} disabled={saving}
                  style={{ ...shared.saveBtn, ...(saving ? shared.btnDisabled : {}) }}>
                  {saving ? 'Menyimpan...' : '✓ Simpan Transaksi'}
                </button>
              </div>
            </div>
          )}

          {stepError && step !== 'konfirmasi' && <div style={shared.errorBox}>⚠ {stepError}</div>}

          {step !== 'konfirmasi' && (
            <div style={{ ...shared.navRow, flexDirection: isMobile ? 'column' : 'row' }}>
              <button onClick={handleBack} style={{ ...shared.navBackBtn, width: isMobile ? '100%' : 'auto' }}>← Kembali</button>
              <button onClick={handleNext} style={shared.navNextBtn}>
                {step === 'metode' ? 'Lihat Ringkasan →' : 'Lanjut →'}
              </button>
            </div>
          )}
          {step === 'konfirmasi' && (
            <button onClick={handleBack} style={{ ...shared.navBackBtn, width: isMobile ? '100%' : 'auto' }}>← Kembali</button>
          )}
        </div>
      </main>

      {qrData && (
        <QRConfirmModal
          transaksiId={qrData.id}
          muzakkiNama={muzakkiNama}
          nominal={qrData.nominal}
          onClose={() => router.push('/transaksi')}
        />
      )}
      {struk && metode && (
        <StrukModal
          data={{
            transaksiId: struk.id,
            tanggal: struk.tanggal,
            muzakkiNama,
            jenisZakat: 'Zakat Mal',
            metode,
            jumlahUang: nominalFinal,
            jumlahBeras: 0,
            amilPencatat: '',
          }}
          onClose={() => setStruk(null)}
          onRedirect={() => router.push('/transaksi')}
        />
      )}
    </div>
  )
}

export default function ZakatMalPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Loading...</div>}>
      <ZakatMalContent />
    </Suspense>
  )
}

// ── Hanya style yang UNIK untuk zakat-mal ─────────────────
const s: Record<string, React.CSSProperties> = {
  formWrap:   { display: 'flex', flexDirection: 'column', gap: '16px' },
  cardHeader: {},
  cardTitle:  { fontWeight: 700, color: colors.text, marginBottom: '4px' },
  cardSub:    { fontSize: font.base, color: '#A8A29E', marginBottom: '20px' },

  // Gold info box — unik karena ada meta line di bawah grid
  loadingRow: { display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', padding: '4px 0' },
  spinnerSmall: { width: '16px', height: '16px', border: `2px solid ${colors.border}`, borderTop: `2px solid ${colors.primary}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 },
  infoText:   { fontSize: font.base, color: colors.textSubtle },
  goldMeta:   { fontSize: '11px', color: colors.textPlaceholder, borderTop: `1px solid ${colors.border}`, paddingTop: '8px', marginTop: '4px' },

  // Hasil box — unik karena warnanya dinamis (conditional green/red)
  hasilBox:      { borderRadius: '10px', border: '1.5px solid', display: 'flex', flexDirection: 'column', gap: '6px' },
  hasilStatus:   { fontSize: font.md, fontWeight: 700 },
  hasilDesc:     { fontSize: font.sm, color: colors.textSubtle },
  hasilRow:      { display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)' },
  hasilRowLabel: { fontSize: font.base, color: colors.textMuted },
  hasilRowValue: { fontWeight: 700, color: colors.primary },

  // Error inline di konfirmasi
  errorInline: { fontSize: font.base, color: colors.danger, fontWeight: 500 },
}
