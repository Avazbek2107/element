import { useEffect, useState } from 'react'
import { groupsApi, usersApi, roomsApi } from '../services/api'
import toast from 'react-hot-toast'
import GroupReportModal from '../components/GroupReportModal'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_UZ = {
  monday: "Du", tuesday: "Se", wednesday: "Ch",
  thursday: "Pa", friday: "Ju", saturday: "Sh", sunday: "Ya",
}
const DAY_FULL = {
  monday: "Dushanba", tuesday: "Seshanba", wednesday: "Chorshanba",
  thursday: "Payshanba", friday: "Juma", saturday: "Shanba", sunday: "Yakshanba",
}

/* Yangi format: { monday: { time: "09:00-11:00", room_id: 1 }, ... }
   Eski format:  { monday: "09:00-11:00", ... }  (backward compat)
   Internal:     { monday: { on, start, end, room_id } }            */
function getTimeStr(e) {
  if (typeof e === 'string') return e
  return e?.time ?? ''
}
function getRoomId(e) {
  if (e && typeof e === 'object') return e.room_id ? String(e.room_id) : ''
  return ''
}

function parseSchedule(raw) {
  const out = {}
  DAYS.forEach((d) => {
    const val = raw?.[d]
    if (val) {
      const ts = getTimeStr(val)
      const [start, end] = ts.split('-')
      out[d] = { on: true, start: start || '09:00', end: end || '11:00', room_id: getRoomId(val) }
    } else {
      out[d] = { on: false, start: '09:00', end: '11:00', room_id: '' }
    }
  })
  return out
}

function serializeSchedule(sched) {
  const out = {}
  DAYS.forEach((d) => {
    if (sched[d]?.on) {
      out[d] = {
        time: `${sched[d].start}-${sched[d].end}`,
        room_id: sched[d].room_id ? Number(sched[d].room_id) : null,
      }
    }
  })
  return Object.keys(out).length > 0 ? out : null
}

const emptySchedule = () => parseSchedule(null)

