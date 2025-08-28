#!/usr/bin/env node
/*
  Downloads all Quran translations from Tanzil and stores them under apps/web/public/quran.
  Also writes translations.json with id, name, and language metadata.
*/

const fs = require('fs');
const path = require('path');

async function main() {
  const outDir = path.join(__dirname, '..', 'apps', 'web', 'public', 'quran');
  fs.mkdirSync(outDir, { recursive: true });

  console.log('Fetching translation list...');
  const res = await fetch('https://tanzil.net/trans/');
  const html = await res.text();

  const rowRe = /<tr><td><i[^>]*><\/i>(.*?)<\/lang><td>(.*?)<\/name><td>[\s\S]*?<a href="\/trans\/(.*?)"/g;
  const translations = [];
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const language = m[1].trim();
    const name = m[2].trim();
    const id = m[3].trim();
    translations.push({ id, name, language });
  }
  console.log(`Found ${translations.length} translations`);

  for (const t of translations) {
    const url = `https://tanzil.net/trans/${t.id}?type=xml`;
    console.log(`Downloading ${t.id}...`);
    const trRes = await fetch(url);
    if (!trRes.ok) {
      console.warn(`Failed to download ${t.id}`);
      continue;
    }
    const txt = await trRes.text();
    fs.writeFileSync(path.join(outDir, `${t.id}.xml`), txt);
  }

  fs.writeFileSync(path.join(outDir, 'translations.json'), JSON.stringify(translations, null, 2));
  console.log('Done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

