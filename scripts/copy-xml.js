#!/usr/bin/env node
// Copy Quran XML assets into the web app's public directory

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'assets', 'quran')
const DST = path.join(ROOT, 'apps', 'web', 'public', 'quran')

function ensureDir(p) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function main() {
    if (!fs.existsSync(SRC)) {
        console.error(`Source not found: ${path.relative(ROOT, SRC)}`)
        process.exit(1)
    }
    ensureDir(DST)

    const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.xml'))
    for (const f of files) {
        const from = path.join(SRC, f)
        const to = path.join(DST, f)
        fs.copyFileSync(from, to)
    }
    console.log(`Copied ${files.length} XML files to ${path.relative(ROOT, DST)}`)
}

if (require.main === module) {
    try { main() } catch (err) { console.error(err); process.exit(1) }
}


