'use client'
import { useEffect, useState } from 'react'

interface RootData { count: number, verses: string[] }

export default function RootSearchPage() {
  const [roots, setRoots] = useState<Record<string, RootData>>({})
  const [query, setQuery] = useState('')
  useEffect(() => {
    fetch('/roots.json').then(r => r.json()).then(setRoots).catch(() => {})
  }, [])
  const data = roots[query.trim()]
  return (
    <main style={{ padding: 16 }}>
      <h1>Root search</h1>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter Arabic root"
        style={{ fontSize: 18, padding: 4, marginTop: 8 }}
      />
      {query ? (
        data ? (
          <div style={{ marginTop: 16 }}>
            <h2 dir="rtl" style={{ marginTop: 0 }}>
              {query.trim()} ({data.count} times)
            </h2>
            {data.verses.length ? (
              <details open>
                <summary>Verses</summary>
                <ul style={{ marginTop: 8 }}>
                  {data.verses.map((v) => {
                    const [s, a] = v.split(':')
                    return (
                      <li key={v}>
                        <a href={`/s/${s}?v=${a}`}>{s}:{a}</a>
                      </li>
                    )
                  })}
                </ul>
              </details>
            ) : (
              <p>No occurrences in dataset.</p>
            )}
          </div>
        ) : (
          <p style={{ marginTop: 16 }}>No results</p>
        )
      ) : null}
    </main>
  )
}

