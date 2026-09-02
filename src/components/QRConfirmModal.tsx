'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import QRCode from 'qrcode'
import { shared } from '@/styles/shared'
import { colors, font, gradient, radius } from '@/styles/tokens'

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
      color: { dark: colors.primaryDark, light: colors.surface },
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
    <div style={{ ...shared.overlay, zIndex: 200, padding: '24px' }} onClick={onClose}>
      <div style={{ ...shared.modal, borderRadius: radius.xxl, maxWidth: '380px' }} onClick={e => e.stopPropagation()}>

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
            <div style={{ ...shared.modalHeader, alignItems: 'center' }}>
              <p style={s.headerTitle}>Scan QR untuk Konfirmasi</p>
              <button onClick={onClose} style={shared.closeBtn}>✕</button>
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
  headerTitle: { fontSize: font.lg, fontWeight: 700, color: colors.text },
  body: { padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  muzakkiNama: { fontSize: font.xl, fontWeight: 700, color: colors.text, textAlign: 'center' },
  nominal: { fontSize: '22px', fontWeight: 700, color: colors.primary, textAlign: 'center', marginTop: '-8px' },
  qrWrap: { background: colors.bg, borderRadius: radius.xl, padding: '16px', border: `1px solid ${colors.border}` },
  qrImage: { width: '200px', height: '200px', display: 'block' },
  qrLoading: { width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: font.base, color: colors.textDisabled },
  statusRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%', background: colors.goldBorder, animation: 'pulse 1.5s infinite' },
  statusText: { fontSize: font.base, color: colors.textSubtle },
  urlBox: { background: colors.bg, borderRadius: radius.md, padding: '12px 14px', width: '100%', boxSizing: 'border-box' },
  urlLabel: { fontSize: '11px', fontWeight: 600, color: colors.textDisabled, marginBottom: '4px' },
  urlText: { fontSize: font.sm, color: colors.primary, fontWeight: 600, wordBreak: 'break-all' },
  hint: { fontSize: font.sm, color: colors.textPlaceholder, textAlign: 'center', lineHeight: 1.6 },
  successWrap: { padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  successIcon: { width: '72px', height: '72px', borderRadius: '50%', background: gradient.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 700 },
  successTitle: { fontSize: '20px', fontWeight: 700, color: colors.primaryDark },
  successDesc: { fontSize: font.md, color: colors.textMuted, textAlign: 'center' },
  closeBtn: { marginTop: '8px', padding: '12px 32px', fontSize: font.md, fontWeight: 700, color: '#fff', background: gradient.primary, border: 'none', borderRadius: radius.md, cursor: 'pointer', fontFamily: font.family },
}
