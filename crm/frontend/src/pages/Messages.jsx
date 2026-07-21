import { useEffect, useState } from 'react'
import { messagesApi } from '../services/api'
import toast from 'react-hot-toast'
import { MessageSquare, X, User as UserIcon } from 'lucide-react'

const ROLE_LABELS = { super_admin: 'Super admin', admin: 'Admin', teacher: "O'qituvchi" }

function ComposeModal({ onClose, onSent }) {
  const [recipients, setRecipients] = useState([])
  const [recipientId, setRecipientId] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    messagesApi.recipients().then(({ data }) => setRecipients(data)).catch(() => {})
  }, [])

  const handleSend = async () => {
    if (!recipientId) { toast.error('Qabul qiluvchini tanlang'); return }
    if (!body.trim()) { toast.error('Xabar matnini kiriting'); return }
    setSending(true)
    try {
      await messagesApi.sendInternal({ recipient_user_id: Number(recipientId), body: body.trim() })
      toast.success('Xabar yuborildi')
      onSent()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Xatolik')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Yangi xabar</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Kimga</label>
          <select
            value={recipientId}
            onChange={e => setRecipientId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Tanlang...</option>
            {recipients.map(r => (
              <option key={r.id} value={r.id}>{r.name} — {ROLE_LABELS[r.role] || r.role}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Xabar</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={4}
            placeholder="Xabaringizni yozing..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
            Bekor
          </button>
          <button onClick={handleSend} disabled={sending}
            className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {sending ? 'Yuborilmoqda...' : 'Yuborish'}
          </button>
        </div>
      </div>
    </div>
  )
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function Messages() {
  const [msgs,    setMsgs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)

  const load = () => {
    setLoading(true)
    messagesApi.inbox()
      .then(({ data }) => setMsgs(data))
      .catch(() => toast.error("Yuklab bo'lmadi"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleOpen = async (m) => {
    if (!m.is_read) {
      try {
        await messagesApi.markRead(m.id)
        setMsgs(prev => prev.map(x => x.id === m.id ? { ...x, is_read: true } : x))
      } catch { /* jim */ }
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Xabarlar</h1>
        <button
          onClick={() => setShowCompose(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700"
        >
          + Yangi xabar
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-center text-gray-400 py-16 text-sm">Yuklanmoqda...</p>
        ) : msgs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <MessageSquare className="w-14 h-14 text-gray-200 mb-3" />
            <p className="text-sm font-medium">Hozircha xabar yo'q</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {msgs.map(m => (
              <li
                key={m.id}
                onClick={() => handleOpen(m)}
                className={`px-5 py-4 flex items-start gap-3 cursor-pointer transition-colors hover:bg-gray-50 ${!m.is_read ? 'bg-blue-50/40' : ''}`}
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${!m.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {m.sender_name || "Noma'lum"}
                    </span>
                    {!m.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap">{m.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{fmtDate(m.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showCompose && (
        <ComposeModal onClose={() => setShowCompose(false)} onSent={load} />
      )}
    </div>
  )
}
