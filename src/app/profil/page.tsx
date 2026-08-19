'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from '@/components/Sidebar'

interface ProfilForm {
  nama: string
  email: string
  passwordBaru: string
  konfirmasiPassword: string
}

interface LembagaForm {
  nama: string
  alamat: string
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
    nama: '', alamat: '',
  })
  const [lembagaId, setLembagaId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingLembaga, setSavingLembaga] = useState(false)
  const [successProfile, setSuccessProfile] = useState('')
  const [successPassword, setSuccessPassword] = useState('')
  const [successLembaga, setSuccessLembaga] = useState('')
  const [errorProfile, setErrorProfile] = useState('')
  const [errorPassword, setErrorPassword] = useState('')
  const [errorLembaga, setErrorLembaga] = useState('')

  useEffect(() => {
    async function fetchAll() {
      // Fetch user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setForm(f => ({
          ...f,
          email: user.email ?? '',
          nama: user.user_metadata?.nama ?? '',
        }))

        // Fetch lembaga via profil_amil
        const { data: profil } = await supabase
          .from('profil_amil')
          .select('lembaga_id')
          .eq('id', user.id)
          .single()

        if (profil?.lembaga_id) {
          setLembagaId(profil.lembaga_id)

          const { data: lembaga } = await supabase
            .from('lembaga')
            .select('nama, alamat')
            .eq('id', profil.lembaga_id)
            .single()

          if (lembaga) {
            setLembagaForm({
              nama: lembaga.nama ?? '',
              alamat: lembaga.alamat ?? '',
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

  const avatarLetter = (form.nama || form.email).charAt(0).toUpperCase()

  return (
    <div style={s.shell}>
      <Sidebar />
      <main style={{
        ...s.main,
        marginLeft: isMobile ? 0 : '220px',
        padding: isMobile ? '84px 16px 24px' : '32px 36px',
      }}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={{ ...s.headerTitle, fontSize: isMobile ? '21px' : '26px' }}>Profil Saya</h1>
            <p style={s.headerSub}>Kelola informasi akun dan lembaga</p>
          </div>
        </div>

        {loading ? (
          <div style={s.loadingWrap}>
            <div style={s.spinner} />
            <p style={s.loadingText}>Memuat data profil...</p>
          </div>
        ) : (
          <div style={{ ...s.content, maxWidth: isMobile ? '100%' : '520px' }}>

            {/* Avatar & info singkat */}
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
                  <span style={s.roleBadge}>Amil Zakat</span>
                  {lembagaForm.nama && (
                    <span style={s.lembagaBadge}>🕌 {lembagaForm.nama}</span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Section: Lembaga ── */}
            <div style={s.sectionDivider}>
              <span style={s.sectionLabel}>DATA LEMBAGA</span>
            </div>

            <div style={s.card}>
              <div style={{ ...s.cardHeader, padding: isMobile ? '16px 16px 0' : '20px 24px 0' }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15px' : '16px' }}>Informasi Masjid / Lembaga</h2>
                <p style={s.cardSub}>Data lembaga yang mengelola sistem zakat ini</p>
              </div>
              <div style={{ ...s.cardBody, padding: isMobile ? '0 16px 16px' : '0 24px 24px' }}>
                <div style={s.field}>
                  <label style={s.label}>Nama Lembaga</label>
                  <input
                    type="text"
                    placeholder="Nama masjid atau lembaga zakat"
                    value={lembagaForm.nama}
                    onChange={e => setLembagaForm(f => ({ ...f, nama: e.target.value }))}
                    style={{ ...s.input, fontSize: isMobile ? '16px' : '14px' }}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Alamat</label>
                  <textarea
                    placeholder="Alamat lengkap lembaga"
                    value={lembagaForm.alamat}
                    onChange={e => setLembagaForm(f => ({ ...f, alamat: e.target.value }))}
                    style={{ ...s.textarea, fontSize: isMobile ? '16px' : '14px' }}
                    rows={3}
                  />
                </div>

                {errorLembaga && <div style={s.errorBox}>⚠ {errorLembaga}</div>}
                {successLembaga && <div style={s.successBox}>✓ {successLembaga}</div>}

                <button
                  onClick={handleSaveLembaga}
                  disabled={savingLembaga}
                  style={{ ...s.saveBtn, ...(savingLembaga ? s.saveBtnDisabled : {}) }}
                >
                  {savingLembaga ? 'Menyimpan...' : 'Simpan Data Lembaga'}
                </button>
              </div>
            </div>

            {/* ── Section: Akun Amil ── */}
            <div style={s.sectionDivider}>
              <span style={s.sectionLabel}>AKUN AMIL</span>
            </div>

            {/* Form profil */}
            <div style={s.card}>
              <div style={{ ...s.cardHeader, padding: isMobile ? '16px 16px 0' : '20px 24px 0' }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15px' : '16px' }}>Informasi Profil</h2>
                <p style={s.cardSub}>Nama yang akan muncul sebagai pencatat transaksi</p>
              </div>
              <div style={{ ...s.cardBody, padding: isMobile ? '0 16px 16px' : '0 24px 24px' }}>
                <div style={s.field}>
                  <label style={s.label}>Nama Lengkap</label>
                  <input
                    type="text"
                    placeholder="Nama lengkap amil"
                    value={form.nama}
                    onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                    style={{ ...s.input, fontSize: isMobile ? '16px' : '14px' }}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    disabled
                    style={{ ...s.input, ...s.inputDisabled, fontSize: isMobile ? '16px' : '14px' }}
                  />
                  <p style={s.fieldHint}>Email tidak dapat diubah</p>
                </div>

                {errorProfile && <div style={s.errorBox}>⚠ {errorProfile}</div>}
                {successProfile && <div style={s.successBox}>✓ {successProfile}</div>}

                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  style={{ ...s.saveBtn, ...(saving ? s.saveBtnDisabled : {}) }}
                >
                  {saving ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
              </div>
            </div>

            {/* Form ganti password */}
            <div style={s.card}>
              <div style={{ ...s.cardHeader, padding: isMobile ? '16px 16px 0' : '20px 24px 0' }}>
                <h2 style={{ ...s.cardTitle, fontSize: isMobile ? '15px' : '16px' }}>Ubah Kata Sandi</h2>
                <p style={s.cardSub}>Gunakan kata sandi yang kuat dan mudah diingat</p>
              </div>
              <div style={{ ...s.cardBody, padding: isMobile ? '0 16px 16px' : '0 24px 24px' }}>
                <div style={s.field}>
                  <label style={s.label}>Kata Sandi Baru</label>
                  <input
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={form.passwordBaru}
                    onChange={e => setForm(f => ({ ...f, passwordBaru: e.target.value }))}
                    style={{ ...s.input, fontSize: isMobile ? '16px' : '14px' }}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Konfirmasi Kata Sandi</label>
                  <input
                    type="password"
                    placeholder="Ulangi kata sandi baru"
                    value={form.konfirmasiPassword}
                    onChange={e => setForm(f => ({ ...f, konfirmasiPassword: e.target.value }))}
                    style={{ ...s.input, fontSize: isMobile ? '16px' : '14px' }}
                  />
                </div>

                {errorPassword && <div style={s.errorBox}>⚠ {errorPassword}</div>}
                {successPassword && <div style={s.successBox}>✓ {successPassword}</div>}

                <button
                  onClick={handleSavePassword}
                  disabled={savingPassword}
                  style={{ ...s.saveBtnSecondary, ...(savingPassword ? s.saveBtnDisabled : {}) }}
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
  shell: { display: 'flex', minHeight: '100vh', background: '#F8F4ED', fontFamily: "'Plus Jakarta Sans', sans-serif" },
  main: { flex: 1 },
  header: { marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid #EDE8E0' },
  headerTitle: { fontWeight: 700, color: '#1C1917', letterSpacing: '-0.5px', marginBottom: '4px' },
  headerSub: { fontSize: '13px', color: '#A8A29E' },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '16px' },
  spinner: { width: '28px', height: '28px', border: '3px solid #EDE8E0', borderTop: '3px solid #2D7A50', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  loadingText: { fontSize: '14px', color: '#A8A29E' },
  content: { display: 'flex', flexDirection: 'column', gap: '20px' },
  avatarCard: { background: '#fff', borderRadius: '16px', border: '1px solid #EDE8E0', padding: '24px', display: 'flex' },
  avatar: { width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #2D7A50, #1A4731)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, flexShrink: 0 },
  avatarNama: { fontSize: '16px', fontWeight: 700, color: '#1C1917', marginBottom: '2px' },
  avatarEmail: { fontSize: '13px', color: '#78716C', marginBottom: '4px' },
  roleBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', background: '#F0F7F3', color: '#2D7A50', fontSize: '11px', fontWeight: 700 },
  lembagaBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', background: '#FDF8EE', color: '#92681A', fontSize: '11px', fontWeight: 700 },
  sectionDivider: { display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' },
  sectionLabel: { fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: '#C4BDB4' },
  card: { background: '#fff', borderRadius: '16px', border: '1px solid #EDE8E0' },
  cardHeader: {},
  cardTitle: { fontWeight: 700, color: '#1C1917', marginBottom: '4px' },
  cardSub: { fontSize: '13px', color: '#A8A29E', marginBottom: '20px' },
  cardBody: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 600, color: '#44403C' },
  input: { width: '100%', padding: '11px 14px', border: '1.5px solid #EDE8E0', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', color: '#1C1917', background: '#FAFAF9', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '11px 14px', border: '1.5px solid #EDE8E0', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', color: '#1C1917', background: '#FAFAF9', boxSizing: 'border-box', resize: 'vertical' as const },
  inputDisabled: { background: '#F1F0EE', color: '#A8A29E', cursor: 'not-allowed' },
  fieldHint: { fontSize: '11px', color: '#C4BDB4' },
  errorBox: { padding: '12px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', fontSize: '13px', color: '#B91C1C', fontWeight: 500 },
  successBox: { padding: '12px 14px', background: '#F0F7F3', border: '1px solid #C9E8D5', borderRadius: '10px', fontSize: '13px', color: '#2D7A50', fontWeight: 500 },
  saveBtn: { padding: '11px', fontSize: '14px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #2D7A50, #1A4731)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', width: '100%' },
  saveBtnSecondary: { padding: '11px', fontSize: '14px', fontWeight: 700, color: '#1A4731', background: '#F0F7F3', border: '1.5px solid #2D7A50', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', width: '100%' },
  saveBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
}
