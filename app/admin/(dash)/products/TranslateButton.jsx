'use client'
import { useState } from 'react'

export default function TranslateButton({ labelId, descId, labelDa, descDa }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function run() {
    setBusy(true)
    setErr(null)
    try {
      const texts = [labelDa, descDa].filter(Boolean)
      if (!texts.length) return
      const res = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Fejl')
      const { translations } = await res.json()
      let i = 0
      if (labelDa) { const el = document.getElementById(labelId); if (el) el.value = translations[i++] ?? '' }
      if (descDa)  { const el = document.getElementById(descId);  if (el) el.value = translations[i++] ?? '' }
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        title="Oversæt fra dansk til engelsk"
        style={{
          background: busy ? '#1e3a5f' : '#1d4ed8',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          fontSize: 11,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: '0.06em',
          padding: '3px 9px',
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.7 : 1,
          lineHeight: '18px',
        }}
      >
        {busy ? '…' : 'EN'}
      </button>
      {err && <span style={{ fontSize: 11, color: '#f87171' }}>{err}</span>}
    </span>
  )
}
