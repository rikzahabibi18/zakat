import type React from 'react'
import { colors, font, gradient, radius } from '../tokens'

// ── Step-form transaksi: progress, konfirmasi, metode, info/hasil box, opsi toggle ──
export const transaksiForm: Record<string, React.CSSProperties> = {
  progressWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  },

  progressTrack: {
    flex: 1,
    height: '6px',
    background: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    background: gradient.progress,
    borderRadius: radius.full,
    transition: 'width 0.3s ease',
  },

  progressLabel: {
    fontSize: font.sm,
    fontWeight: 600,
    color: colors.textDisabled,
    textTransform: 'capitalize',
  },

  // ── Konfirmasi rows ──
  konfirmasiList: {
    display: 'flex',
    flexDirection: 'column',
  },

  konfRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: `1px solid ${colors.borderLight}`,
  },

  konfLabel: {
    fontSize: font.base,
    color: colors.textSubtle,
    fontWeight: 500,
  },

  konfValue: {
    fontSize: font.md,
    color: colors.text,
    fontWeight: 600,
  },

  // ── Metode buttons ──
  metodeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    borderRadius: radius.md,
    border: `2px solid ${colors.border}`,
    background: colors.surfaceAlt,
    cursor: 'pointer',
    fontFamily: font.family,
    transition: 'all 0.15s',
    width: '100%',
  },

  metodeBtnActive: {
    border: `2px solid ${colors.primary}`,
    background: colors.primaryLight,
  },

  metodeText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    textAlign: 'left',
  },

  metodeLabel: {
    fontWeight: 600,
    color: colors.text,
  },

  metodeHint: {
    fontSize: font.sm,
    color: colors.textSubtle,
  },

  metodeCheck: {
    fontSize: font.md,
    color: colors.primary,
    fontWeight: 700,
  },

  // ── Info box (rate/standar) ──
  infoBox: {
    background: colors.bg,
    borderRadius: radius.md,
    border: `1px solid ${colors.border}`,
  },

  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
  },

  infoLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: colors.textDisabled,
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
    marginBottom: '4px',
  },

  infoValue: {
    fontWeight: 700,
    color: colors.text,
  },

  // ── Hasil box (preview kalkulasi) ──
  hasilBox: {
    background: colors.primaryLight,
    borderRadius: radius.md,
    border: `1.5px solid ${colors.primary}`,
  },

  hasilTitle: {
    fontSize: font.base,
    fontWeight: 700,
    color: colors.primaryDark,
    marginBottom: '12px',
  },

  hasilGrid: {
    display: 'flex',
    alignItems: 'stretch',
  },

  hasilItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  hasilDivider: {
    width: '1px',
    background: colors.primaryBorder,
    margin: '0 16px',
  },

  hasilDividerH: {
    height: '1px',
    background: colors.primaryBorder,
    width: '100%',
  },

  hasilItemLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },

  hasilItemValue: {
    fontWeight: 700,
    color: colors.primary,
  },

  // ── Opsi toggle (zakat mal, zakat fitrah) ──
  opsiBtn: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px',
    borderRadius: radius.md,
    border: `2px solid ${colors.border}`,
    background: colors.surfaceAlt,
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: font.family,
    transition: 'all 0.15s',
    width: '100%',
  },

  opsiBtnActive: {
    border: `2px solid ${colors.primary}`,
    background: colors.primaryLight,
  },

  opsiIcon: {
    fontSize: '20px',
    flexShrink: 0,
    marginTop: '2px',
  },

  opsiLabel: {
    fontSize: font.base,
    fontWeight: 700,
    color: colors.text,
    marginBottom: '2px',
  },

  opsiDesc: {
    fontSize: '11px',
    color: colors.textSubtle,
  },
}
