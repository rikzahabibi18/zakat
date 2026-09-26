'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { shared } from '@/styles/shared'
import { colors, font, gradient, radius, shadow } from '@/styles/tokens'

type Step = 'kode' | 'data'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('kode')
  const [kode, setKode] = useState('')
  const [lembagaNama, setLembagaNama] = useState('')
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleValidateKode() {
    if (!kode.trim()) { setError('Masukkan kode registrasi lembaga.'); return }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/registrasi/validate-kode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kode }),
      })
      const json = await res.json()
      if (!json.valid) {
        setError('Kode registrasi tidak ditemukan. Periksa kembali kode dari admin lembaga Anda.')
        setLoading(false)
        return
      }
      setLembagaNama(json.lembagaNama)
      setStep('data')
    } catch {
      setError('Gagal memeriksa kode. Coba lagi.')
    }
    setLoading(false)
  }

  async function handleRegister() {
    if (!nama.trim() || !email.trim() || !password) {
      setError('Semua field wajib diisi.'); return
    }
    if (password.length < 6) { setError('Kata sandi minimal 6 karakter.'); return }

    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nama: nama.trim(), kode_registrasi: kode } },
    })

    setLoading(false)

    if (authError) {
      setError('Registrasi gagal. Kode registrasi mungkin sudah tidak berlaku — silakan ulangi dari awal.')
      setStep('kode')
      return
    }
    if (data.user?.identities?.length === 0) {
      setError('Email sudah terdaftar. Silakan masuk lewat halaman login.')
      return
    }

    router.push('/dashboard')
  }

  return (
    <div style={s.shell}>
      <div style={{ ...shared.card, width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: shadow.modal }}>
        <div style={s.cardHeader}>
          <p style={s.headerTitle}>Registrasi Amil</p>
          <p style={s.headerSub}>Daftar sebagai amil menggunakan kode dari lembaga Anda</p>
        </div>

        <div style={{ ...shared.progressWrap, padding: '20px 24px 0' }}>
          <div style={shared.progressTrack}>
            <div style={{ ...shared.progressFill, width: step === 'kode' ? '50%' : '100%' }} />
          </div>
          <span style={shared.progressLabel}>{step === 'kode' ? 'Kode Lembaga' : 'Data Amil'}</span>
        </div>

        <div style={{ ...shared.cardBody, padding: '20px 24px 24px' }}>
          {step === 'kode' ? (
            <>
              <div style={shared.field}>
                <label style={shared.label}>Kode Registrasi Lembaga</label>
                <input
                  type="text"
                  placeholder="Contoh: AB12CD34EF56GH78"
                  value={kode}
                  onChange={e => setKode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleValidateKode()}
                  style={{ ...shared.input, textTransform: 'uppercase' }}
                  autoFocus
                />
                <p style={shared.fieldHint}>Minta kode ini ke admin lembaga/masjid Anda.</p>
              </div>

              {error && <div style={shared.errorBox}>⚠ {error}</div>}

              <button
                onClick={handleValidateKode}
                disabled={loading}
                style={{ ...shared.btnPrimary, ...(loading ? shared.btnDisabled : {}) }}
              >
                {loading ? 'Memeriksa...' : 'Lanjut →'}
              </button>
            </>
          ) : (
            <>
              <div style={shared.successBox}>✓ Lembaga: <strong>{lembagaNama}</strong></div>

              <div style={shared.field}>
                <label style={shared.label}>Nama Lengkap</label>
                <input type="text" placeholder="Nama Anda" value={nama}
                  onChange={e => setNama(e.target.value)} style={shared.input} autoFocus />
              </div>
              <div style={shared.field}>
                <label style={shared.label}>Email</label>
                <input type="email" placeholder="amil@masjid.org" value={email}
                  onChange={e => setEmail(e.target.value)} style={shared.input} />
              </div>
              <div style={shared.field}>
                <label style={shared.label}>Kata Sandi</label>
                <input type="password" placeholder="Minimal 6 karakter" value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  style={shared.input} />
              </div>

              {error && <div style={shared.errorBox}>⚠ {error}</div>}

              <button
                onClick={handleRegister}
                disabled={loading}
                style={{ ...shared.btnPrimary, ...(loading ? shared.btnDisabled : {}) }}
              >
                {loading ? 'Mendaftarkan...' : 'Daftar'}
              </button>
              <button
                onClick={() => { setStep('kode'); setError('') }}
                style={shared.btnOutline}
              >
                ← Kembali
              </button>
            </>
          )}

          <p style={s.footerNote}>
            Sudah punya akun? <a href="/login" style={s.footerLink}>Masuk di sini</a>
          </p>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: '100vh', background: colors.bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px', fontFamily: font.family,
  },
  cardHeader: {
    background: gradient.primary, padding: '24px', borderRadius: `${radius.xxl} ${radius.xxl} 0 0`,
  },
  headerTitle: { fontSize: font.xl, fontWeight: 700, color: '#fff', marginBottom: '4px' },
  headerSub: { fontSize: font.sm, color: 'rgba(255,255,255,0.8)' },
  footerNote: { marginTop: '4px', textAlign: 'center', fontSize: font.sm, color: colors.textDisabled },
  footerLink: { color: colors.primary, fontWeight: 600, textDecoration: 'none' },
}
