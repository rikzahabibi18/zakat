'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/components/Sidebar'
import QRConfirmModal from '@/components/QRConfirmModal'
import StrukModal from '@/components/StrukModal'

type Metode = 'Tunai' | 'Transfer Bank' | 'QRIS' | 'Beras'
type Step = 'kalkulasi' | 'metode' | 'konfirmasi'
type OpsiKalkulasi = 'jiwa' | 'nominal' | 'beras'

const METODE_LIST: Metode[] = ['Tunai', 'Transfer Bank', 'QRIS', 'Beras']
const METODE_ICON: Record<Metode, string> = { Tunai: '💵', 'Transfer Bank': '🏦', QRIS: '📱', Beras: '🌾' }
const FITRAH_UANG = 45000
const FITRAH_BERAS = 2.5
const RATE_PER_KG = FITRAH_UANG / FITRAH_BERAS // 18000 per Kg

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

function ZakatFitrahForm() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()
  const isMobile = useIsMobile()

  const muzakkiId = params.get('muzakkiId') ?? ''
  const muzakkiNama = params.get('muzakkiNama') ?? ''

  const [step, setStep] = useState<Step>('kalkulasi')
  const [opsi, setOpsi] = useState<OpsiKalkulasi>('jiwa')
  const [jumlahJiwa, setJumlahJiwa] = useState('')
  const [inputNominal, setInputNominal] = useState('')
  const [inputBeras, setInputBeras] = useState('')
  const [metode, setMetode] = useState<Metode | null>(null)
  const [stepError, setStepError] = useState('')
  const [saving, setSaving] = useState(false)
  const [qrData, setQrData] = useState<{ id: number; nominal: string } | null>(null)
  const [struk, setStruk] = useState<{ id: number; tanggal: string } | null>(null)

  // ── Kalkulasi final berdasarkan opsi ──
  const jiwaNum = Number(jumlahJiwa)
  const nominalNum = parseInput(inputNominal)
  const berasNum = parseFloat(inputBeras) || 0

  const finalUang: number = (() => {
    if (opsi === 'jiwa')    return jiwaNum * FITRAH_UANG
    if (opsi === 'nominal') return nominalNum
    if (opsi === 'beras')   return Math.round(berasNum * RATE_PER_KG)
    return 0
  })()

  const finalBeras: number = (() => {
    if (opsi === 'jiwa')    return jiwaNum * FITRAH_BERAS
    if (opsi === 'nominal') return parseFloat((nominalNum / RATE_PER_KG).toFixed(2))
    if (opsi === 'beras')   return berasNum
    return 0
  })()

  const STEP_ORDER: Step[] = ['kalkulasi', 'metode', 'konfirmasi']
  const stepIndex = STEP_ORDER.indexOf(step)
  const progress = Math.round(((stepIndex + 1) / STEP_ORDER.length) * 100)

  function handleOpsiChange(newOpsi: OpsiKalkulasi) {
    setOpsi(newOpsi)
    setJumlahJiwa('')
    setInputNominal('')
    setInputBeras('')
    setStepError('')
  }

  function handleNext() {
    if (step === 'kalkulasi') {
      if (opsi === 'jiwa' && (!jumlahJiwa || jiwaNum < 1)) {
        setStepError('Masukkan jumlah jiwa (minimal 1).'); return
      }
      if (opsi === 'nominal' && nominalNum < 1) {
        setStepError('Masukkan nominal zakat.'); return
      }
      if (opsi === 'beras' && berasNum <= 0) {
        setStepError('Masukkan jumlah beras (minimal 0.1 Kg).'); return
      }
    }
    if (step === 'metode' && !metode) {
      setStepError('Pilih metode pembayaran.'); return
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

    // Simpan keduanya — uang dan beras selalu ada (hasil konversi)
    const namaKategori = metode === 'Beras' ? 'Zakat Fitrah - Beras' : 'Zakat Fitrah - Uang'
    const { data: kategori } = await supabase
      .from('kategori_zakat').select('id').eq('nama_kategori', namaKategori).single()

    const { data, error } = await supabase.from('transaksi').insert({
      muzakki_id: Number(muzakkiId),
      kategori_id: kategori?.id ?? null,
      metode_pembayaran: metode,
      jumlah_uang: finalUang,
      jumlah_beras: finalBeras,
      amil_pencatat: user?.user_metadata?.nama ?? user?.email ?? null,
      lembaga_id: profil?.lembaga_id ?? null,
    }).select('id')

    setSaving(false)
    if (error) { setStepError('Gagal menyimpan. Coba lagi.'); return }

    const insertedId = (data as { id: number }[])[0]?.id ?? 0
    const tanggalNow = new Date().toISOString()
    if (metode === 'QRIS') {
      setQrData({ id: insertedId, nominal: formatRupiah(finalUang) })
    } else {
      setStruk({ id: insertedId, tanggal: tanggalNow })
    }
  }

  // Label ringkas untuk step metode & konfirmasi
  const labelKalkulasi = opsi === 'jiwa'
    ? `${jiwaNum} jiwa`
    : opsi === 'nominal'
      ? formatRupiah(nominalNum)
      : `${berasNum} Kg beras`

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

          {/* ── Step: Kalkulasi ── */}
          {step === 'kalkulasi' && (
            <div style={s.card}>
              <div style={{ ...s.cardHeader, padding: isMobile ? '16px 16px 0' : '20px 24px 0' }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : '17px' }}>Kalkulasi Zakat Fitrah</h2>
                <p style={s.cardSub}>Standar Jabodetabek — Rp 45.000 atau 2.5 Kg per jiwa</p>
              </div>
              <div style={{ ...s.cardBody, padding: isMobile ? '0 16px 16px' : '0 24px 24px' }}>

                {/* Info rate */}
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

                {/* Toggle 3 opsi */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '8px' }}>
                  {([
                    { key: 'jiwa',    icon: '🧑‍👨‍👦', label: 'Hitung dari Jiwa',   desc: 'Input jumlah orang' },
                    { key: 'nominal', icon: '💵',      label: 'Input Nominal',       desc: 'Input langsung rupiah' },
                    { key: 'beras',   icon: '🌾',      label: 'Input Berat Beras',   desc: 'Input langsung Kg' },
                  ] as const).map(o => (
                    <button key={o.key}
                      onClick={() => handleOpsiChange(o.key)}
                      style={{
                        ...s.opsiBtn,
                        ...(opsi === o.key ? s.opsiBtnActive : {}),
                      }}>
                      <span style={s.opsiIcon}>{o.icon}</span>
                      <div>
                        <p style={s.opsiLabel}>{o.label}</p>
                        <p style={s.opsiDesc}>{o.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* ── Input Jiwa ── */}
                {opsi === 'jiwa' && (
                  <>
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
                            <p style={{ ...s.hasilItemValue, fontSize: isMobile ? '16px' : '18px' }}>{formatRupiah(finalUang)}</p>
                          </div>
                          {isMobile ? <div style={s.hasilDividerH} /> : <div style={s.hasilDivider} />}
                          <div style={s.hasilItem}>
                            <p style={s.hasilItemLabel}>Jika bayar beras</p>
                            <p style={{ ...s.hasilItemValue, fontSize: isMobile ? '16px' : '18px' }}>{finalBeras} Kg</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── Input Nominal ── */}
                {opsi === 'nominal' && (
                  <>
                    <div style={s.field}>
                      <label style={s.label}>Nominal Zakat (Rp)</label>
                      <div style={s.inputWrap}>
                        <span style={s.prefix}>Rp</span>
                        <input type="text" inputMode="numeric" placeholder="0"
                          value={inputNominal}
                          onChange={e => setInputNominal(formatInput(e.target.value))}
                          style={{ ...s.input, paddingLeft: '44px', fontSize: isMobile ? '16px' : '14px' }}
                          autoFocus={!isMobile} />
                      </div>
                    </div>
                    {nominalNum > 0 && (
                      <div style={{ ...s.hasilBox, padding: isMobile ? '14px' : '16px' }}>
                        <p style={s.hasilTitle}>📊 Setara dengan</p>
                        <div style={{ ...s.hasilGrid, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : 0 }}>
                          <div style={s.hasilItem}>
                            <p style={s.hasilItemLabel}>Nominal uang</p>
                            <p style={{ ...s.hasilItemValue, fontSize: isMobile ? '16px' : '18px' }}>{formatRupiah(finalUang)}</p>
                          </div>
                          {isMobile ? <div style={s.hasilDividerH} /> : <div style={s.hasilDivider} />}
                          <div style={s.hasilItem}>
                            <p style={s.hasilItemLabel}>Setara beras</p>
                            <p style={{ ...s.hasilItemValue, fontSize: isMobile ? '16px' : '18px' }}>{finalBeras} Kg</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── Input Beras ── */}
                {opsi === 'beras' && (
                  <>
                    <div style={s.field}>
                      <label style={s.label}>Berat Beras (Kg)</label>
                      <div style={s.inputWrap}>
                        <input type="number" min="0.1" step="0.1" placeholder="0.0"
                          value={inputBeras}
                          onChange={e => setInputBeras(e.target.value)}
                          style={{ ...s.input, paddingRight: '50px', fontSize: isMobile ? '16px' : '14px' }}
                          autoFocus={!isMobile} />
                        <span style={s.suffix}>Kg</span>
                      </div>
                    </div>
                    {berasNum > 0 && (
                      <div style={{ ...s.hasilBox, padding: isMobile ? '14px' : '16px' }}>
                        <p style={s.hasilTitle}>📊 Setara dengan</p>
                        <div style={{ ...s.hasilGrid, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : 0 }}>
                          <div style={s.hasilItem}>
                            <p style={s.hasilItemLabel}>Berat beras</p>
                            <p style={{ ...s.hasilItemValue, fontSize: isMobile ? '16px' : '18px' }}>{finalBeras} Kg</p>
                          </div>
                          {isMobile ? <div style={s.hasilDividerH} /> : <div style={s.hasilDivider} />}
                          <div style={s.hasilItem}>
                            <p style={s.hasilItemLabel}>Setara uang</p>
                            <p style={{ ...s.hasilItemValue, fontSize: isMobile ? '16px' : '18px' }}>{formatRupiah(finalUang)}</p>
                          </div>
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
                <p style={s.cardSub}>{labelKalkulasi} — {formatRupiah(finalUang)} atau {finalBeras} Kg beras</p>
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
                      {m === 'Beras'
                        ? <span style={s.metodeHint}>Bayar {finalBeras} Kg</span>
                        : <span style={s.metodeHint}>Bayar {formatRupiah(finalUang)}</span>
                      }
                    </div>
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
                <div style={s.konfirmasiList}>
                  {[
                    { label: 'Muzakki',     value: muzakkiNama },
                    { label: 'Jenis Zakat', value: 'Zakat Fitrah' },
                    { label: 'Cara Input',  value: opsi === 'jiwa' ? `${jiwaNum} jiwa` : opsi === 'nominal' ? 'Nominal langsung' : 'Berat beras' },
                    { label: 'Metode',      value: `${METODE_ICON[metode]} ${metode}` },
                  ].map(r => (
                    <div key={r.label} style={s.konfRow}>
                      <span style={s.konfLabel}>{r.label}</span>
                      <span style={s.konfValue}>{r.value}</span>
                    </div>
                  ))}
                  {/* Selalu tampilkan keduanya di konfirmasi */}
                  <div style={s.konfRow}>
                    <span style={s.konfLabel}>Jumlah Uang</span>
                    <span style={{ ...s.konfValue, color: '#2D7A50' }}>{formatRupiah(finalUang)}</span>
                  </div>
                  <div style={{ ...s.konfRow, borderBottom: 'none' }}>
                    <span style={s.konfLabel}>Jumlah Beras</span>
                    <span style={{ ...s.konfValue, color: '#2D7A50', fontSize: isMobile ? '16px' : '18px' }}>{finalBeras} Kg</span>
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
            jumlahUang: finalUang,
            jumlahBeras: finalBeras,
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
  opsiBtn: { display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '11px 12px', borderRadius: '10px', border: '2px solid #EDE8E0', background: '#FAFAF9', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s', width: '100%' },
  opsiBtnActive: { borderColor: '#2D7A50', background: '#F0F7F3' },
  opsiIcon: { fontSize: '18px', flexShrink: 0, marginTop: '1px' },
  opsiLabel: { fontSize: '12px', fontWeight: 700, color: '#1C1917', marginBottom: '2px' },
  opsiDesc: { fontSize: '10px', color: '#78716C' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 600, color: '#44403C' },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  prefix: { position: 'absolute', left: '14px', fontSize: '14px', fontWeight: 600, color: '#78716C', pointerEvents: 'none' },
  suffix: { position: 'absolute', right: '14px', fontSize: '14px', fontWeight: 600, color: '#78716C', pointerEvents: 'none' },
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
