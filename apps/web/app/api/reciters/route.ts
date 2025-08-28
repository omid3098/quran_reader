import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://everyayah.com/data/recitations.js')
    const data = await res.json()
    const list: Array<{ id: string; name: string }> = []
    for (const key in data as any) {
      if (key === 'ayahCount') continue
      const val = (data as any)[key]
      if (val && typeof val === 'object' && 'subfolder' in val && 'name' in val) {
        list.push({ id: val.subfolder as string, name: val.name as string })
      }
    }
    return NextResponse.json(list)
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
