'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" fillOpacity="0.9"/>
        <rect x="11" y="1" width="6" height="6" rx="1.5" fill="currentColor" fillOpacity="0.9"/>
        <rect x="1" y="11" width="6" height="6" rx="1.5" fill="currentColor" fillOpacity="0.9"/>
        <rect x="11" y="11" width="6" height="6" rx="1.5" fill="currentColor" fillOpacity="0.4"/>
      </svg>
    ),
  },
  {
    href: '/transaksi',
    label: 'Transaksi',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M2 5h14M2 9h10M2 13h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/transaksi/tambah',
    label: 'Catat Zakat',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 6v6M6 9h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    highlight: true,
  },
  {
    href: '/muzakki',
    label: 'Muzakki',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2.5 15c0-3.038 2.91-5.5 6.5-5.5s6.5 2.462 6.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/mustahik',
    label: 'Mustahik',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="13" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M1.5 15c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5M8.5 15c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [isMobile, setIsMobile] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setIsOpen(false)
  }

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Lock scroll body saat sidebar mobile terbuka
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isMobile, isOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sidebarContent = (
    <>
      {/* Brand */}
      <div style={s.brand}>
        <div style={s.brandIcon}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L12.5 7.5H18L13.5 10.5L15.5 16L10 12.5L4.5 16L6.5 10.5L2 7.5H7.5L10 2Z"
              fill="white" fillOpacity="0.95"/>
          </svg>
        </div>
        <div>
          <p style={s.brandName}>Sistem Zakat</p>
          <p style={s.brandSub}>Panel Amil</p>
        </div>
        {isMobile && (
          <button onClick={() => setIsOpen(false)} style={s.closeBtn}>✕</button>
        )}
      </div>

      {/* Nav */}
      <nav style={s.nav}>
        <p style={s.navLabel}>MENU</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...s.navItem,
                ...(item.highlight ? s.navHighlight : {}),
                ...(isActive ? s.navItemActive : {}),
              }}
            >
              <span style={{
                ...s.navIcon,
                color: isActive ? '#2D7A50' : item.highlight ? '#C9A84C' : '#78716C',
              }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Profil & Keluar */}
      <div style={s.bottomSection}>
        <Link
          href="/profil"
          style={{
            ...s.bottomBtn,
            ...(pathname === '/profil' ? s.bottomBtnActive : {}),
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M2 13c0-2.761 2.686-5 6-5s6 2.239 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Profil Saya
        </Link>

        <button onClick={handleLogout} style={s.logoutBtn}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Keluar
        </button>
      </div>
    </>
  )

  // ── Desktop: sidebar fixed seperti biasa ──
  if (!isMobile) {
    return <aside style={s.sidebarDesktop}>{sidebarContent}</aside>
  }

  // ── Mobile: hamburger + slide-in sidebar ──
  return (
    <>
      {/* Hamburger button — fixed di pojok kiri atas */}
      <button onClick={() => setIsOpen(true)} style={s.hamburgerBtn}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M2.5 5.5h15M2.5 10h15M2.5 14.5h15" stroke="#1C1917" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div style={s.overlay} onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar slide-in */}
      <aside style={{
        ...s.sidebarMobile,
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      }}>
        {sidebarContent}
      </aside>
    </>
  )
}

const s: Record<string, React.CSSProperties> = {
  // ── Shared base ──
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid #EDE8E0',
    position: 'relative',
  },
  brandIcon: {
    width: '36px',
    height: '36px',
    background: 'linear-gradient(135deg, #2D7A50, #1A4731)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  brandName: { fontSize: '13px', fontWeight: 700, color: '#1C1917', lineHeight: 1.2 },
  brandSub: { fontSize: '11px', color: '#A8A29E', marginTop: '2px' },
  closeBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    background: 'none',
    border: 'none',
    fontSize: '16px',
    color: '#A8A29E',
    cursor: 'pointer',
    padding: '6px',
  },
  nav: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 },
  navLabel: { fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: '#C4BDB4', marginBottom: '8px', paddingLeft: '10px' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px',
    borderRadius: '8px', fontSize: '13.5px', fontWeight: 500, color: '#57534E',
    textDecoration: 'none', transition: 'background 0.15s',
  },
  navItemActive: { background: '#F0F7F3', color: '#1A4731', fontWeight: 600 },
  navHighlight: { background: '#FDF8EE', color: '#92681A', fontWeight: 600, marginTop: '8px' },
  navIcon: { display: 'flex', alignItems: 'center', flexShrink: 0 },
  bottomSection: {
    display: 'flex', flexDirection: 'column', gap: '2px',
    borderTop: '1px solid #EDE8E0', paddingTop: '12px', marginTop: '8px',
  },
  bottomBtn: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 10px',
    borderRadius: '8px', fontSize: '13px', fontWeight: 500, color: '#57534E',
    textDecoration: 'none', transition: 'background 0.15s',
  },
  bottomBtnActive: { background: '#F0F7F3', color: '#1A4731', fontWeight: 600 },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 10px',
    borderRadius: '8px', fontSize: '13px', fontWeight: 500, color: '#A8A29E',
    background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
  },

  // ── Desktop variant ──
  sidebarDesktop: {
    width: '220px', minHeight: '100vh', background: '#FFFFFF',
    borderRight: '1px solid #EDE8E0', display: 'flex', flexDirection: 'column',
    padding: '24px 16px', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10,
  },

  // ── Mobile variant ──
  hamburgerBtn: {
    position: 'fixed', top: '16px', left: '16px', zIndex: 50,
    width: '40px', height: '40px', borderRadius: '10px',
    background: '#fff', border: '1px solid #EDE8E0',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 90,
  },
  sidebarMobile: {
    position: 'fixed', top: 0, left: 0, bottom: 0, width: '260px',
    background: '#fff', zIndex: 100, display: 'flex', flexDirection: 'column',
    padding: '24px 16px', boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
    transition: 'transform 0.25s ease',
  },
}
