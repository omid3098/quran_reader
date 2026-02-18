import { Chapter, Verse, Reciter, TranslationResource } from "../types";
import { sanitizeQuranText } from "./textSanitizer";

// API response types for alquran.cloud
interface SurahResponse {
  number: number;
  revelationType: string;
  revelationOrder?: number;
  englishName: string;
  name: string;
  numberOfAyahs: number;
  englishNameTranslation: string;
}

interface TranslationResponse {
  identifier: string;
  name: string;
  englishName: string;
  language: string;
}

interface EditionResponse {
  edition?: { identifier: string; name: string; direction?: string };
  ayahs: AyahResponse[];
}

interface AyahResponse {
  number: number;
  numberInSurah: number;
  text: string;
}

const BASE_URL = "https://api.alquran.cloud/v1";

const FALLBACK_CHAPTERS: Chapter[] = [
  {
    id: 1,
    revelation_place: "Meccan",
    revelation_order: 5,
    bismillah_pre: true,
    name_simple: "Al-Faatiha",
    name_complex: "Al-Faatiha",
    name_arabic: "الفاتحة",
    verses_count: 7,
    translated_name: {
      language_name: "English",
      name: "The Opening",
    },
  },
  {
    id: 2,
    revelation_place: "Medinan",
    revelation_order: 87,
    bismillah_pre: true,
    name_simple: "Al-Baqara",
    name_complex: "Al-Baqarah",
    name_arabic: "البقرة",
    verses_count: 286,
    translated_name: {
      language_name: "English",
      name: "The Cow",
    },
  },
];

const FALLBACK_VERSES: Verse[] = [
  {
    id: 1,
    verse_key: "1:1",
    text_uthmani: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
    text_simple: "بسم الله الرحمن الرحيم",
    translations: [
      {
        id: "en.sahih",
        resource_id: "en.sahih",
        resource_name: "Saheeh International",
        text: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
      },
    ],
  },
  {
    id: 2,
    verse_key: "1:2",
    text_uthmani: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ",
    text_simple: "الحمد لله رب العالمين",
    translations: [
      {
        id: "en.sahih",
        resource_id: "en.sahih",
        resource_name: "Saheeh International",
        text: "[All] praise is [due] to Allah, Lord of the worlds -",
      },
    ],
  },
  {
    id: 3,
    verse_key: "1:3",
    text_uthmani: "ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
    text_simple: "الرحمن الرحيم",
    translations: [
      {
        id: "en.sahih",
        resource_id: "en.sahih",
        resource_name: "Saheeh International",
        text: "The Entirely Merciful, the Especially Merciful,",
      },
    ],
  },
  {
    id: 4,
    verse_key: "1:4",
    text_uthmani: "مَٰلِكِ يَوْمِ ٱلدِّينِ",
    text_simple: "مالك يوم الدين",
    translations: [
      {
        id: "en.sahih",
        resource_id: "en.sahih",
        resource_name: "Saheeh International",
        text: "Sovereign of the Day of Recompense.",
      },
    ],
  },
  {
    id: 5,
    verse_key: "1:5",
    text_uthmani: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
    text_simple: "إياك نعبد وإياك نستعين",
    translations: [
      {
        id: "en.sahih",
        resource_id: "en.sahih",
        resource_name: "Saheeh International",
        text: "It is You we worship and You we ask for help.",
      },
    ],
  },
  {
    id: 6,
    verse_key: "1:6",
    text_uthmani: "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ",
    text_simple: "اهدنا الصراط المستقيم",
    translations: [
      {
        id: "en.sahih",
        resource_id: "en.sahih",
        resource_name: "Saheeh International",
        text: "Guide us to the straight path -",
      },
    ],
  },
  {
    id: 7,
    verse_key: "1:7",
    text_uthmani:
      "صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ",
    text_simple: "صراط الذين أنعمت عليهم غير المغضوب عليهم ولا الضالين",
    translations: [
      {
        id: "en.sahih",
        resource_id: "en.sahih",
        resource_name: "Saheeh International",
        text: "The path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray.",
      },
    ],
  },
];

