import { useState } from 'react'
import { aiApi } from '../services/api'
import toast from 'react-hot-toast'
import { Sparkles, X } from 'lucide-react'

export default function AiQuestionGenerator({ onAdd, onClose }) {
  const [topic,      setTopic]      = useState('')
  const [subject,    setSubject]    = useState('')
  const [count,      setCount]      = useState(10)
  const [difficulty, setDifficulty] = useState('medium')
  const [loading,    setLoading]    = useState(false)
  const [questions,  setQuestions]  = useState([])
  const [selected,   setSelected]   = useState(new Set())

  const generate = async () => {
    if (!topic.trim()) { toast.error('Mavzuni kiriting'); return }
    setLoading(true)
    setQuestions([])
    setSelected(new Set())
    try {
      const { data } = await aiApi.generateQuestions({ topic, subject, count, difficulty })
      setQuestions(data.questions || [])
      setSelected(new Set((data.questions || []).map((_, i) => i)))
      toast.success(`${data.questions?.length ?? 0} ta savol yaratildi`)
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Xato yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  const toggle = (i) => setSelected(prev => {
    const next = new Set(prev)
    next.has(i) ? next.delete(i) : next.add(i)
    return next
  })

  const addSelected = () => {
    const toAdd = questions.filter((_, i) => selected.has(i))
    if (toAdd.length === 0) { toast.error('Kamida bitta savol tanlang'); return }
    onAdd(toAdd)
    toast.success(`${toAdd.length} ta savol qo'shildi`)
    onClose()
  }

  const OPTS = ['A','B','C','D']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-slate-800">AI bilan savol yaratish</h2>
            <p className="text-xs text-slate-400">Claude AI avtomatik test savollari generatsiya qiladi</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-4 border-b border-slate-50 shrink-0 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mavzu *</label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generate()}
              placeholder="Masalan: Ikkinchi darajali tenglamalar, Python funksiyalar..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fan</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Matematika..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Savollar soni</label>
              <select value={count} onChange={e => setCount(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white">
                {[5,10,15,20].map(n => <option key={n} value={n}>{n} ta</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Qiyinlik</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white">
                <option value="easy">Oson</option>
                <option value="medium">O'rta</option>
                <option value="hard">Qiyin</option>
              </select>
            </div>
          </div>
          <button onClick={generate} disabled={loading || !topic.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                AI yaratyapti…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {questions.length > 0 ? 'Qayta yaratish' : 'Savollar yaratish'}
              </>
            )}
          </button>
        </div>

        {/* Questions */}
        {questions.length > 0 && (
          <>
            <div className="flex items-center justify-between px-6 py-2.5 border-b border-slate-50 shrink-0">
              <p className="text-xs font-semibold text-slate-500">
                {selected.size} / {questions.length} ta tanlangan
              </p>
              <div className="flex gap-2">
                <button onClick={() => setSelected(new Set(questions.map((_, i) => i)))}
                  className="text-xs text-indigo-600 hover:underline font-medium">Hammasini tanla</button>
                <button onClick={() => setSelected(new Set())}
                  className="text-xs text-slate-400 hover:underline">Bekor qil</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-3">
              {questions.map((q, i) => {
                const sel = selected.has(i)
                return (
                  <div key={i}
                    onClick={() => toggle(i)}
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${
                      sel ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                    }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        sel ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'
                      }`}>
                        {sel && <svg viewBox="0 0 12 10" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="1 5 4.5 8.5 11 1"/></svg>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 mb-2">
                          <span className="text-slate-400 mr-1.5">{i + 1}.</span>
                          {q.question_text}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {OPTS.map(opt => {
                            const val = q[`option_${opt.toLowerCase()}`]
                            const isCorrect = q.correct_answer === opt
                            return (
                              <div key={opt}
                                className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 ${
                                  isCorrect
                                    ? 'bg-emerald-100 text-emerald-700 font-semibold'
                                    : 'bg-white text-slate-500 border border-slate-100'
                                }`}>
                                <span className={`font-bold ${isCorrect ? 'text-emerald-600' : 'text-slate-300'}`}>{opt}.</span>
                                {val}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button onClick={onClose}
                className="flex-1 border border-slate-200 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                Bekor
              </button>
              <button onClick={addSelected} disabled={selected.size === 0}
                className="flex-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', minWidth: 160 }}>
                {selected.size} ta savol qo'shish
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
