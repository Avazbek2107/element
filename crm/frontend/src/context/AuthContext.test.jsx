import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('../services/api', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
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
    vi.clearAllMocks()
  })

  it('cookie/sessiya bo\'lmasa /me 401 qaytaradi va user null qoladi', async () => {
    authApi.me.mockRejectedValue({ response: { status: 401 } })
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(await screen.findByTestId('loading')).toHaveTextContent('false')
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })

  it('mount bo\'lganda har doim /me chaqiriladi (cookie JS\'dan ko\'rinmasa ham)', async () => {
    authApi.me.mockResolvedValue({ data: { id: 1, username: 'mavjud', role: 'teacher' } })
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(await screen.findByTestId('user')).toHaveTextContent('mavjud')
    expect(authApi.me).toHaveBeenCalledTimes(1)
  })

  it('login() javobidagi userni to\'g\'ridan-to\'g\'ri state\'ga qo\'yadi (tokenlarsiz)', async () => {
    authApi.me.mockRejectedValue({ response: { status: 401 } })
    authApi.login.mockResolvedValue({ data: { id: 1, username: 'admin', role: 'super_admin' } })

    render(<AuthProvider><Probe /></AuthProvider>)
    await screen.findByTestId('user')
    await act(async () => { screen.getByText('login').click() })

    expect(screen.getByTestId('user')).toHaveTextContent('admin')
  })

  it('logout() backend chaqiradi va userni tozalaydi', async () => {
    authApi.me.mockRejectedValue({ response: { status: 401 } })
    authApi.login.mockResolvedValue({ data: { id: 1, username: 'admin', role: 'super_admin' } })
    authApi.logout.mockResolvedValue({})

    render(<AuthProvider><Probe /></AuthProvider>)
    await screen.findByTestId('user')
    await act(async () => { screen.getByText('login').click() })
    await act(async () => { screen.getByText('logout').click() })

    expect(authApi.logout).toHaveBeenCalled()
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })
})

describe('hasPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const setup = async (userData) => {
    authApi.me.mockResolvedValue({ data: userData })
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
