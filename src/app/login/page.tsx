'use client'

import React, { Suspense, useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Email dan kata sandi wajib diisi.')
      return
    }
    setLoading(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authError) {
      setError('Email atau kata sandi salah. Silakan coba lagi.')
    } else {
      const redirect = searchParams.get('redirect') ?? '/dashboard'
      router.push(redirect)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div style={styles.formCard}>
      <div style={styles.formHeader}>
        <p style={styles.formEyebrow}>PORTAL AMIL ZAKAT</p>
        <h2 style={styles.formTitle}>Masuk ke Dasbor</h2>
        <p style={styles.formSubtitle}>
          Hanya petugas amil yang berwenang yang dapat mengakses sistem ini.
        </p>
      </div>

      <div style={styles.formBody}>
        <div style={styles.fieldGroup}>
          <label style={styles.label} htmlFor="email">Alamat Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="amil@masjid.org"
            style={styles.input}
            onFocus={(e: React.FocusEvent<HTMLInputElement>) =>
              Object.assign(e.target.style, styles.inputFocus)
            }
            onBlur={(e: React.FocusEvent<HTMLInputElement>) =>
              Object.assign(e.target.style, styles.input)
            }
            autoComplete="email"
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label} htmlFor="password">Kata Sandi</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="••••••••"
            style={styles.input}
            onFocus={(e: React.FocusEvent<HTMLInputElement>) =>
              Object.assign(e.target.style, styles.inputFocus)
            }
            onBlur={(e: React.FocusEvent<HTMLInputElement>) =>
              Object.assign(e.target.style, styles.input)
            }
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div style={styles.errorBox}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="7" stroke="#B91C1C" strokeWidth="1.5" />
              <path d="M8 5v3.5M8 11h.01" stroke="#B91C1C" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={loading ? { ...styles.button, ...styles.buttonDisabled } : styles.button}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!loading) Object.assign(e.currentTarget.style, styles.buttonHover)
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!loading) Object.assign(e.currentTarget.style, styles.button)
          }}
        >
          {loading ? (
            <span style={styles.loadingRow}>
              <span style={styles.spinner} />
              Memverifikasi...
            </span>
          ) : 'Masuk'}
        </button>
      </div>

      <p style={styles.footerNote}>Lupa akses? Hubungi administrator sistem Anda.</p>
    </div>
  )
}

