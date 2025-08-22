#!/usr/bin/env node
/**
 * Generate root frequency data from Quran text.
 * Uses arabic-stem package to approximate roots for each word.
 * Produces apps/web/public/roots.json with mapping { root: { count, verses[] } }
 */
const fs = require('fs');
const path = require('path');
const Stemmer = require('arabic-stem');

const stemmer = new Stemmer();
const ROOT = process.cwd();
const QURAN_XML = path.join(ROOT, 'assets', 'quran', 'quran-simple.xml');
const OUT_FILE = path.join(ROOT, 'apps', 'web', 'public', 'roots.json');

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

function* iterateSuras(xmlText) {
  const suraRegex = /<sura\s+index="(\d+)"\s+name="([^"]*)">([\s\S]*?)<\/sura>/g;
  let m;
  while ((m = suraRegex.exec(xmlText)) !== null) {
    yield { index: parseInt(m[1], 10), inner: m[3] };
  }
}

function* iterateAyas(suraInner) {
  const ayaRegex = /<aya\s+index="(\d+)"\s+text="([\s\S]*?)"(?:\s+bismillah="([^"]*)")?\s*\/>/g;
  let m;
  while ((m = ayaRegex.exec(suraInner)) !== null) {
    const idx = parseInt(m[1], 10);
    const text = decodeXmlEntities(m[2] || '');
    yield { index: idx, text };
  }
}

function cleanWord(w) {
  return w.replace(/[^\u0621-\u064A]/g, '');
}

function normalizeRoot(r) {
  if (r === 'اتق' || r === 'متق' || r === 'تقي') return 'وقي';
  return r;
}

function main() {
  console.log('Generating root data...');
  const xmlText = readFile(QURAN_XML);
  const roots = {};
  for (const sura of iterateSuras(xmlText)) {
    for (const aya of iterateAyas(sura.inner)) {
      const verseKey = `${sura.index}:${aya.index}`;
      const words = aya.text.split(/\s+/);
      for (const word of words) {
        const cleaned = cleanWord(word);
        if (!cleaned) continue;
        let root;
        try {
          const res = stemmer.stem(cleaned);
          root = Array.isArray(res.stem) ? res.stem[0] : null;
        } catch {
          root = null;
        }
        root = root ? normalizeRoot(root) : null;
        if (!root) continue;
        if (!roots[root]) roots[root] = { count: 0, verses: [] };
        roots[root].count++;
        if (!roots[root].verses.includes(verseKey)) roots[root].verses.push(verseKey);
      }
    }
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify(roots, null, 2));
  console.log(`Wrote ${Object.keys(roots).length} roots to ${path.relative(ROOT, OUT_FILE)}`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error('Failed to generate roots:', err);
    process.exit(1);
  }
}
