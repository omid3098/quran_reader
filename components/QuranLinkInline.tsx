/* eslint-disable @typescript-eslint/no-explicit-any */
import { PartialBlock } from "@blocknote/core";
import { createReactInlineContentSpec } from "@blocknote/react";
import { createContext, useContext } from "react";
import { BookOpen } from "lucide-react";

// Chapter names for lookup (simplified list - can be expanded)
const SURAH_NAMES: Record<string, number> = {
  "al-fatiha": 1,
  fatiha: 1,
  "al-baqarah": 2,
  baqarah: 2,
  "ali-imran": 3,
  "ali imran": 3,
  "an-nisa": 4,
  nisa: 4,
  "al-maidah": 5,
  maidah: 5,
  "al-anam": 6,
  anam: 6,
  "al-araf": 7,
  araf: 7,
  "al-anfal": 8,
  anfal: 8,
  "at-tawbah": 9,
  tawbah: 9,
  yunus: 10,
  hud: 11,
  yusuf: 12,
  "ar-rad": 13,
  ibrahim: 14,
  "al-hijr": 15,
  "an-nahl": 16,
  "al-isra": 17,
  isra: 17,
  "al-kahf": 18,
  kahf: 18,
  maryam: 19,
  taha: 20,
  "al-anbiya": 21,
  "al-hajj": 22,
  "al-muminun": 23,
  "an-nur": 24,
  "al-furqan": 25,
  "ash-shuara": 26,
  "an-naml": 27,
  "al-qasas": 28,
  "al-ankabut": 29,
  "ar-rum": 30,
  luqman: 31,
  "as-sajdah": 32,
  "al-ahzab": 33,
  saba: 34,
  fatir: 35,
  "ya-sin": 36,
  yasin: 36,
  "as-saffat": 37,
  sad: 38,
  "az-zumar": 39,
  ghafir: 40,
  fussilat: 41,
  "ash-shura": 42,
  "az-zukhruf": 43,
  "ad-dukhan": 44,
  "al-jathiyah": 45,
  "al-ahqaf": 46,
  muhammad: 47,
  "al-fath": 48,
  "al-hujurat": 49,
  qaf: 50,
  "adh-dhariyat": 51,
  "at-tur": 52,
  "an-najm": 53,
  "al-qamar": 54,
  "ar-rahman": 55,
  "al-waqiah": 56,
  "al-hadid": 57,
  "al-mujadila": 58,
  "al-hashr": 59,
  "al-mumtahina": 60,
  "as-saff": 61,
  "al-jumuah": 62,
  "al-munafiqun": 63,
  "at-taghabun": 64,
  "at-talaq": 65,
  "at-tahrim": 66,
  "al-mulk": 67,
  "al-qalam": 68,
  "al-haqqah": 69,
  "al-maarij": 70,
  nuh: 71,
  "al-jinn": 72,
  "al-muzzammil": 73,
  "al-muddaththir": 74,
  "al-qiyamah": 75,
  "al-insan": 76,
  "al-mursalat": 77,
  "an-naba": 78,
  "an-naziat": 79,
  abasa: 80,
  "at-takwir": 81,
  "al-infitar": 82,
  "al-mutaffifin": 83,
  "al-inshiqaq": 84,
  "al-buruj": 85,
  "at-tariq": 86,
  "al-ala": 87,
  "al-ghashiyah": 88,
  "al-fajr": 89,
  "al-balad": 90,
  "ash-shams": 91,
  "al-layl": 92,
  "ad-duha": 93,
  "ash-sharh": 94,
  "at-tin": 95,
  "al-alaq": 96,
  "al-qadr": 97,
  "al-bayyinah": 98,
  "az-zalzalah": 99,
  "al-adiyat": 100,
  "al-qariah": 101,
  "at-takathur": 102,
  "al-asr": 103,
  "al-humazah": 104,
  "al-fil": 105,
  quraysh: 106,
  "al-maun": 107,
  "al-kawthar": 108,
  "al-kafirun": 109,
  "an-nasr": 110,
  "al-masad": 111,
  "al-ikhlas": 112,
  "al-falaq": 113,
  "an-nas": 114,
};

