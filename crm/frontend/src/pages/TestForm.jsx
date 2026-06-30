import { useEffect, useState, useRef } from 'react'
import { testsApi, groupsApi } from '../services/api'
import toast from 'react-hot-toast'

const LATEX_BUTTONS = [
  { label: 'a/b', code: '\\frac{a}{b}' },
  { label: '√x', code: '\\sqrt{x}' },
  { label: 'x²', code: 'x^{2}' },
  { label: 'xₙ', code: 'x_{n}' },
  { label: '∫', code: '\\int' },
  { label: 'Σ', code: '\\sum' },
  { label: 'π', code: '\\pi' },
  { label: '∞', code: '\\infty' },
  { label: '≤', code: '\\leq' },
  { label: '≥', code: '\\geq' },
  { label: '≠', code: '\\neq' },
  { label: '×', code: '\\times' },
  { label: '÷', code: '\\div' },
  { label: '±', code: '\\pm' },
  { label: 'α', code: '\\alpha' },
  { label: 'β', code: '\\beta' },
]

function LatexInput({ label, value, onChange }) {
  const ref = useRef(null)

  const insert = (code) => {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const newVal = value.slice(0, start) + code + value.slice(end)
    onChange(newVal)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + code.length, start + code.length)
    }, 0)
  }

  return (
    <div className="space-y-1">
      <label className="block text-xs text-gray-600">{label}</label>
      <div className="flex flex-wrap gap-1 mb-1">
        {LATEX_BUTTONS.map((b) => (
          <button key={b.code} type="button" onClick={() => insert(b.code)}
            className="px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-100">
            {b.label}
          </button>
        ))}
      </div>
      <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} rows={2}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  )
}

const emptyQuestion = () => ({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', points: 1 })

export default function TestForm({ onBack }) {
  const [groups, setGroups] = useState([])
  const [saving, setSaving] = useState(false)
  const [meta, setMeta] = useState({
    title: '', description: '', group_id: '', test_type: 'practice',
    duration_minutes: 30, passing_score: 50,
  })
  const [questions, setQuestions] = useState([emptyQuestion()])

  useEffect(() => {
    groupsApi.list().then(({ data }) => setGroups(data)).catch(() => {})
  }, [])

  const updateQ = (i, field, val) => {
    setQuestions((prev) => prev.map((q, idx) => idx === i ? { ...q, [field]: val } : q))
  }

  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()])
  const removeQuestion = (i) => setQuestions((prev) => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (questions.some(q => !q.question_text || !q.option_a || !q.option_b || !q.option_c || !q.option_d)) {
      toast.error('Barcha savol va variantlarni to\'ldiring')
      return
    }
    setSaving(true)
    try {
      const data = { ...meta, questions }
      if (data.group_id) data.group_id = parseInt(data.group_id)
      else delete data.group_id
      await testsApi.create(data)
      toast.success('Test yaratildi')
      onBack()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Xatolik')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700">← Orqaga</button>
        <h1 className="text-2xl font-bold text-gray-800">Yangi test yaratish</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* Meta */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">Test ma'lumotlari</h2>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Sarlavha *</label>
            <input type="text" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Test turi</label>
              <select value={meta.test_type} onChange={(e) => setMeta({ ...meta, test_type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="practice">Amaliyot</option>
                <option value="weekly">Haftalik</option>
                <option value="monthly">Oylik</option>
                <option value="final">Yakuniy</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Guruh</label>
              <select value={meta.group_id} onChange={(e) => setMeta({ ...meta, group_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Barcha guruhlar</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Davomiyligi (daqiqa)</label>
              <input type="number" min={1} value={meta.duration_minutes} onChange={(e) => setMeta({ ...meta, duration_minutes: +e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">O'tish bali (%)</label>
              <input type="number" min={1} max={100} value={meta.passing_score} onChange={(e) => setMeta({ ...meta, passing_score: +e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        {/* Savollar */}
        {questions.map((q, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">{i + 1}-savol</h3>
              {questions.length > 1 && (
                <button type="button" onClick={() => removeQuestion(i)} className="text-red-400 text-sm hover:text-red-600">O'chirish</button>
              )}
            </div>
            <LatexInput label="Savol matni *" value={q.question_text} onChange={(v) => updateQ(i, 'question_text', v)} />
            <div className="grid grid-cols-2 gap-4">
              {['a', 'b', 'c', 'd'].map((opt) => (
                <div key={opt}>
                  <label className="block text-xs text-gray-600 mb-1">{opt.toUpperCase()} varianti</label>
                  <input type="text" value={q[`option_${opt}`]} onChange={(e) => updateQ(i, `option_${opt}`, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              ))}
            </div>
            <div className="flex gap-4 items-center">
              <div>
                <label className="block text-xs text-gray-600 mb-1">To'g'ri javob</label>
                <select value={q.correct_answer} onChange={(e) => updateQ(i, 'correct_answer', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {['A', 'B', 'C', 'D'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Ball</label>
                <input type="number" min={1} max={10} value={q.points} onChange={(e) => updateQ(i, 'points', +e.target.value)}
                  className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={addQuestion}
          className="w-full border-2 border-dashed border-gray-300 py-3 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
          + Savol qo'shish
        </button>

        <div className="flex gap-3">
          <button type="button" onClick={onBack} className="flex-1 border border-gray-300 py-2.5 rounded-lg text-sm">Bekor</button>
          <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saqlanmoqda...' : 'Test yaratish'}
          </button>
        </div>
      </form>
    </div>
  )
}
