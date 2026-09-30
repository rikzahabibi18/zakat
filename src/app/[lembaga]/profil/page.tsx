'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useIsMobile } from '@/hooks/useIsMobile'
import Sidebar from '@/components/Sidebar'
import { shared } from '@/styles/shared'
import { colors, font } from '@/styles/tokens'

interface ProfilForm {
  nama: string
  email: string
  passwordLama: string
  passwordBaru: string
  konfirmasiPassword: string
}

interface LembagaForm {
  nama: string
  alamat: string
  satuan_beras: 'kg' | 'liter'
  zakat_fitrah_kg: number
  harga_beras_per_kg: number
  nama_bank: string
  nomor_rekening: string
  atas_nama_rekening: string
}

// Rasio kepadatan beras (standar BAZNAS: 2.5 kg = 3.5 liter) — nilai fisik, tetap.
const DENSITY_LITER_PER_KG = 3.5 / 2.5 // = 1.4
const DENSITY_KG_PER_LITER = 2.5 / 3.5 // ≈ 0.7143

export default function ProfilPage() {
  const supabase = createClient()
  const isMobile = useIsMobile()

  const [form, setForm] = useState<ProfilForm>({
    nama: '', email: '', passwordLama: '', passwordBaru: '', konfirmasiPassword: '',
  })
  const [lembagaForm, setLembagaForm] = useState<LembagaForm>({
    nama: '', alamat: '', satuan_beras: 'kg', zakat_fitrah_kg: 2.5, harga_beras_per_kg: 18000,
    nama_bank: '', nomor_rekening: '', atas_nama_rekening: '',
  })
  const [lembagaId, setLembagaId] = useState<number | null>(null)
  const [qrisUrl, setQrisUrl] = useState<string | null>(null)
  const [uploadingQris, setUploadingQris] = useState(false)
  const [errorQris, setErrorQris] = useState('')
  const [successQris, setSuccessQris] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingLembaga, setSavingLembaga] = useState(false)
  const [savingPengaturan, setSavingPengaturan] = useState(false)
  const [successProfile, setSuccessProfile] = useState('')
  const [successPassword, setSuccessPassword] = useState('')
  const [successLembaga, setSuccessLembaga] = useState('')
  const [successPengaturan, setSuccessPengaturan] = useState('')
  const [errorProfile, setErrorProfile] = useState('')
  const [errorPassword, setErrorPassword] = useState('')
  const [errorLembaga, setErrorLembaga] = useState('')
  const [errorPengaturan, setErrorPengaturan] = useState('')

  useEffect(() => {
    async function fetchAll() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setForm(f => ({
          ...f,
          email: user.email ?? '',
          nama: user.user_metadata?.nama ?? '',
        }))

        const { data: profil } = await supabase
          .from('profil_amil')
          .select('lembaga_id')
          .eq('id', user.id)
          .single()

        if (profil?.lembaga_id) {
          setLembagaId(profil.lembaga_id)

          const { data: lembaga } = await supabase
            .from('lembaga')
            .select('nama, alamat, satuan_beras, zakat_fitrah_kg, harga_beras_per_kg, nama_bank, nomor_rekening, atas_nama_rekening, qris_image_url')
            .eq('id', profil.lembaga_id)
            .single()

          if (lembaga) {
            setQrisUrl(lembaga.qris_image_url ?? null)
            setLembagaForm({
              nama: lembaga.nama ?? '',
              alamat: lembaga.alamat ?? '',
              satuan_beras: (lembaga.satuan_beras ?? 'kg') as 'kg' | 'liter',
              zakat_fitrah_kg: lembaga.zakat_fitrah_kg ?? 2.5,
              harga_beras_per_kg: lembaga.harga_beras_per_kg ?? 18000,
              nama_bank: lembaga.nama_bank ?? '',
              nomor_rekening: lembaga.nomor_rekening ?? '',
              atas_nama_rekening: lembaga.atas_nama_rekening ?? '',
            })
          }
        }
      }
      setLoading(false)
    }
    fetchAll()
  }, [])

  async function handleSaveProfile() {
    if (!form.nama.trim()) { setErrorProfile('Nama tidak boleh kosong.'); return }
    setSaving(true)
    setErrorProfile('')
    setSuccessProfile('')

    const { error } = await supabase.auth.updateUser({
      data: { nama: form.nama.trim() }
    })

    setSaving(false)
    if (error) { setErrorProfile('Gagal menyimpan profil. Coba lagi.'); return }
    setSuccessProfile('Profil berhasil diperbarui.')
  }

  async function handleSavePassword() {
    if (!form.passwordLama) { setErrorPassword('Masukkan kata sandi saat ini.'); return }
    if (!form.passwordBaru) { setErrorPassword('Masukkan kata sandi baru.'); return }
    if (form.passwordBaru.length < 6) { setErrorPassword('Kata sandi minimal 6 karakter.'); return }
    if (form.passwordBaru !== form.konfirmasiPassword) {
      setErrorPassword('Konfirmasi kata sandi tidak cocok.'); return
    }

    setSavingPassword(true)
    setErrorPassword('')
    setSuccessPassword('')

    // Verifikasi kata sandi lama dulu (re-autentikasi) sebelum benar-benar
    // ganti password -- tanpa ini, siapa pun yang kebetulan pegang tab yang
    // lagi login (komputer bersama, sesi lupa logout) bisa ambil alih akun
    // cuma dengan ganti password, tanpa perlu tahu password lamanya.
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.passwordLama,
    })
    if (authError) {
      setSavingPassword(false)
      setErrorPassword('Kata sandi saat ini salah.')
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: form.passwordBaru
    })

    setSavingPassword(false)
    if (error) { setErrorPassword(error.message || 'Gagal mengubah kata sandi. Coba lagi.'); return }
    setSuccessPassword('Kata sandi berhasil diubah.')
    setForm(f => ({ ...f, passwordLama: '', passwordBaru: '', konfirmasiPassword: '' }))
  }

  async function handleSaveLembaga() {
    if (!lembagaForm.nama.trim()) { setErrorLembaga('Nama lembaga tidak boleh kosong.'); return }
    if (!lembagaId) { setErrorLembaga('Lembaga tidak ditemukan.'); return }

    setSavingLembaga(true)
    setErrorLembaga('')
    setSuccessLembaga('')

    const { error } = await supabase
      .from('lembaga')
      .update({
        nama: lembagaForm.nama.trim(),
        alamat: lembagaForm.alamat.trim() || null,
        nama_bank: lembagaForm.nama_bank.trim() || null,
        nomor_rekening: lembagaForm.nomor_rekening.trim() || null,
        atas_nama_rekening: lembagaForm.atas_nama_rekening.trim() || null,
      })
      .eq('id', lembagaId)

    setSavingLembaga(false)
    if (error) { setErrorLembaga('Gagal menyimpan data lembaga. Coba lagi.'); return }
    setSuccessLembaga('Data lembaga berhasil diperbarui.')
  }

  async function handleUploadQris(file: File) {
    if (!lembagaId) { setErrorQris('Lembaga tidak ditemukan.'); return }
    if (!file.type.startsWith('image/')) { setErrorQris('File harus berupa gambar (PNG/JPG).'); return }
    if (file.size > 2 * 1024 * 1024) { setErrorQris('Ukuran gambar maksimal 2 MB.'); return }

    setUploadingQris(true)
    setErrorQris('')
    setSuccessQris('')

    // Path tetap per lembaga (satu QRIS aktif per lembaga) -- upload ulang
    // menimpa yang lama, jadi tidak ada file nyangkut.
    const path = `${lembagaId}/qris.png`
    const { error: uploadError } = await supabase.storage
      .from('qris')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      setUploadingQris(false)
      setErrorQris('Gagal mengunggah gambar. Coba lagi.')
      return
    }

    // Path-nya sama tiap upload, jadi tanpa cache-buster browser bakal tetap
    // nampilin gambar lama dari cache.
    const { data: pub } = supabase.storage.from('qris').getPublicUrl(path)
    const url = `${pub.publicUrl}?t=${Date.now()}`

    const { error: dbError } = await supabase
      .from('lembaga')
      .update({ qris_image_url: url })
      .eq('id', lembagaId)

    setUploadingQris(false)
    if (dbError) { setErrorQris('Gambar terunggah tapi gagal disimpan. Coba lagi.'); return }

    setQrisUrl(url)
    setSuccessQris('Kode QRIS berhasil diperbarui.')
  }

  async function handleSavePengaturan() {
    if (!lembagaId) { setErrorPengaturan('Lembaga tidak ditemukan.'); return }

    setSavingPengaturan(true)
    setErrorPengaturan('')
    setSuccessPengaturan('')

    const { error } = await supabase
      .from('lembaga')
      .update({
        satuan_beras: lembagaForm.satuan_beras,
        zakat_fitrah_kg: lembagaForm.zakat_fitrah_kg,
        harga_beras_per_kg: lembagaForm.harga_beras_per_kg,
      })
      .eq('id', lembagaId)

    setSavingPengaturan(false)
    if (error) { setErrorPengaturan('Gagal menyimpan pengaturan. Coba lagi.'); return }
    setSuccessPengaturan('Pengaturan berhasil disimpan.')
  }

  const avatarLetter = (form.nama || form.email).charAt(0).toUpperCase()

  // ── Semua nilai di bawah diturunkan dari 2 sumber kebenaran:
  //    lembagaForm.zakat_fitrah_kg & lembagaForm.harga_beras_per_kg ──
  const fitrahKg = lembagaForm.zakat_fitrah_kg
  const fitrahLiter = fitrahKg * DENSITY_LITER_PER_KG
  const hargaPerKg = lembagaForm.harga_beras_per_kg
  const hargaPerLiter = hargaPerKg * DENSITY_KG_PER_LITER
  const standarUangPerJiwa = fitrahKg * hargaPerKg

  const satuanLabel = lembagaForm.satuan_beras === 'kg' ? 'Kg' : 'Liter'
  const satuanFitrah = lembagaForm.satuan_beras === 'kg' ? fitrahKg : fitrahLiter

  function formatRupiah(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
  }

  // Catatan: nilai kg TIDAK dibulatkan di sini (disimpan presisi penuh) —
  // supaya hitungan uang (kg × harga) tetap akurat. Pembulatan cuma dilakukan
  // saat menampilkan di kotak input (lihat value={... ? Math.round(...) : ''}).
  function handleFitrahKgChange(val: number) {
    setLembagaForm(f => ({ ...f, zakat_fitrah_kg: val }))
  }
  function handleFitrahLiterChange(val: number) {
    setLembagaForm(f => ({ ...f, zakat_fitrah_kg: val * DENSITY_KG_PER_LITER }))
  }
  function handleHargaKgChange(val: number) {
    setLembagaForm(f => ({ ...f, harga_beras_per_kg: Math.round(val) }))
  }
  function handleHargaLiterChange(val: number) {
    setLembagaForm(f => ({ ...f, harga_beras_per_kg: Math.round(val * DENSITY_LITER_PER_KG) }))
  }

  return (
    <div style={shared.shell}>
      <Sidebar />
      <main style={{
        ...shared.main,
        marginLeft: isMobile ? 0 : '220px',
        padding: isMobile ? '84px 16px 24px' : '32px 36px',
      }}>

        <div style={shared.pageHeader}>
          <div>
            <h1 style={{ ...shared.headerTitle, fontSize: isMobile ? font.h2 : font.h1 }}>Profil Saya</h1>
            <p style={shared.headerSub}>Kelola informasi akun dan lembaga</p>
          </div>
        </div>

        {loading ? (
          <div style={{ ...shared.centerState, height: '300px' }}>
            <div style={shared.spinner} />
            <p style={shared.stateText}>Memuat data profil...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: isMobile ? '100%' : '520px' }}>

            {/* Avatar */}
            <div style={{
              ...s.avatarCard,
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: isMobile ? '14px' : '20px',
            }}>
              <div style={s.avatar}>{avatarLetter}</div>
              <div>
                <p style={s.avatarNama}>{form.nama || '—'}</p>
                <p style={s.avatarEmail}>{form.email}</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <span style={{ ...shared.badge, ...shared.badgePrimary }}>Amil Zakat</span>
                  {lembagaForm.nama && (
                    <span style={{ ...shared.badge, background: colors.goldBg, color: colors.gold }}>🕌 {lembagaForm.nama}</span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Section: Lembaga ── */}
            <div style={s.sectionDivider}>
              <span style={s.sectionLabel}>DATA LEMBAGA</span>
            </div>

            <div style={shared.card}>
              <div style={{ ...shared.cardHeader, padding: isMobile ? '16px 16px 0' : '20px 24px 0' }}>
                <h2 style={{ ...shared.cardTitle, fontSize: isMobile ? font.md : font.lg }}>Informasi Masjid / Lembaga</h2>
                <p style={shared.cardSub}>Data lembaga yang mengelola sistem zakat ini</p>
              </div>
              <div style={{ ...shared.cardBody, padding: isMobile ? '0 16px 16px' : '0 24px 24px' }}>
                <div style={shared.field}>
                  <label style={shared.label}>Nama Lembaga</label>
                  <input
                    type="text"
                    placeholder="Nama masjid atau lembaga zakat"
                    value={lembagaForm.nama}
                    onChange={e => setLembagaForm(f => ({ ...f, nama: e.target.value }))}
                    style={{ ...shared.input, fontSize: isMobile ? font.lg : font.md }}
                  />
                </div>
                <div style={shared.field}>
                  <label style={shared.label}>Alamat</label>
                  <textarea
                    placeholder="Alamat lengkap lembaga"
                    value={lembagaForm.alamat}
                    onChange={e => setLembagaForm(f => ({ ...f, alamat: e.target.value }))}
                    style={{ ...shared.textarea, fontSize: isMobile ? font.lg : font.md }}
                    rows={3}
                  />
                </div>

                <div style={{ ...s.sectionDivider, marginTop: '4px' }}>
                  <span style={s.sectionLabel}>REKENING BANK (buat pop up transfer bank)</span>
                </div>
                <div style={shared.field}>
                  <label style={shared.label}>Nama Bank</label>
                  <input
                    type="text"
                    placeholder="Contoh: BSI, Mandiri, BCA"
                    value={lembagaForm.nama_bank}
                    onChange={e => setLembagaForm(f => ({ ...f, nama_bank: e.target.value }))}
                    style={{ ...shared.input, fontSize: isMobile ? font.lg : font.md }}
                  />
                </div>
                <div style={shared.field}>
                  <label style={shared.label}>Nomor Rekening</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Contoh: 1234567890"
                    value={lembagaForm.nomor_rekening}
                    onChange={e => setLembagaForm(f => ({ ...f, nomor_rekening: e.target.value.replace(/\D/g, '') }))}
                    style={{ ...shared.input, fontSize: isMobile ? font.lg : font.md }}
                  />
                </div>
                <div style={shared.field}>
                  <label style={shared.label}>Atas Nama</label>
                  <input
                    type="text"
                    placeholder="Nama pemilik rekening"
                    value={lembagaForm.atas_nama_rekening}
                    onChange={e => setLembagaForm(f => ({ ...f, atas_nama_rekening: e.target.value }))}
                    style={{ ...shared.input, fontSize: isMobile ? font.lg : font.md }}
                  />
                  <p style={shared.fieldHint}>Ditampilkan ke amil lewat pop up setiap transaksi dicatat dengan metode Transfer Bank.</p>
                </div>

                {errorLembaga && <div style={shared.errorBox}>⚠ {errorLembaga}</div>}
                {successLembaga && <div style={shared.successBox}>✓ {successLembaga}</div>}

                <button
                  onClick={handleSaveLembaga}
                  disabled={savingLembaga}
                  style={{ ...shared.btnPrimary, width: '100%', opacity: savingLembaga ? 0.6 : 1 }}
                >
                  {savingLembaga ? 'Menyimpan...' : 'Simpan Data Lembaga'}
                </button>
              </div>
            </div>

            {/* ── Kartu: Kode QRIS ── */}
            <div style={shared.card}>
              <div style={{ ...shared.cardHeader, padding: isMobile ? '16px 16px 0' : '20px 24px 0' }}>
                <h2 style={{ ...shared.cardTitle, fontSize: isMobile ? font.md : font.lg }}>Kode QRIS</h2>
                <p style={shared.cardSub}>Gambar QRIS statis lembaga, ditampilkan saat muzakki bayar via QRIS</p>
              </div>
              <div style={{ ...shared.cardBody, padding: isMobile ? '0 16px 16px' : '0 24px 24px' }}>
                <div style={s.qrisPreview}>
                  {qrisUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL dari Supabase Storage (bucket publik), bukan aset statis
                    <img src={qrisUrl} alt="Kode QRIS lembaga" style={s.qrisImage} />
                  ) : (
                    <div style={s.qrisEmpty}>
                      <p style={{ fontSize: '28px' }}>📷</p>
                      <p style={s.qrisEmptyText}>Belum ada gambar QRIS</p>
                    </div>
                  )}
                </div>

                <div style={shared.field}>
                  <label style={shared.label}>{qrisUrl ? 'Ganti Gambar QRIS' : 'Unggah Gambar QRIS'}</label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingQris}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleUploadQris(file)
                      e.target.value = ''
                    }}
                    style={{ ...shared.input, padding: '10px', fontSize: isMobile ? font.base : font.sm }}
                  />
                  <p style={shared.fieldHint}>
                    Disarankan rasio 1:1 (1080 × 1080 px), maksimal 2 MB. Kalau belum diunggah, menu
                    pembayaran QRIS akan menampilkan pesan kode tidak tersedia.
                  </p>
                </div>

                {uploadingQris && <div style={shared.infoBox}>⏳ Mengunggah gambar...</div>}
                {errorQris && <div style={shared.errorBox}>⚠ {errorQris}</div>}
                {successQris && <div style={shared.successBox}>✓ {successQris}</div>}
              </div>
            </div>

            {/* ── Section: Pengaturan Sistem ── */}
            <div style={s.sectionDivider}>
              <span style={s.sectionLabel}>PENGATURAN SISTEM</span>
            </div>

            <div style={shared.card}>
              <div style={{ ...shared.cardHeader, padding: isMobile ? '16px 16px 0' : '20px 24px 0' }}>
                <h2 style={{ ...shared.cardTitle, fontSize: isMobile ? font.md : font.lg }}>Satuan Beras Zakat Fitrah</h2>
                <p style={shared.cardSub}>Pilih satuan yang digunakan lembaga untuk mengukur beras zakat fitrah</p>
              </div>
              <div style={{ ...shared.cardBody, padding: isMobile ? '0 16px 16px' : '0 24px 24px' }}>

                {/* Toggle Kg vs Liter */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {([
                    { key: 'kg',    icon: '⚖️', label: 'Kilogram (Kg)', desc: `${Math.round(fitrahKg * 100) / 100} Kg per jiwa` },
                    { key: 'liter', icon: '🪣', label: 'Liter',          desc: `${Math.round(fitrahLiter * 100) / 100} Liter per jiwa` },
                  ] as const).map(o => (
                    <button key={o.key}
                      onClick={() => setLembagaForm(f => ({ ...f, satuan_beras: o.key }))}
                      style={{
                        ...s.satuanBtn,
                        ...(lembagaForm.satuan_beras === o.key ? s.satuanBtnActive : {}),
                      }}>
                      <span style={s.satuanIcon}>{o.icon}</span>
                      <div>
                        <p style={s.satuanLabel}>{o.label}</p>
                        <p style={s.satuanDesc}>{o.desc}</p>
                      </div>
                      {lembagaForm.satuan_beras === o.key && (
                        <span style={s.satuanCheck}>✓</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Berat beras per jiwa — bisa dikustomisasi, kg & liter saling sinkron */}
                <div style={shared.field}>
                  <label style={shared.label}>Berat Beras per Jiwa</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={shared.inputWrap}>
                      <input
                        type="number" min="0" step="0.1"
                        value={fitrahKg ? Math.round(fitrahKg * 100) / 100 : ''}
                        onChange={e => handleFitrahKgChange(Number(e.target.value) || 0)}
                        style={{ ...shared.input, fontSize: isMobile ? font.lg : font.md }}
                      />
                      <span style={shared.suffix}>Kg</span>
                    </div>
                    <div style={shared.inputWrap}>
                      <input
                        type="number" min="0" step="0.1"
                        value={fitrahLiter ? Math.round(fitrahLiter * 100) / 100 : ''}
                        onChange={e => handleFitrahLiterChange(Number(e.target.value) || 0)}
                        style={{ ...shared.input, fontSize: isMobile ? font.lg : font.md }}
                      />
                      <span style={shared.suffix}>Liter</span>
                    </div>
                  </div>
                  <p style={shared.fieldHint}>Ubah salah satu, satunya otomatis menyesuaikan (rasio kepadatan beras BAZNAS: 2,5 kg = 3,5 liter).</p>
                </div>

                {/* Harga beras per satuan — bisa dikustomisasi, kg & liter saling sinkron */}
                <div style={shared.field}>
                  <label style={shared.label}>Harga Beras per Satuan</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={shared.inputWrap}>
                      <span style={shared.prefix}>Rp</span>
                      <input
                        type="number" min="0" step="100"
                        value={hargaPerKg || ''}
                        onChange={e => handleHargaKgChange(Number(e.target.value) || 0)}
                        style={{ ...shared.input, paddingLeft: '38px', paddingRight: '36px', fontSize: isMobile ? font.lg : font.md }}
                      />
                      <span style={shared.suffix}>/Kg</span>
                    </div>
                    <div style={shared.inputWrap}>
                      <span style={shared.prefix}>Rp</span>
                      <input
                        type="number" min="0" step="100"
                        value={hargaPerLiter ? Math.round(hargaPerLiter) : ''}
                        onChange={e => handleHargaLiterChange(Number(e.target.value) || 0)}
                        style={{ ...shared.input, paddingLeft: '38px', paddingRight: '42px', fontSize: isMobile ? font.lg : font.md }}
                      />
                      <span style={shared.suffix}>/Liter</span>
                    </div>
                  </div>
                  <p style={shared.fieldHint}>Ubah salah satu, satunya otomatis menyesuaikan pakai rasio yang sama.</p>
                </div>

                {/* Preview hasil hitungan */}
                <div style={s.konversiBox}>
                  <p style={s.konversiTitle}>📐 Ringkasan yang berlaku saat ini</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                    <div>
                      <p style={s.konversiLabel}>Per jiwa (satuan lembaga)</p>
                      <p style={s.konversiValue}>{Math.round(satuanFitrah * 100) / 100} {satuanLabel}</p>
                    </div>
                    <div>
                      <p style={s.konversiLabel}>Konversi</p>
                      <p style={s.konversiValue}>
                        {lembagaForm.satuan_beras === 'kg'
                          ? `= ${Math.round(fitrahLiter * 100) / 100} Liter`
                          : `= ${Math.round(fitrahKg * 100) / 100} Kg`}
                      </p>
                    </div>
                    <div>
                      <p style={s.konversiLabel}>Rate beras → uang</p>
                      <p style={s.konversiValue}>
                        1 {satuanLabel} = {formatRupiah(lembagaForm.satuan_beras === 'kg' ? hargaPerKg : hargaPerLiter)}
                      </p>
                    </div>
                    <div>
                      <p style={s.konversiLabel}>Standar uang / jiwa</p>
                      <p style={s.konversiValue}>{formatRupiah(standarUangPerJiwa)}</p>
                    </div>
                  </div>
                </div>

                {errorPengaturan && <div style={shared.errorBox}>⚠ {errorPengaturan}</div>}
                {successPengaturan && <div style={shared.successBox}>✓ {successPengaturan}</div>}

                <button
                  onClick={handleSavePengaturan}
                  disabled={savingPengaturan}
                  style={{ ...shared.btnPrimary, width: '100%', opacity: savingPengaturan ? 0.6 : 1 }}
                >
                  {savingPengaturan ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </button>
              </div>
            </div>

            {/* ── Section: Akun Amil ── */}
            <div style={s.sectionDivider}>
              <span style={s.sectionLabel}>AKUN AMIL</span>
            </div>

            <div style={shared.card}>
              <div style={{ ...shared.cardHeader, padding: isMobile ? '16px 16px 0' : '20px 24px 0' }}>
                <h2 style={{ ...shared.cardTitle, fontSize: isMobile ? font.md : font.lg }}>Informasi Profil</h2>
                <p style={shared.cardSub}>Nama yang akan muncul sebagai pencatat transaksi</p>
              </div>
              <div style={{ ...shared.cardBody, padding: isMobile ? '0 16px 16px' : '0 24px 24px' }}>
                <div style={shared.field}>
                  <label style={shared.label}>Nama Lengkap</label>
                  <input
                    type="text"
                    placeholder="Nama lengkap amil"
                    value={form.nama}
                    onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                    style={{ ...shared.input, fontSize: isMobile ? font.lg : font.md }}
                  />
                </div>
                <div style={shared.field}>
                  <label style={shared.label}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    disabled
                    style={{ ...shared.input, ...shared.inputDisabled, fontSize: isMobile ? font.lg : font.md }}
                  />
                  <p style={s.fieldHint}>Email tidak dapat diubah</p>
                </div>

                {errorProfile && <div style={shared.errorBox}>⚠ {errorProfile}</div>}
                {successProfile && <div style={shared.successBox}>✓ {successProfile}</div>}

                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  style={{ ...shared.btnPrimary, width: '100%', opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
              </div>
            </div>

            <div style={shared.card}>
              <div style={{ ...shared.cardHeader, padding: isMobile ? '16px 16px 0' : '20px 24px 0' }}>
                <h2 style={{ ...shared.cardTitle, fontSize: isMobile ? font.md : font.lg }}>Ubah Kata Sandi</h2>
                <p style={shared.cardSub}>Gunakan kata sandi yang kuat dan mudah diingat</p>
              </div>
              <div style={{ ...shared.cardBody, padding: isMobile ? '0 16px 16px' : '0 24px 24px' }}>
                <div style={shared.field}>
                  <label style={shared.label}>Kata Sandi Saat Ini</label>
                  <input
                    type="password"
                    placeholder="Kata sandi yang dipakai untuk masuk"
                    value={form.passwordLama}
                    onChange={e => setForm(f => ({ ...f, passwordLama: e.target.value }))}
                    style={{ ...shared.input, fontSize: isMobile ? font.lg : font.md }}
                  />
                </div>
                <div style={shared.field}>
                  <label style={shared.label}>Kata Sandi Baru</label>
                  <input
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={form.passwordBaru}
                    onChange={e => setForm(f => ({ ...f, passwordBaru: e.target.value }))}
                    style={{ ...shared.input, fontSize: isMobile ? font.lg : font.md }}
                  />
                </div>
                <div style={shared.field}>
                  <label style={shared.label}>Konfirmasi Kata Sandi</label>
                  <input
                    type="password"
                    placeholder="Ulangi kata sandi baru"
                    value={form.konfirmasiPassword}
                    onChange={e => setForm(f => ({ ...f, konfirmasiPassword: e.target.value }))}
                    style={{ ...shared.input, fontSize: isMobile ? font.lg : font.md }}
                  />
                </div>

                {errorPassword && <div style={shared.errorBox}>⚠ {errorPassword}</div>}
                {successPassword && <div style={shared.successBox}>✓ {successPassword}</div>}

                <button
                  onClick={handleSavePassword}
                  disabled={savingPassword}
                  style={{ ...shared.btnSecondary, width: '100%', opacity: savingPassword ? 0.6 : 1 }}
                >
                  {savingPassword ? 'Menyimpan...' : 'Ubah Kata Sandi'}
                </button>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  avatarCard: { background: colors.surface, borderRadius: '16px', border: `1px solid ${colors.border}`, padding: '24px', display: 'flex' },
  avatar: { width: '64px', height: '64px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, flexShrink: 0 },
  avatarNama: { fontSize: font.lg, fontWeight: 700, color: colors.text, marginBottom: '2px' },
  avatarEmail: { fontSize: font.md, color: colors.textSubtle, marginBottom: '4px' },
  sectionDivider: { display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' },
  sectionLabel: { fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: colors.textPlaceholder },
  fieldHint: { fontSize: font.xs, color: colors.textPlaceholder },
  satuanBtn: { display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', borderRadius: '10px', border: `2px solid ${colors.border}`, background: colors.surfaceAlt, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s', width: '100%', position: 'relative' },
  satuanBtnActive: { border: `2px solid ${colors.primary}`, background: colors.primaryLight },
  satuanIcon: { fontSize: '20px', flexShrink: 0 },
  satuanLabel: { fontSize: font.md, fontWeight: 700, color: colors.text, marginBottom: '2px' },
  satuanDesc: { fontSize: font.xs, color: colors.textSubtle },
  satuanCheck: { position: 'absolute', top: '10px', right: '10px', fontSize: font.xs, color: colors.primary, fontWeight: 700 },
  // Kotak 1:1 -- QRIS disarankan 1080x1080. objectFit contain supaya gambar
  // dengan rasio lain tidak gepeng (QR gepeng gagal discan).
  qrisPreview: {
    width: '100%', maxWidth: '260px', aspectRatio: '1 / 1', margin: '0 auto',
    background: colors.surfaceAlt, borderRadius: '12px', border: `1.5px dashed ${colors.border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', boxSizing: 'border-box',
  },
  qrisImage: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' },
  qrisEmpty: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  qrisEmptyText: { fontSize: font.sm, color: colors.textDisabled },

  konversiBox: { background: '#F8F4ED', borderRadius: '10px', padding: '14px', border: '1px solid #EDE8E0' },
  konversiTitle: { fontSize: font.sm, fontWeight: 700, color: colors.textSubtle },
  konversiLabel: { fontSize: font.xs, fontWeight: 700, color: colors.textDisabled, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '3px' },
  konversiValue: { fontSize: font.md, fontWeight: 700, color: colors.text },
}