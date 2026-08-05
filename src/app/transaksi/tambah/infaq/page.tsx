'use client'

import React, { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/components/Sidebar'
import QRConfirmModal from '@/components/QRConfirmModal'
import StrukModal from '@/components/StrukModal'

type Metode = 'Tunai' | 'Transfer Bank' | 'QRIS'
type Step = 'nominal' | 'metode' | 'konfirmasi'

const METODE_LIST: Metode[] = ['Tunai', 'Transfer Bank', 'QRIS']
const METODE_ICON: Record<Metode, string> = { Tunai: '💵', 'Transfer Bank': '🏦', QRIS: '📱' }

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}
function formatInput(val: string) {
  const digits = val.replace(/\D/g, '')
  return digits ? Number(digits).toLocaleString('id-ID') : ''
}
function parseInput(val: string) { return Number(val.replace(/\D/g, '')) }

function InfaqForm() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()

  const muzakkiId = params.get('muzakkiId') ?? ''
  const muzakkiNama = params.get('muzakkiNama') ?? ''

  const [step, setStep] = useState<Step>('nominal')
  const [nominal, setNominal] = useState('')
  const [metode, setMetode] = useState<Metode | null>(null)
  const [stepError, setStepError] = useState('')
  const [saving, setSaving] = useState(false)
  const [qrData, setQrData] = useState<{ id: number; nominal: string } | null>(null)
  const [struk, setStruk] = useState<{ id: number; tanggal: string } | null>(null)

  const nominalNum = parseInput(nominal)
  const STEP_ORDER: Step[] = ['nominal', 'metode', 'konfirmasi']
  const stepIndex = STEP_ORDER.indexOf(step)
  const progress = Math.round(((stepIndex + 1) / STEP_ORDER.length) * 100)

  function handleNext() {
    if (step === 'nominal') {
      if (!nominal || nominalNum < 1) { setStepError('Masukkan nominal infaq.'); return }
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
      router.push(`/transaksi/tambah?muzakkiId=${muzakkiId}&muzakkiNama=${encodeURIComponent(muzakkiNama)}&step=2`)
      return
    }
    setStep(STEP_ORDER[stepIndex - 1])
  }

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profil } = await supabase
      .from('profil_amil').select('lembaga_id').eq('id', user!.id).single()
    const { data: kategori } = await supabase
      .from('kategori_zakat').select('id').eq('nama_kategori', 'Infaq/Sedekah').single()

    const { data, error } = await supabase.from('transaksi').insert({
      muzakki_id: Number(muzakkiId),
      kategori_id: kategori?.id ?? null,
      metode_pembayaran: metode,
      jumlah_uang: nominalNum,
      jumlah_beras: 0,
      lembaga_id: profil?.lembaga_id ?? null,
      amil_pencatat: user?.user_metadata?.nama ?? user?.email ?? null,
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
      <main style={s.main}>
        <div style={s.header}>
          <div>
            <h1 style={s.headerTitle}>Infaq / Sedekah</h1>
            <p style={s.headerSub}>Muzakki: <strong>{muzakkiNama}</strong></p>
          </div>
        </div>

        <div style={s.progressWrap}>
          <div style={s.progressTrack}>
            <div style={{ ...s.progressFill, width: `${progress}%` }} />
          </div>
          <span style={s.progressLabel}>{step === 'nominal' ? 'Nominal' : step === 'metode' ? 'Metode' : 'Konfirmasi'}</span>
        </div>

        <div style={s.formWrap}>
          {step === 'nominal' && (
            <div style={s.card}>
              <div style={s.cardHeader}>
                <h2 style={s.cardTitle}>Nominal Infaq</h2>
                <p style={s.cardSub}>Masukkan jumlah infaq yang akan dicatat</p>
              </div>
              <div style={s.cardBody}>
                <div style={s.field}>
                  <label style={s.label}>Jumlah Infaq (Rp)</label>
                  <div style={s.inputWrap}>
                    <span style={s.prefix}>Rp</span>
                    <input type="text" inputMode="numeric" placeholder="0"
                      value={nominal}
                      onChange={e => setNominal(formatInput(e.target.value))}
                      style={{ ...s.input, paddingLeft: '44px' }}
                      autoFocus />
                  </div>
                </div>
                {nominal && nominalNum > 0 && (
                  <div style={s.previewBox}>
                    <p style={s.previewLabel}>Nominal yang akan dicatat</p>
                    <p style={s.previewValue}>{formatRupiah(nominalNum)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'metode' && (
            <div style={s.card}>
              <div style={s.cardHeader}>
                <h2 style={s.cardTitle}>Metode Pembayaran</h2>
                <p style={s.cardSub}>Infaq: {formatRupiah(nominalNum)}</p>
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
                <div style={s.konfirmasiList}>
                  {[
                    { label: 'Muzakki', value: muzakkiNama },
                    { label: 'Jenis',   value: 'Infaq / Sedekah' },
                    { label: 'Metode',  value: `${METODE_ICON[metode]} ${metode}` },
                  ].map(r => (
                    <div key={r.label} style={s.konfRow}>
                      <span style={s.konfLabel}>{r.label}</span>
                      <span style={s.konfValue}>{r.value}</span>
                    </div>
                  ))}
                  <div style={{ ...s.konfRow, borderBottom: 'none' }}>
                    <span style={s.konfLabel}>Nominal</span>
                    <span style={{ ...s.konfValue, color: '#2D7A50', fontSize: '18px' }}>{formatRupiah(nominalNum)}</span>
                  </div>
                </div>
                <button onClick={handleSave} disabled={saving}
                  style={{ ...s.saveBtn, ...(saving ? s.saveBtnDisabled : {}) }}>
                  {saving ? 'Menyimpan...' : '✓ Simpan Transaksi'}
                </button>
              </div>
            </div>
          )}

          {stepError && <div style={s.errorBox}>⚠ {stepError}</div>}

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
      {struk && metode && (
        <StrukModal
          data={{
            transaksiId: struk.id,
            tanggal: struk.tanggal,
            muzakkiNama: muzakkiNama,
            jenisZakat: 'Infaq / Sedekah',
            metode: metode,
            jumlahUang: nominalNum,
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

export default function InfaqPage() {
  return (
    <Suspense>
      <InfaqForm />
    </Suspense>
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
  card: { background: '#fff', borderRadius: '16px', border: '1px solid #EDE8E0', overflow: 'hidden' },
  cardHeader: { padding: '20px 24px 0' },
  cardTitle: { fontSize: '17px', fontWeight: 700, color: '#1C1917', marginBottom: '4px' },
  cardSub: { fontSize: '13px', color: '#A8A29E', marginBottom: '20px' },
  cardBody: { padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 600, color: '#44403C' },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  prefix: { position: 'absolute', left: '14px', fontSize: '14px', fontWeight: 600, color: '#78716C', pointerEvents: 'none' },
  input: { width: '100%', padding: '11px 14px', fontSize: '14px', border: '1.5px solid #EDE8E0', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', color: '#1C1917', background: '#FAFAF9', boxSizing: 'border-box' },
  previewBox: { background: '#F0F7F3', borderRadius: '10px', padding: '16px', border: '1.5px solid #2D7A50', display: 'flex', flexDirection: 'column', gap: '4px' },
  previewLabel: { fontSize: '12px', fontWeight: 600, color: '#78716C' },
  previewValue: { fontSize: '22px', fontWeight: 700, color: '#2D7A50' },
  metodeBtn: { display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '10px', border: '2px solid #EDE8E0', background: '#FAFAF9', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', width: '100%' },
  metodeBtnActive: { borderColor: '#2D7A50', background: '#F0F7F3' },
  metodeIcon: { fontSize: '22px' },
  metodeLabel: { flex: 1, fontSize: '14px', fontWeight: 600, color: '#1C1917', textAlign: 'left' },
  metodeCheck: { fontSize: '14px', color: '#2D7A50', fontWeight: 700 },
  konfirmasiList: { display: 'flex', flexDirection: 'column' },
  konfRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F5F0E8' },
  konfLabel: { fontSize: '13px', color: '#78716C', fontWeight: 500 },
  konfValue: { fontSize: '14px', color: '#1C1917', fontWeight: 600 },
  saveBtn: { width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #2D7A50, #1A4731)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', marginTop: '8px' },
  saveBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  errorBox: { padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', fontSize: '13px', color: '#B91C1C', fontWeight: 500 },
  navRow: { display: 'flex', gap: '10px' },
  navBackBtn: { padding: '12px 20px', fontSize: '14px', fontWeight: 600, color: '#57534E', background: '#fff', border: '1.5px solid #EDE8E0', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' },
  navNextBtn: { flex: 1, padding: '12px 20px', fontSize: '14px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #2D7A50, #1A4731)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' },
}
