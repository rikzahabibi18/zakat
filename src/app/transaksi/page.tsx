'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { createClient } from '@/utils/supabase/client'
import { useIsMobile } from '@/hooks/useIsMobile'
import Sidebar from '@/components/Sidebar'
import { shared } from '@/styles/shared'
import { colors, font, radius } from '@/styles/tokens'

interface Transaksi {
  id: number
  tanggal: string
  jumlah_uang: number
  jumlah_beras: number
  metode_pembayaran: string
  amil_pencatat: string | null
  muzakki: { nama: string } | null
  kategori_zakat: { nama_kategori: string } | null
}

const METODE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  Tunai:           { bg: colors.primaryLight, color: colors.primaryDark, label: '💵 Tunai' },
  'Transfer Bank': { bg: colors.blueBg,       color: colors.blue,       label: '🏦 Transfer' },
  QRIS:            { bg: colors.purpleBg,     color: colors.purple,     label: '📱 QRIS' },
  Beras:           { bg: colors.goldBg,       color: colors.gold,      label: '🌾 Beras' },
}

function normKategori(nama: string | undefined): string {
  if (!nama) return '—'
  if (nama.startsWith('Zakat Fitrah')) return 'Zakat Fitrah'
  return nama
}

// Rasio kepadatan beras (standar BAZNAS: 2.5 kg = 3.5 liter) — nilai fisik, tetap.
// jumlah_beras selalu disimpan dalam Kg di database; ini cuma buat tampilan
// sesuai satuan yang dipilih lembaga (lihat pengaturan di halaman Profil).
const LITER_TO_KG = 2.5 / 3.5
function tampilBeras(kg: number, satuan: 'kg' | 'liter') {
  return satuan === 'kg' ? kg : kg / LITER_TO_KG
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function getPageNumbers(current: number, total: number, maxVisible = 3): (number | '...')[] {
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const half = Math.floor(maxVisible / 2)
  let start = Math.max(1, current - half)
  let end = start + maxVisible - 1
  if (end > total) {
    end = total
    start = end - maxVisible + 1
  }
  const pages: (number | '...')[] = []
  if (start > 1) {
    pages.push(1)
    if (start > 2) pages.push('...')
  }
  for (let p = start; p <= end; p++) pages.push(p)
  if (end < total) {
    if (end < total - 1) pages.push('...')
    pages.push(total)
  }
  return pages
}

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function exportToExcel(data: Transaksi[], satuanBeras: 'kg' | 'liter') {
  const labelSatuan = satuanBeras === 'kg' ? 'Kg' : 'Liter'
  const rows = data.map((t, i) => ({
    'No': i + 1,
    'Waktu': formatTanggal(t.tanggal),
    'Muzakki': t.muzakki?.nama ?? '—',
    'Kategori': normKategori(t.kategori_zakat?.nama_kategori),
    'Metode': t.metode_pembayaran,
    'Jumlah Uang (Rp)': t.jumlah_uang > 0 ? t.jumlah_uang : '',
    [`Jumlah Beras (${labelSatuan})`]: t.jumlah_beras > 0 ? Math.round(tampilBeras(t.jumlah_beras, satuanBeras) * 100) / 100 : '',
    'Dicatat Oleh': t.amil_pencatat ?? '—',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Transaksi')
  ws['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 25 }, { wch: 22 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 25 }]
  const tanggal = new Date().toLocaleDateString('id-ID').replace(/\//g, '-')
  XLSX.writeFile(wb, `transaksi-zakat-${tanggal}.xlsx`)
}

export default function TransaksiPage() {
  const supabase = createClient()
  const [data, setData] = useState<Transaksi[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMetode, setFilterMetode] = useState('Semua')
  const [filterKategori, setFilterKategori] = useState('Semua')
  const [kategoriList, setKategoriList] = useState<string[]>([])
  const isMobile = useIsMobile()
  const [page, setPage] = useState(1)
  const [satuanBeras, setSatuanBeras] = useState<'kg' | 'liter'>('kg')

  async function fetchData() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profil } = await supabase.from('profil_amil').select('lembaga_id').eq('id', user.id).single()
      if (profil?.lembaga_id) {
        const { data: lembaga } = await supabase.from('lembaga').select('satuan_beras').eq('id', profil.lembaga_id).single()
        if (lembaga?.satuan_beras) setSatuanBeras(lembaga.satuan_beras as 'kg' | 'liter')
      }
    }

    const { data: rows } = await supabase
      .from('transaksi')
      .select(`
        id, tanggal, jumlah_uang, jumlah_beras, metode_pembayaran, amil_pencatat,
        muzakki ( nama ),
        kategori_zakat ( nama_kategori )
      `)
      .order('tanggal', { ascending: false })

    const list = (rows as unknown as Transaksi[]) ?? []
    setData(list)

    const kategoriUnik = [...new Set(
      list.map(t => normKategori(t.kategori_zakat?.nama_kategori)).filter(k => k !== '—')
    )]
    setKategoriList(kategoriUnik)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch awal saat mount, disengaja
  useEffect(() => { fetchData() }, [])

  const filtered = useMemo(() => {
    let result = data
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.muzakki?.nama.toLowerCase().includes(q) ||
        t.amil_pencatat?.toLowerCase().includes(q)
      )
    }
    if (filterMetode !== 'Semua') {
      result = result.filter(t => t.metode_pembayaran === filterMetode)
    }
    if (filterKategori !== 'Semua') {
      result = result.filter(t => normKategori(t.kategori_zakat?.nama_kategori) === filterKategori)
    }
    return result
  }, [data, search, filterMetode, filterKategori])

  const totalUang = filtered.reduce((a, b) => a + Number(b.jumlah_uang), 0)
  const totalBeras = filtered.reduce((a, b) => a + Number(b.jumlah_beras), 0)
  const satuanLabel = satuanBeras === 'kg' ? 'Kg' : 'Liter'

  const hasActiveFilter = !!(search || filterMetode !== 'Semua' || filterKategori !== 'Semua')

  const PAGE_SIZE = 10
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  )

  return (
    <div style={shared.shell}>
      <Sidebar />
      <main style={{
        ...shared.main,
        marginLeft: isMobile ? 0 : '220px',
        padding: isMobile ? '64px 16px 20px' : '32px 36px',
      }}>

        {/* Header */}
        <div style={{
          ...shared.pageHeader,
          marginBottom: '24px',
          paddingBottom: '24px',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          gap: isMobile ? '14px' : '0',
        }}>
          <div>
            <h1 style={{ ...shared.headerTitle, fontSize: isMobile ? font.h2 : font.h1 }}>Transaksi</h1>
            <p style={shared.headerSub}>Riwayat seluruh pembayaran zakat</p>
          </div>
          <div style={{
            ...s.headerRight,
            flexDirection: isMobile ? 'column' : 'row',
            width: isMobile ? '100%' : 'auto',
          }}>
            {!loading && filtered.length > 0 && (
              <button
                onClick={() => exportToExcel(filtered, satuanBeras)}
                style={{
                  ...shared.btnSecondary,
                  width: isMobile ? '100%' : 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 16px',
                  fontWeight: 600,
                }}
              >
                ⬇ Export Excel
              </button>
            )}
            <Link
              href="/transaksi/tambah"
              style={{
                ...shared.btnPrimary,
                width: isMobile ? '100%' : 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 18px',
                textDecoration: 'none',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Catat Zakat
            </Link>
          </div>
        </div>

        {/* Summary cards */}
        {!loading && (
          <div style={{
            ...s.summaryRow,
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
          }}>
            <div style={{ ...s.summaryCard, gridColumn: isMobile ? 'span 2' : 'auto' }}>
              <p style={s.summaryLabel}>Total Transaksi</p>
              <p style={s.summaryValue}>{filtered.length}</p>
            </div>
            <div style={{ ...s.summaryCard, background: colors.primaryLight, border: `1.5px solid ${colors.primary}22` }}>
              <p style={s.summaryLabel}>Total Uang</p>
              <p style={{ ...s.summaryValue, color: colors.primary, fontSize: isMobile ? '16px' : '20px' }}>{formatRupiah(totalUang)}</p>
            </div>
            <div style={{ ...s.summaryCard, background: colors.goldBg, border: `1.5px solid ${colors.goldBorder}22` }}>
              <p style={s.summaryLabel}>Total Beras</p>
              <p style={{ ...s.summaryValue, color: colors.gold, fontSize: isMobile ? '16px' : '20px' }}>{tampilBeras(totalBeras, satuanBeras).toFixed(1)} {satuanLabel}</p>
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div style={{
          ...s.filterBar,
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          <div style={shared.searchWrapInline}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={s.searchIcon}>
              <circle cx="7" cy="7" r="5" stroke={colors.textDisabled} strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke={colors.textDisabled} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Cari nama muzakki..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              style={{ ...shared.searchInput, paddingLeft: '40px' }}
            />
            {search && <button onClick={() => { setSearch(''); setPage(1) }} style={shared.clearBtn}>✕</button>}
          </div>

          <div style={{
            display: 'flex',
            gap: '10px',
            width: isMobile ? '100%' : 'auto',
            flexShrink: 0,  // ← jangan menyusut
          }}>
            <select
              value={filterMetode}
              onChange={e => { setFilterMetode(e.target.value); setPage(1) }}
              style={{
                ...shared.select,
                width: isMobile ? 'auto' : '140px',  // ← lebar fixed di desktop
                flex: isMobile ? 1 : 'none',
              }}
            >
              <option value="Semua">Semua Metode</option>
              {['Tunai', 'Transfer Bank', 'QRIS', 'Beras'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={filterKategori}
              onChange={e => { setFilterKategori(e.target.value); setPage(1) }}
              style={{
                ...shared.select,
                width: isMobile ? 'auto' : '155px',  // ← lebar fixed di desktop
                flex: isMobile ? 1 : 'none',
              }}
            >
              <option value="Semua">Semua Kategori</option>
              {kategoriList.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
        </div>

        {/* List / Table */}
        {loading ? (
          <div style={shared.tableCard}>
            <div style={shared.centerState}>
              <div style={shared.spinner} />
              <p style={shared.stateText}>Memuat data...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={shared.tableCard}>
            <div style={shared.centerState}>
              <p style={shared.emptyIcon}>{hasActiveFilter ? '🔍' : '📭'}</p>
              <p style={shared.stateTitle}>{hasActiveFilter ? 'Tidak ada hasil' : 'Belum ada transaksi'}</p>
              <p style={shared.stateText}>
                {hasActiveFilter
                  ? 'Coba ubah filter atau kata kunci pencarian.'
                  : 'Mulai catat transaksi pertama via tombol "Catat Zakat".'}
              </p>
            </div>
          </div>
        ) : isMobile ? (
          /* Card List — Mobile */
          <div style={s.mobileListContainer}>
            <p style={s.tableCountMobile}>
              {filtered.length} transaksi{hasActiveFilter ? ' · filter aktif' : ''}
            </p>
            {paginated.map(t => {
              const metodeStyle = METODE_BADGE[t.metode_pembayaran] ?? METODE_BADGE['Tunai']
              return (
                <div key={t.id} style={s.mobileCard}>
                  <div style={s.mobileCardHeader}>
                    <span style={s.namaText}>{t.muzakki?.nama ?? '—'}</span>
                    <span style={s.kategoriBadge}>{normKategori(t.kategori_zakat?.nama_kategori)}</span>
                  </div>
                  <div style={s.mobileCardBody}>
                    <div>
                      <p style={s.mobileLabelText}>Jumlah</p>
                      <p style={s.mobileValueText}>
                        {t.jumlah_uang > 0 ? formatRupiah(t.jumlah_uang) : t.jumlah_beras > 0 ? `${tampilBeras(t.jumlah_beras, satuanBeras).toFixed(1)} ${satuanLabel}` : '—'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ ...s.metodeBadge, background: metodeStyle.bg, color: metodeStyle.color }}>
                        {metodeStyle.label}
                      </span>
                    </div>
                  </div>
                  <div style={s.mobileCardFooter}>
                    <p style={s.mobileFooterText}>👤 {t.amil_pencatat ?? '—'}</p>
                    <p style={s.mobileTimeText}>{formatTanggal(t.tanggal)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Table — Desktop */
          <div style={shared.tableCard}>
            <div style={shared.tableInfo}>
              <span style={shared.tableCount}>{filtered.length} transaksi</span>
              <span style={s.tableInfoHint}>{hasActiveFilter ? '· hasil filter aktif' : '· semua data'}</span>
            </div>
            <table style={shared.table}>
              <thead>
                <tr>
                  {['No', 'Waktu', 'Muzakki', 'Kategori', 'Metode', 'Uang', 'Beras', 'Dicatat oleh'].map(h => (
                    <th key={h} style={shared.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((t, i) => {
                  const metodeStyle = METODE_BADGE[t.metode_pembayaran] ?? METODE_BADGE['Tunai']
                  return (
                    <tr key={t.id} style={{ background: i % 2 === 0 ? colors.surface : colors.surfaceAlt }}>
                      <td style={{ ...shared.td, ...s.tdNo }}>{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                      <td style={{ ...shared.td, whiteSpace: 'nowrap', color: colors.textDisabled }}>{formatTanggal(t.tanggal)}</td>
                      <td style={shared.td}><span style={s.namaText}>{t.muzakki?.nama ?? '—'}</span></td>
                      <td style={shared.td}>
                        <span style={s.kategoriBadge}>{normKategori(t.kategori_zakat?.nama_kategori)}</span>
                      </td>
                      <td style={shared.td}>
                        <span style={{ ...s.metodeBadge, background: metodeStyle.bg, color: metodeStyle.color }}>
                          {metodeStyle.label}
                        </span>
                      </td>
                      <td style={{ ...shared.td, ...s.tdNum }}>
                        {t.jumlah_uang > 0 ? formatRupiah(t.jumlah_uang) : <span style={s.emptyCell}>—</span>}
                      </td>
                      <td style={{ ...shared.td, ...s.tdNum }}>
                        {t.jumlah_beras > 0 ? `${tampilBeras(t.jumlah_beras, satuanBeras).toFixed(1)} ${satuanLabel}` : <span style={s.emptyCell}>—</span>}
                      </td>
                      <td style={{ ...shared.td, color: colors.textSubtle, fontSize: font.sm }}>{t.amil_pencatat ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && totalPages > 1 && (
          <div style={s.paginationRow}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ ...shared.btnOutline, ...(currentPage === 1 ? shared.btnDisabled : {}) }}
            >
              ← Sebelumnya
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} style={s.pageEllipsis}>…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{ ...s.pageNumBtn, ...(p === currentPage ? s.pageNumBtnActive : {}) }}
                  >
                    {p}
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ ...shared.btnOutline, ...(currentPage === totalPages ? shared.btnDisabled : {}) }}
            >
              Berikutnya →
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  headerRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  summaryRow: { display: 'grid', gap: '12px', marginBottom: '20px' },
  summaryCard: { background: colors.surface, borderRadius: radius.lg, padding: '14px 16px', border: `1.5px solid ${colors.border}`, boxSizing: 'border-box' },
  summaryLabel: { fontSize: font.sm, fontWeight: 600, color: colors.textDisabled, letterSpacing: '0.3px', marginBottom: '6px' },
  summaryValue: { fontSize: '20px', fontWeight: 700, color: colors.text, letterSpacing: '-0.5px' },
  filterBar: { display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'stretch' },
  searchIcon: { position: 'absolute', left: '12px', pointerEvents: 'none' },
  tableInfoHint: { fontSize: font.sm, color: colors.textPlaceholder },
  tdNo: { color: colors.textPlaceholder, fontWeight: 600, width: '40px' },
  tdNum: { fontWeight: 600, fontVariantNumeric: 'tabular-nums' },
  namaText: { fontWeight: 700, color: colors.text, fontSize: font.md },
  kategoriBadge: { display: 'inline-block', padding: '3px 8px', borderRadius: radius.full, background: colors.primaryLight, color: colors.primary, fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' },
  metodeBadge: { display: 'inline-block', padding: '3px 8px', borderRadius: radius.full, fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' },
  emptyCell: { color: '#D4CEC7' },

  /* Mobile card list */
  mobileListContainer: { display: 'flex', flexDirection: 'column', gap: '10px' },
  tableCountMobile: { fontSize: font.sm, fontWeight: 600, color: colors.textDisabled, marginBottom: '2px' },
  mobileCard: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  mobileCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.borderLight}`, paddingBottom: '8px', gap: '8px' },
  mobileCardBody: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
  mobileCardFooter: { borderTop: `1px solid ${colors.borderLight}`, paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  mobileFooterText: { fontSize: font.sm, color: colors.textSubtle },
  mobileLabelText: { fontSize: font.xs, color: colors.textDisabled, marginBottom: '2px' },
  mobileValueText: { fontSize: font.lg, fontWeight: 700, color: colors.primary },
  mobileTimeText: { fontSize: font.xs, color: colors.textDisabled },

  /* Pagination */
  paginationRow: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '10px' },
  pageNumBtn: {
    minWidth: '34px', padding: '8px', fontSize: font.base, fontWeight: 600,
    color: colors.textMuted, background: colors.surface, border: `1.5px solid ${colors.border}`,
    borderRadius: radius.sm, cursor: 'pointer', fontFamily: font.family,
  },
  pageNumBtnActive: { background: colors.primary, color: '#fff', border: `1.5px solid ${colors.primary}` },
  pageEllipsis: { color: colors.textPlaceholder, fontSize: font.base, padding: '0 2px' },
}

