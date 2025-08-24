'use client'

function decodeBase64(str: string) {
  if (typeof window === 'undefined') return new Uint8Array(Buffer.from(str, 'base64'))
  return Uint8Array.from(atob(str), c => c.charCodeAt(0))
}

const keyPromise = (async () => {
  const base64 = process.env.NEXT_PUBLIC_ENCRYPTION_KEY
  let raw: Uint8Array
  if (base64) {
    try {
      raw = decodeBase64(base64)
      if (raw.length !== 16) throw new Error('expected 16 bytes')
    } catch {
      console.warn('Invalid NEXT_PUBLIC_ENCRYPTION_KEY, generating a random key')
      raw = crypto.getRandomValues(new Uint8Array(16))
    }
  } else {
    raw = crypto.getRandomValues(new Uint8Array(16))
  }
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
})()

export async function encrypt(text: string) {
  const key = await keyPromise
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(text)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const bytes = new Uint8Array(iv.length + cipher.byteLength)
  bytes.set(iv, 0)
  bytes.set(new Uint8Array(cipher), iv.length)
  return btoa(String.fromCharCode(...bytes))
}

export async function decrypt(payload: string) {
  const data = Uint8Array.from(atob(payload), c => c.charCodeAt(0))
  const iv = data.slice(0, 12)
  const cipher = data.slice(12)
  const key = await keyPromise
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
  return new TextDecoder().decode(plain)
}