// Expanded list of Reciters supported by everyayah.com
export const RECITERS: Reciter[] = [
  { id: "alafasy", name: "Mishary Rashid Alafasy", subfolder: "Alafasy_128kbps" },
  { id: "sudais", name: "Abdur-Rahman as-Sudais", subfolder: "Abdurrahmaan_As-Sudais_192kbps" },
  { id: "shuraym", name: "Saud Al-Shuraym", subfolder: "Saud_Al-Shuraim_128kbps" },
  { id: "maher", name: "Maher Al Muaiqly", subfolder: "MaherAlMuaiqly_128kbps" },
  { id: "husary", name: "Mahmoud Khalil Al-Husary", subfolder: "Husary_128kbps" },
  {
    id: "husary_mujawwad",
    name: "Mahmoud Khalil Al-Husary (Mujawwad)",
    subfolder: "Husary_Mujawwad_128kbps",
  },
  { id: "minshawi", name: "Mohamed Siddiq Al-Minshawi", subfolder: "Minshawy_Murattal_128kbps" },
  {
    id: "minshawi_mujawwad",
    name: "Mohamed Siddiq Al-Minshawi (Mujawwad)",
    subfolder: "Minshawy_Mujawwad_192kbps",
  },
  {
    id: "abdulbasit",
    name: "AbdulBaset AbdulSamad (Murattal)",
    subfolder: "Abdul_Basit_Murattal_192kbps",
  },
  {
    id: "abdulbasit_mujawwad",
    name: "AbdulBaset AbdulSamad (Mujawwad)",
    subfolder: "Abdul_Basit_Mujawwad_128kbps",
  },
  { id: "ghamadi", name: "Saad Al-Ghamdi", subfolder: "Ghamadi_40kbps" },
  { id: "hudhaify", name: "Ali Al-Hudhaify", subfolder: "Ali_Al-Hudhaify_128kbps" },
  { id: "hani_rifai", name: "Hani Ar-Rifai", subfolder: "Hani_Rifai_192kbps" },
  { id: "tunaiji", name: "Khalifa Al Tunaiji", subfolder: "Khalifa_Al_Tunaiji_64kbps" },
  {
    id: "ajamy",
    name: "Ahmed ibn Ali al-Ajamy",
    subfolder: "Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net",
  },
  { id: "jibreel", name: "Muhammad Jibreel", subfolder: "Muhammad_Jibreel_128kbps" },
  { id: "tablawi", name: "Mohammad Al Tablawi", subfolder: "Mohammad_al_Tablaway_128kbps" },
  { id: "ayyoub", name: "Muhammad Ayyoub", subfolder: "Muhammad_Ayyoub_128kbps" },
  { id: "basfar", name: "Abdullah Basfar", subfolder: "Abdullah_Basfar_192kbps" },
  { id: "parhizgar", name: "Shahriar Parhizgar", subfolder: "Parhizgar_48kbps" },
  { id: "jaber", name: "Ali Jaber", subfolder: "Ali_Jaber_64kbps" },
  { id: "shatri", name: "Abu Bakr al-Shatri", subfolder: "Abu_Bakr_Ash-Shatri_128kbps" },
  { id: "banna", name: "Mahmoud Ali Al Banna", subfolder: "Mahmoud_Ali_Al_Banna_32kbps" },
  { id: "walk", name: "Ibrahim Walk (English)", subfolder: "Ibrahim_Walk_192kbps_TEST" },
  {
    id: "hedayatfar",
    name: "Fooladvand - Hedayatfar (Persian)",
    subfolder: "Fooladvand_Hedayatfar_40kbps",
  },
  { id: "makarem", name: "Makarem Shirazi (Persian)", subfolder: "Makarem_Kabiri_16Kbps" },
  { id: "shamshad", name: "Shamshad Ali Khan (Urdu)", subfolder: "Shamshad_Ali_Khan_46kbps" },
];

