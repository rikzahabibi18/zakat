'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/components/Sidebar'
import { shared } from '@/styles/shared'
import { colors, font } from '@/styles/tokens'

interface ProfilForm {
  nama: string
  email: string
  passwordBaru: string
  konfirmasiPassword: string
}

interface LembagaForm {
  nama: string
  alamat: string
  satuan_beras: 'kg' | 'liter'
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < breakpoint) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return isMobile
}

export default function ProfilPage() {
  const supabase = createClient()
  const isMobile = useIsMobile()

  const [form, setForm] = useState<ProfilForm>({
    nama: '', email: '', passwordBaru: '', konfirmasiPassword: '',
  })
  const [lembagaForm, setLembagaForm] = useState<LembagaForm>({
    nama: '', alamat: '', satuan_beras: 'kg',
  })
  const [lembagaId, setLembagaId] = useState<number | null>(null)
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
            .select('nama, alamat, satuan_beras')
            .eq('id', profil.lembaga_id)
            .single()

          if (lembaga) {
            setLembagaForm({
              nama: lembaga.nama ?? '',
              alamat: lembaga.alamat ?? '',
              satuan_beras: (lembaga.satuan_beras ?? 'kg') as 'kg' | 'liter',
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
    if (!form.passwordBaru) { setErrorPassword('Masukkan kata sandi baru.'); return }
    if (form.passwordBaru.length < 6) { setErrorPassword('Kata sandi minimal 6 karakter.'); return }
    if (form.passwordBaru !== form.konfirmasiPassword) {
      setErrorPassword('Konfirmasi kata sandi tidak cocok.'); return
    }

    setSavingPassword(true)
    setErrorPassword('')
    setSuccessPassword('')

    const { error } = await supabase.auth.updateUser({
      password: form.passwordBaru
    })

    setSavingPassword(false)
    if (error) { setErrorPassword('Gagal mengubah kata sandi. Coba lagi.'); return }
    setSuccessPassword('Kata sandi berhasil diubah.')
    setForm(f => ({ ...f, passwordBaru: '', konfirmasiPassword: '' }))
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
      })
      .eq('id', lembagaId)

    setSavingLembaga(false)
    if (error) { setErrorLembaga('Gagal menyimpan data lembaga. Coba lagi.'); return }
    setSuccessLembaga('Data lembaga berhasil diperbarui.')
  }

  async function handleSavePengaturan() {
    if (!lembagaId) { setErrorPengaturan('Lembaga tidak ditemukan.'); return }

    setSavingPengaturan(true)
    setErrorPengaturan('')
    setSuccessPengaturan('')

    const { error } = await supabase
      .from('lembaga')
      .update({ satuan_beras: lembagaForm.satuan_beras })
      .eq('id', lembagaId)

    setSavingPengaturan(false)
    if (error) { setErrorPengaturan('Gagal menyimpan pengaturan. Coba lagi.'); return }
    setSuccessPengaturan('Pengaturan berhasil disimpan.')
  }

  const avatarLetter = (form.nama || form.email).charAt(0).toUpperCase()

  const FITRAH_KG = 2.5
  const FITRAH_LITER = 3.5
  const satuanLabel = lembagaForm.satuan_beras === 'kg' ? 'Kg' : 'Liter'
  const satuanFitrah = lembagaForm.satuan_beras === 'kg' ? FITRAH_KG : FITRAH_LITER

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
                    { key: 'kg',    icon: '⚖️', label: 'Kilogram (Kg)', desc: `${FITRAH_KG} Kg per jiwa` },
                    { key: 'liter', icon: '🪣', label: 'Liter',          desc: `${FITRAH_LITER} Liter per jiwa` },
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

                {/* Preview konversi */}
                <div style={s.konversiBox}>
                  <p style={s.konversiTitle}>📐 Standar BAZNAS yang berlaku</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                    <div>
                      <p style={s.konversiLabel}>Per jiwa</p>
                      <p style={s.konversiValue}>{satuanFitrah} {satuanLabel}</p>
                    </div>
                    <div>
                      <p style={s.konversiLabel}>Konversi</p>
                      <p style={s.konversiValue}>
                        {lembagaForm.satuan_beras === 'kg'
                          ? `= ${FITRAH_LITER} Liter`
                          : `= ${FITRAH_KG} Kg`}
                      </p>
                    </div>
                    <div>
                      <p style={s.konversiLabel}>Rate beras → uang</p>
                      <p style={s.konversiValue}>
                        1 {satuanLabel} = Rp {lembagaForm.satuan_beras === 'kg'
                          ? '18.000'
                          : Math.round(45000 / FITRAH_LITER).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div>
                      <p style={s.konversiLabel}>Standar uang / jiwa</p>
                      <p style={s.konversiValue}>Rp 45.000</p>
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
  konversiBox: { background: '#F8F4ED', borderRadius: '10px', padding: '14px', border: '1px solid #EDE8E0' },
  konversiTitle: { fontSize: font.sm, fontWeight: 700, color: colors.textSubtle },
  konversiLabel: { fontSize: font.xs, fontWeight: 700, color: colors.textDisabled, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '3px' },
  konversiValue: { fontSize: font.md, fontWeight: 700, color: colors.text },
}