'use client'

import React, { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/components/Sidebar'

interface Muzakki { id: number; nama: string }

// 1. Ubah nama fungsi utama menjadi TambahContent (isi logika 100% milikmu)
function TambahContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Baca URL params
  const paramMuzakkiId = searchParams.get('muzakkiId')
  const paramMuzakkiNama = searchParams.get('muzakkiNama')
  const paramStep = searchParams.get('step')

  // Init state dari URL params kalau ada (saat back dari sub-page)
  const [step, setStep] = useState<1 | 2>(paramStep === '2' ? 2 : 1)
  const [selectedMuzakki, setSelectedMuzakki] = useState<Muzakki | null>(
    paramMuzakkiId && paramMuzakkiNama
      ? { id: Number(paramMuzakkiId), nama: paramMuzakkiNama }
      : null
  )
  const [muzakkiSearch, setMuzakkiSearch] = useState(paramMuzakkiNama ?? '')
  const [muzakkiList, setMuzakkiList] = useState<Muzakki[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null)
  const [stepError, setStepError] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('muzakki').select('id, nama').order('nama')
      .then(({ data }) => setMuzakkiList(data ?? []))
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = muzakkiList.filter(m =>
    m.nama.toLowerCase().includes(muzakkiSearch.toLowerCase())
  )

  function handleInputFocus() {
    if (inputRef.current) setDropdownRect(inputRef.current.getBoundingClientRect())
    setShowDropdown(true)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMuzakkiSearch(e.target.value)
    setSelectedMuzakki(null)
    if (inputRef.current) setDropdownRect(inputRef.current.getBoundingClientRect())
    setShowDropdown(true)
  }

  function handleNext() {
    if (!selectedMuzakki) { setStepError('Pilih muzakki terlebih dahulu.'); return }
    setStepError('')
    setStep(2)
  }

  function handlePilihJenis(jenis: 'zakat-mal' | 'zakat-fitrah' | 'infaq') {
    if (!selectedMuzakki) return
    const params = new URLSearchParams({
      muzakkiId: String(selectedMuzakki.id),
      muzakkiNama: selectedMuzakki.nama,
    })
    router.push(`/transaksi/tambah/${jenis}?${params.toString()}`)
  }

  const progress = step === 1 ? 50 : 100

  return (
    <div style={s.shell}>
      <Sidebar />
      <main style={s.main}>
        <div style={s.header}>
          <div>
            <h1 style={s.headerTitle}>Catat Zakat</h1>
            <p style={s.headerSub}>Langkah {step} dari 2</p>
          </div>
          {step === 1 && <button onClick={() => router.push('/transaksi')} style={s.backBtn}>← Kembali</button>}
        </div>

        <div style={s.progressWrap}>
          <div style={s.progressTrack}>
            <div style={{ ...s.progressFill, width: `${progress}%` }} />
          </div>
          <span style={s.progressLabel}>{progress}%</span>
        </div>

        <div style={s.formWrap}>

          {/* Step 1 — Pilih Muzakki */}
          {step === 1 && (
            <div style={s.card}>
              <div style={s.cardHeader}>
                <h2 style={s.cardTitle}>Pilih Muzakki</h2>
                <p style={s.cardSub}>Cari nama muzakki yang akan membayar</p>
              </div>
              <div style={s.cardBody}>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ketik nama muzakki..."
                  value={muzakkiSearch}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  style={s.input}
                  autoFocus
                />
                {selectedMuzakki && (
                  <div style={s.selectedBadge}>✓ {selectedMuzakki.nama} dipilih</div>
                )}
              </div>
            </div>
          )}

          {/* Step 2 — Pilih Jenis Zakat */}
          {step === 2 && (
            <div style={s.card}>
              <div style={s.cardHeader}>
                <h2 style={s.cardTitle}>Pilih Jenis Zakat</h2>
                <p style={s.cardSub}>Muzakki: <strong>{selectedMuzakki?.nama}</strong></p>
              </div>
              <div style={s.cardBody}>
                {([
                  { key: 'zakat-mal',    icon: '🏦', label: 'Zakat Mal',    desc: 'Zakat atas harta, dihitung otomatis dari nisab emas' },
                  { key: 'zakat-fitrah', icon: '🌙', label: 'Zakat Fitrah',  desc: 'Zakat jiwa, standar Jabodetabek Rp 45.000 atau 2.5 Kg/jiwa' },
                  { key: 'infaq',        icon: '🤲', label: 'Infaq/Sedekah', desc: 'Sumbangan sukarela, nominal bebas' },
                ] as const).map(item => (
                  <button key={item.key}
                    onClick={() => handlePilihJenis(item.key)}
                    style={s.jenisCard}>
                    <span style={s.jenisIcon}>{item.icon}</span>
                    <div style={s.jenisText}>
                      <p style={s.jenisLabel}>{item.label}</p>
                      <p style={s.jenisDesc}>{item.desc}</p>
                    </div>
                    <span style={s.jenisArrow}>→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {stepError && <div style={s.errorBox}>⚠ {stepError}</div>}

          <div style={s.navRow}>
            {step === 2 && (
              <button onClick={() => { setStep(1); setStepError('') }} style={s.navBackBtn}>
                ← Kembali
              </button>
            )}
            {step === 1 && (
              <button onClick={handleNext} style={s.navNextBtn}>Lanjut →</button>
            )}
          </div>
        </div>
      </main>

      {showDropdown && muzakkiSearch && dropdownRect && step === 1 && (
        <div style={{
          ...s.dropdown,
          position: 'fixed',
          top: dropdownRect.bottom + 4,
          left: dropdownRect.left,
          width: dropdownRect.width,
        }}>
          {filtered.length === 0
            ? <p style={s.dropdownEmpty}>Tidak ditemukan</p>
            : filtered.map(m => (
              <button key={m.id} style={s.dropdownItem}
                onMouseDown={e => {
                  e.preventDefault()
                  setSelectedMuzakki(m)
                  setMuzakkiSearch(m.nama)
                  setShowDropdown(false)
                }}>
                {m.nama}
              </button>
            ))
          }
        </div>
      )}
    </div>
  )
}

// 2. Eksport utama dibungkus Suspense di paling bawah
export default function TambahPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Loading...</div>}>
      <TambahContent />
    </Suspense>
  )
}

const s: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', minHeight: '100vh', background: '#F8F4ED', fontFamily: "'Plus Jakarta Sans', sans-serif" },
  main: { marginLeft: '220px', flex: 1, padding: '32px 36px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #EDE8E0' },
  headerTitle: { fontSize: '26px', fontWeight: 700, color: '#1C1917', letterSpacing: '-0.5px', marginBottom: '4px' },
  headerSub: { fontSize: '13px', color: '#A8A29E' },
  backBtn: { padding: '9px 16px', fontSize: '13px', fontWeight: 600, color: '#57534E', background: '#fff', border: '1.5px solid #EDE8E0', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' },
  progressWrap: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
  progressTrack: { flex: 1, height: '6px', background: '#EDE8E0', borderRadius: '99px', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #2D7A50, #4CAF7D)', borderRadius: '99px', transition: 'width 0.3s ease' },
  progressLabel: { fontSize: '12px', fontWeight: 600, color: '#A8A29E' },
  formWrap: { maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '16px' },
  card: { background: '#fff', borderRadius: '16px', border: '1px solid #EDE8E0' },
  cardHeader: { padding: '20px 24px 0' },
  cardTitle: { fontSize: '17px', fontWeight: 700, color: '#1C1917', marginBottom: '4px' },
  cardSub: { fontSize: '13px', color: '#A8A29E', marginBottom: '20px' },
  cardBody: { padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { width: '100%', padding: '11px 14px', fontSize: '14px', border: '1.5px solid #EDE8E0', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', color: '#1C1917', background: '#FAFAF9', boxSizing: 'border-box' },
  selectedBadge: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#2D7A50', fontWeight: 600, background: '#F0F7F3', padding: '8px 12px', borderRadius: '8px' },
  dropdown: { background: '#fff', border: '1.5px solid #EDE8E0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 9999, maxHeight: '220px', overflowY: 'auto' },
  dropdownItem: { display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', fontSize: '13.5px', color: '#1C1917', cursor: 'pointer', fontFamily: 'inherit', borderBottom: '1px solid #F5F0E8' },
  dropdownEmpty: { padding: '14px', fontSize: '13px', color: '#A8A29E', textAlign: 'center' },
  jenisCard: { display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', borderRadius: '12px', border: '2px solid #EDE8E0', background: '#FAFAF9', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%' },
  jenisIcon: { fontSize: '28px', flexShrink: 0 },
  jenisText: { flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' },
  jenisLabel: { fontSize: '15px', fontWeight: 700, color: '#1C1917' },
  jenisDesc: { fontSize: '12px', color: '#78716C' },
  jenisArrow: { fontSize: '16px', color: '#C4BDB4', flexShrink: 0 },
  errorBox: { padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', fontSize: '13px', color: '#B91C1C', fontWeight: 500 },
  navRow: { display: 'flex', gap: '10px' },
  navBackBtn: { padding: '12px 20px', fontSize: '14px', fontWeight: 600, color: '#57534E', background: '#fff', border: '1.5px solid #EDE8E0', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' },
  navNextBtn: { flex: 1, padding: '12px 20px', fontSize: '14px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #2D7A50, #1A4731)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' },
}