// Build a human-friendly Surah name from a slug (e.g., "al-baqarah" -> "Al-Baqarah")
function formatSurahName(slug: string): string {
  return slug
    .split(/(\s|-)/)
    .map((part) => {
      if (part === " " || part === "-") return part;
      if (!part) return "";
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("")
    .trim();
}

// Fallback map of surahId -> display name for tooltips
const SURAH_ID_TO_NAME: Record<number, string> = Object.entries(SURAH_NAMES).reduce(
  (acc, [name, id]) => {
    if (!acc[id]) {
      acc[id] = formatSurahName(name);
    }
    return acc;
  },
  {} as Record<number, string>
);

// Context for navigation handler
interface QuranLinkContextType {
  onNavigate?: (surahId: number, verseNumber?: number) => void;
  getSurahName?: (surahId: number) => string | undefined;
}

const QuranLinkContext = createContext<QuranLinkContextType>({});

// Matches Quran references inside square brackets, e.g. [2:255] or [Al-Baqarah:255]
const QURAN_LINK_PATTERN = /\[\s*((?:[A-Za-z\s-]+|\d{1,3})(?::\d{1,3})?)\s*\]/g;

type InlineContentNode = any;
const QURAN_LINK_TEST = /\[\s*((?:[A-Za-z\s-]+|\d{1,3})(?::\d{1,3})?)\s*\]/;

// Parse a quran reference like "2:255", "Al-Baqarah:255", "2", or "Al-Baqarah"
export function parseQuranReference(ref: string): {
  surahId: number | null;
  verseNumber: number | null;
  displayText: string;
} {
  const trimmed = ref.trim();

  // Pattern: number:number (e.g., "2:255")
  const numericMatch = trimmed.match(/^(\d+)(?::(\d+))?$/);
  if (numericMatch) {
    const surahId = parseInt(numericMatch[1], 10);
    const verseNumber = numericMatch[2] ? parseInt(numericMatch[2], 10) : null;
    if (surahId >= 1 && surahId <= 114) {
      return {
        surahId,
        verseNumber,
        displayText: verseNumber ? `${surahId}:${verseNumber}` : `Surah ${surahId}`,
      };
    }
  }

  // Pattern: name:number or just name (e.g., "Al-Baqarah:255" or "Al-Baqarah")
  const nameMatch = trimmed.match(/^([a-zA-Z\-\s]+)(?::(\d+))?$/);
  if (nameMatch) {
    const name = nameMatch[1].toLowerCase().trim();
    const verseNumber = nameMatch[2] ? parseInt(nameMatch[2], 10) : null;
    const surahId = SURAH_NAMES[name];
    if (surahId) {
      return {
        surahId,
        verseNumber,
        displayText: verseNumber ? `${nameMatch[1].trim()}:${verseNumber}` : nameMatch[1].trim(),
      };
    }
  }

  return { surahId: null, verseNumber: null, displayText: trimmed };
}

// Build tooltip text for Quran links with best-known surah name and verse number
export function getQuranLinkTooltip(
  surahId: number | null,
  verseNumber: number | null,
  reference: string,
  customLookup?: (surahId: number) => string | undefined
): string {
  if (!surahId) {
    return `Invalid reference: ${reference}`;
  }

  const surahName = customLookup?.(surahId) ?? SURAH_ID_TO_NAME[surahId] ?? `Surah ${surahId}`;

  if (verseNumber) {
    return `Go to ${surahName}, verse ${verseNumber}`;
  }

  return `Go to ${surahName}`;
}

// Component for rendering Quran links
function QuranLinkComponent({ reference }: { reference: string }) {
  const { onNavigate, getSurahName } = useContext(QuranLinkContext);
  const parsed = parseQuranReference(reference);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (parsed.surahId && onNavigate) {
      onNavigate(parsed.surahId, parsed.verseNumber ?? undefined);
    }
  };

  const isValid = parsed.surahId !== null;
  const tooltip = getQuranLinkTooltip(parsed.surahId, parsed.verseNumber, reference, getSurahName);

  return (
    <span
      className={`quran-link inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium cursor-pointer transition-colors ${
        isValid
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      }`}
      style={{ fontSize: "inherit", verticalAlign: "middle" }}
      onClick={handleClick}
      title={tooltip}
    >
      <BookOpen size="1em" style={{ flexShrink: 0 }} />
      <span style={{ lineHeight: 1 }}>{parsed.displayText}</span>
    </span>
  );
}

// Custom inline content spec for Quran links
export const quranLinkSpec = createReactInlineContentSpec(
  {
    type: "quranLink",
    propSchema: {
      reference: {
        default: "",
      },
    },
    content: "none",
  },
  {
    render: (props) => <QuranLinkComponent reference={props.inlineContent.props.reference} />,
  }
);

// Export context provider for use in RichNoteEditor
export const QuranLink = {
  Provider: QuranLinkContext.Provider,
  parse: parseQuranReference,
};

// Convert inline text segments like "[2:3]" into Quran link inline nodes
function splitTextWithQuranLinks(
  text: string,
  base?: Extract<InlineContentNode, { styles?: unknown }>
) {
  if (!text) return [];

  // Fast path: nothing to convert, keep original shape
  if (!QURAN_LINK_TEST.test(text)) {
    const textNode: InlineContentNode =
      base && typeof base === "object" && "styles" in base && base.styles
        ? { type: "text", text, styles: base.styles }
        : { type: "text", text };
    return [textNode];
  }

  const parts: InlineContentNode[] = [];
  let lastIndex = 0;

  const pushText = (segment: string) => {
    if (!segment) return;
    const textNode: InlineContentNode =
      base && typeof base === "object" && "styles" in base && base.styles
        ? { type: "text", text: segment, styles: base.styles }
        : { type: "text", text: segment };
    parts.push(textNode);
  };

  text.replace(QURAN_LINK_PATTERN, (match, reference, offset) => {
    if (offset > lastIndex) {
      pushText(text.slice(lastIndex, offset));
    }

    parts.push({
      type: "quranLink" as const,
      props: { reference: reference.trim() },
    });

    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < text.length) {
    pushText(text.slice(lastIndex));
  }

  return parts;
}

// Normalize blocks to ensure Quran references are rendered as inline quranLink nodes
export function normalizeQuranLinkBlocks(blocks: PartialBlock[]): PartialBlock[] {
  return blocks.map((block) => {
    const normalizedBlock: PartialBlock = { ...block };

    if (block.content !== undefined) {
      const contentArray = Array.isArray(block.content) ? block.content : [block.content];
      const normalizedContent: InlineContentNode[] = [];
      let needsProcessing = false;

      contentArray.forEach((item) => {
        if (typeof item === "string") {
          const segments = splitTextWithQuranLinks(item);
          if (segments.length === 1 && segments[0]?.text === item) {
            normalizedContent.push(item);
            return;
          }
          needsProcessing = true;
          normalizedContent.push(...segments);
          return;
        }

        if (item?.type === "quranLink") {
          normalizedContent.push(item);
          needsProcessing = true;
          return;
        }

        if (typeof item === "object" && "text" in item && typeof item.text === "string") {
          const segments = splitTextWithQuranLinks(item.text, item);
          if (segments.length === 1 && "text" in segments[0] && segments[0]?.text === item.text) {
            normalizedContent.push(item);
            return;
          }
          needsProcessing = true;
          normalizedContent.push(...segments);
          return;
        }

        normalizedContent.push(item);
      });

      if (needsProcessing) {
        normalizedBlock.content = normalizedContent as PartialBlock["content"];
      } else {
        normalizedBlock.content = block.content;
      }
    }

    if (block.children) {
      normalizedBlock.children = normalizeQuranLinkBlocks(block.children);
    }

    return normalizedBlock;
  });
}
