import { useEffect, useState } from 'react'
import { studentsApi, groupsApi } from '../services/api'
import toast from 'react-hot-toast'

export default function Students() {
  const [students, setStudents] = useState([])
  const [groups, setGroups] = useState([])
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editStudent, setEditStudent] = useState(null)
  const [form, setForm] = useState({
    username: '', email: '', password: '', first_name: '', last_name: '',
    phone: '', group_id: '', birth_date: '', parent_phone: '', address: '',
  })

  const load = () => {
    const params = {}
    if (search) params.search = search
    if (groupFilter) params.group_id = groupFilter
    studentsApi.list(params).then(({ data }) => setStudents(data)).catch(() => {})
  }

  useEffect(() => {
    groupsApi.list().then(({ data }) => setGroups(data)).catch(() => {})
  }, [])

  useEffect(() => { load() }, [search, groupFilter])

  const openCreate = () => {
    setEditStudent(null)
    setForm({ username: '', email: '', password: '', first_name: '', last_name: '', phone: '', group_id: '', birth_date: '', parent_phone: '', address: '' })
    setShowModal(true)
  }

  const openEdit = (s) => {
    setEditStudent(s)
    setForm({ first_name: s.first_name, last_name: s.last_name, phone: s.phone || '', group_id: s.group_id || '', parent_phone: s.parent_phone || '', address: s.address || '' })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = { ...form }
      if (data.group_id) data.group_id = parseInt(data.group_id)
      if (!data.birth_date) delete data.birth_date

      if (editStudent) {
        await studentsApi.update(editStudent.id, data)
        toast.success("O'quvchi yangilandi")
      } else {
        await studentsApi.create(data)
        toast.success("O'quvchi qo'shildi")
      }
      setShowModal(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Xatolik')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return
    try {
      await studentsApi.delete(id)
      toast.success("O'quvchi o'chirildi")
      load()
    } catch {
      toast.error('Xatolik')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">O'quvchilar</h1>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          + Qo'shish
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="text" placeholder="Qidirish..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none">
          <option value="">Barcha guruhlar</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Ism Familiya</th>
              <th className="px-4 py-3 font-medium">Telefon</th>
              <th className="px-4 py-3 font-medium">Guruh</th>
              <th className="px-4 py-3 font-medium">Holat</th>
              <th className="px-4 py-3 font-medium">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{s.first_name} {s.last_name}</td>
                <td className="px-4 py-3 text-gray-600">{s.phone || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{s.group_name || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {s.is_active ? 'Faol' : 'Nofaol'}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => openEdit(s)} className="text-blue-600 hover:underline text-xs">Tahrirlash</button>
                  <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:underline text-xs">O'chirish</button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">O'quvchilar topilmadi</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editStudent ? 'Tahrirlash' : "Yangi o'quvchi"}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {!editStudent && (
                <>
                  <Input label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} required />
                  <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
                  <Input label="Parol" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Input label="Ism" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} required />
                <Input label="Familiya" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} required />
              </div>
              <Input label="Telefon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <div>
                <label className="block text-xs text-gray-600 mb-1">Guruh</label>
                <select value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">— Guruh tanlanmagan —</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <Input label="Tug'ilgan sana" type="date" value={form.birth_date} onChange={(v) => setForm({ ...form, birth_date: v })} />
              <Input label="Ota-ona telefoni" value={form.parent_phone} onChange={(v) => setForm({ ...form, parent_phone: v })} />
              <Input label="Manzil" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Bekor</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', required }) {
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
