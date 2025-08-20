import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="container">
      <header className="header">
        <div className="header-inner">
          <div className="brand">OpenQuranReader</div>
          <nav className="toolbar">
            <Link className="button" href="/s">Surah List</Link>
            <Link className="button" href="/s/1">Read Al-Fatiha</Link>
          </nav>
        </div>
      </header>

      <section style={{ padding: 16 }}>
        <h2>Welcome</h2>
        <p>Start reading with a simple, accessible UI while back-end evolves.</p>
        <div style={{ marginTop: 12 }}>
          <Link className="button" href="/s">Browse Surahs</Link>
        </div>
      </section>

      <footer className="footer">MVP UI — data from local file-backed API</footer>
    </main>
  )
}

