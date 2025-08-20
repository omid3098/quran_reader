#!/usr/bin/env node
/*
  Tanzil XML importer for OpenQuranReader
  - Parses assets/quran/quran-simple.xml (Arabic simple)
  - Parses all other *.xml in assets/quran as translations
  - Emits:
      scripts/out/surahs.json
      scripts/out/translations.json
      scripts/out/verses.jsonl
      scripts/out/verse_translations.jsonl
      scripts/out/translations/<translationId>.jsonl (per-translation)
  - No external deps
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const ASSETS_DIR = path.join(ROOT, 'assets', 'quran');
const OUT_DIR = path.join(ROOT, 'scripts', 'out');
const OUT_TRANSLATIONS_DIR = path.join(OUT_DIR, 'translations');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function decodeXmlEntities(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseHeaderMeta(xmlText) {
  // Extract comment header before <quran>
  const headerMatch = xmlText.match(/<!--([\s\S]*?)-->/);
  const meta = {};
  if (headerMatch) {
    const header = headerMatch[1];
    const lines = header.split(/\r?\n/).map((l) => l.trim());
    for (const line of lines) {
      const m = line.match(/^#\s*(\w[\w\s]+?):\s*(.+)$/);
      if (m) {
        const key = m[1].toLowerCase().trim();
        const val = m[2].trim();
        if (key.includes('name')) meta.name = val;
        else if (key.includes('translator')) meta.translator = val;
        else if (key.includes('language')) meta.language = val;
        else if (key === 'id') meta.id = val;
        else if (key.includes('last update')) meta.lastUpdate = val;
        else if (key.includes('source')) meta.source = val;
      }
    }
  }
  return meta;
}

function* iterateSuras(xmlText) {
  // Yields { index: number, name: string, inner: string }
  const suraRegex = /<sura\s+index="(\d+)"\s+name="([^"]*)">([\s\S]*?)<\/sura>/g;
  let m;
  while ((m = suraRegex.exec(xmlText)) !== null) {
    yield { index: parseInt(m[1], 10), name: decodeXmlEntities(m[2] || ''), inner: m[3] };
  }
}

function* iterateAyas(suraInner) {
  // Also capture optional bismillah attr
  const ayaRegex = /<aya\s+index="(\d+)"\s+text="([\s\S]*?)"(?:\s+bismillah="([^"]*)")?\s*\/>/g;
  let m;
  while ((m = ayaRegex.exec(suraInner)) !== null) {
    const idx = parseInt(m[1], 10);
    const text = decodeXmlEntities(m[2] || '');
    const bismillah = m[3] ? decodeXmlEntities(m[3]) : undefined;
    yield { index: idx, text, bismillah };
  }
}

function parseQuranSimple(fullText) {
  const surahs = [];
  const verses = []; // { surah, ayah, text, bismillah? }
  for (const sura of iterateSuras(fullText)) {
    surahs.push({ number: sura.index, name_ar: sura.name });
    for (const aya of iterateAyas(sura.inner)) {
      verses.push({ surah: sura.index, ayah: aya.index, text: aya.text, bismillah: aya.bismillah });
    }
  }
  return { surahs, verses };
}

function parseTranslation(fullText) {
  // Returns { meta, entries: [{surah, ayah, text}] }
  const meta = parseHeaderMeta(fullText);
  const entries = [];
  for (const sura of iterateSuras(fullText)) {
    for (const aya of iterateAyas(sura.inner)) {
      entries.push({ surah: sura.index, ayah: aya.index, text: aya.text });
    }
  }
  return { meta, entries };
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function writeJsonLines(filePath, rows) {
  const fd = fs.openSync(filePath, 'w');
  try {
    for (const row of rows) {
      fs.writeSync(fd, JSON.stringify(row) + '\n');
    }
  } finally {
    fs.closeSync(fd);
  }
}

function main() {
  console.log('OpenQuranReader Tanzil importer');
  ensureDir(OUT_DIR);
  ensureDir(OUT_TRANSLATIONS_DIR);

  const files = fs.readdirSync(ASSETS_DIR).filter((f) => f.endsWith('.xml'));
  if (!files.length) {
    console.error('No XML files found in assets/quran');
    process.exit(1);
  }

  const arabicFile = files.find((f) => f.toLowerCase().includes('quran-simple'));
  if (!arabicFile) {
    console.error('quran-simple.xml not found in assets/quran');
    process.exit(1);
  }

  const arabicText = readFile(path.join(ASSETS_DIR, arabicFile));
  const { surahs, verses } = parseQuranSimple(arabicText);

  // Validate counts
  const totalVerses = verses.length;
  if (surahs.length !== 114) {
    console.warn(`Warning: expected 114 surahs, found ${surahs.length}`);
  }
  if (totalVerses !== 6236) {
    console.warn(`Warning: expected 6236 verses, found ${totalVerses}`);
  }

  // Write surahs and verses
  writeJson(path.join(OUT_DIR, 'surahs.json'), { surahs, source: 'Tanzil', generatedAt: new Date().toISOString() });
  writeJsonLines(path.join(OUT_DIR, 'verses.jsonl'), verses.map((v) => ({ surah: v.surah, ayah: v.ayah, text_ar_simple: v.text, ...(v.bismillah ? { bismillah: v.bismillah } : {}) })));

  const translationFiles = files.filter((f) => f !== arabicFile);
  const translationsMeta = [];
  const verseTranslationsAll = [];

  for (const file of translationFiles) {
    const fullText = readFile(path.join(ASSETS_DIR, file));
    const { meta, entries } = parseTranslation(fullText);

    // Derive ID if missing: from filename like en.arberry.xml
    if (!meta.id) {
      const base = path.basename(file, '.xml');
      meta.id = base;
    }
    if (!meta.language) {
      const langGuess = meta.id.split('.')[0];
      meta.language = langGuess;
    }
    if (!meta.name) meta.name = meta.id;

    translationsMeta.push({
      id: meta.id,
      name: meta.name,
      language: meta.language,
      translator: meta.translator || null,
      source: meta.source || 'Tanzil.net',
      lastUpdate: meta.lastUpdate || null,
      file,
      verseCount: entries.length,
    });

    // Validate verse counts roughly
    if (entries.length !== verses.length) {
      console.warn(`Warning: verse count mismatch for ${meta.id}: ${entries.length} vs ${verses.length}`);
    }

    // Write per-translation JSONL
    const outPerTrans = path.join(OUT_TRANSLATIONS_DIR, `${meta.id}.jsonl`);
    writeJsonLines(outPerTrans, entries.map((e) => ({ surah: e.surah, ayah: e.ayah, text: e.text })));

    // Accumulate global verse_translations
    for (const e of entries) {
      verseTranslationsAll.push({ surah: e.surah, ayah: e.ayah, translationId: meta.id, text: e.text });
    }
  }

  writeJson(path.join(OUT_DIR, 'translations.json'), { translations: translationsMeta, generatedAt: new Date().toISOString() });
  writeJsonLines(path.join(OUT_DIR, 'verse_translations.jsonl'), verseTranslationsAll);

  console.log(`Done. Wrote:`);
  console.log(`- ${path.relative(ROOT, path.join(OUT_DIR, 'surahs.json'))}`);
  console.log(`- ${path.relative(ROOT, path.join(OUT_DIR, 'verses.jsonl'))}`);
  console.log(`- ${path.relative(ROOT, path.join(OUT_DIR, 'translations.json'))}`);
  console.log(`- ${path.relative(ROOT, path.join(OUT_DIR, 'verse_translations.jsonl'))}`);
  console.log(`- ${translationFiles.length} per-translation files under ${path.relative(ROOT, OUT_TRANSLATIONS_DIR)}`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error('Importer failed:', err);
    process.exit(1);
  }
}

