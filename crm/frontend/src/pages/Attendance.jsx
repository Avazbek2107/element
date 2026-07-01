import { useEffect, useState } from 'react'
import { groupsApi, studentsApi, attendanceApi } from '../services/api'
import toast from 'react-hot-toast'

/* default holat */
function emptyRec() {
  return { status: 'present', late_minutes: '', note: '' }
}

/* ── Bir o'quvchi satri ── */
function StudentRow({ student, rec, onChange }) {
  const status = rec.status || 'present'
  const mins   = rec.late_minutes || ''
  const note   = rec.note || ''

  const set = (fields) => onChange(student.id, { ...rec, ...fields })

  return (
    <div className={
      'border rounded-xl p-4 ' +
      (status === 'present' ? 'bg-green-50 border-green-200' :
       status === 'absent'  ? 'bg-red-50  border-red-200'   :
                              'bg-amber-50 border-amber-200')
    }>
      {/* Yuqori qator: ism + tugmalar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Avatar + ism */}
        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
          <div className={
            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ' +
            (status === 'present' ? 'bg-green-200 text-green-800' :
             status === 'absent'  ? 'bg-red-200  text-red-800'   :
                                    'bg-amber-200 text-amber-800')
          }>
            {(student.first_name || '?').charAt(0)}
            {(student.last_name  || '').charAt(0)}
          </div>
          <span className="text-sm font-semibold text-gray-800">
            {student.first_name} {student.last_name}
          </span>
        </div>

        {/* Status tugmalari */}
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => set({ status: 'present', late_minutes: '' })}
            className={
              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ' +
              (status === 'present'
                ? 'bg-green-600 text-white border-green-600 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:border-green-400 hover:text-green-700')
            }
          >
            1 - Keldi
          </button>

          <button
            onClick={() => set({ status: 'absent', late_minutes: '' })}
            className={
              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ' +
              (status === 'absent'
                ? 'bg-red-500 text-white border-red-500 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:border-red-400 hover:text-red-600')
            }
          >
            0 - Kelmadi
          </button>

          <button
            onClick={() => set({ status: 'late' })}
            className={
              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ' +
              (status === 'late'
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:border-amber-400 hover:text-amber-600')
            }
          >
            Kechikdi
          </button>
        </div>
      </div>

      {/* Kechikish daqiqa + izoh */}
      {(status === 'late' || status === 'absent') && (
        <div className="flex gap-3 mt-3 pl-10 flex-wrap">
          {status === 'late' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-amber-700 whitespace-nowrap">Kechikish:</span>
              <input
                type="number"
                min="1"
                max="180"
                value={mins}
                onChange={e => set({ late_minutes: e.target.value })}
                placeholder="15"
                className="w-20 border border-amber-300 bg-white rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <span className="text-xs text-amber-600">daqiqa</span>
            </div>
          )}
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Izoh:</span>
            <input
              type="text"
              value={note}
              onChange={e => set({ note: e.target.value })}
              placeholder={status === 'late' ? 'Kechikish sababi...' : 'Kelmagan sababi...'}
              className={
                'flex-1 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 ' +
                (status === 'late' ? 'border-amber-300 focus:ring-amber-400'
                                   : 'border-red-200  focus:ring-red-300')
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Asosiy sahifa ── */
export default function Attendance() {
  const [groups,        setGroups]        = useState([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [date,          setDate]          = useState(() => new Date().toISOString().slice(0, 10))
  const [students,      setStudents]      = useState([])
  const [records,       setRecords]       = useState({})
  const [history,       setHistory]       = useState([])
  const [tab,           setTab]           = useState('mark')
  const [saving,        setSaving]        = useState(false)
  const [loading,       setLoading]       = useState(false)

  /* Guruhlarni yuklash */
  useEffect(function () {
    groupsApi.list()
      .then(function (res) {
        var data = res.data
        setGroups(data)
        if (data.length > 0) setSelectedGroup(String(data[0].id))
      })
      .catch(function () {})
  }, [])

  /* Guruh yoki sana o'zgarganda */
  useEffect(function () {
    if (!selectedGroup) return
    setLoading(true)
    setStudents([])
    setRecords({})

    studentsApi.list({ group_id: selectedGroup, limit: 200 })
      .then(function (res) {
        var stList = res.data.items || res.data
        setStudents(stList)

        var base = {}
        stList.forEach(function (s) { base[s.id] = emptyRec() })

        /* Mavjud yo'qlamani ustiga yukla */
        attendanceApi.list({ group_id: selectedGroup, date_from: date, date_to: date })
          .then(function (r2) {
            var existing = r2.data
            existing.forEach(function (r) {
              base[r.student_id] = {
                status:       r.status || 'present',
                late_minutes: r.late_minutes != null ? String(r.late_minutes) : '',
                note:         r.note || '',
              }
            })
            setRecords(base)
            setLoading(false)
          })
          .catch(function () {
            setRecords(base)
            setLoading(false)
          })
      })
      .catch(function () { setLoading(false) })
  }, [selectedGroup, date])

  /* Tarix tab */
  useEffect(function () {
    if (tab !== 'history' || !selectedGroup) return
    attendanceApi.summary(selectedGroup)
      .then(function (res) { setHistory(res.data) })
      .catch(function () {})
  }, [tab, selectedGroup])

  function handleChange(studentId, rec) {
    setRecords(function (prev) {
      var next = Object.assign({}, prev)
      next[studentId] = rec
      return next
    })
  }

  function markAll(status) {
    var next = {}
    students.forEach(function (s) { next[s.id] = { status: status, late_minutes: '', note: '' } })
    setRecords(next)
  }

  function handleSave() {
    if (!selectedGroup || students.length === 0) return
    setSaving(true)
    var payload = {
      group_id: Number(selectedGroup),
      date: date,
      records: students.map(function (s) {
        var r = records[s.id] || emptyRec()
        var mins = r.late_minutes ? parseInt(r.late_minutes, 10) : null
        return {
          student_id:   s.id,
          status:       r.status || 'present',
          late_minutes: (r.status === 'late' && mins) ? mins : null,
          note:         r.note || null,
        }
      }),
    }
    attendanceApi.mark(payload)
      .then(function () {
        toast.success("Yo'qlama saqlandi")
        setSaving(false)
      })
      .catch(function (err) {
        toast.error((err.response && err.response.data && err.response.data.detail) || 'Xato yuz berdi')
        setSaving(false)
      })
  }

  /* Hisob */
  var counts = { present: 0, absent: 0, late: 0 }
  students.forEach(function (s) {
    var st = (records[s.id] || emptyRec()).status
    if (counts[st] !== undefined) counts[st]++
  })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">{"Yo'qlama"}</h1>

      {/* Guruh, sana, tablar */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Guruh</label>
          <select
            value={selectedGroup}
            onChange={function (e) { setSelectedGroup(e.target.value) }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[160px]"
          >
            {groups.map(function (g) {
              return <option key={g.id} value={g.id}>{g.name}</option>
            })}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Sana</label>
          <input
            type="date"
            value={date}
            onChange={function (e) { setDate(e.target.value) }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={function () { setTab('mark') }}
            className={'px-4 py-2 rounded-lg text-sm font-medium ' + (tab === 'mark' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            Belgilash
          </button>
          <button
            onClick={function () { setTab('history') }}
            className={'px-4 py-2 rounded-lg text-sm font-medium ' + (tab === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            Tarix
          </button>
        </div>
      </div>

      {/* Belgilash tab */}
      {tab === 'mark' && (
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400 text-sm">
              Yuklanmoqda...
            </div>
          ) : students.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400 text-sm">
              {"Bu guruhda o'quvchilar yo'q"}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Tez belgilash */}
              <div className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center gap-3 flex-wrap">
                <span className="text-xs font-medium text-gray-500">Barchani:</span>
                <button
                  onClick={function () { markAll('present') }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700"
                >
                  Keldi deb belgilash
                </button>
                <button
                  onClick={function () { markAll('absent') }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600"
                >
                  Kelmadi deb belgilash
                </button>
              </div>

              {/* O'quvchilar */}
              <div className="flex flex-col gap-2">
                {students.map(function (s) {
                  return (
                    <StudentRow
                      key={s.id}
                      student={s}
                      rec={records[s.id] || emptyRec()}
                      onChange={handleChange}
                    />
                  )
                })}
              </div>

              {/* Pastki panel */}
              <div className="bg-white rounded-xl shadow-sm px-5 py-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-5 text-sm">
                  <span className="text-green-600 font-semibold">{counts.present} keldi</span>
                  <span className="text-red-500 font-semibold">{counts.absent} kelmadi</span>
                  <span className="text-amber-500 font-semibold">{counts.late} kechikdi</span>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tarix tab */}
      {tab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {history.length === 0 ? (
            <p className="text-gray-400 text-sm p-8 text-center">Hali belgilanmagan</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3">Sana</th>
                  <th className="text-center px-5 py-3 text-green-600">Keldi</th>
                  <th className="text-center px-5 py-3 text-red-500">Kelmadi</th>
                  <th className="text-center px-5 py-3 text-amber-500">Kechikdi</th>
                  <th className="text-center px-5 py-3">Jami</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map(function (row) {
                  return (
                    <tr key={row.date} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-700">{row.date}</td>
                      <td className="px-5 py-3 text-center text-green-600 font-semibold">{row.present}</td>
                      <td className="px-5 py-3 text-center text-red-500 font-semibold">{row.absent}</td>
                      <td className="px-5 py-3 text-center text-amber-500 font-semibold">{row.late}</td>
                      <td className="px-5 py-3 text-center text-gray-400">{row.total}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
