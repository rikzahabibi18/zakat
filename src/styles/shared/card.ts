import type React from 'react'
import { colors, radius } from '../tokens'

// ── Card ──────────────────────────────────────────────────
export const card: Record<string, React.CSSProperties> = {
  card: {
    background: colors.surface,
    borderRadius: radius.xl,
    border: `1px solid ${colors.border}`,
  },

  cardOverflow: {
    background: colors.surface,
    borderRadius: radius.xl,
    border: `1px solid ${colors.border}`,
    overflow: 'hidden',
  },

  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },

  cardHeader: {},

  cardTitle: {
    fontWeight: 700,
    color: colors.text,
    marginBottom: '4px',
  },
}
