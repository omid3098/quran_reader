import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReaderModeSection } from '../app/s/[surah]/ReaderModeSection'
import { LINE_WIDTH_BOUNDS, PAGE_LENGTH_BOUNDS } from '../lib/paged-layout'

describe('ReaderModeSection', () => {
  it('invokes callbacks for mode selection and inputs', async () => {
    const user = userEvent.setup()
    const onModeChange = vi.fn()
    const onLineWidthChange = vi.fn()
    const onPageLengthChange = vi.fn()
    const onTwoPageChange = vi.fn()
    const onSyncChange = vi.fn()
    const onRightPageChange = vi.fn()
    const onLeftPageChange = vi.fn()

    render(
      <ReaderModeSection
        locale="en"
        readerMode="paged"
        onModeChange={onModeChange}
        pagedLineWidth={40}
        onPagedLineWidthChange={onLineWidthChange}
        pagedPageLength={10}
        onPagedPageLengthChange={onPageLengthChange}
        twoPageView={true}
        onTwoPageViewChange={onTwoPageChange}
        syncPages={true}
        onSyncPagesChange={onSyncChange}
        rightPage={3}
        onRightPageChange={onRightPageChange}
        manualLeftPage={5}
        onManualLeftPageChange={onLeftPageChange}
        computedLeftPage={4}
        totalPagedPages={8}
      />,
    )

    await user.selectOptions(screen.getByRole('combobox', { name: 'Reader mode' }), 'continuous')
    expect(onModeChange).toHaveBeenCalledWith('continuous')

    const lineWidthInput = screen.getByLabelText('Line width (characters)') as HTMLInputElement
    lineWidthInput.focus()
    await user.clear(lineWidthInput)
    await user.type(lineWidthInput, '50')
    expect(lineWidthInput.value).toBe('50')
    expect(onLineWidthChange).toHaveBeenLastCalledWith(50)
    await user.type(lineWidthInput, '0')
    expect(onLineWidthChange).toHaveBeenLastCalledWith(LINE_WIDTH_BOUNDS.max)

    const pageLengthInput = screen.getByLabelText('Lines per page') as HTMLInputElement
    await user.clear(pageLengthInput)
    await user.type(pageLengthInput, '999')
    expect(onPageLengthChange).toHaveBeenLastCalledWith(PAGE_LENGTH_BOUNDS.max)

    const rightPageInput = screen.getByLabelText('Right page') as HTMLInputElement
    await user.clear(rightPageInput)
    await user.type(rightPageInput, '12')
    expect(rightPageInput.value).toBe('12')
    expect(onRightPageChange).toHaveBeenLastCalledWith(8)

    const syncCheckbox = screen.getByLabelText('Sync pages') as HTMLInputElement
    expect(screen.getByLabelText('Left page')).toBeDisabled()
    await user.click(syncCheckbox)
    expect(onSyncChange).toHaveBeenLastCalledWith(false)

    const twoPageCheckbox = screen.getByLabelText('Two-page view') as HTMLInputElement
    await user.click(twoPageCheckbox)
    expect(onTwoPageChange).toHaveBeenLastCalledWith(false)
  })

  it('enables manual left page when unsynced', async () => {
    const user = userEvent.setup()
    const onLeftPageChange = vi.fn()

    render(
      <ReaderModeSection
        locale="en"
        readerMode="paged"
        onModeChange={() => {}}
        pagedLineWidth={40}
        onPagedLineWidthChange={() => {}}
        pagedPageLength={10}
        onPagedPageLengthChange={() => {}}
        twoPageView={true}
        onTwoPageViewChange={() => {}}
        syncPages={false}
        onSyncPagesChange={() => {}}
        rightPage={3}
        onRightPageChange={() => {}}
        manualLeftPage={6}
        onManualLeftPageChange={onLeftPageChange}
        computedLeftPage={5}
        totalPagedPages={8}
      />,
    )

    const leftInput = screen.getByLabelText('Left page') as HTMLInputElement
    expect(leftInput).not.toBeDisabled()
    await user.clear(leftInput)
    await user.type(leftInput, '99')
    expect(leftInput.value).toBe('99')
    expect(onLeftPageChange).toHaveBeenLastCalledWith(8)
  })
})
