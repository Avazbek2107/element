import { useState } from 'react'
import { testsApi } from '../services/api'
import toast from 'react-hot-toast'

const VALID_RE = /^[A-Da-d]*$/

export default function PaperTestModal({ groups, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    group_id: '',
    answer_key: '',
    test_type: 'practice',
    passing_score: 50,
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleKey = (e) => {
    const val = e.target.value.toUpperCase()
    if (VALID_RE.test(val)) set('answer_key', val)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Test nomi kiritilmagan'); return }
    if (!form.answer_key.trim()) { toast.error('Javoblar kiritilmagan'); return }

    setSaving(true)
    try {
      await testsApi.create({
        title: form.title.trim(),
        description: '',
        group_id: form.group_id ? Number(form.group_id) : null,
        test_type: form.test_type,
        duration_minutes: 0,
        passing_score: Number(form.passing_score),
        answer_key: form.answer_key,
        questions: [],
      })
      toast.success("Qog'oz test yaratildi va nashr etildi")
      onCreated()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Xatolik yuz berdi')
    } finally {
      setSaving(false)
    }
  }

  const count = form.answer_key.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">📄 Qog'oz test yaratish</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <p className="text-xs text-gray-500 bg-blue-50 rounded-xl p-3">
          O'quvchilar qog'ozda testni ishlab, botga <b>/javob [ID] ABCDA</b> formatida javob yuboradilar.
          Tizim avtomatik tekshiradi.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Test nomi *</label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Masalan: Matematika — 1-variant"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Guruh</label>
              <select
                value={form.group_id}
                onChange={e => set('group_id', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Barcha guruhlar</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">O'tish bali (%)</label>
              <input
                type="number" min="0" max="100"
                value={form.passing_score}
                onChange={e => set('passing_score', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              To'g'ri javoblar * &nbsp;
              <span className="text-gray-400 font-normal">(faqat A, B, C, D harflari)</span>
            </label>
            <textarea
              value={form.answer_key}
              onChange={handleKey}
              placeholder="Masalan: ABCDABCDA..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            />
            <p className="text-xs text-gray-400 mt-0.5 text-right">{count} ta savol</p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
            Bekor
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saqlanmoqda...' : 'Yaratish va nashr etish'}
          </button>
        </div>
      </div>
    </div>
  )
}
