import type React from 'react'
import { colors, font, gradient, radius } from '../tokens'

// ── Buttons ───────────────────────────────────────────────
export const button: Record<string, React.CSSProperties> = {
  btnPrimary: {
    width: '100%',
    padding: '11px',
    fontSize: font.md,
    fontWeight: 700,
    color: '#fff',
    background: gradient.primary,
    border: 'none',
    borderRadius: radius.md,
    cursor: 'pointer',
    fontFamily: font.family,
  },

  btnSecondary: {
    width: '100%',
    padding: '11px',
    fontSize: font.md,
    fontWeight: 700,
    color: colors.primary,
    background: colors.primaryLight,
    border: `1.5px solid ${colors.primary}`,
    borderRadius: radius.md,
    cursor: 'pointer',
    fontFamily: font.family,
  },

  btnOutline: {
    padding: '9px 18px',
    fontSize: font.base,
    fontWeight: 600,
    color: colors.textMuted,
    background: colors.surface,
    border: `1.5px solid ${colors.border}`,
    borderRadius: radius.sm,
    cursor: 'pointer',
    fontFamily: font.family,
  },

  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },

  // Nav buttons (dipakai di step form)
  navBackBtn: {
    padding: '12px 20px',
    fontSize: font.md,
    fontWeight: 600,
    color: colors.textMuted,
    background: colors.surface,
    border: `1.5px solid ${colors.border}`,
    borderRadius: radius.md,
    cursor: 'pointer',
    fontFamily: font.family,
  },

  navNextBtn: {
    flex: 1,
    padding: '12px 20px',
    fontSize: font.md,
    fontWeight: 700,
    color: '#fff',
    background: gradient.primary,
    border: 'none',
    borderRadius: radius.md,
    cursor: 'pointer',
    fontFamily: font.family,
  },

  navRow: {
    display: 'flex',
    gap: '10px',
  },

  // Save button (konfirmasi akhir)
  saveBtn: {
    width: '100%',
    padding: '14px',
    fontSize: font.lg,
    fontWeight: 700,
    color: '#fff',
    background: gradient.primary,
    border: 'none',
    borderRadius: radius.lg,
    cursor: 'pointer',
    fontFamily: font.family,
    marginTop: '8px',
  },
}
