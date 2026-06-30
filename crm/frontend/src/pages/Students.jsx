import { useEffect, useState, useRef } from 'react'
import { studentsApi, groupsApi, telegramApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import Avatar from '../components/GenderAvatar'
import StudentDetailDrawer from '../components/StudentDetailDrawer'

export default function Students() {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [groups, setGroups]     = useState([])
  const [search, setSearch]     = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [editing, setEditing]   = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importing, setImporting] = useState(false)
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const PAGE_SIZE = 20
  const fileRef = useRef()

  const isTeacher = ['admin', 'teacher'].includes(user?.role)

  const load = (p = page) => {
    const params = { skip: (p - 1) * PAGE_SIZE, limit: PAGE_SIZE }
    if (search)      params.search   = search
    if (groupFilter) params.group_id = groupFilter
    studentsApi.list(params).then(({ data }) => {
      setStudents(data.items)
      setTotal(data.total)
    }).catch(() => {})
  }

  useEffect(() => { groupsApi.list().then(({ data }) => setGroups(data)).catch(() => {}) }, [])
  useEffect(() => { setPage(1); load(1) }, [search, groupFilter])
  useEffect(() => { load() }, [page])

  async function handleImport(file) {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['csv', 'xlsx'].includes(ext)) { toast.error('.csv yoki .xlsx fayl yuklang'); return }
    setImporting(true); setImportResult(null)
    try {
      const fd = new FormData(); fd.append('file', file)
      const { data } = await studentsApi.importFile(fd)
      setImportResult(data)
      toast.success(`${data.created} ta o'quvchi qo'shildi`)
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Import xatosi')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleEdit(student) {
    setSelected(null)
    setEditing(student)
  }

  function handleSaved(updatedStudent) {
    load()
    if (updatedStudent) {
      setSelected(updatedStudent)
    }
    setEditing(null)
    setShowForm(false)
  }

  return (
    <div className="space-y-5">
      {/* Title row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">O'quvchilar</h1>
        {isTeacher && (
          <div className="flex flex-wrap gap-2">
            <label className={`cursor-pointer border border-blue-500 text-blue-600 px-4 py-2 rounded-lg text-sm hover:bg-blue-50 ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
              {importing ? 'Yuklanmoqda...' : 'Import (CSV/Excel)'}
              <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden"
                onChange={(e) => handleImport(e.target.files[0])} />
            </label>
            <button onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              + Qo'shish
            </button>
          </div>
        )}
      </div>

      {/* Import natija */}
      {importResult && (
        <div className="bg-white rounded-xl shadow-sm p-4 flex gap-4">
          <div className="text-center px-5">
            <p className="text-2xl font-bold text-green-600">{importResult.created}</p>
            <p className="text-xs text-gray-400">Qo'shildi</p>
          </div>
          <div className="text-center px-5">
            <p className="text-2xl font-bold text-yellow-500">{importResult.skipped}</p>
            <p className="text-xs text-gray-400">O'tkazildi</p>
          </div>
          <div className="text-center px-5">
            <p className="text-2xl font-bold text-red-500">{importResult.errors}</p>
            <p className="text-xs text-gray-400">Xato</p>
          </div>
          <button onClick={() => setImportResult(null)} className="ml-auto text-gray-300 hover:text-gray-500 self-start">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input type="text" placeholder="Ism yoki telefon bo'yicha qidirish..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-0 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}
          className="shrink-0 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">Barcha guruhlar</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {/* Cards grid */}
      {students.length === 0 && total === 0 ? (
        <div className="text-center text-gray-400 py-20 text-sm">O'quvchilar topilmadi</div>
      ) : (
        <>
          <p className="text-xs text-gray-400">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total} ta o'quvchi
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {students.map((s) => (
              <StudentCard key={s.id} student={s} isTeacher={isTeacher} onClick={() => setSelected(s)} />
            ))}
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <Pagination
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          )}
        </>
      )}

      {/* Detail drawer */}
      {selected && !editing && (
        <StudentDetailDrawer
          student={selected}
          onClose={() => setSelected(null)}
          onEdit={isTeacher ? handleEdit : undefined}
        />
      )}

      {/* Create form modal */}
      {showForm && (
        <StudentFormModal
          groups={groups}
          onClose={() => setShowForm(false)}
          onSaved={() => handleSaved(null)}
        />
      )}

      {/* Edit form modal */}
      {editing && (
        <StudentFormModal
          groups={groups}
          editStudent={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => handleSaved(updated)}
        />
      )}
    </div>
  )
}

