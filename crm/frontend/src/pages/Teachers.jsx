import { useEffect, useState, useRef } from 'react'
import { usersApi } from '../services/api'
import toast from 'react-hot-toast'

/* ── Modal: qo'shish / tahrirlash ── */
function TeacherModal({ teacher, onClose, onSaved }) {
  const isEdit = !!teacher

  const [form, setForm] = useState({
    first_name: teacher?.first_name || '',
    last_name:  teacher?.last_name  || '',
    email:      teacher?.email      || '',
    username:   teacher?.username   || '',
    phone:      teacher?.phone      || '',
    password:   '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEdit) {
        const payload = {}
        if (form.first_name) payload.first_name = form.first_name
        if (form.last_name)  payload.last_name  = form.last_name
        if (form.email)      payload.email      = form.email
        if (form.username)   payload.username   = form.username
        payload.phone    = form.phone || null
        if (form.password)   payload.password   = form.password
        await usersApi.updateTeacher(teacher.id, payload)
        toast.success("O'qituvchi yangilandi")
      } else {
        if (!form.password) { toast.error('Parol kiritilishi shart'); setSaving(false); return }
        await usersApi.createTeacher(form)
        toast.success("O'qituvchi qo'shildi")
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
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">
            {isEdit ? "O'qituvchini tahrirlash" : "Yangi o'qituvchi"}
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 text-sm">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <F label="Ism *"      value={form.first_name} onChange={set('first_name')} required />
            <F label="Familiya *" value={form.last_name}  onChange={set('last_name')}  required />
          </div>

          <F label="Email *"    value={form.email}    onChange={set('email')}    type="email" required />
          <F label="Username *" value={form.username} onChange={set('username')} required />
          <F label="Telefon"    value={form.phone}    onChange={set('phone')}    placeholder="+998901234567" />

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {isEdit ? 'Yangi parol (o\'zgartirmasangiz bo\'sh qoldiring)' : 'Parol *'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              required={!isEdit}
              placeholder={isEdit ? '••••••••' : 'Kamida 6 belgi'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              Bekor
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saqlanmoqda...' : isEdit ? 'Saqlash' : "Qo'shish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function F({ label, value, onChange, type = 'text', required, placeholder }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
    </div>
  )
}

/* ── Asosiy sahifa ── */
export default function Teachers() {
  const [teachers,  setTeachers]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [importing, setImporting] = useState(false)
  const [result,    setResult]    = useState(null)
  const [search,    setSearch]    = useState('')
  const [modal,     setModal]     = useState(null)   // null | 'create' | teacher obj
  const fileRef = useRef()

  const load = () => {
    setLoading(true)
    usersApi.listTeachers()
      .then(({ data }) => setTeachers(data))
      .catch(() => toast.error("Ro'yxatni yuklashda xato"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleImport(file) {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['csv', 'xlsx'].includes(ext)) {
      toast.error('Faqat .csv yoki .xlsx fayl yuklang')
      return
    }
    setImporting(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await usersApi.importTeachers(fd)
      setResult(data)
      toast.success(`${data.created} ta o'qituvchi qo'shildi`)
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Import xatosi')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(teacher) {
    if (!confirm(`${teacher.first_name} ${teacher.last_name} ni o'chirishni tasdiqlaysizmi?`)) return
    try {
      await usersApi.deleteTeacher(teacher.id)
      toast.success("O'qituvchi o'chirildi")
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Xatolik')
    }
  }

  const filtered = teachers.filter((t) =>
    `${t.first_name} ${t.last_name} ${t.email} ${t.username}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">

      {/* Sarlavha */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">O'qituvchilar</h1>
        <button
          onClick={() => setModal('create')}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700 font-medium"
        >
          + Qo'shish
        </button>
      </div>

      {/* Import panel */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">CSV yoki Excel import</p>
            <p className="text-xs text-gray-400">Ustunlar: Ism, Familiya, Email, Telefon, Login, Parol</p>
          </div>
          <div className="flex gap-2 ml-auto flex-wrap">
            <a
              href="#"
              className="text-sm text-blue-600 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-50"
              onClick={(e) => {
                e.preventDefault()
                const csv = "first_name,last_name,email,phone,username,password\nJasur,Toshmatov,jasur@element.uz,+998901234567,jasur.toshmatov,Teacher@1234"
                const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a'); a.href = url; a.download = 'namunaviy_uqituvchilar.csv'; a.click()
              }}
            >
              Namuna CSV
            </a>
            <label className={`cursor-pointer bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg text-sm hover:bg-blue-100 ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
              {importing ? 'Yuklanmoqda...' : 'Excel import'}
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => handleImport(e.target.files[0])}
              />
            </label>
          </div>
        </div>

        {/* Import natijasi */}
        {result && (
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-green-600">{result.created}</p>
              <p className="text-xs text-green-500">Qo'shildi</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-yellow-500">{result.skipped}</p>
              <p className="text-xs text-yellow-400">O'tkazildi</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-red-500">{result.errors}</p>
              <p className="text-xs text-red-400">Xato</p>
            </div>
          </div>
        )}
      </div>

      {/* Qidiruv */}
      <input
        type="text"
        placeholder="Ism, familiya, email yoki login bo'yicha qidirish..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />

      {/* Jadval */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        {loading ? (
          <p className="text-gray-400 text-sm p-6">Yuklanmoqda...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <p className="text-4xl mb-3">👨‍🏫</p>
            <p className="text-sm">O'qituvchilar topilmadi</p>
            <button onClick={() => setModal('create')} className="mt-3 text-blue-600 text-sm hover:underline font-medium">
              + Birinchi o'qituvchini qo'shing
            </button>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-3">#</th>
                <th className="text-left px-5 py-3">Ism Familiya</th>
                <th className="text-left px-5 py-3">Login</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Telefon</th>
                <th className="text-right px-5 py-3">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t, i) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-5 py-3 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {t.first_name[0]}{t.last_name[0]}
                      </div>
                      <span className="font-medium text-gray-800">{t.first_name} {t.last_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500 font-mono text-xs">{t.username}</td>
                  <td className="px-5 py-3 text-gray-500">{t.email}</td>
                  <td className="px-5 py-3 text-gray-500">{t.phone || '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setModal(t)}
                        className="text-blue-600 text-xs hover:underline font-medium"
                      >
                        Tahrirlash
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
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
        )}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t text-xs text-gray-400">
            Jami: {filtered.length} ta o'qituvchi
          </div>
        )}
      </div>

      {/* Modal */}
      {modal !== null && (
        <TeacherModal
          teacher={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
