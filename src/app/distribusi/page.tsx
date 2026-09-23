'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useIsMobile } from '@/hooks/useIsMobile'
import Sidebar from '@/components/Sidebar'
import { shared } from '@/styles/shared'
import { colors, font, radius } from '@/styles/tokens'
import { hitungOrangMustahik, type Sesi } from './_lib'
import WizardZakatMal from './WizardZakatMal'
import WizardZakatFitrah from './WizardZakatFitrah'
import RiwayatSesiList from './RiwayatSesiList'

export default function DistribusiPage() {
  const supabase = createClient()
  const isMobile = useIsMobile()

  const [tab, setTab] = useState<'mal' | 'fitrah'>('mal')
  const [successMsg, setSuccessMsg] = useState('')

  const [saldoMal, setSaldoMal] = useState({ terkumpul: 0, tersalur: 0, sisa: 0 })
  const [loadingSaldoMal, setLoadingSaldoMal] = useState(true)

  const [saldoFitrah, setSaldoFitrah] = useState({ sisaUang: 0, sisaBeras: 0, totalJiwa: 0 })
  const [loadingSaldoFitrah, setLoadingSaldoFitrah] = useState(true)

  const [sesiList, setSesiList] = useState<Sesi[]>([])
  const [loadingSesi, setLoadingSesi] = useState(true)

  async function fetchSaldoMal() {
    setLoadingSaldoMal(true)
    const { data: kategori } = await supabase
      .from('kategori_zakat').select('id').eq('nama_kategori', 'Zakat Mal').single()

    const { data: terkumpulRows } = kategori?.id
      ? await supabase.from('transaksi').select('jumlah_uang').eq('kategori_id', kategori.id)
      : { data: [] }
    const terkumpul = (terkumpulRows ?? []).reduce((a, b) => a + Number(b.jumlah_uang), 0)

    const { data: sesiRows } = await supabase
      .from('sesi_distribusi').select('total_uang').eq('jenis', 'Zakat Mal')
    const tersalur = (sesiRows ?? []).reduce((a, b) => a + Number(b.total_uang), 0)

    const result = { terkumpul, tersalur, sisa: Math.max(0, terkumpul - tersalur) }
    setSaldoMal(result)
    setLoadingSaldoMal(false)
    return result
  }

  async function fetchSaldoFitrah() {
    setLoadingSaldoFitrah(true)
    const { data: kategoriRows } = await supabase
      .from('kategori_zakat').select('id').in('nama_kategori', ['Zakat Fitrah - Uang', 'Zakat Fitrah - Beras'])
    const kategoriIds = (kategoriRows ?? []).map(k => k.id)

    const { data: terkumpulRows } = kategoriIds.length
      ? await supabase.from('transaksi').select('jumlah_uang, jumlah_beras').in('kategori_id', kategoriIds)
      : { data: [] }
    const uangTerkumpul = (terkumpulRows ?? []).reduce((a, b) => a + Number(b.jumlah_uang), 0)
    const berasTerkumpul = (terkumpulRows ?? []).reduce((a, b) => a + Number(b.jumlah_beras), 0)

    const { data: sesiRows } = await supabase
      .from('sesi_distribusi').select('total_uang, total_beras').eq('jenis', 'Zakat Fitrah')
    const uangTersalur = (sesiRows ?? []).reduce((a, b) => a + Number(b.total_uang), 0)
    const berasTersalur = (sesiRows ?? []).reduce((a, b) => a + Number(b.total_beras), 0)

    const { totalJiwa } = await hitungOrangMustahik(supabase)

    const result = {
      sisaUang: Math.max(0, uangTerkumpul - uangTersalur),
      sisaBeras: Math.max(0, berasTerkumpul - berasTersalur),
      totalJiwa,
    }
    setSaldoFitrah(result)
    setLoadingSaldoFitrah(false)
    return result
  }

  async function fetchSesiList() {
    setLoadingSesi(true)
    const { data } = await supabase
      .from('sesi_distribusi').select('*').order('tanggal', { ascending: false }).limit(50)
    setSesiList(data ?? [])
    setLoadingSesi(false)
  }

  async function fetchAll() {
    await Promise.all([fetchSaldoMal(), fetchSaldoFitrah(), fetchSesiList()])
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch awal saat mount, disengaja
  useEffect(() => { fetchAll() }, [])

  return (
    <div style={shared.shell}>
      <Sidebar />
      <main style={{
        ...shared.main,
        marginLeft: isMobile ? 0 : '220px',
        padding: isMobile ? '64px 16px 20px' : '32px 36px',
      }}>

        {/* Header */}
        <div style={{ ...shared.pageHeader, marginBottom: '24px', paddingBottom: '24px' }}>
          <div>
            <h1 style={{ ...shared.headerTitle, fontSize: isMobile ? font.h2 : font.h1 }}>Distribusi Zakat</h1>
            <p style={shared.headerSub}>Buat sesi penyaluran zakat ke mustahik</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={s.tabRow}>
          <button onClick={() => setTab('mal')} style={{ ...s.tabBtn, ...(tab === 'mal' ? s.tabBtnActive : {}) }}>
            Zakat Mal
          </button>
          <button onClick={() => setTab('fitrah')} style={{ ...s.tabBtn, ...(tab === 'fitrah' ? s.tabBtnActive : {}) }}>
            Zakat Fitrah
          </button>
        </div>

        {successMsg && <div style={{ ...shared.successBox, marginBottom: '16px' }}>✓ {successMsg}</div>}

        {tab === 'mal' ? (
          <WizardZakatMal
            isMobile={isMobile}
            supabase={supabase}
            saldoMal={saldoMal}
            loadingSaldoMal={loadingSaldoMal}
            fetchSaldoMal={fetchSaldoMal}
            fetchSesiList={fetchSesiList}
            setSuccessMsg={setSuccessMsg}
          />
        ) : (
          <WizardZakatFitrah
            isMobile={isMobile}
            supabase={supabase}
            saldoFitrah={saldoFitrah}
            loadingSaldoFitrah={loadingSaldoFitrah}
            fetchSaldoFitrah={fetchSaldoFitrah}
            fetchSesiList={fetchSesiList}
            setSuccessMsg={setSuccessMsg}
          />
        )}

        <RiwayatSesiList isMobile={isMobile} supabase={supabase} sesiList={sesiList} loadingSesi={loadingSesi} />
      </main>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  tabRow: { display: 'flex', gap: '8px', marginBottom: '20px' },
  tabBtn: {
    padding: '10px 20px', fontSize: font.base, fontWeight: 600, color: colors.textMuted,
    background: colors.surface, border: `1.5px solid ${colors.border}`, borderRadius: radius.md,
    cursor: 'pointer', fontFamily: font.family,
  },
  tabBtnActive: { background: colors.primaryLight, color: colors.primaryDark, border: `1.5px solid ${colors.primary}` },
}
