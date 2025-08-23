'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function ModelPicker({
  providerId,
  models,
  value,
  onChange,
}: {
  providerId: string
  models: Array<{ id: string; name?: string; free?: boolean }>
  value?: string
  onChange: (v: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [q, setQ] = useState('')
  const [onlyFree, setOnlyFree] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (isOpen && boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return models.filter((m) => {
      if (onlyFree && !m.free) return false
      return (
        !needle ||
        m.id.toLowerCase().includes(needle) ||
        (m.name ?? '').toLowerCase().includes(needle)
      )
    })
  }, [models, q, onlyFree])

  const selectedLabel =
    models.find((m) => m.id === value)?.name || value || 'Choose model'

  const showFreeToggle = providerId === 'openrouter'

  return (
    <div ref={boxRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        className="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>{selectedLabel}</span>
        <ChevronDown
          className="icon"
          aria-hidden
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}
        />
      </button>
      {isOpen ? (
        <div
          className="card"
          style={{
            position: 'absolute',
            left: 0,
            top: 'calc(100% + 4px)',
            width: '100%',
            maxHeight: 260,
            overflow: 'auto',
            padding: 8,
            zIndex: 30,
            display: 'grid',
            gap: 8,
          }}
        >
          <input
            className="input"
            placeholder="Search models…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          {showFreeToggle ? (
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 14,
              }}
            >
              <input
                type="checkbox"
                checked={onlyFree}
                onChange={(e) => setOnlyFree(e.target.checked)}
              />
              Free only
            </label>
          ) : null}
          <div
            role="listbox"
            aria-label="Model list"
            style={{ display: 'grid', gap: 4 }}
          >
            {filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                className="button"
                role="option"
                aria-selected={m.id === value}
                onClick={() => {
                  onChange(m.id)
                  setIsOpen(false)
                  setQ('')
                }}
                style={{
                  textAlign: 'unset',
                  justifyContent: 'space-between',
                  display: 'flex',
                  ...(m.id === value
                    ? { borderColor: 'var(--accent)', color: 'var(--accent)' }
                    : {}),
                }}
              >
                <span>{m.name ?? m.id}</span>
                {m.free ? (
                  <span className="muted" style={{ fontSize: 12 }}>
                    free
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
