import type React from 'react'
import { colors, font, radius } from '../tokens'

// ── Table & badges ────────────────────────────────────────
export const table: Record<string, React.CSSProperties> = {
  tableCard: {
    background: colors.surface,
    borderRadius: radius.lg,
    border: `1px solid ${colors.border}`,
    overflow: 'hidden',
  },

  tableInfo: {
    padding: '12px 16px',
    borderBottom: `1px solid ${colors.borderLight}`,
    background: colors.surfaceAlt,
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },

  tableCount: {
    fontSize: font.sm,
    fontWeight: 600,
    color: colors.textDisabled,
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: font.base,
  },

  tableScrollWrap: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },

  th: {
    padding: '12px 14px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 700,
    color: colors.textDisabled,
    letterSpacing: '0.5px',
    background: colors.surfaceAlt,
    borderBottom: `1px solid ${colors.border}`,
  },

  td: {
    padding: '11px 14px',
    color: '#44403C',
    borderBottom: `1px solid ${colors.borderLight}`,
  },

  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: radius.full,
    fontSize: '11px',
    fontWeight: 700,
  },

  badgePrimary: {
    background: colors.primaryLight,
    color: colors.primary,
  },

  badgeGold: {
    background: colors.goldBg,
    color: colors.gold,
  },
}
