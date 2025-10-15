import { describe, expect, it } from 'vitest'
import {
  LINE_WIDTH_BOUNDS,
  PAGE_LENGTH_BOUNDS,
  buildPagedPages,
  clampPageNumber,
  resolveLeftPageSelection,
  resolvePagedTypography,
  resolvePagePair,
  sanitizeLineWidth,
  sanitizePageLength,
} from '../lib/paged-layout'

describe('paged layout helpers', () => {
  it('sanitizes bounds for line width and page length', () => {
    expect(sanitizeLineWidth(5)).toBe(LINE_WIDTH_BOUNDS.min)
    expect(sanitizeLineWidth(500)).toBe(LINE_WIDTH_BOUNDS.max)
    expect(sanitizePageLength(1)).toBe(PAGE_LENGTH_BOUNDS.min)
    expect(sanitizePageLength(200)).toBe(PAGE_LENGTH_BOUNDS.max)
  })

  it('clamps page numbers and resolves page pairs', () => {
    expect(clampPageNumber(0, 10)).toBe(1)
    expect(clampPageNumber(5, 3)).toBe(3)
    expect(resolvePagePair({ totalPages: 4, rightPage: 2, leftManualPage: 1, twoPageView: true, syncPages: true })).toEqual({ rightPage: 2, leftPage: 3 })
    expect(resolvePagePair({ totalPages: 3, rightPage: 3, leftManualPage: 2, twoPageView: true, syncPages: true })).toEqual({ rightPage: 3, leftPage: null })
    expect(resolvePagePair({ totalPages: 6, rightPage: 2, leftManualPage: 5, twoPageView: true, syncPages: false })).toEqual({ rightPage: 2, leftPage: 5 })
  })

  it('resolves left page selections without reordering synced spreads', () => {
    expect(
      resolveLeftPageSelection({ totalPages: 10, selectedPage: 4, currentRightPage: 3, syncPages: true }),
    ).toEqual({ nextRightPage: null, manualLeftPage: null })
    expect(
      resolveLeftPageSelection({ totalPages: 10, selectedPage: 8, currentRightPage: 3, syncPages: true }),
    ).toEqual({ nextRightPage: 8, manualLeftPage: null })
    expect(
      resolveLeftPageSelection({ totalPages: 10, selectedPage: 4, currentRightPage: 3, syncPages: false }),
    ).toEqual({ nextRightPage: null, manualLeftPage: 4 })
    expect(
      resolveLeftPageSelection({ totalPages: 0, selectedPage: 8, currentRightPage: 1, syncPages: false }),
    ).toEqual({ nextRightPage: null, manualLeftPage: 1 })
  })

  it('builds pages with respect to width and line limits', () => {
    const verses = [
      { ayah: 1, text: 'الحمد لله رب العالمين', bismillah: 'بسم الله الرحمن الرحيم' },
      { ayah: 2, text: 'الرحمن الرحيم' },
      { ayah: 3, text: 'مالك يوم الدين' },
      { ayah: 4, text: 'إياك نعبد وإياك نستعين' },
      { ayah: 5, text: 'اهدنا الصراط المستقيم' },
      { ayah: 6, text: 'صراط الذين أنعمت عليهم' },
      { ayah: 7, text: 'غير المغضوب عليهم ولا الضالين' },
    ]

    const width = 22
    const linesPerPage = 2
    const sanitizedLines = sanitizePageLength(linesPerPage)
    const pages = buildPagedPages(verses, width, linesPerPage)

    expect(pages.length).toBeGreaterThan(1)
    expect(pages[0].lines).toHaveLength(sanitizedLines)
    expect(pages[0].lines[0].tokens[0].text).toBe('بسم الله الرحمن الرحيم')
    expect(pages[0].firstAyah).toBe(1)
    expect(pages[1].firstAyah).toBeGreaterThanOrEqual(2)

    const sanitizedWidth = sanitizeLineWidth(width)
    pages.forEach((page) => {
      page.lines.forEach((line) => {
        const lineLength = line.tokens.reduce((acc, token, idx) => acc + token.text.length + (idx > 0 ? 1 : 0), 0)
        expect(lineLength).toBeLessThanOrEqual(sanitizedWidth)
      })
    })
  })

  it('scales typography to fit available width', () => {
    const singleBase = resolvePagedTypography({ lineWidth: 60, twoPage: false })
    const singleWide = resolvePagedTypography({ lineWidth: 150, twoPage: false })
    const singleNarrow = resolvePagedTypography({ lineWidth: 30, twoPage: false })
    expect(singleWide.fontSize).toBeLessThan(singleBase.fontSize)
    expect(singleNarrow.fontSize).toBeGreaterThan(singleBase.fontSize)

    const twoPage = resolvePagedTypography({ lineWidth: 60, twoPage: true })
    expect(twoPage.fontSize).toBeLessThanOrEqual(singleBase.fontSize)

    const minBound = resolvePagedTypography({ lineWidth: 1000, twoPage: true })
    const maxBound = resolvePagedTypography({ lineWidth: 5, twoPage: false })
    expect(minBound.fontSize).toBeGreaterThanOrEqual(18)
    expect(maxBound.fontSize).toBeLessThanOrEqual(42)
    expect(twoPage.lineHeight).toBeGreaterThanOrEqual(1.6)
    expect(twoPage.lineHeight).toBeLessThanOrEqual(2.2)
  })
})
