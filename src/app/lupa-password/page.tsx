'use client'

import React, { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { shared } from '@/styles/shared'
import { colors, font, gradient, radius, shadow } from '@/styles/tokens'

const PESAN_ERROR_LINK: Record<string, string> = {
  'link-tidak-valid': 'Link reset tidak valid. Silakan minta link baru di bawah ini.',
  'link-kedaluwarsa': 'Link reset sudah kedaluwarsa atau sudah pernah dipakai. Silakan minta link baru.',
}

function LupaPasswordForm() {
  const supabase = createClient()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [terkirim, setTerkirim] = useState(false)
  const [error, setError] = useState('')

  const errorLink = PESAN_ERROR_LINK[searchParams.get('error') ?? '']

  async function handleKirim() {
    if (!email.trim()) { setError('Masukkan email Anda.'); return }

    setLoading(true)
    setError('')

    // Diarahkan langsung ke /reset-password karena kita masih memakai template
    // email BAWAAN Supabase (template custom terkunci selama belum pasang SMTP
    // sendiri). Konsekuensinya alur ini memakai PKCE: link HARUS dibuka di
    // browser yang sama dengan yang meminta reset.
    //
    // Setelah custom SMTP dipasang, cukup ubah template email ke
    // /auth/confirm?...token_hash=... (route-nya sudah ada & siap pakai) --
    // itu menghilangkan batasan satu-browser ini tanpa perlu ubah kode.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (resetError) {
      // Rate limit SMTP bawaan Supabase paling sering kena di sini.
      setError('Gagal mengirim email. Coba lagi beberapa saat lagi atau hubungi administrator.')
      return
    }

    // Sengaja TIDAK membedakan email terdaftar vs tidak -- supaya halaman ini
    // tidak bisa dipakai buat menebak email mana yang punya akun.
    setTerkirim(true)
  }

  if (terkirim) {
    return (
      <div style={s.card}>
        <div style={s.header}>
          <p style={s.headerTitle}>Cek Email Anda</p>
          <p style={s.headerSub}>Link reset kata sandi sudah dikirim</p>
        </div>
        <div style={s.body}>
          <div style={shared.successBox}>
            ✓ Kalau <strong>{email.trim()}</strong> terdaftar di sistem, link untuk mengatur ulang
            kata sandi sudah dikirim ke email tersebut.
          </div>
          <div style={shared.errorBox}>
            ⚠ <strong>Penting:</strong> buka link tersebut di <strong>browser dan perangkat yang
            sama</strong> dengan yang Anda pakai sekarang. Kalau dibuka di HP sementara permintaan
            ini dibuat di komputer (atau sebaliknya), link tidak akan berfungsi.
          </div>
          <p style={s.hint}>
            Link hanya berlaku sekali pakai dan akan kedaluwarsa. Jangan lupa cek folder
            spam/promosi kalau tidak ketemu di kotak masuk.
          </p>
          <Link href="/login" style={{ ...shared.btnOutline, textAlign: 'center', textDecoration: 'none', display: 'block' }}>
            Kembali ke Halaman Masuk
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={s.card}>
      <div style={s.header}>
        <p style={s.headerTitle}>Lupa Kata Sandi</p>
        <p style={s.headerSub}>Kami kirimkan link untuk mengatur ulang kata sandi</p>
      </div>
      <div style={s.body}>
        {errorLink && <div style={shared.errorBox}>⚠ {errorLink}</div>}

        <div style={shared.field}>
          <label style={shared.label}>Email Terdaftar</label>
          <input
            type="email"
            placeholder="amil@masjid.org"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleKirim()}
            style={shared.input}
            autoFocus
          />
          <p style={shared.fieldHint}>Gunakan email yang Anda pakai untuk masuk ke sistem.</p>
        </div>

        {error && <div style={shared.errorBox}>⚠ {error}</div>}

        <button
          onClick={handleKirim}
          disabled={loading}
          style={{ ...shared.btnPrimary, ...(loading ? shared.btnDisabled : {}) }}
        >
          {loading ? 'Mengirim...' : 'Kirim Link Reset'}
        </button>

        <p style={s.footerNote}>
          Ingat kata sandinya? <Link href="/login" style={s.footerLink}>Masuk di sini</Link>
        </p>
      </div>
    </div>
  )
}

export default function LupaPasswordPage() {
  return (
    <div style={s.shell}>
      <Suspense fallback={<div style={shared.spinner} />}>
        <LupaPasswordForm />
      </Suspense>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: '100vh', background: colors.bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px', fontFamily: font.family,
  },
  card: {
    ...shared.card, width: '100%', maxWidth: '420px',
    overflow: 'hidden', boxShadow: shadow.modal,
  },
  header: { background: gradient.primary, padding: '24px', borderRadius: `${radius.xxl} ${radius.xxl} 0 0` },
  headerTitle: { fontSize: font.xl, fontWeight: 700, color: '#fff', marginBottom: '4px' },
  headerSub: { fontSize: font.sm, color: 'rgba(255,255,255,0.8)' },
  body: { padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px' },
  hint: { fontSize: font.sm, color: colors.textSubtle, lineHeight: 1.6 },
  footerNote: { marginTop: '4px', textAlign: 'center', fontSize: font.sm, color: colors.textDisabled },
  footerLink: { color: colors.primary, fontWeight: 600, textDecoration: 'none' },
}
