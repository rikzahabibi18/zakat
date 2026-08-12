'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import QRCode from 'qrcode'

interface Props {
  transaksiId: number
  muzakkiNama: string
  nominal: string
  onClose: () => void
}

export default function QRConfirmModal({ transaksiId, muzakkiNama, nominal, onClose }: Props) {
  const supabase = createClient()
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [status, setStatus] = useState<'pending' | 'terkonfirmasi'>('pending')
  const [localUrl, setLocalUrl] = useState('')

  useEffect(() => {
    // Buat URL konfirmasi — pakai IP lokal supaya bisa diakses dari HP
    const baseUrl = window.location.origin
    const konfirmasiUrl = `${baseUrl}/konfirmasi/${transaksiId}`
    // eslint-disable-next-line react-hooks/set-state-in-effect -- window hanya tersedia di client, wajib dihitung dalam effect untuk hindari hydration mismatch
    setLocalUrl(konfirmasiUrl)

    // Generate QR code
    QRCode.toDataURL(konfirmasiUrl, {
      width: 240,
      margin: 2,
      color: { dark: '#1A4731', light: '#FFFFFF' },
    }).then(url => setQrDataUrl(url))

    // Subscribe realtime — detect kalau muzakki sudah konfirmasi
    const channel = supabase
      .channel(`transaksi-${transaksiId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transaksi',
          filter: `id=eq.${transaksiId}`,
        },
        (payload) => {
          if (payload.new.status === 'terkonfirmasi') {
            setStatus('terkonfirmasi')
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [transaksiId])

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {status === 'terkonfirmasi' ? (
          // State: sudah dikonfirmasi
          <div style={s.successWrap}>
            <div style={s.successIcon}>✓</div>
            <p style={s.successTitle}>Pembayaran Terkonfirmasi!</p>
            <p style={s.successDesc}>{muzakkiNama} telah mengkonfirmasi pembayaran.</p>
            <button onClick={onClose} style={s.closeBtn}>Selesai</button>
          </div>
        ) : (
          // State: menunggu konfirmasi
          <>
            <div style={s.header}>
              <p style={s.headerTitle}>Scan QR untuk Konfirmasi</p>
              <button onClick={onClose} style={s.xBtn}>✕</button>
            </div>

            <div style={s.body}>
              <p style={s.muzakkiNama}>{muzakkiNama}</p>
              <p style={s.nominal}>{nominal}</p>

              {qrDataUrl ? (
                <div style={s.qrWrap}>
                  <img src={qrDataUrl} alt="QR Konfirmasi" style={s.qrImage} />
                </div>
              ) : (
                <div style={s.qrWrap}>
                  <div style={s.qrLoading}>Generating QR...</div>
                </div>
              )}

              <div style={s.statusRow}>
                <div style={s.statusDot} />
                <p style={s.statusText}>Menunggu konfirmasi dari muzakki...</p>
              </div>

              <div style={s.urlBox}>
                <p style={s.urlLabel}>Atau buka URL ini dari HP:</p>
                <p style={s.urlText}>{localUrl}</p>
              </div>

              <p style={s.hint}>
                Pastikan HP muzakki terhubung ke WiFi yang sama.<br />
                Halaman ini akan update otomatis saat dikonfirmasi.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '24px' },
  modal: { background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '380px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #EDE8E0' },
  headerTitle: { fontSize: '15px', fontWeight: 700, color: '#1C1917' },
  xBtn: { background: 'none', border: 'none', fontSize: '16px', color: '#A8A29E', cursor: 'pointer', padding: '4px' },
  body: { padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  muzakkiNama: { fontSize: '16px', fontWeight: 700, color: '#1C1917', textAlign: 'center' },
  nominal: { fontSize: '22px', fontWeight: 700, color: '#2D7A50', textAlign: 'center', marginTop: '-8px' },
  qrWrap: { background: '#F8F4ED', borderRadius: '16px', padding: '16px', border: '1px solid #EDE8E0' },
  qrImage: { width: '200px', height: '200px', display: 'block' },
  qrLoading: { width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#A8A29E' },
  statusRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#C9A84C', animation: 'pulse 1.5s infinite' },
  statusText: { fontSize: '13px', color: '#78716C' },
  urlBox: { background: '#F8F4ED', borderRadius: '10px', padding: '12px 14px', width: '100%', boxSizing: 'border-box' },
  urlLabel: { fontSize: '11px', fontWeight: 600, color: '#A8A29E', marginBottom: '4px' },
  urlText: { fontSize: '12px', color: '#2D7A50', fontWeight: 600, wordBreak: 'break-all' },
  hint: { fontSize: '12px', color: '#C4BDB4', textAlign: 'center', lineHeight: 1.6 },
  successWrap: { padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  successIcon: { width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #2D7A50, #1A4731)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 700 },
  successTitle: { fontSize: '20px', fontWeight: 700, color: '#1A4731' },
  successDesc: { fontSize: '14px', color: '#57534E', textAlign: 'center' },
  closeBtn: { marginTop: '8px', padding: '12px 32px', fontSize: '14px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #2D7A50, #1A4731)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' },
}
