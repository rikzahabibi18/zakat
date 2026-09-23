'use client'

import React, { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { shared } from '@/styles/shared'
import { colors, font, radius } from '@/styles/tokens'
import { formatRupiah, hitungOrangMustahik, type SesiRow } from './_lib'
import SebaranTable from './SebaranTable'

interface SaldoFitrah { sisaUang: number; sisaBeras: number; totalJiwa: number }

export default function WizardZakatFitrah({
  isMobile, supabase, saldoFitrah, loadingSaldoFitrah, fetchSaldoFitrah, fetchSesiList, setSuccessMsg,
}: {
  isMobile: boolean
  supabase: ReturnType<typeof createClient>
  saldoFitrah: SaldoFitrah
  loadingSaldoFitrah: boolean
  fetchSaldoFitrah: () => Promise<SaldoFitrah>
  fetchSesiList: () => Promise<void>
  setSuccessMsg: (msg: string) => void
}) {
  const [fitrahStep, setFitrahStep] = useState<'input' | 'review'>('input')
  const [fitrahRows, setFitrahRows] = useState<SesiRow[]>([])
  const [fitrahError, setFitrahError] = useState('')
  const [fitrahLoadingHitung, setFitrahLoadingHitung] = useState(false)
  const [fitrahSubmitting, setFitrahSubmitting] = useState(false)

  async function handleHitungFitrah() {
    setFitrahLoadingHitung(true)
    setFitrahError('')

    const fresh = await fetchSaldoFitrah()
    if (fresh.sisaUang <= 0 && fresh.sisaBeras <= 0) {
      setFitrahLoadingHitung(false)
      setFitrahError('Tidak ada sisa Zakat Fitrah untuk dibagikan.')
      return
    }
    if (fresh.totalJiwa === 0) {
      setFitrahLoadingHitung(false)
      setFitrahError('Belum ada mustahik terdaftar.')
      return
    }

    const { people } = await hitungOrangMustahik(supabase)
    const jatahUangPerJiwa = fresh.sisaUang / fresh.totalJiwa
    const jatahBerasPerJiwa = fresh.sisaBeras / fresh.totalJiwa

    const rows: SesiRow[] = people.map(p => ({
      key: p.anggota_id ? `${p.mustahik_id}-a${p.anggota_id}` : `${p.mustahik_id}`,
      mustahik_id: p.mustahik_id, anggota_id: p.anggota_id,
      namaKeluarga: p.namaKeluarga, nama: p.nama, peran: p.peran,
      jumlah_uang: Math.round(jatahUangPerJiwa),
      jumlah_beras: Math.round(jatahBerasPerJiwa * 100) / 100,
    }))

    setFitrahRows(rows)
    setFitrahLoadingHitung(false)
    setFitrahStep('review')
  }

  function handleFitrahRowChange(key: string, field: 'jumlah_uang' | 'jumlah_beras', value: number) {
    setFitrahRows(rows => rows.map(r => r.key === key ? { ...r, [field]: value } : r))
  }

  async function handleConfirmFitrah() {
    const toSubmit = fitrahRows.filter(r => r.jumlah_uang > 0 || r.jumlah_beras > 0)
    if (toSubmit.length === 0) { setFitrahError('Tidak ada nominal untuk dibagikan.'); return }
    const totalUang = toSubmit.reduce((a, r) => a + r.jumlah_uang, 0)
    const totalBeras = toSubmit.reduce((a, r) => a + r.jumlah_beras, 0)

    setFitrahSubmitting(true)
    setFitrahError('')

    const freshSaldo = await fetchSaldoFitrah()
    if (totalUang > freshSaldo.sisaUang || totalBeras > freshSaldo.sisaBeras) {
      setFitrahSubmitting(false)
      setFitrahError('Total sesi melebihi sisa yang tersedia saat ini — silakan hitung ulang.')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profil } = await supabase.from('profil_amil').select('lembaga_id').eq('id', user!.id).single()

    const { error: err } = await supabase.rpc('create_sesi_distribusi', {
      p_jenis: 'Zakat Fitrah',
      p_total_uang: totalUang,
      p_total_beras: totalBeras,
      p_lembaga_id: profil?.lembaga_id ?? null,
      p_amil_pencatat: user?.user_metadata?.nama ?? user?.email ?? null,
      p_items: toSubmit.map(r => ({ mustahik_id: r.mustahik_id, anggota_id: r.anggota_id, jumlah_uang: r.jumlah_uang, jumlah_beras: r.jumlah_beras })),
    })

    setFitrahSubmitting(false)
    if (err) { setFitrahError('Gagal mengunci sesi. Coba lagi.'); return }

    setSuccessMsg(`Sesi Zakat Fitrah terkunci — tersalur ke ${toSubmit.length} jiwa.`)
    setFitrahStep('input')
    setFitrahRows([])
    fetchSaldoFitrah()
    fetchSesiList()
  }

  return (
    <div style={shared.card}>
      <div style={{ ...shared.cardHeader, padding: isMobile ? '16px 16px 0' : '20px 24px 0' }}>
        <h2 style={{ ...shared.cardTitle, fontSize: font.lg }}>Sesi Zakat Fitrah</h2>
        <p style={s.cardSub}>
          {fitrahStep === 'input'
            ? 'Seluruh sisa uang & beras akan dibagi sesi ini'
            : 'Sebaran per mustahik — bisa diedit sebelum dikunci'}
        </p>
      </div>
      <div style={{ ...shared.cardBody, padding: isMobile ? '0 16px 16px' : '0 24px 24px' }}>

        <div style={s.saldoBoxGrid}>
          <div style={s.saldoBox}>
            <p style={s.saldoLabel}>Sisa Uang</p>
            {loadingSaldoFitrah ? <div style={shared.spinner} /> : <p style={s.saldoValue}>{formatRupiah(saldoFitrah.sisaUang)}</p>}
          </div>
          <div style={s.saldoBox}>
            <p style={s.saldoLabel}>Sisa Beras</p>
            {loadingSaldoFitrah ? <div style={shared.spinner} /> : <p style={s.saldoValue}>{saldoFitrah.sisaBeras.toFixed(2)} Kg</p>}
          </div>
          <div style={s.saldoBox}>
            <p style={s.saldoLabel}>Total Jiwa Mustahik</p>
            {loadingSaldoFitrah ? <div style={shared.spinner} /> : <p style={s.saldoValue}>{saldoFitrah.totalJiwa}</p>}
          </div>
        </div>

        {fitrahStep === 'input' ? (
          <>
            {fitrahError && <div style={shared.errorBox}>⚠ {fitrahError}</div>}
            <button
              onClick={handleHitungFitrah}
              disabled={fitrahLoadingHitung}
              style={{ ...shared.btnPrimary, ...(fitrahLoadingHitung ? shared.btnDisabled : {}) }}
            >
              {fitrahLoadingHitung ? 'Menghitung...' : 'Hitung Sebaran →'}
            </button>
          </>
        ) : (
          <>
            <SebaranTable
              rows={fitrahRows}
              isMobile={isMobile}
              onChangeUang={(id, v) => handleFitrahRowChange(id, 'jumlah_uang', v)}
              onChangeBeras={(id, v) => handleFitrahRowChange(id, 'jumlah_beras', v)}
              showBeras
            />

            <div style={s.totalRow}>
              <span style={s.totalLabel}>Total Sesi</span>
              <span style={s.totalValue}>
                {formatRupiah(fitrahRows.reduce((a, r) => a + r.jumlah_uang, 0))} + {fitrahRows.reduce((a, r) => a + r.jumlah_beras, 0).toFixed(2)} Kg
              </span>
            </div>

            {fitrahError && <div style={{ ...shared.errorBox, marginTop: '12px' }}>⚠ {fitrahError}</div>}

            <div style={{ ...shared.navRow, marginTop: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
              <button
                onClick={() => { setFitrahStep('input'); setFitrahRows([]); setFitrahError('') }}
                style={{ ...shared.navBackBtn, width: isMobile ? '100%' : 'auto' }}
              >
                ← Kembali
              </button>
              <button
                onClick={handleConfirmFitrah}
                disabled={fitrahSubmitting}
                style={{ ...shared.navNextBtn, ...(fitrahSubmitting ? shared.btnDisabled : {}) }}
              >
                {fitrahSubmitting ? 'Mengunci...' : '✓ Konfirmasi & Kunci'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  cardSub: { fontSize: font.base, color: colors.textDisabled, marginBottom: '20px' },
  saldoBox: { background: colors.primaryLight, borderRadius: radius.md, border: `1.5px solid ${colors.primary}`, padding: '14px 16px', marginBottom: '18px' },
  saldoBoxGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' },
  saldoLabel: { fontSize: '11px', fontWeight: 700, color: colors.primaryDark, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '4px' },
  saldoValue: { fontSize: font.xl, fontWeight: 700, color: colors.primary },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: colors.surfaceAlt, borderRadius: radius.sm, marginTop: '12px' },
  totalLabel: { fontSize: font.base, fontWeight: 600, color: colors.textMuted },
  totalValue: { fontSize: font.md, fontWeight: 700, color: colors.primary },
}
