import ExcelJS from 'exceljs'
import { colors } from '@/styles/tokens'

/**
 * Penulis & pembaca file Excel untuk seluruh app.
 *
 * Dipusatkan di satu tempat (bukan diduplikasi per halaman seperti
 * `formatTanggal`) karena isinya murni plumbing format file — tidak ada
 * nuansa bisnis yang mungkin perlu beda antar halaman, dan justru penting
 * supaya semua file yang keluar dari sistem ini tampilannya seragam.
 * Alasan yang sama dengan `hooks/useIsMobile.ts`.
 */

export interface KolomExcel {
  header: string
  width: number
}

export interface SheetExcel {
  nama: string
  kolom: KolomExcel[]
  /** Tiap baris di-key pakai `header` kolomnya; key yang tidak ada = sel kosong. */
  baris: Record<string, string | number>[]
}

/** '#2D7A50' → 'FF2D7A50' (ARGB, format yang dipakai OOXML) */
function keArgb(hex: string) {
  return `FF${hex.replace('#', '').toUpperCase()}`
}

// Sengaja TIDAK memakai colors.border ('#EDE8E0') — di layar itu pas, tapi
// sebagai garis tabel Excel yang ikut tercetak nilainya terlalu pucat sampai
// nyaris hilang. colors.textPlaceholder masih senada tapi kebaca.
const WARNA_GARIS = keArgb(colors.textPlaceholder)

const BORDER_TIPIS: Partial<ExcelJS.Borders> = {
  top:    { style: 'thin', color: { argb: WARNA_GARIS } },
  left:   { style: 'thin', color: { argb: WARNA_GARIS } },
  bottom: { style: 'thin', color: { argb: WARNA_GARIS } },
  right:  { style: 'thin', color: { argb: WARNA_GARIS } },
}

function susunSheet(ws: ExcelJS.Worksheet, sheet: SheetExcel) {
  ws.columns = sheet.kolom.map(k => ({ header: k.header, key: k.header, width: k.width }))

  for (const baris of sheet.baris) {
    // Dibaca lewat urutan `kolom`, bukan urutan key di object — supaya posisi
    // kolom tidak pernah bergeser diam-diam kalau bentuk object-nya berubah.
    ws.addRow(Object.fromEntries(sheet.kolom.map(k => [k.header, baris[k.header] ?? ''])))
  }

  const barisHeader = ws.getRow(1)
  barisHeader.font = { bold: true, color: { argb: keArgb(colors.surface) }, size: 11 }
  barisHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: keArgb(colors.primary) } }
  barisHeader.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  barisHeader.height = 26

  ws.eachRow((row, nomor) => {
    row.eachCell({ includeEmpty: true }, cell => {
      cell.border = BORDER_TIPIS
      if (nomor > 1) {
        cell.alignment = { vertical: 'middle', wrapText: true }
        // Zebra tipis: baris genap diberi latar, biar mata tidak lompat baris
        // saat membaca tabel panjang (daftar mustahik bisa ratusan baris).
        if (nomor % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: keArgb(colors.surfaceAlt) } }
        }
      }
    })
  })

  // Header tetap terlihat saat di-scroll, plus dropdown filter bawaan Excel.
  ws.views = [{ state: 'frozen', ySplit: 1 }]
  if (sheet.baris.length > 0) {
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.kolom.length } }
  }
}

/** Menulis workbook bergaya (header brand + border + zebra) lalu memicu unduhan. */
export async function unduhExcel(namaFile: string, sheets: SheetExcel[]) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Sistem Zakat'
  wb.created = new Date()

  for (const sheet of sheets) {
    susunSheet(wb.addWorksheet(sheet.nama), sheet)
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = namaFile
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Membaca sheet pertama sebuah file Excel jadi array object ber-key nama kolom
 * (baris pertama dianggap header). Nilai dikembalikan sebagai string yang sudah
 * di-trim, karena semua pemakainya memang butuh teks — bukan angka mentah.
 */
export async function bacaExcel(file: File): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())

  const ws = wb.worksheets[0]
  if (!ws) return []

  const headers: string[] = []
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, kolom) => {
    headers[kolom] = String(cell.text ?? '').trim()
  })

  const hasil: Record<string, string>[] = []
  for (let nomor = 2; nomor <= ws.rowCount; nomor++) {
    const row = ws.getRow(nomor)
    const obj: Record<string, string> = {}
    for (let kolom = 1; kolom < headers.length; kolom++) {
      const header = headers[kolom]
      if (!header) continue
      obj[header] = String(row.getCell(kolom).text ?? '').trim()
    }
    hasil.push(obj)
  }
  return hasil
}
