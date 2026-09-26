import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { SUPER_ADMIN_EMAIL } from '@/utils/supabase/superAdmin'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const { data: rows, error } = await admin
    .from('profil_amil')
    .select('id')
    .eq('lembaga_id', lembagaId)

  if (error) {
    return Response.json({ error: 'Gagal mengambil daftar amil.' }, { status: 500 })
  }

  const amil = await Promise.all(
    (rows ?? []).map(async (row: { id: string }) => {
      const { data } = await admin.auth.admin.getUserById(row.id)
      const user = data?.user
      return {
        id: row.id,
        nama: user?.user_metadata?.nama ?? '(tanpa nama)',
        email: user?.email ?? '-',
        joinedAt: user?.created_at ?? null,
      }
    })
  )

  return Response.json({ data: amil })
}
