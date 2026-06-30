import { useEffect, useState } from 'react'
import { materialsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

/* ── Modul modal ── */
function ModuleModal({ mod, onClose, onSaved }) {
  const [form, setForm] = useState({ name: mod?.name ?? '', description: mod?.description ?? '' })
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      mod
        ? await materialsApi.updateModule(mod.id, form)
        : await materialsApi.createModule(form)
      toast.success(mod ? 'Modul yangilandi' : "Modul qo'shildi")
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Xatolik')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800">{mod ? 'Modulni tahrirlash' : 'Yangi modul'}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 text-xs">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Nomi *</label>
            <input
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Masalan: 1-modul, Python asoslari"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Tavsif</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none"
              placeholder="Qo'shimcha ma'lumot"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Bekor</button>
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Mavzu modal ── */
function TopicModal({ topic, moduleId, onClose, onSaved }) {
  const [form, setForm] = useState({ title: topic?.title ?? '', content: topic?.content ?? '' })
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      topic
        ? await materialsApi.updateTopic(topic.id, form)
        : await materialsApi.createTopic(moduleId, form)
      toast.success(topic ? 'Mavzu yangilandi' : "Mavzu qo'shildi")
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Xatolik')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800">{topic ? 'Mavzuni tahrirlash' : 'Yangi mavzu'}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 text-xs">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Mavzu nomi *</label>
            <input
              required
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Masalan: O'zgaruvchilar va ma'lumot turlari"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Kontent / Tavsif</label>
            <textarea
              rows={5}
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none"
              placeholder="Mavzu haqida batafsil ma'lumot..."
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Bekor</button>
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Mavzu kartochkasi ── */
function TopicCard({ topic, canEdit, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
          {topic.order > 0 ? topic.order : '#'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-800 leading-snug">{topic.title}</p>
            {canEdit && (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => onEdit(topic)} className="text-xs text-blue-600 hover:underline font-medium">Tahrir</button>
                <button onClick={() => onDelete(topic.id)} className="text-xs text-red-500 hover:underline">O'chir</button>
              </div>
            )}
          </div>
          {topic.content && (
            <>
              <p className={`text-xs text-gray-500 mt-1.5 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
                {topic.content}
              </p>
              {topic.content.length > 120 && (
                <button onClick={() => setExpanded(v => !v)} className="text-xs text-blue-500 mt-1 hover:underline">
                  {expanded ? 'Yig\'ish' : 'Ko\'proq...'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Modul paneli (o'ng) ── */
function ModulePanel({ mod, canEdit, onTopicChange }) {
  const [topics, setTopics]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)   // null | 'create' | topic obj

  const load = () => {
    setLoading(true)
    materialsApi.listTopics(mod.id)
      .then(({ data }) => setTopics(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [mod.id])

  const handleDelete = async (id) => {
    if (!confirm("Mavzuni o'chirishni tasdiqlaysizmi?")) return
    try {
      await materialsApi.deleteTopic(id)
      toast.success("Mavzu o'chirildi")
      load()
      onTopicChange(mod.id, -1)
    } catch { toast.error('Xatolik') }
  }

  const afterSave = () => {
    setModal(null)
    load()
    onTopicChange(mod.id, modal === 'create' ? 1 : 0)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">{mod.name}</h2>
          {mod.description && <p className="text-sm text-gray-500 mt-0.5">{mod.description}</p>}
        </div>
        {canEdit && (
          <button
            onClick={() => setModal('create')}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-sm hover:bg-blue-700 font-medium flex items-center gap-1.5 shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Mavzu qo'sh
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm py-8 text-center">Yuklanmoqda...</p>
      ) : topics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-gray-400">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </div>
          <p className="text-gray-400 text-sm">Hali mavzular kiritilmagan</p>
          {canEdit && (
            <button onClick={() => setModal('create')} className="mt-3 text-blue-600 text-sm hover:underline font-medium">
              + Birinchi mavzuni qo'shing
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {topics.map(t => (
            <TopicCard
              key={t.id}
              topic={t}
              canEdit={canEdit}
              onEdit={t => setModal(t)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {modal !== null && (
        <TopicModal
          topic={modal === 'create' ? null : modal}
          moduleId={mod.id}
          onClose={() => setModal(null)}
          onSaved={afterSave}
        />
      )}
    </div>
  )
}

/* ── Asosiy sahifa ── */
export default function Materials() {
  const { user } = useAuth()
  const canEdit = user?.role === 'admin' || user?.role === 'teacher'

  const [modules,  setModules]  = useState([])
  const [selected, setSelected] = useState(null)   // selected module obj
  const [loading,  setLoading]  = useState(true)
  const [modModal, setModModal] = useState(null)   // null | 'create' | module obj

  const load = () => {
    setLoading(true)
    materialsApi.listModules()
      .then(({ data }) => {
        setModules(data)
        if (data.length > 0 && !selected) setSelected(data[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDeleteModule = async (id) => {
    if (!confirm("Modulni o'chirishni tasdiqlaysizmi? Barcha mavzular ham o'chadi.")) return
    try {
      await materialsApi.deleteModule(id)
      toast.success("Modul o'chirildi")
      if (selected?.id === id) setSelected(null)
      load()
    } catch { toast.error('Xatolik') }
  }

  const afterModSave = (wasEdit) => {
    setModModal(null)
    materialsApi.listModules().then(({ data }) => {
      setModules(data)
      if (!wasEdit && data.length > 0) setSelected(data[data.length - 1])
    })
  }

  /* topic count o'zgarganda modulni yangilash */
  const handleTopicChange = (moduleId, delta) => {
    if (delta === 0) return
    setModules(prev => prev.map(m =>
      m.id === moduleId ? { ...m, topics: delta > 0 ? [...(m.topics||[]), {}] : (m.topics||[]).slice(0, -1) } : m
    ))
  }

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Sarlavha */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">O'quv materiallari</h1>
        {canEdit && (
          <button
            onClick={() => setModModal('create')}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700 font-medium"
          >
            + Modul qo'sh
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm py-16 text-center">Yuklanmoqda...</p>
      ) : modules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-blue-400">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <p className="text-gray-500 font-medium mb-1">Hali modullar kiritilmagan</p>
          {canEdit && (
            <button onClick={() => setModModal('create')} className="mt-2 text-blue-600 text-sm hover:underline font-medium">
              + Birinchi modulni yarating
            </button>
          )}
        </div>
      ) : (
        <div className="flex gap-5 min-h-0 flex-1">

          {/* ── Chap: modullar ro'yxati ── */}
          <div className="w-64 shrink-0 flex flex-col gap-2">
            {modules.map((m, i) => (
              <div
                key={m.id}
                onClick={() => setSelected(m)}
                className={`rounded-xl px-4 py-3 cursor-pointer border transition-all ${
                  selected?.id === m.id
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                    : 'bg-white border-gray-100 text-gray-700 hover:border-blue-200 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      selected?.id === m.id ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {i + 1}
                    </span>
                    <p className="text-sm font-semibold truncate">{m.name}</p>
                  </div>
                  {canEdit && selected?.id !== m.id && (
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setModModal(m)}
                        className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteModule(m.id)}
                        className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <div className={`flex items-center gap-1 mt-1.5 ml-8.5 ${selected?.id === m.id ? 'text-blue-100' : 'text-gray-400'}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  </svg>
                  <span className="text-xs">{m.topics?.length ?? 0} ta mavzu</span>
                </div>
              </div>
            ))}

            {/* Tez modul qo'shish */}
            {canEdit && (
              <button
                onClick={() => setModModal('create')}
                className="rounded-xl px-4 py-3 border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Modul qo'sh
              </button>
            )}
          </div>

          {/* ── O'ng: mavzular ── */}
          <div className="flex-1 min-w-0 bg-gray-50 rounded-2xl p-5 overflow-y-auto">
            {selected ? (
              <ModulePanel
                key={selected.id}
                mod={selected}
                canEdit={canEdit}
                onTopicChange={handleTopicChange}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Chap tarafdan modulni tanlang
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modul modal */}
      {modModal !== null && (
        <ModuleModal
          mod={modModal === 'create' ? null : modModal}
          onClose={() => setModModal(null)}
          onSaved={() => afterModSave(modModal !== 'create')}
        />
      )}
    </div>
  )
}
