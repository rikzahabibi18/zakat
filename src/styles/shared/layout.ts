import type React from 'react'
import { colors, font } from '../tokens'

// ── Layout & page header ─────────────────────────────────
export const layout: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: colors.bg,
    fontFamily: font.family,
    overflowX: 'hidden',
  },

  main: {
    flex: 1,
    boxSizing: 'border-box',
    minWidth: 0,
    maxWidth: '100%',
    overflowX: 'hidden',
  },

  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    paddingBottom: '20px',
    borderBottom: `1px solid ${colors.border}`,
  },

  headerTitle: {
    fontWeight: 700,
    color: colors.text,
    letterSpacing: '-0.5px',
    marginBottom: '4px',
  },

  headerSub: {
    fontSize: font.base,
    color: colors.textDisabled,
  },

  sectionDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '4px',
  },

  sectionLabel: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '1px',
    color: colors.textPlaceholder,
  },
}
