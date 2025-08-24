'use client'

function decodeBase64(str: string) {
  if (typeof window === 'undefined') return new Uint8Array(Buffer.from(str, 'base64'))
  return Uint8Array.from(atob(str), c => c.charCodeAt(0))
}

const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
const subtle = cryptoObj?.subtle

if (!subtle) {
  console.warn('Web Crypto API unavailable; synced data will be stored in plain text')
}

const keyPromise = subtle
  ? (async () => {
      const base64 = process.env.NEXT_PUBLIC_ENCRYPTION_KEY
      let raw: Uint8Array
      if (base64) {
        try {
          raw = decodeBase64(base64)
          if (raw.length !== 16) throw new Error('expected 16 bytes')
        } catch {
          console.warn('Invalid NEXT_PUBLIC_ENCRYPTION_KEY, generating a random key')
          raw = cryptoObj!.getRandomValues(new Uint8Array(16))
        }
      } else {
        raw = cryptoObj!.getRandomValues(new Uint8Array(16))
      }
      return subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
    })()
  : null

export async function encrypt(text: string) {
  if (!subtle || !keyPromise) return text
  const key = await keyPromise
  const iv = cryptoObj!.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(text)
  const cipher = await subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const bytes = new Uint8Array(iv.length + cipher.byteLength)
  bytes.set(iv, 0)
  bytes.set(new Uint8Array(cipher), iv.length)
  return btoa(String.fromCharCode(...bytes))
}

export async function decrypt(payload: string) {
  if (!subtle || !keyPromise) return payload
  const data = Uint8Array.from(atob(payload), c => c.charCodeAt(0))
  const iv = data.slice(0, 12)
  const cipher = data.slice(12)
  const key = await keyPromise
  const plain = await subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
  return new TextDecoder().decode(plain)
}
