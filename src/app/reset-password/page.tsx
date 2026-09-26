'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { shared } from '@/styles/shared'
import { colors, font, gradient, radius, shadow } from '@/styles/tokens'

type Kondisi = 'memeriksa' | 'siap' | 'tanpa-sesi' | 'selesai'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()

  const [kondisi, setKondisi] = useState<Kondisi>('memeriksa')
  const [password, setPassword] = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Halaman ini hanya boleh dipakai kalau ada sesi recovery yang sah.
  //
  // Supabase client memproses token di URL secara OTOMATIS tapi ASINKRON
  // (detectSessionInUrl). Jadi tidak cukup cek sekali saat mount -- saat itu
  // sesinya kemungkinan besar belum jadi. Kita dengarkan event-nya, dengan
  // batas waktu supaya link rusak/kedaluwarsa tidak menggantung selamanya.
  useEffect(() => {
    let sudahDivonis = false
    function vonis(hasil: Kondisi) {
      if (!sudahDivonis) { sudahDivonis = true; setKondisi(hasil) }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) vonis('siap')
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { vonis('siap'); return }

      // Supabase menaruh kegagalan (link kedaluwarsa dsb) di hash URL.
      if (window.location.hash.includes('error')) { vonis('tanpa-sesi'); return }

      const adaTokenDiUrl =
        new URLSearchParams(window.location.search).has('code') ||
        window.location.hash.includes('access_token')

      if (!adaTokenDiUrl) { vonis('tanpa-sesi'); return }

      // Ada token tapi belum jadi sesi -- beri waktu prosesnya selesai. Kalau
      // tetap gagal, penyebab paling umum: link dibuka di browser/perangkat
      // berbeda dari yang meminta reset (keterbatasan alur PKCE).
      setTimeout(() => vonis('tanpa-sesi'), 5000)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSimpan() {
    if (!password) { setError('Masukkan kata sandi baru.'); return }
    if (password.length < 6) { setError('Kata sandi minimal 6 karakter.'); return }
    if (password !== konfirmasi) { setError('Konfirmasi kata sandi tidak cocok.'); return }

    setSaving(true)
    setError('')

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setSaving(false)
      setError('Gagal menyimpan kata sandi baru. Silakan minta link reset yang baru.')
      return
    }

    // Sengaja logout setelah ganti password -- supaya amil langsung
    // memastikan kata sandi barunya benar-benar bisa dipakai masuk.
    await supabase.auth.signOut()
    setSaving(false)
    setKondisi('selesai')
  }

  return (
    <div style={s.shell}>
      <div style={s.card}>
        <div style={s.header}>
          <p style={s.headerTitle}>Atur Kata Sandi Baru</p>
          <p style={s.headerSub}>Buat kata sandi baru untuk akun amil Anda</p>
        </div>

        <div style={s.body}>
          {kondisi === 'memeriksa' && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <div style={shared.spinner} />
            </div>
          )}

          {kondisi === 'tanpa-sesi' && (
            <>
              <div style={shared.errorBox}>
                ⚠ Sesi reset tidak ditemukan atau sudah tidak berlaku.
              </div>
              <p style={s.hint}>
                Penyebab paling umum:
              </p>
              <ul style={s.daftarSebab}>
                <li>Link dibuka di <strong>browser atau perangkat yang berbeda</strong> dari tempat
                  permintaan reset dibuat. Link harus dibuka di browser yang sama.</li>
                <li>Link sudah pernah dipakai — setiap link hanya berlaku sekali.</li>
                <li>Link sudah kedaluwarsa.</li>
              </ul>
              <Link href="/lupa-password" style={{ ...shared.btnPrimary, textAlign: 'center', textDecoration: 'none', display: 'block' }}>
                Minta Link Reset Baru
              </Link>
            </>
          )}

          {kondisi === 'siap' && (
            <>
              <div style={shared.field}>
                <label style={shared.label}>Kata Sandi Baru</label>
                <input
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={shared.input}
                  autoFocus
                />
              </div>
              <div style={shared.field}>
                <label style={shared.label}>Konfirmasi Kata Sandi</label>
                <input
                  type="password"
                  placeholder="Ulangi kata sandi baru"
                  value={konfirmasi}
                  onChange={e => setKonfirmasi(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSimpan()}
                  style={shared.input}
                />
              </div>

              {error && <div style={shared.errorBox}>⚠ {error}</div>}

              <button
                onClick={handleSimpan}
                disabled={saving}
                style={{ ...shared.btnPrimary, ...(saving ? shared.btnDisabled : {}) }}
              >
                {saving ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
              </button>
            </>
          )}

          {kondisi === 'selesai' && (
            <>
              <div style={shared.successBox}>
                ✓ Kata sandi berhasil diubah. Silakan masuk kembali menggunakan kata sandi baru Anda.
              </div>
              <button
                onClick={() => router.push('/login')}
                style={shared.btnPrimary}
              >
                Masuk Sekarang
              </button>
            </>
          )}
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
  card: {
    ...shared.card, width: '100%', maxWidth: '420px',
    overflow: 'hidden', boxShadow: shadow.modal,
  },
  header: { background: gradient.primary, padding: '24px', borderRadius: `${radius.xxl} ${radius.xxl} 0 0` },
  headerTitle: { fontSize: font.xl, fontWeight: 700, color: '#fff', marginBottom: '4px' },
  headerSub: { fontSize: font.sm, color: 'rgba(255,255,255,0.8)' },
  body: { padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px' },
  hint: { fontSize: font.sm, color: colors.textSubtle },
  daftarSebab: {
    margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px',
    fontSize: font.sm, color: colors.textSubtle, lineHeight: 1.6,
  },
}
