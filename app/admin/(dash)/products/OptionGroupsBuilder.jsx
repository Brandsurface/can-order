'use client'

import { useState } from 'react'

export default function OptionGroupsBuilder({ initial }) {
  const [groups, setGroups] = useState(() => (Array.isArray(initial) ? initial : []))

  const addGroup = () => setGroups([...groups, { name: '', options: [''] }])
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
    next[gi] = { ...next[gi], options: next[gi].options.filter((_, i) => i !== oi) }
    setGroups(next)
  }
  const setOption = (gi, oi, val) => {
    const next = groups.slice()
    const opts = next[gi].options.slice()
    opts[oi] = val
    next[gi] = { ...next[gi], options: opts }
    setGroups(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="a-label">Option groups (multiple choice)</label>
      <input type="hidden" name="option_groups" value={JSON.stringify(groups)} readOnly />
      <div className="og-builder">
        <div className="og-groups">
          {groups.map((g, gi) => (
            <div key={gi} className="og-group">
              <div className="og-group-head">
                <input className="a-input" placeholder="Group name (e.g. Format)"
                  value={g.name || ''} onChange={e => setGroupName(gi, e.target.value)} />
                <button type="button" className="og-del" title="Remove group" onClick={() => removeGroup(gi)}>×</button>
              </div>
              <div className="og-opts">
                {(g.options || []).map((opt, oi) => (
                  <div key={oi} className="og-opt">
                    <input className="a-input" placeholder="Option value"
                      value={opt} onChange={e => setOption(gi, oi, e.target.value)} />
                    <button type="button" className="og-del" title="Remove option" onClick={() => removeOption(gi, oi)}>×</button>
                  </div>
                ))}
              </div>
              <button type="button" className="og-add-opt" onClick={() => addOption(gi)}>+ Add option</button>
            </div>
          ))}
        </div>
        <button type="button" className="og-add-group" onClick={addGroup}>+ Add option group</button>
      </div>
    </div>
  )
}
