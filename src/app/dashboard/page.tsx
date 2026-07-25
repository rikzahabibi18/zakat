'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/components/Sidebar'

interface StatCards {
  totalUangHariIni: number
  totalBerasHariIni: number
  totalTransaksiHariIni: number
  totalUangSemua: number
  totalBerasSemua: number
  totalMuzakki: number
}

interface TransaksiTerbaru {
  id: number
  tanggal: string
  jumlah_uang: number
  jumlah_beras: number
  amil_pencatat: string | null
  muzakki: { nama: string } | null
  kategori_zakat: { nama_kategori: string } | null
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}
function formatTanggal(iso: string) {
  return new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<StatCards | null>(null)
  const [transaksi, setTransaksi] = useState<TransaksiTerbaru[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [userNama, setUserNama] = useState('')

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      setUserEmail(user?.email ?? '')
      setUserNama(user?.user_metadata?.nama ?? '')

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data: hariIni } = await supabase
        .from('transaksi')
        .select('jumlah_uang, jumlah_beras')
        .gte('tanggal', todayStart.toISOString())

      const { data: semuaTransaksi } = await supabase
        .from('transaksi')
        .select('jumlah_uang, jumlah_beras')

      const { count: totalMuzakki } = await supabase
        .from('muzakki')
        .select('*', { count: 'exact', head: true })

      const { data: terbaru } = await supabase
        .from('transaksi')
        .select(`
          id, tanggal, jumlah_uang, jumlah_beras, amil_pencatat,
          muzakki ( nama ),
          kategori_zakat ( nama_kategori )
        `)
        .order('tanggal', { ascending: false })
        .limit(8)

      const sum = (arr: { jumlah_uang: number; jumlah_beras: number }[] | null) => ({
        uang: arr?.reduce((a, b) => a + Number(b.jumlah_uang), 0) ?? 0,
        beras: arr?.reduce((a, b) => a + Number(b.jumlah_beras), 0) ?? 0,
      })

      setStats({
        totalUangHariIni: sum(hariIni).uang,
        totalBerasHariIni: sum(hariIni).beras,
        totalTransaksiHariIni: hariIni?.length ?? 0,
        totalUangSemua: sum(semuaTransaksi).uang,
        totalBerasSemua: sum(semuaTransaksi).beras,
        totalMuzakki: totalMuzakki ?? 0,
      })

      setTransaksi((terbaru as unknown as TransaksiTerbaru[]) ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const avatarLetter = (userNama || userEmail).charAt(0).toUpperCase()

  return (
    <div style={s.shell}>
      <Sidebar />
      <main style={s.main}>
        <div style={s.header}>
          <div>
            <p style={s.headerEyebrow}>{today}</p>
            <h1 style={s.headerTitle}>Dashboard</h1>
          </div>
          <div style={s.headerUser}>
            <div style={s.avatar}>{avatarLetter}</div>
            <div style={s.userInfo}>
              {userNama && <p style={s.userName}>{userNama}</p>}
              <p style={s.userEmail}>{userEmail}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={s.loadingWrap}>
            <div style={s.loadingSpinner} />
            <p style={s.loadingText}>Memuat data...</p>
          </div>
        ) : (
          <>
            <section>
              <p style={s.sectionLabel}>HARI INI</p>
              <div style={s.cardGrid}>
                <StatCard label="Uang Masuk" value={formatRupiah(stats?.totalUangHariIni ?? 0)} icon="💵" accent="#2D7A50" bg="#F0F7F3" />
                <StatCard label="Beras Masuk" value={`${stats?.totalBerasHariIni?.toFixed(1) ?? '0'} Kg`} icon="🌾" accent="#92681A" bg="#FDF8EE" />
                <StatCard label="Transaksi" value={`${stats?.totalTransaksiHariIni ?? 0} transaksi`} icon="📋" accent="#1D4ED8" bg="#EFF6FF" />
              </div>
            </section>

            <section style={{ marginTop: '32px' }}>
              <p style={s.sectionLabel}>KESELURUHAN</p>
              <div style={s.cardGrid}>
                <StatCard label="Total Uang Terkumpul" value={formatRupiah(stats?.totalUangSemua ?? 0)} icon="🏦" accent="#2D7A50" bg="#F0F7F3" />
                <StatCard label="Total Beras Terkumpul" value={`${stats?.totalBerasSemua?.toFixed(1) ?? '0'} Kg`} icon="🌾" accent="#92681A" bg="#FDF8EE" />
                <StatCard label="Total Muzakki" value={`${stats?.totalMuzakki ?? 0} orang`} icon="👥" accent="#7C3AED" bg="#F5F3FF" />
              </div>
            </section>

            <section style={{ marginTop: '32px' }}>
              <p style={s.sectionLabel}>TRANSAKSI TERBARU</p>
              <div style={s.tableCard}>
                {transaksi.length === 0 ? (
                  <div style={s.emptyState}>
                    <p style={s.emptyIcon}>📭</p>
                    <p style={s.emptyText}>Belum ada transaksi.</p>
                    <p style={s.emptyHint}>Mulai catat zakat dari menu <strong>Catat Zakat</strong>.</p>
                  </div>
                ) : (
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {['Muzakki', 'Kategori', 'Uang', 'Beras', 'Dicatat oleh', 'Waktu'].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transaksi.map((t, i) => (
                        <tr key={t.id} style={{ background: i % 2 === 0 ? '#FFFFFF' : '#FAFAF9' }}>
                          <td style={s.td}><span style={s.muzakkiName}>{t.muzakki?.nama ?? '—'}</span></td>
                          <td style={s.td}><span style={s.badge}>{t.kategori_zakat?.nama_kategori ?? '—'}</span></td>
                          <td style={{ ...s.td, ...s.tdNum }}>{t.jumlah_uang > 0 ? formatRupiah(t.jumlah_uang) : '—'}</td>
                          <td style={{ ...s.td, ...s.tdNum }}>{t.jumlah_beras > 0 ? `${t.jumlah_beras} Kg` : '—'}</td>
                          <td style={{ ...s.td, color: '#78716C' }}>{t.amil_pencatat ?? '—'}</td>
                          <td style={{ ...s.td, color: '#A8A29E', whiteSpace: 'nowrap' }}>{formatTanggal(t.tanggal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, icon, accent, bg }: { label: string; value: string; icon: string; accent: string; bg: string }) {
  return (
    <div style={{ ...sc.card, background: bg, borderColor: accent + '22' }}>
      <div style={{ ...sc.iconWrap, background: accent + '18' }}>
        <span style={sc.iconEmoji}>{icon}</span>
      </div>
      <p style={sc.label}>{label}</p>
      <p style={{ ...sc.value, color: accent }}>{value}</p>
    </div>
  )
}

const sc: Record<string, React.CSSProperties> = {
  card: { borderRadius: '14px', padding: '20px', border: '1.5px solid', display: 'flex', flexDirection: 'column', gap: '8px' },
  iconWrap: { width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' },
  iconEmoji: { fontSize: '20px' },
  label: { fontSize: '12px', fontWeight: 600, color: '#78716C', letterSpacing: '0.3px' },
  value: { fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px' },
}

const s: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', minHeight: '100vh', background: '#F8F4ED', fontFamily: "'Plus Jakarta Sans', sans-serif" },
  main: { marginLeft: '220px', flex: 1, padding: '32px 36px', maxWidth: '1100px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid #EDE8E0' },
  headerEyebrow: { fontSize: '12px', color: '#A8A29E', fontWeight: 500, marginBottom: '4px', textTransform: 'capitalize' },
  headerTitle: { fontSize: '26px', fontWeight: 700, color: '#1C1917', letterSpacing: '-0.5px' },
  headerUser: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar: { width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #2D7A50, #1A4731)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flexShrink: 0 },
  userInfo: { display: 'flex', flexDirection: 'column', gap: '1px' },
  userName: { fontSize: '13px', fontWeight: 700, color: '#1C1917' },
  userEmail: { fontSize: '12px', color: '#A8A29E', fontWeight: 400 },
  sectionLabel: { fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', color: '#C4BDB4', marginBottom: '12px' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
  tableCard: { background: '#FFFFFF', borderRadius: '14px', border: '1px solid #EDE8E0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { padding: '12px 16px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 700, color: '#A8A29E', letterSpacing: '0.5px', background: '#FAFAF9', borderBottom: '1px solid #EDE8E0' },
  td: { padding: '12px 16px', color: '#1C1917', borderBottom: '1px solid #F5F0E8', fontSize: '13px' },
  tdNum: { fontWeight: 600, fontVariantNumeric: 'tabular-nums' },
  muzakkiName: { fontWeight: 600, color: '#1C1917' },
  badge: { display: 'inline-block', padding: '3px 8px', borderRadius: '20px', background: '#F0F7F3', color: '#2D7A50', fontSize: '11px', fontWeight: 600 },
  emptyState: { padding: '48px', textAlign: 'center' as const },
  emptyIcon: { fontSize: '32px', marginBottom: '12px' },
  emptyText: { fontSize: '15px', fontWeight: 600, color: '#57534E', marginBottom: '6px' },
  emptyHint: { fontSize: '13px', color: '#A8A29E' },
  loadingWrap: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', height: '300px', gap: '16px' },
  loadingSpinner: { width: '32px', height: '32px', border: '3px solid #EDE8E0', borderTop: '3px solid #2D7A50', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  loadingText: { fontSize: '14px', color: '#A8A29E' },
}
