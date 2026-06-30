import { useEffect, useState, useRef } from 'react'
import { groupsApi, roomsApi } from '../services/api'

/* ── Konstantalar ── */
const DAY_KEYS  = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABEL = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba']

const START_HOUR  = 7
const END_HOUR    = 22
const PX_PER_HOUR = 72

const COLORS = [
  { bg: 'bg-blue-100',    border: 'border-blue-300',    text: 'text-blue-800',    dot: 'bg-blue-500',    active: 'bg-blue-500 text-white border-blue-500'    },
  { bg: 'bg-violet-100',  border: 'border-violet-300',  text: 'text-violet-800',  dot: 'bg-violet-500',  active: 'bg-violet-500 text-white border-violet-500'  },
  { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', dot: 'bg-emerald-500', active: 'bg-emerald-500 text-white border-emerald-500' },
  { bg: 'bg-orange-100',  border: 'border-orange-300',  text: 'text-orange-800',  dot: 'bg-orange-500',  active: 'bg-orange-500 text-white border-orange-500'  },
  { bg: 'bg-rose-100',    border: 'border-rose-300',    text: 'text-rose-800',    dot: 'bg-rose-500',    active: 'bg-rose-500 text-white border-rose-500'      },
  { bg: 'bg-teal-100',    border: 'border-teal-300',    text: 'text-teal-800',    dot: 'bg-teal-500',    active: 'bg-teal-500 text-white border-teal-500'      },
  { bg: 'bg-amber-100',   border: 'border-amber-300',   text: 'text-amber-800',   dot: 'bg-amber-500',   active: 'bg-amber-500 text-white border-amber-500'    },
  { bg: 'bg-cyan-100',    border: 'border-cyan-300',    text: 'text-cyan-800',    dot: 'bg-cyan-500',    active: 'bg-cyan-500 text-white border-cyan-500'      },
  { bg: 'bg-pink-100',    border: 'border-pink-300',    text: 'text-pink-800',    dot: 'bg-pink-500',    active: 'bg-pink-500 text-white border-pink-500'      },
  { bg: 'bg-indigo-100',  border: 'border-indigo-300',  text: 'text-indigo-800',  dot: 'bg-indigo-500',  active: 'bg-indigo-500 text-white border-indigo-500'  },
]

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

/* ── Schedule entry yordamchilari ── */
function getTimeStr(entry) {
  if (typeof entry === 'string') return entry
  if (entry && typeof entry === 'object') return entry.time ?? ''
  return ''
}

function getRoomId(entry) {
  if (entry && typeof entry === 'object') return entry.room_id ?? null
  return null
}

/* ── Vaqt yordamchilari ── */
function parseTime(str) {
  const [h, m] = (str || '0:0').split(':').map(Number)
  return h + m / 60
}

function formatTime(dec) {
  const h = Math.floor(dec)
  const m = Math.round((dec - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/* ── Tooltip ── */
function SessionTooltip({ s, onClose }) {
  return (
    <div
      className="absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-100 p-3.5 w-52"
      style={{ top: '110%', left: '50%', transform: 'translateX(-50%)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={onClose} className="absolute top-2 right-2 text-gray-300 hover:text-gray-500 text-xs leading-none">✕</button>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.color.dot}`} />
        <p className="font-semibold text-gray-800 text-sm leading-tight">{s.name}</p>
      </div>
      {s.teacher && (
        <p className="text-xs text-gray-500 mb-1">👤 {s.teacher}</p>
      )}
      <p className="text-xs text-gray-500 mb-1">
        🕐 {formatTime(s.start)} — {formatTime(s.end)}
        <span className="ml-1 text-gray-400">({Math.round((s.end - s.start) * 60)} min)</span>
      </p>
      <p className="text-xs text-gray-500">👥 {s.studentCount} o'quvchi</p>
      {s.roomName && <p className="text-xs text-gray-500 mt-1">🚪 {s.roomName}</p>}
    </div>
  )
}

/* ── Sessiya kartochkasi ── */
function SessionCard({ s }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  const top    = (s.start - START_HOUR) * PX_PER_HOUR
  const height = Math.max((s.end - s.start) * PX_PER_HOUR - 4, 22)
  const short  = height < 46

  useEffect(() => {
    if (!open) return
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  return (
    <div
      ref={ref}
      onClick={() => setOpen((v) => !v)}
      className={`absolute left-1 right-1 rounded-lg border cursor-pointer select-none
        hover:brightness-95 transition-all ${s.color.bg} ${s.color.border} ${s.color.text}`}
      style={{ top: `${top}px`, height: `${height}px` }}
    >
      <div className="px-2 py-1 h-full overflow-hidden">
        <p className="text-xs font-semibold leading-tight truncate">{s.name}</p>
        {!short && (
          <p className="text-xs opacity-70 truncate mt-0.5">{formatTime(s.start)}–{formatTime(s.end)}</p>
        )}
        {!short && s.teacher && (
          <p className="text-xs opacity-55 truncate">{s.teacher}</p>
        )}
      </div>
      {open && <SessionTooltip s={s} onClose={() => setOpen(false)} />}
    </div>
  )
}

/* ── Asosiy sahifa ── */
export default function Timetable() {
  const [groups,        setGroups]        = useState([])
  const [rooms,         setRooms]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [weekStart,     setWeekStart]     = useState(() => getMondayOf(new Date()))
  const [selectedGroup, setSelectedGroup] = useState('')

  useEffect(() => {
    Promise.all([groupsApi.list(), roomsApi.list()])
      .then(([{ data: g }, { data: r }]) => { setGroups(g); setRooms(r) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const roomName = (rid) => rid ? (rooms.find(r => r.id === rid)?.name ?? null) : null

  const colorOf = (idx) => COLORS[idx % COLORS.length]

  /* Hafta kunlari (7 ta Date) */
  const weekDays = DAY_KEYS.map((_, i) => addDays(weekStart, i))

  /* Sessiyalar ro'yxati */
  const sessions = []
  groups.forEach((g, gi) => {
    if (!g.schedule) return
    if (selectedGroup && String(g.id) !== String(selectedGroup)) return
    DAY_KEYS.forEach((day, di) => {
      const raw = g.schedule[day]
      if (!raw) return
      const ts = getTimeStr(raw)
      const [rs, re] = ts.split('-')
      const start = parseTime(rs)
      const end   = parseTime(re)
      if (isNaN(start) || isNaN(end) || end <= start) return
      const rid = getRoomId(raw)
      sessions.push({
        id: `${g.id}-${day}`,
        name: g.name,
        teacher: g.teacher_name || null,
        studentCount: g.student_count,
        start, end, dayIdx: di,
        color: colorOf(gi),
        roomName: roomName(rid),
      })
    })
  })

  /* Hafta navigatsiyasi */
  const goPrev  = () => setWeekStart((d) => addDays(d, -7))
  const goNext  = () => setWeekStart((d) => addDays(d, 7))
  const goToday = () => setWeekStart(getMondayOf(new Date()))

  const onDateInput = (e) => {
    if (!e.target.value) return
    setWeekStart(getMondayOf(new Date(e.target.value)))
  }

  /* Soat qatorlari */
  const hours = []
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h)
  const totalHeight = (END_HOUR - START_HOUR) * PX_PER_HOUR

  const noSchedule = groups.filter((g) => !g.schedule || Object.keys(g.schedule).length === 0)

  if (loading) return <div className="text-gray-400 text-sm py-10 text-center">Yuklanmoqda...</div>

  return (
    <div className="flex flex-col gap-4">

      {/* ── Sarlavha + sana navigatsiyasi ── */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-gray-800">Dars Jadvali</h1>

        {/* Navigatsiya */}
        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          {/* Sana input */}
          <label className="relative cursor-pointer">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 h-8 shadow-sm hover:bg-gray-50 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-gray-400 shrink-0">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                {formatDateShort(weekStart)} — {formatDateShort(addDays(weekStart, 6))}
              </span>
              <span className="text-xs text-gray-400 hidden sm:block">
                {formatMonthYear(weekStart)}
              </span>
            </div>
            <input
              type="date"
              value={toInputValue(weekStart)}
              onChange={onDateInput}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
            />
          </label>

          <button
            onClick={goNext}
            className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {/* Bugun */}
        <button
          onClick={goToday}
          className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 shadow-sm"
        >
          Bugun
        </button>
      </div>

      {/* ── Guruhlar dropdown filter ── */}
      {groups.length > 0 && (
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[180px]"
        >
          <option value="">Barcha guruhlar</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.student_count} o'quvchi)
            </option>
          ))}
        </select>
      )}

      {/* ── Jadval ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-auto">
        <div style={{ minWidth: '640px' }}>

          {/* Kun sarlavhalari */}
          <div className="grid border-b border-gray-100 sticky top-0 bg-white z-20"
            style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
            <div className="border-r border-gray-100" />
            {weekDays.map((date, di) => {
              const today = isToday(date)
              return (
                <div key={di} className={`py-2.5 border-r border-gray-100 last:border-r-0 text-center ${today ? 'bg-blue-50' : ''}`}>
                  <p className={`text-xs font-semibold ${today ? 'text-blue-600' : 'text-gray-500'}`}>
                    {DAY_LABEL[di]}
                  </p>
                  <p className={`text-sm font-bold mt-0.5 ${today ? 'text-blue-700' : 'text-gray-700'}`}>
                    {formatDateShort(date)}
                  </p>
                  {today && <span className="text-xs text-blue-400">Bugun</span>}
                </div>
              )
            })}
          </div>

          {/* Vaqt grid */}
          <div className="grid" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>

            {/* Soat ustuni */}
            <div className="border-r border-gray-100 relative" style={{ height: `${totalHeight}px` }}>
              {hours.map((h) => (
                <div key={h} className="absolute w-full flex items-start justify-end pr-1.5"
                  style={{ top: `${(h - START_HOUR) * PX_PER_HOUR - 7}px` }}>
                  <span className="text-xs text-gray-300 font-mono">{String(h).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>

            {/* Kun ustunlari */}
            {weekDays.map((date, di) => {
              const today = isToday(date)
              const daySessions = sessions.filter((s) => s.dayIdx === di)
              return (
                <div key={di}
                  className={`relative border-r border-gray-100 last:border-r-0 ${today ? 'bg-blue-50/25' : ''}`}
                  style={{ height: `${totalHeight}px` }}
                >
                  {/* Soat chiziqlari */}
                  {hours.map((h) => (
                    <div key={h} className="absolute w-full border-t border-gray-100"
                      style={{ top: `${(h - START_HOUR) * PX_PER_HOUR}px` }} />
                  ))}
                  {/* Yarim soat */}
                  {hours.slice(0, -1).map((h) => (
                    <div key={`h${h}`} className="absolute w-full border-t border-dashed border-gray-50"
                      style={{ top: `${(h - START_HOUR) * PX_PER_HOUR + PX_PER_HOUR / 2}px` }} />
                  ))}
                  {/* Sessiyalar */}
                  {daySessions.map((s) => <SessionCard key={s.id} s={s} />)}
                  {/* Bugun chizig'i */}
                  {today && (() => {
                    const now = new Date()
                    const cur = now.getHours() + now.getMinutes() / 60
                    if (cur < START_HOUR || cur > END_HOUR) return null
                    return (
                      <div className="absolute w-full flex items-center z-10 pointer-events-none"
                        style={{ top: `${(cur - START_HOUR) * PX_PER_HOUR}px` }}>
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
                        <div className="flex-1 border-t-2 border-red-400 border-dashed" />
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Jadval belgilanmagan guruhlar */}
      {noSchedule.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-amber-700 shrink-0">Jadval yo'q:</span>
          {noSchedule.map((g) => (
            <span key={g.id} className="text-xs bg-white border border-amber-200 text-amber-600 px-2.5 py-1 rounded-lg">
              {g.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
