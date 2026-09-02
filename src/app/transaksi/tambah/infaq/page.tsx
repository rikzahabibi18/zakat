'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/components/Sidebar'
import QRConfirmModal from '@/components/QRConfirmModal'
import StrukModal from '@/components/StrukModal'
import { shared } from '@/styles/shared'
import { colors, font } from '@/styles/tokens'

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

function InfaqForm() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()
  const isMobile = useIsMobile()

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
  }

  const cardPad = isMobile ? '16px 16px 0' : '20px 24px 0'
  const bodyPad = isMobile ? '0 16px 16px' : '0 24px 24px'

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
              Infaq / Sedekah
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
            {step === 'nominal' ? 'Nominal' : step === 'metode' ? 'Metode' : 'Konfirmasi'}
          </span>
        </div>

        <div style={{ ...s.formWrap, maxWidth: isMobile ? '100%' : '560px' }}>

          {/* ── Step: Nominal ── */}
          {step === 'nominal' && (
            <div style={shared.cardOverflow}>
              <div style={{ ...s.cardHeader, padding: cardPad }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : font.h3 }}>Nominal Infaq</h2>
                <p style={s.cardSub}>Masukkan jumlah infaq yang akan dicatat</p>
              </div>
              <div style={{ ...shared.cardBody, padding: bodyPad }}>
                <div style={shared.field}>
                  <label style={shared.label}>Jumlah Infaq (Rp)</label>
                  <div style={shared.inputWrap}>
                    <span style={shared.prefix}>Rp</span>
                    <input
                      type="text" inputMode="numeric" placeholder="0"
                      value={nominal}
                      onChange={e => setNominal(formatInput(e.target.value))}
                      style={{ ...shared.input, paddingLeft: '44px', fontSize: isMobile ? font.xl : font.md }}
                      autoFocus={!isMobile}
                    />
                  </div>
                </div>
                {nominal && nominalNum > 0 && (
                  <div style={{ ...s.previewBox, padding: isMobile ? '14px' : '16px' }}>
                    <p style={s.previewLabel}>Nominal yang akan dicatat</p>
                    <p style={{ ...s.previewValue, fontSize: isMobile ? '19px' : '22px' }}>
                      {formatRupiah(nominalNum)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step: Metode ── */}
          {step === 'metode' && (
            <div style={shared.cardOverflow}>
              <div style={{ ...s.cardHeader, padding: cardPad }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : font.h3 }}>Metode Pembayaran</h2>
                <p style={s.cardSub}>Infaq: {formatRupiah(nominalNum)}</p>
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
                    <span style={{ ...shared.metodeLabel, fontSize: isMobile ? '13.5px' : font.md }}>
                      {m}
                    </span>
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
                    { label: 'Muzakki', value: muzakkiNama },
                    { label: 'Jenis',   value: 'Infaq / Sedekah' },
                    { label: 'Metode',  value: `${METODE_ICON[metode]} ${metode}` },
                  ].map(r => (
                    <div key={r.label} style={shared.konfRow}>
                      <span style={shared.konfLabel}>{r.label}</span>
                      <span style={shared.konfValue}>{r.value}</span>
                    </div>
                  ))}
                  <div style={{ ...shared.konfRow, borderBottom: 'none' }}>
                    <span style={shared.konfLabel}>Nominal</span>
                    <span style={{ ...shared.konfValue, color: colors.primary, fontSize: isMobile ? font.xl : '18px' }}>
                      {formatRupiah(nominalNum)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ ...shared.saveBtn, ...(saving ? shared.btnDisabled : {}) }}
                >
                  {saving ? 'Menyimpan...' : '✓ Simpan Transaksi'}
                </button>
              </div>
            </div>
          )}

          {stepError && <div style={shared.errorBox}>⚠ {stepError}</div>}

          {step !== 'konfirmasi' && (
            <div style={{ ...shared.navRow, flexDirection: isMobile ? 'column' : 'row' }}>
              <button
                onClick={handleBack}
                style={{ ...shared.navBackBtn, width: isMobile ? '100%' : 'auto' }}
              >
                ← Kembali
              </button>
              <button onClick={handleNext} style={shared.navNextBtn}>
                {step === 'metode' ? 'Lihat Ringkasan →' : 'Lanjut →'}
              </button>
            </div>
          )}
          {step === 'konfirmasi' && (
            <button
              onClick={handleBack}
              style={{ ...shared.navBackBtn, width: isMobile ? '100%' : 'auto' }}
            >
              ← Kembali
            </button>
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
            jenisZakat: 'Infaq / Sedekah',
            metode,
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
    <Suspense fallback={<div style={{ padding: '24px' }}>Loading...</div>}>
      <InfaqForm />
    </Suspense>
  )
}

// ── Hanya style yang UNIK untuk halaman infaq ──────────────
const s: Record<string, React.CSSProperties> = {
  formWrap:  { display: 'flex', flexDirection: 'column', gap: '16px' },
  cardHeader: {},
  cardTitle: { fontWeight: 700, color: '#1C1917', marginBottom: '4px' },
  cardSub:   { fontSize: font.base, color: '#A8A29E', marginBottom: '20px' },
  previewBox: {
    background: colors.primaryLight,
    borderRadius: '10px',
    border: `1.5px solid ${colors.primary}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  previewLabel: { fontSize: font.sm,  fontWeight: 600, color: colors.textSubtle },
  previewValue: { fontWeight: 700, color: colors.primary },
}
