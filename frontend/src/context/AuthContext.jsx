import { createContext, useContext, useEffect, useState } from 'react'
import * as authService from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('cc_user')
    return cached ? JSON.parse(cached) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    if (!token) {
      setLoading(false)
      return
    }
    authService
      .fetchMe()
      .then((me) => {
        const refreshed = { id: me.id, email: me.email, role: me.role, status: me.status, rejection_reason: me.rejection_reason, full_name: me.profile?.full_name || me.email }
        setUser(refreshed)
        localStorage.setItem('cc_user', JSON.stringify(refreshed))
      })
      .catch(() => {
        localStorage.removeItem('cc_token')
        localStorage.removeItem('cc_user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const data = await authService.login(email, password)
    const nextUser = { id: data.user_id, role: data.role, status: data.status, rejection_reason: data.rejection_reason, full_name: data.full_name, email }
    localStorage.setItem('cc_token', data.access_token)
    localStorage.setItem('cc_user', JSON.stringify(nextUser))
    setUser(nextUser)
    return nextUser
  }

  async function signup(payload) {
    return authService.signup(payload)
  }

  function logout() {
    localStorage.removeItem('cc_token')
    localStorage.removeItem('cc_user')
    setUser(null)
  }

  async function refreshUser() {
    try {
      const me = await authService.fetchMe()
      const refreshed = { id: me.id, email: me.email, role: me.role, status: me.status, rejection_reason: me.rejection_reason, full_name: me.profile?.full_name || me.email }
      setUser(refreshed)
      localStorage.setItem('cc_user', JSON.stringify(refreshed))
      return refreshed
    } catch (err) {
      console.error(err)
      return null
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
