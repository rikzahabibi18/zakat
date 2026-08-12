'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/components/Sidebar'
import QRConfirmModal from '@/components/QRConfirmModal'
import StrukModal from '@/components/StrukModal'

type Metode = 'Tunai' | 'Transfer Bank' | 'QRIS'
type Step = 'kalkulasi' | 'metode' | 'konfirmasi'

const METODE_LIST: Metode[] = ['Tunai', 'Transfer Bank', 'QRIS']
const METODE_ICON: Record<Metode, string> = { Tunai: '💵', 'Transfer Bank': '🏦', QRIS: '📱' }
const FIDYAH_PER_HARI = 65000

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

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

function FidyahForm() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()
  const isMobile = useIsMobile()

  const muzakkiId = params.get('muzakkiId') ?? ''
  const muzakkiNama = params.get('muzakkiNama') ?? ''

  const [step, setStep] = useState<Step>('kalkulasi')
  const [jumlahHari, setJumlahHari] = useState('')
  const [metode, setMetode] = useState<Metode | null>(null)
  const [stepError, setStepError] = useState('')
  const [saving, setSaving] = useState(false)
  const [qrData, setQrData] = useState<{ id: number; nominal: string } | null>(null)
  const [struk, setStruk] = useState<{ id: number; tanggal: string } | null>(null)

  const hariNum = Number(jumlahHari)
  const totalFidyah = hariNum * FIDYAH_PER_HARI

  const STEP_ORDER: Step[] = ['kalkulasi', 'metode', 'konfirmasi']
  const stepIndex = STEP_ORDER.indexOf(step)
  const progress = Math.round(((stepIndex + 1) / STEP_ORDER.length) * 100)

  function handleNext() {
    if (step === 'kalkulasi') {
      if (!jumlahHari || hariNum < 1) { setStepError('Masukkan jumlah hari (minimal 1).'); return }
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
      .from('kategori_zakat').select('id').eq('nama_kategori', 'Fidyah').single()

    const { data, error } = await supabase.from('transaksi').insert({
      muzakki_id: Number(muzakkiId),
      kategori_id: kategori?.id ?? null,
      metode_pembayaran: metode,
      jumlah_uang: totalFidyah,
      jumlah_beras: 0,
      lembaga_id: profil?.lembaga_id ?? null,
      amil_pencatat: user?.user_metadata?.nama ?? user?.email ?? null,
    }).select('id')

    setSaving(false)
    if (error) { setStepError('Gagal menyimpan. Coba lagi.'); return }

    const insertedId = (data as { id: number }[])[0]?.id ?? 0
    const tanggalNow = new Date().toISOString()
    if (metode === 'QRIS') {
      setQrData({ id: insertedId, nominal: formatRupiah(totalFidyah) })
    } else {
      setStruk({ id: insertedId, tanggal: tanggalNow })
    }
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
            <h1 style={{ ...s.headerTitle, fontSize: isMobile ? '21px' : '26px' }}>Fidyah</h1>
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

          {/* Kalkulasi */}
          {step === 'kalkulasi' && (
            <div style={s.card}>
              <div style={{ ...s.cardHeader, padding: isMobile ? '16px 16px 0' : '20px 24px 0' }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : '17px' }}>Kalkulasi Fidyah</h2>
                <p style={s.cardSub}>Rp 65.000 per hari puasa yang ditinggalkan</p>
              </div>
              <div style={{ ...s.cardBody, padding: isMobile ? '0 16px 16px' : '0 24px 24px' }}>
                <div style={{ ...s.infoBox, padding: isMobile ? '12px' : '14px' }}>
                  <div style={{ ...s.infoGrid, gap: isMobile ? '10px' : '12px' }}>
                    <div>
                      <p style={s.infoLabel}>Standar Fidyah / hari</p>
                      <p style={{ ...s.infoValue, fontSize: isMobile ? '13.5px' : '15px' }}>{formatRupiah(FIDYAH_PER_HARI)}</p>
                    </div>
                    <div>
                      <p style={s.infoLabel}>Maks. hari Ramadan</p>
                      <p style={{ ...s.infoValue, fontSize: isMobile ? '13.5px' : '15px' }}>30 hari</p>
                    </div>
                  </div>
                </div>

                <div style={s.field}>
                  <label style={s.label}>Jumlah Hari yang Ditinggalkan</label>
                  <input
                    type="number" min="1" max="30" placeholder="1"
                    value={jumlahHari}
                    onChange={e => setJumlahHari(e.target.value)}
                    style={{ ...s.input, fontSize: isMobile ? '16px' : '14px' }}
                    autoFocus={!isMobile}
                  />
                </div>

                {jumlahHari && hariNum > 0 && (
                  <div style={{ ...s.hasilBox, padding: isMobile ? '14px' : '16px' }}>
                    <p style={s.hasilTitle}>📊 Hasil untuk {hariNum} hari</p>
                    <div style={{ ...s.hasilRow, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '4px' : 0 }}>
                      <span style={s.hasilRowLabel}>Total Fidyah</span>
                      <span style={{ ...s.hasilRowValue, fontSize: isMobile ? '17px' : '20px' }}>{formatRupiah(totalFidyah)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metode */}
          {step === 'metode' && (
            <div style={s.card}>
              <div style={{ ...s.cardHeader, padding: isMobile ? '16px 16px 0' : '20px 24px 0' }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : '17px' }}>Metode Pembayaran</h2>
                <p style={s.cardSub}>{hariNum} hari × Rp 65.000 = <strong>{formatRupiah(totalFidyah)}</strong></p>
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

          {/* Konfirmasi */}
          {step === 'konfirmasi' && metode && (
            <div style={s.card}>
              <div style={{ ...s.cardHeader, padding: isMobile ? '16px 16px 0' : '20px 24px 0' }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : '17px' }}>Konfirmasi Transaksi</h2>
                <p style={s.cardSub}>Periksa kembali sebelum menyimpan</p>
              </div>
              <div style={{ ...s.cardBody, padding: isMobile ? '0 16px 16px' : '0 24px 24px' }}>
                <div style={s.konfirmasiList}>
                  {[
                    { label: 'Muzakki',      value: muzakkiNama },
                    { label: 'Jenis',        value: 'Fidyah' },
                    { label: 'Jumlah Hari',  value: `${hariNum} hari` },
                    { label: 'Tarif / Hari', value: formatRupiah(FIDYAH_PER_HARI) },
                    { label: 'Metode',       value: `${METODE_ICON[metode]} ${metode}` },
                  ].map(r => (
                    <div key={r.label} style={s.konfRow}>
                      <span style={s.konfLabel}>{r.label}</span>
                      <span style={s.konfValue}>{r.value}</span>
                    </div>
                  ))}
                  <div style={{ ...s.konfRow, borderBottom: 'none' }}>
                    <span style={s.konfLabel}>Total Fidyah</span>
                    <span style={{ ...s.konfValue, color: '#2D7A50', fontSize: isMobile ? '16px' : '18px' }}>
                      {formatRupiah(totalFidyah)}
                    </span>
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
            muzakkiNama,
            jenisZakat: 'Fidyah',
            metode,
            jumlahUang: totalFidyah,
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

export default function FidyahPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Loading...</div>}>
      <FidyahForm />
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
  infoBox: { background: '#F8F4ED', borderRadius: '10px', border: '1px solid #EDE8E0' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr' },
  infoLabel: { fontSize: '10px', fontWeight: 700, color: '#A8A29E', letterSpacing: '0.3px', textTransform: 'uppercase', marginBottom: '4px' },
  infoValue: { fontWeight: 700, color: '#1C1917' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 600, color: '#44403C' },
  input: { width: '100%', padding: '11px 14px', border: '1.5px solid #EDE8E0', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', color: '#1C1917', background: '#FAFAF9', boxSizing: 'border-box' },
  hasilBox: { background: '#F0F7F3', borderRadius: '10px', border: '1.5px solid #2D7A50', display: 'flex', flexDirection: 'column', gap: '10px' },
  hasilTitle: { fontSize: '13px', fontWeight: 700, color: '#1A4731' },
  hasilRow: { display: 'flex', justifyContent: 'space-between' },
  hasilRowLabel: { fontSize: '13px', color: '#57534E' },
  hasilRowValue: { fontWeight: 700, color: '#2D7A50' },
  metodeBtn: { display: 'flex', alignItems: 'center', gap: '14px', borderRadius: '10px', border: '2px solid #EDE8E0', background: '#FAFAF9', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', width: '100%' },
  metodeBtnActive: { borderColor: '#2D7A50', background: '#F0F7F3' },
  metodeIcon: {},
  metodeLabel: { flex: 1, fontWeight: 600, color: '#1C1917', textAlign: 'left' },
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
