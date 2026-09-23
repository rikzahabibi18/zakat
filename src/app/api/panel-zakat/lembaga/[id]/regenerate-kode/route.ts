import { randomInt } from 'crypto'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { SUPER_ADMIN_EMAIL } from '@/utils/supabase/superAdmin'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function generateKode(len = 16) {
  return Array.from({ length: len }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email !== SUPER_ADMIN_EMAIL) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const lembagaId = Number(id)
  if (!Number.isFinite(lembagaId)) {
    return Response.json({ error: 'ID lembaga tidak valid.' }, { status: 400 })
  }

  const admin = createAdminClient()

  for (let attempt = 0; attempt < 5; attempt++) {
    const kode = generateKode()
    const { data, error } = await admin
      .from('kode_registrasi')
      .upsert({ lembaga_id: lembagaId, kode }, { onConflict: 'lembaga_id' })
      .select('kode')
      .single()

    if (!error) {
      return Response.json({ kode: data.kode })
    }
    if (error.code !== '23505') {
      return Response.json({ error: 'Gagal generate ulang kode.' }, { status: 500 })
    }
  }

  return Response.json({ error: 'Gagal generate kode unik, coba lagi.' }, { status: 500 })
}
