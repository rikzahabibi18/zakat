import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Endpoint yang dituju link di email (reset password dll). Pakai pola
// token_hash + verifyOtp di SERVER -- bukan link PKCE bawaan -- supaya tetap
// jalan kalau user minta reset di laptop tapi buka email-nya di HP (PKCE
// butuh code_verifier yang tersimpan di browser yang sama, jadi bakal gagal
// lintas perangkat).
//
// Template email di Supabase Dashboard harus diarahkan ke sini, lihat
// catatan di README/CLAUDE.md.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/login'

  if (!tokenHash || !type) {
    redirect('/lupa-password?error=link-tidak-valid')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

  if (error) {
    // Link kedaluwarsa atau sudah dipakai -- Supabase sengaja sekali pakai.
    redirect('/lupa-password?error=link-kedaluwarsa')
  }

  // Sesi recovery sudah aktif (tersimpan di cookie) -- halaman tujuan boleh
  // langsung memanggil updateUser untuk mengganti password.
  redirect(next)
}
