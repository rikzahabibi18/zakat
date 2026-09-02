export async function GET() {
  try {
    const res = await fetch(
      'https://logam-mulia-api.iamutaki.workers.dev/api/prices/logammulia',
      // cache 24 jam sebagai fallback; refresh presisi dipicu cron jam 01:00 WIB via revalidateTag
      { next: { revalidate: 86400, tags: ['harga-emas'] } }
    )

    if (!res.ok) {
      return Response.json(
        { success: false, error: 'Gagal fetch dari sumber' },
        { status: 502 }
      )
    }

    const data = await res.json()
    return Response.json(data)
  } catch (err) {
    return Response.json(
      { success: false, error: String(err) },
      { status: 500 }
    )
  }
}
