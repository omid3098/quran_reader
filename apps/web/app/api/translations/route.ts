import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'quran', 'translations.json')
    const txt = await fs.readFile(filePath, 'utf8')
    return new NextResponse(txt, { headers: { 'content-type': 'application/json' } })
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