// List of preferred translation identifiers with correct names
export const PREFERRED_TRANSLATIONS: Partial<TranslationResource>[] = [
  // Persian - Tanzil IDs
  {
    id: "fa.ansarian",
    name: "انصاریان",
    language_name: "Persian",
    author_name: "Hussain Ansarian",
    slug: "ansarian",
  },
  {
    id: "fa.ayati",
    name: "آیتی",
    language_name: "Persian",
    author_name: "AbdolMohammad Ayati",
    slug: "ayati",
  },
  {
    id: "fa.bahrampour",
    name: "بهرام‌پور",
    language_name: "Persian",
    author_name: "Abolfazl Bahrampour",
    slug: "bahrampour",
  },
  {
    id: "fa.gharaati",
    name: "قرائتی",
    language_name: "Persian",
    author_name: "Mohsen Qaraati",
    slug: "gharaati",
  },
  {
    id: "fa.ghomshei",
    name: "الهی قمشه‌ای",
    language_name: "Persian",
    author_name: "Mahdi Elahi Ghomshei",
    slug: "ghomshei",
  },
  {
    id: "fa.fooladvand",
    name: "فولادوند",
    language_name: "Persian",
    author_name: "Mohammad Mahdi Fooladvand",
    slug: "fooladvand",
  },
  {
    id: "fa.khorramdel",
    name: "خرمدل",
    language_name: "Persian",
    author_name: "Mostafa Khorramdel",
    slug: "khorramdel",
  },
  {
    id: "fa.khorramshahi",
    name: "خرمشاهی",
    language_name: "Persian",
    author_name: "Baha'oddin Khorramshahi",
    slug: "khorramshahi",
  },
  {
    id: "fa.makarem",
    name: "مکارم شیرازی",
    language_name: "Persian",
    author_name: "Naser Makarem Shirazi",
    slug: "makarem",
  },
  {
    id: "fa.mojtabavi",
    name: "مجتبوی",
    language_name: "Persian",
    author_name: "Sayyed Jalaloddin Mojtabavi",
    slug: "mojtabavi",
  },
  {
    id: "fa.moezzi",
    name: "معزی",
    language_name: "Persian",
    author_name: "Mohammad Kazem Moezzi",
    slug: "moezzi",
  },
  {
    id: "fa.sadeqi",
    name: "صادقی تهرانی",
    language_name: "Persian",
    author_name: "Mohammad Sadeqi Tehrani",
    slug: "sadeqi",
  },
  {
    id: "fa.safavi",
    name: "صفوی",
    language_name: "Persian",
    author_name: "Mohammad Reza Safavi",
    slug: "safavi",
  },
];

export const getChapters = async (): Promise<Chapter[]> => {
  try {
    const response = await fetch(`${BASE_URL}/surah`);
    if (!response.ok) throw new Error("Failed to fetch chapters");
    const data = await response.json();

    const chapters = data.data.map((s: SurahResponse) => ({
      id: s.number,
      revelation_place: s.revelationType.toLowerCase(),
      revelation_order: s.revelationOrder || 0,
      bismillah_pre: s.number !== 1 && s.number !== 9, // All except Fatiha and Tawbah
      name_simple: s.englishName,
      name_complex: s.englishName,
      name_arabic: sanitizeQuranText(s.name),
      verses_count: s.numberOfAyahs,
      translated_name: {
        language_name: "English",
        name: s.englishNameTranslation,
      },
    }));

    return chapters.length > 0 ? chapters : FALLBACK_CHAPTERS;
  } catch (error) {
    console.error(error);
    return FALLBACK_CHAPTERS;
  }
};

export const getAvailableTranslations = async (): Promise<TranslationResource[]> => {
  try {
    const response = await fetch(`${BASE_URL}/edition?type=translation`);
    if (!response.ok) throw new Error("Failed to fetch translations");
    const data = await response.json();

    const apiTranslations: TranslationResource[] = data.data.map((t: TranslationResponse) => ({
      id: t.identifier,
      name: t.name,
      author_name: t.englishName,
      slug: t.identifier,
      language_name: capitalize(t.language),
    }));

    // Merge and Override with PREFERRED_TRANSLATIONS to get correct Persian names
    const merged = [...apiTranslations];

    PREFERRED_TRANSLATIONS.forEach((pref) => {
      const index = merged.findIndex((m) => m.id === pref.id);
      if (index !== -1) {
        merged[index] = { ...merged[index], ...pref };
      }
    });

    // Move Preferred translations to top for visibility or sort by language
    return merged.sort((a, b) => a.language_name.localeCompare(b.language_name));
  } catch (error) {
    console.error("Error fetching translations:", error);
    return PREFERRED_TRANSLATIONS as TranslationResource[];
  }
};

