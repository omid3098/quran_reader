import 'dotenv/config'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { fileURLToPath } from 'node:url'

function sendJson(res, code, data) {
  res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' })
  res.end(JSON.stringify(data))
}

function notFound(res) { res.writeHead(404); res.end('Not found') }

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// Resolve repo root from apps/api/src to project root
const ROOT = path.resolve(__dirname, '../../..')
const OUT_DIR = path.join(ROOT, 'scripts', 'out')

const USE_DB = (String(process.env.USE_DATABASE || '').toLowerCase() === 'true') || Boolean(process.env.DATABASE_URL)

let prisma = null
async function getPrisma() {
  if (!prisma) {
    const mod = await import('@prisma/client')
    prisma = new mod.PrismaClient()
  }
  return prisma
}

// Load surahs and translations once at startup (file-backed mode)
let SURAH_LIST = []
let TRANSLATIONS = []
let VERSES_INDEX = new Map() // key `${surah}:${ayah}` -> { text_ar_simple }
let TRANSLATION_FILES = new Map() // translationId -> absolute file path
let MAX_AYAH_BY_SURAH = new Map() // surah -> max ayah index

function loadData() {
  const surahsPath = path.join(OUT_DIR, 'surahs.json')
  const translationsPath = path.join(OUT_DIR, 'translations.json')
  const versesJsonlPath = path.join(OUT_DIR, 'verses.jsonl')
  const perTransDir = path.join(OUT_DIR, 'translations')

  if (!fs.existsSync(surahsPath) || !fs.existsSync(translationsPath) || !fs.existsSync(versesJsonlPath)) {
    console.warn('Data not found in scripts/out. Run: node scripts/tanzil-import.js')
    return
  }
  SURAH_LIST = JSON.parse(fs.readFileSync(surahsPath, 'utf8')).surahs || []
  TRANSLATIONS = JSON.parse(fs.readFileSync(translationsPath, 'utf8')).translations || []

  // Build verses index
  VERSES_INDEX = new Map()
  MAX_AYAH_BY_SURAH = new Map()
  const lines = fs.readFileSync(versesJsonlPath, 'utf8').split(/\r?\n/).filter(Boolean)
  for (const line of lines) {
    const v = JSON.parse(line)
    const key = `${v.surah}:${v.ayah}`
    VERSES_INDEX.set(key, { text_ar_simple: v.text_ar_simple, bismillah: v.bismillah })
    const currentMax = MAX_AYAH_BY_SURAH.get(v.surah) || 0
    if (v.ayah > currentMax) MAX_AYAH_BY_SURAH.set(v.surah, v.ayah)
  }

  // Map translation files
  TRANSLATION_FILES = new Map()
  if (fs.existsSync(perTransDir)) {
    const files = fs.readdirSync(perTransDir).filter(f => f.endsWith('.jsonl'))
    for (const f of files) {
      const id = path.basename(f, '.jsonl')
      TRANSLATION_FILES.set(id, path.join(perTransDir, f))
    }
  }
}

if (!USE_DB) loadData()

function parseQuery(reqUrl) {
  const u = new url.URL(reqUrl, 'http://localhost')
  const params = Object.fromEntries(u.searchParams.entries())
  return { pathname: u.pathname, params, searchParams: u.searchParams }
}

function getTranslationsByIds(ids) {
  const set = new Set(ids)
  return TRANSLATIONS.filter(t => set.has(t.id))
}

function streamTranslationsFor(ids, slice) {
  // slice: array of {surah, ayah}
  const resultMap = new Map() // key `${surah}:${ayah}` -> { [id]: text }
  for (const id of ids) {
    const file = TRANSLATION_FILES.get(id)
    if (!file || !fs.existsSync(file)) continue
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)
    for (const line of lines) {
      const row = JSON.parse(line)
      // only keep those in slice
      // quick inclusion check by building a set
    }
    // Efficient inclusion: build set once outside loop
  }
  return resultMap
}

// Build set helper
function buildSliceSet(slice) {
  const set = new Set()
  for (const it of slice) set.add(`${it.surah}:${it.ayah}`)
  return set
}

