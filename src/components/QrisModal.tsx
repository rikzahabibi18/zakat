'use client'

import React from 'react'
import { shared } from '@/styles/shared'
import { colors, font, radius } from '@/styles/tokens'

interface Props {
  qrisImageUrl: string | null
  muzakkiNama: string
  nominal: string
  onSelesai: () => void
}

export default function QrisModal({ qrisImageUrl, muzakkiNama, nominal, onSelesai }: Props) {
  return (
    <div style={{ ...shared.overlay, zIndex: 200, padding: '24px' }}>
      <div style={{ ...shared.modal, borderRadius: radius.xxl, maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={shared.modalHeader}>
          <div>
            <h2 style={shared.modalTitle}>Pembayaran QRIS</h2>
            <p style={shared.modalSub}>Minta muzakki scan kode di bawah ini</p>
          </div>
        </div>

        <div style={s.body}>
          <div>
            <p style={s.muzakkiNama}>{muzakkiNama}</p>
            <p style={s.nominal}>{nominal}</p>
          </div>

          {qrisImageUrl ? (
            <>
              <div style={s.qrWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element -- URL dari Supabase Storage (bucket publik), bukan aset statis; next/image butuh konfigurasi domain tambahan */}
                <img src={qrisImageUrl} alt="Kode QRIS lembaga" style={s.qrImage} />
              </div>
              <div style={s.warningBox}>
                ⚠ QRIS ini statis — nominalnya <strong>tidak otomatis terisi</strong>. Pastikan muzakki
                mengetik sendiri nominal <strong>{nominal}</strong> di aplikasinya.
              </div>
            </>
          ) : (
            <div style={s.errorWrap}>
              <p style={s.errorIcon}>🚫</p>
              <p style={s.errorTitle}>Tidak dapat memunculkan kode QR</p>
              <p style={s.errorDesc}>
                Gambar QRIS lembaga belum di-upload. Buka halaman <strong>Profil</strong> untuk
                mengunggahnya terlebih dahulu.
              </p>
            </div>
          )}

          <div style={s.statusBox}>
            <p style={s.statusTitle}>Status transaksi: Belum dibayar</p>
            <p style={s.statusDesc}>
              Transaksi ini <strong>belum dihitung</strong> sebagai dana masuk. Setelah dana benar-benar
              diterima, konfirmasi lewat halaman <strong>Transaksi</strong>.
            </p>
          </div>

          <button onClick={onSelesai} style={{ ...shared.btnPrimary, width: '100%' }}>
            Selesai
          </button>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  body: { padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  muzakkiNama: { fontSize: font.lg, fontWeight: 700, color: colors.text, textAlign: 'center' },
  nominal: { fontSize: '22px', fontWeight: 700, color: colors.primary, textAlign: 'center', marginTop: '2px' },

  // Kotak 1:1 -- gambar QRIS disarankan 1080x1080 px. objectFit contain supaya
  // gambar dengan rasio lain tetap tidak gepeng (QR gepeng gagal discan).
  qrWrap: {
    width: '100%', aspectRatio: '1 / 1', background: colors.surface, borderRadius: radius.xl,
    padding: '12px', border: `1px solid ${colors.border}`, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  qrImage: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' },

  warningBox: {
    width: '100%', boxSizing: 'border-box', background: colors.goldBg, color: colors.gold,
    borderRadius: radius.md, padding: '10px 12px', fontSize: font.sm, lineHeight: 1.5,
  },
  statusBox: {
    width: '100%', boxSizing: 'border-box', background: colors.surfaceAlt,
    borderRadius: radius.md, padding: '12px 14px',
  },
  statusTitle: { fontSize: font.base, fontWeight: 700, color: colors.textMuted, marginBottom: '4px' },
  statusDesc: { fontSize: font.sm, color: colors.textSubtle, lineHeight: 1.5 },

  errorWrap: {
    width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '6px', padding: '28px 16px', background: colors.surfaceAlt,
    borderRadius: radius.xl, border: `1.5px dashed ${colors.border}`,
  },
  errorIcon: { fontSize: '32px' },
  errorTitle: { fontSize: font.md, fontWeight: 700, color: colors.text, textAlign: 'center' },
  errorDesc: { fontSize: font.sm, color: colors.textSubtle, textAlign: 'center', lineHeight: 1.6 },
}
