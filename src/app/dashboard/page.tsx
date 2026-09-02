'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/components/Sidebar'
import { shared } from '@/styles/shared'
import { colors, font, gradient, radius } from '@/styles/tokens'

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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
    <div style={shared.shell}>
      <Sidebar />
      <main style={{
        ...shared.main,
        maxWidth: '1100px',
        marginLeft: isMobile ? 0 : '220px',
        marginTop: isMobile ? '56px' : 0,
        padding: isMobile ? '20px 16px 32px' : '32px 36px',
      }}>
        {/* Header Section */}
        <div style={{
          ...shared.pageHeader,
          marginBottom: '24px',
          flexDirection: isMobile ? 'column-reverse' : 'row',
          gap: isMobile ? '16px' : '0',
        }}>
          <div style={s.headerTextWrap}>
            <p style={s.headerEyebrow}>{today}</p>
            <h1 style={{ ...shared.headerTitle, fontSize: isMobile ? font.h2 : font.h1 }}>Dashboard</h1>
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
          <div style={shared.loadingWrap}>
            <div style={{ ...shared.spinner, width: '32px', height: '32px' }} />
            <p style={shared.loadingText}>Memuat data...</p>
          </div>
        ) : (
          <>
            {/* Section Hari Ini */}
            <section>
              <p style={{ ...shared.sectionLabel, marginBottom: '12px' }}>HARI INI</p>
              <div style={{
                ...s.cardGrid,
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              }}>
                <StatCard label="Uang Masuk" value={formatRupiah(stats?.totalUangHariIni ?? 0)} icon="💵" accent={colors.primary} bg={colors.primaryLight} isMobile={isMobile} />
                <StatCard label="Beras Masuk" value={`${stats?.totalBerasHariIni?.toFixed(1) ?? '0'} Kg`} icon="🌾" accent={colors.gold} bg={colors.goldBg} isMobile={isMobile} />
                <StatCard label="Transaksi" value={`${stats?.totalTransaksiHariIni ?? 0} transaksi`} icon="📋" accent={colors.blue} bg={colors.blueBg} isMobile={isMobile} />
              </div>
            </section>

            {/* Section Keseluruhan */}
            <section style={{ marginTop: isMobile ? '24px' : '32px' }}>
              <p style={{ ...shared.sectionLabel, marginBottom: '12px' }}>KESELURUHAN</p>
              <div style={{
                ...s.cardGrid,
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              }}>
                <StatCard label="Total Uang Terkumpul" value={formatRupiah(stats?.totalUangSemua ?? 0)} icon="🏦" accent={colors.primary} bg={colors.primaryLight} isMobile={isMobile} />
                <StatCard label="Total Beras Terkumpul" value={`${stats?.totalBerasSemua?.toFixed(1) ?? '0'} Kg`} icon="🌾" accent={colors.gold} bg={colors.goldBg} isMobile={isMobile} />
                <StatCard label="Total Muzakki" value={`${stats?.totalMuzakki ?? 0} orang`} icon="👥" accent={colors.purple} bg={colors.purpleBg} isMobile={isMobile} />
              </div>
            </section>

            {/* Section Transaksi Terbaru */}
            <section style={{ marginTop: isMobile ? '24px' : '32px' }}>
              <p style={{ ...shared.sectionLabel, marginBottom: '12px' }}>TRANSAKSI TERBARU</p>

              {transaksi.length === 0 ? (
                <div style={shared.tableCard}>
                  <div style={s.emptyState}>
                    <p style={s.emptyIcon}>📭</p>
                    <p style={{ ...shared.stateTitle, marginBottom: '6px' }}>Belum ada transaksi.</p>
                    <p style={shared.stateText}>Mulai catat zakat dari menu <strong>Catat Zakat</strong>.</p>
                  </div>
                </div>
              ) : isMobile ? (
                /* Card List View Khusus Mobile (Sangat Rapi di HP) */
                <div style={s.mobileListContainer}>
                  {transaksi.map((t) => (
                    <div key={t.id} style={s.mobileTxCard}>
                      <div style={s.mobileTxHeader}>
                        <span style={s.muzakkiName}>{t.muzakki?.nama ?? '—'}</span>
                        <span style={s.badge}>{t.kategori_zakat?.nama_kategori ?? '—'}</span>
                      </div>
                      <div style={s.mobileTxBody}>
                        <div>
                          <p style={s.mobileLabelText}>Jumlah</p>
                          <p style={s.mobileValueText}>
                            {t.jumlah_uang > 0 ? formatRupiah(t.jumlah_uang) : `${t.jumlah_beras} Kg`}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={s.mobileLabelText}>Amil: {t.amil_pencatat ?? '—'}</p>
                          <p style={s.mobileTimeText}>{formatTanggal(t.tanggal)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Tabel Tradisional Khusus Desktop */
                <div style={shared.tableCard}>
                  <table style={shared.table}>
                    <thead>
                      <tr>
                        {['Muzakki', 'Kategori', 'Uang', 'Beras', 'Dicatat oleh', 'Waktu'].map(h => (
                          <th key={h} style={shared.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transaksi.map((t, i) => (
                        <tr key={t.id} style={{ background: i % 2 === 0 ? colors.surface : colors.surfaceAlt }}>
                          <td style={shared.td}><span style={s.muzakkiName}>{t.muzakki?.nama ?? '—'}</span></td>
                          <td style={shared.td}><span style={s.badge}>{t.kategori_zakat?.nama_kategori ?? '—'}</span></td>
                          <td style={{ ...shared.td, ...s.tdNum }}>{t.jumlah_uang > 0 ? formatRupiah(t.jumlah_uang) : '—'}</td>
                          <td style={{ ...shared.td, ...s.tdNum }}>{t.jumlah_beras > 0 ? `${t.jumlah_beras} Kg` : '—'}</td>
                          <td style={{ ...shared.td, color: colors.textSubtle }}>{t.amil_pencatat ?? '—'}</td>
                          <td style={{ ...shared.td, color: colors.textDisabled, whiteSpace: 'nowrap' }}>{formatTanggal(t.tanggal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, icon, accent, bg, isMobile }: {
  label: string; value: string; icon: string; accent: string; bg: string; isMobile: boolean
}) {
  return (
    <div style={{
      ...sc.card,
      background: bg,
      borderColor: accent + '22',
      padding: isMobile ? '14px 16px' : '20px',
      flexDirection: isMobile ? 'row' : 'column',
      alignItems: isMobile ? 'center' : 'flex-start',
      gap: isMobile ? '14px' : '8px',
    }}>
      <div style={{
        ...sc.iconWrap,
        background: accent + '18',
        marginBottom: isMobile ? 0 : '4px',
      }}>
        <span style={sc.iconEmoji}>{icon}</span>
      </div>
      <div style={{ flex: 1 }}>
        <p style={sc.label}>{label}</p>
        <p style={{
          ...sc.value,
          color: accent,
          fontSize: isMobile ? '18px' : '22px',
        }}>{value}</p>
      </div>
    </div>
  )
}

const sc: Record<string, React.CSSProperties> = {
  card: { borderRadius: radius.lg, borderStyle: 'solid', borderWidth: '1.5px', display: 'flex' },
  iconWrap: { width: '40px', height: '40px', borderRadius: radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconEmoji: { fontSize: '20px' },
  label: { fontSize: font.sm, fontWeight: 600, color: colors.textSubtle, letterSpacing: '0.3px' },
  value: { fontWeight: 700, letterSpacing: '-0.5px' },
}

const s: Record<string, React.CSSProperties> = {
  headerTextWrap: { minWidth: 0, flex: 1 },
  headerEyebrow: { fontSize: font.sm, color: colors.textDisabled, fontWeight: 500, marginBottom: '4px', textTransform: 'capitalize' },
  headerUser: { display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 },
  avatar: { width: '36px', height: '36px', borderRadius: '50%', background: gradient.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: font.md, fontWeight: 700, flexShrink: 0 },
  userInfo: { display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 },
  userName: { fontSize: font.base, fontWeight: 700, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' },
  userEmail: { fontSize: font.sm, color: colors.textDisabled, fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' },
  cardGrid: { display: 'grid', gap: '12px' },
  tdNum: { fontWeight: 600, fontVariantNumeric: 'tabular-nums' },
  muzakkiName: { fontWeight: 700, color: colors.text, fontSize: font.md },
  badge: { display: 'inline-block', padding: '3px 8px', borderRadius: radius.full, background: colors.primaryLight, color: colors.primary, fontSize: '11px', fontWeight: 600 },
  emptyState: { padding: '48px 16px', textAlign: 'center' },
  emptyIcon: { fontSize: '32px', marginBottom: '12px' },
  /* Style Khusus Card List Mobile */
  mobileListContainer: { display: 'flex', flexDirection: 'column', gap: '10px' },
  mobileTxCard: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  mobileTxHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.borderLight}`, paddingBottom: '8px' },
  mobileTxBody: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
  mobileLabelText: { fontSize: font.xs, color: colors.textDisabled, marginBottom: '2px' },
  mobileValueText: { fontSize: font.lg, fontWeight: 700, color: colors.primary },
  mobileTimeText: { fontSize: font.xs, color: colors.textSubtle },
}
