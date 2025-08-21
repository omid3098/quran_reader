import Link from 'next/link'
import fs from 'node:fs/promises'
import path from 'node:path'

async function fetchSurahsStatic() {
  try {
    const file = path.join(process.cwd(), 'public', 'quran', 'quran-simple.xml')
    const raw = await fs.readFile(file, 'utf8')
    const list: Array<{ number: number; name_ar: string }> = []
    const re = /<sura\s+index="(\d+)"\s+name="([^"]*)">/g
    let m: RegExpExecArray | null
    while ((m = re.exec(raw)) !== null) list.push({ number: parseInt(m[1], 10), name_ar: m[2] })
    return list
  } catch {
    return [] as Array<{ number: number; name_ar: string }>
  }
}

export default async function SurahListPage() {
  const surahs = await fetchSurahsStatic()

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <div className="brand">OpenQuranReader</div>
          <nav className="toolbar">
            <Link className="button" href="/">Home</Link>
          </nav>
        </div>
      </header>
      <main className="container">
        <section style={{ padding: 16 }}>
          <h2>Surahs</h2>
          {!surahs.length ? (
            <div className="card">No data available</div>
          ) : (
            <div className="grid">
              {surahs.map((s) => (
                <Link key={s.number} href={`/s/${s.number}`} className="card">
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <div>سورة</div>
                    <div style={{ fontWeight: 700 }}>{s.name_ar}</div>
                  </div>
                  <div style={{ color: 'var(--muted)', marginTop: 6 }}>Surah {s.number}</div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <footer className="footer">Data loaded from static files; generated via Tanzil</footer>
      </main>
    </>
  )
}