async function handle(req, res) {
  const { pathname, params } = parseQuery(req.url || '/')

  if (pathname === '/health') return sendJson(res, 200, { ok: true, name: 'OpenQuranReader API', mode: USE_DB ? 'db' : 'files' })

  if (pathname === '/surahs') {
    if (USE_DB) {
      const db = await getPrisma()
      const rows = await db.surah.findMany({ orderBy: { number: 'asc' }, select: { number: true, name_ar: true } })
      return sendJson(res, 200, rows)
    }
    return sendJson(res, 200, SURAH_LIST)
  }

  if (pathname === '/translations') {
    if (USE_DB) {
      const db = await getPrisma()
      const rows = await db.translation.findMany({ orderBy: { id: 'asc' } })
      return sendJson(res, 200, rows)
    }
    return sendJson(res, 200, TRANSLATIONS)
  }

  if (pathname === '/verses') {
    const surah = parseInt(params.surah || '0', 10)
    let from = parseInt(params.from || '1', 10)
    let to = parseInt(params.to || '0', 10)
    if (!surah) return sendJson(res, 400, { error: 'Invalid query' })

    if (USE_DB) {
      const db = await getPrisma()
      const agg = await db.verse.aggregate({ where: { surah }, _max: { ayah: true } })
      const maxAyah = agg._max.ayah || 0
      if (!from || from < 1) from = 1
      if (!to || to < 1) to = maxAyah
      if (to > maxAyah) to = maxAyah
      if (!from || !to || from > to) return sendJson(res, 400, { error: 'Invalid query' })

      const base = await db.verse.findMany({
        where: { surah, ayah: { gte: from, lte: to } },
        orderBy: { ayah: 'asc' },
        select: { ayah: true, text_ar_simple: true, bismillah: true },
      })
      const slice = base.map((v) => ({ surah, ayah: v.ayah, text_ar_simple: v.text_ar_simple, ...(v.bismillah ? { bismillah: v.bismillah } : {}) }))

      const tParam = params.translation_ids || params.t || ''
      const ids = tParam ? tParam.split(',').map(s => s.trim()).filter(Boolean) : []
      if (ids.length) {
        const vt = await db.verseTranslation.findMany({
          where: { surah, ayah: { gte: from, lte: to }, translationId: { in: ids } },
          select: { ayah: true, translationId: true, text: true },
        })
        const map = new Map()
        for (const row of vt) {
          const key = row.ayah
          if (!map.has(key)) map.set(key, {})
          map.get(key)[row.translationId] = row.text
        }
        for (const v of slice) {
          const pack = map.get(v.ayah) || {}
          v.translations = Object.entries(pack).map(([translationId, text]) => ({ translationId, text }))
        }
      }
      return sendJson(res, 200, slice)
    }

    // file-backed mode
    const maxAyah = MAX_AYAH_BY_SURAH.get(surah) || 0
    if (!from || from < 1) from = 1
    if (!to || to < 1) to = maxAyah
    if (to > maxAyah) to = maxAyah
    if (!from || !to || from > to) return sendJson(res, 400, { error: 'Invalid query' })

    const slice = []
    for (let ayah = from; ayah <= to; ayah++) {
      const key = `${surah}:${ayah}`
      const base = VERSES_INDEX.get(key)
      if (base) {
        const row = { surah, ayah, text_ar_simple: base.text_ar_simple }
        if (base.bismillah) Object.assign(row, { bismillah: base.bismillah })
        slice.push(row)
      }
    }

    const tParam = params.translation_ids || params.t || ''
    const ids = tParam ? tParam.split(',').map(s => s.trim()).filter(Boolean) : []

    if (ids.length) {
      const set = buildSliceSet(slice)
      const map = new Map() // key -> { [id]: text }
      for (const id of ids) {
        const file = TRANSLATION_FILES.get(id)
        if (!file || !fs.existsSync(file)) continue
        const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)
        for (const line of lines) {
          const row = JSON.parse(line) // { surah, ayah, text }
          const key = `${row.surah}:${row.ayah}`
          if (!set.has(key)) continue
          if (!map.has(key)) map.set(key, {})
          map.get(key)[id] = row.text
        }
      }
      // attach
      for (const v of slice) {
        const key = `${v.surah}:${v.ayah}`
        const pack = map.get(key) || {}
        v.translations = Object.entries(pack).map(([translationId, text]) => ({ translationId, text }))
      }
    }

    return sendJson(res, 200, slice)
  }

  notFound(res)
}

const server = http.createServer((req, res) => { void handle(req, res) })

const port = process.env.PORT || 4000
server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})

