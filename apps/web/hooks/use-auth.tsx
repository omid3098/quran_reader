'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { auth, provider } from '../lib/firebase'
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth'

interface AuthContextValue {
  user: User | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  signIn: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  useEffect(() => {
    return onAuthStateChanged(auth, setUser)
  }, [])
  const signIn = () => signInWithPopup(auth, provider).then(() => {})
  const signOutUser = () => signOut(auth)
  return (
    <AuthContext.Provider value={{ user, signIn, signOut: signOutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
