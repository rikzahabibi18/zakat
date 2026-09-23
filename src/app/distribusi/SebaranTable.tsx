'use client'

import React from 'react'
import { shared } from '@/styles/shared'
import { colors, font, radius } from '@/styles/tokens'
import type { SesiRow } from './_lib'

export default function SebaranTable({ rows, isMobile, onChangeUang, onChangeBeras, showBeras }: {
  rows: SesiRow[]
  isMobile: boolean
  onChangeUang: (key: string, value: number) => void
  onChangeBeras?: (key: string, value: number) => void
  showBeras: boolean
}) {
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {rows.map(r => (
          <div key={r.key} style={s.fitrahMobileCard}>
            <div style={s.fitrahMobileHeader}>
              <div>
                <span style={s.fitrahNama}>{r.nama}</span>
                <p style={s.fitrahInputLabel}>{r.namaKeluarga} · {r.peran}</p>
              </div>
              {r.peran === 'Kepala Keluarga' && (
                <span style={{ ...shared.badge, ...shared.badgePrimary }}>KK</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <p style={s.fitrahInputLabel}>Uang (Rp)</p>
                <input type="number" min="0" value={r.jumlah_uang}
                  onChange={e => onChangeUang(r.key, Number(e.target.value) || 0)}
                  style={shared.input} />
              </div>
              {showBeras && (
                <div style={{ flex: 1 }}>
                  <p style={s.fitrahInputLabel}>Beras (Kg)</p>
                  <input type="number" min="0" step="0.01" value={r.jumlah_beras}
                    onChange={e => onChangeBeras?.(r.key, Number(e.target.value) || 0)}
                    style={shared.input} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={shared.tableScrollWrap}>
      <table style={{ ...shared.table, minWidth: showBeras ? '620px' : '480px' }}>
        <thead>
          <tr>
            {['Keluarga', 'Penerima', 'Peran', 'Uang (Rp)', ...(showBeras ? ['Beras (Kg)'] : [])].map(h => (
              <th key={h} style={shared.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key} style={{ background: i % 2 === 0 ? colors.surface : colors.surfaceAlt }}>
              <td style={{ ...shared.td, color: colors.textSubtle }}>{r.namaKeluarga}</td>
              <td style={shared.td}>{r.nama}</td>
              <td style={{ ...shared.td, color: colors.textSubtle, fontSize: font.sm }}>{r.peran}</td>
              <td style={shared.td}>
                <input type="number" min="0" value={r.jumlah_uang}
                  onChange={e => onChangeUang(r.key, Number(e.target.value) || 0)}
                  style={{ ...shared.input, padding: '6px 10px' }} />
              </td>
              {showBeras && (
                <td style={shared.td}>
                  <input type="number" min="0" step="0.01" value={r.jumlah_beras}
                    onChange={e => onChangeBeras?.(r.key, Number(e.target.value) || 0)}
                    style={{ ...shared.input, padding: '6px 10px' }} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  fitrahMobileCard: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  fitrahMobileHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  fitrahNama: { fontWeight: 700, color: colors.text, fontSize: font.md },
  fitrahInputLabel: { fontSize: font.xs, color: colors.textDisabled, marginBottom: '4px' },
}
