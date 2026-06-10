import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { texts } = await req.json()
  if (!Array.isArray(texts) || texts.length === 0) {
    return NextResponse.json({ error: 'No texts provided' }, { status: 400 })
  }

  const apiKey = process.env.DEEPL_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'DEEPL_API_KEY not configured' }, { status: 500 })

  // Free-tier keys end with :fx
  const base = apiKey.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com'

  const res = await fetch(`${base}/v2/translate`, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    // No source_lang → DeepL auto-detects. We skip fields that are already English.
    body: JSON.stringify({ text: texts, target_lang: 'EN-GB' }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('DeepL fejl:', res.status, body)
    return NextResponse.json({ error: 'Oversættelse fejlede' }, { status: 502 })
  }

  const { translations } = await res.json()
  return NextResponse.json({
    translations: translations.map(t => ({ text: t.text, source: t.detected_source_language })),
  })
}
