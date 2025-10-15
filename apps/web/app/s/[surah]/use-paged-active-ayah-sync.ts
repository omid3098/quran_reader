import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'

export type ReaderMode = 'continuous' | 'paged'

export function usePagedActiveAyahSync(params: {
    readerMode: ReaderMode
    activeAyah: number | null
    ayahToPage: Map<number, number>
    setManualRightPage: Dispatch<SetStateAction<number>>
}) {
    const { readerMode, activeAyah, ayahToPage, setManualRightPage } = params
    const leftSelectionRef = useRef(false)

    const markLeftSelection = useCallback(() => {
        leftSelectionRef.current = true
    }, [])

    useEffect(() => {
        if (readerMode !== 'paged') {
            leftSelectionRef.current = false
            return
        }
        if (activeAyah == null) {
            leftSelectionRef.current = false
            return
        }
        if (leftSelectionRef.current) {
            leftSelectionRef.current = false
            return
        }
        const pageIndex = ayahToPage.get(activeAyah)
        if (pageIndex == null) return
        const target = pageIndex + 1
        setManualRightPage((prev) => (prev === target ? prev : target))
    }, [readerMode, activeAyah, ayahToPage, setManualRightPage])

    return { markLeftSelection }
}
