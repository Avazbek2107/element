import { useEffect, useState } from 'react'
import { roomsApi, groupsApi } from '../services/api'
import toast from 'react-hot-toast'
import { ChevronRight, Calendar } from 'lucide-react'

const DAYS     = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const DAY_FULL = ['Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba','Yakshanba']
const DAY_SHORT= ['Du','Se','Ch','Pa','Ju','Sh','Ya']

const START_H = 7
const END_H   = 22
const PX_H    = 60

function timeToNum(s) {
  const [h, m] = (s||'0:0').split(':').map(Number)
  return h + m / 60
}
function getTimeStr(e) {
  if (typeof e === 'string') return e
  return e?.time ?? ''
}
function getRoomId(e) {
  if (e && typeof e === 'object') return e.room_id ?? null
  return null
}

/* ── Sana yordamchilari ── */
function getMondayOf(date) {
  const d = new Date(date)
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}
function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}
function toInputValue(date) {
  return date.toISOString().slice(0, 10)
}
function formatDateShort(date) {
  return date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' })
}
function formatMonthYear(date) {
  return date.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })
}
function isToday(date) {
  const t = new Date()
  return date.getFullYear() === t.getFullYear() &&
    date.getMonth() === t.getMonth() &&
    date.getDate() === t.getDate()
}

/* ── Modal ── */
function RoomModal({ room, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: room?.name ?? '',
    capacity: room?.capacity ?? '',
    description: room?.description ?? '',
  })
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, capacity: form.capacity ? Number(form.capacity) : null }
      room ? await roomsApi.update(room.id, payload) : await roomsApi.create(payload)
      toast.success(room ? "O'quv xona yangilandi" : "O'quv xona qo'shildi")
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Xatolik')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800">{room ? "O'quv xonani tahrirlash" : "Yangi o'quv xona"}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 text-xs">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Xona nomi *</label>
            <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Masalan: 101-xona, Kompyuter xona" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Sig'imi (necha kishi)</label>
            <input type="number" min="1" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="30" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Tavsif</label>
            <textarea rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none"
              placeholder="Qo'shimcha ma'lumot" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Bekor</button>
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Xona kartasi ── */
function RoomCard({ room, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-800">{room.name}</p>
          {room.description && <p className="text-xs text-gray-400 mt-0.5">{room.description}</p>}
        </div>
        {room.capacity && (
          <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium shrink-0">
            {room.capacity} kishi
          </span>
        )}
      </div>
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button onClick={() => onEdit(room)} className="text-blue-600 text-xs hover:underline font-medium">Tahrirlash</button>
        <button onClick={() => onDelete(room.id)} className="text-red-500 text-xs hover:underline">O'chirish</button>
      </div>
    </div>
  )
}

