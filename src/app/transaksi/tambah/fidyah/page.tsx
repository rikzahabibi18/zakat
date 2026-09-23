'use client'

import React, { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useIsMobile } from '@/hooks/useIsMobile'
import Sidebar from '@/components/Sidebar'
import QRConfirmModal from '@/components/QRConfirmModal'
import StrukModal from '@/components/StrukModal'
import { shared } from '@/styles/shared'
import { colors, font } from '@/styles/tokens'

type Metode = 'Tunai' | 'Transfer Bank' | 'QRIS'
type Step = 'kalkulasi' | 'metode' | 'konfirmasi'

const METODE_LIST: Metode[] = ['Tunai', 'Transfer Bank', 'QRIS']
const METODE_ICON: Record<Metode, string> = { Tunai: '💵', 'Transfer Bank': '🏦', QRIS: '📱' }
const FIDYAH_PER_HARI = 65000

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
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

  const cardPad = isMobile ? '16px 16px 0' : '20px 24px 0'
  const bodyPad = isMobile ? '0 16px 16px' : '0 24px 24px'

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
    <div style={shared.shell}>
      <Sidebar />
      <main style={{
        ...shared.main,
        marginLeft: isMobile ? 0 : '220px',
        padding: isMobile ? '84px 16px 24px' : '32px 36px',
      }}>
        <div style={shared.pageHeader}>
          <div>
            <h1 style={{ ...shared.headerTitle, fontSize: isMobile ? font.h2 : font.h1 }}>Fidyah</h1>
            <p style={shared.headerSub}>Muzakki: <strong>{muzakkiNama}</strong></p>
          </div>
        </div>

        <div style={shared.progressWrap}>
          <div style={shared.progressTrack}>
            <div style={{ ...shared.progressFill, width: `${progress}%` }} />
          </div>
          <span style={shared.progressLabel}>
            {step === 'kalkulasi' ? 'Kalkulasi' : step === 'metode' ? 'Metode' : 'Konfirmasi'}
          </span>
        </div>

        <div style={{ ...s.formWrap, maxWidth: isMobile ? '100%' : '560px' }}>

          {/* Kalkulasi */}
          {step === 'kalkulasi' && (
            <div style={shared.card}>
              <div style={{ ...s.cardHeader, padding: cardPad }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : font.h3 }}>Kalkulasi Fidyah</h2>
                <p style={s.cardSub}>Rp 65.000 per hari puasa yang ditinggalkan</p>
              </div>
              <div style={{ ...shared.cardBody, padding: bodyPad }}>
                <div style={{ ...shared.infoBox, padding: isMobile ? '12px' : '14px' }}>
                  <div style={{ ...shared.infoGrid, gap: isMobile ? '10px' : '12px' }}>
                    <div>
                      <p style={shared.infoLabel}>Standar Fidyah / hari</p>
                      <p style={{ ...shared.infoValue, fontSize: isMobile ? '13.5px' : '15px' }}>{formatRupiah(FIDYAH_PER_HARI)}</p>
                    </div>
                    <div>
                      <p style={shared.infoLabel}>Maks. hari Ramadan</p>
                      <p style={{ ...shared.infoValue, fontSize: isMobile ? '13.5px' : '15px' }}>30 hari</p>
                    </div>
                  </div>
                </div>

                <div style={shared.field}>
                  <label style={shared.label}>Jumlah Hari yang Ditinggalkan</label>
                  <input
                    type="number" min="1" max="30" placeholder="1"
                    value={jumlahHari}
                    onChange={e => setJumlahHari(e.target.value)}
                    style={{ ...shared.input, fontSize: isMobile ? font.xl : font.md }}
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
            <div style={shared.card}>
              <div style={{ ...s.cardHeader, padding: cardPad }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : font.h3 }}>Metode Pembayaran</h2>
                <p style={s.cardSub}>{hariNum} hari × Rp 65.000 = <strong>{formatRupiah(totalFidyah)}</strong></p>
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

          {/* Konfirmasi */}
          {step === 'konfirmasi' && metode && (
            <div style={shared.card}>
              <div style={{ ...s.cardHeader, padding: cardPad }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : font.h3 }}>Konfirmasi Transaksi</h2>
                <p style={s.cardSub}>Periksa kembali sebelum menyimpan</p>
              </div>
              <div style={{ ...shared.cardBody, padding: bodyPad }}>
                <div style={shared.konfirmasiList}>
                  {[
                    { label: 'Muzakki',      value: muzakkiNama },
                    { label: 'Jenis',        value: 'Fidyah' },
                    { label: 'Jumlah Hari',  value: `${hariNum} hari` },
                    { label: 'Tarif / Hari', value: formatRupiah(FIDYAH_PER_HARI) },
                    { label: 'Metode',       value: `${METODE_ICON[metode]} ${metode}` },
                  ].map(r => (
                    <div key={r.label} style={shared.konfRow}>
                      <span style={shared.konfLabel}>{r.label}</span>
                      <span style={shared.konfValue}>{r.value}</span>
                    </div>
                  ))}
                  <div style={{ ...shared.konfRow, borderBottom: 'none' }}>
                    <span style={shared.konfLabel}>Total Fidyah</span>
                    <span style={{ ...shared.konfValue, color: colors.primary, fontSize: isMobile ? '16px' : '18px' }}>
                      {formatRupiah(totalFidyah)}
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

// ── Hanya style yang UNIK untuk fidyah ─────────────────
const s: Record<string, React.CSSProperties> = {
  formWrap:   { display: 'flex', flexDirection: 'column', gap: '16px' },
  cardHeader: {},
  cardTitle:  { fontWeight: 700, color: colors.text, marginBottom: '4px' },
  cardSub:    { fontSize: font.base, color: '#A8A29E', marginBottom: '20px' },

  // Hasil box — selalu hijau (beda dari zakat-mal yang warnanya kondisional)
  hasilBox:      { background: colors.primaryLight, borderRadius: '10px', border: `1.5px solid ${colors.primary}`, display: 'flex', flexDirection: 'column', gap: '10px' },
  hasilTitle:    { fontSize: font.base, fontWeight: 700, color: colors.primaryDark },
  hasilRow:      { display: 'flex', justifyContent: 'space-between' },
  hasilRowLabel: { fontSize: font.base, color: colors.textMuted },
  hasilRowValue: { fontWeight: 700, color: colors.primary },
}
