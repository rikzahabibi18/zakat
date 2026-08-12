'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface Transaksi {
  id: number
  jumlah_uang: number
  jumlah_beras: number
  metode_pembayaran: string
  status: string
  tanggal: string
  muzakki: { nama: string } | null
  kategori_zakat: { nama_kategori: string } | null
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(n)
}

export default function KonfirmasiPage() {
  const { id } = useParams()
  const supabase = createClient()

  const [transaksi, setTransaksi] = useState<Transaksi | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchTransaksi() {
      const { data, error } = await supabase
        .from('transaksi')
        .select(`
          id, jumlah_uang, jumlah_beras, metode_pembayaran, status, tanggal,
          muzakki ( nama ),
          kategori_zakat ( nama_kategori )
        `)
        .eq('id', id)
        .single()

      if (error || !data) {
        setError('Transaksi tidak ditemukan.')
      } else {
        setTransaksi(data as unknown as Transaksi)
        if (data.status === 'terkonfirmasi') setDone(true)
      }
      setLoading(false)
    }
    fetchTransaksi()
  }, [id])

  async function handleKonfirmasi() {
    setConfirming(true)
    const { error } = await supabase
      .from('transaksi')
      .update({ status: 'terkonfirmasi' })
      .eq('id', id)

    setConfirming(false)
    if (error) { setError('Gagal mengkonfirmasi. Coba lagi.'); return }
    setDone(true)
  }

  if (loading) {
    return (
      <div style={s.shell}>
        <div style={s.loadingWrap}>
          <div style={s.spinner} />
          <p style={s.loadingText}>Memuat data transaksi...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={s.shell}>
        <div style={s.centerWrap}>
          <p style={s.errorIcon}>❌</p>
          <p style={s.errorTitle}>Transaksi Tidak Ditemukan</p>
          <p style={s.errorDesc}>{error}</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div style={s.shell}>
        <div style={s.centerWrap}>
          <div style={s.successIcon}>✓</div>
          <p style={s.successTitle}>Pembayaran Terkonfirmasi</p>
          <p style={s.successDesc}>Terima kasih, {transaksi?.muzakki?.nama}.</p>
          <p style={s.successDesc}>Zakat Anda telah tercatat. Semoga menjadi amal yang diterima.</p>
          <p style={s.ayat}>
            &ldquo;Ambillah zakat dari sebagian harta mereka, dengan zakat itu kamu membersihkan dan mensucikan mereka.&rdquo;
            <br /><strong>— QS. At-Taubah: 103</strong>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={s.shell}>
      <div style={s.card}>
        {/* Header */}
        <div style={s.cardHeader}>
          <div style={s.logo}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14.5 8.5H21L15.5 12.5L17.5 19L12 15.5L6.5 19L8.5 12.5L3 8.5H9.5L12 2Z"
                fill="white" fillOpacity="0.95"/>
            </svg>
          </div>
          <p style={s.logoLabel}>Konfirmasi Pembayaran Zakat</p>
        </div>

        {/* Detail transaksi */}
        <div style={s.cardBody}>
          <p style={s.greeting}>Assalamu&apos;alaikum,</p>
          <p style={s.muzakkiNama}>{transaksi?.muzakki?.nama}</p>
          <p style={s.instruction}>
            Silakan konfirmasi pembayaran zakat Anda di bawah ini.
          </p>

          <div style={s.detailBox}>
            <div style={s.detailRow}>
              <span style={s.detailLabel}>Jenis Zakat</span>
              <span style={s.detailValue}>{transaksi?.kategori_zakat?.nama_kategori}</span>
            </div>
            <div style={s.detailRow}>
              <span style={s.detailLabel}>Metode</span>
              <span style={s.detailValue}>{transaksi?.metode_pembayaran}</span>
            </div>
            {transaksi && transaksi.jumlah_uang > 0 && (
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Jumlah</span>
                <span style={{ ...s.detailValue, color: '#2D7A50', fontWeight: 700, fontSize: '18px' }}>
                  {formatRupiah(transaksi.jumlah_uang)}
                </span>
              </div>
            )}
            {transaksi && transaksi.jumlah_beras > 0 && (
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Jumlah Beras</span>
                <span style={{ ...s.detailValue, color: '#2D7A50', fontWeight: 700, fontSize: '18px' }}>
                  {transaksi.jumlah_beras} Kg
                </span>
              </div>
            )}
            <div style={{ ...s.detailRow, borderBottom: 'none' }}>
              <span style={s.detailLabel}>Status</span>
              <span style={s.statusBadge}>⏳ Menunggu Konfirmasi</span>
            </div>
          </div>

          {error && <p style={s.errorText}>⚠ {error}</p>}

          <button
            onClick={handleKonfirmasi}
            disabled={confirming}
            style={{ ...s.konfirmasiBtn, ...(confirming ? s.konfirmasiBtnDisabled : {}) }}
          >
            {confirming ? 'Mengkonfirmasi...' : '✓ Konfirmasi Pembayaran Saya'}
          </button>

          <p style={s.footerNote}>
            Halaman ini hanya untuk konfirmasi pembayaran zakat.<br />
            Jika ada pertanyaan, hubungi amil zakat Anda.
          </p>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: '100vh', background: '#F8F4ED',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  spinner: { width: '32px', height: '32px', border: '3px solid #EDE8E0', borderTop: '3px solid #2D7A50', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  loadingText: { fontSize: '14px', color: '#A8A29E' },
  centerWrap: { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', maxWidth: '360px' },
  errorIcon: { fontSize: '48px' },
  errorTitle: { fontSize: '18px', fontWeight: 700, color: '#1C1917' },
  errorDesc: { fontSize: '14px', color: '#78716C' },
  successIcon: { width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #2D7A50, #1A4731)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 700, marginBottom: '8px' },
  successTitle: { fontSize: '22px', fontWeight: 700, color: '#1A4731' },
  successDesc: { fontSize: '14px', color: '#57534E', textAlign: 'center' },
  ayat: { fontSize: '13px', color: '#A8A29E', fontStyle: 'italic', textAlign: 'center', marginTop: '16px', lineHeight: 1.6 },
  card: { background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' },
  cardHeader: { background: 'linear-gradient(135deg, #2D7A50, #1A4731)', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' },
  logo: { width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)' },
  logoLabel: { fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', textAlign: 'center' },
  cardBody: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  greeting: { fontSize: '13px', color: '#A8A29E' },
  muzakkiNama: { fontSize: '22px', fontWeight: 700, color: '#1C1917', marginTop: '-8px' },
  instruction: { fontSize: '13px', color: '#78716C', lineHeight: 1.5 },
  detailBox: { background: '#F8F4ED', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', border: '1px solid #EDE8E0' },
  detailRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #EDE8E0' },
  detailLabel: { fontSize: '12px', fontWeight: 600, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.3px' },
  detailValue: { fontSize: '14px', fontWeight: 600, color: '#1C1917' },
  statusBadge: { fontSize: '12px', fontWeight: 600, color: '#92681A', background: '#FDF8EE', padding: '4px 10px', borderRadius: '20px' },
  errorText: { fontSize: '13px', color: '#B91C1C', fontWeight: 500 },
  konfirmasiBtn: { width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #2D7A50, #1A4731)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit' },
  konfirmasiBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  footerNote: { fontSize: '12px', color: '#C4BDB4', textAlign: 'center', lineHeight: 1.6 },
}