/* ── Xona jadvali ── */
function RoomSchedule({ rooms, groups }) {
  const [weekStart,   setWeekStart]   = useState(() => getMondayOf(new Date()))
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay()
    return d === 0 ? 6 : d - 1
  })

  const hours = []
  for (let h = START_H; h <= END_H; h++) hours.push(h)
  const totalH = (END_H - START_H) * PX_H

  /* Hafta kunlari (7 ta Date) */
  const weekDays = DAYS.map((_, i) => addDays(weekStart, i))

  const dayKey = DAYS[selectedDay]
  const selectedDate = weekDays[selectedDay]

  const sessionsByRoom = {}
  rooms.forEach(r => { sessionsByRoom[r.id] = [] })

  groups.forEach(g => {
    if (!g.schedule || !g.schedule[dayKey]) return
    const entry = g.schedule[dayKey]
    const rid   = getRoomId(entry)
    if (!rid || !sessionsByRoom[rid]) return
    const ts = getTimeStr(entry)
    const [rs, re] = ts.split('-')
    const start = timeToNum(rs)
    const end   = timeToNum(re)
    sessionsByRoom[rid].push({ group: g, start, end, timeStr: ts })
  })

  const goPrev  = () => setWeekStart(d => addDays(d, -7))
  const goNext  = () => setWeekStart(d => addDays(d, 7))
  const goToday = () => { setWeekStart(getMondayOf(new Date())); setSelectedDay(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1) }
  const onDateInput = (e) => {
    if (!e.target.value) return
    const picked = new Date(e.target.value)
    setWeekStart(getMondayOf(picked))
    const dow = picked.getDay()
    setSelectedDay(dow === 0 ? 6 : dow - 1)
  }

  if (rooms.length === 0)
    return <p className="text-center text-gray-400 py-16 text-sm">Hali o'quv xonalar kiritilmagan</p>

  return (
    <div className="flex flex-col gap-4">

      {/* ── Hafta navigatsiyasi ── */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={goPrev}
          className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm">
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>

        <label className="relative cursor-pointer">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 h-8 shadow-sm hover:bg-gray-50 transition-colors">
            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
              {formatDateShort(weekStart)} — {formatDateShort(addDays(weekStart, 6))}
            </span>
            <span className="text-xs text-gray-400 hidden sm:block">{formatMonthYear(weekStart)}</span>
          </div>
          <input
            type="date"
            value={toInputValue(weekStart)}
            onChange={onDateInput}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
          />
        </label>

        <button onClick={goNext}
          className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm">
          <ChevronRight className="w-4 h-4" />
        </button>

        <button onClick={goToday}
          className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 shadow-sm">
          Bugun
        </button>
      </div>

      {/* ── Kun tanlash (sanalar bilan) ── */}
      <div className="flex gap-1.5 flex-wrap">
        {weekDays.map((date, i) => {
          const today = isToday(date)
          const active = selectedDay === i
          return (
            <button key={i} onClick={() => setSelectedDay(i)}
              className={`flex flex-col items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-w-[48px] ${
                active
                  ? 'bg-blue-600 text-white'
                  : today
                    ? 'bg-blue-50 border border-blue-200 text-blue-600'
                    : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}>
              <span>{DAY_SHORT[i]}</span>
              <span className={`text-xs font-normal mt-0.5 ${active ? 'text-blue-100' : today ? 'text-blue-400' : 'text-gray-400'}`}>
                {formatDateShort(date)}
              </span>
            </button>
          )
        })}
        <span className="ml-2 text-sm font-medium text-gray-600 self-center">
          {DAY_FULL[selectedDay]}, {selectedDate.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* ── Grid: xonalar × vaqt ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-auto">
        <div style={{ minWidth: `${200 + rooms.length * 140}px` }}>
          {/* Xona sarlavhalari */}
          <div className="flex border-b border-gray-100 sticky top-0 bg-white z-10">
            <div className="w-16 shrink-0 border-r border-gray-100" />
            {rooms.map(r => (
              <div key={r.id} className="flex-1 min-w-[130px] py-3 px-2 text-center border-r border-gray-100 last:border-r-0">
                <p className="text-xs font-semibold text-gray-700">{r.name}</p>
                {r.capacity && <p className="text-xs text-gray-400">{r.capacity} kishi</p>}
              </div>
            ))}
          </div>

          {/* Vaqt qatorlari */}
          <div className="flex" style={{ height: `${totalH}px` }}>
            {/* Soat ustuni */}
            <div className="w-16 shrink-0 relative border-r border-gray-100">
              {hours.map(h => (
                <div key={h} className="absolute w-full flex items-start justify-end pr-2"
                  style={{ top: `${(h - START_H) * PX_H - 7}px` }}>
                  <span className="text-xs text-gray-300 font-mono">{String(h).padStart(2,'0')}:00</span>
                </div>
              ))}
            </div>

            {/* Xona ustunlari */}
            {rooms.map(r => {
              const sessions = sessionsByRoom[r.id] || []
              return (
                <div key={r.id} className="flex-1 min-w-[130px] relative border-r border-gray-100 last:border-r-0">
                  {hours.map(h => (
                    <div key={h} className="absolute w-full border-t border-gray-100"
                      style={{ top: `${(h - START_H) * PX_H}px` }} />
                  ))}
                  {/* Yarim soat chiziqlari */}
                  {hours.slice(0, -1).map(h => (
                    <div key={`h${h}`} className="absolute w-full border-t border-dashed border-gray-50"
                      style={{ top: `${(h - START_H) * PX_H + PX_H / 2}px` }} />
                  ))}
                  {/* Bugungi vaqt chizig'i */}
                  {isToday(selectedDate) && (() => {
                    const now = new Date()
                    const cur = now.getHours() + now.getMinutes() / 60
                    if (cur < START_H || cur > END_H) return null
                    return (
                      <div className="absolute w-full flex items-center z-10 pointer-events-none"
                        style={{ top: `${(cur - START_H) * PX_H}px` }}>
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
                        <div className="flex-1 border-t-2 border-red-400 border-dashed" />
                      </div>
                    )
                  })()}
                  {/* Darslar */}
                  {sessions.map((s, si) => {
                    const top    = (s.start - START_H) * PX_H
                    const height = Math.max((s.end - s.start) * PX_H - 4, 24)
                    return (
                      <div key={si}
                        className="absolute left-1 right-1 bg-blue-100 border border-blue-300 rounded-lg px-2 py-1 overflow-hidden"
                        style={{ top: `${top}px`, height: `${height}px` }}>
                        <p className="text-xs font-semibold text-blue-800 truncate">{s.group.name}</p>
                        {height > 36 && <p className="text-xs text-blue-600 opacity-80">{s.timeStr}</p>}
                        {height > 52 && s.group.teacher_name && (
                          <p className="text-xs text-blue-500 opacity-70 truncate">{s.group.teacher_name}</p>
                        )}
                      </div>
                    )
                  })}
                  {sessions.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs text-gray-200">Bo'sh</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Asosiy sahifa ── */
export default function Rooms() {
  const [rooms,  setRooms]  = useState([])
  const [groups, setGroups] = useState([])
  const [modal,  setModal]  = useState(null)
  const [tab,    setTab]    = useState('list')

  const loadRooms  = () => roomsApi.list().then(({ data }) => setRooms(data)).catch(() => {})
  const loadGroups = () => groupsApi.list().then(({ data }) => setGroups(data)).catch(() => {})

  useEffect(() => { loadRooms(); loadGroups() }, [])

  const handleDelete = async (id) => {
    if (!confirm("O'quv xonani o'chirishni tasdiqlaysizmi?")) return
    try {
      await roomsApi.delete(id)
      toast.success("O'quv xona o'chirildi")
      loadRooms()
    } catch { toast.error('Xatolik') }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Sarlavha */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">O'quv xona</h1>
        {tab === 'list' && (
          <button onClick={() => setModal('create')}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700 font-medium">
            + Qo'shish
          </button>
        )}
      </div>

      {/* Tablar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[['list',"O'quv xonalar ro'yxati"],['schedule','Dars jadvali']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'list' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rooms.map(r => (
              <RoomCard key={r.id} room={r}
                onEdit={r => setModal(r)}
                onDelete={handleDelete} />
            ))}
            {rooms.length === 0 && (
              <p className="col-span-4 text-center text-gray-400 py-16 text-sm">Hali o'quv xonalar kiritilmagan</p>
            )}
          </div>
        </>
      ) : (
        <RoomSchedule rooms={rooms} groups={groups} />
      )}

      {modal !== null && (
        <RoomModal
          room={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadRooms() }}
        />
      )}
    </div>
  )
}
