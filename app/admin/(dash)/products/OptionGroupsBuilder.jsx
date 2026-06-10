'use client'

import { useState } from 'react'

const FALLBACK_T = {
  label: 'Option groups (multiple choice)',
  hint: 'Mark an option with ★ to highlight it green on the form as part of the standard assortment.',
  groupNamePh: 'Group name (e.g. Format)',
  removeGroup: 'Remove group',
  optionPh: 'Option value',
  starOn: 'Standard assortment — highlighted green on the form',
  starOff: 'Mark as standard assortment',
  removeOption: 'Remove option',
  addOption: '+ Add option',
  addGroup: '+ Add option group',
}

export default function OptionGroupsBuilder({ initial, t, enableTranslate, labelId, descId }) {
  const tr = { ...FALLBACK_T, ...(t || {}) }
  const [groups, setGroups] = useState(() => (Array.isArray(initial) ? initial : []))
  const [busy, setBusy] = useState(false)

  const addGroup = () => setGroups([...groups, { name: '', options: [''], recommended: [] }])
  const removeGroup = gi => setGroups(groups.filter((_, i) => i !== gi))
  const setGroupName = (gi, name) => {
    const next = groups.slice()
    next[gi] = { ...next[gi], name }
    setGroups(next)
  }
  const addOption = gi => {
    const next = groups.slice()
    next[gi] = { ...next[gi], options: [...(next[gi].options || []), ''] }
    setGroups(next)
  }
  const removeOption = (gi, oi) => {
    const next = groups.slice()
    const removed = next[gi].options[oi]
    const options = next[gi].options.filter((_, i) => i !== oi)
    const recommended = (next[gi].recommended || []).filter(v => v !== removed)
    next[gi] = { ...next[gi], options, recommended }
    setGroups(next)
  }
  const setOption = (gi, oi, val) => {
    const next = groups.slice()
    const opts = next[gi].options.slice()
    const old = opts[oi]
    opts[oi] = val
    // Keep the green marker pointing at the option if it gets renamed
    let recommended = Array.isArray(next[gi].recommended) ? next[gi].recommended.slice() : []
    if (old && recommended.includes(old)) recommended = recommended.map(v => (v === old ? val : v))
    next[gi] = { ...next[gi], options: opts, recommended }
    setGroups(next)
  }
  const toggleRecommended = (gi, oi) => {
    const next = groups.slice()
    const val = next[gi].options[oi]
    if (!val || !val.trim()) return
    const recommended = Array.isArray(next[gi].recommended) ? next[gi].recommended.slice() : []
    const idx = recommended.indexOf(val)
    if (idx >= 0) recommended.splice(idx, 1)
    else recommended.push(val)
    next[gi] = { ...next[gi], recommended }
    setGroups(next)
  }

  // Translate every Danish text in the product box (name, description and option
  // groups) to English. English text is detected by DeepL and left untouched.
  async function translateAll() {
    const labelEl = labelId ? document.getElementById(labelId) : null
    const descEl = descId ? document.getElementById(descId) : null

    // Collect the texts to translate, remembering where each one belongs
    const slots = []
    if (labelEl && labelEl.value.trim()) slots.push({ kind: 'label', text: labelEl.value })
    if (descEl && descEl.value.trim()) slots.push({ kind: 'desc', text: descEl.value })
    groups.forEach((g, gi) => {
      if (g.name && g.name.trim()) slots.push({ kind: 'gname', gi, text: g.name })
      ;(g.options || []).forEach((o, oi) => {
        if (o && o.trim()) slots.push({ kind: 'opt', gi, oi, text: o })
      })
    })
    if (!slots.length) return

    setBusy(true)
    try {
      const res = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: slots.map(s => s.text) }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const next = groups.map(g => ({ ...g, options: (g.options || []).slice(), recommended: (g.recommended || []).slice() }))
      let translated = 0
      slots.forEach((s, i) => {
        const item = data.translations[i]
        if (!item || item.source === 'EN') return // already English → leave untouched
        translated++
        if (s.kind === 'label' && labelEl) labelEl.value = item.text
        else if (s.kind === 'desc' && descEl) descEl.value = item.text
        else if (s.kind === 'gname') next[s.gi].name = item.text
        else if (s.kind === 'opt') {
          const old = next[s.gi].options[s.oi]
          next[s.gi].options[s.oi] = item.text
          next[s.gi].recommended = next[s.gi].recommended.map(v => (v === old ? item.text : v))
        }
      })
      setGroups(next)
      if (!translated) alert('Alle tekster er allerede på engelsk — intet at oversætte.')
    } catch (err) {
      alert('Oversættelse fejlede: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  const starStyle = (on, enabled) => ({
    width: 34, height: 34, flexShrink: 0, borderRadius: 8, cursor: enabled ? 'pointer' : 'default',
    fontSize: 16, lineHeight: 1, fontFamily: 'inherit', background: 'transparent', border: '1px solid',
    color: on ? '#4ade80' : '#5a5650', borderColor: on ? 'rgba(74,222,128,0.5)' : '#4a4640',
    opacity: enabled ? 1 : 0.4,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="a-label">{tr.label}</label>
      <span style={{ fontSize: 12, color: '#7a7672' }}>{tr.hint}</span>
      <input type="hidden" name="option_groups" value={JSON.stringify(groups)} readOnly />
      <div className="og-builder">
        <div className="og-groups">
          {groups.map((g, gi) => (
            <div key={gi} className="og-group">
              <div className="og-group-head">
                <input className="a-input" placeholder={tr.groupNamePh}
                  value={g.name || ''} onChange={e => setGroupName(gi, e.target.value)} />
                <button type="button" className="og-del" title={tr.removeGroup} onClick={() => removeGroup(gi)}>×</button>
              </div>
              <div className="og-opts">
                {(g.options || []).map((opt, oi) => {
                  const on = (g.recommended || []).includes(opt)
                  const enabled = !!(opt && opt.trim())
                  return (
                    <div key={oi} className="og-opt">
                      <button type="button" style={starStyle(on, enabled)} disabled={!enabled}
                        title={on ? tr.starOn : tr.starOff}
                        onClick={() => toggleRecommended(gi, oi)}>{on ? '★' : '☆'}</button>
                      <input className="a-input" placeholder={tr.optionPh}
                        value={opt} onChange={e => setOption(gi, oi, e.target.value)} />
                      <button type="button" className="og-del" title={tr.removeOption} onClick={() => removeOption(gi, oi)}>×</button>
                    </div>
                  )
                })}
              </div>
              <button type="button" className="og-add-opt" onClick={() => addOption(gi)}>{tr.addOption}</button>
            </div>
          ))}
        </div>
        <button type="button" className="og-add-group" onClick={addGroup}>{tr.addGroup}</button>
      </div>
      {enableTranslate && (
        <button
          type="button"
          onClick={translateAll}
          disabled={busy}
          title="Oversæt alle danske tekster i kassen til engelsk"
          style={{
            alignSelf: 'flex-start', marginTop: 4,
            background: '#1d4ed8', color: '#fff', border: 'none',
            borderRadius: 6, fontSize: 12, fontFamily: "'DM Mono',monospace",
            letterSpacing: '0.06em', padding: '7px 14px',
            cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1,
          }}
        >{busy ? 'Oversætter…' : 'EN — oversæt fra dansk'}</button>
      )}
    </div>
  )
}
