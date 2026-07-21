import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('../services/api', () => ({
  authApi: {
    login: vi.fn(),
    me: vi.fn(),
  },
}))

import { authApi } from '../services/api'

function Probe() {
  const { user, loading, login, logout, hasPermission } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.username : 'none'}</span>
      <span data-testid="perm-payments">{String(hasPermission('payments'))}</span>
      <button onClick={() => login('admin', 'parol')}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('token bo\'lmasa loading darhol false bo\'ladi va user null qoladi', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(await screen.findByTestId('loading')).toHaveTextContent('false')
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })

  it('login() tokenlarni saqlaydi va userni o\'rnatadi', async () => {
    authApi.login.mockResolvedValue({ data: { access_token: 'a1', refresh_token: 'r1' } })
    authApi.me.mockResolvedValue({ data: { id: 1, username: 'admin', role: 'super_admin' } })

    render(<AuthProvider><Probe /></AuthProvider>)
    await act(async () => { screen.getByText('login').click() })

    expect(localStorage.getItem('access_token')).toBe('a1')
    expect(localStorage.getItem('refresh_token')).toBe('r1')
    expect(screen.getByTestId('user')).toHaveTextContent('admin')
  })

  it('logout() localStorage va userni tozalaydi', async () => {
    authApi.login.mockResolvedValue({ data: { access_token: 'a1', refresh_token: 'r1' } })
    authApi.me.mockResolvedValue({ data: { id: 1, username: 'admin', role: 'super_admin' } })

    render(<AuthProvider><Probe /></AuthProvider>)
    await act(async () => { screen.getByText('login').click() })
    await act(async () => { screen.getByText('logout').click() })

    expect(localStorage.getItem('access_token')).toBeNull()
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })
})

describe('hasPermission', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  const setup = async (userData) => {
    authApi.me.mockResolvedValue({ data: userData })
    localStorage.setItem('access_token', 'existing')
    render(<AuthProvider><Probe /></AuthProvider>)
    await screen.findByTestId('user')
  }

  it("super_admin har doim ruxsatga ega", async () => {
    await setup({ id: 1, username: 'sa', role: 'super_admin', permissions: [] })
    expect(screen.getByTestId('perm-payments')).toHaveTextContent('true')
  })

  it("admin uchun permissions=null bo'lsa hamma narsaga ruxsat bor", async () => {
    await setup({ id: 2, username: 'ad', role: 'admin', permissions: null })
    expect(screen.getByTestId('perm-payments')).toHaveTextContent('true')
  })

  it("admin uchun ro'yxatda bo'lmagan modul rad etiladi", async () => {
    await setup({ id: 3, username: 'ad2', role: 'admin', permissions: ['students'] })
    expect(screen.getByTestId('perm-payments')).toHaveTextContent('false')
  })

  it("teacher uchun standart holatda ruxsat bor (cheklov faqat admin uchun)", async () => {
    await setup({ id: 4, username: 'te', role: 'teacher', permissions: null })
    expect(screen.getByTestId('perm-payments')).toHaveTextContent('true')
  })
})