export default function LoginPage() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div style={{
      ...styles.page,
      flexDirection: isMobile ? 'column' : 'row',
    }}>
      {/* Left panel */}
      <div style={{
        ...styles.leftPanel,
        width: isMobile ? '100%' : '42%',
        padding: isMobile ? '32px 24px' : '48px 44px',
        minHeight: isMobile ? 'auto' : '100vh',
      }}>
        <div style={styles.patternOverlay} />
        <div style={styles.leftContent}>
          <div style={{
            ...styles.logoMark,
            marginBottom: isMobile ? '16px' : '28px',
            width: isMobile ? '48px' : '64px',
            height: isMobile ? '48px' : '64px',
          }}>
            <svg width={isMobile ? "36" : "48"} height={isMobile ? "36" : "48"} viewBox="0 0 48 48" fill="none">
              <path
                d="M24 4L28.5 14.5H39L30.5 21L34 32L24 25.5L14 32L17.5 21L9 14.5H19.5L24 4Z"
                fill="white" fillOpacity="0.9"
              />
            </svg>
          </div>
          <h1 style={{
            ...styles.brandTitle,
            fontSize: isMobile ? '24px' : '32px',
          }}>Sistem Zakat</h1>
          <p style={{
            ...styles.brandTagline,
            marginBottom: isMobile ? '20px' : '40px',
            fontSize: isMobile ? '13.5px' : '15px',
          }}>
            Kelola zakat, infaq, dan sedekah dengan amanah dan transparan.
          </p>
          <div style={{
            ...styles.statsRow,
            flexDirection: isMobile ? 'row' : 'column',
            flexWrap: 'wrap',
            gap: isMobile ? '16px' : '12px',
          }}>
            {['Zakat Mal', 'Zakat Fitrah', 'Infaq'].map((item) => (
              <div key={item} style={styles.statItem}>
                <span style={styles.statLabel}>{item}</span>
                <span style={styles.statDot} />
              </div>
            ))}
          </div>
        </div>
        {!isMobile && (
          <p style={styles.ayatText}>
            &ldquo;Ambillah zakat dari sebagian harta mereka, dengan zakat itu kamu membersihkan
            dan mensucikan mereka.&rdquo;
            <span style={styles.ayatRef}> — QS. At-Taubah: 103</span>
          </p>
        )}
      </div>

      {/* Right panel */}
      <div style={{
        ...styles.rightPanel,
        padding: isMobile ? '24px 16px 40px' : '40px 32px',
      }}>
        <Suspense fallback={<div style={styles.formCard} />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" },
  leftPanel: { background: 'linear-gradient(155deg, #1A4731 0%, #2D7A50 60%, #1A4731 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' },
  patternOverlay: { position: 'absolute', inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M30 0l30 30-30 30L0 30z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`, backgroundSize: '60px 60px', pointerEvents: 'none' },
  leftContent: { position: 'relative', zIndex: 1 },
  logoMark: { background: 'rgba(255,255,255,0.12)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)' },
  brandTitle: { fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.5px', marginBottom: '12px' },
  brandTagline: { color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', maxWidth: '320px' },
  statsRow: { display: 'flex' },
  statItem: { display: 'flex', alignItems: 'center', gap: '8px' },
  statLabel: { fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.5px', textTransform: 'uppercase' },
  statDot: { width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C', display: 'inline-block' },
  ayatText: { position: 'relative', zIndex: 1, fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.7', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '24px' },
  ayatRef: { fontStyle: 'normal', fontWeight: 600, color: '#C9A84C' },
  rightPanel: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F4ED', boxSizing: 'border-box' },
  formCard: { width: '100%', maxWidth: '420px', background: '#FFFFFF', borderRadius: '20px', padding: '32px 28px', boxShadow: '0 4px 24px rgba(26,71,49,0.08), 0 1px 4px rgba(26,71,49,0.06)', border: '1px solid rgba(26,71,49,0.08)', boxSizing: 'border-box' },
  formHeader: { marginBottom: '28px' },
  formEyebrow: { fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: '#2D7A50', textTransform: 'uppercase', marginBottom: '8px' },
  formTitle: { fontSize: '24px', fontWeight: 700, color: '#1C1917', letterSpacing: '-0.5px', marginBottom: '8px' },
  formSubtitle: { fontSize: '13.5px', color: '#78716C', lineHeight: '1.5' },
  formBody: { display: 'flex', flexDirection: 'column', gap: '18px' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 600, color: '#44403C', letterSpacing: '0.1px' },
  input: { width: '100%', padding: '12px 14px', fontSize: '14px', color: '#1C1917', background: '#F8F4ED', border: '1.5px solid #E7E0D5', borderRadius: '10px', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s', fontFamily: 'inherit', boxSizing: 'border-box' },
  inputFocus: { width: '100%', padding: '12px 14px', fontSize: '14px', color: '#1C1917', background: '#FFFFFF', border: '1.5px solid #2D7A50', borderRadius: '10px', outline: 'none', boxShadow: '0 0 0 3px rgba(45,122,80,0.12)', fontFamily: 'inherit', boxSizing: 'border-box' },
  errorBox: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', fontSize: '13px', color: '#B91C1C', fontWeight: 500 },
  button: { width: '100%', padding: '13px', fontSize: '15px', fontWeight: 700, color: '#FFFFFF', background: 'linear-gradient(135deg, #2D7A50 0%, #1A4731 100%)', border: 'none', borderRadius: '10px', cursor: 'pointer', transition: 'opacity 0.15s, transform 0.1s', fontFamily: 'inherit', letterSpacing: '0.2px', marginTop: '4px' },
  buttonHover: { width: '100%', padding: '13px', fontSize: '15px', fontWeight: 700, color: '#FFFFFF', background: 'linear-gradient(135deg, #35925D 0%, #1A4731 100%)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.2px', marginTop: '4px', transform: 'translateY(-1px)', boxShadow: '0 6px 20px rgba(45,122,80,0.35)' },
  buttonDisabled: { opacity: 0.65, cursor: 'not-allowed', transform: 'none' },
  loadingRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  spinner: { width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' },
  footerNote: { marginTop: '20px', textAlign: 'center', fontSize: '12.5px', color: '#A8A29E' },
}
