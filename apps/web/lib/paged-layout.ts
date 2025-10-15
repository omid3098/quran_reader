export type PagedVerseInput = {
  ayah: number;
  text: string;
  bismillah?: string;
};

export type PagedToken = {
  text: string;
  ayah: number;
  isMarker: boolean;
};

export type PagedLine = {
  tokens: PagedToken[];
  ayahs: number[];
};

export type PagedPage = {
  index: number;
  lines: PagedLine[];
  firstAyah: number;
};

export const LINE_WIDTH_BOUNDS = { min: 20, max: 200 } as const;
export const PAGE_LENGTH_BOUNDS = { min: 5, max: 40 } as const;

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (min > max) return min;
  return Math.min(Math.max(value, min), max);
}

export function sanitizeLineWidth(value: number): number {
  const rounded = Math.round(value);
  return clampNumber(Number.isNaN(rounded) ? LINE_WIDTH_BOUNDS.min : rounded, LINE_WIDTH_BOUNDS.min, LINE_WIDTH_BOUNDS.max);
}

export function sanitizePageLength(value: number): number {
  const rounded = Math.round(value);
  return clampNumber(Number.isNaN(rounded) ? PAGE_LENGTH_BOUNDS.min : rounded, PAGE_LENGTH_BOUNDS.min, PAGE_LENGTH_BOUNDS.max);
}

export function clampPageNumber(page: number, totalPages: number): number {
  if (totalPages <= 0) return 1;
  const rounded = Math.round(page);
  const base = Number.isFinite(rounded) ? rounded : 1;
  return clampNumber(base, 1, totalPages);
}

function pushLine(target: PagedLine[], tokens: PagedToken[]) {
  if (!tokens.length) return;
  const ayahs = Array.from(new Set(tokens.map((t) => t.ayah)));
  target.push({ tokens, ayahs });
}

export function buildPagedPages(
  verses: PagedVerseInput[],
  lineWidth: number,
  pageLength: number,
): PagedPage[] {
  if (!verses.length) return [];

  const width = sanitizeLineWidth(lineWidth);
  const linesPerPage = sanitizePageLength(pageLength);

  const tokens: PagedToken[] = [];
  for (const verse of verses) {
    const trimmedText = (verse.text || '').trim();
    if (verse.ayah === 1 && verse.bismillah && !trimmedText.startsWith(verse.bismillah)) {
      const bism = verse.bismillah.trim();
      if (bism) tokens.push({ text: bism, ayah: verse.ayah, isMarker: false });
    }
    const words = trimmedText ? trimmedText.split(/\s+/).filter(Boolean) : [];
    for (const word of words) tokens.push({ text: word, ayah: verse.ayah, isMarker: false });
    tokens.push({ text: `﴿${verse.ayah}﴾`, ayah: verse.ayah, isMarker: true });
  }

  if (!tokens.length) return [];

  const lines: PagedLine[] = [];
  let current: PagedToken[] = [];
  let currentLength = 0;

  const commit = () => {
    if (!current.length) return;
    pushLine(lines, current);
    current = [];
    currentLength = 0;
  };

  for (const token of tokens) {
    if (current.length === 0) {
      current.push(token);
      currentLength = token.text.length;
      if (token.text.length >= width) {
        commit();
      }
      continue;
    }

    const extraSpace = 1;
    const nextLength = currentLength + extraSpace + token.text.length;
    if (nextLength > width) {
      commit();
      current.push(token);
      currentLength = token.text.length;
      if (token.text.length >= width) {
        commit();
      }
      continue;
    }

    current.push(token);
    currentLength += extraSpace + token.text.length;
  }

  commit();

  if (!lines.length) return [];

  const pages: PagedPage[] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    const slice = lines.slice(i, i + linesPerPage);
    if (!slice.length) continue;
    const firstAyah = slice[0]?.ayahs[0] ?? verses[0]?.ayah ?? 1;
    pages.push({ index: pages.length + 1, lines: slice, firstAyah });
  }

  return pages;
}

export function resolvePagePair(params: {
  totalPages: number;
  rightPage: number;
  leftManualPage: number;
  twoPageView: boolean;
  syncPages: boolean;
}): { rightPage: number; leftPage: number | null } {
  const { totalPages, rightPage, leftManualPage, twoPageView, syncPages } = params;
  if (totalPages <= 0) return { rightPage: 1, leftPage: null };
  const right = clampPageNumber(rightPage, totalPages);
  if (!twoPageView) return { rightPage: right, leftPage: null };
  if (syncPages) {
    const next = right + 1;
    return { rightPage: right, leftPage: next <= totalPages ? next : null };
  }
  const left = clampPageNumber(leftManualPage, totalPages);
  return { rightPage: right, leftPage: left };
}

export function resolveLeftPageSelection(params: {
  totalPages: number;
  selectedPage: number;
  syncPages: boolean;
}): { rightPage: number; manualLeftPage: number | null } {
  const { totalPages, selectedPage, syncPages } = params;
  if (totalPages <= 0) {
    return { rightPage: 1, manualLeftPage: syncPages ? null : 1 };
  }
  const nextRight = clampPageNumber(selectedPage, totalPages);
  if (syncPages) {
    return { rightPage: nextRight, manualLeftPage: null };
  }
  return { rightPage: nextRight, manualLeftPage: nextRight };
}
