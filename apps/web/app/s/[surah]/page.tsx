'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

type Translation = { id: string; name: string; language: string }

type Verse = {
  surah: number
  ayah: number
  text_ar_simple: string
  translations?: Array<{ translationId: string; text: string }>
}

const API = 'http://localhost:4000'

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
    try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
  }, [key, value])
  return [value, setValue] as const
}

export default function ReaderPage({ params }: { params: { surah: string } }) {
  const router = useRouter()
  const sp = useSearchParams()

  const surah = Number(params.surah)
  const [from, setFrom] = useState<number>(Number(sp.get('from') || 1))
  const [to, setTo] = useState<number>(Number(sp.get('to') || 7))
  const [font, setFont] = useLocalStorage<'sm' | 'md' | 'lg'>('oqr:font', 'md')
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('oqr:theme', (document.documentElement.dataset.theme as any) || 'dark')
  const [translationId, setTranslationId] = useLocalStorage<string>('oqr:translation', sp.get('t') || 'en.arberry')

  const [translations, setTranslations] = useState<Translation[]>([])
  const [verses, setVerses] = useState<Verse[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    fetch(`${API}/translations`)
      .then((r) => r.json())
      .then((data: any[]) => setTranslations(data))
      .catch(() => setTranslations([]))
  }, [])

  const qs = useMemo(() => new URLSearchParams({ surah: String(surah), from: String(from), to: String(to), translation_ids: translationId }).toString(), [surah, from, to, translationId])

  useEffect(() => {
    setVerses(null)
    setError(null)
    fetch(`${API}/verses?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((data: Verse[]) => setVerses(data))
      .catch((e) => setError(String(e)))
  }, [qs])

  // reflect URL
  useEffect(() => {
    const url = `/s/${surah}?from=${from}&to=${to}${translationId ? `&t=${encodeURIComponent(translationId)}` : ''}`
    router.replace(url)
  }, [router, surah, from, to, translationId])

  // keyboard navigation
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'k') setFrom((f) => Math.max(1, f - 1))
      if (e.key === 'ArrowLeft' || e.key === 'j') setFrom((f) => f + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    // lock to single-ayah window when using arrows
    setTo(from)
  }, [from])

  useEffect(() => {
    if (!verses || !verses.length) return
    const el = document.getElementById(`ayah-${verses[0].ayah}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [verses])

  const arabicSizeVar = font === 'sm' ? '20px' : font === 'lg' ? '28px' : '24px'
  const selectedTranslation = translations.find((t) => t.id === translationId)

  return (
    <main className="container">
      <header className="header" role="banner">
        <div className="header-inner">
          <div className="brand">OQR — Surah {surah}</div>
          <nav className="toolbar" aria-label="Reader controls">
            <Link className="button" href="/s">Surahs</Link>
            <label>
              <span style={{ marginInlineEnd: 6 }}>From</span>
              <input className="input" type="number" min={1} value={from} onChange={(e) => setFrom(Number(e.target.value || 1))} style={{ width: 80 }} />
            </label>
            <label>
              <span style={{ marginInlineEnd: 6 }}>To</span>
              <input className="input" type="number" min={from} value={to} onChange={(e) => setTo(Number(e.target.value || from))} style={{ width: 80 }} />
            </label>
            <select className="select" value={translationId} onChange={(e) => setTranslationId(e.target.value)}>
              {translations.map((t) => (
                <option key={t.id} value={t.id}>{t.language}: {t.name}</option>
              ))}
            </select>
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
                  <div className="translation" dir="auto">
                    <span style={{ color: 'var(--accent)' }}>{selectedTranslation?.name}:</span>{' '}
                    <span>{v.translations[0].text}</span>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="footer">Use j/← and k/→ to move between ayahs. URL updates for deep links.</footer>
    </main>
  )
}

