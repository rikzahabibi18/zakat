import type React from 'react'
import { colors, font, radius } from '../tokens'

// ── Feedback boxes, loading & empty states ───────────────
export const feedback: Record<string, React.CSSProperties> = {
  errorBox: {
    padding: '12px 16px',
    background: colors.dangerBg,
    border: `1px solid ${colors.dangerBorder}`,
    borderRadius: radius.md,
    fontSize: font.base,
    color: colors.danger,
    fontWeight: 500,
  },

  successBox: {
    padding: '12px 14px',
    background: colors.primaryLight,
    border: `1px solid ${colors.primaryBorder}`,
    borderRadius: radius.md,
    fontSize: font.base,
    color: colors.primary,
    fontWeight: 500,
  },

  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '300px',
    gap: '16px',
  },

  spinner: {
    width: '28px',
    height: '28px',
    border: `3px solid ${colors.border}`,
    borderTop: `3px solid ${colors.primary}`,
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },

  loadingText: {
    fontSize: font.md,
    color: colors.textDisabled,
  },

  centerState: {
    padding: '64px 32px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },

  stateTitle: {
    fontSize: font.lg,
    fontWeight: 600,
    color: colors.textMuted,
  },

  stateText: {
    fontSize: font.base,
    color: colors.textDisabled,
  },

  emptyIcon: {
    fontSize: '32px',
    marginBottom: '4px',
  },
}
