'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/components/Sidebar'
import QRConfirmModal from '@/components/QRConfirmModal'

type Metode = 'Tunai' | 'Transfer Bank' | 'QRIS' | 'Beras'
type Step = 'kalkulasi' | 'metode' | 'konfirmasi'

const METODE_LIST: Metode[] = ['Tunai', 'Transfer Bank', 'QRIS', 'Beras']
const METODE_ICON: Record<Metode, string> = { Tunai: '💵', 'Transfer Bank': '🏦', QRIS: '📱', Beras: '🌾' }
const FITRAH_UANG = 45000
const FITRAH_BERAS = 2.5

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function ZakatFitrahContent() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()

  const muzakkiId = params.get('muzakkiId') ?? ''
  const muzakkiNama = params.get('muzakkiNama') ?? ''

  const [step, setStep] = useState<Step>('kalkulasi')
  const [jumlahJiwa, setJumlahJiwa] = useState('')
  const [metode, setMetode] = useState<Metode | null>(null)
  const [stepError, setStepError] = useState('')
  const [saving, setSaving] = useState(false)
  const [qrData, setQrData] = useState<{ id: number; nominal: string } | null>(null)

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
      .from('profil_amil')
      .select('lembaga_id')
      .eq('id', user!.id)
      .single()

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

    if (metode === 'QRIS' && data) {
      setQrData({
        id: (data as { id: number }[])[0]?.id ?? 0,
        nominal: formatRupiah(totalUang),
      })
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
            <h1 style={s.headerTitle}>Zakat Fitrah</h1>
            <p style={s.headerSub}>Muzakki: <strong>{muzakkiNama}</strong></p>
          </div>
        </div>

        <div style={s.progressWrap}>
          <div style={s.progressTrack}>
            <div style={{ ...s.progressFill, width: `${progress}%` }} />
          </div>
          <span style={s.progressLabel}>{step === 'kalkulasi' ? 'Kalkulasi' : step === 'metode' ? 'Metode' : 'Konfirmasi'}</span>
        </div>

        <div style={s.formWrap}>

          {/* Kalkulasi */}
          {step === 'kalkulasi' && (
            <div style={s.card}>
              <div style={s.cardHeader}>
                <h2 style={s.cardTitle}>Kalkulasi Zakat Fitrah</h2>
                <p style={s.cardSub}>Standar Jabodetabek — Rp 45.000 atau 2.5 Kg per jiwa</p>
              </div>
              <div style={s.cardBody}>
                <div style={s.infoBox}>
                  <div style={s.infoGrid}>
                    <div>
                      <p style={s.infoLabel}>Standar Uang / jiwa</p>
                      <p style={s.infoValue}>{formatRupiah(FITRAH_UANG)}</p>
                    </div>
                    <div>
                      <p style={s.infoLabel}>Standar Beras / jiwa</p>
                      <p style={s.infoValue}>{FITRAH_BERAS} Kg</p>
                    </div>
                  </div>
                </div>

                <div style={s.field}>
                  <label style={s.label}>Jumlah Jiwa</label>
                  <input type="number" min="1" placeholder="1"
                    value={jumlahJiwa}
                    onChange={e => setJumlahJiwa(e.target.value)}
                    style={s.input} autoFocus />
                </div>

                {jumlahJiwa && jiwaNum > 0 && (
                  <div style={s.hasilBox}>
                    <p style={s.hasilTitle}>📊 Hasil untuk {jiwaNum} jiwa</p>
                    <div style={s.hasilGrid}>
                      <div style={s.hasilItem}>
                        <p style={s.hasilItemLabel}>Jika bayar uang</p>
                        <p style={s.hasilItemValue}>{formatRupiah(totalUang)}</p>
                      </div>
                      <div style={s.hasilDivider} />
                      <div style={s.hasilItem}>
                        <p style={s.hasilItemLabel}>Jika bayar beras</p>
                        <p style={s.hasilItemValue}>{totalBeras} Kg</p>
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
              <div style={s.cardHeader}>
                <h2 style={s.cardTitle}>Metode Pembayaran</h2>
                <p style={s.cardSub}>{jiwaNum} jiwa — {formatRupiah(totalUang)} atau {totalBeras} Kg beras</p>
              </div>
              <div style={s.cardBody}>
                {METODE_LIST.map(m => (
                  <button key={m} onClick={() => setMetode(m)}
                    style={{ ...s.metodeBtn, ...(metode === m ? s.metodeBtnActive : {}) }}>
                    <span style={s.metodeIcon}>{METODE_ICON[m]}</span>
                    <div style={s.metodeText}>
                      <span style={s.metodeLabel}>{m}</span>
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
              <div style={s.cardHeader}>
                <h2 style={s.cardTitle}>Konfirmasi Transaksi</h2>
                <p style={s.cardSub}>Periksa kembali sebelum menyimpan</p>
              </div>
              <div style={s.cardBody}>
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
                    <span style={{ ...s.konfValue, color: '#2D7A50', fontSize: '18px' }}>
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

export default function ZakatFitrahPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Loading...</div>}>
      <ZakatFitrahContent />
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
  infoBox: { background: '#F8F4ED', borderRadius: '10px', padding: '14px', border: '1px solid #EDE8E0' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  infoLabel: { fontSize: '10px', fontWeight: 700, color: '#A8A29E', letterSpacing: '0.3px', textTransform: 'uppercase', marginBottom: '4px' },
  infoValue: { fontSize: '15px', fontWeight: 700, color: '#1C1917' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 600, color: '#44403C' },
  input: { width: '100%', padding: '11px 14px', fontSize: '14px', border: '1.5px solid #EDE8E0', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', color: '#1C1917', background: '#FAFAF9', boxSizing: 'border-box' },
  hasilBox: { background: '#F0F7F3', borderRadius: '10px', padding: '16px', border: '1.5px solid #2D7A50' },
  hasilTitle: { fontSize: '13px', fontWeight: 700, color: '#1A4731', marginBottom: '12px' },
  hasilGrid: { display: 'flex', alignItems: 'stretch' },
  hasilItem: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
  hasilDivider: { width: '1px', background: '#C9E8D5', margin: '0 16px' },
  hasilItemLabel: { fontSize: '11px', fontWeight: 600, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.3px' },
  hasilItemValue: { fontSize: '18px', fontWeight: 700, color: '#2D7A50' },
  metodeBtn: { display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '10px', borderStyle: 'solid', borderWidth: '2px', borderColor: '#EDE8E0', background: '#FAFAF9', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', width: '100%' },
  metodeBtnActive: { borderColor: '#2D7A50', background: '#F0F7F3' },
  metodeIcon: { fontSize: '22px', flexShrink: 0 },
  metodeText: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' },
  metodeLabel: { fontSize: '14px', fontWeight: 600, color: '#1C1917' },
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
