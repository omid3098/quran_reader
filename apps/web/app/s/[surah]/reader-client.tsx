'use client'

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { Menu, Book, BookMarked, Settings, ChevronDown, FileText, Share2, ChevronLeft, ChevronRight, Pause, Play, ListEnd, Bookmark, LoaderCircle } from 'lucide-react'
import type { Route } from 'next'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocalStorage } from '../../../hooks/use-local-storage'
import { isRtlLanguage } from '../../../lib/is-rtl-language'
import { encodeSharePayload, decodeSharePayload } from '../../../lib/share'
import { OllamaClient } from '../../../lib/ollama'
import Sidebar from './Sidebar'
import type { TranslationMeta } from '@openquranreader/types'
import type { BookmarksSet, NotesMap, VerseKey } from './types'

type Verse = {
    surah: number
    ayah: number
    text_ar_simple: string
    bismillah?: string
    translations?: Array<{ translationId: string; text: string }>
}

type SurahMeta = { number: number; name_ar: string }

const STATIC_BASE = (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/quran'
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''

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
    const surahListRef = useRef<HTMLDivElement>(null)
    const [activeAyah, setActiveAyah] = useState<number | null>(null)
    const [isSidebarOpen, setSidebarOpen] = useState(false)
    // Local bookmarks and notes
    const [bookmarks, setBookmarks] = useLocalStorage<BookmarksSet>('oqr:bookmarks', {})
    const [notes, setNotes] = useLocalStorage<NotesMap>('oqr:notes', {})
    const [openNoteAyah, setOpenNoteAyah] = useState<number | null>(null)
    const [incomingShare, setIncomingShare] = useState<null | { bookmarks: VerseKey[]; notes: Array<[VerseKey, string]> }>(null)
    const [hydrated, setHydrated] = useState(false)

    // Audio state
    const [reciter, setReciter] = useLocalStorage<string>('oqr:reciter', 'Alafasy_128kbps')
    const [autoplay, setAutoplay] = useLocalStorage<boolean>('oqr:autoplay', true)
    const [showNotes, setShowNotes] = useLocalStorage<boolean>('oqr:showNotes', true)
    const [ollamaEnabled, setOllamaEnabled] = useLocalStorage<boolean>('oqr:ollamaEnabled', false)
    const [ollamaEndpoint, setOllamaEndpoint] = useLocalStorage<string>('oqr:ollamaEndpoint', 'http://localhost:11434')
    const [ollamaModel, setOllamaModel] = useLocalStorage<string>('oqr:ollamaModel', '')
    const ollamaClient = useMemo(() => new OllamaClient(ollamaEndpoint), [ollamaEndpoint])
    const [rootPanel, setRootPanel] = useState<{ x: number; y: number; text: string; loading: boolean } | null>(null)
    const rootAbortRef = useRef<AbortController | null>(null)
    const [playingAyah, setPlayingAyah] = useState<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null) as MutableRefObject<HTMLAudioElement | null>

    useEffect(() => {
        document.documentElement.dataset.theme = theme
    }, [theme])

    useEffect(() => { setHydrated(true) }, [])

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

    // Auto-scroll surah list to current selection when dropdown opens
    useEffect(() => {
        if (!isSurahOpen) return
        const t = setTimeout(() => {
            const container = surahListRef.current
            if (!container) return
            const active = container.querySelector('button[aria-selected="true"]') as HTMLElement | null
            active?.scrollIntoView({ block: 'center' })
        }, 0)
        return () => clearTimeout(t)
    }, [isSurahOpen, surah])

    const tParam = useMemo(() => enabledTranslations.join(','), [enabledTranslations])

    function makeKey(s: number, a: number): VerseKey { return `${s}:${a}` as VerseKey }

    function isBookmarked(ayah: number): boolean {
        const key = makeKey(surah, ayah)
        return !!bookmarks[key]
    }

    function toggleBookmark(ayah: number) {
        const key = makeKey(surah, ayah)
        setBookmarks((prev) => {
            const next = { ...prev }
            if (next[key]) delete next[key]
            else next[key] = true
            return next
        })
    }

    function getNote(ayah: number): string {
        const key = makeKey(surah, ayah)
        return notes[key]?.text || ''
    }

    function saveNote(ayah: number, text: string) {
        const key = makeKey(surah, ayah)
        const trimmed = text.trim()
        setNotes((prev) => {
            const next = { ...prev }
            if (trimmed) next[key] = { text: trimmed, updatedAt: new Date().toISOString() }
            else delete next[key]
            return next
        })
    }

    async function handleWordContext(e: React.MouseEvent<HTMLSpanElement>, word: string, verse: string) {
        if (!ollamaEnabled || !ollamaModel) return
        e.preventDefault()
        const { clientX: x, clientY: y } = e
        rootAbortRef.current?.abort()
        const controller = new AbortController()
        rootAbortRef.current = controller
        setRootPanel({ x, y, text: '', loading: true })
        try {
            const root = await ollamaClient.getRoot(word, verse, ollamaModel, controller.signal)
            if (!controller.signal.aborted) setRootPanel({ x, y, text: root || 'N/A', loading: false })
        } catch {
            if (!controller.signal.aborted) setRootPanel({ x, y, text: 'N/A', loading: false })
        }
    }

    function handleWordLeave() {
        rootAbortRef.current?.abort()
        rootAbortRef.current = null
        setRootPanel(null)
    }

    // Share helpers (URL-safe base64)
    function encodeSharePayload(obj: any): string {
        try {
            const json = JSON.stringify(obj)
            const b64 = btoa(unescape(encodeURIComponent(json)))
            return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
        } catch {
            return ''
        }
    }

    function decodeSharePayload(s: string): any | null {
        try {
            const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
            const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad
            const json = decodeURIComponent(escape(atob(b64)))
            return JSON.parse(json)
        } catch {
            return null
        }
    }

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
        // preserve share param only if currently reviewing incomingShare
        if (incomingShare) {
            const spShare = sp.get('share')
            if (spShare) params.set('share', spShare)
        }
        const qs = params.toString()
        const href = (`/s/${surah}${qs ? `?${qs}` : ''}`) as Route
        router.replace(href, { scroll: false })
    }, [router, surah, enabledTranslations, activeAyah, incomingShare, sp])

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

    // persist last position (surah + ayah) and per-surah last ayah
    useEffect(() => {
        if (!activeAyah) return
        try {
            localStorage.setItem(`oqr:lastAyah:${surah}`, JSON.stringify(activeAyah))
            localStorage.setItem('oqr:lastPosition', JSON.stringify({ surah, ayah: activeAyah }))
        } catch { }
    }, [surah, activeAyah])

    // All verses are rendered at once; no lazy loading needed

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
                const curr = (activeAyah || first)
                if (curr >= last) {
                    const nextSurah = surah + 1
                    if (nextSurah <= 114) navigateToSurah(nextSurah, 1)
                    return
                }
                setActiveAyah((prev) => {
                    const next = Math.min(last, (prev || first) + 1)
                    return next
                })
            } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'k') {
                e.preventDefault()
                const curr = (activeAyah || first)
                if (curr <= first) {
                    const prevSurah = surah - 1
                    if (prevSurah >= 1) navigateToSurah(prevSurah, AYAH_COUNT[prevSurah] || 1)
                    return
                }
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
    const translationSizeVar = font === 'sm' ? '12px' : font === 'lg' ? '16px' : '14px'
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

    function navigateToSurah(targetSurah: number, fallbackAyah: number) {
        if (targetSurah < 1 || targetSurah > 114) return
        try { localStorage.setItem('oqr:lastSurah', JSON.stringify(targetSurah)) } catch { }
        const t = enabledTranslations.join(',')
        let v: number | null = null
        try {
            const raw = localStorage.getItem(`oqr:lastAyah:${targetSurah}`)
            const parsed = raw ? JSON.parse(raw) : null
            if (typeof parsed === 'number' && parsed > 0) v = parsed
        } catch { }
        const params = new URLSearchParams()
        if (t) params.set('t', t)
        params.set('v', String(v || fallbackAyah))
        const href = (`/s/${targetSurah}?${params.toString()}`) as Route
        setSurahOpen(false)
        router.push(href, { scroll: false })
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
        const current = (activeAyah || first)
        if (current <= first) {
            const prevSurah = surah - 1
            if (prevSurah >= 1) navigateToSurah(prevSurah, AYAH_COUNT[prevSurah] || 1)
            return
        }
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
        const current = (activeAyah || first)
        if (current >= last) {
            const nextSurah = surah + 1
            if (nextSurah <= 114) navigateToSurah(nextSurah, 1)
            return
        }
        setActiveAyah((prev) => {
            const curr = prev || first
            const next = Math.min(last, curr + 1)
            if (playingAyah != null) setTimeout(() => playAyah(next), 0)
            return next
        })
    }

    // Incoming share parse (from URL ?share=...)
    useEffect(() => {
        const shareParam = sp.get('share')
        if (!shareParam) { setIncomingShare(null); return }
        const decoded = decodeSharePayload(shareParam)
        if (!decoded || typeof decoded !== 'object') { setIncomingShare(null); return }
        const v = Number(decoded?.v || 0)
        if (v !== 1) { setIncomingShare(null); return }
        const bm: VerseKey[] = Array.isArray(decoded?.bookmarks) ? decoded.bookmarks.filter((k: any) => typeof k === 'string') : []
        const ns: Array<[VerseKey, string]> = Array.isArray(decoded?.notes) ? decoded.notes.filter((it: any) => Array.isArray(it) && typeof it[0] === 'string' && typeof it[1] === 'string').map((it: any) => [it[0] as VerseKey, it[1] as string]) : []
        setIncomingShare({ bookmarks: bm, notes: ns })
    }, [sp])

    function acceptIncomingShare() {
        if (!incomingShare) return
        const now = new Date().toISOString()
        setBookmarks((prev) => {
            const next = { ...prev }
            for (const k of incomingShare.bookmarks) next[k as VerseKey] = true
            return next
        })
        setNotes((prev) => {
            const next = { ...prev }
            for (const [k, text] of incomingShare.notes) {
                const trimmed = text.trim()
                if (!trimmed) continue
                next[k as VerseKey] = { text: trimmed, updatedAt: now }
            }
            return next
        })
        // Remove share param from URL
        const params = new URLSearchParams()
        const t = enabledTranslations.join(',')
        if (t) params.set('t', t)
        if (activeAyah && activeAyah > 0) params.set('v', String(activeAyah))
        const href = (`/s/${surah}${params.toString() ? `?${params.toString()}` : ''}`) as Route
        setIncomingShare(null)
        router.replace(href, { scroll: false })
    }

    function dismissIncomingShare() {
        // Keep param but hide UI for this session
        setIncomingShare(null)
    }

    function shareVerseAsLink(ayah: number): string | null {
        const key = makeKey(surah, ayah)
        const includeBm = !!bookmarks[key]
        const n = notes[key]?.text
        const compact = { v: 1, bookmarks: includeBm ? [key] : [], notes: n ? [[key, n]] : [] }
        const enc = encodeSharePayload(compact)
        if (!enc) return null
        const base = (typeof window !== 'undefined') ? window.location.origin : ''
        const params = new URLSearchParams()
        const t = enabledTranslations.join(',')
        if (t) params.set('t', t)
        params.set('v', String(ayah))
        params.set('share', enc)
        return `${base}${BASE_PATH}/s/${surah}?${params.toString()}`
    }

    return (
        <>
            <header className="header" role="banner">
                <div className="header-inner">
                    <nav className="toolbar" aria-label="Reader controls" style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
                        {/* Left: Sidebar (menu) button */}
                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <button
                                type="button"
                                className="icon-btn"
                                onClick={() => setSidebarOpen(true)}
                                aria-label="Open settings"
                                title="Settings"
                            >
                                <Menu className="icon" strokeWidth={2} aria-hidden />
                            </button>
                        </div>

                        {/* Center: Surah dropdown */}
                        <div ref={surahDropdownRef} style={{ position: 'relative', justifySelf: 'center' }}>
                            <button
                                type="button"
                                className="button"
                                aria-haspopup="listbox"
                                aria-expanded={isSurahOpen}
                                onClick={() => setSurahOpen((o) => !o)}
                                aria-label="Select surah"
                            >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                    {/* Book icon */}
                                    <Book className="icon" strokeWidth={2} aria-hidden />
                                    <span dir="rtl" lang="ar">سورة {surahs.find((s) => s.number === surah)?.name_ar || surah} — {surah}</span>
                                    <ChevronDown className="icon" strokeWidth={2} aria-hidden style={{ marginInlineStart: 4 }} />
                                </span>
                            </button>
                            {isSurahOpen ? (
                                <div className="card" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 'calc(100% + 8px)', width: 360, maxHeight: 360, overflow: 'auto', padding: 8, zIndex: 20 }}>
                                    <div style={{ display: 'grid', gap: 8 }}>
                                        <input
                                            className="input"
                                            type="text"
                                            placeholder="جستجو سوره..."
                                            value={surahQuery}
                                            onChange={(e) => setSurahQuery(e.target.value)}
                                            autoFocus
                                        />
                                        <div role="listbox" aria-label="Surah list" style={{ display: 'grid', gap: 4 }} ref={surahListRef}>
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
                                                    style={{ textAlign: 'unset', justifyContent: 'space-between', display: 'flex', ...(s.number === surah ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}) }}
                                                >
                                                    <span>سورة {s.name_ar}</span>
                                                    <span className="muted" style={s.number === surah ? { color: 'var(--accent)' } : undefined}>{s.number}</span>
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

                        {/* Right: Notes toggle */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                className={`icon-btn${showNotes ? ' active' : ''}`}
                                aria-pressed={showNotes}
                                onClick={() => setShowNotes(!showNotes)}
                                aria-label={showNotes ? 'Hide notes' : 'Show notes'}
                                title={showNotes ? 'Hide notes' : 'Show notes'}
                            >
                                <FileText className="icon" strokeWidth={2} aria-hidden />
                            </button>
                        </div>
                    </nav>
                </div>
            </header>

            <main className="container">
                <section style={{ padding: 16 }}>
                    {incomingShare ? (
                        <div className="card" role="region" aria-label="Incoming shared data" style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                <div>
                                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Shared data detected</div>
                                    <div className="muted">Bookmarks: {incomingShare.bookmarks.length} · Notes: {incomingShare.notes.length}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="button" onClick={acceptIncomingShare}>Merge</button>
                                    <button className="button" onClick={dismissIncomingShare}>Dismiss</button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                    {error && <div className="card" role="alert">Failed to load verses: {error}</div>}
                    {!verses ? (
                        <div style={{ display: 'grid', gap: 8 }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="skeleton" style={{ height: 64 }} />
                            ))}
                        </div>
                    ) : (
                        <div
                            ref={listRef}
                            style={{ '--arabic-size': arabicSizeVar, '--translation-size': translationSizeVar } as React.CSSProperties}
                        >
                            {verses.map((v) => {
                                const words = v.text_ar_simple.split(' ')
                                return (
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
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, justifyContent: 'space-between' }}>
                                        <span className="muted">{v.ayah}</span>
                                        {activeAyah === v.ayah ? (
                                            <div style={{ display: 'inline-flex', gap: 6 }}>
                                                <button
                                                    type="button"
                                                    className={`icon-btn${isBookmarked(v.ayah) ? ' active' : ''}`}
                                                    title={isBookmarked(v.ayah) ? 'Remove bookmark' : 'Add bookmark'}
                                                    aria-pressed={isBookmarked(v.ayah)}
                                                    onClick={(e) => { e.stopPropagation(); toggleBookmark(v.ayah) }}
                                                >
                                                    {/* Bookmark icon to match sidebar */}
                                                    <Bookmark className="icon" strokeWidth={2} aria-hidden {...(isBookmarked(v.ayah) ? { fill: 'currentColor' } : {})} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`icon-btn${openNoteAyah === v.ayah ? ' active' : ''}`}
                                                    title="Add/view note"
                                                    aria-pressed={openNoteAyah === v.ayah}
                                                    onClick={(e) => { e.stopPropagation(); setOpenNoteAyah((cur) => cur === v.ayah ? null : v.ayah) }}
                                                >
                                                    {/* Note icon */}
                                                    <FileText className="icon" strokeWidth={2} aria-hidden />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="icon-btn"
                                                    title="Share this verse"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        const link = shareVerseAsLink(v.ayah)
                                                        if (!link) return
                                                        try { void navigator.clipboard.writeText(link) } catch { }
                                                        alert('Share link copied to clipboard')
                                                    }}
                                                >
                                                    {/* Share icon */}
                                                    <Share2 className="icon" strokeWidth={2} aria-hidden />
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                    {v.ayah === 1 && v.bismillah && !v.text_ar_simple.startsWith(v.bismillah) ? (
                                        <div className="arabic" dir="rtl" lang="ar" style={{ opacity: 0.9 }}>
                                            {v.bismillah}
                                        </div>
                                    ) : null}
                                    <div className="arabic" dir="rtl" lang="ar">
                                        <span className="ayah-num">{v.ayah}</span>
                                        {words.map((w, i) => (
                                            <span
                                                key={i}
                                                onContextMenu={(e) => handleWordContext(e, w, v.text_ar_simple)}
                                                onMouseLeave={handleWordLeave}
                                                style={{ cursor: ollamaEnabled ? 'context-menu' : undefined }}
                                            >
                                                {w}
                                                {i < words.length - 1 ? ' ' : ''}
                                            </span>
                                        ))}
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
                                    {openNoteAyah === v.ayah ? (
                                        <div className="card" style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                                            <div className="muted" style={{ marginBottom: 6 }}>Note for {surah}:{v.ayah}</div>
                                            <textarea
                                                className="textarea"
                                                defaultValue={getNote(v.ayah)}
                                                placeholder="Write your note in plain text or Markdown..."
                                                rows={4}
                                                style={{ width: '100%' }}
                                                onKeyDown={(e) => e.stopPropagation()}
                                                onClick={(e) => e.stopPropagation()}
                                                id={`note-${surah}-${v.ayah}`}
                                            />
                                            <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                                                <button
                                                    type="button"
                                                    className="button"
                                                    onClick={() => {
                                                        const el = document.getElementById(`note-${surah}-${v.ayah}`) as HTMLTextAreaElement | null
                                                        const val = el?.value || ''
                                                        saveNote(v.ayah, val)
                                                        setOpenNoteAyah(null)
                                                    }}
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    type="button"
                                                    className="button"
                                                    onClick={() => {
                                                        saveNote(v.ayah, '')
                                                        const el = document.getElementById(`note-${surah}-${v.ayah}`) as HTMLTextAreaElement | null
                                                        if (el) el.value = ''
                                                        setOpenNoteAyah(null)
                                                    }}
                                                >
                                                    Clear
                                                </button>
                                                <button type="button" className="button" onClick={() => setOpenNoteAyah(null)}>Close</button>
                                            </div>
                                        </div>
                                    ) : (showNotes && !!getNote(v.ayah) ? (
                                        <div className="card" style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                                            <div className="muted" style={{ marginBottom: 6 }}>Note for {surah}:{v.ayah}</div>
                                            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{getNote(v.ayah)}</div>
                                        </div>
                                    ) : null)}
                                </article>
                                )})}
                        </div>
                    )}
                </section>

                {/* Floating audio controls */}
                <div className="floating-audio" role="region" aria-label="Audio controls">
                    <button type="button" className="icon-btn" aria-label="Previous ayah" title="Previous" onClick={goPrevAyah}>
                        <ChevronLeft className="icon" strokeWidth={2} aria-hidden />
                    </button>
                    <button
                        type="button"
                        className="icon-btn"
                        aria-label={playingAyah === activeAyah && playingAyah != null ? 'Pause' : 'Play'}
                        title={playingAyah === activeAyah && playingAyah != null ? 'Pause' : 'Play'}
                        onClick={toggleToolbarPlay}
                    >
                        {playingAyah === activeAyah && playingAyah != null ? (
                            <Pause className="icon" strokeWidth={2} aria-hidden />
                        ) : (
                            <Play className="icon" strokeWidth={2} aria-hidden />
                        )}
                    </button>
                    <button type="button" className="icon-btn" aria-label="Next ayah" title="Next" onClick={goNextAyah}>
                        <ChevronRight className="icon" strokeWidth={2} aria-hidden />
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
                        <ListEnd className="icon" strokeWidth={2} aria-hidden />
                    </button>
                </div>

                {rootPanel ? (
                    <div
                        className="card"
                        style={{ position: 'fixed', top: rootPanel.y + 4, left: rootPanel.x + 4, zIndex: 50, pointerEvents: 'none' }}
                    >
                        {rootPanel.loading ? (
                            <LoaderCircle className="icon spin" strokeWidth={2} aria-hidden />
                        ) : (
                            rootPanel.text
                        )}
                    </div>
                ) : null}

                <Sidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    surah={surah}
                    font={font}
                    setFont={setFont}
                    theme={theme}
                    setTheme={setTheme}
                    translations={translations}
                    enabledTranslations={enabledTranslations}
                    setEnabledTranslations={setEnabledTranslations}
                    reciter={reciter}
                    setReciter={setReciter}
                    bookmarks={bookmarks}
                    notes={notes}
                    setBookmarks={setBookmarks}
                    setNotes={setNotes}
                    ollamaEnabled={ollamaEnabled}
                    setOllamaEnabled={setOllamaEnabled}
                    ollamaEndpoint={ollamaEndpoint}
                    setOllamaEndpoint={setOllamaEndpoint}
                    ollamaModel={ollamaModel}
                    setOllamaModel={setOllamaModel}
                    setActiveAyah={setActiveAyah}
                    setOpenNoteAyah={setOpenNoteAyah}
                    hydrated={hydrated}
                />

                <footer className="footer" style={{ textAlign: 'left' }}>
                    Open Qur’an Reader | Made with love and surrender · Audio: <a href="https://everyayah.com" target="_blank" rel="noreferrer">EveryAyah</a> · <a href="https://quran.com" target="_blank" rel="noreferrer">Quran.com</a>
                </footer>
            </main>
        </>
    )
}


