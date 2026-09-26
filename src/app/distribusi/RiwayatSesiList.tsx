'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { createClient } from '@/utils/supabase/client'
import { shared } from '@/styles/shared'
import { colors, font, radius } from '@/styles/tokens'
import { formatRupiah, formatTanggal, type Sesi } from './_lib'

export default function RiwayatSesiList({ isMobile, supabase, sesiList, loadingSesi }: {
  isMobile: boolean
  supabase: ReturnType<typeof createClient>
  sesiList: Sesi[]
  loadingSesi: boolean
}) {
  const router = useRouter()
  const [exportingId, setExportingId] = useState<number | null>(null)

  async function handleExportSesi(sesi: Sesi) {
    setExportingId(sesi.id)

    // Data yang disimpan sekarang sudah per-orang (lihat anggota_id) --
    // jadi tinggal dibaca apa adanya, gak perlu hitung bagi rata lagi di sini
    // (kalau amil sengaja edit beda-beda antar anggota, itu ikut kebawa akurat).
    const { data: items } = await supabase
      .from('distribusi_zakat')
      .select('jumlah_uang, jumlah_beras, mustahik_id, mustahik ( nama ), anggota:anggota_id ( nama, hubungan )')
      .eq('sesi_id', sesi.id)
      .order('mustahik_id')

    const penerima = (items as unknown as { jumlah_uang: number; jumlah_beras: number; mustahik_id: number; mustahik: { nama: string } | null; anggota: { nama: string; hubungan: string } | null }[]) ?? []

    const rows: Record<string, string | number>[] = []
    let lastMustahikId: number | null = null
    penerima.forEach((p, i) => {
      const isKepalaKeluarga = !p.anggota
      const namaKeluarga = p.mustahik?.nama ?? '—'
      rows.push({
        'No': i + 1,
        'Nama Kepala Keluarga': p.mustahik_id !== lastMustahikId ? namaKeluarga : '',
        'Nama Penerima': isKepalaKeluarga ? namaKeluarga : p.anggota!.nama,
        'Hubungan': isKepalaKeluarga ? 'Kepala Keluarga' : p.anggota!.hubungan,
        'Jumlah Uang (Rp)': p.jumlah_uang,
        'Jumlah Beras (Kg)': p.jumlah_beras,
        'Jenis': sesi.jenis,
        'Tanggal Sesi': formatTanggal(sesi.tanggal),
      })
      lastMustahikId = p.mustahik_id
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sebaran')
    ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 25 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 16 }]
    const tanggalFile = new Date(sesi.tanggal).toLocaleDateString('id-ID').replace(/\//g, '-')
    XLSX.writeFile(wb, `distribusi-${sesi.jenis.replace(/\s+/g, '-').toLowerCase()}-${tanggalFile}.xlsx`)

    setExportingId(null)
  }

  return (
    <>
      <div style={{ ...s.sectionDivider, marginTop: '32px' }}>
        <span style={s.sectionLabel}>RIWAYAT SESI DISTRIBUSI</span>
      </div>

      {loadingSesi ? (
        <div style={shared.tableCard}>
          <div style={shared.centerState}><div style={shared.spinner} /><p style={shared.stateText}>Memuat riwayat...</p></div>
        </div>
      ) : sesiList.length === 0 ? (
        <div style={shared.tableCard}>
          <div style={shared.centerState}>
            <p style={shared.emptyIcon}>📭</p>
            <p style={shared.stateTitle}>Belum ada sesi distribusi</p>
          </div>
        </div>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sesiList.map(sesi => (
            <div key={sesi.id} style={{ ...s.fitrahMobileCard, cursor: 'pointer' }} onClick={() => router.push(`/distribusi/${sesi.id}`)}>
              <div style={s.fitrahMobileHeader}>
                <span style={s.fitrahNama}>{formatTanggal(sesi.tanggal)}</span>
                <span style={{ ...shared.badge, ...(sesi.jenis === 'Zakat Mal' ? shared.badgePrimary : shared.badgeGold) }}>{sesi.jenis}</span>
              </div>
              <p style={s.riwayatValue}>
                {sesi.total_uang > 0 ? formatRupiah(sesi.total_uang) : ''}
                {sesi.total_uang > 0 && sesi.total_beras > 0 ? ' + ' : ''}
                {sesi.total_beras > 0 ? `${sesi.total_beras} Kg` : ''}
              </p>
              <p style={s.riwayatMeta}>{sesi.jumlah_penerima} jiwa · {sesi.amil_pencatat ?? '—'}</p>
              <button
                onClick={e => { e.stopPropagation(); handleExportSesi(sesi) }}
                disabled={exportingId === sesi.id}
                style={{ ...shared.btnOutline, ...(exportingId === sesi.id ? shared.btnDisabled : {}) }}
              >
                {exportingId === sesi.id ? 'Menyiapkan...' : '⬇ Export Excel'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={shared.tableCard}>
          <div style={shared.tableInfo}>
            <span style={shared.tableCount}>{sesiList.length} sesi</span>
            <span style={s.tableInfoHint}>· klik baris untuk cek status penerimaan</span>
          </div>
          <div style={shared.tableScrollWrap}>
            <table style={{ ...shared.table, minWidth: '700px' }}>
              <thead>
                <tr>
                  {['Tanggal', 'Jenis', 'Total Uang', 'Total Beras', 'Penerima', 'Dicatat oleh', 'Aksi'].map(h => (
                    <th key={h} style={shared.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sesiList.map((sesi, i) => (
                  <tr
                    key={sesi.id}
                    style={{ background: i % 2 === 0 ? colors.surface : colors.surfaceAlt, cursor: 'pointer' }}
                    onClick={() => router.push(`/distribusi/${sesi.id}`)}
                  >
                    <td style={{ ...shared.td, whiteSpace: 'nowrap', color: colors.textDisabled }}>{formatTanggal(sesi.tanggal)}</td>
                    <td style={shared.td}>
                      <span style={{ ...shared.badge, ...(sesi.jenis === 'Zakat Mal' ? shared.badgePrimary : shared.badgeGold) }}>{sesi.jenis}</span>
                    </td>
                    <td style={shared.td}>{sesi.total_uang > 0 ? formatRupiah(sesi.total_uang) : '—'}</td>
                    <td style={shared.td}>{sesi.total_beras > 0 ? `${sesi.total_beras} Kg` : '—'}</td>
                    <td style={shared.td}>{sesi.jumlah_penerima} jiwa</td>
                    <td style={{ ...shared.td, color: colors.textSubtle, fontSize: font.sm }}>{sesi.amil_pencatat ?? '—'}</td>
                    <td style={shared.td}>
                      <button
                        onClick={e => { e.stopPropagation(); handleExportSesi(sesi) }}
                        disabled={exportingId === sesi.id}
                        style={{ ...shared.btnOutline, padding: '6px 12px', fontSize: font.sm, ...(exportingId === sesi.id ? shared.btnDisabled : {}) }}
                      >
                        {exportingId === sesi.id ? '...' : '⬇'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

const s: Record<string, React.CSSProperties> = {
  fitrahMobileCard: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  fitrahMobileHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  fitrahNama: { fontWeight: 700, color: colors.text, fontSize: font.md },
  riwayatValue: { fontSize: font.base, fontWeight: 600, color: colors.text },
  riwayatMeta: { fontSize: font.xs, color: colors.textSubtle },
  tableInfoHint: { fontSize: font.sm, color: colors.textPlaceholder },
  sectionDivider: { display: 'flex', alignItems: 'center', marginBottom: '14px' },
  sectionLabel: { fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: colors.textPlaceholder },
}
