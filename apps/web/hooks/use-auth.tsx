'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { auth, provider } from '../lib/firebase'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  User,
} from 'firebase/auth'

interface AuthContextValue {
  user: User | null
  signInGoogle: () => Promise<void>
  signInEmail: (email: string, password: string) => Promise<void>
  registerEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  signInGoogle: async () => {},
  signInEmail: async () => {},
  registerEmail: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  useEffect(() => {
    return onAuthStateChanged(auth, setUser)
  }, [])
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) setUser(result.user)
      })
      .catch(() => {})
  }, [])
  const signInGoogle = async () => {
    try {
      await signInWithPopup(auth, provider)
    } catch (e: any) {
      if (
        e.code === 'auth/operation-not-supported-in-this-environment' ||
        e.code === 'auth/popup-blocked'
      ) {
        await signInWithRedirect(auth, provider)
      } else {
        throw e
      }
    }
  }
  const signInEmail = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password).then(() => {})
  const registerEmail = (email: string, password: string) =>
    createUserWithEmailAndPassword(auth, email, password).then(() => {})
  const signOutUser = () => signOut(auth)
  return (
    <AuthContext.Provider
      value={{ user, signInGoogle, signInEmail, registerEmail, signOut: signOutUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
