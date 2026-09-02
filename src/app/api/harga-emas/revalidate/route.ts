import { revalidateTag } from 'next/cache'
import { NextRequest } from 'next/server'

// Dipanggil oleh Vercel Cron tiap jam 01:00 WIB (lihat vercel.json).
// Memaksa cache harga emas di /api/harga-emas refresh di jam tetap,
// bukan cuma mengandalkan revalidate: 86400 (rolling) di route utamanya.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  revalidateTag('harga-emas', 'max') // stale-while-revalidate: data lama tetap dilayani instan saat data baru di-fetch di background
  return Response.json({ success: true, revalidated: 'harga-emas', at: new Date().toISOString() })
}
