import { useEffect, useState } from 'react'
import { superAdminApi } from '../services/api'
import toast from 'react-hot-toast'
import { Users, Shield, Plus, Pencil, Trash2, Check, X } from 'lucide-react'

const ROLE_LABELS = {
  admin:   { label: 'Admin',       color: 'bg-blue-100 text-blue-700' },
  teacher: { label: "O'qituvchi",  color: 'bg-green-100 text-green-700' },
  student: { label: "O'quvchi",    color: 'bg-purple-100 text-purple-700' },
}

const ROLE_TABS = [
  { key: 'admin',   label: 'Adminlar' },
  { key: 'teacher', label: "O'qituvchilar" },
  { key: 'student', label: "O'quvchilar" },
]

function PermissionModal({ user, modules, onClose, onSaved }) {
  const [selected, setSelected] = useState(
    user.permissions === null ? null : (user.permissions || [])
  )
  const [allAccess, setAllAccess] = useState(user.permissions === null)
  const [saving, setSaving] = useState(false)

  const toggle = (key) => {
    if (allAccess) return
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await superAdminApi.setPermissions(user.id, allAccess ? null : selected)
      toast.success("Ruxsatlar saqlandi")
      onSaved()
      onClose()
    } catch {
      toast.error('Xatolik')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800">Ruxsatlar</h2>
            <p className="text-xs text-gray-500">{user.first_name} {user.last_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl cursor-pointer">
          <div
            onClick={() => { setAllAccess(v => !v); if (!allAccess) setSelected([]) }}
            className={`w-10 h-6 rounded-full relative transition-colors ${allAccess ? 'bg-blue-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${allAccess ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
          <span className="text-sm font-medium text-blue-700">Barcha bo'limlarga kirish</span>
        </label>

        <div className={`grid grid-cols-2 gap-2 ${allAccess ? 'opacity-40 pointer-events-none' : ''}`}>
          {modules.map(m => {
            const on = selected?.includes(m.key)
            return (
              <button
                key={m.key}
                onClick={() => toggle(m.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  on
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {on && <Check className="w-3.5 h-3.5 shrink-0" />}
                {m.label}
              </button>
            )
          })}
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
            Bekor
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
    </div>
  )
}

function UserFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial
  const [form, setForm] = useState({
    first_name: initial?.first_name || '',
    last_name:  initial?.last_name  || '',
    email:      initial?.email      || '',
    username:   initial?.username   || '',
    phone:      initial?.phone      || '',
    password:   '',
    role:       initial?.role       || 'admin',
    is_active:  initial?.is_active  ?? true,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.first_name || !form.last_name || !form.email || !form.username) {
      return toast.error("Majburiy maydonlarni to'ldiring")
    }
    if (!isEdit && !form.password) return toast.error("Parol kiritilmadi")
    setSaving(true)
    try {
      const payload = {
        first_name: form.first_name,
        last_name:  form.last_name,
        email:      form.email,
        username:   form.username,
        phone:      form.phone || undefined,
        role:       form.role,
      }
      if (form.password) payload.password = form.password
      if (isEdit) payload.is_active = form.is_active

      if (isEdit) {
        await superAdminApi.updateUser(initial.id, payload)
      } else {
        await superAdminApi.createUser(payload)
      }
      toast.success(isEdit ? 'Yangilandi' : "Yaratildi")
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Xatolik')
    } finally {
      setSaving(false)
    }
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-800">{isEdit ? 'Tahrirlash' : 'Yangi foydalanuvchi'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ism *"      value={form.first_name} onChange={v => set('first_name', v)} />
          <Field label="Familiya *" value={form.last_name}  onChange={v => set('last_name', v)} />
        </div>
        <Field label="Email *"    value={form.email}    onChange={v => set('email', v)}    type="email" />
        <Field label="Username *" value={form.username} onChange={v => set('username', v)} />
        <Field label="Telefon"    value={form.phone}    onChange={v => set('phone', v)}    placeholder="+998901234567" />
        <Field label={isEdit ? 'Yangi parol (o\'zgartirilsa)' : 'Parol *'}
               value={form.password} onChange={v => set('password', v)} type="password" />

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
          <select
            value={form.role}
            onChange={e => set('role', e.target.value)}
            disabled={isEdit}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
          >
            <option value="admin">Admin</option>
            <option value="teacher">O'qituvchi</option>
            <option value="student">O'quvchi</option>
          </select>
        </div>

        {isEdit && (
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set('is_active', !form.is_active)}
              className={`w-10 h-6 rounded-full relative transition-colors ${form.is_active ? 'bg-blue-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <span className="text-sm text-gray-700">{form.is_active ? 'Faol' : "Faol emas"}</span>
          </label>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
            Bekor
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saqlanmoqda...' : isEdit ? 'Saqlash' : 'Yaratish'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SuperAdmin() {
  const [tab,     setTab]     = useState('admin')
  const [users,   setUsers]   = useState([])
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(false)
  const [formUser,  setFormUser]  = useState(null)  // null=closed, {}=create, {user}=edit
  const [permUser,  setPermUser]  = useState(null)
  const [showForm,  setShowForm]  = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [{ data: u }, { data: m }] = await Promise.all([
        superAdminApi.listUsers(tab),
        superAdminApi.getModules(),
      ])
      setUsers(u)
      setModules(m)
    } catch {
      toast.error('Yuklab bo\'lmadi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tab])

  const handleDelete = async (u) => {
    if (!confirm(`${u.first_name} ${u.last_name} — o'chirishni tasdiqlaysizmi?`)) return
    try {
      await superAdminApi.deleteUser(u.id)
      toast.success("O'chirildi")
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Xatolik')
    }
  }

  const roleInfo = ROLE_LABELS[tab] || {}

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Boshqaruv paneli</h1>
            <p className="text-xs text-gray-400">Super Admin</p>
          </div>
        </div>
        <button
          onClick={() => { setFormUser(null); setShowForm(true) }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Yangi
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        {ROLE_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Users table */}
      {loading ? (
        <p className="text-gray-400 text-sm text-center py-10">Yuklanmoqda...</p>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Hozircha yo'q</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ism</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Username</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                {tab === 'admin' && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ruxsatlar</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Holat</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{u.first_name} {u.last_name}</div>
                    {u.phone && <div className="text-xs text-gray-400">{u.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">@{u.username}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                  {tab === 'admin' && (
                    <td className="px-4 py-3">
                      {u.permissions === null || !u.permissions ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Hammasi</span>
                      ) : u.permissions.length === 0 ? (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Hech narsa</span>
                      ) : (
                        <span className="text-xs text-gray-600">{u.permissions.length} ta modul</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {u.is_active ? 'Faol' : 'Faol emas'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {tab === 'admin' && (
                        <button
                          onClick={() => setPermUser(u)}
                          className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Ruxsatlar"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => { setFormUser(u); setShowForm(true) }}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Tahrirlash"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="O'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <UserFormModal
          initial={formUser}
          onClose={() => { setShowForm(false); setFormUser(null) }}
          onSaved={load}
        />
      )}

      {permUser && (
        <PermissionModal
          user={permUser}
          modules={modules}
          onClose={() => setPermUser(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