export const getVerses = async (
  chapterId: number,
  translationIds: string[] = ["en.sahih"]
): Promise<Verse[]> => {
  try {
    // We fetch Uthmani text + Simple text + requested translations
    // 'quran-simple' provides the standard arabic script (الْحَمْدُ لِلَّهِ)
    // 'quran-uthmani' provides the uthmani script (ٱلْحَمْدُ لِلَّهِ)
    const ids = ["quran-uthmani", "quran-simple", ...translationIds].join(",");
    const response = await fetch(`${BASE_URL}/surah/${chapterId}/editions/${ids}`);

    if (!response.ok) throw new Error("Failed to fetch verses");
    const data = await response.json();

    // data.data is an array of editions
    const editions: EditionResponse[] = Array.isArray(data.data) ? data.data : [data.data];

    const uthmani = editions.find((e) => e.edition?.identifier === "quran-uthmani");
    const simple = editions.find((e) => e.edition?.identifier === "quran-simple");

    if (!uthmani) throw new Error("Uthmani text missing");

    // Fallback to uthmani if simple text is somehow missing
    const simpleEdition = simple || uthmani;

    const translationEditions = editions.filter(
      (e) => e.edition?.identifier !== "quran-uthmani" && e.edition?.identifier !== "quran-simple"
    );

    const hasPrefixedBismillah = chapterId !== 1 && chapterId !== 9;

    const mapped = uthmani.ayahs.map((ayah: AyahResponse, index: number) => {
      const rawUthmani =
        hasPrefixedBismillah && index === 0 ? stripLeadingBismillah(ayah.text) : ayah.text;
      const rawSimple =
        hasPrefixedBismillah && index === 0
          ? stripLeadingBismillah(simpleEdition.ayahs[index].text)
          : simpleEdition.ayahs[index].text;

      return {
        id: ayah.number, // Global ayah number
        verse_key: `${chapterId}:${ayah.numberInSurah}`,
        text_uthmani: sanitizeQuranText(rawUthmani),
        text_simple: sanitizeQuranText(rawSimple),
        translations: translationEditions.map((edition) => {
          // Lookup preferred name logic
          const preferred = PREFERRED_TRANSLATIONS.find(
            (p) => p.id === edition.edition?.identifier
          );
          const resourceName = preferred?.name || edition.edition?.name;

          return {
            id: edition.edition?.identifier,
            resource_id: edition.edition?.identifier,
            text: edition.ayahs[index].text,
            direction: edition.edition?.direction, // Capture direction (rtl/ltr)
            resource_name: resourceName, // Use preferred name if available
          };
        }),
      };
    });

    return mapped.length > 0 ? mapped : FALLBACK_VERSES;
  } catch (error) {
    console.error(error);
    return FALLBACK_VERSES;
  }
};

const verseByKeyCache = new Map<string, Verse>();

