import React, { useCallback, useEffect, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import {
  LINE_WIDTH_BOUNDS,
  PAGE_LENGTH_BOUNDS,
  clampPageNumber,
  sanitizeLineWidth,
  sanitizePageLength,
} from '../../../lib/paged-layout'
import { t } from '../../../src/i18n'
import type { Locale } from '../../../src/i18n'

type ReaderMode = 'continuous' | 'paged'

type ReaderModeSectionProps = {
  locale: Locale
  readerMode: ReaderMode
  onModeChange: (mode: ReaderMode) => void
  pagedLineWidth: number
  onPagedLineWidthChange: (value: number) => void
  pagedPageLength: number
  onPagedPageLengthChange: (value: number) => void
  twoPageView: boolean
  onTwoPageViewChange: (value: boolean) => void
  syncPages: boolean
  onSyncPagesChange: (value: boolean) => void
  rightPage: number
  onRightPageChange: (value: number) => void
  manualLeftPage: number
  onManualLeftPageChange: (value: number) => void
  computedLeftPage: number | null
  totalPagedPages: number
}

export function ReaderModeSection({
  locale,
  readerMode,
  onModeChange,
  pagedLineWidth,
  onPagedLineWidthChange,
  pagedPageLength,
  onPagedPageLengthChange,
  twoPageView,
  onTwoPageViewChange,
  syncPages,
  onSyncPagesChange,
  rightPage,
  onRightPageChange,
  manualLeftPage,
  onManualLeftPageChange,
  computedLeftPage,
  totalPagedPages,
}: ReaderModeSectionProps) {
  const maxPage = totalPagedPages > 0 ? totalPagedPages : 1
  const displayRightPage = clampPageNumber(rightPage, totalPagedPages)
  const displayManualLeft = totalPagedPages > 0 ? clampPageNumber(manualLeftPage, totalPagedPages) : manualLeftPage

  const [lineWidthInput, setLineWidthInput] = useState<string>(() => String(pagedLineWidth))
  const [lineWidthEditing, setLineWidthEditing] = useState(false)

  const [pageLengthInput, setPageLengthInput] = useState<string>(() => String(pagedPageLength))
  const [pageLengthEditing, setPageLengthEditing] = useState(false)

  const [rightPageInput, setRightPageInput] = useState<string>(() => String(displayRightPage))
  const [rightPageEditing, setRightPageEditing] = useState(false)

  const [leftPageInput, setLeftPageInput] = useState<string>(() => (syncPages ? String(computedLeftPage ?? '') : String(displayManualLeft)))
  const [leftPageEditing, setLeftPageEditing] = useState(false)

  useEffect(() => {
    if (!lineWidthEditing) setLineWidthInput(String(pagedLineWidth))
  }, [pagedLineWidth, lineWidthEditing])

  useEffect(() => {
    if (!pageLengthEditing) setPageLengthInput(String(pagedPageLength))
  }, [pagedPageLength, pageLengthEditing])

  useEffect(() => {
    if (!rightPageEditing) setRightPageInput(String(displayRightPage))
  }, [displayRightPage, rightPageEditing])

  useEffect(() => {
    if (syncPages) {
      setLeftPageEditing(false)
      setLeftPageInput(computedLeftPage ? String(computedLeftPage) : '')
      return
    }
    if (!leftPageEditing) setLeftPageInput(String(displayManualLeft))
  }, [syncPages, computedLeftPage, displayManualLeft, leftPageEditing])

  const commitLineWidth = useCallback(() => {
    const parsed = Number(lineWidthInput)
    const sanitized = Number.isFinite(parsed) ? sanitizeLineWidth(parsed) : pagedLineWidth
    onPagedLineWidthChange(sanitized)
    setLineWidthInput(String(sanitized))
    setLineWidthEditing(false)
  }, [lineWidthInput, onPagedLineWidthChange, pagedLineWidth])

  const commitPageLength = useCallback(() => {
    const parsed = Number(pageLengthInput)
    const sanitized = Number.isFinite(parsed) ? sanitizePageLength(parsed) : pagedPageLength
    onPagedPageLengthChange(sanitized)
    setPageLengthInput(String(sanitized))
    setPageLengthEditing(false)
  }, [pageLengthInput, onPagedPageLengthChange, pagedPageLength])

  const commitRightPage = useCallback(() => {
    const parsed = Number(rightPageInput)
    const sanitized = Number.isFinite(parsed) ? clampPageNumber(parsed, totalPagedPages) : displayRightPage
    onRightPageChange(sanitized)
    setRightPageInput(String(sanitized))
    setRightPageEditing(false)
  }, [displayRightPage, onRightPageChange, rightPageInput, totalPagedPages])

  const commitLeftPage = useCallback(() => {
    if (syncPages) return
    const parsed = Number(leftPageInput)
    const sanitized = Number.isFinite(parsed) ? clampPageNumber(parsed, totalPagedPages) : displayManualLeft
    onManualLeftPageChange(sanitized)
    setLeftPageInput(String(sanitized))
    setLeftPageEditing(false)
  }, [displayManualLeft, leftPageInput, onManualLeftPageChange, syncPages, totalPagedPages])

  function handleLineWidthChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setLineWidthEditing(true)
    setLineWidthInput(value)
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return
    onPagedLineWidthChange(sanitizeLineWidth(parsed))
  }

  function handlePageLengthChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setPageLengthEditing(true)
    setPageLengthInput(value)
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return
    onPagedPageLengthChange(sanitizePageLength(parsed))
  }

  function handleRightPageInput(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setRightPageEditing(true)
    setRightPageInput(value)
    if (!value.trim()) return
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return
    onRightPageChange(clampPageNumber(parsed, totalPagedPages))
  }

  function handleLeftPageInput(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setLeftPageEditing(true)
    setLeftPageInput(value)
    if (!value.trim()) return
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return
    onManualLeftPageChange(clampPageNumber(parsed, totalPagedPages))
  }

  function handleNumberKeyDown(e: KeyboardEvent<HTMLInputElement>, commit: () => void) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    }
  }

  function handleBlur(commit: () => void) {
    commit()
  }

  return (
    <div className="section">
      <div role="region" aria-label={t(locale, 'readerMode')}>
        <label htmlFor="reader-mode-select" style={{ display: 'block', marginBottom: 6 }}>
          {t(locale, 'readerMode')}
        </label>
        <select
          id="reader-mode-select"
          className="select"
          value={readerMode}
          onChange={(e) => onModeChange(e.target.value as ReaderMode)}
          style={{ width: '100%' }}
        >
          <option value="continuous">{t(locale, 'readerModeContinuous')}</option>
          <option value="paged">{t(locale, 'readerModePaged')}</option>
        </select>
        {readerMode === 'paged' ? (
          <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
            <div className="muted">
              {t(locale, 'totalPagesLabel')}: {totalPagedPages}
            </div>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>{t(locale, 'lineWidth')}</span>
              <input
                type="number"
                min={LINE_WIDTH_BOUNDS.min}
                max={LINE_WIDTH_BOUNDS.max}
                value={lineWidthInput}
                onChange={handleLineWidthChange}
                onBlur={() => handleBlur(commitLineWidth)}
                onKeyDown={(e) => handleNumberKeyDown(e, commitLineWidth)}
                className="input"
              />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>{t(locale, 'pageLength')}</span>
              <input
                type="number"
                min={PAGE_LENGTH_BOUNDS.min}
                max={PAGE_LENGTH_BOUNDS.max}
                value={pageLengthInput}
                onChange={handlePageLengthChange}
                onBlur={() => handleBlur(commitPageLength)}
                onKeyDown={(e) => handleNumberKeyDown(e, commitPageLength)}
                className="input"
              />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>{t(locale, 'rightPage')}</span>
              <input
                type="number"
                min={1}
                max={maxPage}
                value={rightPageInput}
                onChange={handleRightPageInput}
                onBlur={() => handleBlur(commitRightPage)}
                onKeyDown={(e) => handleNumberKeyDown(e, commitRightPage)}
                className="input"
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={twoPageView}
                onChange={(e) => onTwoPageViewChange(e.target.checked)}
              />
              <span>{t(locale, 'twoPageView')}</span>
            </label>
            {twoPageView ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={syncPages}
                    onChange={(e) => onSyncPagesChange(e.target.checked)}
                  />
                  <span>{t(locale, 'syncPages')}</span>
                </label>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span>{t(locale, 'leftPage')}</span>
                  <input
                    type="number"
                    min={1}
                    max={maxPage}
                    value={leftPageInput}
                    onChange={handleLeftPageInput}
                    onBlur={() => handleBlur(commitLeftPage)}
                    onKeyDown={(e) => handleNumberKeyDown(e, commitLeftPage)}
                    className="input"
                    disabled={syncPages}
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
