'use client'

import React, { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useIsMobile } from '@/hooks/useIsMobile'
import Sidebar from '@/components/Sidebar'
import { shared } from '@/styles/shared'
import { colors, font } from '@/styles/tokens'

interface Muzakki {
  id: number
  nama: string
  nomor_hp?: string | null
  alamat?: string | null
}

interface MuzakkiBaru {
  nama: string
  nomor_hp: string
  alamat: string
}

function TambahContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const isMobile = useIsMobile()

  const paramMuzakkiId = searchParams.get('muzakkiId')
  const paramMuzakkiNama = searchParams.get('muzakkiNama')
  const paramStep = searchParams.get('step')

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

  // State modal tambah muzakki baru
  const [showModal, setShowModal] = useState(false)
  const [modalForm, setModalForm] = useState<MuzakkiBaru>({ nama: '', nomor_hp: '', alamat: '' })
  const [savingModal, setSavingModal] = useState(false)
  const [modalError, setModalError] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('muzakki').select('id, nama, nomor_hp, alamat').order('nama')
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

  function handlePilihJenis(jenis: 'zakat-mal' | 'zakat-fitrah' | 'infaq' | 'fidyah') {
    if (!selectedMuzakki) return
    const params = new URLSearchParams({
      muzakkiId: String(selectedMuzakki.id),
      muzakkiNama: selectedMuzakki.nama,
    })
    router.push(`/transaksi/tambah/${jenis}?${params.toString()}`)
  }

  function handleBukaMmodal() {
    setModalForm({
      nama: muzakkiSearch.trim(),
      nomor_hp: '',
      alamat: '',
    })
    setModalError('')
    setShowDropdown(false)
    setShowModal(true)
  }

  function handleTutupModal() {
    setShowModal(false)
    setModalError('')
  }

  async function handleSimpanMuzakkiBaru() {
    if (!modalForm.nama.trim()) { setModalError('Nama wajib diisi.'); return }

    setSavingModal(true)
    setModalError('')

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profil } = await supabase
      .from('profil_amil').select('lembaga_id').eq('id', user!.id).single()

    const { data, error } = await supabase.from('muzakki').insert({
      nama: modalForm.nama.trim(),
      nomor_hp: modalForm.nomor_hp.trim() || null,
      alamat: modalForm.alamat.trim() || null,
      lembaga_id: profil?.lembaga_id ?? null,
    }).select('id, nama').single()

    setSavingModal(false)

    if (error || !data) {
      setModalError('Gagal menyimpan. Coba lagi.')
      return
    }

    const muzakkiBaru: Muzakki = { id: data.id, nama: data.nama }
    setMuzakkiList(prev => [...prev, muzakkiBaru].sort((a, b) => a.nama.localeCompare(b.nama)))

    setShowModal(false)
    setSelectedMuzakki(muzakkiBaru)
    setMuzakkiSearch(muzakkiBaru.nama)
    setStepError('')
    setStep(2)
  }

  const progress = step === 1 ? 50 : 100
  const cardPad = isMobile ? '16px 16px 0' : '20px 24px 0'
  const bodyPad = isMobile ? '0 16px 16px' : '0 24px 24px'

  return (
    <div style={shared.shell}>
      <Sidebar />
      <main style={{
        ...shared.main,
        marginLeft: isMobile ? 0 : '220px',
        padding: isMobile ? '84px 16px 24px' : '32px 36px',
      }}>

        {/* Header */}
        <div style={{
          ...shared.pageHeader,
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'flex-start',
          gap: isMobile ? '12px' : 0,
        }}>
          <div>
            <h1 style={{ ...shared.headerTitle, fontSize: isMobile ? font.h2 : font.h1 }}>
              Catat ZIS
            </h1>
            <p style={shared.headerSub}>Langkah {step} dari 2</p>
          </div>
          {step === 1 && (
            <button
              onClick={() => router.push('/transaksi')}
              style={{ ...shared.btnOutline, width: isMobile ? '100%' : 'auto' }}
            >
              ← Kembali
            </button>
          )}
        </div>

        {/* Progress */}
        <div style={shared.progressWrap}>
          <div style={shared.progressTrack}>
            <div style={{ ...shared.progressFill, width: `${progress}%` }} />
          </div>
          <span style={shared.progressLabel}>{progress}%</span>
        </div>

        <div style={{ ...s.formWrap, maxWidth: isMobile ? '100%' : '560px' }}>

          {/* Step 1 — Pilih Muzakki */}
          {step === 1 && (
            <div style={shared.cardOverflow}>
              <div style={{ ...s.cardHeader, padding: cardPad }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : font.h3 }}>Pilih Muzakki</h2>
                <p style={s.cardSub}>Cari nama muzakki yang akan membayar</p>
              </div>
              <div style={{ ...shared.cardBody, padding: bodyPad, gap: '12px' }}>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ketik nama muzakki..."
                  value={muzakkiSearch}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  style={{ ...shared.input, fontSize: isMobile ? font.xl : font.md }}
                  autoFocus={!isMobile}
                />

                {selectedMuzakki && (
                  <div style={shared.successBox}>
                    ✓ {selectedMuzakki.nama} dipilih
                  </div>
                )}

                {/* Tombol tambah muzakki baru */}
                {muzakkiSearch.trim() && !selectedMuzakki && (
                  <button
                    onClick={handleBukaMmodal}
                    style={s.tambahBaruBtn}
                  >
                    <span style={s.tambahBaruIcon}>＋</span>
                    <div>
                      <p style={s.tambahBaruLabel}>Tambah &quot;{muzakkiSearch.trim()}&quot; sebagai muzakki baru</p>
                      <p style={s.tambahBaruDesc}>Data akan tersimpan di halaman Muzakki</p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 2 — Pilih Jenis Zakat */}
          {step === 2 && (
            <div style={shared.cardOverflow}>
              <div style={{ ...s.cardHeader, padding: cardPad }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15.5px' : font.h3 }}>Pilih Jenis Zakat</h2>
                <p style={s.cardSub}>Muzakki: <strong>{selectedMuzakki?.nama}</strong></p>
              </div>
              <div style={{ ...shared.cardBody, padding: bodyPad, gap: '12px' }}>
                {([
                  { key: 'zakat-mal',    icon: '🏦', label: 'Zakat Mal',     desc: 'Zakat atas harta, dihitung otomatis dari nisab emas' },
                  { key: 'zakat-fitrah', icon: '🌙', label: 'Zakat Fitrah',  desc: 'Zakat jiwa, standar Jabodetabek Rp 45.000 atau 2.5 Kg/jiwa' },
                  { key: 'fidyah',       icon: '🍚', label: 'Fidyah',        desc: 'Pengganti puasa, Rp 65.000 per hari' },
                  { key: 'infaq',        icon: '🤲', label: 'Infaq/Sedekah', desc: 'Sumbangan sukarela, nominal bebas' },
                ] as const).map(item => (
                  <button key={item.key}
                    onClick={() => handlePilihJenis(item.key)}
                    style={{
                      ...shared.metodeBtn,
                      padding: isMobile ? '13px' : '16px',
                      gap: isMobile ? '11px' : '14px',
                    }}>
                    <span style={{ fontSize: isMobile ? '24px' : '28px', flexShrink: 0 }}>{item.icon}</span>
                    <div style={shared.metodeText}>
                      <p style={{ ...shared.metodeLabel, fontSize: isMobile ? font.md : font.lg }}>{item.label}</p>
                      <p style={{ ...shared.metodeHint, fontSize: isMobile ? font.xs : font.sm }}>{item.desc}</p>
                    </div>
                    <span style={{ fontSize: font.xl, color: colors.textPlaceholder, flexShrink: 0 }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {stepError && <div style={shared.errorBox}>⚠ {stepError}</div>}

          <div style={{ ...shared.navRow, flexDirection: isMobile ? 'column' : 'row' }}>
            {step === 2 && (
              <button onClick={() => { setStep(1); setStepError('') }} style={{ ...shared.navBackBtn, width: isMobile ? '100%' : 'auto' }}>
                ← Kembali
              </button>
            )}
            {step === 1 && (
              <button onClick={handleNext} style={shared.navNextBtn}>Lanjut →</button>
            )}
          </div>
        </div>
      </main>

      {/* Dropdown search muzakki */}
      {showDropdown && muzakkiSearch && dropdownRect && step === 1 && (
        <div style={{
          ...shared.dropdown,
          position: 'fixed',
          top: dropdownRect.bottom + 4,
          left: dropdownRect.left,
          width: dropdownRect.width,
        }}>
          {filtered.length === 0
            ? <p style={shared.dropdownEmpty}>Tidak ditemukan — gunakan tombol di bawah untuk menambahkan</p>
            : filtered.map(m => (
              <button key={m.id} style={shared.dropdownItem}
                onMouseDown={e => {
                  e.preventDefault()
                  setSelectedMuzakki(m)
                  setMuzakkiSearch(m.nama)
                  setShowDropdown(false)
                }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                  <span style={{ fontWeight: 600, color: colors.text }}>{m.nama}</span>
                  {(m.alamat || m.nomor_hp) && (
                    <span style={{ fontSize: font.xs, color: colors.textSubtle }}>
                      {m.alamat ? `📍 ${m.alamat}` : ''} {m.alamat && m.nomor_hp ? '•' : ''} {m.nomor_hp ? `📱 ${m.nomor_hp}` : ''}
                    </span>
                  )}
                </div>
              </button>
            ))
          }
        </div>
      )}

      {/* Modal Tambah Muzakki Baru */}
      {showModal && (
        <div style={shared.overlay} onClick={handleTutupModal}>
          <div
            style={{
              ...shared.modal,
              maxWidth: isMobile ? '100%' : '440px',
              margin: isMobile ? '0' : undefined,
              maxHeight: isMobile ? '100dvh' : '90vh',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={shared.modalHeader}>
              <div>
                <h2 style={shared.modalTitle}>Tambah Muzakki Baru</h2>
                <p style={shared.modalSub}>Data akan tersimpan di halaman Muzakki</p>
              </div>
              <button onClick={handleTutupModal} style={shared.closeBtn}>✕</button>
            </div>

            <div style={shared.modalBody}>
              <div style={shared.field}>
                <label style={shared.label}>Nama <span style={shared.required}>*</span></label>
                <input
                  type="text"
                  placeholder="Nama lengkap muzakki"
                  value={modalForm.nama}
                  onChange={e => setModalForm(f => ({ ...f, nama: e.target.value }))}
                  style={{ ...shared.input, fontSize: isMobile ? font.xl : font.md }}
                  autoFocus
                />
              </div>
              <div style={shared.field}>
                <label style={shared.label}>Nomor HP</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={13}
                  placeholder="08xxxxxxxxxx (opsional)"
                  value={modalForm.nomor_hp}
                  onChange={e => setModalForm(f => ({ ...f, nomor_hp: e.target.value.replace(/\D/g, '').slice(0, 13) }))}
                  style={{ ...shared.input, fontSize: isMobile ? font.xl : font.md }}
                />
              </div>
              <div style={shared.field}>
                <label style={shared.label}>Alamat</label>
                <textarea
                  placeholder="Alamat lengkap (opsional)"
                  value={modalForm.alamat}
                  onChange={e => setModalForm(f => ({ ...f, alamat: e.target.value }))}
                  style={{ ...shared.textarea, fontSize: isMobile ? font.xl : font.md }}
                  rows={2}
                />
              </div>

              {modalError && <div style={shared.errorBox}>⚠ {modalError}</div>}
            </div>

            <div style={{
              ...shared.modalFooter,
              flexDirection: isMobile ? 'column-reverse' : 'row',
            }}>
              <button
                onClick={handleTutupModal}
                style={{ ...shared.btnOutline, width: isMobile ? '100%' : 'auto' }}
              >
                Batal
              </button>
              <button
                onClick={handleSimpanMuzakkiBaru}
                disabled={savingModal}
                style={{
                  ...shared.navNextBtn,
                  width: isMobile ? '100%' : 'auto',
                  ...(savingModal ? shared.btnDisabled : {}),
                  flex: 'none',
                  padding: '11px 24px',
                }}
              >
                {savingModal ? 'Menyimpan...' : '✓ Simpan & Lanjut →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TambahPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Loading...</div>}>
      <TambahContent />
    </Suspense>
  )
}

const s: Record<string, React.CSSProperties> = {
  formWrap: { display: 'flex', flexDirection: 'column', gap: '16px' },
  cardHeader: {},
  cardTitle: { fontWeight: 700, color: colors.text, marginBottom: '4px' },
  cardSub: { fontSize: font.base, color: colors.textDisabled, marginBottom: '20px' },
  tambahBaruBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '10px',
    border: `1.5px dashed ${colors.primary}`,
    background: colors.primaryLight,
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: font.family,
    width: '100%',
    transition: 'all 0.15s',
  },
  tambahBaruIcon: { fontSize: '20px', color: colors.primary, fontWeight: 700, flexShrink: 0 },
  tambahBaruLabel: { fontSize: font.base, fontWeight: 600, color: colors.primary, marginBottom: '2px' },
  tambahBaruDesc: { fontSize: font.xs, color: colors.textSubtle },
}
