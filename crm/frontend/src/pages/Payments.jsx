import { useEffect, useState, useCallback } from 'react'
import { paymentsApi, groupsApi } from '../services/api'
import toast from 'react-hot-toast'
import { Banknote, CheckCircle2, Clock, XCircle, Plus, Pencil, Trash2 } from 'lucide-react'

const MONTHS = [
  'Yanvar','Fevral','Mart','Aprel','May','Iyun',
  'Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr',
]

const STATUS_LABELS = { paid: "To'langan", partial: 'Qisman', pending: 'Kutilmoqda' }
const STATUS_COLORS = {
  paid:    'bg-green-100 text-green-700',
  partial: 'bg-amber-100 text-amber-700',
  pending: 'bg-red-100 text-red-600',
}

function fmt(n) {
  return Number(n).toLocaleString('uz-UZ')
}

/* ── Guruh uchun to'lov yaratish modal ── */
function BulkModal({ groups, month, year, onClose, onDone }) {
  const [groupId, setGroupId] = useState('')
  const [amount,  setAmount]  = useState('')
  const [saving,  setSaving]  = useState(false)

  const handleSave = async () => {
    if (!groupId) { toast.error('Guruh tanlang'); return }
    if (!amount || Number(amount) <= 0) { toast.error("To'lov miqdorini kiriting"); return }
    setSaving(true)
    try {
      const { data } = await paymentsApi.bulk({ group_id: Number(groupId), amount: Number(amount), month, year })
      toast.success(`${data.created} ta to'lov yaratildi${data.skipped ? `, ${data.skipped} ta o'tkazib yuborildi` : ''}`)
      onDone()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Xatolik')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Guruh to'lovini yaratish</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <p className="text-xs text-gray-500 bg-blue-50 rounded-xl p-3">
          Tanlangan guruhning barcha o'quvchilari uchun <b>{MONTHS[month-1]} {year}</b> oyi uchun to'lov yozuvi yaratiladi.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Guruh *</label>
            <select
              value={groupId}
              onChange={e => setGroupId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Guruhni tanlang</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To'lov miqdori (so'm) *</label>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Masalan: 500000"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
            Bekor
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Yaratilmoqda...' : 'Yaratish'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── To'lovni tahrirlash modal ── */
function PayModal({ payment, onClose, onDone }) {
  const [paidAmount, setPaidAmount] = useState(String(payment.paid_amount || ''))
  const [note,       setNote]       = useState(payment.note || '')
  const [saving,     setSaving]     = useState(false)

  const handleSave = async () => {
    const val = Number(paidAmount)
    if (isNaN(val) || val < 0) { toast.error("Miqdor noto'g'ri"); return }
    setSaving(true)
    try {
      await paymentsApi.update(payment.id, { paid_amount: val, note: note || null })
      toast.success("To'lov yangilandi")
      onDone()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Xatolik')
    } finally {
      setSaving(false)
    }
  }

  const handleFullPay = async () => {
    setSaving(true)
    try {
      await paymentsApi.update(payment.id, { status: 'paid', paid_amount: payment.amount, note: note || null })
      toast.success("To'liq to'landi ✓")
      onDone()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Xatolik')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-800">To'lov kiritish</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 text-sm">
          <p className="font-medium text-gray-800">{payment.student_name}</p>
          <p className="text-gray-500 text-xs mt-0.5">{payment.group_name}</p>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Umumiy summa:</span>
            <span className="font-semibold text-gray-700">{fmt(payment.amount)} so'm</span>
          </div>
          {payment.paid_amount > 0 && (
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>Oldin to'langan:</span>
              <span className="font-semibold text-green-600">{fmt(payment.paid_amount)} so'm</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To'langan miqdor (so'm)</label>
            <input
              type="number"
              min="0"
              max={payment.amount}
              value={paidAmount}
              onChange={e => setPaidAmount(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Izoh</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ixtiyoriy..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <button
          onClick={handleFullPay}
          disabled={saving}
          className="w-full bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
        >
          To'liq to'landi ({fmt(payment.amount)} so'm)
        </button>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
            Bekor
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Asosiy sahifa ── */
export default function Payments() {
  const now = new Date()
  const [month,     setMonth]     = useState(now.getMonth() + 1)
  const [year,      setYear]      = useState(now.getFullYear())
  const [payments,  setPayments]  = useState([])
  const [summary,   setSummary]   = useState(null)
  const [groups,    setGroups]    = useState([])
  const [groupId,   setGroupId]   = useState('')
  const [statusF,   setStatusF]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [showBulk,  setShowBulk]  = useState(false)
  const [payModal,  setPayModal]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { month, year }
      if (groupId) params.group_id = groupId
      if (statusF) params.status   = statusF
      const [{ data: p }, { data: s }] = await Promise.all([
        paymentsApi.list(params),
        paymentsApi.summary({ month, year, ...(groupId ? { group_id: groupId } : {}) }),
      ])
      setPayments(p)
      setSummary(s)
    } catch {
      toast.error('Yuklab bo\'lmadi')
    } finally {
      setLoading(false)
    }
  }, [month, year, groupId, statusF])

  useEffect(() => {
    groupsApi.list().then(({ data }) => setGroups(data)).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return
    try {
      await paymentsApi.delete(id)
      toast.success("O'chirildi")
      load()
    } catch {
      toast.error('Xatolik')
    }
  }

  const years = []
  for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 1; y++) years.push(y)

  return (
    <div className="space-y-5">
      {/* ── Sarlavha ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">To'lovlar</h1>
        <button
          onClick={() => setShowBulk(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700"
        >
          + Guruh to'lovini yaratish
        </button>
      </div>

      {/* ── Filtrlar ── */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <select
          value={groupId}
          onChange={e => setGroupId(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">Barcha guruhlar</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>

        <select
          value={statusF}
          onChange={e => setStatusF(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">Barcha holatlar</option>
          <option value="pending">Kutilmoqda</option>
          <option value="partial">Qisman</option>
          <option value="paid">To'langan</option>
        </select>
      </div>

      {/* ── Umumiy statistika ── */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Jami to\'lov', value: fmt(summary.total_amount) + ' so\'m', sub: `${summary.total_students} ta`, color: 'from-blue-500 to-blue-600' },
            { label: 'To\'langan',   value: fmt(summary.collected)    + ' so\'m', sub: `${summary.paid} ta`,           color: 'from-green-500 to-green-600' },
            { label: 'Qolgan qarzdorlik', value: fmt(summary.remaining) + ' so\'m', sub: `${summary.pending + summary.partial} ta`, color: 'from-red-500 to-red-600' },
            { label: 'Qisman to\'langan', value: summary.partial + ' ta', sub: 'qisman', color: 'from-amber-500 to-amber-600' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} shrink-0`} />
              <div className="min-w-0">
                <p className="text-xs text-gray-400 truncate">{c.label}</p>
                <p className="text-lg font-bold text-gray-800 leading-tight truncate">{c.value}</p>
                <p className="text-xs text-gray-400">{c.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── To'lovlar jadvali ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-center text-gray-400 py-16 text-sm">Yuklanmoqda...</p>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Banknote className="w-14 h-14 text-gray-200 mb-3" />
            <p className="text-sm font-medium">To'lovlar topilmadi</p>
            <p className="text-xs mt-1">Guruh to'lovini yaratish tugmasini bosing</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-5 py-3">O'quvchi</th>
                  <th className="text-left px-5 py-3">Guruh</th>
                  <th className="text-right px-5 py-3">Summa</th>
                  <th className="text-right px-5 py-3">To'langan</th>
                  <th className="text-center px-5 py-3">Holat</th>
                  <th className="text-left px-5 py-3">Sana</th>
                  <th className="text-left px-5 py-3">Izoh</th>
                  <th className="text-right px-5 py-3">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 group transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-medium text-gray-800">{p.student_name}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{p.group_name || '—'}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-700">{fmt(p.amount)}</td>
                    <td className="px-5 py-3 text-right font-mono">
                      <span className={p.paid_amount > 0 ? 'text-green-600 font-semibold' : 'text-gray-300'}>
                        {fmt(p.paid_amount)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[p.status]}`}>
                        {STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {p.payment_date || '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs max-w-[140px] truncate">
                      {p.note || '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        {p.status !== 'paid' && (
                          <button
                            onClick={() => setPayModal(p)}
                            className="text-blue-600 text-xs hover:underline font-medium whitespace-nowrap"
                          >
                            To'lov kiritish
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-red-500 text-xs hover:underline"
                        >
                          O'chirish
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t text-xs text-gray-400 flex justify-between">
              <span>Jami: {payments.length} ta yozuv</span>
              {summary && (
                <span className="font-medium">
                  To'langan: <span className="text-green-600">{fmt(summary.collected)}</span> / {fmt(summary.total_amount)} so'm
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {showBulk && (
        <BulkModal
          groups={groups}
          month={month}
          year={year}
          onClose={() => setShowBulk(false)}
          onDone={load}
        />
      )}

      {payModal && (
        <PayModal
          payment={payModal}
          onClose={() => setPayModal(null)}
          onDone={load}
        />
      )}
    </div>
  )
}
