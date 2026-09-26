'use client'

import React, { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { shared } from '@/styles/shared'
import { colors, font, radius } from '@/styles/tokens'
import { bagiHabis, formatRupiah, hitungOrangMustahik, kgKeSatuan, satuanKeKg, labelSatuanBeras, type SatuanBeras, type SesiRow } from './_lib'
import SebaranTable from './SebaranTable'

interface SaldoFitrah { sisaUang: number; sisaBeras: number; totalJiwa: number }

type ModeFitrah = 'campuran' | 'beras' | 'uang'

const MODE_LABEL: Record<ModeFitrah, string> = {
  campuran: 'Campuran',
  beras: 'Beras saja',
  uang: 'Uang saja',
}

export default function WizardZakatFitrah({
  isMobile, supabase, saldoFitrah, loadingSaldoFitrah, fetchSaldoFitrah, fetchSesiList, setSuccessMsg, satuanBeras,
}: {
  isMobile: boolean
  supabase: ReturnType<typeof createClient>
  saldoFitrah: SaldoFitrah
  loadingSaldoFitrah: boolean
  fetchSaldoFitrah: () => Promise<SaldoFitrah>
  fetchSesiList: () => Promise<void>
  setSuccessMsg: (msg: string) => void
  satuanBeras: SatuanBeras
}) {
  const [fitrahStep, setFitrahStep] = useState<'input' | 'review'>('input')
  const [fitrahMode, setFitrahMode] = useState<ModeFitrah>('campuran')
  const [fitrahRows, setFitrahRows] = useState<SesiRow[]>([])
  const [fitrahError, setFitrahError] = useState('')
  const [fitrahLoadingHitung, setFitrahLoadingHitung] = useState(false)
  const [fitrahSubmitting, setFitrahSubmitting] = useState(false)

  const bagiUang = fitrahMode === 'campuran' || fitrahMode === 'uang'
  const bagiBeras = fitrahMode === 'campuran' || fitrahMode === 'beras'
  // jumlah_beras di dalam fitrahRows disimpan dalam SATUAN LEMBAGA (kg/liter),
  // bukan kg — supaya input di tabel bisa langsung diedit tanpa konversi bolak-balik
  // tiap ketikan. Konversi ke kg cuma dilakukan sekali saat konfirmasi (disimpan ke DB).
  const labelSatuan = labelSatuanBeras(satuanBeras)

  async function handleHitungFitrah() {
    setFitrahLoadingHitung(true)
    setFitrahError('')

    const fresh = await fetchSaldoFitrah()
    // Cek pot yang relevan dengan mode terpilih saja.
    if (bagiUang && !bagiBeras && fresh.sisaUang <= 0) {
      setFitrahLoadingHitung(false)
      setFitrahError('Tidak ada sisa uang untuk dibagikan.')
      return
    }
    if (bagiBeras && !bagiUang && fresh.sisaBeras <= 0) {
      setFitrahLoadingHitung(false)
      setFitrahError('Tidak ada sisa beras untuk dibagikan.')
      return
    }
    if (bagiUang && bagiBeras && fresh.sisaUang <= 0 && fresh.sisaBeras <= 0) {
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
    // sisaBeras dari saldo itu kg; ubah ke satuan lembaga dulu sebelum dibagi per jiwa.
    const sisaBerasSatuan = kgKeSatuan(fresh.sisaBeras, satuanBeras)

    // Bagi rata dulu (floor), sisa recehan yang gak abis dibagi rata dilempar
    // +1 satuan terkecil (Rp1 / 0,01) secara acak ke sebagian orang -- supaya
    // total tersalur PERSIS sama dengan sisa yang tersedia, gak ada recehan
    // yang nyangkut di saldo.
    const uangList = bagiUang ? bagiHabis(fresh.sisaUang, fresh.totalJiwa, 1) : new Array(fresh.totalJiwa).fill(0)
    const berasList = bagiBeras ? bagiHabis(sisaBerasSatuan, fresh.totalJiwa, 0.01) : new Array(fresh.totalJiwa).fill(0)

    const rows: SesiRow[] = people.map((p, i) => ({
      key: p.anggota_id ? `${p.mustahik_id}-a${p.anggota_id}` : `${p.mustahik_id}`,
      mustahik_id: p.mustahik_id, anggota_id: p.anggota_id,
      namaKeluarga: p.namaKeluarga, nama: p.nama, peran: p.peran,
      jumlah_uang: uangList[i],
      jumlah_beras: berasList[i],
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

    // Konversi beras dari satuan lembaga (nilai di tabel) -> kg untuk disimpan ke DB.
    // total_beras dijumlah dari item kg supaya header persis sama dengan sum item.
    const itemsKg = toSubmit.map(r => ({
      mustahik_id: r.mustahik_id, anggota_id: r.anggota_id,
      jumlah_uang: r.jumlah_uang,
      jumlah_beras: satuanKeKg(r.jumlah_beras, satuanBeras),
    }))
    const totalUang = itemsKg.reduce((a, r) => a + r.jumlah_uang, 0)
    const totalBerasKg = itemsKg.reduce((a, r) => a + r.jumlah_beras, 0)

    setFitrahSubmitting(true)
    setFitrahError('')

    const freshSaldo = await fetchSaldoFitrah()
    // Cek saldo dalam kg (saldo & storage semua kg). Toleransi kecil untuk noise
    // floating-point (0,5 rupiah & 1 gram) — supaya penjumlahan desimal yang secara
    // matematis pas tidak ditolak gara-gara pembulatan biner.
    if (totalUang > freshSaldo.sisaUang + 0.5 || totalBerasKg > freshSaldo.sisaBeras + 0.001) {
      setFitrahSubmitting(false)
      setFitrahError('Total sesi melebihi sisa yang tersedia saat ini — silakan hitung ulang.')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profil } = await supabase.from('profil_amil').select('lembaga_id').eq('id', user!.id).single()

    const { error: err } = await supabase.rpc('create_sesi_distribusi', {
      p_jenis: 'Zakat Fitrah',
      p_total_uang: totalUang,
      p_total_beras: totalBerasKg,
      p_lembaga_id: profil?.lembaga_id ?? null,
      p_amil_pencatat: user?.user_metadata?.nama ?? user?.email ?? null,
      p_items: itemsKg,
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
            ? 'Pilih apa yang mau dibagikan sesi ini, lalu hitung sebaran per jiwa'
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
            {loadingSaldoFitrah ? <div style={shared.spinner} /> : <p style={s.saldoValue}>{kgKeSatuan(saldoFitrah.sisaBeras, satuanBeras).toFixed(2)} {labelSatuan}</p>}
          </div>
          <div style={s.saldoBox}>
            <p style={s.saldoLabel}>Total Jiwa Mustahik</p>
            {loadingSaldoFitrah ? <div style={shared.spinner} /> : <p style={s.saldoValue}>{saldoFitrah.totalJiwa}</p>}
          </div>
        </div>

        {fitrahStep === 'input' ? (
          <>
            <div style={shared.field}>
              <label style={shared.label}>Jenis Pembagian</label>
              <div style={s.modeRow}>
                {(['campuran', 'beras', 'uang'] as ModeFitrah[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setFitrahMode(m)}
                    style={{ ...s.modeBtn, ...(fitrahMode === m ? s.modeBtnActive : {}) }}
                  >
                    {MODE_LABEL[m]}
                  </button>
                ))}
              </div>
              <p style={shared.fieldHint}>
                {fitrahMode === 'campuran' && 'Sisa uang dan beras dibagi rata ke tiap jiwa (campuran).'}
                {fitrahMode === 'beras' && 'Hanya sisa beras yang dibagi. Sisa uang tetap utuh untuk sesi lain.'}
                {fitrahMode === 'uang' && 'Hanya sisa uang yang dibagi. Sisa beras tetap utuh untuk sesi lain.'}
              </p>
            </div>

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
              showBeras={bagiBeras}
              showUang={bagiUang}
              labelBeras={labelSatuan}
            />

            <div style={s.totalRow}>
              <span style={s.totalLabel}>Total Sesi</span>
              <span style={s.totalValue}>
                {[
                  bagiUang ? formatRupiah(fitrahRows.reduce((a, r) => a + r.jumlah_uang, 0)) : null,
                  bagiBeras ? `${fitrahRows.reduce((a, r) => a + r.jumlah_beras, 0).toFixed(2)} ${labelSatuan}` : null,
                ].filter(Boolean).join(' + ')}
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
  modeRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  modeBtn: {
    flex: 1, minWidth: '96px', padding: '10px 14px', fontSize: font.base, fontWeight: 600,
    color: colors.textMuted, background: colors.surface, border: `1.5px solid ${colors.border}`,
    borderRadius: radius.md, cursor: 'pointer', fontFamily: font.family,
  },
  modeBtnActive: { background: colors.primaryLight, color: colors.primaryDark, border: `1.5px solid ${colors.primary}` },
  saldoBox: { background: colors.primaryLight, borderRadius: radius.md, border: `1.5px solid ${colors.primary}`, padding: '14px 16px', marginBottom: '18px' },
  saldoBoxGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' },
  saldoLabel: { fontSize: '11px', fontWeight: 700, color: colors.primaryDark, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '4px' },
  saldoValue: { fontSize: font.xl, fontWeight: 700, color: colors.primary },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: colors.surfaceAlt, borderRadius: radius.sm, marginTop: '12px' },
  totalLabel: { fontSize: font.base, fontWeight: 600, color: colors.textMuted },
  totalValue: { fontSize: font.md, fontWeight: 700, color: colors.primary },
}
