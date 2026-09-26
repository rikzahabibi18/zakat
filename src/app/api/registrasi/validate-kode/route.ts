import { createAdminClient } from '@/utils/supabase/admin'

// Publik — dipanggil dari /register step 1, sebelum user punya akun.
// Selalu balas 200 (valid: true/false), jangan 404 — supaya status code
// tidak bisa dipakai buat probing kode mana yang eksis.
export async function POST(req: Request) {
  const { kode } = await req.json()
  const normalized = String(kode ?? '').trim().toUpperCase()

  if (!normalized) {
    return Response.json({ valid: false })
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('kode_registrasi')
    .select('kode, lembaga:lembaga_id ( nama )')
    .eq('kode', normalized)
    .single()

  const lembaga = data?.lembaga as unknown as { nama: string } | null
  if (!data || !lembaga) {
    return Response.json({ valid: false })
  }

  return Response.json({ valid: true, lembagaNama: lembaga.nama })
}
