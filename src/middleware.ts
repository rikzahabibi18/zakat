import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPER_ADMIN_EMAIL } from '@/utils/supabase/superAdmin'

const PROTECTED_ROUTES = ['/dashboard', '/transaksi', '/muzakki', '/profil', '/mustahik', '/distribusi', '/panel-zakat']
const PUBLIC_ROUTES = ['/login', '/konfirmasi', '/register']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r))
  const isApi = pathname.startsWith('/api')
  const isStatic = pathname.startsWith('/_next') || pathname.includes('.')

  if (isPublic || isApi || isStatic) return NextResponse.next()

  const isProtected = PROTECTED_ROUTES.some(r => pathname.startsWith(r))
  if (!isProtected) return NextResponse.next()

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

  if (pathname.startsWith('/panel-zakat') && user.email !== SUPER_ADMIN_EMAIL) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
