import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

function sendJson(res, code, data) {
  res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' })
  res.end(JSON.stringify(data))
}

function notFound(res) { res.writeHead(404); res.end('Not found') }

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, 'scripts', 'out')

// Load surahs and translations once at startup
let SURAH_LIST = []
let TRANSLATIONS = []
let VERSES_INDEX = new Map() // key `${surah}:${ayah}` -> { text_ar_simple }
let TRANSLATION_FILES = new Map() // translationId -> absolute file path

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
  const lines = fs.readFileSync(versesJsonlPath, 'utf8').split(/\r?\n/).filter(Boolean)
  for (const line of lines) {
    const v = JSON.parse(line)
    const key = `${v.surah}:${v.ayah}`
    VERSES_INDEX.set(key, { text_ar_simple: v.text_ar_simple, bismillah: v.bismillah })
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

loadData()

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

const server = http.createServer((req, res) => {
  const { pathname, params, searchParams } = parseQuery(req.url || '/')

  if (pathname === '/health') return sendJson(res, 200, { ok: true, name: 'OpenQuranReader API' })

  if (pathname === '/surahs') return sendJson(res, 200, SURAH_LIST)

  if (pathname === '/translations') return sendJson(res, 200, TRANSLATIONS)

  if (pathname === '/verses') {
    const surah = parseInt(params.surah || '0', 10)
    const from = parseInt(params.from || '1', 10)
    const to = parseInt(params.to || '0', 10)
    if (!surah || !from || !to || from > to) return sendJson(res, 400, { error: 'Invalid query' })

    const slice = []
    for (let ayah = from; ayah <= to; ayah++) {
      const key = `${surah}:${ayah}`
      const base = VERSES_INDEX.get(key)
      if (base) slice.push({ surah, ayah, text_ar_simple: base.text_ar_simple })
    }

    // Collect translations if requested
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
})

const port = process.env.PORT || 4000
server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})

