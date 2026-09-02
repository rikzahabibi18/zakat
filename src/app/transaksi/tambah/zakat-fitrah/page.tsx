'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/components/Sidebar'
import QRConfirmModal from '@/components/QRConfirmModal'
import StrukModal from '@/components/StrukModal'
import { shared } from '@/styles/shared'
import { colors, font } from '@/styles/tokens'

type Metode = 'Tunai' | 'Transfer Bank' | 'QRIS' | 'Beras'
type Step = 'kalkulasi' | 'metode' | 'konfirmasi'
type OpsiKalkulasi = 'jiwa' | 'nominal' | 'beras'
type SatuanBeras = 'kg' | 'liter'

const METODE_LIST: Metode[] = ['Tunai', 'Transfer Bank', 'QRIS', 'Beras']
const METODE_ICON: Record<Metode, string> = { Tunai: '💵', 'Transfer Bank': '🏦', QRIS: '📱', Beras: '🌾' }

// Konstanta BAZNAS
const FITRAH_UANG = 45000
const FITRAH_KG = 2.5
const FITRAH_LITER = 3.5
// Rate konversi ke Kg (base untuk semua kalkulasi uang)
const RATE_PER_KG = FITRAH_UANG / FITRAH_KG       // 18.000 per Kg
const LITER_TO_KG = FITRAH_KG / FITRAH_LITER       // ≈ 0.7143 Kg per Liter

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

  // Setting satuan dari lembaga
  const [satuanBeras, setSatuanBeras] = useState<SatuanBeras>('kg')
  const [loadingSatuan, setLoadingSatuan] = useState(true)

  // Fetch satuan_beras dari lembaga saat mount
  useEffect(() => {
    async function fetchSatuan() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadingSatuan(false); return }

      const { data: profil } = await supabase
        .from('profil_amil').select('lembaga_id').eq('id', user.id).single()

      if (profil?.lembaga_id) {
        const { data: lembaga } = await supabase
          .from('lembaga').select('satuan_beras').eq('id', profil.lembaga_id).single()
        if (lembaga?.satuan_beras) {
          setSatuanBeras(lembaga.satuan_beras as SatuanBeras)
        }
      }
      setLoadingSatuan(false)
    }
    fetchSatuan()
  }, [])

  // Label satuan yang dinamis
  const satuanLabel = satuanBeras === 'kg' ? 'Kg' : 'Liter'
  const fitrahPerJiwa = satuanBeras === 'kg' ? FITRAH_KG : FITRAH_LITER

  // ── Semua kalkulasi dikonversi ke Kg dulu sebagai base ──
  const jiwaNum = Number(jumlahJiwa)
  const nominalNum = parseInput(inputNominal)
  const berasInputNum = parseFloat(inputBeras) || 0

  // Konversi input beras ke Kg (untuk kalkulasi uang)
  const berasInputInKg = satuanBeras === 'kg'
    ? berasInputNum
    : berasInputNum * LITER_TO_KG

  // Final values yang disimpan ke DB (selalu dalam Kg)
  const finalUang: number = (() => {
    if (opsi === 'jiwa')    return jiwaNum * FITRAH_UANG
    if (opsi === 'nominal') return nominalNum
    if (opsi === 'beras')   return Math.round(berasInputInKg * RATE_PER_KG)
    return 0
  })()

  // jumlah_beras di DB selalu dalam Kg
  const finalBerasKg: number = (() => {
    if (opsi === 'jiwa')    return jiwaNum * FITRAH_KG
    if (opsi === 'nominal') return parseFloat((nominalNum / RATE_PER_KG).toFixed(3))
    if (opsi === 'beras')   return parseFloat(berasInputInKg.toFixed(3))
    return 0
  })()

  // Nilai yang ditampilkan ke user (dalam satuan lembaga)
  const tampilBeras: number = satuanBeras === 'kg'
    ? finalBerasKg
    : parseFloat((finalBerasKg / LITER_TO_KG).toFixed(2))

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
      if (opsi === 'beras' && berasInputNum <= 0) {
        setStepError(`Masukkan jumlah beras (minimal 0.1 ${satuanLabel}).`); return
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

    const namaKategori = metode === 'Beras' ? 'Zakat Fitrah - Beras' : 'Zakat Fitrah - Uang'
    const { data: kategori } = await supabase
      .from('kategori_zakat').select('id').eq('nama_kategori', namaKategori).single()

    const { data, error } = await supabase.from('transaksi').insert({
      muzakki_id: Number(muzakkiId),
      kategori_id: kategori?.id ?? null,
      metode_pembayaran: metode,
      jumlah_uang: metode === 'Beras' ? 0 : finalUang,
      jumlah_beras: metode === 'Beras' ? finalBerasKg : 0,
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

  const labelKalkulasi = opsi === 'jiwa'
    ? `${jiwaNum} jiwa`
    : opsi === 'nominal'
      ? formatRupiah(nominalNum)
      : `${berasInputNum} ${satuanLabel} beras`

  const cardPad = isMobile ? '16px 16px 0' : '20px 24px 0'
  const bodyPad = isMobile ? '0 16px 16px' : '0 24px 24px'

  if (loadingSatuan) {
    return (
      <div style={shared.shell}>
        <Sidebar />
        <main style={{ ...shared.main, marginLeft: isMobile ? 0 : '220px', padding: isMobile ? '84px 16px 24px' : '32px 36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '32px 0', color: colors.textDisabled, fontSize: font.md }}>
            <div style={shared.spinner} /> Memuat pengaturan lembaga...
          </div>
        </main>
      </div>
    )
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
            <h1 style={{ ...shared.headerTitle, fontSize: isMobile ? font.h2 : font.h1 }}>
              Zakat Fitrah
            </h1>
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
            <div style={shared.cardOverflow}>
              <div style={{ ...s.cardHeader, padding: cardPad }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : font.h3 }}>Kalkulasi Zakat Fitrah</h2>
                <p style={s.cardSub}>
                  Standar Jabodetabek — {formatRupiah(FITRAH_UANG)} atau {fitrahPerJiwa} {satuanLabel} per jiwa
                </p>
              </div>
              <div style={{ ...shared.cardBody, padding: bodyPad }}>

                {/* Info rate — dinamis berdasarkan satuan */}
                <div style={{ ...shared.infoBox, padding: isMobile ? '12px' : '14px' }}>
                  <div style={{ ...shared.infoGrid, gap: isMobile ? '10px' : '12px' }}>
                    <div>
                      <p style={shared.infoLabel}>Standar Uang / jiwa</p>
                      <p style={{ ...shared.infoValue, fontSize: isMobile ? '13.5px' : font.lg }}>{formatRupiah(FITRAH_UANG)}</p>
                    </div>
                    <div>
                      <p style={shared.infoLabel}>Standar Beras / jiwa</p>
                      <p style={{ ...shared.infoValue, fontSize: isMobile ? '13.5px' : font.lg }}>{fitrahPerJiwa} {satuanLabel}</p>
                    </div>
                  </div>
                  {/* Badge satuan aktif */}
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${colors.border}` }}>
                    <span style={{ ...shared.badge, ...shared.badgePrimary }}>
                      {satuanBeras === 'kg' ? '⚖️ Satuan: Kilogram (Kg)' : '🪣 Satuan: Liter'}
                    </span>
                  </div>
                </div>

                {/* Toggle 3 opsi */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '8px' }}>
                  {([
                    { key: 'jiwa',    icon: '🧑‍👨‍👦', label: 'Hitung dari Jiwa',         desc: 'Input jumlah orang' },
                    { key: 'nominal', icon: '💵',      label: 'Input Nominal',            desc: 'Input langsung rupiah' },
                    { key: 'beras',   icon: '🌾',      label: `Input ${satuanLabel} Beras`, desc: `Input langsung ${satuanLabel}` },
                  ] as const).map(o => (
                    <button key={o.key}
                      onClick={() => handleOpsiChange(o.key)}
                      style={{
                        ...shared.opsiBtn,
                        ...(opsi === o.key ? shared.opsiBtnActive : {}),
                      }}>
                      <span style={shared.opsiIcon}>{o.icon}</span>
                      <div>
                        <p style={shared.opsiLabel}>{o.label}</p>
                        <p style={shared.opsiDesc}>{o.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* ── Input Jiwa ── */}
                {opsi === 'jiwa' && (
                  <>
                    <div style={shared.field}>
                      <label style={shared.label}>Jumlah Jiwa</label>
                      <input type="number" min="1" placeholder="1"
                        value={jumlahJiwa}
                        onChange={e => setJumlahJiwa(e.target.value)}
                        style={{ ...shared.input, fontSize: isMobile ? font.xl : font.md }}
                        autoFocus={!isMobile} />
                    </div>
                    {jumlahJiwa && jiwaNum > 0 && (
                      <div style={{ ...shared.hasilBox, padding: isMobile ? '14px' : '16px' }}>
                        <p style={shared.hasilTitle}>📊 Hasil untuk {jiwaNum} jiwa</p>
                        <div style={{ ...shared.hasilGrid, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : 0 }}>
                          <div style={shared.hasilItem}>
                            <p style={shared.hasilItemLabel}>Jika bayar uang</p>
                            <p style={{ ...shared.hasilItemValue, fontSize: isMobile ? font.xl : font.h2 }}>{formatRupiah(finalUang)}</p>
                          </div>
                          {isMobile ? <div style={shared.hasilDividerH} /> : <div style={shared.hasilDivider} />}
                          <div style={shared.hasilItem}>
                            <p style={shared.hasilItemLabel}>Jika bayar beras</p>
                            <p style={{ ...shared.hasilItemValue, fontSize: isMobile ? font.xl : font.h2 }}>{tampilBeras} {satuanLabel}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── Input Nominal ── */}
                {opsi === 'nominal' && (
                  <>
                    <div style={shared.field}>
                      <label style={shared.label}>Nominal Zakat (Rp)</label>
                      <div style={shared.inputWrap}>
                        <span style={shared.prefix}>Rp</span>
                        <input type="text" inputMode="numeric" placeholder="0"
                          value={inputNominal}
                          onChange={e => setInputNominal(formatInput(e.target.value))}
                          style={{ ...shared.input, paddingLeft: '44px', fontSize: isMobile ? font.xl : font.md }}
                          autoFocus={!isMobile} />
                      </div>
                    </div>
                    {nominalNum > 0 && (
                      <div style={{ ...shared.hasilBox, padding: isMobile ? '14px' : '16px' }}>
                        <p style={shared.hasilTitle}>📊 Setara dengan</p>
                        <div style={{ ...shared.hasilGrid, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : 0 }}>
                          <div style={shared.hasilItem}>
                            <p style={shared.hasilItemLabel}>Nominal uang</p>
                            <p style={{ ...shared.hasilItemValue, fontSize: isMobile ? font.xl : font.h2 }}>{formatRupiah(finalUang)}</p>
                          </div>
                          {isMobile ? <div style={shared.hasilDividerH} /> : <div style={shared.hasilDivider} />}
                          <div style={shared.hasilItem}>
                            <p style={shared.hasilItemLabel}>Setara beras</p>
                            <p style={{ ...shared.hasilItemValue, fontSize: isMobile ? font.xl : font.h2 }}>{tampilBeras} {satuanLabel}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── Input Beras ── */}
                {opsi === 'beras' && (
                  <>
                    <div style={shared.field}>
                      <label style={shared.label}>Jumlah Beras ({satuanLabel})</label>
                      <div style={shared.inputWrap}>
                        <input type="number" min="0.1" step="0.1" placeholder="0.0"
                          value={inputBeras}
                          onChange={e => setInputBeras(e.target.value)}
                          style={{ ...shared.input, paddingRight: satuanBeras === 'liter' ? '60px' : '50px', fontSize: isMobile ? font.xl : font.md }}
                          autoFocus={!isMobile} />
                        <span style={shared.suffix}>{satuanLabel}</span>
                      </div>
                    </div>
                    {berasInputNum > 0 && (
                      <div style={{ ...shared.hasilBox, padding: isMobile ? '14px' : '16px' }}>
                        <p style={shared.hasilTitle}>📊 Setara dengan</p>
                        <div style={{ ...shared.hasilGrid, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : 0 }}>
                          <div style={shared.hasilItem}>
                            <p style={shared.hasilItemLabel}>Berat beras</p>
                            <p style={{ ...shared.hasilItemValue, fontSize: isMobile ? font.xl : font.h2 }}>{berasInputNum} {satuanLabel}</p>
                          </div>
                          {isMobile ? <div style={shared.hasilDividerH} /> : <div style={shared.hasilDivider} />}
                          <div style={shared.hasilItem}>
                            <p style={shared.hasilItemLabel}>Setara uang</p>
                            <p style={{ ...shared.hasilItemValue, fontSize: isMobile ? font.xl : font.h2 }}>{formatRupiah(finalUang)}</p>
                          </div>
                        </div>
                        {/* Tampilkan konversi ke Kg kalau satuan Liter */}
                        {satuanBeras === 'liter' && (
                          <p style={{ fontSize: font.xs, color: colors.textDisabled, marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${colors.primaryBorder}` }}>
                            ≈ {finalBerasKg} Kg (disimpan dalam Kg di database)
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Step: Metode ── */}
          {step === 'metode' && (
            <div style={shared.cardOverflow}>
              <div style={{ ...s.cardHeader, padding: cardPad }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : font.h3 }}>Metode Pembayaran</h2>
                <p style={s.cardSub}>{labelKalkulasi} — {formatRupiah(finalUang)} atau {tampilBeras} {satuanLabel} beras</p>
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
                    <div style={shared.metodeText}>
                      <span style={{ ...shared.metodeLabel, fontSize: isMobile ? '13.5px' : font.md }}>{m}</span>
                      {m === 'Beras'
                        ? <span style={shared.metodeHint}>Bayar {tampilBeras} {satuanLabel}</span>
                        : <span style={shared.metodeHint}>Bayar {formatRupiah(finalUang)}</span>
                      }
                    </div>
                    {metode === m && <span style={shared.metodeCheck}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step: Konfirmasi ── */}
          {step === 'konfirmasi' && metode && (
            <div style={shared.cardOverflow}>
              <div style={{ ...s.cardHeader, padding: cardPad }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : font.h3 }}>Konfirmasi Transaksi</h2>
                <p style={s.cardSub}>Periksa kembali sebelum menyimpan</p>
              </div>
              <div style={{ ...shared.cardBody, padding: bodyPad }}>
                <div style={shared.konfirmasiList}>
                  {[
                    { label: 'Muzakki',     value: muzakkiNama },
                    { label: 'Jenis Zakat', value: 'Zakat Fitrah' },
                    { label: 'Cara Input',  value: opsi === 'jiwa' ? `${jiwaNum} jiwa` : opsi === 'nominal' ? 'Nominal langsung' : `Berat beras (${satuanLabel})` },
                    { label: 'Metode',      value: `${METODE_ICON[metode]} ${metode}` },
                  ].map(r => (
                    <div key={r.label} style={shared.konfRow}>
                      <span style={shared.konfLabel}>{r.label}</span>
                      <span style={shared.konfValue}>{r.value}</span>
                    </div>
                  ))}
                  <div style={shared.konfRow}>
                    <span style={shared.konfLabel}>Jumlah Uang</span>
                    <span style={{ ...shared.konfValue, color: colors.primary }}>{formatRupiah(finalUang)}</span>
                  </div>
                  <div style={{ ...shared.konfRow, borderBottom: 'none' }}>
                    <span style={shared.konfLabel}>Jumlah Beras</span>
                    <span style={{ ...shared.konfValue, color: colors.primary, fontSize: isMobile ? font.xl : font.h3 }}>
                      {tampilBeras} {satuanLabel}
                      {satuanBeras === 'liter' && (
                        <span style={{ fontSize: font.xs, color: colors.textDisabled, fontWeight: 400, marginLeft: '6px' }}>
                          ({finalBerasKg} Kg)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                <button onClick={handleSave} disabled={saving}
                  style={{ ...shared.saveBtn, ...(saving ? shared.btnDisabled : {}) }}>
                  {saving ? 'Menyimpan...' : '✓ Simpan Transaksi'}
                </button>
              </div>
            </div>
          )}

          {stepError && <div style={shared.errorBox}>⚠ {stepError}</div>}

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
            jenisZakat: 'Zakat Fitrah',
            metode,
            jumlahUang: metode === 'Beras' ? 0 : finalUang,
            jumlahBeras: metode === 'Beras' ? finalBerasKg : 0,
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
  formWrap:  { display: 'flex', flexDirection: 'column', gap: '16px' },
  cardHeader: {},
  cardTitle: { fontWeight: 700, color: colors.text, marginBottom: '4px' },
  cardSub:   { fontSize: font.base, color: colors.textDisabled, marginBottom: '20px' },
}
