'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import {
  X,
  File,
  ChevronDown,
  Languages,
  Play,
  Check,
  Bookmark,
  FileText,
  Download,
  Copy,
  Share2,
  QrCode,
  Upload,
  Clipboard,
  FolderOutput,
  FolderInput,
  Github,
  Cpu,
  HelpCircle,
  Sun,
  Moon,
  MapPin,
  Settings,
  Trash2,
} from 'lucide-react'
import type { TranslationMeta } from '@openquranreader/types'
import type { BookmarksSet, NotesMap, VerseKey } from './types'
import { encodeSharePayload } from '../../../lib/share'
import { ProviderPicker } from '../../../src/features/assistant/ProviderPicker'
import { KeyManager } from '../../../src/features/assistant/KeyManager'
import { ModelPicker } from '../../../src/features/assistant/ModelPicker'
import { createAssistant } from '../../../src/features/assistant/useAssistant'
import type { AISettings } from '../../../src/state/settings'
import type { ChatMessage } from '@openquran/ai/types'
import { useLocale } from '../../../src/state/locale'
import { t } from '../../../src/i18n'
import type { Locale, UIKey } from '../../../src/i18n'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  surah: number
  font: 'sm' | 'md' | 'lg'
  setFont: (f: 'sm' | 'md' | 'lg') => void
  theme: 'light' | 'dark'
  setTheme: (t: 'light' | 'dark') => void
  translations: TranslationMeta[]
  enabledTranslations: string[]
  setEnabledTranslations: React.Dispatch<React.SetStateAction<string[]>>
  reciter: string
  setReciter: React.Dispatch<React.SetStateAction<string>>
  bookmarks: BookmarksSet
  notes: NotesMap
  setBookmarks: React.Dispatch<React.SetStateAction<BookmarksSet>>
  setNotes: React.Dispatch<React.SetStateAction<NotesMap>>
  aiSettings: AISettings
  setAISettings: React.Dispatch<React.SetStateAction<AISettings>>
  setActiveAyah: (a: number) => void
  setOpenNoteAyah: (a: number) => void
  hydrated: boolean
}