/** Fetch a single verse by key (e.g. "27:40") with translations. */
export const getVerseByKey = async (
  verseKey: string,
  translationIds: string[] = ["en.sahih"]
): Promise<Verse | null> => {
  const cacheKey = `${verseKey}|${translationIds.join(",")}`;
  if (verseByKeyCache.has(cacheKey)) return verseByKeyCache.get(cacheKey)!;

  try {
    // API expects global ayah number or "surah:ayah" format
    const ids = ["quran-uthmani", "quran-simple", ...translationIds].join(",");
    const response = await fetch(`${BASE_URL}/ayah/${verseKey}/editions/${ids}`);
    if (!response.ok) return null;

    const data = await response.json();
    const editions: {
      edition?: { identifier: string; name: string; direction?: string };
      text: string;
      numberInSurah: number;
      number: number;
    }[] = Array.isArray(data.data) ? data.data : [data.data];

    const uthmani = editions.find((e) => e.edition?.identifier === "quran-uthmani");
    const simple = editions.find((e) => e.edition?.identifier === "quran-simple");
    if (!uthmani) return null;

    const translationEditions = editions.filter(
      (e) => e.edition?.identifier !== "quran-uthmani" && e.edition?.identifier !== "quran-simple"
    );

    const verse: Verse = {
      id: uthmani.number,
      verse_key: verseKey,
      text_uthmani: sanitizeQuranText(uthmani.text),
      text_simple: sanitizeQuranText((simple || uthmani).text),
      translations: translationEditions.map((e) => {
        const preferred = PREFERRED_TRANSLATIONS.find((p) => p.id === e.edition?.identifier);
        return {
          id: e.edition?.identifier || "",
          resource_id: e.edition?.identifier || "",
          text: e.text,
          direction: e.edition?.direction,
          resource_name: preferred?.name || e.edition?.name,
        };
      }),
    };

    verseByKeyCache.set(cacheKey, verse);
    return verse;
  } catch (error) {
    console.error(`Error fetching verse ${verseKey}:`, error);
    return null;
  }
};

// Remove a leading basmala so we don't duplicate it when we render the header.
// Handles different diacritics/letter shapes from both uthmani and simple scripts.
const stripLeadingBismillah = (text: string): string => {
  if (!text) return text;

  // Allow for arbitrary tashkeel and tatweel between the letters.
  const diacritics = "\\p{Mn}\\u0640"; // marks + tatweel
  const optSpace = `[\\s${diacritics}]*`;
  const basmalaRegex = new RegExp(
    "^" +
      optSpace +
      "ب" +
      optSpace +
      "س" +
      optSpace +
      "م" +
      optSpace +
      "ا?" +
      optSpace +
      "ل" +
      optSpace +
      "ل" +
      optSpace +
      "ه" +
      optSpace + // Allah
      "ا?" +
      optSpace +
      "ل" +
      optSpace +
      "ر" +
      optSpace +
      "ح" +
      optSpace +
      "م" +
      optSpace +
      "ا?" +
      optSpace +
      "ن" +
      optSpace + // الرحمن
      "ا?" +
      optSpace +
      "ل" +
      optSpace +
      "ر" +
      optSpace +
      "ح" +
      optSpace +
      "ي" +
      optSpace +
      "م" +
      optSpace, // الرحيم
    "u"
  );

  const stripped = text.replace(basmalaRegex, "").trim();
  if (stripped.length !== text.trim().length) {
    return stripped;
  }

  // Fallback: normalize aggressively and check again to catch unseen variants
  const normalized = normalizeBasmala(text);
  if (normalized.startsWith("بسم الله الرحمن الرحيم")) {
    // Best effort: drop everything up to and including the last occurrence of "الرحيم"
    const lastIdx = text.lastIndexOf("الرحيم");
    if (lastIdx >= 0) {
      return text.slice(lastIdx + "الرحيم".length).trimStart();
    }
  }

  return text;
};

const normalizeBasmala = (text: string): string => {
  return text
    .normalize("NFKD")
    .replace(/\u0640/g, "") // tatweel
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "") // tashkeel
    .replace(/[ٱإأآ]/g, "ا")
    .replace(/[ىئ]/g, "ي")
    .replace(/[ؤ]/g, "و")
    .replace(/[ة]/g, "ه")
    .replace(/[^ءاأإآابتثجحخدذرزسشصضطظعغفقكلمنهوىي ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

// Helper to construct audio URL using EveryAyah API (remains compatible)
export const getAudioUrl = (reciterId: string, chapterId: number, verseNumber: number): string => {
  const reciter = RECITERS.find((r) => r.id === reciterId) || RECITERS[0];
  const pad = (num: number) => num.toString().padStart(3, "0");
  return `https://everyayah.com/data/${reciter.subfolder}/${pad(chapterId)}${pad(verseNumber)}.mp3`;
};

// Helper to capitalize language codes
function capitalize(s: string) {
  // Map common codes
  const map: Record<string, string> = {
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
  return map[s] || s.charAt(0).toUpperCase() + s.slice(1);
}
