import { act, render } from '@testing-library/react'
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { describe, expect, it } from 'vitest'
import { usePagedActiveAyahSync } from '../app/s/[surah]/use-paged-active-ayah-sync'

type HarnessHandle = {
    setActiveAyah: (ayah: number | null) => void
    markLeftSelection: () => void
    readManualRightValue: () => number
    readManualRightCalls: () => Array<SetStateAction<number>>
    clearManualRightCalls: () => void
    setReaderMode: (mode: 'continuous' | 'paged') => void
}

const SyncHarness = forwardRef<HarnessHandle>((_, ref) => {
    const [activeAyah, setActiveAyah] = useState<number | null>(null)
    const [readerMode, setReaderMode] = useState<'continuous' | 'paged'>('paged')
    const manualRight = useRef(1)
    const manualRightCalls = useRef<Array<SetStateAction<number>>>([])
    const setManualRightPage = useCallback<Dispatch<SetStateAction<number>>>((update) => {
        manualRightCalls.current.push(update)
        manualRight.current = typeof update === 'function' ? update(manualRight.current) : update
    }, [])
    const ayahToPage = useMemo(() => new Map<number, number>([[10, 3], [12, 4]]), [])
    const { markLeftSelection } = usePagedActiveAyahSync({ readerMode, activeAyah, ayahToPage, setManualRightPage })

    useImperativeHandle(ref, () => ({
        setActiveAyah,
        markLeftSelection,
        readManualRightValue: () => manualRight.current,
        readManualRightCalls: () => [...manualRightCalls.current],
        clearManualRightCalls: () => {
            manualRightCalls.current = []
        },
        setReaderMode,
    }))

    return null
})
SyncHarness.displayName = 'SyncHarness'

describe('usePagedActiveAyahSync', () => {
    it('syncs the right page for non-left selections', () => {
        const ref = { current: null as HarnessHandle | null }
        render(<SyncHarness ref={(instance) => { ref.current = instance }} />)
        expect(ref.current).not.toBeNull()
        act(() => {
            ref.current!.setActiveAyah(10)
        })
        expect(ref.current!.readManualRightCalls()).toHaveLength(1)
        expect(ref.current!.readManualRightValue()).toBe(4)
    })

    it('skips syncing when the active ayah was chosen from the left page', () => {
        const ref = { current: null as HarnessHandle | null }
        render(<SyncHarness ref={(instance) => { ref.current = instance }} />)
        expect(ref.current).not.toBeNull()
        act(() => {
            ref.current!.setActiveAyah(10)
        })
        expect(ref.current!.readManualRightCalls()).toHaveLength(1)
        ref.current!.clearManualRightCalls()
        act(() => {
            ref.current!.markLeftSelection()
            ref.current!.setActiveAyah(12)
        })
        expect(ref.current!.readManualRightCalls()).toHaveLength(0)
        expect(ref.current!.readManualRightValue()).toBe(4)
    })

    it('resets the left selection flag outside paged mode', () => {
        const ref = { current: null as HarnessHandle | null }
        render(<SyncHarness ref={(instance) => { ref.current = instance }} />)
        expect(ref.current).not.toBeNull()
        act(() => {
            ref.current!.markLeftSelection()
            ref.current!.setReaderMode('continuous')
        })
        act(() => {
            ref.current!.setReaderMode('paged')
            ref.current!.setActiveAyah(12)
        })
        expect(ref.current!.readManualRightCalls()).toHaveLength(1)
        expect(ref.current!.readManualRightValue()).toBe(5)
    })
})
