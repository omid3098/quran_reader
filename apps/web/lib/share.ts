export function encodeSharePayload(obj: any): string | null {
  try {
    const json = JSON.stringify(obj)
    return btoa(unescape(encodeURIComponent(json))).replace(/=/g, '')
  } catch {
    return null
  }
}

export function decodeSharePayload(s: string): any | null {
  try {
    const json = decodeURIComponent(escape(atob(s)))
    return JSON.parse(json)
  } catch {
    return null
  }
}
