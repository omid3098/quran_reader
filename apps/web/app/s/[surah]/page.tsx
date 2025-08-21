'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Route } from 'next'
import { useRouter, useSearchParams } from 'next/navigation'

type Translation = { id: string; name: string; language: string }

type Verse = {
  surah: number
  ayah: number
  text_ar_simple: string
  bismillah?: string
  translations?: Array<{ translationId: string; text: string }>
}

type SurahMeta = { number: number; name_ar: string }

const API = '/api'

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { }
  }, [key, value])
  return [value, setValue] as const
}

export default function ReaderPage({ params }: { params: { surah: string } }) {
  const router = useRouter()
  const sp = useSearchParams()

  const surah = Number(params.surah)
  const [font, setFont] = useLocalStorage<'sm' | 'md' | 'lg'>('oqr:font', 'md')
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('oqr:theme', (document.documentElement.dataset.theme as any) || 'dark')
  const [enabledTranslations, setEnabledTranslations] = useLocalStorage<string[]>('oqr:translations', (sp.get('t')?.split(',').filter(Boolean)) || ['en.arberry'])

  const [translations, setTranslations] = useState<Translation[]>([])
  const [verses, setVerses] = useState<Verse[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isTranslationsOpen, setTranslationsOpen] = useState(false)
  const translationsRef = useRef<HTMLDivElement>(null)
  const [surahs, setSurahs] = useState<SurahMeta[]>([])
  const [isSurahOpen, setSurahOpen] = useState(false)
  const [surahQuery, setSurahQuery] = useState('')
  const surahDropdownRef = useRef<HTMLDivElement>(null)
  const [activeAyah, setActiveAyah] = useState<number | null>(null)
  const [renderUpto, setRenderUpto] = useState<number>(0)
  const RENDER_STEP = 50

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    fetch(`${API}/translations`)
      .then((r) => r.json())
      .then((data: any[]) => setTranslations(data))
      .catch(() => setTranslations([]))
  }, [])

  useEffect(() => {
    fetch(`${API}/surahs`)
      .then((r) => r.json())
      .then((data: SurahMeta[]) => setSurahs(data))
      .catch(() => setSurahs([]))
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (translationsRef.current && !translationsRef.current.contains(target)) setTranslationsOpen(false)
      if (surahDropdownRef.current && !surahDropdownRef.current.contains(target)) setSurahOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const qs = useMemo(() => new URLSearchParams({ surah: String(surah), translation_ids: enabledTranslations.join(',') }).toString(), [surah, enabledTranslations])

  useEffect(() => {
    setVerses(null)
    setError(null)
    fetch(`${API}/verses?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((data: Verse[]) => setVerses(data))
      .catch((e) => setError(String(e)))
  }, [qs])

  // initialize active ayah from URL (v=) or stored last ayah for this surah
  useEffect(() => {
    let initial: number | null = null
    const vParam = Number(sp.get('v'))
    if (!Number.isNaN(vParam) && vParam > 0) initial = vParam
    if (initial == null) {
      try {
        const raw = localStorage.getItem(`oqr:lastAyah:${surah}`)
        const parsed = raw ? JSON.parse(raw) : null
        if (typeof parsed === 'number' && parsed > 0) initial = parsed
      } catch { }
    }
    if (initial == null) initial = 1
    setActiveAyah(initial)
  }, [surah, sp])

  // persist last read surah
  useEffect(() => {
    try { localStorage.setItem('oqr:lastSurah', JSON.stringify(surah)) } catch { }
  }, [surah])

  // reflect URL (include selected translations and active ayah if set)
  useEffect(() => {
    const t = enabledTranslations.join(',')
    const params = new URLSearchParams()
    if (t) params.set('t', t)
    if (activeAyah && activeAyah > 0) params.set('v', String(activeAyah))
    const qs = params.toString()
    const href = (`/s/${surah}${qs ? `?${qs}` : ''}`) as Route
    router.replace(href, { scroll: false })
  }, [router, surah, enabledTranslations, activeAyah])

  const listRef = useRef<HTMLDivElement>(null)

  // when verses load or active ayah changes, ensure it is in range and scroll into view
  useEffect(() => {
    if (!verses || !verses.length) return
    const first = verses[0]?.ayah
    const last = verses[verses.length - 1]?.ayah
    let next = activeAyah ?? first
    if (typeof next !== 'number' || next < first) next = first
    if (next > last) next = last
    if (next !== activeAyah) setActiveAyah(next)
    const el = document.getElementById(`ayah-${next}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [verses, activeAyah])

  // persist last position (surah + ayah) and per-surah last ayah
  useEffect(() => {
    if (!activeAyah) return
    try {
      localStorage.setItem(`oqr:lastAyah:${surah}`, JSON.stringify(activeAyah))
      localStorage.setItem('oqr:lastPosition', JSON.stringify({ surah, ayah: activeAyah }))
    } catch { }
  }, [surah, activeAyah])

  // Initialize and maintain progressive rendering window
  useEffect(() => {
    if (!verses || !verses.length) return
    const lastAyah = verses[verses.length - 1]?.ayah || 0
    const baseline = activeAyah && activeAyah > 0 ? activeAyah : 1
    setRenderUpto((prev) => {
      const target = Math.min(lastAyah, baseline + RENDER_STEP)
      return prev > target ? prev : target
    })
  }, [verses, activeAyah])

  // Ensure window grows when navigating past current boundary
  useEffect(() => {
    if (!verses || !verses.length || !activeAyah) return
    const lastAyah = verses[verses.length - 1]?.ayah || 0
    if (activeAyah > renderUpto) {
      setRenderUpto(Math.min(lastAyah, activeAyah + RENDER_STEP))
    }
  }, [activeAyah, verses, renderUpto])

  // Infinite bottom sentinel to progressively render more verses
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!verses || !verses.length) return
    const el = bottomRef.current
    if (!el) return
    const lastAyah = verses[verses.length - 1]?.ayah || 0
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setRenderUpto((prev) => Math.min(lastAyah, prev + RENDER_STEP))
      }
    })
    io.observe(el)
    return () => io.disconnect()
  }, [verses, bottomRef])

  // Keyboard navigation: ←/k previous, →/j next
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = document.activeElement as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'select' || tag === 'textarea' || target?.isContentEditable) return
      if (isSurahOpen || isTranslationsOpen) return
      if (!verses || !verses.length) return
      const first = verses[0]?.ayah || 1
      const last = verses[verses.length - 1]?.ayah || first
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'j') {
        e.preventDefault()
        setActiveAyah((prev) => {
          const next = Math.min(last, (prev || first) + 1)
          return next
        })
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setActiveAyah((prev) => {
          const next = Math.max(first, (prev || first) - 1)
          return next
        })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [verses, isSurahOpen, isTranslationsOpen])

  const arabicSizeVar = font === 'sm' ? '20px' : font === 'lg' ? '28px' : '24px'
  const selectedTranslations = translations.filter((t) => enabledTranslations.includes(t.id))

  return (
    <main className="container">
      <header className="header" role="banner">
        <div className="header-inner">
          <div className="brand">OQR — Surah {surah}</div>
          <nav className="toolbar" aria-label="Reader controls">
            <div ref={surahDropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="button"
                aria-haspopup="listbox"
                aria-expanded={isSurahOpen}
                onClick={() => setSurahOpen((o) => !o)}
                aria-label="Select surah"
              >
                سورة {surahs.find((s) => s.number === surah)?.name_ar || surah}
              </button>
              {isSurahOpen ? (
                <div className="card" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 360, maxHeight: 360, overflow: 'auto', padding: 8, zIndex: 20 }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <input
                      className="input"
                      type="text"
                      placeholder="جستجو سوره..."
                      value={surahQuery}
                      onChange={(e) => setSurahQuery(e.target.value)}
                      autoFocus
                    />
                    <div role="listbox" aria-label="Surah list" style={{ display: 'grid', gap: 4 }}>
                      {(surahQuery ? surahs.filter((s) => `${s.name_ar} ${s.number}`.includes(surahQuery)) : surahs).map((s) => (
                        <button
                          key={s.number}
                          type="button"
                          className="button"
                          role="option"
                          aria-selected={s.number === surah}
                          onClick={() => {
                            const nextSurah = s.number
                            try { localStorage.setItem('oqr:lastSurah', JSON.stringify(nextSurah)) } catch { }
                            const t = enabledTranslations.join(',')
                            let v: number | null = null
                            try {
                              const raw = localStorage.getItem(`oqr:lastAyah:${nextSurah}`)
                              const parsed = raw ? JSON.parse(raw) : null
                              if (typeof parsed === 'number' && parsed > 0) v = parsed
                            } catch { }
                            const params = new URLSearchParams()
                            if (t) params.set('t', t)
                            if (v) params.set('v', String(v))
                            const qs = params.toString()
                            const href = (`/s/${nextSurah}${qs ? `?${qs}` : ''}`) as Route
                            setSurahOpen(false)
                            router.push(href, { scroll: false })
                          }}
                          style={{ textAlign: 'unset', justifyContent: 'space-between', display: 'flex' }}
                        >
                          <span>سورة {s.name_ar}</span>
                          <span className="muted">{s.number}</span>
                        </button>
                      ))}
                      {!surahs.length ? (
                        <div className="muted">No surahs available</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div ref={translationsRef} style={{ position: 'relative' }}>
              <button type="button" className="button" onClick={() => setTranslationsOpen((o) => !o)}>
                Translations{enabledTranslations.length ? ` (${enabledTranslations.length})` : ''}
              </button>
              {isTranslationsOpen ? (
                <div className="card" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 360, maxHeight: 320, overflow: 'auto', padding: 8, zIndex: 20 }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {translations.map((t) => {
                      const checked = enabledTranslations.includes(t.id)
                      return (
                        <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setEnabledTranslations((prev) => {
                                const set = new Set(prev)
                                if (e.target.checked) set.add(t.id)
                                else set.delete(t.id)
                                return Array.from(set)
                              })
                            }}
                          />
                          <span>{t.language}: {t.name}</span>
                        </label>
                      )
                    })}
                    {translations.length === 0 ? (
                      <div className="muted">No translations available</div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            <select className="select" value={font} onChange={(e) => setFont(e.target.value as any)}>
              <option value="sm">A-</option>
              <option value="md">A</option>
              <option value="lg">A+</option>
            </select>
            <select className="select" value={theme} onChange={(e) => setTheme(e.target.value as any)}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </nav>
        </div>
      </header>

      <section style={{ padding: 16 }}>
        {error && <div className="card" role="alert">Failed to load verses: {error}</div>}
        {!verses ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 64 }} />
            ))}
          </div>
        ) : (
          <div ref={listRef} style={{ '--arabic-size': arabicSizeVar } as React.CSSProperties}>
            {verses.filter((v) => v.ayah <= renderUpto).map((v) => (
              <article
                key={v.ayah}
                id={`ayah-${v.ayah}`}
                className={`ayah${activeAyah === v.ayah ? ' focused' : ''}`}
                tabIndex={0}
                aria-current={activeAyah === v.ayah ? 'true' : undefined}
                onClick={() => setActiveAyah(v.ayah)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setActiveAyah(v.ayah)
                  }
                }}
              >
                {v.ayah === 1 && v.bismillah && !v.text_ar_simple.startsWith(v.bismillah) ? (
                  <div className="arabic" dir="rtl" lang="ar" style={{ opacity: 0.9 }}>
                    {v.bismillah}
                  </div>
                ) : null}
                <div className="arabic" dir="rtl" lang="ar">
                  <span className="ayah-num">{v.ayah}</span>
                  <span>{v.text_ar_simple}</span>
                </div>
                {v.translations?.length ? (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {selectedTranslations.map((st) => {
                      const found = v.translations?.find((tr) => tr.translationId === st.id)
                      if (!found) return null
                      return (
                        <div key={st.id} className="translation" dir="auto">
                          <span style={{ color: 'var(--accent)' }}>{st.name}:</span>{' '}
                          <span>{found.text}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </article>
            ))}
            {renderUpto < (verses[verses.length - 1]?.ayah || 0) ? (
              <div ref={bottomRef} className="skeleton" style={{ height: 32, marginTop: 8 }} />
            ) : null}
          </div>
        )}
      </section>

      <footer className="footer">Showing all verses. Toggle translations from the toolbar.</footer>
    </main>
  )
}

