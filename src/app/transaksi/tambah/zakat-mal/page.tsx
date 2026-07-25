'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/components/Sidebar'
import QRConfirmModal from '@/components/QRConfirmModal'

type Metode = 'Tunai' | 'Transfer Bank' | 'QRIS'
type Step = 'kalkulasi' | 'metode' | 'konfirmasi'

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
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(n)
}
function formatInput(val: string) {
  const digits = val.replace(/\D/g, '')
  return digits ? Number(digits).toLocaleString('id-ID') : ''
}
function parseInput(val: string) {
  return Number(val.replace(/\D/g, ''))
}

export default function ZakatMalPage() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()

  const muzakkiId = params.get('muzakkiId') ?? ''
  const muzakkiNama = params.get('muzakkiNama') ?? ''

  const [step, setStep] = useState<Step>('kalkulasi')
  const [gold, setGold] = useState<GoldData>({
    hargaPerGram: 0, nisab: 0, sumber: '', tanggal: '', loading: true, error: '',
  })
  const [totalHarta, setTotalHarta] = useState('')
  const [metode, setMetode] = useState<Metode | null>(null)
  const [stepError, setStepError] = useState('')
  const [saving, setSaving] = useState(false)
  const [qrData, setQrData] = useState<{ id: number; nominal: string } | null>(null)

  const hartaNum = parseInput(totalHarta)
  const zakatNominal = Math.ceil(hartaNum * 0.025)
  const wajib = hartaNum >= gold.nisab && gold.nisab > 0
  const stepIndex = STEP_ORDER.indexOf(step)
  const progress = Math.round(((stepIndex + 1) / STEP_ORDER.length) * 100)

  useEffect(() => {
    async function fetchGold() {
      setGold(g => ({ ...g, loading: true, error: '' }))
      try {
        const res = await fetch('/api/harga-emas')
        if (!res.ok) throw new Error('Response tidak OK')
        const json = await res.json()

        if (!json.success || !Array.isArray(json.data)) {
          throw new Error('Format response tidak sesuai')
        }

        const entry = json.data.find(
          (d: { material: string; materialType: string; weight: number; sellPrice: number }) =>
            d.material === 'gold' &&
            d.materialType === 'Emas Batangan' &&
            d.weight === 1 &&
            d.sellPrice > 0
        )

        if (!entry) throw new Error('Data emas 1 gram tidak ditemukan')

        const hargaPerGram: number = entry.sellPrice
        setGold({
          hargaPerGram,
          nisab: hargaPerGram * 85,
          sumber: entry.displayName ?? 'Logam Mulia',
          tanggal: entry.recordedDate ?? '',
          loading: false,
          error: '',
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal mengambil data'
        setGold(g => ({ ...g, loading: false, error: `Gagal mengambil harga emas: ${msg}` }))
      }
    }
    fetchGold()
  }, [])

  function handleNext() {
    if (step === 'kalkulasi') {
      if (!totalHarta) { setStepError('Masukkan total harta.'); return }
      if (gold.nisab > 0 && !wajib) {
        setStepError(`Harta belum mencapai nisab ${formatRupiah(gold.nisab)}.`); return
      }
    }
    if (step === 'metode') {
      if (!metode) { setStepError('Pilih metode pembayaran.'); return }
    }
    setStepError('')
    setStep(STEP_ORDER[stepIndex + 1])
  }

  function handleBack() {
    setStepError('')
    if (stepIndex === 0) {
      router.push(
        `/transaksi/tambah?muzakkiId=${muzakkiId}&muzakkiNama=${encodeURIComponent(muzakkiNama)}&step=2`
      )
      return
    }
    setStep(STEP_ORDER[stepIndex - 1])
  }

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profil } = await supabase
      .from('profil_amil')
      .select('lembaga_id')
      .eq('id', user!.id)
      .single()
    const { data: kategori } = await supabase
      .from('kategori_zakat').select('id').eq('nama_kategori', 'Zakat Mal').single()

    const { data, error } = await supabase.from('transaksi').insert({
      muzakki_id: Number(muzakkiId),
      kategori_id: kategori?.id ?? null,
      metode_pembayaran: metode,
      jumlah_uang: zakatNominal,
      jumlah_beras: 0,
      amil_pencatat: user?.user_metadata?.nama ?? user?.email ?? null,
      lembaga_id: profil?.lembaga_id ?? null,
    }).select('id')
    setSaving(false)
    if (error) { setStepError('Gagal menyimpan. Coba lagi.'); return }
    if (metode === 'QRIS' && data) {
      setQrData({ id: (data as { id: number }[])[0]?.id ?? 0, nominal: formatRupiah(zakatNominal) })
    } else {
      router.push('/transaksi')
    }
  }

  return (
    <div style={s.shell}>
      <Sidebar />
      <main style={s.main}>

        <div style={s.header}>
          <div>
            <h1 style={s.headerTitle}>Zakat Mal</h1>
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

        <div style={s.formWrap}>

          {step === 'kalkulasi' && (
            <div style={s.card}>
              <div style={s.cardHeader}>
                <h2 style={s.cardTitle}>Kalkulasi Nisab</h2>
                <p style={s.cardSub}>Nisab dihitung dari harga emas Antam 85 gram (realtime)</p>
              </div>
              <div style={s.cardBody}>
                <div style={s.infoBox}>
                  {gold.loading ? (
                    <div style={s.loadingRow}>
                      <div style={s.spinner} />
                      <p style={s.infoText}>Mengambil harga emas Antam...</p>
                    </div>
                  ) : gold.error ? (
                    <p style={{ ...s.infoText, color: '#B91C1C' }}>⚠ {gold.error}</p>
                  ) : (
                    <>
                      <div style={s.goldGrid}>
                        <div>
                          <p style={s.goldLabel}>Harga Antam / gram</p>
                          <p style={s.goldValue}>{formatRupiah(gold.hargaPerGram)}</p>
                        </div>
                        <div>
                          <p style={s.goldLabel}>Nisab (85 gram)</p>
                          <p style={{ ...s.goldValue, color: '#1A4731' }}>
                            {formatRupiah(gold.nisab)}
                          </p>
                        </div>
                      </div>
                      <p style={s.goldMeta}>
                        Sumber: {gold.sumber}
                        {gold.tanggal && ` · ${gold.tanggal}`}
                      </p>
                    </>
                  )}
                </div>

                <div style={s.field}>
                  <label style={s.label}>Total Harta Muzakki (Rp)</label>
                  <div style={s.inputWrap}>
                    <span style={s.prefix}>Rp</span>
                    <input
                      type="text" inputMode="numeric" placeholder="0"
                      value={totalHarta}
                      onChange={e => setTotalHarta(formatInput(e.target.value))}
                      style={{ ...s.input, paddingLeft: '44px' }}
                      disabled={gold.loading}
                    />
                  </div>
                </div>

                {totalHarta && gold.nisab > 0 && (
                  <div style={{
                    ...s.hasilBox,
                    background: wajib ? '#F0F7F3' : '#FEF2F2',
                    borderColor: wajib ? '#2D7A50' : '#FECACA',
                  }}>
                    {wajib ? (
                      <>
                        <p style={s.hasilStatus}>✅ Wajib Zakat Mal</p>
                        <p style={s.hasilDesc}>Total harta telah mencapai nisab</p>
                        <div style={s.hasilRow}>
                          <span style={s.hasilRowLabel}>Zakat yang harus dibayar (2.5%)</span>
                          <span style={s.hasilRowValue}>{formatRupiah(zakatNominal)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <p style={{ ...s.hasilStatus, color: '#B91C1C' }}>❌ Belum Wajib Zakat</p>
                        <p style={s.hasilDesc}>
                          Harta belum mencapai nisab {formatRupiah(gold.nisab)}
                        </p>
                        <div style={s.hasilRow}>
                          <span style={s.hasilRowLabel}>Kekurangan</span>
                          <span style={{ ...s.hasilRowValue, color: '#B91C1C' }}>
                            {formatRupiah(gold.nisab - hartaNum)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'metode' && (
            <div style={s.card}>
              <div style={s.cardHeader}>
                <h2 style={s.cardTitle}>Metode Pembayaran</h2>
                <p style={s.cardSub}>Zakat Mal: <strong>{formatRupiah(zakatNominal)}</strong></p>
              </div>
              <div style={s.cardBody}>
                {METODE_LIST.map(m => (
                  <button key={m} onClick={() => setMetode(m)}
                    style={{ ...s.metodeBtn, ...(metode === m ? s.metodeBtnActive : {}) }}>
                    <span style={s.metodeIcon}>{METODE_ICON[m]}</span>
                    <span style={s.metodeLabel}>{m}</span>
                    {metode === m && <span style={s.metodeCheck}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'konfirmasi' && metode && (
            <div style={s.card}>
              <div style={s.cardHeader}>
                <h2 style={s.cardTitle}>Konfirmasi Transaksi</h2>
                <p style={s.cardSub}>Periksa kembali sebelum menyimpan</p>
              </div>
              <div style={s.cardBody}>
                <div style={s.konfList}>
                  {[
                    { label: 'Muzakki',     value: muzakkiNama },
                    { label: 'Jenis Zakat', value: 'Zakat Mal' },
                    { label: 'Total Harta', value: formatRupiah(hartaNum) },
                    { label: 'Nisab',       value: formatRupiah(gold.nisab) },
                    { label: 'Metode',      value: `${METODE_ICON[metode]} ${metode}` },
                  ].map(r => (
                    <div key={r.label} style={s.konfRow}>
                      <span style={s.konfLabel}>{r.label}</span>
                      <span style={s.konfValue}>{r.value}</span>
                    </div>
                  ))}
                  <div style={{ ...s.konfRow, borderBottom: 'none' }}>
                    <span style={s.konfLabel}>Zakat (2.5%)</span>
                    <span style={{ ...s.konfValue, color: '#2D7A50', fontSize: '20px' }}>
                      {formatRupiah(zakatNominal)}
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

          {stepError && step !== 'konfirmasi' && (
            <div style={s.errorBox}>⚠ {stepError}</div>
          )}

          {step !== 'konfirmasi' && (
            <div style={s.navRow}>
              <button onClick={handleBack} style={s.navBackBtn}>← Kembali</button>
              <button onClick={handleNext} style={s.navNextBtn}>
                {step === 'metode' ? 'Lihat Ringkasan →' : 'Lanjut →'}
              </button>
            </div>
          )}
          {step === 'konfirmasi' && (
            <button onClick={handleBack} style={s.navBackBtn}>← Kembali</button>
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
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', minHeight: '100vh', background: '#F8F4ED', fontFamily: "'Plus Jakarta Sans', sans-serif" },
  main: { marginLeft: '220px', flex: 1, padding: '32px 36px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #EDE8E0' },
  headerTitle: { fontSize: '26px', fontWeight: 700, color: '#1C1917', letterSpacing: '-0.5px', marginBottom: '4px' },
  headerSub: { fontSize: '13px', color: '#A8A29E' },
  progressWrap: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
  progressTrack: { flex: 1, height: '6px', background: '#EDE8E0', borderRadius: '99px', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #2D7A50, #4CAF7D)', borderRadius: '99px', transition: 'width 0.3s ease' },
  progressLabel: { fontSize: '12px', fontWeight: 600, color: '#A8A29E', textTransform: 'capitalize' },
  formWrap: { maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '16px' },
  card: { background: '#fff', borderRadius: '16px', border: '1px solid #EDE8E0' },
  cardHeader: { padding: '20px 24px 0' },
  cardTitle: { fontSize: '17px', fontWeight: 700, color: '#1C1917', marginBottom: '4px' },
  cardSub: { fontSize: '13px', color: '#A8A29E', marginBottom: '20px' },
  cardBody: { padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px' },
  infoBox: { background: '#F8F4ED', borderRadius: '10px', padding: '14px', border: '1px solid #EDE8E0' },
  loadingRow: { display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', padding: '4px 0' },
  spinner: { width: '16px', height: '16px', border: '2px solid #EDE8E0', borderTop: '2px solid #2D7A50', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 },
  infoText: { fontSize: '13px', color: '#78716C' },
  goldGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' },
  goldLabel: { fontSize: '10px', fontWeight: 700, color: '#A8A29E', letterSpacing: '0.3px', textTransform: 'uppercase', marginBottom: '4px' },
  goldValue: { fontSize: '16px', fontWeight: 700, color: '#1C1917' },
  goldMeta: { fontSize: '11px', color: '#C4BDB4', borderTop: '1px solid #EDE8E0', paddingTop: '8px', marginTop: '4px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 600, color: '#44403C' },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  prefix: { position: 'absolute', left: '14px', fontSize: '14px', fontWeight: 600, color: '#78716C', pointerEvents: 'none' },
  input: { width: '100%', padding: '11px 14px', fontSize: '14px', border: '1.5px solid #EDE8E0', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', color: '#1C1917', background: '#FAFAF9', boxSizing: 'border-box' },
  hasilBox: { borderRadius: '10px', padding: '16px', border: '1.5px solid', display: 'flex', flexDirection: 'column', gap: '6px' },
  hasilStatus: { fontSize: '14px', fontWeight: 700, color: '#1A4731' },
  hasilDesc: { fontSize: '12px', color: '#78716C' },
  hasilRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)' },
  hasilRowLabel: { fontSize: '13px', color: '#57534E' },
  hasilRowValue: { fontSize: '20px', fontWeight: 700, color: '#2D7A50' },
  metodeBtn: { display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '10px', border: '2px solid #EDE8E0', background: '#FAFAF9', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', width: '100%' },
  metodeBtnActive: { borderColor: '#2D7A50', background: '#F0F7F3' },
  metodeIcon: { fontSize: '22px' },
  metodeLabel: { flex: 1, fontSize: '14px', fontWeight: 600, color: '#1C1917', textAlign: 'left' },
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
