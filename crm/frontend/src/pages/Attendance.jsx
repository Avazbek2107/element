import { useEffect, useState } from 'react'
import { groupsApi, studentsApi, attendanceApi, materialsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

function emptyRec() {
  return { status: 'present', note: '' }
}

const STATUSES = [
  { key: 'present', label: '1', title: 'Keldi',     color: '#16a34a', bg: '#f0fdf4', chip: '#dcfce7', chipText: '#15803d' },
  { key: 'absent',  label: '0', title: 'Kelmadi',   color: '#dc2626', bg: '#fef2f2', chip: '#fee2e2', chipText: '#b91c1c' },
  { key: 'excused', label: 'S', title: 'Sababli',   color: '#d97706', bg: '#fffbeb', chip: '#fef3c7', chipText: '#92400e' },
  { key: 'late',    label: 'K', title: 'Kech qoldi',color: '#2563eb', bg: '#eff6ff', chip: '#dbeafe', chipText: '#1e40af' },
]

function Avatar({ name, status }) {
  const s = STATUSES.find(x => x.key === status) || STATUSES[0]
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 select-none"
      style={{ background: s.chip, color: s.chipText }}
    >
      {initials}
    </div>
  )
}

function StatusChip({ status }) {
  const s = STATUSES.find(x => x.key === status) || STATUSES[0]
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.chip, color: s.chipText }}
    >
      <span className="font-bold">{s.label}</span>
      <span className="opacity-75">{s.title}</span>
    </span>
  )
}

