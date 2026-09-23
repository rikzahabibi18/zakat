import { randomInt } from 'crypto'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { SUPER_ADMIN_EMAIL } from '@/utils/supabase/superAdmin'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // tanpa 0/O/1/I/L, gampang dibaca manusia
function generateKode(len = 16) {
  return Array.from({ length: len }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
}

async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === SUPER_ADMIN_EMAIL
}

export async function GET() {
  if (!(await assertSuperAdmin())) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('lembaga')
    .select('id, nama, alamat, satuan_beras, kode_registrasi ( kode )')
    .order('nama', { ascending: true })

  if (error) {
    console.error('[panel-zakat/lembaga GET]', error)
    return Response.json({ error: 'Gagal mengambil data lembaga.', detail: error.message }, { status: 500 })
  }

  return Response.json({ data })
}

export async function POST(req: Request) {
  if (!(await assertSuperAdmin())) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { nama, alamat, satuan_beras } = await req.json()
  if (!nama || typeof nama !== 'string' || !nama.trim()) {
    return Response.json({ error: 'Nama lembaga wajib diisi.' }, { status: 400 })
  }

  const admin = createAdminClient()

  for (let attempt = 0; attempt < 5; attempt++) {
    const kode = generateKode()
    const { data, error } = await admin.rpc('admin_create_lembaga_with_kode', {
      p_nama: nama.trim(),
      p_alamat: alamat?.trim() || null,
      p_satuan_beras: satuan_beras ?? 'kg',
      p_kode: kode,
    })

    if (!error) {
      const row = Array.isArray(data) ? data[0] : data
      return Response.json({ lembagaId: row.lembaga_id, kode: row.kode })
    }

    // 23505 = unique_violation (kode bentrok) -> coba lagi dengan kode baru
    if (error.code !== '23505') {
      return Response.json({ error: 'Gagal membuat lembaga.' }, { status: 500 })
    }
  }

  return Response.json({ error: 'Gagal generate kode unik, coba lagi.' }, { status: 500 })
}
