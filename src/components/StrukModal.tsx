'use client'

import React from 'react'

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
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <div style={s.headerIcon}>✓</div>
          <h2 style={s.headerTitle}>Transaksi Berhasil!</h2>
          <p style={s.headerSub}>Zakat telah dicatat. Unduh struk sebagai tanda bukti.</p>
        </div>

        {/* Preview ringkasan */}
        <div style={s.preview}>
          <div style={s.previewRow}>
            <span style={s.previewLabel}>Muzakki</span>
            <span style={s.previewValue}>{data.muzakkiNama}</span>
          </div>
          <div style={s.previewRow}>
            <span style={s.previewLabel}>Jenis</span>
            <span style={s.previewValue}>{data.jenisZakat}</span>
          </div>
          <div style={s.previewRow}>
            <span style={s.previewLabel}>Metode</span>
            <span style={s.previewValue}>{data.metode}</span>
          </div>
          {data.jumlahUang > 0 && (
            <div style={{ ...s.previewRow, borderBottom: 'none' }}>
              <span style={s.previewLabel}>Nominal</span>
              <span style={{ ...s.previewValue, color: '#2D7A50', fontSize: '16px', fontWeight: 700 }}>
                {formatRupiah(data.jumlahUang)}
              </span>
            </div>
          )}
          {data.jumlahBeras > 0 && (
            <div style={{ ...s.previewRow, borderBottom: 'none' }}>
              <span style={s.previewLabel}>Beras</span>
              <span style={{ ...s.previewValue, color: '#92681A', fontSize: '16px', fontWeight: 700 }}>
                {data.jumlahBeras} Kg
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={s.actions}>
          <button onClick={handleDownload} disabled={downloading} style={s.downloadBtn}>
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
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '24px' },
  modal: { background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' },
  header: { background: 'linear-gradient(135deg, #2D7A50, #1A4731)', padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  headerIcon: { width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, marginBottom: '4px' },
  headerTitle: { fontSize: '18px', fontWeight: 700, color: '#fff', textAlign: 'center' },
  headerSub: { fontSize: '13px', color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  preview: { padding: '20px 24px', display: 'flex', flexDirection: 'column' },
  previewRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F5F0E8' },
  previewLabel: { fontSize: '12px', fontWeight: 600, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.3px' },
  previewValue: { fontSize: '14px', fontWeight: 600, color: '#1C1917' },
  actions: { padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '10px' },
  downloadBtn: { width: '100%', padding: '13px', fontSize: '14px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #2D7A50, #1A4731)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' },
  selesaiBtn: { width: '100%', padding: '11px', fontSize: '13.5px', fontWeight: 600, color: '#78716C', background: 'none', border: '1.5px solid #EDE8E0', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' },
}
