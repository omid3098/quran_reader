"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    let target = 1
    try {
      const raw = localStorage.getItem('oqr:lastSurah')
      const parsed = raw ? JSON.parse(raw) : null
      if (typeof parsed === 'number' && parsed >= 1 && parsed <= 114) target = parsed
    } catch { }
    router.replace(`/s/${target}`)
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

