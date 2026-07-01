import { useEffect, useState, useCallback } from 'react'
import { assessmentsApi, groupsApi, studentsApi } from '../services/api'
import toast from 'react-hot-toast'
import { Clock, BarChart2, Send, ClipboardList, CheckCircle2, FlaskConical, Star } from 'lucide-react'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function pct(correct, total) {
  if (!total || total === 0) return null
  return Math.round((correct / total) * 100)
}

function Badge({ value, total, color }) {
  if (value === '' || value === null || value === undefined) return <span className="text-gray-300 text-xs">—</span>
  const p = pct(Number(value), Number(total))
  const colors = {
    blue:   'bg-blue-100 text-blue-700',
    green:  'bg-green-100 text-green-700',
    orange: 'bg-orange-100 text-orange-700',
  }
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${colors[color]}`}>
      {p !== null ? `${p}%` : '—'}
    </span>
  )
}

/* ── Jadval modal ── */
function ScheduleModal({ groupId, onClose }) {
  const [hour,   setHour]   = useState(20)
  const [minute, setMinute] = useState(0)
  const [active, setActive] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    assessmentsApi.getSchedule(groupId)
      .then(({ data }) => {
        setHour(data.send_hour)
        setMinute(data.send_minute)
        setActive(data.is_active)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [groupId])

  const handleSave = async () => {
    setSaving(true)
    try {
      await assessmentsApi.setSchedule({ group_id: groupId, send_hour: hour, send_minute: minute, is_active: active })
      toast.success('Jadval saqlandi')
      onClose()
    } catch {
      toast.error('Xatolik')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Jadvalni o'chirishni tasdiqlaysizmi?")) return
    try {
      await assessmentsApi.deleteSchedule(groupId)
      toast.success("Jadval o'chirildi")
      onClose()
    } catch {
      toast.error('Xatolik')
    }
  }

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const mins  = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Avtomatik hisobot jadvali</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <p className="text-xs text-gray-500 bg-blue-50 rounded-xl p-3">
          Har kuni tanlangan vaqtda guruh o'quvchilarining bugungi baholash natijalari
          ota-onalariga Telegram orqali avtomatik yuboriladi.
        </p>

        {!loaded ? (
          <p className="text-center text-gray-400 text-sm py-4">Yuklanmoqda...</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Soat</label>
                <select
                  value={hour}
                  onChange={e => setHour(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {hours.map(h => (
                    <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Daqiqa</label>
                <select
                  value={minute}
                  onChange={e => setMinute(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {mins.map(m => (
                    <option key={m} value={m}>:{String(m).padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-center text-sm font-semibold text-blue-600 bg-blue-50 rounded-xl py-2">
              Har kuni soat {String(hour).padStart(2,'0')}:{String(minute).padStart(2,'0')} da
            </p>

            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setActive(v => !v)}
                className={`w-10 h-6 rounded-full relative transition-colors ${active ? 'bg-blue-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm text-gray-700">{active ? 'Faol' : 'O\'chirilgan'}</span>
            </label>

            <div className="flex gap-3 pt-1">
              <button onClick={handleDelete}
                className="border border-red-200 text-red-500 rounded-xl py-2.5 px-4 text-sm hover:bg-red-50">
                O'chirish
              </button>
              <button onClick={onClose}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                Bekor
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Asosiy sahifa ── */
export default function Assessments() {
  const [groups,      setGroups]      = useState([])
  const [groupId,     setGroupId]     = useState('')
  const [date,        setDate]        = useState(today())
  const [students,    setStudents]    = useState([])
  const [saved,       setSaved]       = useState({})   // student_id → AssessmentOut
  const [form,        setForm]        = useState({})   // student_id → {qa_c,qa_t,test_c,test_t,act,note}
  const [loading,     setLoading]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [sending,     setSending]     = useState(false)
  const [showSched,   setShowSched]   = useState(false)

  useEffect(() => {
    groupsApi.list().then(({ data }) => setGroups(data)).catch(() => {})
  }, [])

  const loadStudents = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    try {
      const { data: studsData } = await studentsApi.list({ group_id: groupId, limit: 200 })
      const studs = studsData.items ?? []
      setStudents(studs)

      const { data: recs } = await assessmentsApi.list({ group_id: groupId, date })
      const savedMap = {}
      recs.forEach(r => { savedMap[r.student_id] = r })
      setSaved(savedMap)

      const initial = {}
      studs.forEach(s => {
        const ex = savedMap[s.id]
        initial[s.id] = {
          qa_c:  ex?.qa_correct     ?? '',
          qa_t:  ex?.qa_total       ?? '',
          test_c: ex?.test_correct  ?? '',
          test_t: ex?.test_total    ?? '',
          act:   ex?.activity_score ?? '',
          note:  ex?.note           ?? '',
        }
      })
      setForm(initial)
    } catch {
      toast.error('Yuklab bo\'lmadi')
    } finally {
      setLoading(false)
    }
  }, [groupId, date])

  useEffect(() => { loadStudents() }, [loadStudents])

  const setField = (studentId, field, value) =>
    setForm(f => ({ ...f, [studentId]: { ...f[studentId], [field]: value } }))

  const handleSave = async (sendNow = false) => {
    if (!groupId) return
    setSaving(true)
    if (sendNow) setSending(true)
    try {
      const items = students.map(s => {
        const f = form[s.id] || {}
        return {
          student_id:     s.id,
          qa_correct:     f.qa_c  !== '' ? Number(f.qa_c)  : null,
          qa_total:       f.qa_t  !== '' ? Number(f.qa_t)  : null,
          test_correct:   f.test_c !== '' ? Number(f.test_c) : null,
          test_total:     f.test_t !== '' ? Number(f.test_t) : null,
          activity_score: f.act   !== '' ? Number(f.act)   : null,
          note:           f.note  || null,
        }
      })
      const { data } = await assessmentsApi.bulkSave(
        { group_id: Number(groupId), date, items },
        sendNow,
      )
      if (sendNow) {
        toast.success(`Saqlandi va ${data.sent} ta ota-onaga yuborildi`)
      } else {
        toast.success('Baholash saqlandi')
      }
      loadStudents()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Xatolik')
    } finally {
      setSaving(false)
      setSending(false)
    }
  }

  const handleSendOnly = async () => {
    if (!groupId) return
    setSending(true)
    try {
      const { data } = await assessmentsApi.sendReport(groupId, date)
      toast.success(`${data.sent} ta ota-onaga Telegram xabari yuborildi`)
    } catch {
      toast.error('Yuborishda xatolik')
    } finally {
      setSending(false)
    }
  }

  const selectedGroup = groups.find(g => String(g.id) === String(groupId))

  return (
    <div className="space-y-5">
      {/* ── Sarlavha ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Kunlik baholash</h1>
        {groupId && (
          <button
            onClick={() => setShowSched(true)}
            className="flex items-center gap-2 border border-blue-200 text-blue-600 px-4 py-2 rounded-xl text-sm hover:bg-blue-50"
          >
            <Clock className="w-4 h-4" />
            Avtomatik jadval
          </button>
        )}
      </div>

      {/* ── Filtrlar ── */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <select
          value={groupId}
          onChange={e => setGroupId(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 min-w-[180px]"
        >
          <option value="">Guruhni tanlang</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>

        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />

        <button
          onClick={() => setDate(today())}
          className="text-sm text-blue-600 border border-blue-200 px-3 py-2 rounded-xl hover:bg-blue-50"
        >
          Bugun
        </button>
      </div>

      {/* ── Tushuntirish ── */}
      {!groupId && (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
          <div className="flex justify-center mb-3">
            <BarChart2 className="w-14 h-14 text-gray-200" />
          </div>
          <p className="font-medium">Guruhni tanlang</p>
          <p className="text-sm mt-1">Keyin o'quvchilar ro'yxati chiqadi</p>
        </div>
      )}

      {/* ── O'quvchilar jadvali ── */}
      {groupId && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Jadval boshi */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">{selectedGroup?.name}</p>
              <p className="text-xs text-gray-400">{date} · {students.length} ta o'quvchi</p>
            </div>
          </div>

          {loading ? (
            <p className="text-center text-gray-400 py-16 text-sm">Yuklanmoqda...</p>
          ) : students.length === 0 ? (
            <p className="text-center text-gray-400 py-16 text-sm">Bu guruhda o'quvchilar yo'q</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="text-left px-5 py-3 w-10">#</th>
                    <th className="text-left px-5 py-3">O'quvchi</th>
                    <th className="text-center px-3 py-3 bg-blue-50" colSpan={2}>
                      <span className="text-blue-600 flex items-center justify-center gap-1"><ClipboardList className="w-3.5 h-3.5" />Savol-javob</span>
                    </th>
                    <th className="text-center px-3 py-3 bg-green-50" colSpan={2}>
                      <span className="text-green-600 flex items-center justify-center gap-1"><FlaskConical className="w-3.5 h-3.5" />Test</span>
                    </th>
                    <th className="text-center px-3 py-3 bg-orange-50">
                      <span className="text-orange-600 flex items-center justify-center gap-1"><Star className="w-3.5 h-3.5" />Faollik</span>
                    </th>
                    <th className="text-left px-3 py-3">Izoh</th>
                    <th className="text-center px-3 py-3">Natija</th>
                  </tr>
                  <tr className="border-t border-gray-100">
                    <th></th>
                    <th></th>
                    <th className="text-center px-2 py-1.5 bg-blue-50 text-[10px] font-normal text-blue-500">To'g'ri</th>
                    <th className="text-center px-2 py-1.5 bg-blue-50 text-[10px] font-normal text-blue-500">Jami</th>
                    <th className="text-center px-2 py-1.5 bg-green-50 text-[10px] font-normal text-green-500">To'g'ri</th>
                    <th className="text-center px-2 py-1.5 bg-green-50 text-[10px] font-normal text-green-500">Jami</th>
                    <th className="text-center px-2 py-1.5 bg-orange-50 text-[10px] font-normal text-orange-500">/10</th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((s, i) => {
                    const f = form[s.id] || {}
                    const hasSaved = !!saved[s.id]
                    return (
                      <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${hasSaved ? '' : ''}`}>
                        <td className="px-5 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                              {(s.first_name || '?')[0]}
                            </div>
                            <span className="font-medium text-gray-800 whitespace-nowrap">
                              {s.first_name} {s.last_name}
                            </span>
                          </div>
                        </td>

                        {/* Savol-javob */}
                        <td className="px-2 py-2 bg-blue-50/40">
                          <input
                            type="number" min="0"
                            value={f.qa_c ?? ''}
                            onChange={e => setField(s.id, 'qa_c', e.target.value)}
                            placeholder="0"
                            className="w-16 border border-blue-200 rounded-lg px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </td>
                        <td className="px-2 py-2 bg-blue-50/40">
                          <input
                            type="number" min="0"
                            value={f.qa_t ?? ''}
                            onChange={e => setField(s.id, 'qa_t', e.target.value)}
                            placeholder="20"
                            className="w-16 border border-blue-200 rounded-lg px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </td>

                        {/* Test */}
                        <td className="px-2 py-2 bg-green-50/40">
                          <input
                            type="number" min="0"
                            value={f.test_c ?? ''}
                            onChange={e => setField(s.id, 'test_c', e.target.value)}
                            placeholder="0"
                            className="w-16 border border-green-200 rounded-lg px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                          />
                        </td>
                        <td className="px-2 py-2 bg-green-50/40">
                          <input
                            type="number" min="0"
                            value={f.test_t ?? ''}
                            onChange={e => setField(s.id, 'test_t', e.target.value)}
                            placeholder="16"
                            className="w-16 border border-green-200 rounded-lg px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                          />
                        </td>

                        {/* Faollik */}
                        <td className="px-2 py-2 bg-orange-50/40">
                          <input
                            type="number" min="0" max="10"
                            value={f.act ?? ''}
                            onChange={e => setField(s.id, 'act', e.target.value)}
                            placeholder="10"
                            className="w-16 border border-orange-200 rounded-lg px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                          />
                        </td>

                        {/* Izoh */}
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={f.note ?? ''}
                            onChange={e => setField(s.id, 'note', e.target.value)}
                            placeholder="ixtiyoriy..."
                            className="w-32 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300"
                          />
                        </td>

                        {/* Foiz ko'rsatkichlari */}
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-0.5 items-center">
                            <Badge value={f.qa_c} total={f.qa_t} color="blue" />
                            <Badge value={f.test_c} total={f.test_t} color="green" />
                            <Badge value={f.act !== '' ? f.act : null} total={f.act !== '' ? 10 : null} color="orange" />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Harakatlar ── */}
          {students.length > 0 && (
            <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap gap-3 items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs text-gray-400">
                {Object.keys(saved).length > 0
                  ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /><span className="text-green-600">{Object.keys(saved).length} ta o'quvchi saqlangan</span></>
                  : "Hali saqlanmagan"}
              </p>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleSendOnly}
                  disabled={sending || Object.keys(saved).length === 0}
                  className="flex items-center gap-2 border border-sky-300 text-sky-600 px-4 py-2 rounded-xl text-sm hover:bg-sky-50 disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                  Telegram yuborish
                </button>

                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>

                <button
                  onClick={() => handleSave(true)}
                  disabled={saving || sending}
                  className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {sending ? 'Yuborilmoqda...' : 'Saqlash + Telegram yuborish'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showSched && groupId && (
        <ScheduleModal
          groupId={Number(groupId)}
          onClose={() => setShowSched(false)}
        />
      )}
    </div>
  )
}