export default function Sidebar({
  isOpen,
  onClose,
  surah,
  font,
  setFont,
  theme,
  setTheme,
  translations,
  enabledTranslations,
  setEnabledTranslations,
  reciter,
  setReciter,
  bookmarks,
  notes,
  setBookmarks,
  setNotes,
  aiSettings,
  setAISettings,
  setActiveAyah,
  setOpenNoteAyah,
  hydrated,
}: SidebarProps) {
  const router = useRouter()
  const [isFontOpen, setIsFontOpen] = useState(false)
  const [isTranslationsOpen, setTranslationsOpen] = useState(false)
  const [isReciterOpen, setReciterOpen] = useState(false)
  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isClearOpen, setIsClearOpen] = useState(false)
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)
  const [models, setModels] = useState<Array<{ id: string; name?: string; free?: boolean }>>([])
  const [modelsError, setModelsError] = useState<UIKey | null>(null)
  const [testStatus, setTestStatus] = useState<'idle' | 'ok' | 'error' | 'loading'>('idle')
  const [locale, setLocale] = useLocale()
  const [clearNav, setClearNav] = useState(false)
  const [clearBm, setClearBm] = useState(false)
  const [clearNt, setClearNt] = useState(false)
  const [clearSt, setClearSt] = useState(false)
  const assistant = useMemo(
    () => createAssistant({ selected: aiSettings.selected, keys: aiSettings.keys }),
    [aiSettings.selected, aiSettings.keys]
  )
  const [width, setWidth] = useState(250)
  const startX = useRef(0)
  const startW = useRef(0)
  function beginResize(e: React.MouseEvent) {
    startX.current = e.clientX
    startW.current = width
    function move(ev: MouseEvent) {
      const next = Math.min(
        Math.max(220, startW.current + ev.clientX - startX.current),
        480
      )
      setWidth(next)
    }
    function up() {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }
  const isHttps = typeof window !== 'undefined' && location.protocol === 'https:'
  const ollamaUrl = aiSettings.keys.OLLAMA_URL || 'http://localhost:11434'
  const ollamaBlocked = isHttps && !ollamaUrl.startsWith('https:')
  const infoLinks: Record<string, string> = {
    gemini: 'https://aistudio.google.com/app/apikey',
    openrouter: 'https://openrouter.ai/docs/api-reference/authentication',
    huggingface: 'https://huggingface.co/settings/tokens',
    ollama: 'https://ollama.com/download',
  }
  const [reciterOptions, setReciterOptions] = useState<Array<{ id: string; name: string }>>([])
  const [reciterQuery, setReciterQuery] = useState('')
  const reciterDisplayName =
    reciterOptions.find((r) => r.id === reciter)?.name || t(locale, 'choose')
  const reciterDisplayShort =
    reciterDisplayName === t(locale, 'choose')
      ? reciterDisplayName
      : `${reciterDisplayName.slice(0, 7)}...`

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('https://everyayah.com/data/recitations.js')
        const data = await res.json()
        const list: Array<{ id: string; name: string }> = []
        for (const key in data) {
          const val = (data as any)[key]
          if (val && typeof val === 'object' && 'subfolder' in val) {
            list.push({ id: val.subfolder, name: val.name })
          }
        }
        setReciterOptions(list)
      } catch {
        setReciterOptions([
          { id: 'Abu_Bakr_Ash-Shaatree_128kbps', name: 'Abu Bakr Ash-Shaatree' },
          { id: 'Alafasy_128kbps', name: 'Mishary Rashid Alafasy' },
          { id: 'Ghamadi_64kbps', name: 'Saad Al-Ghamdi' },
          { id: 'Abdul_Basit_Murattal_128kbps', name: 'Abdul Basit (Murattal' },
          { id: 'Husary_128kbps', name: 'Al-Husary (Tartil' },
          { id: 'Minshawy_Murattal_128kbps', name: 'Minshawy' },
        ])
      }
    })()
  }, [])

  useEffect(() => {
    if (!aiSettings.enabled || !isAssistantOpen) return
    ;(async () => {
      try {
        const list = (await assistant.listModels()) as any[]
        setModels(list)
        setModelsError(null)
        const current = aiSettings.models[aiSettings.selected]
        if (list.length && (!current || !list.some((m) => m.id === current))) {
          setAISettings((prev) => ({
            ...prev,
            models: { ...prev.models, [prev.selected]: list[0].id },
          }))
        }
      } catch {
        setModelsError('modelsError')
      }
    })()
  }, [aiSettings.enabled, isAssistantOpen, assistant, aiSettings.selected, aiSettings.models, setAISettings])

  function clearAllNavigations() {
    try {
      localStorage.removeItem('oqr:lastPosition')
      localStorage.removeItem('oqr:lastSurah')
      for (let i = 1; i <= 114; i++) localStorage.removeItem(`oqr:lastAyah:${i}`)
    } catch {}
  }

  function clearAllBookmarks() {
    try { localStorage.removeItem('oqr:bookmarks') } catch {}
    setBookmarks({})
  }

  function clearAllNotes() {
    try { localStorage.removeItem('oqr:notes') } catch {}
    setNotes({})
  }

  function clearSettingsToDefaults() {
    setEnabledTranslations(['en.arberry'])
    setReciter('Alafasy_128kbps')
  }

  async function handleTest() {
    setTestStatus('loading')
    try {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Say ready' }]
      const model = aiSettings.models[aiSettings.selected]
      const text = await assistant.ask(messages, { model })
      setTestStatus(text.toLowerCase().includes('ready') ? 'ok' : 'error')
    } catch {
      setTestStatus('error')
    }
  }

  function handleClearSelected() {
    if (!clearNav && !clearBm && !clearNt && !clearSt) return
    if (clearNav) clearAllNavigations()
    if (clearBm) clearAllBookmarks()
    if (clearNt) clearAllNotes()
    if (clearSt) clearSettingsToDefaults()
    setClearNav(false); setClearBm(false); setClearNt(false); setClearSt(false)
  }

  type ExportBundle = { v: 1; bookmarks: VerseKey[]; notes: Array<[VerseKey, string, string]>; exportedAt: string }
  function buildExportBundle(): ExportBundle {
    const exportedAt = new Date().toISOString()
    const bm = Object.keys(bookmarks) as VerseKey[]
    const ns: Array<[VerseKey, string, string]> = Object.entries(notes)
      .map(([k, v]) => [k as VerseKey, v.text, v.updatedAt])
    return { v: 1, bookmarks: bm, notes: ns, exportedAt }
  }

  function downloadExport() {
    const bundle = buildExportBundle()
    const blob = new Blob([JSON.stringify(bundle)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `oqr-data-${date}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function copyExportToClipboard() {
    const bundle = buildExportBundle()
    try { await navigator.clipboard.writeText(JSON.stringify(bundle)) } catch {}
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      mergeImported(data)
    } catch {}
  }

  function mergeImported(data: any) {
    if (!data || typeof data !== 'object' || Number(data.v) !== 1) return
    const inBm: VerseKey[] = Array.isArray(data.bookmarks) ? data.bookmarks.filter((k: any) => typeof k === 'string') : []
    const inNotes: Array<[VerseKey, string, string]> = Array.isArray(data.notes)
      ? data.notes
          .filter((it: any) => Array.isArray(it) && typeof it[0] === 'string' && typeof it[1] === 'string')
          .map((it: any) => [it[0] as VerseKey, it[1] as string, String(it[2] || '')])
      : []
    setBookmarks((prev) => {
      const next = { ...prev }
      for (const k of inBm) next[k] = true
      return next
    })
    setNotes((prev) => {
      const next = { ...prev }
      for (const [k, text, updatedAt] of inNotes) {
        const trimmed = text.trim()
        if (!trimmed) continue
        const prevTs = Date.parse(next[k]?.updatedAt || '1970-01-01')
        const inTs = Date.parse(updatedAt || '1970-01-01')
        if (!next[k] || inTs >= prevTs) next[k] = { text: trimmed, updatedAt: updatedAt || new Date().toISOString() }
      }
      return next
    })
  }

  function shareAllAsLink(): { url: string | null; reason?: UIKey } {
    const bundle = buildExportBundle()
    const compact = { v: 1, bookmarks: bundle.bookmarks, notes: bundle.notes.map(([k, t]) => [k, t]) }
    const enc = encodeSharePayload(compact)
    if (!enc) return { url: null, reason: 'failedToEncode' }
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const href = `${base}/s/${surah}?share=${enc}`
    if (href.length > 1800) {
      return { url: null, reason: 'tooLargeForLink' }
    }
    return { url: href }
  }

  function qrImageUrl(link: string, size = 220): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(link)}`
  }

  return (
    <>
      {isOpen ? <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" /> : null}
      <aside
        className={`sidebar${isOpen ? ' open' : ''}`}
        aria-hidden={!isOpen}
        aria-label={t(locale, 'settingsSidebar')}
        style={{ width }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="muted">{t(locale, 'settings')}</div>
          <button type="button" className="icon-btn" aria-label={t(locale, 'closeSidebar')} onClick={onClose}>
            <X className="icon" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="section">
          <div role="region" aria-label={t(locale, 'fontSize')}>
            <button
              type="button"
              className="button"
              aria-expanded={isFontOpen}
              aria-controls="accordion-font"
              onClick={() => setIsFontOpen((o) => !o)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <File className="icon" strokeWidth={2} aria-hidden />
                <span>{t(locale, 'fontSize')}</span>
              </span>
              <ChevronDown className="icon" strokeWidth={2} aria-hidden style={{ transform: isFontOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
            </button>
            {isFontOpen ? (
              <div id="accordion-font" style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button type="button" className={`icon-btn${font === 'sm' ? ' active' : ''}`} aria-pressed={font === 'sm'} aria-label={t(locale, 'fontSmall')} onClick={() => setFont('sm')} title={t(locale, 'fontSmall')}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>A</span>
                </button>
                <button type="button" className={`icon-btn${font === 'md' ? ' active' : ''}`} aria-pressed={font === 'md'} aria-label={t(locale, 'fontMedium')} onClick={() => setFont('md')} title={t(locale, 'fontMedium')}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>A</span>
                </button>
                <button type="button" className={`icon-btn${font === 'lg' ? ' active' : ''}`} aria-pressed={font === 'lg'} aria-label={t(locale, 'fontLarge')} onClick={() => setFont('lg')} title={t(locale, 'fontLarge')}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>A</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="section">
          <div role="region" aria-label={t(locale, 'translations')}>
            <button
              type="button"
              className="button"
              aria-expanded={isTranslationsOpen}
              aria-controls="accordion-translations"
              onClick={() => setTranslationsOpen((o) => !o)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Languages className="icon" strokeWidth={2} aria-hidden />
                <span>{t(locale, 'translations')}</span>
              </span>
              <ChevronDown className="icon" strokeWidth={2} aria-hidden style={{ transform: isTranslationsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
            </button>
            {isTranslationsOpen ? (
              <div id="accordion-translations" style={{ marginTop: 8, display: 'grid', gap: 8, maxHeight: 260, overflow: 'auto' }}>
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
                  <div className="muted">{t(locale, 'noTranslations')}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="section">
          <div role="region" aria-label={t(locale, 'reciter')}>
            <button
              type="button"
              className="button"
              aria-expanded={isReciterOpen}
              aria-controls="accordion-reciter"
              onClick={() => setReciterOpen((o) => !o)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Play className="icon" strokeWidth={2} aria-hidden />
                <span>{t(locale, 'reciter')}</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span
                  className="muted"
                  title={reciterDisplayName}
                  style={{
                    maxWidth: 160,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'inline-block',
                  }}
                >
                  {reciterDisplayShort}
                </span>
                <ChevronDown
                  className="icon"
                  strokeWidth={2}
                  aria-hidden
                  style={{ transform: isReciterOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
                />
              </span>
            </button>
            {isReciterOpen ? (
              <div
                id="accordion-reciter"
                style={{ marginTop: 8, display: 'grid', gap: 6, maxHeight: 260, overflow: 'auto' }}
              >
                <input
                  className="input"
                  type="text"
                  placeholder={t(locale, 'searchReciters')}
                  value={reciterQuery}
                  onChange={(e) => setReciterQuery(e.target.value)}
                />
                {(reciterQuery
                  ? reciterOptions.filter((r) =>
                      `${r.name} ${r.id}`.toLowerCase().includes(reciterQuery.toLowerCase())
                    )
                  : reciterOptions
                ).map((r) => (
                  <button
                    key={r.id}
                    className="button"
                    style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    aria-pressed={r.id === reciter}
                    onClick={() => setReciter(r.id)}
                  >
                    <span style={{ flex: 1 }}>{r.name}</span>
                    {r.id === reciter ? <Check className="icon" strokeWidth={3} aria-hidden /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="section">
          {/* Notes */}
          <div role="region" aria-label={t(locale, 'notes')}>
            <button
              type="button"
              className="button"
              aria-expanded={isNotesOpen}
              aria-controls="accordion-notes"
              onClick={() => setIsNotesOpen((o) => !o)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <FileText className="icon" strokeWidth={2} aria-hidden />
                <span>{t(locale, 'notes')}</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="muted" suppressHydrationWarning>({hydrated ? Object.keys(notes).length : 0})</span>
                <ChevronDown className="icon" strokeWidth={2} aria-hidden style={{ transform: isNotesOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
              </span>
            </button>
            {isNotesOpen ? (
              <div id="accordion-notes" style={{ marginTop: 8, display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fill, minmax(6ch, 1fr))', maxHeight: 220, overflow: 'auto' }}>
                {(!hydrated || Object.keys(notes).length === 0) ? (
                  <div className="muted">{t(locale, 'noNotes')}</div>
                ) : (
                  Object.keys(notes)
                    .sort((a, b) => a.localeCompare(b))
                    .map((k) => {
                      const [s, a] = k.split(':').map((x) => Number(x))
                      const here = s === surah
                      return (
                        <button
                          key={`note-${k}`}
                          className="button"
                          style={{ textAlign: 'left' }}
                          onClick={() => {
                            const params = new URLSearchParams()
                            const t = enabledTranslations.join(',')
                            if (t) params.set('t', t)
                            params.set('v', String(a))
                            const href = (`/s/${s}?${params.toString()}`) as Route
                            onClose()
                            if (here) { setActiveAyah(a); setOpenNoteAyah(a) }
                            else { router.push(href, { scroll: false }); setTimeout(() => setOpenNoteAyah(a), 50) }
                          }}
                        >
                          <span>{s}:{a}</span>
                        </button>
                      )
                    })
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="section">
          {/* Bookmarks */}
          <div role="region" aria-label={t(locale, 'bookmarks')}>
            <button
              type="button"
              className="button"
              aria-expanded={isBookmarksOpen}
              aria-controls="accordion-bookmarks"
              onClick={() => setIsBookmarksOpen((o) => !o)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Bookmark className="icon" strokeWidth={2} aria-hidden />
                <span>{t(locale, 'bookmarks')}</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="muted" suppressHydrationWarning>({hydrated ? Object.keys(bookmarks).length : 0})</span>
                <ChevronDown className="icon" strokeWidth={2} aria-hidden style={{ transform: isBookmarksOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
              </span>
            </button>
            {isBookmarksOpen ? (
              <div id="accordion-bookmarks" style={{ marginTop: 8, display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fill, minmax(6ch, 1fr))', maxHeight: 220, overflow: 'auto' }}>
                {(!hydrated || Object.keys(bookmarks).length === 0) ? (
                  <div className="muted">{t(locale, 'noBookmarks')}</div>
                ) : (
                  Object.keys(bookmarks)
                    .sort((a, b) => a.localeCompare(b))
                    .map((k) => {
                      const [s, a] = k.split(':').map((x) => Number(x))
                      const here = s === surah
                      return (
                        <button
                          key={k}
                          className="button"
                          style={{ textAlign: 'left' }}
                          onClick={() => {
                            const params = new URLSearchParams()
                            const t = enabledTranslations.join(',')
                            if (t) params.set('t', t)
                            params.set('v', String(a))
                            const href = (`/s/${s}?${params.toString()}`) as Route
                            onClose()
                            if (here) setActiveAyah(a)
                            else router.push(href, { scroll: false })
                          }}
                        >
                          <span>{s}:{a}</span>
                        </button>
                      )
                    })
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="section">
          <div role="region" aria-label={t(locale, 'export')}>
            <button
              type="button"
              className="button"
              aria-expanded={isExportOpen}
              aria-controls="accordion-export"
              onClick={() => setIsExportOpen((o) => !o)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <FolderOutput className="icon" strokeWidth={2} aria-hidden />
                <span>{t(locale, 'export')}</span>
              </span>
              <ChevronDown className="icon" strokeWidth={2} aria-hidden style={{ transform: isExportOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
            </button>
            {isExportOpen ? (
              <div id="accordion-export" style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" className="icon-btn" title={t(locale, 'downloadJson')} aria-label={t(locale, 'downloadJson')} onClick={downloadExport}>
                  <Download className="icon" strokeWidth={2} aria-hidden />
                </button>
                <button type="button" className="icon-btn" title={t(locale, 'copyJson')} aria-label={t(locale, 'copyJson')} onClick={copyExportToClipboard}>
                  <Copy className="icon" strokeWidth={2} aria-hidden />
                </button>
                <button type="button" className="icon-btn" title={t(locale, 'copyShareLink')} aria-label={t(locale, 'copyShareLink')} onClick={() => {
                  const res = shareAllAsLink()
                  if (!res.url) { alert(t(locale, res.reason || 'couldNotBuildLink')); return }
                  try { void navigator.clipboard.writeText(res.url) } catch {}
                }}>
                  <Share2 className="icon" strokeWidth={2} aria-hidden />
                </button>
                <button type="button" className="icon-btn" title={t(locale, 'showQr')} aria-label={t(locale, 'showQr')} onClick={() => {
                  const res = shareAllAsLink()
                  if (!res.url) { alert(t(locale, res.reason || 'couldNotBuildLink')); return }
                  const img = qrImageUrl(res.url)
                  const w = window.open('', 'oqr-qr', 'width=260,height=300')
                  if (w) w.document.body.innerHTML = `<div style=\"display:flex;align-items:center;justify-content:center;height:100%;padding:12px;background:#fff\"><img alt=\"QR\" src=\"${img}\"/></div>`
                }}>
                  <QrCode className="icon" strokeWidth={2} aria-hidden />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="section">
          {/* Import */}
          <div role="region" aria-label={t(locale, 'import')}>
            <button
              type="button"
              className="button"
              aria-expanded={isImportOpen}
              aria-controls="accordion-import"
              onClick={() => setIsImportOpen((o) => !o)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <FolderInput className="icon" strokeWidth={2} aria-hidden />
                <span>{t(locale, 'import')}</span>
              </span>
              <ChevronDown className="icon" strokeWidth={2} aria-hidden style={{ transform: isImportOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
            </button>
            {isImportOpen ? (
              <div id="accordion-import" style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input id="oqr-import-json" type="file" accept="application/json" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImportFile(f) }} style={{ display: 'none' }} />
                <button type="button" className="icon-btn" title={t(locale, 'importFromFile')} aria-label={t(locale, 'importFromFile')} onClick={() => {
                  const el = document.getElementById('oqr-import-json') as HTMLInputElement | null
                  el?.click()
                }}>
                  <Upload className="icon" strokeWidth={2} aria-hidden />
                </button>
                <button type="button" className="icon-btn" title={t(locale, 'pasteJson')} aria-label={t(locale, 'pasteJson')} onClick={async () => {
                  try {
                    const txt = await navigator.clipboard.readText()
                    const obj = JSON.parse(txt)
                    mergeImported(obj)
                  } catch {}
                }}>
                  <Clipboard className="icon" strokeWidth={2} aria-hidden />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="section">
          {/* Clear */}
          <div role="region" aria-label={t(locale, 'clear')}>
            <button
              type="button"
              className="button"
              aria-expanded={isClearOpen}
              aria-controls="accordion-clear"
              onClick={() => setIsClearOpen((o) => !o)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Trash2 className="icon" strokeWidth={2} aria-hidden />
                <span>{t(locale, 'clear')}</span>
              </span>
              <ChevronDown
                className="icon"
                strokeWidth={2}
                aria-hidden
                style={{ transform: isClearOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
              />
            </button>
            {isClearOpen ? (
              <div id="accordion-clear" style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={clearNav} onChange={(e) => setClearNav(e.target.checked)} aria-label={t(locale, 'clearNavigations')} />
                  <MapPin className="icon" strokeWidth={2} aria-hidden />
                  <span>{t(locale, 'navigations')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={clearBm} onChange={(e) => setClearBm(e.target.checked)} aria-label={t(locale, 'clearBookmarks')} />
                  <Bookmark className="icon" strokeWidth={2} aria-hidden />
                  <span>{t(locale, 'bookmarks')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={clearNt} onChange={(e) => setClearNt(e.target.checked)} aria-label={t(locale, 'clearNotes')} />
                  <FileText className="icon" strokeWidth={2} aria-hidden />
                  <span>{t(locale, 'notes')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={clearSt} onChange={(e) => setClearSt(e.target.checked)} aria-label={t(locale, 'clearSettings')} />
                  <Settings className="icon" strokeWidth={2} aria-hidden />
                  <span>{t(locale, 'settings')}</span>
                </label>
                <button type="button" className="button" disabled={!clearNav && !clearBm && !clearNt && !clearSt} onClick={handleClearSelected}>
                  {t(locale, 'clear')}
                </button>
              </div>
            ) : null}
        </div>
        </div>

        <div className="section">
          <div role="region" aria-label={t(locale, 'aiAssistant')}>
            <button
              type="button"
              className="button"
              aria-expanded={isAssistantOpen}
              aria-controls="accordion-ai"
              onClick={() => setIsAssistantOpen((o) => !o)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Cpu className="icon" strokeWidth={2} aria-hidden />
                <span>{t(locale, 'assistant')}</span>
              </span>
              <ChevronDown
                className="icon"
                strokeWidth={2}
                aria-hidden
                style={{ transform: isAssistantOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
              />
            </button>
            {isAssistantOpen ? (
              <div id="accordion-ai" style={{ marginTop: 8 }}>
                <div className="card" style={{ padding: 4, display: 'grid', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={aiSettings.enabled}
                      onChange={(e) =>
                        setAISettings((prev) => ({ ...prev, enabled: e.target.checked }))
                      }
                    />
                    <span>{t(locale, 'enableAssistant')}</span>
                  </label>
                  {aiSettings.enabled ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <ProviderPicker
                        value={aiSettings.selected}
                        onChange={(v) =>
                          setAISettings((prev) => ({ ...prev, selected: v }))
                        }
                        disableOllama={ollamaBlocked}
                      />
                      <div
                        style={{
                          width: '100%',
                          display: 'grid',
                          gap: 8,
                          marginTop: 8,
                          paddingTop: 8,
                          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <a
                          href={infoLinks[aiSettings.selected]}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 14,
                            color: 'var(--accent)',
                          }}
                        >
                          <HelpCircle className="icon" aria-hidden />
                          <span>{t(locale, 'getKeyInstall')}</span>
                        </a>
                        {ollamaBlocked && aiSettings.selected === 'ollama' ? (
                          <span className="muted" style={{ color: 'red' }}>
                            {t(locale, 'ollamaBlocked')}
                          </span>
                        ) : null}
                        <KeyManager
                          provider={aiSettings.selected}
                          keys={aiSettings.keys}
                          onSave={(k) =>
                            setAISettings((prev) => ({ ...prev, keys: k }))
                          }
                        />
                        <ModelPicker
                          providerId={aiSettings.selected}
                          models={models}
                          value={aiSettings.models[aiSettings.selected] || ''}
                          onChange={(v) =>
                            setAISettings((prev) => ({
                              ...prev,
                              models: { ...prev.models, [prev.selected]: v },
                            }))
                          }
                        />
                        {modelsError ? (
                          <span className="muted" style={{ color: 'red' }}>
                            {t(locale, modelsError)}
                          </span>
                        ) : null}
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                          <button
                            type="button"
                            className="button"
                            onClick={handleTest}
                          >
                            {t(locale, 'test')}
                          </button>
                          {testStatus === 'loading' ? (
                            <span className="muted">{t(locale, 'testing')}</span>
                          ) : testStatus === 'ok' ? (
                            <span className="muted" style={{ color: 'green' }}>
                              {t(locale, 'ok')}
                            </span>
                          ) : testStatus === 'error' ? (
                            <span className="muted" style={{ color: 'red' }}>
                              {t(locale, 'failed')}
                            </span>
                          ) : null}
                        </div>
                        <p className="muted" style={{ fontSize: 12 }}>
                          {t(locale, 'keysWarning')}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ position: 'sticky', bottom: 0, paddingTop: 12, marginTop: 12, borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <a
            className="icon-btn"
            href="https://github.com/omid3098/quran_reader"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t(locale, 'openGithub')}
            title={t(locale, 'githubRepo')}
          >
            <Github className="icon" strokeWidth={2} aria-hidden />
          </a>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            aria-label={t(locale, 'uiLanguage')}
            title={t(locale, 'uiLanguage')}
            style={{ background: 'transparent', color: 'inherit', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 4px' }}
          >
            <option value="en">EN</option>
            <option value="fa">FA</option>
          </select>
          <button
            type="button"
            className="icon-btn"
            aria-label={t(locale, 'toggleTheme')}
            title={theme === 'dark' ? t(locale, 'switchToLight') : t(locale, 'switchToDark')}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="icon" strokeWidth={2} aria-hidden />
            ) : (
              <Moon className="icon" strokeWidth={2} aria-hidden />
            )}
          </button>
        </div>
        <div className="sidebar-resizer" onMouseDown={beginResize} />
      </aside>
    </>
  )
}
