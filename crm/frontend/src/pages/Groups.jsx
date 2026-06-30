import { useEffect, useState } from 'react'
import { groupsApi } from '../services/api'
import toast from 'react-hot-toast'

export default function Groups() {
  const [groups, setGroups] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editGroup, setEditGroup] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', telegram_group_link: '', start_date: '', end_date: '' })

  const load = () => groupsApi.list().then(({ data }) => setGroups(data)).catch(() => {})

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditGroup(null)
    setForm({ name: '', description: '', telegram_group_link: '', start_date: '', end_date: '' })
    setShowModal(true)
  }

  const openEdit = (g) => {
    setEditGroup(g)
    setForm({ name: g.name, description: g.description || '', telegram_group_link: g.telegram_group_link || '', start_date: g.start_date || '', end_date: g.end_date || '' })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = { ...form }
      if (!data.start_date) delete data.start_date
      if (!data.end_date) delete data.end_date

      if (editGroup) {
        await groupsApi.update(editGroup.id, data)
        toast.success('Guruh yangilandi')
      } else {
        await groupsApi.create(data)
        toast.success("Guruh qo'shildi")
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
      await groupsApi.delete(id)
      toast.success("Guruh o'chirildi")
      load()
    } catch {
      toast.error('Xatolik')
    }
  }

  const days = { monday: "Dushanba", tuesday: "Seshanba", wednesday: "Chorshanba", thursday: "Payshanba", friday: "Juma", saturday: "Shanba", sunday: "Yakshanba" }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Guruhlar</h1>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          + Qo'shish
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((g) => (
          <div key={g.id} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-800">{g.name}</h3>
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                {g.student_count} o'quvchi
              </span>
            </div>
            {g.description && <p className="text-sm text-gray-500 mb-3">{g.description}</p>}
            {g.teacher_name && <p className="text-xs text-gray-400 mb-1">O'qituvchi: {g.teacher_name}</p>}
            {g.schedule && (
              <div className="text-xs text-gray-400 mb-3">
                {Object.entries(g.schedule).map(([d, t]) => (
                  <span key={d} className="mr-2">{days[d] || d}: {t}</span>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-3 border-t border-gray-100">
              <button onClick={() => openEdit(g)} className="text-blue-600 text-xs hover:underline">Tahrirlash</button>
              <button onClick={() => handleDelete(g.id)} className="text-red-500 text-xs hover:underline">O'chirish</button>
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="col-span-3 text-center text-gray-400 py-12">Guruhlar topilmadi</p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">{editGroup ? 'Guruhni tahrirlash' : 'Yangi guruh'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Guruh nomi *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Tavsif</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Telegram guruh linki</label>
                <input type="text" value={form.telegram_group_link} onChange={(e) => setForm({ ...form, telegram_group_link: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Boshlanish sanasi</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tugash sanasi</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
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
