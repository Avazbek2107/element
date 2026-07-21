import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [code, setCode] = useState('')
  const [tempToken, setTempToken] = useState('')
  const [step, setStep] = useState('credentials') // 'credentials' | 'code'
  const [loading, setLoading] = useState(false)
  const { login, verify2fa } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await login(form.username, form.password)
      if (result?.requires_2fa) {
        setTempToken(result.temp_token)
        setStep('code')
      } else {
        navigate('/')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await verify2fa(tempToken, code)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || "Kod noto'g'ri")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm border border-gray-100">

        {/* Logo markazda */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo.jpg"
            alt="Element"
            style={{ width: 110, height: 110, objectFit: 'contain', borderRadius: 20 }}
          />
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.1em', color: '#111', marginTop: 8 }}>
            element
          </span>
          <span style={{ fontSize: 11, letterSpacing: '0.22em', color: '#aaa', textTransform: 'uppercase', marginTop: 2 }}>
            O'quv markazi
          </span>
        </div>

        {step === 'credentials' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Login yoki Email
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                placeholder="username yoki email"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Parol
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: '#16c94e' }}
            >
              {loading ? 'Kirilmoqda...' : 'Kirish'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Autentifikatsiya ilovasidagi 6 xonali kodni (yoki zaxira kodni) kiriting
            </p>
            <div>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-center tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                placeholder="000000"
                maxLength={20}
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: '#16c94e' }}
            >
              {loading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('credentials'); setCode('') }}
              className="w-full text-xs text-gray-400 hover:text-gray-600"
            >
              ← Orqaga
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
