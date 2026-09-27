'use client'

import React, { useState } from 'react'
import { shared } from '@/styles/shared'
import { colors, font, radius } from '@/styles/tokens'

interface Props {
  namaBank: string | null
  nomorRekening: string | null
  atasNamaRekening: string | null
  nominal: string
  onLanjut: () => void
}

export default function RekeningModal({ namaBank, nomorRekening, atasNamaRekening, nominal, onLanjut }: Props) {
  const [copied, setCopied] = useState(false)
  const sudahDiatur = !!nomorRekening

  async function handleCopy() {
    if (!nomorRekening) return
    try {
      await navigator.clipboard.writeText(nomorRekening)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API bisa gagal di beberapa browser/HTTP non-secure -- diamkan,
      // amil masih bisa salin manual dari teks yang ditampilkan.
    }
  }

  return (
    <div style={{ ...shared.overlay, zIndex: 200, padding: '24px' }}>
      <div style={{ ...shared.modal, borderRadius: radius.xxl, maxWidth: '380px' }}>
        <div style={shared.modalHeader}>
          <div>
            <h2 style={shared.modalTitle}>🏦 Info Rekening Transfer</h2>
            <p style={shared.modalSub}>Sampaikan rekening ini ke muzakki untuk transfer</p>
          </div>
        </div>

        <div style={s.body}>
          <p style={s.nominal}>{nominal}</p>

          {sudahDiatur ? (
            <div style={s.rekeningBox}>
              <div style={s.rekeningRow}>
                <span style={s.rekeningLabel}>Bank</span>
                <span style={s.rekeningValue}>{namaBank || '—'}</span>
              </div>
              <div style={s.rekeningRow}>
                <span style={s.rekeningLabel}>No. Rekening</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={s.rekeningNomor}>{nomorRekening}</span>
                  <button type="button" onClick={handleCopy} style={s.copyBtn}>
                    {copied ? '✓ Disalin' : 'Salin'}
                  </button>
                </div>
              </div>
              <div style={{ ...s.rekeningRow, borderBottom: 'none' }}>
                <span style={s.rekeningLabel}>Atas Nama</span>
                <span style={s.rekeningValue}>{atasNamaRekening || '—'}</span>
              </div>
            </div>
          ) : (
            <div style={shared.errorBox}>
              ⚠ Rekening bank belum diatur. Atur di halaman Profil supaya info ini muncul otomatis lain kali.
            </div>
          )}

          <div style={s.statusBox}>
            <p style={s.statusTitle}>Status transaksi: Belum dibayar</p>
            <p style={s.statusDesc}>
              Transaksi ini <strong>belum dihitung</strong> sebagai dana masuk. Setelah dana benar-benar
              masuk ke rekening, konfirmasi lewat halaman <strong>Transaksi</strong>.
            </p>
          </div>

          <button onClick={onLanjut} style={{ ...shared.btnPrimary, width: '100%' }}>
            Lanjut →
          </button>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  body: { padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  nominal: { fontSize: '22px', fontWeight: 700, color: colors.primary, textAlign: 'center' },
  rekeningBox: { background: colors.surfaceAlt, borderRadius: radius.md, padding: '4px 14px', border: `1px solid ${colors.border}` },
  rekeningRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${colors.border}` },
  rekeningLabel: { fontSize: font.sm, color: colors.textSubtle, fontWeight: 600 },
  rekeningValue: { fontSize: font.base, color: colors.text, fontWeight: 600, textAlign: 'right' },
  rekeningNomor: { fontSize: font.md, color: colors.text, fontWeight: 700, letterSpacing: '0.5px' },
  copyBtn: {
    padding: '4px 10px', fontSize: font.xs, fontWeight: 700, color: colors.primary,
    background: colors.primaryLight, border: `1px solid ${colors.primary}`, borderRadius: radius.sm,
    cursor: 'pointer', fontFamily: font.family, flexShrink: 0,
  },
  statusBox: {
    width: '100%', boxSizing: 'border-box', background: colors.surfaceAlt,
    borderRadius: radius.md, padding: '12px 14px',
  },
  statusTitle: { fontSize: font.base, fontWeight: 700, color: colors.textMuted, marginBottom: '4px' },
  statusDesc: { fontSize: font.sm, color: colors.textSubtle, lineHeight: 1.5 },
}
