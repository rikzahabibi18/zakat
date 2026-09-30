import { randomInt } from 'crypto'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { SUPER_ADMIN_EMAIL } from '@/utils/supabase/superAdmin'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // tanpa 0/O/1/I, gampang dibaca manusia
// Panjang 8 = 32^8 (~1,1 triliun kombinasi) -- diturunkan dari 16 (2026-09-30)
// karena kode ini sering harus dibacakan/diketik manual oleh amil yang belum
// tentu terbiasa nyalin kode acak panjang. Endpoint /api/registrasi/validate-kode
// belum punya rate limit, jadi JANGAN turunkan lagi tanpa nambah itu dulu --
// di 8 karakter perkiraan waktu tebak brute-force ~19 tahun di skala lembaga
// sekarang, ~254 hari di skala 1000 lembaga (asumsi 50 request/detik).
function generateKode(len = 8) {
  return Array.from({ length: len }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
}

// Slug dasar buat URL tenant (myzakat.id/nama-lembaga/dashboard) -- keunikan
// (kalau ada nama lembaga yang sama) ditangani di dalam RPC lewat suffix
// angka, bukan di sini.
function slugify(nama: string) {
  const slug = nama
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'lembaga'
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
    .select('id, nama, alamat, satuan_beras, slug, kode_registrasi ( kode )')
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
  const slugDasar = slugify(nama.trim())

  for (let attempt = 0; attempt < 5; attempt++) {
    const kode = generateKode()
    const { data, error } = await admin.rpc('admin_create_lembaga_with_kode', {
      p_nama: nama.trim(),
      p_alamat: alamat?.trim() || null,
      p_satuan_beras: satuan_beras ?? 'kg',
      p_kode: kode,
      p_slug_dasar: slugDasar,
    })

    if (!error) {
      const row = Array.isArray(data) ? data[0] : data
      return Response.json({ lembagaId: row.lembaga_id, kode: row.kode, slug: row.slug })
    }

    // 23505 = unique_violation (kode bentrok) -> coba lagi dengan kode baru
    if (error.code !== '23505') {
      console.error('[panel-zakat/lembaga POST]', error)
      return Response.json(
        { error: 'Gagal membuat lembaga.', detail: error.message, code: error.code },
        { status: 500 }
      )
    }
  }

  return Response.json({ error: 'Gagal generate kode unik, coba lagi.' }, { status: 500 })
}
