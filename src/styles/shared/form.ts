import type React from 'react'
import { colors, font, radius, spacing } from '../tokens'

// ── Form elements & search ───────────────────────────────
export const form: Record<string, React.CSSProperties> = {
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },

  label: {
    fontSize: font.base,
    fontWeight: 600,
    color: '#44403C',
  },

  required: {
    color: '#E11D48',
  },

  input: {
    width: '100%',
    padding: spacing.inputPadding,
    fontSize: font.md,
    border: `1.5px solid ${colors.border}`,
    borderRadius: radius.md,
    outline: 'none',
    fontFamily: font.family,
    color: colors.text,
    background: colors.surfaceAlt,
    boxSizing: 'border-box',
  },

  inputDisabled: {
    background: '#F1F0EE',
    color: colors.textDisabled,
    cursor: 'not-allowed',
  },

  textarea: {
    width: '100%',
    padding: spacing.inputPadding,
    fontSize: font.md,
    border: `1.5px solid ${colors.border}`,
    borderRadius: radius.md,
    outline: 'none',
    fontFamily: font.family,
    color: colors.text,
    background: colors.surfaceAlt,
    boxSizing: 'border-box',
    resize: 'vertical',
  },

  select: {
    width: '100%',
    padding: spacing.inputPadding,
    fontSize: font.md,
    border: `1.5px solid ${colors.border}`,
    borderRadius: radius.md,
    outline: 'none',
    fontFamily: font.family,
    color: colors.text,
    background: colors.surfaceAlt,
    cursor: 'pointer',
    boxSizing: 'border-box',
    minWidth: 0,
  },

  inputWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },

  prefix: {
    position: 'absolute',
    left: '14px',
    fontSize: font.md,
    fontWeight: 600,
    color: colors.textSubtle,
    pointerEvents: 'none',
  },

  suffix: {
    position: 'absolute',
    right: '14px',
    fontSize: font.md,
    fontWeight: 600,
    color: colors.textSubtle,
    pointerEvents: 'none',
  },

  fieldHint: {
    fontSize: font.xs,
    color: colors.textPlaceholder,
  },

  // ── Search ──────────────────────────────────────────────
  searchWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px',
  },

  searchWrapInline: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
  },

  searchInput: {
    width: '100%',
    padding: '11px 40px',
    fontSize: font.md,
    background: colors.surface,
    border: `1.5px solid ${colors.border}`,
    borderRadius: radius.md,
    outline: 'none',
    fontFamily: font.family,
    color: colors.text,
    boxSizing: 'border-box',
  },

  clearBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: colors.textDisabled,
    fontSize: font.base,
    padding: '4px',
  },
}
