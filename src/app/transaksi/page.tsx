'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/components/Sidebar'

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
  Tunai:           { bg: '#F0F7F3', color: '#1A4731', label: '💵 Tunai' },
  'Transfer Bank': { bg: '#EFF6FF', color: '#1D4ED8', label: '🏦 Transfer' },
  QRIS:            { bg: '#F5F3FF', color: '#7C3AED', label: '📱 QRIS' },
  Beras:           { bg: '#FDF8EE', color: '#92681A', label: '🌾 Beras' },
}

function normKategori(nama: string | undefined): string {
  if (!nama) return '—'
  if (nama.startsWith('Zakat Fitrah')) return 'Zakat Fitrah'
  return nama
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function exportToExcel(data: Transaksi[]) {
  const rows = data.map((t, i) => ({
    'No': i + 1,
    'Waktu': formatTanggal(t.tanggal),
    'Muzakki': t.muzakki?.nama ?? '—',
    'Kategori': normKategori(t.kategori_zakat?.nama_kategori),
    'Metode': t.metode_pembayaran,
    'Jumlah Uang (Rp)': t.jumlah_uang > 0 ? t.jumlah_uang : '',
    'Jumlah Beras (Kg)': t.jumlah_beras > 0 ? t.jumlah_beras : '',
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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  async function fetchData() {
    setLoading(true)
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

  const hasActiveFilter = !!(search || filterMetode !== 'Semua' || filterKategori !== 'Semua')

  return (
    <div style={s.shell}>
      <Sidebar />
      <main style={{
        ...s.main,
        marginLeft: isMobile ? 0 : '220px',
        padding: isMobile ? '64px 16px 20px' : '32px 36px',
      }}>

        {/* Header */}
        <div style={{
          ...s.header,
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          gap: isMobile ? '14px' : '0',
        }}>
          <div>
            <h1 style={{ ...s.headerTitle, fontSize: isMobile ? '22px' : '26px' }}>Transaksi</h1>
            <p style={s.headerSub}>Riwayat seluruh pembayaran zakat</p>
          </div>
          <div style={{
            ...s.headerRight,
            flexDirection: isMobile ? 'column' : 'row',
            width: isMobile ? '100%' : 'auto',
          }}>
            {!loading && filtered.length > 0 && (
              <button onClick={() => exportToExcel(filtered)} style={{
                ...s.exportBtn,
                width: isMobile ? '100%' : 'auto',
                justifyContent: 'center',
              }}>
                ⬇ Export Excel
              </button>
            )}
            <Link href="/transaksi/tambah" style={{
              ...s.addBtn,
              width: isMobile ? '100%' : 'auto',
              justifyContent: 'center',
            }}>
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
            <div style={{ ...s.summaryCard, background: '#F0F7F3', borderColor: '#2D7A5022' }}>
              <p style={s.summaryLabel}>Total Uang</p>
              <p style={{ ...s.summaryValue, color: '#2D7A50', fontSize: isMobile ? '16px' : '20px' }}>{formatRupiah(totalUang)}</p>
            </div>
            <div style={{ ...s.summaryCard, background: '#FDF8EE', borderColor: '#C9A84C22' }}>
              <p style={s.summaryLabel}>Total Beras</p>
              <p style={{ ...s.summaryValue, color: '#92681A', fontSize: isMobile ? '16px' : '20px' }}>{totalBeras.toFixed(1)} Kg</p>
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div style={{
          ...s.filterBar,
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          <div style={s.searchWrap}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={s.searchIcon}>
              <circle cx="7" cy="7" r="5" stroke="#A8A29E" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="#A8A29E" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Cari nama muzakki..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={s.searchInput}
            />
            {search && <button onClick={() => setSearch('')} style={s.clearBtn}>✕</button>}
          </div>

          <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
            <select value={filterMetode} onChange={e => setFilterMetode(e.target.value)} style={{ ...s.select, flex: isMobile ? 1 : 'none' }}>
              <option value="Semua">Semua Metode</option>
              {['Tunai', 'Transfer Bank', 'QRIS', 'Beras'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)} style={{ ...s.select, flex: isMobile ? 1 : 'none' }}>
              <option value="Semua">Semua Kategori</option>
              {kategoriList.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
        </div>

        {/* List / Table */}
        {loading ? (
          <div style={s.tableCard}>
            <div style={s.centerState}>
              <div style={s.spinner} />
              <p style={s.stateText}>Memuat data...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={s.tableCard}>
            <div style={s.centerState}>
              <p style={s.emptyIcon}>{hasActiveFilter ? '🔍' : '📭'}</p>
              <p style={s.stateTitle}>{hasActiveFilter ? 'Tidak ada hasil' : 'Belum ada transaksi'}</p>
              <p style={s.stateText}>
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
            {filtered.map(t => {
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
                        {t.jumlah_uang > 0 ? formatRupiah(t.jumlah_uang) : t.jumlah_beras > 0 ? `${t.jumlah_beras} Kg` : '—'}
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
          <div style={s.tableCard}>
            <div style={s.tableInfo}>
              <span style={s.tableCount}>{filtered.length} transaksi</span>
              <span style={s.tableInfoHint}>{hasActiveFilter ? '· hasil filter aktif' : '· semua data'}</span>
            </div>
            <table style={s.table}>
              <thead>
                <tr>
                  {['No', 'Waktu', 'Muzakki', 'Kategori', 'Metode', 'Uang', 'Beras', 'Dicatat oleh'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const metodeStyle = METODE_BADGE[t.metode_pembayaran] ?? METODE_BADGE['Tunai']
                  return (
                    <tr key={t.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAF9' }}>
                      <td style={{ ...s.td, ...s.tdNo }}>{i + 1}</td>
                      <td style={{ ...s.td, whiteSpace: 'nowrap', color: '#A8A29E' }}>{formatTanggal(t.tanggal)}</td>
                      <td style={s.td}><span style={s.namaText}>{t.muzakki?.nama ?? '—'}</span></td>
                      <td style={s.td}>
                        <span style={s.kategoriBadge}>{normKategori(t.kategori_zakat?.nama_kategori)}</span>
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.metodeBadge, background: metodeStyle.bg, color: metodeStyle.color }}>
                          {metodeStyle.label}
                        </span>
                      </td>
                      <td style={{ ...s.td, ...s.tdNum }}>
                        {t.jumlah_uang > 0 ? formatRupiah(t.jumlah_uang) : <span style={s.emptyCell}>—</span>}
                      </td>
                      <td style={{ ...s.td, ...s.tdNum }}>
                        {t.jumlah_beras > 0 ? `${t.jumlah_beras} Kg` : <span style={s.emptyCell}>—</span>}
                      </td>
                      <td style={{ ...s.td, color: '#78716C', fontSize: '12px' }}>{t.amil_pencatat ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', minHeight: '100vh', background: '#F8F4ED', fontFamily: "'Plus Jakarta Sans', sans-serif", overflowX: 'hidden' },
  main: { flex: 1, boxSizing: 'border-box', minWidth: 0, maxWidth: '100%', overflowX: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #EDE8E0' },
  headerTitle: { fontWeight: 700, color: '#1C1917', letterSpacing: '-0.5px', marginBottom: '4px' },
  headerSub: { fontSize: '13px', color: '#A8A29E' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  exportBtn: { display: 'flex', alignItems: 'center', padding: '10px 16px', fontSize: '13.5px', fontWeight: 600, color: '#2D7A50', background: '#F0F7F3', border: '1.5px solid #2D7A50', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'linear-gradient(135deg, #2D7A50, #1A4731)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', fontFamily: 'inherit' },
  summaryRow: { display: 'grid', gap: '12px', marginBottom: '20px' },
  summaryCard: { background: '#fff', borderRadius: '12px', padding: '14px 16px', border: '1.5px solid #EDE8E0', boxSizing: 'border-box' },
  summaryLabel: { fontSize: '11px', fontWeight: 600, color: '#A8A29E', letterSpacing: '0.3px', marginBottom: '6px' },
  summaryValue: { fontSize: '20px', fontWeight: 700, color: '#1C1917', letterSpacing: '-0.5px' },
  filterBar: { display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'stretch' },
  searchWrap: { position: 'relative', flex: 1, display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: '12px', pointerEvents: 'none' },
  searchInput: { width: '100%', padding: '10px 36px', fontSize: '13.5px', background: '#fff', border: '1.5px solid #EDE8E0', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', color: '#1C1917', boxSizing: 'border-box' },
  clearBtn: { position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#A8A29E', fontSize: '12px', padding: '4px' },
  select: { padding: '10px 12px', fontSize: '13px', fontWeight: 500, border: '1.5px solid #EDE8E0', borderRadius: '10px', background: '#fff', color: '#44403C', outline: 'none', fontFamily: 'inherit', cursor: 'pointer', minWidth: 0 },
  tableCard: { background: '#fff', borderRadius: '14px', border: '1px solid #EDE8E0', overflow: 'hidden' },
  tableInfo: { padding: '12px 16px', borderBottom: '1px solid #F5F0E8', background: '#FAFAF9', display: 'flex', gap: '6px', alignItems: 'center' },
  tableCount: { fontSize: '12px', fontWeight: 600, color: '#A8A29E' },
  tableInfoHint: { fontSize: '12px', color: '#C4BDB4' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { padding: '12px 14px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 700, color: '#A8A29E', letterSpacing: '0.5px', background: '#FAFAF9', borderBottom: '1px solid #EDE8E0' },
  td: { padding: '11px 14px', color: '#44403C', borderBottom: '1px solid #F5F0E8' },
  tdNo: { color: '#C4BDB4', fontWeight: 600, width: '40px' },
  tdNum: { fontWeight: 600, fontVariantNumeric: 'tabular-nums' },
  namaText: { fontWeight: 700, color: '#1C1917', fontSize: '14px' },
  kategoriBadge: { display: 'inline-block', padding: '3px 8px', borderRadius: '20px', background: '#F0F7F3', color: '#2D7A50', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' },
  metodeBadge: { display: 'inline-block', padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' },
  emptyCell: { color: '#D4CEC7' },
  centerState: { padding: '64px 32px', textAlign: 'center' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '8px' },
  spinner: { width: '28px', height: '28px', border: '3px solid #EDE8E0', borderTop: '3px solid #2D7A50', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginBottom: '8px' },
  emptyIcon: { fontSize: '32px', marginBottom: '4px' },
  stateTitle: { fontSize: '15px', fontWeight: 600, color: '#57534E' },
  stateText: { fontSize: '13px', color: '#A8A29E' },
  /* Mobile card list */
  mobileListContainer: { display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  tableCountMobile: { fontSize: '12px', fontWeight: 600, color: '#A8A29E', marginBottom: '2px' },
  mobileCard: { background: '#fff', border: '1px solid #EDE8E0', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  mobileCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F5F0E8', paddingBottom: '8px', gap: '8px' },
  mobileCardBody: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
  mobileCardFooter: { borderTop: '1px solid #F5F0E8', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  mobileFooterText: { fontSize: '12px', color: '#78716C' },
  mobileLabelText: { fontSize: '11px', color: '#A8A29E', marginBottom: '2px' },
  mobileValueText: { fontSize: '15px', fontWeight: 700, color: '#2D7A50' },
  mobileTimeText: { fontSize: '11px', color: '#A8A29E' },
}