/* ── Student Card ── */
function StudentCard({ student, isTeacher, onClick }) {
  const fish = [student.last_name, student.first_name, student.middle_name]
    .filter(Boolean).join(' ')
  const isFemale = student.gender === 'female'
  const [code, setCode]       = useState(student.link_code)
  const [loading, setLoading] = useState(false)

  const getCode = async (e) => {
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      const { data } = await telegramApi.getLinkCode(student.id)
      setCode(data.link_code)
    } catch {
      toast.error('Kodni olishda xato yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  const copyCode = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    toast.success('Kod nusxalandi')
  }

  return (
    <button
      onClick={onClick}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 overflow-hidden text-left w-full"
    >
      <div className={`relative pt-5 pb-3 flex justify-center ${isFemale ? 'bg-gradient-to-b from-pink-50 to-white' : 'bg-gradient-to-b from-blue-50 to-white'}`}>
        <div className={`w-20 h-20 rounded-full overflow-hidden ring-4 shadow-sm transition-transform duration-300 group-hover:scale-105 ${isFemale ? 'ring-pink-200' : 'ring-blue-200'}`}>
          <Avatar gender={student.gender} avatarUrl={student.avatar_url} />
        </div>
        {!student.is_active && (
          <span className="absolute top-2 right-2 text-xs bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">Nofaol</span>
        )}
      </div>
      <div className="px-3 pb-4 pt-2 text-center">
        <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{fish}</p>
        {student.group_name
          ? <p className={`text-xs mt-1 font-medium ${isFemale ? 'text-pink-500' : 'text-blue-500'}`}>{student.group_name}</p>
          : <p className="text-xs mt-1 text-gray-300">Guruhsiz</p>
        }

        {isTeacher && (
          <div className="mt-2 pt-2 border-t border-gray-50">
            {student.parent_telegram_id ? (
              <span className="text-xs text-green-600 font-medium">✅ Bog'langan</span>
            ) : code ? (
              <span
                onClick={copyCode}
                title="Nusxalash uchun bosing"
                className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full hover:bg-gray-100"
              >
                {code} 📋
              </span>
            ) : (
              <span
                onClick={getCode}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium"
              >
                {loading ? '...' : 'Kod olish'}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

/* ── Create / Edit Modal ── */
function StudentFormModal({ groups, editStudent, onClose, onSaved }) {
  const isEdit = !!editStudent

  const [form, setForm] = useState(() => isEdit ? {
    first_name:   editStudent.first_name   || '',
    last_name:    editStudent.last_name    || '',
    middle_name:  editStudent.middle_name  || '',
    gender:       editStudent.gender       || '',
    phone:        editStudent.phone        || '',
    group_id:     editStudent.group_id != null ? String(editStudent.group_id) : '',
    birth_date:   editStudent.birth_date   || '',
    parent_phone: editStudent.parent_phone || '',
    address:      editStudent.address      || '',
    doc_type:     editStudent.doc_type     || '',
    doc_series:   editStudent.doc_series   || '',
    course_start_date: editStudent.course_start_date || '',
    course_end_date:   editStudent.course_end_date   || '',
  } : {
    username: '', email: '', password: '',
    first_name: '', last_name: '', middle_name: '',
    gender: '', phone: '', group_id: '',
    birth_date: '', parent_phone: '', address: '',
    doc_type: '', doc_series: '',
    course_start_date: '', course_end_date: '',
  })

  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEdit) {
        const payload = {}
        const fields = ['first_name','last_name','middle_name','gender','phone',
                        'birth_date','parent_phone','address','doc_type','doc_series',
                        'course_start_date','course_end_date']
        fields.forEach((f) => {
          if (form[f] !== '') payload[f] = form[f] || null
        })
        // group_id: empty string = remove from group, number = assign
        payload.group_id = form.group_id ? parseInt(form.group_id) : null

        const { data } = await studentsApi.update(editStudent.id, payload)
        toast.success("O'quvchi yangilandi")
        onSaved(data)
      } else {
        const data = { ...form }
        if (data.group_id) data.group_id = parseInt(data.group_id)
        else delete data.group_id
        if (!data.birth_date) delete data.birth_date
        if (!data.middle_name) delete data.middle_name
        if (!data.gender) delete data.gender
        if (!data.course_start_date) delete data.course_start_date
        if (!data.course_end_date) delete data.course_end_date
        await studentsApi.create(data)
        toast.success("O'quvchi qo'shildi")
        onSaved(null)
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Xatolik')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">
            {isEdit ? "O'quvchini tahrirlash" : "Yangi o'quvchi"}
          </h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-4 space-y-3 flex-1">
          {/* Shaxsiy ma'lumotlar */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Shaxsiy ma'lumotlar</p>
          <div className="grid grid-cols-2 gap-3">
            <F label="Ism *"       value={form.first_name}  onChange={set('first_name')}  required />
            <F label="Familiya *"  value={form.last_name}   onChange={set('last_name')}   required />
          </div>
          <F label="Sharif (otasining ismi)" value={form.middle_name} onChange={set('middle_name')} />

          <div className="grid grid-cols-2 gap-3">
            <F label="Telefon" value={form.phone} onChange={set('phone')} />
            <div>
              <label className="block text-xs text-gray-500 mb-1">Jinsi</label>
              <select value={form.gender} onChange={set('gender')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">— tanlanmagan —</option>
                <option value="male">O'g'il</option>
                <option value="female">Qiz</option>
              </select>
            </div>
          </div>

          <F label="Tug'ilgan sana" value={form.birth_date} onChange={set('birth_date')} type="date" />

          {/* Guruh */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1">Guruh</p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Guruhga biriktirish</label>
            <select value={form.group_id} onChange={set('group_id')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
              <option value="">— guruhsiz —</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            {isEdit && form.group_id === '' && (
              <p className="text-xs text-amber-500 mt-1">Guruh tanlanmasa, o'quvchi guruhdan chiqariladi</p>
            )}
          </div>

          {/* Kurs */}
          <div className="grid grid-cols-2 gap-3">
            <F label="Kurs boshlandi" value={form.course_start_date} onChange={set('course_start_date')} type="date" />
            <F label="Kurs tugaydi"   value={form.course_end_date}   onChange={set('course_end_date')}   type="date" />
          </div>

          {/* Hujjat */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1">Hujjat</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hujjat turi</label>
              <select value={form.doc_type} onChange={set('doc_type')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">— tanlanmagan —</option>
                <option value="passport">Pasport</option>
                <option value="birth_cert">Tug'ilganlik guvohnomasi</option>
              </select>
            </div>
            <F label="Seriya / Raqam" value={form.doc_series} onChange={set('doc_series')}
               placeholder={form.doc_type === 'passport' ? 'AA 1234567' : 'I-BC 123456'} />
          </div>

          {/* Ota-ona */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1">Ota-ona / Manzil</p>
          <F label="Ota-ona telefoni" value={form.parent_phone} onChange={set('parent_phone')} />
          <F label="Manzil"           value={form.address}      onChange={set('address')} />

          {/* Faqat yaratishda: login ma'lumotlari */}
          {!isEdit && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1">Kirish ma'lumotlari</p>
              <div className="grid grid-cols-2 gap-3">
                <F label="Username *" value={form.username} onChange={set('username')} required />
                <F label="Email *"    value={form.email}    onChange={set('email')} type="email" required />
              </div>
              <F label="Parol *" value={form.password} onChange={set('password')} type="password" required />
            </>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
            Bekor
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Saqlanmoqda...' : isEdit ? 'Saqlash' : "Qo'shish"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Pagination ── */
function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const pages = []
  let start = Math.max(1, page - 2)
  let end   = Math.min(totalPages, start + 4)
  if (end - start < 4) start = Math.max(1, end - 4)
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <PBtn disabled={page === 1} onClick={() => onChange(page - 1)}>‹</PBtn>
      {start > 1 && <><PBtn onClick={() => onChange(1)}>1</PBtn><span className="text-gray-300 px-1">…</span></>}
      {pages.map((p) => (
        <PBtn key={p} active={p === page} onClick={() => onChange(p)}>{p}</PBtn>
      ))}
      {end < totalPages && <><span className="text-gray-300 px-1">…</span><PBtn onClick={() => onChange(totalPages)}>{totalPages}</PBtn></>}
      <PBtn disabled={page === totalPages} onClick={() => onChange(page + 1)}>›</PBtn>
    </div>
  )
}

function PBtn({ children, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 text-sm rounded-lg transition-colors ${
        active
          ? 'bg-blue-600 text-white font-medium'
          : disabled
          ? 'text-gray-300 cursor-default'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

function F({ label, value, onChange, type = 'text', required, placeholder }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type={type} value={value} onChange={onChange} required={required} placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
    </div>
  )
}
