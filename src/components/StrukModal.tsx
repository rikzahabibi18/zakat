'use client'

import React from 'react'
import { shared } from '@/styles/shared'
import { colors, font, gradient, radius } from '@/styles/tokens'

interface StrukData {
  transaksiId: number
  tanggal: string
  muzakkiNama: string
  jenisZakat: string
  metode: string
  jumlahUang: number
  jumlahBeras: number
  amilPencatat: string
  namaLembaga?: string
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(n)
}

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

async function downloadStruk(data: StrukData) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: [80, 140] })

  const W = 80
  let y = 8

  const center = (text: string, fontSize: number, bold = false) => {
    doc.setFontSize(fontSize)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.text(text, W / 2, y, { align: 'center' })
    y += fontSize * 0.45
  }

  const row = (label: string, value: string) => {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(label, 6, y)
    doc.text(value, W - 6, y, { align: 'right' })
    y += 5
  }

  const line = () => {
    doc.setDrawColor(200)
    doc.line(6, y, W - 6, y)
    y += 4
  }

  // Header
  center(data.namaLembaga ?? 'SISTEM ZAKAT', 11, true)
  y += 2
  center('Tanda Bukti Pembayaran Zakat', 7)
  y += 3
  line()

  // Info transaksi
  row('No. Transaksi', `#${data.transaksiId}`)
  row('Tanggal', formatTanggal(data.tanggal))
  y += 1
  line()

  // Detail
  row('Muzakki', data.muzakkiNama)
  row('Jenis Zakat', data.jenisZakat)
  row('Metode', data.metode)
  y += 1
  line()

  // Nominal
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('NOMINAL', 6, y)
  y += 5

  if (data.jumlahUang > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(formatRupiah(data.jumlahUang), W / 2, y, { align: 'center' })
    y += 7
  }

  if (data.jumlahBeras > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`${data.jumlahBeras} Kg Beras`, W / 2, y, { align: 'center' })
    y += 7
  }

  line()

  // Amil
  row('Dicatat oleh', data.amilPencatat || '-')
  y += 2
  line()

  // Footer
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.text('Jazakallahu khairan atas zakat Anda.', W / 2, y, { align: 'center' })
  y += 5
  doc.text('Semoga menjadi amal yang diterima Allah SWT.', W / 2, y, { align: 'center' })

  const tgl = new Date(data.tanggal).toLocaleDateString('id-ID').replace(/\//g, '-')
  doc.save(`struk-zakat-${data.muzakkiNama.replace(/\s+/g, '-')}-${tgl}.pdf`)
}

interface Props {
  data: StrukData
  onClose: () => void
  onRedirect: () => void
}

export default function StrukModal({ data, onClose, onRedirect }: Props) {
  const [downloading, setDownloading] = React.useState(false)

  async function handleDownload() {
    setDownloading(true)
    await downloadStruk(data)
    setDownloading(false)
  }

  function handleSelesai() {
    onClose()
    onRedirect()
  }

  return (
    <div style={{ ...shared.overlay, zIndex: 200, padding: '24px' }}>
      <div style={{ ...shared.modal, borderRadius: radius.xxl, maxWidth: '400px' }}>
        <div style={s.header}>
          <div style={s.headerIcon}>✓</div>
          <h2 style={s.headerTitle}>Transaksi Berhasil!</h2>
          <p style={s.headerSub}>Zakat telah dicatat. Unduh struk sebagai tanda bukti.</p>
        </div>

        {/* Preview ringkasan */}
        <div style={s.preview}>
          <div style={{ ...shared.konfRow, padding: '10px 0' }}>
            <span style={s.previewLabel}>Muzakki</span>
            <span style={shared.konfValue}>{data.muzakkiNama}</span>
          </div>
          <div style={{ ...shared.konfRow, padding: '10px 0' }}>
            <span style={s.previewLabel}>Jenis</span>
            <span style={shared.konfValue}>{data.jenisZakat}</span>
          </div>
          <div style={{ ...shared.konfRow, padding: '10px 0' }}>
            <span style={s.previewLabel}>Metode</span>
            <span style={shared.konfValue}>{data.metode}</span>
          </div>
          {data.jumlahUang > 0 && (
            <div style={{ ...shared.konfRow, padding: '10px 0', borderBottom: 'none' }}>
              <span style={s.previewLabel}>Nominal</span>
              <span style={{ ...shared.konfValue, color: colors.primary, fontSize: '16px', fontWeight: 700 }}>
                {formatRupiah(data.jumlahUang)}
              </span>
            </div>
          )}
          {data.jumlahBeras > 0 && (
            <div style={{ ...shared.konfRow, padding: '10px 0', borderBottom: 'none' }}>
              <span style={s.previewLabel}>Beras</span>
              <span style={{ ...shared.konfValue, color: colors.gold, fontSize: '16px', fontWeight: 700 }}>
                {data.jumlahBeras} Kg
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={s.actions}>
          <button onClick={handleDownload} disabled={downloading} style={{ ...shared.btnPrimary, padding: '13px' }}>
            {downloading ? '⏳ Menyiapkan PDF...' : '⬇ Unduh Struk PDF'}
          </button>
          <button onClick={handleSelesai} style={s.selesaiBtn}>
            Selesai tanpa struk
          </button>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  header: { background: gradient.primary, padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  headerIcon: { width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, marginBottom: '4px' },
  headerTitle: { fontSize: '18px', fontWeight: 700, color: '#fff', textAlign: 'center' },
  headerSub: { fontSize: font.base, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  preview: { padding: '20px 24px', display: 'flex', flexDirection: 'column' },
  previewLabel: { fontSize: '12px', fontWeight: 600, color: colors.textDisabled, textTransform: 'uppercase', letterSpacing: '0.3px' },
  actions: { padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '10px' },
  selesaiBtn: { width: '100%', padding: '11px', fontSize: '13.5px', fontWeight: 600, color: colors.textSubtle, background: 'none', border: `1.5px solid ${colors.border}`, borderRadius: radius.md, cursor: 'pointer', fontFamily: font.family },
}
