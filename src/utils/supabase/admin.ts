import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role client — SERVER-ONLY. Jangan pernah import file ini dari
// komponen 'use client'. Dipakai di Route Handler/Server Action yang
// butuh akses lintas-tenant (bypass RLS), misal panel super admin.
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('admin.ts tidak boleh diimport di client-side.')
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY belum di-set di environment.')
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
