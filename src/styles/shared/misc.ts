import type React from 'react'
import { colors, font, gradient, radius, shadow } from '../tokens'

// ── Avatar & dropdown ─────────────────────────────────────
export const misc: Record<string, React.CSSProperties> = {
  avatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: gradient.primary,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 700,
    flexShrink: 0,
  },

  dropdown: {
    background: colors.surface,
    border: `1.5px solid ${colors.border}`,
    borderRadius: radius.md,
    boxShadow: shadow.dropdown,
    zIndex: 9999,
    maxHeight: '220px',
    overflowY: 'auto',
  },

  dropdownItem: {
    display: 'block',
    width: '100%',
    padding: '10px 14px',
    textAlign: 'left',
    background: 'none',
    border: 'none',
    fontSize: '13.5px',
    color: colors.text,
    cursor: 'pointer',
    fontFamily: font.family,
    borderBottom: `1px solid ${colors.borderLight}`,
  },

  dropdownEmpty: {
    padding: '14px',
    fontSize: font.base,
    color: colors.textDisabled,
    textAlign: 'center',
  },
}
