'use client'

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import type { Route } from 'next'
import { useRouter, useSearchParams } from 'next/navigation'

type TranslationMeta = { id: string; name: string; language: string }

type Verse = {
    surah: number
    ayah: number
    text_ar_simple: string
    bismillah?: string
    translations?: Array<{ translationId: string; text: string }>
}

type SurahMeta = { number: number; name_ar: string }

const STATIC_BASE = (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/quran'

function isRtlLanguage(lang: string | undefined): boolean {
    const rtlLangs = new Set(['ar', 'fa', 'ur', 'he', 'ps', 'sd', 'ug', 'ku', 'yi'])
    return !!lang && rtlLangs.has(lang.toLowerCase())
}

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

export default function ReaderClient({ params }: { params: { surah: string } }) {
    const router = useRouter()
    const sp = useSearchParams()

    const surah = Number(params.surah)
    const [font, setFont] = useLocalStorage<'sm' | 'md' | 'lg'>('oqr:font', 'md')
    const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('oqr:theme', 'dark')
    const [enabledTranslations, setEnabledTranslations] = useLocalStorage<string[]>('oqr:translations', (sp.get('t')?.split(',').filter(Boolean)) || ['en.arberry'])

    const [translations, setTranslations] = useState<TranslationMeta[]>([])
    const [verses, setVerses] = useState<Verse[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [surahs, setSurahs] = useState<SurahMeta[]>([])
    const [isSurahOpen, setSurahOpen] = useState(false)
    const [surahQuery, setSurahQuery] = useState('')
    const surahDropdownRef = useRef<HTMLDivElement>(null)
    const [activeAyah, setActiveAyah] = useState<number | null>(null)
    const [renderUpto, setRenderUpto] = useState<number>(0)
    const RENDER_STEP = 50
    const [isSidebarOpen, setSidebarOpen] = useState(false)

    // Audio state
    const reciterOptions = useMemo(
        () => [
            { id: 'Abu_Bakr_Ash-Shaatree_128kbps', name: 'Abu Bakr Ash-Shaatree (128kbps)' },
            { id: 'Alafasy_128kbps', name: 'Mishary Rashid Alafasy (128kbps)' },
            { id: 'Ghamadi_64kbps', name: 'Saad Al-Ghamdi (64kbps)' },
            { id: 'Abdul_Basit_Murattal_128kbps', name: 'Abdul Basit (Murattal, 128kbps)' },
            { id: 'Husary_128kbps', name: 'Al-Husary (Tartil, 128kbps)' },
            { id: 'Minshawy_Murattal_128kbps', name: 'Minshawy (Murattal, 128kbps)' },
        ],
        []
    )
    const [reciter, setReciter] = useLocalStorage<string>('oqr:reciter', 'Alafasy_128kbps')
    const [autoplay, setAutoplay] = useLocalStorage<boolean>('oqr:autoplay', true)
    const [playingAyah, setPlayingAyah] = useState<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null) as MutableRefObject<HTMLAudioElement | null>

    useEffect(() => {
        document.documentElement.dataset.theme = theme
    }, [theme])

    // Create a single audio element for this page
    useEffect(() => {
        if (!audioRef.current) {
            const audio = new Audio()
            audio.preload = 'none'
            audioRef.current = audio
        }
    }, [])

    // Media Session metadata
    useEffect(() => {
        // @ts-ignore
        if ('mediaSession' in navigator) {
            // @ts-ignore
            navigator.mediaSession.setActionHandler?.('previoustrack', () => {
                setActiveAyah((prev) => Math.max(1, (prev || 1) - 1))
            })
            // @ts-ignore
            navigator.mediaSession.setActionHandler?.('nexttrack', () => {
                setActiveAyah((prev) => (prev || 1) + 1)
            })
        }
    }, [])

    // Load translations list and surah names by parsing XML client-side once
    useEffect(() => {
        let alive = true
        async function loadMeta() {
            try {
                const res = await fetch(`${STATIC_BASE}/quran-simple.xml`)
                const text = await res.text()
                const list: SurahMeta[] = []
                const re = /<sura\s+index="(\d+)"\s+name="([^"]*)">/g
                let m: RegExpExecArray | null
                while ((m = re.exec(text)) !== null) list.push({ number: parseInt(m[1], 10), name_ar: m[2] })
                if (alive) setSurahs(list)
            } catch { if (alive) setSurahs([]) }

            // Known translation files shipped in assets; keep minimal metadata
            const known: TranslationMeta[] = [
                { id: 'en.arberry', name: 'Arberry', language: 'en' },
                { id: 'fa.bahrampour', name: 'Bahrampour', language: 'fa' },
                { id: 'fa.fooladvand', name: 'Fooladvand', language: 'fa' },
                { id: 'fa.gharaati', name: 'Gharaati', language: 'fa' },
                { id: 'fa.makarem', name: 'Makarem', language: 'fa' },
            ]
            if (alive) setTranslations(known)
        }
        void loadMeta()
        return () => { alive = false }
    }, [])

    // Close dropdowns on outside click
    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            const target = e.target as Node
            if (surahDropdownRef.current && !surahDropdownRef.current.contains(target)) setSurahOpen(false)
        }
        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [])

    const tParam = useMemo(() => enabledTranslations.join(','), [enabledTranslations])

    // Load verses and selected translations from static files
    useEffect(() => {
        let alive = true
        setVerses(null)
        setError(null)

        async function load() {
            try {
                // Parse Arabic verses for this surah from quran-simple.xml
                const baseRes = await fetch(`${STATIC_BASE}/quran-simple.xml`)
                if (!baseRes.ok) throw new Error('Failed to load quran-simple.xml')
                const xml = await baseRes.text()
                const suraRe = new RegExp(`<sura\\s+index=\"${surah}\"[\\s\\S]*?<\\/sura>`, 'm')
                const sMatch = xml.match(suraRe)
                if (!sMatch) throw new Error('Surah not found')
                const inner = sMatch[0]
                const ayaRe = /<aya\s+index="(\d+)"\s+text="([\s\S]*?)"(?:\s+bismillah="([^"]*)")?\s*\/>/g
                const baseList: Array<{ surah: number; ayah: number; text_ar_simple: string; bismillah?: string }> = []
                let m: RegExpExecArray | null
                const decode = (t: string) => t.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                while ((m = ayaRe.exec(inner)) !== null) {
                    const ayah = parseInt(m[1], 10)
                    const text = decode(m[2])
                    const bism = m[3] ? decode(m[3]) : undefined
                    baseList.push({ surah, ayah, text_ar_simple: text, ...(bism ? { bismillah: bism } : {}) })
                }

                const ids = tParam ? tParam.split(',').filter(Boolean) : []
                if (!ids.length) { if (alive) setVerses(baseList as Verse[]); return }

                const transMapByAyah = new Map<number, Record<string, string>>()
                for (const id of ids) {
                    const trRes = await fetch(`${STATIC_BASE}/${id}.xml`)
                    if (!trRes.ok) continue
                    const txml = await trRes.text()
                    const tMatch = txml.match(suraRe)
                    if (!tMatch) continue
                    const tInner = tMatch[0]
                    const tAyaRe = /<aya\s+index="(\d+)"\s+text="([\s\S]*?)"\s*\/>/g
                    let tm: RegExpExecArray | null
                    while ((tm = tAyaRe.exec(tInner)) !== null) {
                        const ayah = parseInt(tm[1], 10)
                        const text = decode(tm[2])
                        const pack = transMapByAyah.get(ayah) || {}
                        pack[id] = text
                        transMapByAyah.set(ayah, pack)
                    }
                }

                const merged: Verse[] = baseList.map((v) => {
                    const pack = transMapByAyah.get(v.ayah) || {}
                    const list = Object.entries(pack).map(([translationId, text]) => ({ translationId, text }))
                    return list.length ? { ...v, translations: list } : v
                })
                if (alive) setVerses(merged)
            } catch (e: any) {
                if (alive) setError(String(e?.message || e))
            }
        }

        void load()
        return () => { alive = false }
    }, [surah, tParam])

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
        // Defer scroll to after the DOM updates
        const id = `ayah-${next}`
        const t = setTimeout(() => {
            const el = document.getElementById(id)
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 0)
        return () => clearTimeout(t)
    }, [verses, activeAyah])

    // If the progressive window grows to include activeAyah, scroll to it
    useEffect(() => {
        if (!verses || !verses.length) return
        if (!activeAyah) return
        if (renderUpto < activeAyah) return
        const el = document.getElementById(`ayah-${activeAyah}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, [renderUpto, activeAyah, verses])

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
            if (isSurahOpen || isSidebarOpen) return
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
    }, [verses, isSurahOpen, isSidebarOpen])

    const arabicSizeVar = font === 'sm' ? '20px' : font === 'lg' ? '28px' : '24px'
    const selectedTranslations = translations.filter((t) => enabledTranslations.includes(t.id))

    function pad3(n: number) {
        return String(n).padStart(3, '0')
    }

    // Prefix sum and audio helpers
    const AYAH_COUNT = useMemo(() => [
        0,
        7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
        123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
        112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
        34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
        54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
        60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
        14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
        28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
        29, 19, 36, 25, 22, 17, 19, 26, 30, 20,
        15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
        11, 8, 3, 9, 5, 4, 7, 3, 6, 3,
        5, 4, 5, 6
    ], [])

    const AYAH_OFFSET = useMemo(() => {
        const arr = new Array(115).fill(0)
        for (let s = 2; s <= 114; s++) arr[s] = arr[s - 1] + AYAH_COUNT[s - 1]
        return arr as number[]
    }, [AYAH_COUNT])

    function getGlobalAyahIndex(surahNum: number, ayahNum: number) {
        const offset = AYAH_OFFSET[surahNum] || 0
        return offset + ayahNum
    }

    function buildAudioUrl(surahNum: number, ayahNum: number) {
        if (reciter === 'Alafasy_128kbps') {
            const global = getGlobalAyahIndex(surahNum, ayahNum)
            return `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${global}.mp3`
        }
        const s = pad3(surahNum)
        const a = pad3(ayahNum)
        return `https://everyayah.com/data/${reciter}/${s}${a}.mp3`
    }

    function playAyah(ayah: number) {
        if (!verses || !verses.length) return
        const audio = audioRef.current || new Audio()
        audioRef.current = audio
        audio.pause()
        audio.src = buildAudioUrl(surah, ayah)
        try { audio.load() } catch { }
        audio.currentTime = 0
        audio.play().catch(() => { })
        setPlayingAyah(ayah)

        // @ts-ignore
        if ('mediaSession' in navigator) {
            // @ts-ignore
            navigator.mediaSession.metadata = new window.MediaMetadata({
                title: `Surah ${surah} — Ayah ${ayah}`,
                artist: reciter.replace(/_/g, ' '),
                album: 'OpenQuranReader (EveryAyah)'
            })
        }
    }

    function stopPlayback() {
        const audio = audioRef.current
        if (audio) audio.pause()
        setPlayingAyah(null)
    }

    useEffect(() => {
        const audio = audioRef.current || new Audio()
        if (!audioRef.current) audioRef.current = audio
        const onEnded = () => {
            if (!autoplay) { setPlayingAyah(null); return }
            setActiveAyah((prev) => {
                const first = verses?.[0]?.ayah || 1
                const last = verses?.[verses.length - 1]?.ayah || first
                const current = prev || first
                if (current >= last) { setPlayingAyah(null); return current }
                const next = current + 1
                setTimeout(() => playAyah(next), 0)
                return next
            })
        }
        const onError = () => { if (autoplay) onEnded(); else setPlayingAyah(null) }
        audio.addEventListener('ended', onEnded)
        audio.addEventListener('error', onError)
        return () => {
            audio.removeEventListener('ended', onEnded)
            audio.removeEventListener('error', onError)
        }
    }, [autoplay, verses, reciter])

    function toggleToolbarPlay() {
        if (!verses || !verses.length) return
        const first = verses[0]?.ayah || 1
        const current = (activeAyah && activeAyah > 0) ? activeAyah : first
        if (playingAyah === current) { stopPlayback(); return }
        if (activeAyah !== current) setActiveAyah(current)
        playAyah(current)
    }

    function goPrevAyah() {
        if (!verses || !verses.length) return
        const first = verses[0]?.ayah || 1
        setActiveAyah((prev) => {
            const next = Math.max(first, (prev || first) - 1)
            if (playingAyah != null) setTimeout(() => playAyah(next), 0)
            return next
        })
    }

    function goNextAyah() {
        if (!verses || !verses.length) return
        const first = verses[0]?.ayah || 1
        const last = verses[verses.length - 1]?.ayah || first
        setActiveAyah((prev) => {
            const curr = prev || first
            const next = Math.min(last, curr + 1)
            if (playingAyah != null) setTimeout(() => playAyah(next), 0)
            return next
        })
    }

    return (
        <main className="container">
            <header className="header" role="banner">
                <div className="header-inner">
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
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M4 19.5V5a2 2 0 0 1 2-2h10.5" />
                                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                        <path d="M20 22V4a2 2 0 0 0-2-2H6" />
                                    </svg>
                                    <span dir="rtl" lang="ar">سورة {surahs.find((s) => s.number === surah)?.name_ar || surah}</span>
                                    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginInlineStart: 4 }}>
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </span>
                            </button>
                            {isSurahOpen ? (
                                <div className="card" style={{ position: 'absolute', left: 0, top: 'calc(100% + 8px)', width: 360, maxHeight: 360, overflow: 'auto', padding: 8, zIndex: 20 }}>
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
                        <button
                            type="button"
                            className="icon-btn"
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Open settings"
                            title="Settings"
                        >
                            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M3 6h18M3 12h18M3 18h18" />
                            </svg>
                        </button>
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
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                                    <span className="muted">Ayah {v.ayah}</span>
                                </div>
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
                                            const rtl = isRtlLanguage(st.language)
                                            return (
                                                <div
                                                    key={st.id}
                                                    className="translation"
                                                    dir={rtl ? 'rtl' : 'ltr'}
                                                    lang={st.language}
                                                    style={{ textAlign: rtl ? 'right' : 'left' }}
                                                >
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

            {/* Floating audio controls */}
            <div className="floating-audio" role="region" aria-label="Audio controls">
                <button type="button" className="icon-btn" aria-label="Previous ayah" title="Previous" onClick={goPrevAyah}>
                    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>
                <button
                    type="button"
                    className="icon-btn"
                    aria-label={playingAyah === activeAyah && playingAyah != null ? 'Pause' : 'Play'}
                    title={playingAyah === activeAyah && playingAyah != null ? 'Pause' : 'Play'}
                    onClick={toggleToolbarPlay}
                >
                    {playingAyah === activeAyah && playingAyah != null ? (
                        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                        </svg>
                    ) : (
                        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polygon points="6,4 20,12 6,20 6,4" />
                        </svg>
                    )}
                </button>
                <button type="button" className="icon-btn" aria-label="Next ayah" title="Next" onClick={goNextAyah}>
                    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 6l6 6-6 6" />
                    </svg>
                </button>
                <span className="sep" aria-hidden="true" />
                <button
                    type="button"
                    className={`icon-btn${autoplay ? ' active' : ''}`}
                    aria-pressed={autoplay}
                    aria-label={autoplay ? 'Disable autoplay' : 'Enable autoplay'}
                    title="Autoplay"
                    onClick={() => setAutoplay(!autoplay)}
                >
                    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 12a9 9 0 1 0 3-6.7M3 5v6h6" />
                    </svg>
                </button>
            </div>

            {/* Sidebar */}
            {isSidebarOpen ? <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" /> : null}
            <aside className={`sidebar${isSidebarOpen ? ' open' : ''}`} aria-hidden={!isSidebarOpen} aria-label="Settings sidebar">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div className="muted">Settings</div>
                    <button type="button" className="icon-btn" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)}>
                        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="section">
                    <div className="muted" style={{ marginBottom: 8 }}>Theme</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            type="button"
                            className={`icon-btn${theme === 'light' ? ' active' : ''}`}
                            aria-pressed={theme === 'light'}
                            aria-label="Light theme"
                            onClick={() => setTheme('light')}
                            title="Light"
                        >
                            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="4" />
                                <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l-1.5-1.5M20.5 20.5L19 19M5 19l-1.5 1.5M20.5 3.5L19 5" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            className={`icon-btn${theme === 'dark' ? ' active' : ''}`}
                            aria-pressed={theme === 'dark'}
                            aria-label="Dark theme"
                            onClick={() => setTheme('dark')}
                            title="Dark"
                        >
                            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="section">
                    <div className="muted" style={{ marginBottom: 8 }}>Font size</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className={`icon-btn${font === 'sm' ? ' active' : ''}`} aria-pressed={font === 'sm'} aria-label="Small font" onClick={() => setFont('sm')} title="Small">
                            <span style={{ fontSize: 12, fontWeight: 700 }}>A</span>
                        </button>
                        <button type="button" className={`icon-btn${font === 'md' ? ' active' : ''}`} aria-pressed={font === 'md'} aria-label="Medium font" onClick={() => setFont('md')} title="Medium">
                            <span style={{ fontSize: 14, fontWeight: 700 }}>A</span>
                        </button>
                        <button type="button" className={`icon-btn${font === 'lg' ? ' active' : ''}`} aria-pressed={font === 'lg'} aria-label="Large font" onClick={() => setFont('lg')} title="Large">
                            <span style={{ fontSize: 16, fontWeight: 700 }}>A</span>
                        </button>
                    </div>
                </div>

                <div className="section">
                    <div className="muted" style={{ marginBottom: 8 }}>Translations</div>
                    <div style={{ display: 'grid', gap: 8, maxHeight: 260, overflow: 'auto' }}>
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

                <div className="section">
                    <div className="muted" style={{ marginBottom: 8 }}>Reciter</div>
                    <select className="select" value={reciter} onChange={(e) => setReciter(e.target.value)} aria-label="Select reciter">
                        {reciterOptions.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                </div>
            </aside>

            <footer className="footer">Showing all verses. Data is loaded from static files.</footer>
        </main>
    )
}


