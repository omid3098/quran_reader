#!/usr/bin/env bun
/**
 * Generates local Quran data files from api.alquran.cloud
 *
 * Fetches chapters, Quran text (Uthmani + Simple), translations, and a
 * translation registry, then writes them as static JSON files under public/data/.
 *
 * Usage:
 *   bun run scripts/generate-quran-data.ts              # generate all
 *   bun run scripts/generate-quran-data.ts chapters      # chapters only
 *   bun run scripts/generate-quran-data.ts quran         # quran text only
 *   bun run scripts/generate-quran-data.ts translations  # bundled translations only
 *   bun run scripts/generate-quran-data.ts registry      # translation registry only
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Text sanitizer (same logic as services/textSanitizer.ts)
// ---------------------------------------------------------------------------
const NON_TEXT_QURAN_CHARS = /[\u0610-\u061A\u06D6-\u06E4\u06E7-\u06ED\u08D4-\u08E1\u08E3-\u08FF]/g;

function sanitizeQuranText(text: string): string {
  if (!text) return "";
  return text.replace(NON_TEXT_QURAN_CHARS, "").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
const BASE_URL = "https://api.alquran.cloud/v1";
const RATE_LIMIT_MS = 100;

async function apiFetch<T>(endpoint: string): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status} for ${url}`);
  const json = await res.json();
  return json.data as T;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Types (API responses)
// ---------------------------------------------------------------------------
interface SurahResponse {
  number: number;
  revelationType: string;
  revelationOrder?: number;
  englishName: string;
  name: string;
  numberOfAyahs: number;
  englishNameTranslation: string;
}

interface AyahResponse {
  number: number;
  numberInSurah: number;
  text: string;
}

interface EditionResponse {
  edition?: { identifier: string; name: string; direction?: string };
  ayahs: AyahResponse[];
}

interface TranslationEditionResponse {
  identifier: string;
  name: string;
  englishName: string;
  language: string;
  direction: string;
  type: string;
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------
interface ChapterOut {
  id: number;
  revelation_place: string;
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  translated_name: { language_name: string; name: string };
}

interface SurahTextOut {
  surahId: number;
  verses: {
    id: number;
    numberInSurah: number;
    text_uthmani: string;
    text_simple: string;
  }[];
}

interface TranslationMeta {
  id: string;
  name: string;
  author_name: string;
  language_name: string;
  direction: string;
  slug: string;
}

interface TranslationFileOut {
  _meta: TranslationMeta & { generated: string };
  verses: Record<string, string>;
}

interface TranslationRegistryOut {
  _meta: { source: string; generated: string };
  bundled: (TranslationMeta & { bundled: true })[];
  downloadable: (TranslationMeta & { bundled: false })[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LANGUAGE_MAP: Record<string, string> = {
  en: "English",
  fa: "Persian",
  fr: "French",
  de: "German",
  es: "Spanish",
  tr: "Turkish",
  ur: "Urdu",
  id: "Indonesian",
  ru: "Russian",
  zh: "Chinese",
  bn: "Bengali",
};

function capitalize(s: string): string {
  return LANGUAGE_MAP[s] || s.charAt(0).toUpperCase() + s.slice(1);
}

// Preferred Persian translations with correct names
const PREFERRED_TRANSLATIONS: TranslationMeta[] = [
  {
    id: "fa.ansarian",
    name: "انصاریان",
    language_name: "Persian",
    author_name: "Hussain Ansarian",
    slug: "ansarian",
    direction: "rtl",
  },
  {
    id: "fa.ayati",
    name: "آیتی",
    language_name: "Persian",
    author_name: "AbdolMohammad Ayati",
    slug: "ayati",
    direction: "rtl",
  },
  {
    id: "fa.bahrampour",
    name: "بهرام‌پور",
    language_name: "Persian",
    author_name: "Abolfazl Bahrampour",
    slug: "bahrampour",
    direction: "rtl",
  },
  {
    id: "fa.gharaati",
    name: "قرائتی",
    language_name: "Persian",
    author_name: "Mohsen Qaraati",
    slug: "gharaati",
    direction: "rtl",
  },
  {
    id: "fa.ghomshei",
    name: "الهی قمشه‌ای",
    language_name: "Persian",
    author_name: "Mahdi Elahi Ghomshei",
    slug: "ghomshei",
    direction: "rtl",
  },
  {
    id: "fa.fooladvand",
    name: "فولادوند",
    language_name: "Persian",
    author_name: "Mohammad Mahdi Fooladvand",
    slug: "fooladvand",
    direction: "rtl",
  },
  {
    id: "fa.khorramdel",
    name: "خرمدل",
    language_name: "Persian",
    author_name: "Mostafa Khorramdel",
    slug: "khorramdel",
    direction: "rtl",
  },
  {
    id: "fa.khorramshahi",
    name: "خرمشاهی",
    language_name: "Persian",
    author_name: "Baha'oddin Khorramshahi",
    slug: "khorramshahi",
    direction: "rtl",
  },
  {
    id: "fa.makarem",
    name: "مکارم شیرازی",
    language_name: "Persian",
    author_name: "Naser Makarem Shirazi",
    slug: "makarem",
    direction: "rtl",
  },
  {
    id: "fa.mojtabavi",
    name: "مجتبوی",
    language_name: "Persian",
    author_name: "Sayyed Jalaloddin Mojtabavi",
    slug: "mojtabavi",
    direction: "rtl",
  },
  {
    id: "fa.moezzi",
    name: "معزی",
    language_name: "Persian",
    author_name: "Mohammad Kazem Moezzi",
    slug: "moezzi",
    direction: "rtl",
  },
  {
    id: "fa.sadeqi",
    name: "صادقی تهرانی",
    language_name: "Persian",
    author_name: "Mohammad Sadeqi Tehrani",
    slug: "sadeqi",
    direction: "rtl",
  },
  {
    id: "fa.safavi",
    name: "صفوی",
    language_name: "Persian",
    author_name: "Mohammad Reza Safavi",
    slug: "safavi",
    direction: "rtl",
  },
];

// Translation IDs to bundle (Persian + main English)
const BUNDLED_TRANSLATION_IDS = [
  ...PREFERRED_TRANSLATIONS.map((t) => t.id),
  "en.sahih",
  "en.asad",
  "en.pickthall",
];

// ---------------------------------------------------------------------------
// Ensure directories
// ---------------------------------------------------------------------------
function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

async function generateChapters(rootDir: string) {
  console.log("\n=== Generating chapters.json ===");
  const outDir = path.join(rootDir, "public", "data");
  ensureDir(outDir);

  const surahs = await apiFetch<SurahResponse[]>("/surah");
  console.log(`  Fetched ${surahs.length} chapters from API.`);

  const chapters: ChapterOut[] = surahs.map((s) => ({
    id: s.number,
    revelation_place: s.revelationType.toLowerCase(),
    revelation_order: s.revelationOrder || 0,
    bismillah_pre: s.number !== 1 && s.number !== 9,
    name_simple: s.englishName,
    name_complex: s.englishName,
    name_arabic: sanitizeQuranText(s.name),
    verses_count: s.numberOfAyahs,
    translated_name: {
      language_name: "English",
      name: s.englishNameTranslation,
    },
  }));

  const output = {
    _meta: { source: "api.alquran.cloud/v1/surah", generated: new Date().toISOString() },
    chapters,
  };

  const outPath = path.join(outDir, "chapters.json");
  writeFileSync(outPath, JSON.stringify(output), "utf-8");
  console.log(`  Written ${outPath} (${chapters.length} chapters)`);
}

async function generateQuranText(rootDir: string) {
  console.log("\n=== Generating Quran text (per-surah) ===");
  const outDir = path.join(rootDir, "public", "data", "quran");
  ensureDir(outDir);

  for (let surahId = 1; surahId <= 114; surahId++) {
    const editions = await apiFetch<EditionResponse[]>(
      `/surah/${surahId}/editions/quran-uthmani,quran-simple`
    );

    const uthmani = editions.find((e) => e.edition?.identifier === "quran-uthmani");
    const simple = editions.find((e) => e.edition?.identifier === "quran-simple");
    if (!uthmani) throw new Error(`Uthmani text missing for surah ${surahId}`);
    const simpleEdition = simple || uthmani;

    const surahText: SurahTextOut = {
      surahId,
      verses: uthmani.ayahs.map((ayah, i) => ({
        id: ayah.number,
        numberInSurah: ayah.numberInSurah,
        text_uthmani: sanitizeQuranText(ayah.text),
        text_simple: sanitizeQuranText(simpleEdition.ayahs[i].text),
      })),
    };

    const outPath = path.join(outDir, `${surahId}.json`);
    writeFileSync(outPath, JSON.stringify(surahText), "utf-8");

    if (surahId % 10 === 0 || surahId === 1) {
      console.log(`  Surah ${surahId}/114 written (${surahText.verses.length} verses)`);
    }

    await sleep(RATE_LIMIT_MS);
  }

  console.log("  Done! All 114 surahs written.");
}

async function generateTranslation(translationId: string, meta: TranslationMeta, outDir: string) {
  const verses: Record<string, string> = {};

  for (let surahId = 1; surahId <= 114; surahId++) {
    const editions = await apiFetch<EditionResponse[]>(
      `/surah/${surahId}/editions/${translationId}`
    );

    const edition = editions[0] || (editions as unknown as EditionResponse);
    if (!edition?.ayahs) {
      // Single edition response may not be wrapped in array
      const singleEdition = editions as unknown as EditionResponse;
      if (singleEdition?.ayahs) {
        for (const ayah of singleEdition.ayahs) {
          verses[`${surahId}:${ayah.numberInSurah}`] = ayah.text;
        }
      }
    } else {
      for (const ayah of edition.ayahs) {
        verses[`${surahId}:${ayah.numberInSurah}`] = ayah.text;
      }
    }

    await sleep(RATE_LIMIT_MS);
  }

  const output: TranslationFileOut = {
    _meta: { ...meta, generated: new Date().toISOString() },
    verses,
  };

  const outPath = path.join(outDir, `${translationId}.json`);
  writeFileSync(outPath, JSON.stringify(output), "utf-8");
  return Object.keys(verses).length;
}

async function generateTranslations(rootDir: string) {
  console.log("\n=== Generating bundled translations ===");
  const outDir = path.join(rootDir, "public", "data", "translations");
  ensureDir(outDir);

  // Fetch edition list to get metadata for non-preferred translations
  const allEditions = await apiFetch<TranslationEditionResponse[]>("/edition?type=translation");

  for (const translationId of BUNDLED_TRANSLATION_IDS) {
    console.log(`  Fetching ${translationId}...`);

    // Build meta from preferred list or API
    const preferred = PREFERRED_TRANSLATIONS.find((p) => p.id === translationId);
    let meta: TranslationMeta;

    if (preferred) {
      meta = preferred;
    } else {
      const apiEdition = allEditions.find((e) => e.identifier === translationId);
      if (!apiEdition) {
        console.warn(`  WARNING: ${translationId} not found in API editions, skipping.`);
        continue;
      }
      meta = {
        id: apiEdition.identifier,
        name: apiEdition.name,
        author_name: apiEdition.englishName,
        language_name: capitalize(apiEdition.language),
        direction: apiEdition.direction || "ltr",
        slug: apiEdition.identifier,
      };
    }

    const verseCount = await generateTranslation(translationId, meta, outDir);
    console.log(`    ${translationId}: ${verseCount} verses written.`);
  }

  console.log("  Done! All bundled translations written.");
}

async function generateRegistry(rootDir: string) {
  console.log("\n=== Generating translations-registry.json ===");
  const outDir = path.join(rootDir, "public", "data");
  ensureDir(outDir);

  const allEditions = await apiFetch<TranslationEditionResponse[]>("/edition?type=translation");

  const bundled: (TranslationMeta & { bundled: true })[] = [];
  const downloadable: (TranslationMeta & { bundled: false })[] = [];

  for (const edition of allEditions) {
    const isBundled = BUNDLED_TRANSLATION_IDS.includes(edition.identifier);
    const preferred = PREFERRED_TRANSLATIONS.find((p) => p.id === edition.identifier);

    const meta: TranslationMeta = preferred
      ? preferred
      : {
          id: edition.identifier,
          name: edition.name,
          author_name: edition.englishName,
          language_name: capitalize(edition.language),
          direction: edition.direction || "ltr",
          slug: edition.identifier,
        };

    if (isBundled) {
      bundled.push({ ...meta, bundled: true as const });
    } else {
      downloadable.push({ ...meta, bundled: false as const });
    }
  }

  const output: TranslationRegistryOut = {
    _meta: {
      source: "api.alquran.cloud/v1/edition?type=translation",
      generated: new Date().toISOString(),
    },
    bundled,
    downloadable,
  };

  const outPath = path.join(outDir, "translations-registry.json");
  writeFileSync(outPath, JSON.stringify(output), "utf-8");
  console.log(
    `  Written ${outPath} (${bundled.length} bundled, ${downloadable.length} downloadable)`
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
type Command = "chapters" | "quran" | "translations" | "registry" | "all";

async function main() {
  const arg = (process.argv[2] || "all") as Command;
  const validCommands: Command[] = ["chapters", "quran", "translations", "registry", "all"];

  if (!validCommands.includes(arg)) {
    console.error(`Usage: generate-quran-data.ts [${validCommands.join("|")}]`);
    process.exit(1);
  }

  const rootDir = process.cwd();
  console.log(`Generating Quran data in ${rootDir}/public/data/`);

  const commands = arg === "all" ? ["chapters", "quran", "translations", "registry"] : [arg];

  for (const cmd of commands) {
    switch (cmd) {
      case "chapters":
        await generateChapters(rootDir);
        break;
      case "quran":
        await generateQuranText(rootDir);
        break;
      case "translations":
        await generateTranslations(rootDir);
        break;
      case "registry":
        await generateRegistry(rootDir);
        break;
    }
  }

  console.log("\nAll done!");
}

try {
  await main();
} catch (error) {
  console.error("Generation failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
