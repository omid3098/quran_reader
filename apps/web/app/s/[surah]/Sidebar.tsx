'use client'

import { useEffect, useState } from 'react'
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
  Sun,
  Moon,
  MapPin,
  Settings,
  Trash2,
} from 'lucide-react'
import type { TranslationMeta } from '@openquranreader/types'
import type { BookmarksSet, NotesMap, VerseKey } from './types'
import { encodeSharePayload } from '../../../lib/share'
import { OllamaClient } from '../../../lib/ollama'

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
  ollamaEnabled: boolean
  setOllamaEnabled: React.Dispatch<React.SetStateAction<boolean>>
  ollamaEndpoint: string
  setOllamaEndpoint: React.Dispatch<React.SetStateAction<string>>
  ollamaModel: string
  setOllamaModel: React.Dispatch<React.SetStateAction<string>>
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
  ollamaEnabled,
  setOllamaEnabled,
  ollamaEndpoint,
  setOllamaEndpoint,
  ollamaModel,
  setOllamaModel,
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
  const [isOllamaOpen, setIsOllamaOpen] = useState(false)
  const [models, setModels] = useState<string[]>([])
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [clearNav, setClearNav] = useState(false)
  const [clearBm, setClearBm] = useState(false)
  const [clearNt, setClearNt] = useState(false)
  const [clearSt, setClearSt] = useState(false)

  const reciterOptions = [
    { id: 'Abu_Bakr_Ash-Shaatree_128kbps', name: 'Abu Bakr Ash-Shaatree' },
    { id: 'Alafasy_128kbps', name: 'Mishary Rashid Alafasy' },
    { id: 'Ghamadi_64kbps', name: 'Saad Al-Ghamdi' },
    { id: 'Abdul_Basit_Murattal_128kbps', name: 'Abdul Basit (Murattal' },
    { id: 'Husary_128kbps', name: 'Al-Husary (Tartil' },
    { id: 'Minshawy_Murattal_128kbps', name: 'Minshawy' },
  ]
  const reciterDisplayName = reciterOptions.find((r) => r.id === reciter)?.name || 'Choose'
  const reciterDisplayShort =
    reciterDisplayName === 'Choose' ? reciterDisplayName : `${reciterDisplayName.slice(0, 7)}...`

  useEffect(() => {
    if (!ollamaEnabled || !isOllamaOpen) return
    const client = new OllamaClient(ollamaEndpoint)
    ;(async () => {
      try {
        const ms = await client.listModels()
        setModels(ms)
        setModelsError(null)
        if (ms.length && (!ollamaModel || !ms.includes(ollamaModel))) setOllamaModel(ms[0])
      } catch {
        setModelsError('Failed to fetch models. Check CORS or endpoint configuration.')
      }
    })()
  }, [ollamaEnabled, isOllamaOpen, ollamaEndpoint])

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

  function shareAllAsLink(): { url: string | null; reason?: string } {
    const bundle = buildExportBundle()
    const compact = { v: 1, bookmarks: bundle.bookmarks, notes: bundle.notes.map(([k, t]) => [k, t]) }
    const enc = encodeSharePayload(compact)
    if (!enc) return { url: null, reason: 'Failed to encode' }
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const href = `${base}/s/${surah}?share=${enc}`
    if (href.length > 1800) {
      return { url: null, reason: 'Too large for a link; use file export' }
    }
    return { url: href }
  }

  function qrImageUrl(link: string, size = 220): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(link)}`
  }

  return (
    <>
      {isOpen ? <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" /> : null}
      <aside className={`sidebar${isOpen ? ' open' : ''}`} aria-hidden={!isOpen} aria-label="Settings sidebar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="muted">Settings</div>
          <button type="button" className="icon-btn" aria-label="Close sidebar" onClick={onClose}>
            <X className="icon" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="section">
          <div role="region" aria-label="Font size">
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
                <span>Font size</span>
              </span>
              <ChevronDown className="icon" strokeWidth={2} aria-hidden style={{ transform: isFontOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
            </button>
            {isFontOpen ? (
              <div id="accordion-font" style={{ marginTop: 8, display: 'flex', gap: 8 }}>
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
            ) : null}
          </div>
        </div>

        <div className="section">
          <div role="region" aria-label="Translations">
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
                <span>Translations</span>
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
                  <div className="muted">No translations available</div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="section">
          <div role="region" aria-label="Reciter">
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
                <span>Reciter</span>
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
              <div id="accordion-reciter" style={{ marginTop: 8, display: 'grid', gap: 6, maxHeight: 260, overflow: 'auto' }}>
                {reciterOptions.map((r) => (
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
          <div role="region" aria-label="Notes">
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
                <span>Notes</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="muted" suppressHydrationWarning>({hydrated ? Object.keys(notes).length : 0})</span>
                <ChevronDown className="icon" strokeWidth={2} aria-hidden style={{ transform: isNotesOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
              </span>
            </button>
            {isNotesOpen ? (
              <div id="accordion-notes" style={{ marginTop: 8, display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fill, minmax(6ch, 1fr))', maxHeight: 220, overflow: 'auto' }}>
                {(!hydrated || Object.keys(notes).length === 0) ? (
                  <div className="muted">No notes yet</div>
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
          <div role="region" aria-label="Bookmarks">
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
                <span>Bookmarks</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="muted" suppressHydrationWarning>({hydrated ? Object.keys(bookmarks).length : 0})</span>
                <ChevronDown className="icon" strokeWidth={2} aria-hidden style={{ transform: isBookmarksOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
              </span>
            </button>
            {isBookmarksOpen ? (
              <div id="accordion-bookmarks" style={{ marginTop: 8, display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fill, minmax(6ch, 1fr))', maxHeight: 220, overflow: 'auto' }}>
                {(!hydrated || Object.keys(bookmarks).length === 0) ? (
                  <div className="muted">No bookmarks yet</div>
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
          <div role="region" aria-label="Clear data">
            <button
              type="button"
              className="button"
              aria-expanded={isExportOpen}
              aria-controls="accordion-clear"
              onClick={() => setIsExportOpen((o) => !o)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <FolderOutput className="icon" strokeWidth={2} aria-hidden />
                <span>Export</span>
              </span>
              <ChevronDown className="icon" strokeWidth={2} aria-hidden style={{ transform: isExportOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
            </button>
            {isExportOpen ? (
              <div id="accordion-export" style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" className="icon-btn" title="Download JSON" aria-label="Download JSON" onClick={downloadExport}>
                  <Download className="icon" strokeWidth={2} aria-hidden />
                </button>
                <button type="button" className="icon-btn" title="Copy JSON" aria-label="Copy JSON" onClick={copyExportToClipboard}>
                  <Copy className="icon" strokeWidth={2} aria-hidden />
                </button>
                <button type="button" className="icon-btn" title="Copy Share Link" aria-label="Copy Share Link" onClick={() => {
                  const res = shareAllAsLink()
                  if (!res.url) { alert(res.reason || 'Could not build link'); return }
                  try { void navigator.clipboard.writeText(res.url) } catch {}
                }}>
                  <Share2 className="icon" strokeWidth={2} aria-hidden />
                </button>
                <button type="button" className="icon-btn" title="Show QR" aria-label="Show QR" onClick={() => {
                  const res = shareAllAsLink()
                  if (!res.url) { alert(res.reason || 'Could not build link'); return }
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
          <div role="region" aria-label="Import">
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
                <span>Import</span>
              </span>
              <ChevronDown className="icon" strokeWidth={2} aria-hidden style={{ transform: isImportOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
            </button>
            {isImportOpen ? (
              <div id="accordion-import" style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input id="oqr-import-json" type="file" accept="application/json" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImportFile(f) }} style={{ display: 'none' }} />
                <button type="button" className="icon-btn" title="Import from file" aria-label="Import from file" onClick={() => {
                  const el = document.getElementById('oqr-import-json') as HTMLInputElement | null
                  el?.click()
                }}>
                  <Upload className="icon" strokeWidth={2} aria-hidden />
                </button>
                <button type="button" className="icon-btn" title="Paste JSON" aria-label="Paste JSON" onClick={async () => {
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
          <div role="region" aria-label="Clear">
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
                <span>Clear</span>
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
                  <input type="checkbox" checked={clearNav} onChange={(e) => setClearNav(e.target.checked)} aria-label="Clear navigations" />
                  <MapPin className="icon" strokeWidth={2} aria-hidden />
                  <span>Navigations</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={clearBm} onChange={(e) => setClearBm(e.target.checked)} aria-label="Clear bookmarks" />
                  <Bookmark className="icon" strokeWidth={2} aria-hidden />
                  <span>Bookmarks</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={clearNt} onChange={(e) => setClearNt(e.target.checked)} aria-label="Clear notes" />
                  <FileText className="icon" strokeWidth={2} aria-hidden />
                  <span>Notes</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={clearSt} onChange={(e) => setClearSt(e.target.checked)} aria-label="Clear settings" />
                  <Settings className="icon" strokeWidth={2} aria-hidden />
                  <span>Settings</span>
                </label>
                <button type="button" className="button" disabled={!clearNav && !clearBm && !clearNt && !clearSt} onClick={handleClearSelected}>
                  Clear
                </button>
              </div>
            ) : null}
        </div>
        </div>

        <div className="section">
          <div role="region" aria-label="Ollama">
            <button
              type="button"
              className="button"
              aria-expanded={isOllamaOpen}
              aria-controls="accordion-ollama"
              onClick={() => setIsOllamaOpen((o) => !o)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Cpu className="icon" strokeWidth={2} aria-hidden />
                <span>Ollama</span>
              </span>
              <ChevronDown className="icon" strokeWidth={2} aria-hidden style={{ transform: isOllamaOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
            </button>
            {isOllamaOpen ? (
              <div id="accordion-ollama" style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={ollamaEnabled}
                    onChange={(e) => setOllamaEnabled(e.target.checked)}
                  />
                  <span>Enable Ollama</span>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="muted">Endpoint</span>
                  <input
                    type="text"
                    className="input"
                    value={ollamaEndpoint}
                    onChange={(e) => setOllamaEndpoint(e.target.value)}
                  />
                </label>
                {ollamaEnabled ? (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="muted">Model</span>
                    <select className="input" value={ollamaModel} onChange={(e) => setOllamaModel(e.target.value)}>
                      <option value="">Select model</option>
                      {models.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    {modelsError ? (
                      <span className="muted" style={{ color: 'red' }}>
                        {modelsError}
                      </span>
                    ) : null}
                  </label>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ position: 'sticky', bottom: 0, paddingTop: 12, marginTop: 12, borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a
            className="icon-btn"
            href="https://github.com/omid3098/quran_reader"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open GitHub repository"
            title="GitHub repository"
          >
            <Github className="icon" strokeWidth={2} aria-hidden />
          </a>
          <button
            type="button"
            className="icon-btn"
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="icon" strokeWidth={2} aria-hidden />
            ) : (
              <Moon className="icon" strokeWidth={2} aria-hidden />
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
