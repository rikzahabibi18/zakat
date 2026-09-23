'use client'

import React, { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { shared } from '@/styles/shared'
import { colors, font, radius } from '@/styles/tokens'
import { formatInput, formatRupiah, hitungOrangMustahik, parseInput, type SesiRow } from './_lib'
import SebaranTable from './SebaranTable'

interface SaldoMal { terkumpul: number; tersalur: number; sisa: number }

export default function WizardZakatMal({
  isMobile, supabase, saldoMal, loadingSaldoMal, fetchSaldoMal, fetchSesiList, setSuccessMsg,
}: {
  isMobile: boolean
  supabase: ReturnType<typeof createClient>
  saldoMal: SaldoMal
  loadingSaldoMal: boolean
  fetchSaldoMal: () => Promise<SaldoMal>
  fetchSesiList: () => Promise<void>
  setSuccessMsg: (msg: string) => void
}) {
  const [malStep, setMalStep] = useState<'input' | 'review'>('input')
  const [malNominalInput, setMalNominalInput] = useState('')
  const [malRows, setMalRows] = useState<SesiRow[]>([])
  const [malError, setMalError] = useState('')
  const [malLoadingHitung, setMalLoadingHitung] = useState(false)
  const [malSubmitting, setMalSubmitting] = useState(false)

  async function handleHitungMal() {
    const nominal = parseInput(malNominalInput)
    if (nominal <= 0) { setMalError('Masukkan nominal.'); return }

    setMalLoadingHitung(true)
    setMalError('')

    const fresh = await fetchSaldoMal()
    if (nominal > fresh.sisa) {
      setMalLoadingHitung(false)
      setMalError(`Nominal melebihi saldo tersedia (${formatRupiah(fresh.sisa)}).`)
      return
    }

    const { people, totalJiwa } = await hitungOrangMustahik(supabase)
    if (totalJiwa === 0) {
      setMalLoadingHitung(false)
      setMalError('Belum ada mustahik terdaftar.')
      return
    }

    const jatahPerJiwa = nominal / totalJiwa
    const rows: SesiRow[] = people.map(p => ({
      key: p.anggota_id ? `${p.mustahik_id}-a${p.anggota_id}` : `${p.mustahik_id}`,
      mustahik_id: p.mustahik_id, anggota_id: p.anggota_id,
      namaKeluarga: p.namaKeluarga, nama: p.nama, peran: p.peran,
      jumlah_uang: Math.round(jatahPerJiwa),
      jumlah_beras: 0,
    }))

    setMalRows(rows)
    setMalLoadingHitung(false)
    setMalStep('review')
  }

  function handleMalRowChange(key: string, value: number) {
    setMalRows(rows => rows.map(r => r.key === key ? { ...r, jumlah_uang: value } : r))
  }

  async function handleConfirmMal() {
    const toSubmit = malRows.filter(r => r.jumlah_uang > 0)
    if (toSubmit.length === 0) { setMalError('Tidak ada nominal untuk dibagikan.'); return }
    const totalUang = toSubmit.reduce((a, r) => a + r.jumlah_uang, 0)

    setMalSubmitting(true)
    setMalError('')

    // Cek ulang saldo live tepat sebelum dikunci — bukan angka pas awal hitung sebaran.
    const freshSaldo = await fetchSaldoMal()
    if (totalUang > freshSaldo.sisa) {
      setMalSubmitting(false)
      setMalError(`Total sesi (${formatRupiah(totalUang)}) melebihi saldo tersedia saat ini (${formatRupiah(freshSaldo.sisa)}).`)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profil } = await supabase.from('profil_amil').select('lembaga_id').eq('id', user!.id).single()

    const { error: err } = await supabase.rpc('create_sesi_distribusi', {
      p_jenis: 'Zakat Mal',
      p_total_uang: totalUang,
      p_total_beras: 0,
      p_lembaga_id: profil?.lembaga_id ?? null,
      p_amil_pencatat: user?.user_metadata?.nama ?? user?.email ?? null,
      p_items: toSubmit.map(r => ({ mustahik_id: r.mustahik_id, anggota_id: r.anggota_id, jumlah_uang: r.jumlah_uang, jumlah_beras: 0 })),
    })

    setMalSubmitting(false)
    if (err) { setMalError('Gagal mengunci sesi. Coba lagi.'); return }

    setSuccessMsg(`Sesi Zakat Mal terkunci — ${formatRupiah(totalUang)} tersalur ke ${toSubmit.length} jiwa.`)
    setMalStep('input')
    setMalNominalInput('')
    setMalRows([])
    fetchSaldoMal()
    fetchSesiList()
  }

  return (
    <div style={shared.card}>
      <div style={{ ...shared.cardHeader, padding: isMobile ? '16px 16px 0' : '20px 24px 0' }}>
        <h2 style={{ ...shared.cardTitle, fontSize: font.lg }}>Sesi Zakat Mal</h2>
        <p style={s.cardSub}>
          {malStep === 'input'
            ? 'Tentukan total nominal yang mau dibagikan sesi ini'
            : 'Sebaran per mustahik — bisa diedit sebelum dikunci'}
        </p>
      </div>
      <div style={{ ...shared.cardBody, padding: isMobile ? '0 16px 16px' : '0 24px 24px' }}>

        <div style={s.saldoBox}>
          <p style={s.saldoLabel}>Saldo Zakat Mal Tersedia</p>
          {loadingSaldoMal ? <div style={shared.spinner} /> : (
            <>
              <p style={s.saldoValue}>{formatRupiah(saldoMal.sisa)}</p>
              <p style={s.saldoHint}>Terkumpul {formatRupiah(saldoMal.terkumpul)} · Tersalur {formatRupiah(saldoMal.tersalur)}</p>
            </>
          )}
        </div>

        {malStep === 'input' ? (
          <>
            <div style={shared.field}>
              <label style={shared.label}>Nominal Sesi Ini (Rp)</label>
              <div style={shared.inputWrap}>
                <span style={shared.prefix}>Rp</span>
                <input
                  type="text" inputMode="numeric" placeholder="0"
                  value={malNominalInput}
                  onChange={e => setMalNominalInput(formatInput(e.target.value))}
                  style={{ ...shared.input, paddingLeft: '44px' }}
                />
              </div>
              <p style={shared.fieldHint}>Akan dibagi otomatis per jiwa (kepala keluarga + anggota keluarga) ke semua mustahik.</p>
            </div>

            {malError && <div style={shared.errorBox}>⚠ {malError}</div>}

            <button
              onClick={handleHitungMal}
              disabled={malLoadingHitung}
              style={{ ...shared.btnPrimary, ...(malLoadingHitung ? shared.btnDisabled : {}) }}
            >
              {malLoadingHitung ? 'Menghitung...' : 'Hitung Sebaran →'}
            </button>
          </>
        ) : (
          <>
            <SebaranTable
              rows={malRows}
              isMobile={isMobile}
              onChangeUang={handleMalRowChange}
              showBeras={false}
            />

            <div style={s.totalRow}>
              <span style={s.totalLabel}>Total Sesi</span>
              <span style={s.totalValue}>{formatRupiah(malRows.reduce((a, r) => a + r.jumlah_uang, 0))}</span>
            </div>

            {malError && <div style={{ ...shared.errorBox, marginTop: '12px' }}>⚠ {malError}</div>}

            <div style={{ ...shared.navRow, marginTop: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
              <button
                onClick={() => { setMalStep('input'); setMalRows([]); setMalError('') }}
                style={{ ...shared.navBackBtn, width: isMobile ? '100%' : 'auto' }}
              >
                ← Kembali
              </button>
              <button
                onClick={handleConfirmMal}
                disabled={malSubmitting}
                style={{ ...shared.navNextBtn, ...(malSubmitting ? shared.btnDisabled : {}) }}
              >
                {malSubmitting ? 'Mengunci...' : '✓ Konfirmasi & Kunci'}
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
  saldoLabel: { fontSize: '11px', fontWeight: 700, color: colors.primaryDark, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '4px' },
  saldoValue: { fontSize: font.xl, fontWeight: 700, color: colors.primary },
  saldoHint: { fontSize: font.xs, color: colors.textSubtle, marginTop: '4px' },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: colors.surfaceAlt, borderRadius: radius.sm, marginTop: '12px' },
  totalLabel: { fontSize: font.base, fontWeight: 600, color: colors.textMuted },
  totalValue: { fontSize: font.md, fontWeight: 700, color: colors.primary },
}
