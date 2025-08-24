"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { decrypt } from '../lib/crypto'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    (async () => {
      let targetSurah = 1
      let targetAyah: number | null = null
      try {
        const posRaw = localStorage.getItem('oqr:lastPosition')
        let pos: any = null
        if (posRaw) {
          try {
            const dec = await decrypt(posRaw)
            pos = JSON.parse(dec).value
          } catch {
            pos = JSON.parse(posRaw)
          }
        }
        if (pos && typeof pos.surah === 'number' && pos.surah >= 1 && pos.surah <= 114) {
          targetSurah = pos.surah
          if (typeof pos.ayah === 'number' && pos.ayah > 0) targetAyah = pos.ayah
        }
      } catch {}
      const href = (targetAyah ? `/s/${targetSurah}?v=${encodeURIComponent(String(targetAyah))}` : `/s/${targetSurah}`) as Route
      router.replace(href)
    })()
  }, [router])

  return (
    <main className="container">
      <section style={{ padding: 16 }}>
        <div className="skeleton" style={{ height: 64, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 64, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 64 }} />
      </section>
    </main>
  )
}

