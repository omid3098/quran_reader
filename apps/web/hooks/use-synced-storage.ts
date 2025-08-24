'use client'
import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './use-auth'
import { encrypt, decrypt } from '../lib/crypto'

function sanitize(key: string) {
  return key.replace(/[^a-zA-Z0-9_-]/g, '_')
}

export function useSyncedStorage<T>(key: string, initial: T) {
  const { user } = useAuth()
  const [value, setValue] = useState<T>(initial)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    (async () => {
      let local: { value: T; updatedAt: number } | null = null
      try {
        const raw = localStorage.getItem(key)
        if (raw) {
          const dec = await decrypt(raw)
          local = JSON.parse(dec)
        }
      } catch {
        try {
          const raw = localStorage.getItem(key)
          if (raw) local = { value: JSON.parse(raw), updatedAt: 0 }
        } catch {}
      }
      if (user) {
        const ref = doc(db, 'users', user.uid, 'data', sanitize(key))
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const remote = JSON.parse(await decrypt(snap.data().value))
          local = resolveConflict(key, local, remote)
        }
        if (local) {
          await setDoc(ref, { value: await encrypt(JSON.stringify(local)) })
        }
      }
      if (!local) local = { value: initial, updatedAt: Date.now() }
      setValue(local.value)
      localStorage.setItem(key, await encrypt(JSON.stringify(local)))
      if (key === 'oqr:theme') {
        localStorage.setItem('oqr:theme_plain', String((local.value as any)))
      }
      setReady(true)
    })()
  }, [user, key, initial])

  useEffect(() => {
    if (!ready) return
    ;(async () => {
      const obj = { value, updatedAt: Date.now() }
      localStorage.setItem(key, await encrypt(JSON.stringify(obj)))
      if (key === 'oqr:theme') {
        localStorage.setItem('oqr:theme_plain', String((obj.value as any)))
      }
      if (user) {
        const ref = doc(db, 'users', user.uid, 'data', sanitize(key))
        await setDoc(ref, { value: await encrypt(JSON.stringify(obj)) })
      }
    })()
  }, [value, user, key, ready])

  return [value, setValue] as const
}

function resolveConflict<T>(key: string, local: { value: T; updatedAt: number } | null, remote: { value: T; updatedAt: number }) {
  if (!local) return remote
  if (local.updatedAt === remote.updatedAt || JSON.stringify(local.value) === JSON.stringify(remote.value)) {
    return local.updatedAt >= remote.updatedAt ? local : remote
  }
  const choice = window.prompt(`Conflict for ${key}: type 'local', 'remote', or 'merge'`, 'local')
  if (choice === 'remote') return remote
  if (choice === 'merge') {
    return { value: merge(local.value, remote.value), updatedAt: Date.now() }
  }
  return local
}

function merge(a: any, b: any) {
  if (Array.isArray(a) && Array.isArray(b)) {
    return Array.from(new Set([...a, ...b]))
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    return { ...b, ...a }
  }
  return a
}
