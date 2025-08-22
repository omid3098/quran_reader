"use client"
import { useEffect, useMemo, useState } from "react"

interface RootData { count: number; verses: string[] }
interface SurahMeta { number: number; name_ar: string }

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ""
const STATIC_BASE = `${BASE_PATH}/quran`

export default function RootSearchPage() {
  const [roots, setRoots] = useState<Record<string, RootData>>({})
  const [query, setQuery] = useState("")
  const [surahs, setSurahs] = useState<SurahMeta[]>([])
  useEffect(() => {
    fetch(`${BASE_PATH}/roots.json`).then(r => r.json()).then(setRoots).catch(() => {})
    fetch(`${STATIC_BASE}/quran-simple.xml`).then(r => r.text()).then(t => {
      const list: SurahMeta[] = []
      const re = /<sura\s+index="(\d+)"\s+name="([^"]*)">/g
      let m: RegExpExecArray | null
      while ((m = re.exec(t)) !== null) list.push({ number: parseInt(m[1], 10), name_ar: m[2] })
      setSurahs(list)
    }).catch(() => {})
  }, [])
  const data = roots[query.trim()]
  const grouped = useMemo(() => {
    if (!data) return [] as Array<{ surah: number; ayahs: number[] }>
    const map = new Map<number, number[]>()
    for (const v of data.verses) {
      const [s, a] = v.split(":").map(Number)
      const arr = map.get(s)
      if (arr) arr.push(a)
      else map.set(s, [a])
    }
    return Array.from(map.entries()).map(([surah, ayahs]) => ({ surah, ayahs }))
  }, [data])
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
            {grouped.length ? (
              <details open>
                <summary>Verses with this root</summary>
                <div style={{ marginTop: 8 }}>
                  {grouped.map(({ surah, ayahs }) => {
                    const meta = surahs.find(s => s.number === surah)
                    return (
                      <details key={surah} style={{ marginTop: 4 }}>
                        <summary>{meta?.name_ar || surah}</summary>
                        <div
                          style={{
                            marginTop: 8,
                            display: "grid",
                            gap: 8,
                            gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                          }}
                        >
                          {ayahs.map(a => (
                            <a
                              key={a}
                              href={`${BASE_PATH}/s/${surah}?v=${a}`}
                              style={{
                                display: "block",
                                border: "1px solid var(--border, #ccc)",
                                padding: 4,
                                borderRadius: 4,
                                textAlign: "center",
                              }}
                            >
                              {a}
                            </a>
                          ))}
                        </div>
                      </details>
                    )
                  })}
                </div>
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

