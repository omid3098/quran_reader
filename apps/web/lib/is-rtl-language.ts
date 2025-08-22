export function isRtlLanguage(lang: string | undefined): boolean {
  const rtlLangs = new Set(['ar', 'fa', 'ur', 'he', 'ps', 'sd', 'ug', 'ku', 'yi'])
  return !!lang && rtlLangs.has(lang.toLowerCase())
}
