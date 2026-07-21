import { useEffect, useState } from 'react'
import { twoFaApi } from '../services/api'
import toast from 'react-hot-toast'
import { ShieldCheck, ShieldOff, Copy } from 'lucide-react'

export default function Security() {
  const [enabled,  setEnabled]  = useState(null)
  const [loading,  setLoading]  = useState(true)

  const [setupData, setSetupData] = useState(null) // { secret, qr_code, otpauth_uri }
  const [confirmCode, setConfirmCode] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [backupCodes, setBackupCodes] = useState(null)
  const [acknowledged, setAcknowledged] = useState(false)

  const [disableCode, setDisableCode] = useState('')
  const [showDisable, setShowDisable] = useState(false)
  const [disabling, setDisabling] = useState(false)

  const loadStatus = () => {
    setLoading(true)
    twoFaApi.status()
      .then(({ data }) => setEnabled(data.enabled))
      .catch(() => toast.error("Holatni yuklab bo'lmadi"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadStatus() }, [])

  const startSetup = async () => {
    try {
      const { data } = await twoFaApi.setup()
      setSetupData(data)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Xatolik')
    }
  }

  const handleConfirm = async (e) => {
    e.preventDefault()
    setConfirming(true)
    try {
      const { data } = await twoFaApi.confirm(confirmCode)
      setBackupCodes(data.backup_codes)
      setSetupData(null)
      setConfirmCode('')
      setEnabled(true)
    } catch (e) {
      toast.error(e.response?.data?.detail || "Kod noto'g'ri")
    } finally {
      setConfirming(false)
    }
  }

  const finishAfterBackupCodes = () => {
    setBackupCodes(null)
    setAcknowledged(false)
    toast.success('2FA yoqildi')
  }

  const handleDisable = async (e) => {
    e.preventDefault()
    setDisabling(true)
    try {
      await twoFaApi.disable(disableCode)
      toast.success("2FA o'chirildi")
      setEnabled(false)
      setShowDisable(false)
      setDisableCode('')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Xatolik')
    } finally {
      setDisabling(false)
    }
  }

  const copySecret = () => {
    navigator.clipboard.writeText(setupData.secret)
    toast.success('Nusxalandi')
  }

  if (loading) return <div className="text-gray-400 text-sm py-10 text-center">Yuklanmoqda...</div>

  return (
    <div className="max-w-lg space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">Xavfsizlik</h1>

      {/* ── Backup kodlar (faqat bir marta ko'rsatiladi) ── */}
      {backupCodes && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
          <p className="text-sm font-semibold text-amber-800">
            Zaxira kodlarni saqlab qo'ying — bu ro'yxat qayta ko'rsatilmaydi!
          </p>
          <p className="text-xs text-amber-700">
            Telefoningiz yo'qolsa, har bir kodni bir marta ishlatib tizimga kirishingiz mumkin.
          </p>
          <div className="grid grid-cols-2 gap-2 bg-white rounded-xl p-3 font-mono text-sm">
            {backupCodes.map((c) => <div key={c} className="text-gray-700">{c}</div>)}
          </div>
          <label className="flex items-center gap-2 text-xs text-amber-800">
            <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
            Kodlarni xavfsiz joyga saqladim
          </label>
          <button
            onClick={finishAfterBackupCodes}
            disabled={!acknowledged}
            className="w-full bg-amber-600 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-40"
          >
            Davom etish
          </button>
        </div>
      )}

      {/* ── Holat kartasi ── */}
      {!backupCodes && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              {enabled ? <ShieldCheck className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-semibold text-gray-800">Ikki bosqichli autentifikatsiya (2FA)</p>
              <p className="text-xs text-gray-400">
                {enabled ? "Yoqilgan — login paytida qo'shimcha kod so'raladi" : "O'chirilgan"}
              </p>
            </div>
          </div>

          {!enabled && !setupData && (
            <button
              onClick={startSetup}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700"
            >
              2FA yoqish
            </button>
          )}

          {enabled && !showDisable && (
            <button
              onClick={() => setShowDisable(true)}
              className="mt-4 border border-red-200 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-50"
            >
              2FA o'chirish
            </button>
          )}

          {showDisable && (
            <form onSubmit={handleDisable} className="mt-4 space-y-2">
              <p className="text-xs text-gray-500">Tasdiqlash uchun joriy 6 xonali kod yoki parolingizni kiriting</p>
              <input
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                placeholder="000000 yoki parol"
                required
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowDisable(false)}
                  className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-600">
                  Bekor
                </button>
                <button type="submit" disabled={disabling}
                  className="flex-1 bg-red-600 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50">
                  {disabling ? "O'chirilmoqda..." : "O'chirish"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Sozlash oqimi ── */}
      {!backupCodes && setupData && (
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-700">1. QR kodni skanerlang</p>
          <div className="flex justify-center">
            <img src={setupData.qr_code} alt="2FA QR kod" className="w-48 h-48 border border-gray-100 rounded-xl" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Yoki qo'lda kiriting:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono truncate">
                {setupData.secret}
              </code>
              <button onClick={copySecret} className="text-blue-600 hover:text-blue-800">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-sm font-semibold text-gray-700 pt-2">2. Ilovadagi 6 xonali kodni kiriting</p>
          <form onSubmit={handleConfirm} className="flex gap-2">
            <input
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="000000"
              maxLength={6}
              required
            />
            <button type="submit" disabled={confirming}
              className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {confirming ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
            </button>
          </form>
          <button onClick={() => setSetupData(null)} className="text-xs text-gray-400 hover:text-gray-600">
            Bekor qilish
          </button>
        </div>
      )}
    </div>
  )
}