function StudentRow({ student, idx, rec, onChange }) {
  const status   = rec.status || 'present'
  const note     = rec.note   || ''
  const set      = (fields) => onChange(student.id, { ...rec, ...fields })
  const needNote = status === 'excused' || status === 'late'
  const current  = STATUSES.find(s => s.key === status) || STATUSES[0]

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-150"
      style={{ background: current.bg, border: `1px solid ${current.color}18` }}
    >
      {/* Raqam */}
      <span className="text-xs tabular-nums text-gray-300 w-5 text-right shrink-0 font-mono">{idx}</span>

      {/* Avatar */}
      <Avatar name={`${student.first_name} ${student.last_name}`} status={status} />

      {/* Ism */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate leading-snug">
          {student.first_name} {student.last_name}
        </p>
        {needNote && note && (
          <p className="text-xs truncate mt-0.5" style={{ color: current.chipText, opacity: 0.8 }}>
            {note}
          </p>
        )}
      </div>

      {/* Izoh input — S va K uchun */}
      {needNote && (
        <input
          type="text"
          value={note}
          onChange={e => set({ note: e.target.value })}
          placeholder={status === 'late' ? 'Kech qolish sababi…' : 'Sabab…'}
          onClick={e => e.stopPropagation()}
          className="text-xs px-3 py-1.5 rounded-xl outline-none w-44 shrink-0 transition-all"
          style={{
            background: '#fff',
            border: `1.5px solid ${current.color}40`,
            color: '#374151',
          }}
          onFocus={e => { e.target.style.borderColor = current.color }}
          onBlur={e => { e.target.style.borderColor = `${current.color}40` }}
        />
      )}

      {/* Status tugmalari */}
      <div className="flex items-center gap-1 shrink-0">
        {STATUSES.map(s => {
          const active = status === s.key
          return (
            <button
              key={s.key}
              onClick={() => set({ status: s.key, note: (s.key === 'present' || s.key === 'absent') ? '' : note })}
              title={s.title}
              className="w-8 h-8 rounded-xl text-xs font-bold transition-all duration-150 select-none"
              style={active
                ? { background: s.color, color: '#fff', boxShadow: `0 2px 8px ${s.color}55` }
                : { background: '#fff', color: '#9ca3af', border: '1.5px solid #e5e7eb' }
              }
            >
              {s.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SelectField({ label, value, onChange, children, disabled }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="text-sm text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all min-w-[160px]"
      >
        {children}
      </select>
    </div>
  )
}

export default function Attendance() {
  const { user } = useAuth()

  const [groups,        setGroups]        = useState([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [date,          setDate]          = useState(() => new Date().toISOString().slice(0, 10))
  const [students,      setStudents]      = useState([])
  const [records,       setRecords]       = useState({})
  const [history,       setHistory]       = useState([])
  const [tab,           setTab]           = useState('mark')
  const [saving,        setSaving]        = useState(false)
  const [loading,       setLoading]       = useState(false)

  const [modules,        setModules]        = useState([])
  const [selectedModule, setSelectedModule] = useState('')
  const [topics,         setTopics]         = useState([])
  const [selectedTopic,  setSelectedTopic]  = useState('')

  useEffect(() => {
    groupsApi.list().then(({ data }) => {
      let visible = data
      if (user?.role === 'teacher') visible = data.filter(g => g.teacher_id === user.id)
      setGroups(visible)
      if (visible.length > 0) setSelectedGroup(String(visible[0].id))
    }).catch(() => {})
  }, [user])

  useEffect(() => {
    materialsApi.listModules().then(({ data }) => setModules(data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedModule) { setTopics([]); setSelectedTopic(''); return }
    materialsApi.listTopics(selectedModule).then(({ data }) => {
      setTopics(data); setSelectedTopic('')
    }).catch(() => {})
  }, [selectedModule])

  useEffect(() => {
    if (!selectedGroup) return
    setLoading(true); setStudents([]); setRecords({})
    Promise.all([
      studentsApi.list({ group_id: selectedGroup }).then(r => r.data.items ?? r.data ?? []),
      attendanceApi.list({ group_id: selectedGroup, date_from: date, date_to: date }).then(r => r.data).catch(() => []),
    ]).then(([stList, existing]) => {
      const arr = Array.isArray(stList) ? stList : []
      setStudents(arr)
      const base = {}
      arr.forEach(s => { base[s.id] = emptyRec() })
      existing.forEach(r => { base[r.student_id] = { status: r.status || 'present', note: r.note || '' } })
      if (existing[0]?.module_id) setSelectedModule(String(existing[0].module_id))
      if (existing[0]?.topic_id)  setSelectedTopic(String(existing[0].topic_id))
      setRecords(base)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [selectedGroup, date])

  useEffect(() => {
    if (tab !== 'history' || !selectedGroup) return
    attendanceApi.summary(selectedGroup).then(({ data }) => setHistory(data)).catch(() => {})
  }, [tab, selectedGroup])

  function handleChange(id, rec) { setRecords(prev => ({ ...prev, [id]: rec })) }
  function markAll(status) {
    const next = {}
    students.forEach(s => { next[s.id] = { status, note: '' } })
    setRecords(next)
  }

  function handleSave() {
    if (!selectedGroup || students.length === 0) return
    setSaving(true)
    attendanceApi.mark({
      group_id:  Number(selectedGroup),
      date,
      module_id: selectedModule ? Number(selectedModule) : null,
      topic_id:  selectedTopic  ? Number(selectedTopic)  : null,
      records: students.map(s => {
        const r = records[s.id] || emptyRec()
        return { student_id: s.id, status: r.status || 'present', note: r.note || null }
      }),
    })
      .then(() => { toast.success("Yo'qlama saqlandi"); setSaving(false) })
      .catch(err => { toast.error(err?.response?.data?.detail || 'Xato'); setSaving(false) })
  }

  const counts = { present: 0, absent: 0, excused: 0, late: 0 }
  students.forEach(s => {
    const st = (records[s.id] || emptyRec()).status
    if (st in counts) counts[st]++
  })

  const groupObj = groups.find(g => String(g.id) === String(selectedGroup))

  const today = new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })

  return (
    <div className="w-full">
      <div className="space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Yo'qlama</h1>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">{today}</p>
        </div>

        {/* Filtrlar — bir qatorda */}
        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3 flex-wrap" style={{ border: '1px solid #f1f5f9' }}>
          <select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            className="text-sm text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
          >
            {groups.length === 0 && <option>Guruh yo'q</option>}
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>

          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="text-sm text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
          />

          <select
            value={selectedModule}
            onChange={e => setSelectedModule(e.target.value)}
            className="text-sm text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
          >
            <option value="">— Modul —</option>
            {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>

          <select
            value={selectedTopic}
            onChange={e => setSelectedTopic(e.target.value)}
            disabled={!selectedModule || topics.length === 0}
            className="text-sm text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all disabled:opacity-40"
          >
            <option value="">— Mavzu —</option>
            {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>

          {groupObj?.teacher_name && (
            <span className="text-sm text-gray-400 px-1">{groupObj.teacher_name}</span>
          )}

          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setTab('mark')}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={tab === 'mark'
                ? { background: '#1d4ed8', color: '#fff', boxShadow: '0 2px 8px #1d4ed840' }
                : { background: '#f1f5f9', color: '#6b7280' }}
            >Belgilash</button>
            <button
              onClick={() => setTab('history')}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={tab === 'history'
                ? { background: '#1d4ed8', color: '#fff', boxShadow: '0 2px 8px #1d4ed840' }
                : { background: '#f1f5f9', color: '#6b7280' }}
            >Tarix</button>
          </div>
        </div>

        {/* Mark tab */}
        {tab === 'mark' && (
          <>
            {loading ? (
              <div className="bg-white rounded-2xl p-16 text-center" style={{ border: '1px solid #f1f5f9' }}>
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-400">Yuklanmoqda…</p>
              </div>
            ) : students.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 text-center" style={{ border: '1px solid #f1f5f9' }}>
                <p className="text-4xl mb-3">📋</p>
                <p className="text-sm font-medium text-gray-500">Bu guruhda o'quvchilar yo'q</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid #f1f5f9' }}>

                {/* Toolbar */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 bg-gray-50/60">
                  <span className="text-xs font-medium text-gray-400">Barchani belgilash:</span>
                  <button
                    onClick={() => markAll('present')}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                    style={{ background: '#16a34a' }}
                  >1 — Keldi</button>
                  <button
                    onClick={() => markAll('absent')}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                    style={{ background: '#dc2626' }}
                  >0 — Kelmadi</button>
                  <div className="h-4 w-px bg-gray-200 mx-1" />
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {STATUSES.map(s => (
                      <span key={s.key} className="flex items-center gap-1">
                        <span className="w-5 h-5 rounded-lg inline-flex items-center justify-center font-bold text-white text-xs" style={{ background: s.color }}>{s.label}</span>
                        {s.title}
                      </span>
                    ))}
                  </div>
                </div>

                {/* O'quvchilar */}
                <div className="p-3 space-y-1.5">
                  {students.map((s, i) => (
                    <StudentRow
                      key={s.id}
                      student={s}
                      idx={i + 1}
                      rec={records[s.id] || emptyRec()}
                      onChange={handleChange}
                    />
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-50 bg-gray-50/40">
                  <div className="flex items-center gap-4">
                    {STATUSES.map(s => (
                      <div key={s.key} className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: s.color }}>
                          {s.label}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: s.color }}>
                          {counts[s.key]}
                        </span>
                        <span className="text-xs text-gray-400 hidden sm:inline">{s.title}</span>
                      </div>
                    ))}
                    <span className="text-xs text-gray-300 ml-1">/ {students.length} ta</span>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                    style={{ background: saving ? '#93c5fd' : '#1d4ed8', boxShadow: '0 2px 8px #1d4ed840' }}
                  >
                    {saving ? 'Saqlanmoqda…' : 'Saqlash'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid #f1f5f9' }}>
            {history.length === 0 ? (
              <div className="p-16 text-center">
                <p className="text-4xl mb-3">📊</p>
                <p className="text-sm text-gray-400">Hali yo'qlama belgilanmagan</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Sana</th>
                    {STATUSES.map(s => (
                      <th key={s.key} className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wide" style={{ color: s.color }}>
                        {s.label} — {s.title}
                      </th>
                    ))}
                    <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Jami</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, i) => (
                    <tr key={row.date} className="transition-colors hover:bg-gray-50/80" style={{ borderTop: i > 0 ? '1px solid #f8fafc' : 'none' }}>
                      <td className="px-5 py-3.5 font-medium text-gray-700">{String(row.date)}</td>
                      {STATUSES.map(s => (
                        <td key={s.key} className="px-4 py-3.5 text-center">
                          <span
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
                            style={{ background: s.chip, color: s.chipText }}
                          >
                            {row[s.key] ?? 0}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 py-3.5 text-center text-xs font-semibold text-gray-400">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