/* ── Guruh kartasi ── */
function GroupCard({ g, onEdit, onDelete, onReport, rooms }) {
  const activeDays = g.schedule ? Object.entries(g.schedule) : []
  const roomName = (rid) => rooms.find(r => r.id === rid)?.name ?? null
  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      onClick={() => onReport(g)}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-800 text-base">{g.name}</h3>
          {g.description && <p className="text-xs text-gray-400 mt-0.5">{g.description}</p>}
        </div>
        <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium shrink-0">
          {g.student_count} o'quvchi
        </span>
      </div>

      {/* O'qituvchi */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-400 shrink-0">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        {g.teacher_name
          ? <span>{g.teacher_name}</span>
          : <span className="text-gray-300 italic">O'qituvchi biriktirilmagan</span>
        }
      </div>

      {/* Dars vaqti */}
      {activeDays.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {activeDays.map(([day, entry]) => {
            const ts  = getTimeStr(entry)
            const rid = typeof entry === 'object' ? entry?.room_id : null
            const rn  = rid ? roomName(rid) : null
            return (
              <span key={day} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-md font-medium">
                <span>{DAY_UZ[day] ?? day}</span>
                <span className="text-indigo-400">·</span>
                <span>{ts}</span>
                {rn && <><span className="text-indigo-300">·</span><span className="text-indigo-500">{rn}</span></>}
              </span>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-gray-300 italic">Dars vaqti belgilanmagan</p>
      )}

      {/* Sanalar */}
      {(g.start_date || g.end_date) && (
        <p className="text-xs text-gray-400">
          {g.start_date} — {g.end_date || '...'}
        </p>
      )}

      <div className="flex gap-3 pt-2 border-t border-gray-100" onClick={e => e.stopPropagation()}>
        <button onClick={() => onEdit(g)} className="text-blue-600 text-xs hover:underline font-medium">Tahrirlash</button>
        <button onClick={() => onDelete(g.id)} className="text-red-500 text-xs hover:underline">O'chirish</button>
        {g.telegram_group_link && (
          <a href={g.telegram_group_link} target="_blank" rel="noreferrer" className="text-sky-500 text-xs hover:underline ml-auto">
            Telegram
          </a>
        )}
        <button onClick={() => onReport(g)} className="flex items-center gap-1 text-indigo-600 text-xs hover:underline ml-auto font-medium">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
          </svg>
          Hisobot
        </button>
      </div>
    </div>
  )
}

/* ── Modal ── */
function GroupModal({ group, teachers, rooms, onClose, onSaved }) {
  const isEdit = !!group
  const [form, setForm] = useState({
    name: group?.name || '',
    description: group?.description || '',
    telegram_group_link: group?.telegram_group_link || '',
    start_date: group?.start_date || '',
    end_date: group?.end_date || '',
    teacher_id: group?.teacher_id ?? '',
  })
  const [schedule, setSchedule] = useState(() => parseSchedule(group?.schedule))
  const [saving, setSaving] = useState(false)

  const setDay = (day, field, value) =>
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        teacher_id: form.teacher_id ? Number(form.teacher_id) : null,
        schedule: serializeSchedule(schedule),
      }
      if (!payload.start_date) delete payload.start_date
      if (!payload.end_date) delete payload.end_date

      if (isEdit) {
        await groupsApi.update(group.id, payload)
        toast.success('Guruh yangilandi')
      } else {
        await groupsApi.create(payload)
        toast.success("Guruh qo'shildi")
      }
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Xatolik')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">
            {isEdit ? 'Guruhni tahrirlash' : 'Yangi guruh'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 text-sm">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Asosiy ma'lumotlar */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Guruh nomi *</label>
            <input
              type="text" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Masalan: M-1, Boshlang'ich guruh"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tavsif</label>
            <textarea
              rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none"
              placeholder="Guruh haqida qisqacha ma'lumot"
            />
          </div>

          {/* O'qituvchi tanlash */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">O'qituvchi</label>
            <select
              value={form.teacher_id}
              onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Tanlang —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.last_name} {t.first_name}
                </option>
              ))}
            </select>
          </div>

          {/* Dars vaqti */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Dars vaqti</label>
            <div className="space-y-2">
              {DAYS.map((day) => (
                <div key={day} className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${schedule[day].on ? 'bg-indigo-50' : 'bg-gray-50'}`}>
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => setDay(day, 'on', !schedule[day].on)}
                    className={`w-8 h-5 rounded-full relative transition-colors shrink-0 ${schedule[day].on ? 'bg-indigo-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${schedule[day].on ? 'translate-x-3' : 'translate-x-0.5'}`} />
                  </button>
                  {/* Kun nomi */}
                  <span className={`text-xs font-medium w-16 shrink-0 ${schedule[day].on ? 'text-indigo-700' : 'text-gray-400'}`}>
                    {DAY_FULL[day]}
                  </span>
                  {/* Vaqt + xona */}
                  {schedule[day].on && (
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                      <input
                        type="time"
                        value={schedule[day].start}
                        onChange={(e) => setDay(day, 'start', e.target.value)}
                        className="border border-indigo-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                      />
                      <span className="text-gray-400 text-xs">—</span>
                      <input
                        type="time"
                        value={schedule[day].end}
                        onChange={(e) => setDay(day, 'end', e.target.value)}
                        className="border border-indigo-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                      />
                      <select
                        value={schedule[day].room_id}
                        onChange={(e) => setDay(day, 'room_id', e.target.value)}
                        className="border border-indigo-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white flex-1 min-w-[100px]"
                      >
                        <option value="">— Xona —</option>
                        {rooms.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name}{r.capacity ? ` (${r.capacity})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {!schedule[day].on && <span className="text-xs text-gray-300 italic">Dam olish</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Sanalar */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Boshlanish</label>
              <input type="date" value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tugash</label>
              <input type="date" value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>

          {/* Telegram */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Telegram guruh linki</label>
            <input type="text" value={form.telegram_group_link}
              onChange={(e) => setForm({ ...form, telegram_group_link: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
              placeholder="https://t.me/..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              Bekor
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Asosiy sahifa ── */
export default function Groups() {
  const [groups,      setGroups]      = useState([])
  const [teachers,    setTeachers]    = useState([])
  const [rooms,       setRooms]       = useState([])
  const [modal,       setModal]       = useState(null)
  const [reportGroup, setReportGroup] = useState(null)

  const load = () =>
    groupsApi.list().then(({ data }) => setGroups(data)).catch(() => {})

  useEffect(() => {
    load()
    usersApi.listTeachers().then(({ data }) => setTeachers(data)).catch(() => {})
    roomsApi.list().then(({ data }) => setRooms(data)).catch(() => {})
  }, [])

  const handleDelete = async (id) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return
    try {
      await groupsApi.delete(id)
      toast.success("Guruh o'chirildi")
      load()
    } catch {
      toast.error('Xatolik')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Guruhlar</h1>
        <button
          onClick={() => setModal('create')}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700 font-medium"
        >
          + Qo'shish
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((g) => (
          <GroupCard
            key={g.id}
            g={g}
            rooms={rooms}
            onEdit={(g) => setModal(g)}
            onDelete={handleDelete}
            onReport={(g) => setReportGroup(g)}
          />
        ))}
        {groups.length === 0 && (
          <p className="col-span-3 text-center text-gray-400 py-16">Guruhlar topilmadi</p>
        )}
      </div>

      {modal !== null && (
        <GroupModal
          group={modal === 'create' ? null : modal}
          teachers={teachers}
          rooms={rooms}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}

      {reportGroup && (
        <GroupReportModal
          group={reportGroup}
          onClose={() => setReportGroup(null)}
        />
      )}
    </div>
  )
}
