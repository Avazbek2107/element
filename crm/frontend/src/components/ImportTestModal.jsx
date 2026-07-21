import { useState, useRef } from 'react'
import { testsApi, groupsApi } from '../services/api'
import toast from 'react-hot-toast'

const ANSWER_COLORS = { A: 'bg-green-100 text-green-700', B: 'bg-blue-100 text-blue-700', C: 'bg-orange-100 text-orange-700', D: 'bg-purple-100 text-purple-700' }

export default function ImportTestModal({ onClose, onCreated, groups }) {
  const [step, setStep] = useState('upload') // upload | preview | meta
  const [parsing, setParsing] = useState(false)
  const [questions, setQuestions] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()

  const [meta, setMeta] = useState({
    title: '',
    group_id: groups[0]?.id || '',
    test_type: 'practice',
    duration_minutes: 30,
    passing_score: 50,
  })

  async function handleFile(file) {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['docx', 'pdf', 'xlsx'].includes(ext)) {
      toast.error("Faqat .docx, .pdf yoki .xlsx fayl yuklang")
      return
    }
    setParsing(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await testsApi.parseFile(fd)
      setQuestions(data.questions)
      setMeta((m) => ({ ...m, title: file.name.replace(/\.[^.]+$/, '') }))
      setStep('preview')
      toast.success(`${data.total} ta savol topildi`)
    } catch (e) {
      toast.error(e.response?.data?.detail || "Faylni o'qishda xato")
    } finally {
      setParsing(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  function updateQuestion(idx, field, value) {
    setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q))
  }

  function removeQuestion(idx) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (!meta.title.trim()) { toast.error("Test nomini kiriting"); return }
    if (!meta.group_id) { toast.error("Guruh tanlang"); return }
    if (questions.length === 0) { toast.error("Kamida 1 ta savol kerak"); return }

    setSaving(true)
    try {
      await testsApi.create({
        title: meta.title,
        group_id: Number(meta.group_id),
        test_type: meta.test_type,
        duration_minutes: Number(meta.duration_minutes),
        passing_score: Number(meta.passing_score),
        questions,
      })
      toast.success("Test yaratildi!")
      onCreated()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.detail || "Xato yuz berdi")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            {step === 'upload' ? "Fayl yuklash" : step === 'preview' ? `Savollar (${questions.length} ta)` : "Test ma'lumotlari"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">

          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Quyidagi formatda Word, PDF yoki Excel fayl yuklang:
              </p>
              <pre className="text-xs bg-gray-50 rounded-lg p-4 text-gray-600 leading-relaxed">
{`1. Savol matni?
A) Variant A
B) Variant B
C) Variant C
D) Variant D
Javob: B

2. Ikkinchi savol?
A) ...
...`}
              </pre>
              <p className="text-xs text-gray-400">
                Excel uchun ustunlar: <code className="bg-gray-50 px-1 rounded">Savol, A, B, C, D, Togri javob, Ball</code>
              </p>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".docx,.pdf,.xlsx"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
                {parsing ? (
                  <p className="text-blue-600 font-medium">Fayl o'qilmoqda...</p>
                ) : (
                  <>
                    <p className="text-gray-400 text-sm">Faylni bu yerga tashlang yoki bosing</p>
                    <p className="text-xs text-gray-300 mt-1">.docx, .pdf yoki .xlsx</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Preview & edit questions */}
          {step === 'preview' && (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={idx} className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-gray-400 mt-1 w-5 shrink-0">{idx + 1}.</span>
                    <textarea
                      value={q.question_text}
                      onChange={(e) => updateQuestion(idx, 'question_text', e.target.value)}
                      rows={2}
                      className="flex-1 text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <button onClick={() => removeQuestion(idx)} className="text-red-400 hover:text-red-600 text-sm mt-1">✕</button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 ml-7">
                    {['a', 'b', 'c', 'd'].map((letter) => (
                      <div key={letter} className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${ANSWER_COLORS[letter.toUpperCase()]}`}>
                          {letter.toUpperCase()}
                        </span>
                        <input
                          value={q[`option_${letter}`]}
                          onChange={(e) => updateQuestion(idx, `option_${letter}`, e.target.value)}
                          className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="ml-7 flex items-center gap-3">
                    <span className="text-xs text-gray-500">To'g'ri javob:</span>
                    {['A', 'B', 'C', 'D'].map((l) => (
                      <button
                        key={l}
                        onClick={() => updateQuestion(idx, 'correct_answer', l)}
                        className={`w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                          q.correct_answer === l
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                    <span className="text-xs text-gray-400 ml-2">Ball:</span>
                    <input
                      type="number"
                      min={1}
                      value={q.points}
                      onChange={(e) => updateQuestion(idx, 'points', Number(e.target.value))}
                      className="w-12 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 3: Test meta */}
          {step === 'meta' && (
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Test nomi</label>
                <input
                  value={meta.title}
                  onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Guruh</label>
                <select
                  value={meta.group_id}
                  onChange={(e) => setMeta((m) => ({ ...m, group_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tur</label>
                  <select
                    value={meta.test_type}
                    onChange={(e) => setMeta((m) => ({ ...m, test_type: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="practice">Mashq</option>
                    <option value="weekly">Haftalik</option>
                    <option value="monthly">Oylik</option>
                    <option value="final">Final</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Vaqt (daqiqa)</label>
                  <input
                    type="number"
                    min={5}
                    value={meta.duration_minutes}
                    onChange={(e) => setMeta((m) => ({ ...m, duration_minutes: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">O'tish bali (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={meta.passing_score}
                    onChange={(e) => setMeta((m) => ({ ...m, passing_score: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                Jami <strong>{questions.length}</strong> ta savol import qilinadi.
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-6 py-4 border-t flex justify-between items-center">
          <div className="flex gap-2">
            {step !== 'upload' && (
              <button
                onClick={() => setStep(step === 'meta' ? 'preview' : 'upload')}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Orqaga
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
              Bekor
            </button>
            {step === 'preview' && (
              <button
                onClick={() => setStep('meta')}
                disabled={questions.length === 0}
                className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Davom etish
              </button>
            )}
            {step === 'meta' && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Saqlanmoqda...' : 'Testni saqlash'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
