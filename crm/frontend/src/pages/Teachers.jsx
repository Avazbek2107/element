import { useEffect, useState, useRef } from 'react'
import { usersApi } from '../services/api'
import toast from 'react-hot-toast'

export default function Teachers() {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [search, setSearch] = useState('')
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

  const filtered = teachers.filter((t) =>
    `${t.first_name} ${t.last_name} ${t.email}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">O'qituvchilar</h1>

      {/* Import panel */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">CSV yoki Excel import</p>
            <p className="text-xs text-gray-400">Ustunlar: Ism, Familiya, Email, Telefon, Login, Parol, Fan</p>
          </div>
          <div className="flex gap-2 ml-auto flex-wrap">
            <a
              href="/api/users/sample-file"
              download
              className="text-sm text-blue-600 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-50"
              onClick={(e) => {
                e.preventDefault()
                // Namunaviy CSV yuklab olish
                const csv = "first_name,last_name,email,phone,username,password,subject\nJasur,Toshmatov,jasur@element.uz,+998901234567,jasur.toshmatov,Teacher@1234,Matematika"
                const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a'); a.href = url; a.download = 'namunaviy_uqituvchilar.csv'; a.click()
              }}
            >
              Namuna CSV
            </a>
            <label className={`cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
              {importing ? 'Yuklanmoqda...' : 'Fayl yuklash'}
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
              <p className="text-xs text-yellow-400">O'tkazib yuborildi</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-red-500">{result.errors}</p>
              <p className="text-xs text-red-400">Xato</p>
            </div>
          </div>
        )}

        {/* Xato tafsilotlari */}
        {result?.details?.skipped?.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 font-medium mb-1">O'tkazib yuborilganlar:</p>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {result.details.skipped.map((s, i) => (
                <p key={i} className="text-xs text-gray-400">{s.email} — {s.reason}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Ism, familiya yoki email bo'yicha qidirish..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />

      {/* Jadval */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-gray-400 text-sm p-6">Yuklanmoqda...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 text-sm p-6">O'qituvchilar topilmadi</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-3">#</th>
                <th className="text-left px-5 py-3">Ism Familiya</th>
                <th className="text-left px-5 py-3">Login</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Telefon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t, i) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">
                    {t.first_name} {t.last_name}
                  </td>
                  <td className="px-5 py-3 text-gray-500 font-mono text-xs">{t.username}</td>
                  <td className="px-5 py-3 text-gray-500">{t.email}</td>
                  <td className="px-5 py-3 text-gray-500">{t.phone || '—'}</td>
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
    </div>
  )
}
