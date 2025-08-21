"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    let targetSurah = 1
    let targetAyah: number | null = null
    try {
      const posRaw = localStorage.getItem('oqr:lastPosition')
      const pos = posRaw ? JSON.parse(posRaw) as { surah?: number; ayah?: number } : null
      if (pos && typeof pos.surah === 'number' && pos.surah >= 1 && pos.surah <= 114) {
        targetSurah = pos.surah
        if (typeof pos.ayah === 'number' && pos.ayah > 0) targetAyah = pos.ayah
      } else {
        const raw = localStorage.getItem('oqr:lastSurah')
        const parsed = raw ? JSON.parse(raw) : null
        if (typeof parsed === 'number' && parsed >= 1 && parsed <= 114) targetSurah = parsed
      }
    } catch { }
    const href = targetAyah ? `/s/${targetSurah}?v=${encodeURIComponent(String(targetAyah))}` : `/s/${targetSurah}`
    router.replace(href)
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

