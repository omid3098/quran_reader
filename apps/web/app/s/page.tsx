import Link from 'next/link'

async function fetchSurahs() {
  const res = await fetch('http://localhost:4000/surahs', { next: { revalidate: 0 } })
  if (!res.ok) throw new Error('Failed to load surahs')
  return (await res.json()) as Array<{ number: number; name_ar: string }>
}

export default async function SurahListPage() {
  let surahs: Array<{ number: number; name_ar: string }> = []
  try {
    surahs = await fetchSurahs()
  } catch (e) {
    // show fallback empty state
  }

  return (
    <main className="container">
      <header className="header">
        <div className="header-inner">
          <div className="brand">OpenQuranReader</div>
          <nav className="toolbar">
            <Link className="button" href="/">Home</Link>
          </nav>
        </div>
      </header>

      <section style={{ padding: 16 }}>
        <h2>Surahs</h2>
        {!surahs.length ? (
          <div className="card">No data. Is the API running at http://localhost:4000?</div>
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

      <footer className="footer">Data from local API; generated via Tanzil</footer>
    </main>
  )
}

