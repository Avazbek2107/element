import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Token httpOnly cookie'da — JS'dan ko'rinmaydi, shuning uchun har doim
    // /me so'rovini yuborib ko'ramiz; cookie mavjud bo'lsa server useri qaytaradi.
    authApi.me()
      .then(({ data }) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    const { data: me } = await authApi.login({ username, password })
    setUser(me)
    return me
  }

  const logout = async () => {
    try { await authApi.logout() } catch { /* baribir tozalaymiz */ }
    setUser(null)
  }

  const hasPermission = (module) => {
    if (!user) return false
    if (user.role === 'super_admin') return true
    if (user.role === 'admin') {
      if (!user.permissions || user.permissions.length === 0) return true
      return user.permissions.includes(module)
    }
    return true
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
