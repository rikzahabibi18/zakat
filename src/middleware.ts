import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPER_ADMIN_EMAIL } from '@/utils/supabase/superAdmin'

const PUBLIC_ROUTES = [
  '/login', '/konfirmasi', '/register',
  // Alur lupa password -- semuanya diakses justru saat user BELUM bisa login.
  // /auth/confirm yang memverifikasi token dari email dan bikin sesi recovery.
  '/lupa-password', '/reset-password', '/auth',
]
// Nama-nama halaman tenant-scoped di bawah /[lembaga]/... -- dipakai buat
// nebak apakah segmen kedua URL itu memang halaman amil (bukan cuma slug
// nyasar tanpa halaman valid, yang biar 404 alami lewat Next.js router).
const TENANT_PAGES = ['dashboard', 'transaksi', 'muzakki', 'mustahik', 'profil', 'distribusi']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r))
  const isApi = pathname.startsWith('/api')
  const isStatic = pathname.startsWith('/_next') || pathname.includes('.')
  if (isPublic || isApi || isStatic) return NextResponse.next()

  const isPanelZakat = pathname.startsWith('/panel-zakat')
  const segments = pathname.split('/').filter(Boolean)
  const isTenantPage = segments.length >= 2 && TENANT_PAGES.includes(segments[1])

  if (!isPanelZakat && !isTenantPage) return NextResponse.next()

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll()
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
      response = NextResponse.next({ request: { headers: request.headers } })
      cookiesToSet.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options)
      )
    },
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieMethods }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isPanelZakat) {
    if (user.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  // Tenant page: slug di URL cuma navigasi/kosmetik -- yang menentukan data
  // yang boleh diakses tetap lembaga_id dari profil_amil (via RLS di server),
  // BUKAN slug ini. Ini cuma jaga supaya amil gak nyasar/nyoba buka slug
  // lembaga lain lewat URL manual -- selalu di-redirect balik ke slug asli.
  const urlSlug = segments[0]
  const { data: profil } = await supabase
    .from('profil_amil')
    .select('lembaga:lembaga_id ( slug )')
    .eq('id', user.id)
    .single()

  const realSlug = (profil?.lembaga as unknown as { slug: string } | null)?.slug

  if (!realSlug) {
    // Akun amil tanpa lembaga (gak seharusnya terjadi via alur normal) --
    // jangan biarkan nyangkut di halaman yang gak bisa resolve datanya.
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (urlSlug !== realSlug) {
    const correctPath = '/' + [realSlug, ...segments.slice(1)].join('/')
    return NextResponse.redirect(new URL(correctPath + request.nextUrl.search, request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
