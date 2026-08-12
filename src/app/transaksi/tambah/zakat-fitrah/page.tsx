'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/components/Sidebar'
import QRConfirmModal from '@/components/QRConfirmModal'
import StrukModal from '@/components/StrukModal'

type Metode = 'Tunai' | 'Transfer Bank' | 'QRIS' | 'Beras'
type Step = 'kalkulasi' | 'metode' | 'konfirmasi'

const METODE_LIST: Metode[] = ['Tunai', 'Transfer Bank', 'QRIS', 'Beras']
const METODE_ICON: Record<Metode, string> = { Tunai: '💵', 'Transfer Bank': '🏦', QRIS: '📱', Beras: '🌾' }
const FITRAH_UANG = 45000
const FITRAH_BERAS = 2.5

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

function ZakatFitrahForm() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()
  const isMobile = useIsMobile()

  const muzakkiId = params.get('muzakkiId') ?? ''
  const muzakkiNama = params.get('muzakkiNama') ?? ''

  const [step, setStep] = useState<Step>('kalkulasi')
  const [jumlahJiwa, setJumlahJiwa] = useState('')
  const [metode, setMetode] = useState<Metode | null>(null)
  const [stepError, setStepError] = useState('')
  const [saving, setSaving] = useState(false)
  const [qrData, setQrData] = useState<{ id: number; nominal: string } | null>(null)
  const [struk, setStruk] = useState<{ id: number; tanggal: string } | null>(null)

  const jiwaNum = Number(jumlahJiwa)
  const totalUang = jiwaNum * FITRAH_UANG
  const totalBeras = jiwaNum * FITRAH_BERAS

  const STEP_ORDER: Step[] = ['kalkulasi', 'metode', 'konfirmasi']
  const stepIndex = STEP_ORDER.indexOf(step)
  const progress = Math.round(((stepIndex + 1) / STEP_ORDER.length) * 100)

  function handleNext() {
    if (step === 'kalkulasi') {
      if (!jumlahJiwa || jiwaNum < 1) { setStepError('Masukkan jumlah jiwa (minimal 1).'); return }
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

    const namaKategori = metode === 'Beras' ? 'Zakat Fitrah - Beras' : 'Zakat Fitrah - Uang'
    const { data: kategori } = await supabase
      .from('kategori_zakat').select('id').eq('nama_kategori', namaKategori).single()

    const { data, error } = await supabase.from('transaksi').insert({
      muzakki_id: Number(muzakkiId),
      kategori_id: kategori?.id ?? null,
      metode_pembayaran: metode,
      jumlah_uang: metode === 'Beras' ? 0 : totalUang,
      jumlah_beras: metode === 'Beras' ? totalBeras : 0,
      amil_pencatat: user?.user_metadata?.nama ?? user?.email ?? null,
      lembaga_id: profil?.lembaga_id ?? null,
    }).select('id')

    setSaving(false)
    if (error) { setStepError('Gagal menyimpan. Coba lagi.'); return }

    const insertedId = (data as { id: number }[])[0]?.id ?? 0
    const tanggalNow = new Date().toISOString()
    if (metode === 'QRIS') {
      setQrData({ id: insertedId, nominal: formatRupiah(totalUang) })
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
            <h1 style={{ ...s.headerTitle, fontSize: isMobile ? '21px' : '26px' }}>Zakat Fitrah</h1>
            <p style={s.headerSub}>Muzakki: <strong>{muzakkiNama}</strong></p>
          </div>
        </div>

        <div style={s.progressWrap}>
          <div style={s.progressTrack}>
            <div style={{ ...s.progressFill, width: `${progress}%` }} />
          </div>
          <span style={s.progressLabel}>{step === 'kalkulasi' ? 'Kalkulasi' : step === 'metode' ? 'Metode' : 'Konfirmasi'}</span>
        </div>

        <div style={{ ...s.formWrap, maxWidth: isMobile ? '100%' : '560px' }}>

          {/* Kalkulasi */}
          {step === 'kalkulasi' && (
            <div style={s.card}>
              <div style={{ ...s.cardHeader, padding: isMobile ? '16px 16px 0' : '20px 24px 0' }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : '17px' }}>Kalkulasi Zakat Fitrah</h2>
                <p style={s.cardSub}>Standar Jabodetabek — Rp 45.000 atau 2.5 Kg per jiwa</p>
              </div>
              <div style={{ ...s.cardBody, padding: isMobile ? '0 16px 16px' : '0 24px 24px' }}>
                <div style={{ ...s.infoBox, padding: isMobile ? '12px' : '14px' }}>
                  <div style={{ ...s.infoGrid, gap: isMobile ? '10px' : '12px' }}>
                    <div>
                      <p style={s.infoLabel}>Standar Uang / jiwa</p>
                      <p style={{ ...s.infoValue, fontSize: isMobile ? '13.5px' : '15px' }}>{formatRupiah(FITRAH_UANG)}</p>
                    </div>
                    <div>
                      <p style={s.infoLabel}>Standar Beras / jiwa</p>
                      <p style={{ ...s.infoValue, fontSize: isMobile ? '13.5px' : '15px' }}>{FITRAH_BERAS} Kg</p>
                    </div>
                  </div>
                </div>

                <div style={s.field}>
                  <label style={s.label}>Jumlah Jiwa</label>
                  <input type="number" min="1" placeholder="1"
                    value={jumlahJiwa}
                    onChange={e => setJumlahJiwa(e.target.value)}
                    style={{ ...s.input, fontSize: isMobile ? '16px' : '14px' }}
                    autoFocus={!isMobile} />
                </div>

                {jumlahJiwa && jiwaNum > 0 && (
                  <div style={{ ...s.hasilBox, padding: isMobile ? '14px' : '16px' }}>
                    <p style={s.hasilTitle}>📊 Hasil untuk {jiwaNum} jiwa</p>
                    <div style={{ ...s.hasilGrid, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : 0 }}>
                      <div style={s.hasilItem}>
                        <p style={s.hasilItemLabel}>Jika bayar uang</p>
                        <p style={{ ...s.hasilItemValue, fontSize: isMobile ? '16px' : '18px' }}>{formatRupiah(totalUang)}</p>
                      </div>
                      {isMobile
                        ? <div style={s.hasilDividerH} />
                        : <div style={s.hasilDivider} />
                      }
                      <div style={s.hasilItem}>
                        <p style={s.hasilItemLabel}>Jika bayar beras</p>
                        <p style={{ ...s.hasilItemValue, fontSize: isMobile ? '16px' : '18px' }}>{totalBeras} Kg</p>
                      </div>
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
                <p style={s.cardSub}>{jiwaNum} jiwa — {formatRupiah(totalUang)} atau {totalBeras} Kg beras</p>
              </div>
              <div style={{ ...s.cardBody, padding: isMobile ? '0 16px 16px' : '0 24px 24px' }}>
                {METODE_LIST.map(m => (
                  <button key={m} onClick={() => setMetode(m)}
                    style={{
                      ...s.metodeBtn,
                      ...(metode === m ? s.metodeBtnActive : {}),
                      padding: isMobile ? '12px 14px' : '14px 16px',
                    }}>
                    <span style={{ ...s.metodeIcon, fontSize: isMobile ? '19px' : '22px' }}>{METODE_ICON[m]}</span>
                    <div style={s.metodeText}>
                      <span style={{ ...s.metodeLabel, fontSize: isMobile ? '13.5px' : '14px' }}>{m}</span>
                      {m === 'Beras' && <span style={s.metodeHint}>Bayar {totalBeras} Kg</span>}
                      {m !== 'Beras' && <span style={s.metodeHint}>Bayar {formatRupiah(totalUang)}</span>}
                    </div>
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
                    { label: 'Muzakki',     value: muzakkiNama },
                    { label: 'Jenis Zakat', value: 'Zakat Fitrah' },
                    { label: 'Jumlah Jiwa', value: `${jiwaNum} jiwa` },
                    { label: 'Metode',      value: `${METODE_ICON[metode]} ${metode}` },
                  ].map(r => (
                    <div key={r.label} style={s.konfRow}>
                      <span style={s.konfLabel}>{r.label}</span>
                      <span style={s.konfValue}>{r.value}</span>
                    </div>
                  ))}
                  <div style={{ ...s.konfRow, borderBottom: 'none' }}>
                    <span style={s.konfLabel}>Total {metode === 'Beras' ? 'Beras' : 'Uang'}</span>
                    <span style={{ ...s.konfValue, color: '#2D7A50', fontSize: isMobile ? '16px' : '18px' }}>
                      {metode === 'Beras' ? `${totalBeras} Kg` : formatRupiah(totalUang)}
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
            jenisZakat: 'Zakat Fitrah',
            metode,
            jumlahUang: metode === 'Beras' ? 0 : totalUang,
            jumlahBeras: metode === 'Beras' ? totalBeras : 0,
            amilPencatat: '',
          }}
          onClose={() => setStruk(null)}
          onRedirect={() => router.push('/transaksi')}
        />
      )}
    </div>
  )
}

export default function ZakatFitrahPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Loading...</div>}>
      <ZakatFitrahForm />
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
  card: { background: '#fff', borderRadius: '16px', border: '1px solid #EDE8E0', overflow: 'hidden' },
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
  hasilBox: { background: '#F0F7F3', borderRadius: '10px', border: '1.5px solid #2D7A50' },
  hasilTitle: { fontSize: '13px', fontWeight: 700, color: '#1A4731', marginBottom: '12px' },
  hasilGrid: { display: 'flex', alignItems: 'stretch' },
  hasilItem: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
  hasilDivider: { width: '1px', background: '#C9E8D5', margin: '0 16px' },
  hasilDividerH: { height: '1px', background: '#C9E8D5', width: '100%' },
  hasilItemLabel: { fontSize: '11px', fontWeight: 600, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.3px' },
  hasilItemValue: { fontWeight: 700, color: '#2D7A50' },
  metodeBtn: { display: 'flex', alignItems: 'center', gap: '14px', borderRadius: '10px', border: '2px solid #EDE8E0', background: '#FAFAF9', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', width: '100%' },
  metodeBtnActive: { borderColor: '#2D7A50', background: '#F0F7F3' },
  metodeIcon: { flexShrink: 0 },
  metodeText: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' },
  metodeLabel: { fontWeight: 600, color: '#1C1917' },
  metodeHint: { fontSize: '12px', color: '#78716C' },
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
