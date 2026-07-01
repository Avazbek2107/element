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
      toast.success('Telegram test yaratildi va nashr etildi')
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-800">Telegram test yaratish</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <p className="text-xs text-gray-500 bg-sky-50 rounded-xl p-3">
          O'quvchilar qog'ozda testni ishlab, Telegram botga <b>/javob [ID] ABCDA</b> formatida javob yuboradilar.
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
