'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Route } from 'next'
import { useRouter, useSearchParams } from 'next/navigation'

type Translation = { id: string; name: string; language: string }

type Verse = {
  surah: number
  ayah: number
  text_ar_simple: string
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

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!translationsRef.current) return
      if (!translationsRef.current.contains(e.target as Node)) setTranslationsOpen(false)
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

  // persist last read surah
  useEffect(() => {
    try { localStorage.setItem('oqr:lastSurah', JSON.stringify(surah)) } catch { }
  }, [surah])

  // reflect URL
  useEffect(() => {
    const t = enabledTranslations.join(',')
    const href = `/s/${surah}${t ? `?t=${encodeURIComponent(t)}` : ''}` as Route
    router.replace(href)
  }, [router, surah, enabledTranslations])

  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!verses || !verses.length) return
    const el = document.getElementById(`ayah-${verses[0].ayah}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [verses])

  const arabicSizeVar = font === 'sm' ? '20px' : font === 'lg' ? '28px' : '24px'
  const selectedTranslations = translations.filter((t) => enabledTranslations.includes(t.id))

  return (
    <main className="container">
      <header className="header" role="banner">
        <div className="header-inner">
          <div className="brand">OQR — Surah {surah}</div>
          <nav className="toolbar" aria-label="Reader controls">
            <select
              className="select"
              value={String(surah)}
              onChange={(e) => {
                const nextSurah = Number(e.target.value)
                try { localStorage.setItem('oqr:lastSurah', JSON.stringify(nextSurah)) } catch { }
                const t = enabledTranslations.join(',')
                const href = (`/s/${nextSurah}${t ? `?t=${encodeURIComponent(t)}` : ''}`) as Route
                router.push(href)
              }}
              aria-label="Select surah"
            >
              {surahs.length === 0 ? (
                <option value={String(surah)}>Surah {surah}</option>
              ) : (
                surahs.map((s) => (
                  <option key={s.number} value={String(s.number)}>
                    {`سورة ${s.name_ar} — ${s.number}`}
                  </option>
                ))
              )}
            </select>
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
            {verses.map((v) => (
              <article key={v.ayah} id={`ayah-${v.ayah}`} className="ayah" tabIndex={0}>
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
          </div>
        )}
      </section>

      <footer className="footer">Showing all verses. Toggle translations from the toolbar.</footer>
    </main>
  )
}

