'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/components/Sidebar'
import QRConfirmModal from '@/components/QRConfirmModal'
import StrukModal from '@/components/StrukModal'

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
    return
  }

  return (
    <div style={s.shell}>
      <Sidebar />
      <main style={{
        ...s.main,
        marginLeft: isMobile ? 0 : '220px',
        padding: isMobile ? '84px 16px 24px' : '32px 36px',
      }}>
        <div style={s.header}>
          <div>
            <h1 style={{ ...s.headerTitle, fontSize: isMobile ? '21px' : '26px' }}>Zakat Mal</h1>
            <p style={s.headerSub}>Muzakki: <strong>{muzakkiNama}</strong></p>
          </div>
        </div>

        <div style={s.progressWrap}>
          <div style={s.progressTrack}>
            <div style={{ ...s.progressFill, width: `${progress}%` }} />
          </div>
          <span style={s.progressLabel}>
            {step === 'kalkulasi' ? 'Kalkulasi' : step === 'metode' ? 'Metode' : 'Konfirmasi'}
          </span>
        </div>

        <div style={{ ...s.formWrap, maxWidth: isMobile ? '100%' : '560px' }}>

          {/* ── Step: Kalkulasi ── */}
          {step === 'kalkulasi' && (
            <div style={s.card}>
              <div style={{ ...s.cardHeader, padding: isMobile ? '16px 16px 0' : '20px 24px 0' }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : '17px' }}>Kalkulasi Zakat Mal</h2>
                <p style={s.cardSub}>Pilih cara penghitungan zakat</p>
              </div>
              <div style={{ ...s.cardBody, padding: isMobile ? '0 16px 16px' : '0 24px 24px' }}>

                {/* Toggle opsi — jadi 1 kolom di mobile karena teksnya panjang */}
                <div style={{ ...s.opsiToggle, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                  <button
                    onClick={() => handleOpsiChange('hitung')}
                    style={{ ...s.opsiBtn, ...(opsi === 'hitung' ? s.opsiBtnActive : {}) }}
                  >
                    <span style={s.opsiIcon}>🏦</span>
                    <div>
                      <p style={s.opsiLabel}>Hitung dari Harta</p>
                      <p style={s.opsiDesc}>Input total harta, sistem hitung 2.5%</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleOpsiChange('langsung')}
                    style={{ ...s.opsiBtn, ...(opsi === 'langsung' ? s.opsiBtnActive : {}) }}
                  >
                    <span style={s.opsiIcon}>✏️</span>
                    <div>
                      <p style={s.opsiLabel}>Input Nominal Langsung</p>
                      <p style={s.opsiDesc}>Muzakki sudah tahu nominalnya</p>
                    </div>
                  </button>
                </div>

                {/* Info harga emas */}
                <div style={{ ...s.infoBox, padding: isMobile ? '12px' : '14px' }}>
                  {gold.loading ? (
                    <div style={s.loadingRow}>
                      <div style={s.spinner} />
                      <p style={s.infoText}>Mengambil harga emas Antam...</p>
                    </div>
                  ) : gold.error ? (
                    <p style={{ ...s.infoText, color: '#B91C1C' }}>⚠ {gold.error}</p>
                  ) : (
                    <>
                      <div style={{ ...s.goldGrid, gap: isMobile ? '10px' : '12px' }}>
                        <div>
                          <p style={s.goldLabel}>Harga Antam / gram</p>
                          <p style={{ ...s.goldValue, fontSize: isMobile ? '13.5px' : '16px' }}>{formatRupiah(gold.hargaPerGram)}</p>
                        </div>
                        <div>
                          <p style={s.goldLabel}>Nisab (85 gram)</p>
                          <p style={{ ...s.goldValue, fontSize: isMobile ? '13.5px' : '16px', color: '#1A4731' }}>{formatRupiah(gold.nisab)}</p>
                        </div>
                      </div>
                      <p style={s.goldMeta}>Sumber: {gold.sumber}{gold.tanggal && ` · ${gold.tanggal}`}</p>
                    </>
                  )}
                </div>

                {/* Opsi A — Hitung dari harta */}
                {opsi === 'hitung' && (
                  <>
                    <div style={s.field}>
                      <label style={s.label}>Total Harta Muzakki (Rp)</label>
                      <div style={s.inputWrap}>
                        <span style={s.prefix}>Rp</span>
                        <input type="text" inputMode="numeric" placeholder="0"
                          value={totalHarta}
                          onChange={e => setTotalHarta(formatInput(e.target.value))}
                          style={{ ...s.input, paddingLeft: '44px', fontSize: isMobile ? '16px' : '14px' }}
                          disabled={gold.loading} />
                      </div>
                    </div>

                    {totalHarta && gold.nisab > 0 && (
                      <div style={{ ...s.hasilBox, padding: isMobile ? '14px' : '16px', background: wajib ? '#F0F7F3' : '#FEF2F2', borderColor: wajib ? '#2D7A50' : '#FECACA' }}>
                        {wajib ? (
                          <>
                            <p style={s.hasilStatus}>✅ Wajib Zakat Mal</p>
                            <p style={s.hasilDesc}>Total harta telah mencapai nisab</p>
                            <div style={{ ...s.hasilRow, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '4px' : 0 }}>
                              <span style={s.hasilRowLabel}>Zakat yang harus dibayar (2.5%)</span>
                              <span style={{ ...s.hasilRowValue, fontSize: isMobile ? '17px' : '20px' }}>{formatRupiah(zakatDariHarta)}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <p style={{ ...s.hasilStatus, color: '#B91C1C' }}>❌ Belum Wajib Zakat</p>
                            <p style={s.hasilDesc}>Harta belum mencapai nisab {formatRupiah(gold.nisab)}</p>
                            <div style={{ ...s.hasilRow, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '4px' : 0 }}>
                              <span style={s.hasilRowLabel}>Kekurangan</span>
                              <span style={{ ...s.hasilRowValue, fontSize: isMobile ? '17px' : '20px', color: '#B91C1C' }}>{formatRupiah(gold.nisab - hartaNum)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Opsi B — Input nominal langsung */}
                {opsi === 'langsung' && (
                  <>
                    <div style={s.field}>
                      <label style={s.label}>Nominal Zakat (Rp)</label>
                      <div style={s.inputWrap}>
                        <span style={s.prefix}>Rp</span>
                        <input type="text" inputMode="numeric" placeholder="0"
                          value={nominalLangsung}
                          onChange={e => setNominalLangsung(formatInput(e.target.value))}
                          style={{ ...s.input, paddingLeft: '44px', fontSize: isMobile ? '16px' : '14px' }}
                          autoFocus={!isMobile} />
                      </div>
                    </div>
                    {nominalLangsung && nominalLangsungNum > 0 && (
                      <div style={{ ...s.hasilBox, padding: isMobile ? '14px' : '16px', background: '#F0F7F3', borderColor: '#2D7A50' }}>
                        <p style={s.hasilStatus}>📝 Nominal yang akan dicatat</p>
                        <div style={{ ...s.hasilRow, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '4px' : 0 }}>
                          <span style={s.hasilRowLabel}>Zakat Mal</span>
                          <span style={{ ...s.hasilRowValue, fontSize: isMobile ? '17px' : '20px' }}>{formatRupiah(nominalLangsungNum)}</span>
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
            <div style={s.card}>
              <div style={{ ...s.cardHeader, padding: isMobile ? '16px 16px 0' : '20px 24px 0' }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : '17px' }}>Metode Pembayaran</h2>
                <p style={s.cardSub}>Zakat Mal: <strong>{formatRupiah(nominalFinal)}</strong></p>
              </div>
              <div style={{ ...s.cardBody, padding: isMobile ? '0 16px 16px' : '0 24px 24px' }}>
                {METODE_LIST.map(m => (
                  <button key={m} onClick={() => setMetode(m)}
                    style={{ ...s.metodeBtn, ...(metode === m ? s.metodeBtnActive : {}), padding: isMobile ? '12px 14px' : '14px 16px' }}>
                    <span style={{ ...s.metodeIcon, fontSize: isMobile ? '19px' : '22px' }}>{METODE_ICON[m]}</span>
                    <span style={{ ...s.metodeLabel, fontSize: isMobile ? '13.5px' : '14px' }}>{m}</span>
                    {metode === m && <span style={s.metodeCheck}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step: Konfirmasi ── */}
          {step === 'konfirmasi' && metode && (
            <div style={s.card}>
              <div style={{ ...s.cardHeader, padding: isMobile ? '16px 16px 0' : '20px 24px 0' }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : '17px' }}>Konfirmasi Transaksi</h2>
                <p style={s.cardSub}>Periksa kembali sebelum menyimpan</p>
              </div>
              <div style={{ ...s.cardBody, padding: isMobile ? '0 16px 16px' : '0 24px 24px' }}>
                <div style={s.konfList}>
                  {[
                    { label: 'Muzakki',     value: muzakkiNama },
                    { label: 'Jenis Zakat', value: 'Zakat Mal' },
                    { label: 'Cara Hitung', value: opsi === 'hitung' ? 'Dari Total Harta' : 'Nominal Langsung' },
                    ...(opsi === 'hitung' ? [{ label: 'Total Harta', value: formatRupiah(hartaNum) }] : []),
                    { label: 'Metode',      value: `${METODE_ICON[metode]} ${metode}` },
                  ].map(r => (
                    <div key={r.label} style={s.konfRow}>
                      <span style={s.konfLabel}>{r.label}</span>
                      <span style={s.konfValue}>{r.value}</span>
                    </div>
                  ))}
                  <div style={{ ...s.konfRow, borderBottom: 'none' }}>
                    <span style={s.konfLabel}>Nominal Zakat</span>
                    <span style={{ ...s.konfValue, color: '#2D7A50', fontSize: isMobile ? '17px' : '20px' }}>
                      {formatRupiah(nominalFinal)}
                    </span>
                  </div>
                </div>

                {stepError && <p style={s.errorInline}>⚠ {stepError}</p>}

                <button onClick={handleSave} disabled={saving}
                  style={{ ...s.saveBtn, ...(saving ? s.saveBtnDisabled : {}) }}>
                  {saving ? 'Menyimpan...' : '✓ Simpan Transaksi'}
                </button>
              </div>
            </div>
          )}

          {stepError && step !== 'konfirmasi' && <div style={s.errorBox}>⚠ {stepError}</div>}

          {step !== 'konfirmasi' && (
            <div style={{ ...s.navRow, flexDirection: isMobile ? 'column' : 'row' }}>
              <button onClick={handleBack} style={{ ...s.navBackBtn, width: isMobile ? '100%' : 'auto' }}>← Kembali</button>
              <button onClick={handleNext} style={s.navNextBtn}>
                {step === 'metode' ? 'Lihat Ringkasan →' : 'Lanjut →'}
              </button>
            </div>
          )}
          {step === 'konfirmasi' && (
            <button onClick={handleBack} style={{ ...s.navBackBtn, width: isMobile ? '100%' : 'auto' }}>← Kembali</button>
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
            muzakkiNama: muzakkiNama,
            jenisZakat: 'Zakat Mal',
            metode: metode,
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

const s: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', minHeight: '100vh', background: '#F8F4ED', fontFamily: "'Plus Jakarta Sans', sans-serif" },
  main: { flex: 1 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #EDE8E0' },
  headerTitle: { fontWeight: 700, color: '#1C1917', letterSpacing: '-0.5px', marginBottom: '4px' },
  headerSub: { fontSize: '13px', color: '#A8A29E' },
  progressWrap: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
  progressTrack: { flex: 1, height: '6px', background: '#EDE8E0', borderRadius: '99px', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #2D7A50, #4CAF7D)', borderRadius: '99px', transition: 'width 0.3s ease' },
  progressLabel: { fontSize: '12px', fontWeight: 600, color: '#A8A29E', textTransform: 'capitalize' },
  formWrap: { display: 'flex', flexDirection: 'column', gap: '16px' },
  card: { background: '#fff', borderRadius: '16px', border: '1px solid #EDE8E0' },
  cardHeader: {},
  cardTitle: { fontWeight: 700, color: '#1C1917', marginBottom: '4px' },
  cardSub: { fontSize: '13px', color: '#A8A29E', marginBottom: '20px' },
  cardBody: { display: 'flex', flexDirection: 'column', gap: '14px' },
  opsiToggle: { display: 'grid', gap: '10px' },
  opsiBtn: { display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', borderRadius: '10px', border: '2px solid #EDE8E0', background: '#FAFAF9', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s' },
  opsiBtnActive: { borderColor: '#2D7A50', background: '#F0F7F3' },
  opsiIcon: { fontSize: '20px', flexShrink: 0, marginTop: '2px' },
  opsiLabel: { fontSize: '13px', fontWeight: 700, color: '#1C1917', marginBottom: '2px' },
  opsiDesc: { fontSize: '11px', color: '#78716C' },
  infoBox: { background: '#F8F4ED', borderRadius: '10px', border: '1px solid #EDE8E0' },
  loadingRow: { display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', padding: '4px 0' },
  spinner: { width: '16px', height: '16px', border: '2px solid #EDE8E0', borderTop: '2px solid #2D7A50', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 },
  infoText: { fontSize: '13px', color: '#78716C' },
  goldGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', marginBottom: '8px' },
  goldLabel: { fontSize: '10px', fontWeight: 700, color: '#A8A29E', letterSpacing: '0.3px', textTransform: 'uppercase', marginBottom: '4px' },
  goldValue: { fontWeight: 700, color: '#1C1917' },
  goldMeta: { fontSize: '11px', color: '#C4BDB4', borderTop: '1px solid #EDE8E0', paddingTop: '8px', marginTop: '4px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 600, color: '#44403C' },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  prefix: { position: 'absolute', left: '14px', fontSize: '14px', fontWeight: 600, color: '#78716C', pointerEvents: 'none' },
  input: { width: '100%', padding: '11px 14px', border: '1.5px solid #EDE8E0', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', color: '#1C1917', background: '#FAFAF9', boxSizing: 'border-box' },
  hasilBox: { borderRadius: '10px', border: '1.5px solid', display: 'flex', flexDirection: 'column', gap: '6px' },
  hasilStatus: { fontSize: '14px', fontWeight: 700, color: '#1A4731' },
  hasilDesc: { fontSize: '12px', color: '#78716C' },
  hasilRow: { display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)' },
  hasilRowLabel: { fontSize: '13px', color: '#57534E' },
  hasilRowValue: { fontWeight: 700, color: '#2D7A50' },
  metodeBtn: { display: 'flex', alignItems: 'center', gap: '14px', borderRadius: '10px', border: '2px solid #EDE8E0', background: '#FAFAF9', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', width: '100%' },
  metodeBtnActive: { borderColor: '#2D7A50', background: '#F0F7F3' },
  metodeIcon: {},
  metodeLabel: { flex: 1, fontWeight: 600, color: '#1C1917', textAlign: 'left' },
  metodeCheck: { fontSize: '14px', color: '#2D7A50', fontWeight: 700 },
  konfList: { display: 'flex', flexDirection: 'column' },
  konfRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F5F0E8' },
  konfLabel: { fontSize: '13px', color: '#78716C', fontWeight: 500 },
  konfValue: { fontSize: '14px', color: '#1C1917', fontWeight: 600 },
  saveBtn: { width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #2D7A50, #1A4731)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', marginTop: '8px' },
  saveBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  errorBox: { padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', fontSize: '13px', color: '#B91C1C', fontWeight: 500 },
  errorInline: { fontSize: '13px', color: '#B91C1C', fontWeight: 500 },
  navRow: { display: 'flex', gap: '10px' },
  navBackBtn: { padding: '12px 20px', fontSize: '14px', fontWeight: 600, color: '#57534E', background: '#fff', border: '1.5px solid #EDE8E0', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' },
  navNextBtn: { flex: 1, padding: '12px 20px', fontSize: '14px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #2D7A50, #1A4731)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' },
}
