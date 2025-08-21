import { Suspense } from 'react'
import ReaderClient from './reader-client'

export function generateStaticParams() {
  return Array.from({ length: 114 }, (_, i) => ({ surah: String(i + 1) }))
}

export default function ReaderPage({ params }: { params: { surah: string } }) {
  return (
    <Suspense fallback={<main className="container"><section style={{ padding: 16 }}><div className="skeleton" style={{ height: 64, marginBottom: 8 }} /><div className="skeleton" style={{ height: 64, marginBottom: 8 }} /><div className="skeleton" style={{ height: 64 }} /></section></main>}>
      <ReaderClient params={params} />
    </Suspense>
  )
}
