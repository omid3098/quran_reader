import React, { type ChangeEvent } from 'react'
import { LINE_WIDTH_BOUNDS, PAGE_LENGTH_BOUNDS, clampPageNumber, sanitizeLineWidth, sanitizePageLength } from '../../../lib/paged-layout'
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
  const displayManualLeft = clampPageNumber(manualLeftPage, totalPagedPages)

  function handleLineWidthChange(e: ChangeEvent<HTMLInputElement>) {
    const parsed = Number(e.target.value)
    if (!Number.isFinite(parsed)) return
    onPagedLineWidthChange(sanitizeLineWidth(parsed))
  }

  function handlePageLengthChange(e: ChangeEvent<HTMLInputElement>) {
    const parsed = Number(e.target.value)
    if (!Number.isFinite(parsed)) return
    onPagedPageLengthChange(sanitizePageLength(parsed))
  }

  function handleRightPageInput(e: ChangeEvent<HTMLInputElement>) {
    const parsed = Number(e.target.value)
    if (!Number.isFinite(parsed)) return
    onRightPageChange(clampPageNumber(parsed, totalPagedPages))
  }

  function handleLeftPageInput(e: ChangeEvent<HTMLInputElement>) {
    const parsed = Number(e.target.value)
    if (!Number.isFinite(parsed)) return
    onManualLeftPageChange(clampPageNumber(parsed, totalPagedPages))
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
                value={pagedLineWidth}
                onChange={handleLineWidthChange}
                className="input"
              />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>{t(locale, 'pageLength')}</span>
              <input
                type="number"
                min={PAGE_LENGTH_BOUNDS.min}
                max={PAGE_LENGTH_BOUNDS.max}
                value={pagedPageLength}
                onChange={handlePageLengthChange}
                className="input"
              />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>{t(locale, 'rightPage')}</span>
              <input
                type="number"
                min={1}
                max={maxPage}
                value={displayRightPage}
                onChange={handleRightPageInput}
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
                    value={syncPages ? (computedLeftPage ?? '') : displayManualLeft}
                    onChange={handleLeftPageInput}
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
