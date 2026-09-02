import type React from 'react'
import { colors, font, radius, shadow, spacing } from '../tokens'

// ── Modal / overlay ───────────────────────────────────────
export const modal: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '16px',
  },

  modal: {
    background: colors.surface,
    borderRadius: radius.xl,
    width: '100%',
    boxShadow: shadow.modal,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: `20px ${spacing.cardPadding}`,
    borderBottom: `1px solid ${colors.border}`,
  },

  modalTitle: {
    fontSize: font.xl,
    fontWeight: 700,
    color: colors.text,
    marginBottom: '2px',
  },

  modalSub: {
    fontSize: font.sm,
    color: colors.textDisabled,
  },

  modalBody: {
    padding: spacing.cardPadding,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.fieldGap,
    overflowY: 'auto',
  },

  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: `16px ${spacing.cardPadding}`,
    borderTop: `1px solid ${colors.border}`,
    background: colors.surfaceAlt,
  },

  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: font.xl,
    color: colors.textDisabled,
    cursor: 'pointer',
    padding: '4px',
    flexShrink: 0,
  },
}
