#!/usr/bin/env node
/*
  Seed Postgres from file-backed outputs in scripts/out
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '../../..')
const OUT_DIR = path.join(ROOT, 'scripts', 'out')

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function* readJsonl(filePath) {
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
    for (const line of lines) {
        if (!line) continue
        yield JSON.parse(line)
    }
}

async function main() {
    const prisma = new PrismaClient()
    try {
        const surahsJson = path.join(OUT_DIR, 'surahs.json')
        const translationsJson = path.join(OUT_DIR, 'translations.json')
        const versesJsonl = path.join(OUT_DIR, 'verses.jsonl')
        const verseTranslationsJsonl = path.join(OUT_DIR, 'verse_translations.jsonl')

        if (!fs.existsSync(surahsJson) || !fs.existsSync(translationsJson) || !fs.existsSync(versesJsonl) || !fs.existsSync(verseTranslationsJsonl)) {
            throw new Error('Missing required files in scripts/out. Run: node scripts/tanzil-import.js at repo root')
        }

        const surahs = readJson(surahsJson).surahs || []
        const translations = readJson(translationsJson).translations || []

        // Upsert Surahs
        for (const s of surahs) {
            await prisma.surah.upsert({
                where: { number: s.number },
                update: { name_ar: s.name_ar },
                create: { number: s.number, name_ar: s.name_ar },
            })
        }

        // Upsert Translations
        for (const t of translations) {
            await prisma.translation.upsert({
                where: { id: t.id },
                update: {
                    name: t.name,
                    language: t.language,
                    translator: t.translator || null,
                    source: t.source || null,
                    lastUpdate: t.lastUpdate ? new Date(t.lastUpdate) : null,
                    verseCount: t.verseCount || null,
                },
                create: {
                    id: t.id,
                    name: t.name,
                    language: t.language,
                    translator: t.translator || null,
                    source: t.source || null,
                    lastUpdate: t.lastUpdate ? new Date(t.lastUpdate) : null,
                    verseCount: t.verseCount || null,
                },
            })
        }

        // Insert Verses (replace existing)
        await prisma.verse.deleteMany({})
        const verseBatch = []
        for (const v of readJsonl(versesJsonl)) {
            verseBatch.push({ surah: v.surah, ayah: v.ayah, text_ar_simple: v.text_ar_simple, bismillah: v.bismillah || null })
            if (verseBatch.length >= 1000) {
                await prisma.verse.createMany({ data: verseBatch, skipDuplicates: true })
                verseBatch.length = 0
            }
        }
        if (verseBatch.length) await prisma.verse.createMany({ data: verseBatch, skipDuplicates: true })

        // Insert VerseTranslations (replace existing)
        await prisma.verseTranslation.deleteMany({})
        const vtBatch = []
        for (const vt of readJsonl(verseTranslationsJsonl)) {
            vtBatch.push({ surah: vt.surah, ayah: vt.ayah, translationId: vt.translationId, text: vt.text })
            if (vtBatch.length >= 2000) {
                await prisma.verseTranslation.createMany({ data: vtBatch, skipDuplicates: true })
                vtBatch.length = 0
            }
        }
        if (vtBatch.length) await prisma.verseTranslation.createMany({ data: vtBatch, skipDuplicates: true })

        console.log('Seed complete')
    } finally {
        await prisma.$disconnect()
    }
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})


