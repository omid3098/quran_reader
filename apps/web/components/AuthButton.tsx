'use client'
import { useAuth } from '../hooks/use-auth'

export function AuthButton() {
  const { user, signIn, signOut } = useAuth()
  return (
    <button onClick={user ? signOut : signIn} style={{ position: 'absolute', top: 8, right: 8 }}>
      {user ? 'Sign out' : 'Sign in with Google'}
    </button>
  )
}
