#!/usr/bin/env node
/*
  Build static data for the web app from scripts/out
  - Writes under apps/web/public/data/
    - data/surahs.json
    - data/verses/{001..114}.json
    - data/translations/{translationId}/{001..114}.json
*/

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'scripts', 'out')
const OUT_TRANSLATIONS_DIR = path.join(OUT_DIR, 'translations')
const WEB_PUBLIC_DATA = path.join(ROOT, 'apps', 'web', 'public', 'data')

function ensureDir(p) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function pad3(n) {
    return String(n).padStart(3, '0')
}

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function readJsonLines(file) {
    return fs
        .readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line))
}

function writeJson(file, obj) {
    ensureDir(path.dirname(file))
    fs.writeFileSync(file, JSON.stringify(obj) + '\n', 'utf8')
}

function cleanDir(dir) {
    if (fs.existsSync(dir)) {
        for (const entry of fs.readdirSync(dir)) {
            const p = path.join(dir, entry)
            fs.rmSync(p, { recursive: true, force: true })
        }
    } else {
        ensureDir(dir)
    }
}

function main() {
    const required = [
        path.join(OUT_DIR, 'surahs.json'),
        path.join(OUT_DIR, 'verses.jsonl'),
        path.join(OUT_DIR, 'translations.json'),
    ]
    for (const f of required) {
        if (!fs.existsSync(f)) {
            console.error(`Required file missing: ${path.relative(ROOT, f)}. Run: node scripts/tanzil-import.js`)
            process.exit(1)
        }
    }

    console.log('Building static data into apps/web/public/data ...')
    cleanDir(WEB_PUBLIC_DATA)

    // Copy surahs and translations metadata
    const surahsJson = readJson(path.join(OUT_DIR, 'surahs.json'))
    writeJson(path.join(WEB_PUBLIC_DATA, 'surahs.json'), surahsJson)

    const translationsMeta = readJson(path.join(OUT_DIR, 'translations.json'))
    writeJson(path.join(WEB_PUBLIC_DATA, 'translations.json'), translationsMeta)

    // Build per-surah verses
    const versesRows = readJsonLines(path.join(OUT_DIR, 'verses.jsonl'))
    const versesBySurah = new Map()
    for (const row of versesRows) {
        const list = versesBySurah.get(row.surah) || []
        const base = { surah: row.surah, ayah: row.ayah, text_ar_simple: row.text_ar_simple }
        if (row.bismillah) base.bismillah = row.bismillah
        list.push(base)
        versesBySurah.set(row.surah, list)
    }
    for (const [surah, list] of versesBySurah) {
        list.sort((a, b) => a.ayah - b.ayah)
        const file = path.join(WEB_PUBLIC_DATA, 'verses', `${pad3(surah)}.json`)
        writeJson(file, list)
    }

    // Per-translation per-surah files
    if (fs.existsSync(OUT_TRANSLATIONS_DIR)) {
        const files = fs.readdirSync(OUT_TRANSLATIONS_DIR).filter((f) => f.endsWith('.jsonl'))
        for (const f of files) {
            const id = path.basename(f, '.jsonl')
            const rows = readJsonLines(path.join(OUT_TRANSLATIONS_DIR, f))
            const bySurah = new Map()
            for (const r of rows) {
                const list = bySurah.get(r.surah) || []
                list.push({ ayah: r.ayah, text: r.text })
                bySurah.set(r.surah, list)
            }
            for (const [surah, list] of bySurah) {
                list.sort((a, b) => a.ayah - b.ayah)
                const file = path.join(WEB_PUBLIC_DATA, 'translations', id, `${pad3(surah)}.json`)
                writeJson(file, list)
            }
        }
    }

    console.log('Done building static data.')
}

if (require.main === module) {
    try {
        main()
    } catch (err) {
        console.error('Failed to build static data:', err)
        process.exit(1)
    }
}


