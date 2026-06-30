import { useEffect, useState } from 'react'
import { testsApi } from '../services/api'
import toast from 'react-hot-toast'

function useTimer(deadlineAt) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!deadlineAt) return
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(deadlineAt) - Date.now()) / 1000))
      setRemaining(diff)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [deadlineAt])

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  return { remaining, formatted: `${mm}:${ss}` }
}

export default function TestTake({ test, onBack }) {
  const [phase, setPhase] = useState('loading') // loading | taking | result
  const [resultId, setResultId] = useState(null)
  const [deadlineAt, setDeadlineAt] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [current, setCurrent] = useState(0)
  const [result, setResult] = useState(null)
  const { remaining, formatted } = useTimer(deadlineAt)

  useEffect(() => {
    Promise.all([
      testsApi.start(test.id),
      testsApi.getQuestions(test.id),
    ]).then(([startRes, qRes]) => {
      setResultId(startRes.data.result_id)
      setDeadlineAt(startRes.data.deadline_at)
      setQuestions(qRes.data)
      setPhase('taking')
    }).catch((err) => {
      toast.error(err.response?.data?.detail || 'Xatolik')
      onBack()
    })
  }, [])

  // Vaqt tugaganda avtomatik topshirish
  useEffect(() => {
    if (phase === 'taking' && remaining === 0 && deadlineAt) {
      handleSubmit()
    }
  }, [remaining])

  const handleSubmit = async () => {
    if (phase !== 'taking') return
    try {
      const answersArr = Object.entries(answers).map(([question_id, answer]) => ({
        question_id: parseInt(question_id),
        answer,
      }))
      const { data } = await testsApi.submit(test.id, { answers: answersArr })
      setResult(data)
      setPhase('result')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Xatolik')
    }
  }

  if (phase === 'loading') {
    return <div className="text-center py-20 text-gray-400">Yuklanmoqda...</div>
  }

  if (phase === 'result' && result) {
    const gradeColors = { "A'lo": 'green', 'Yaxshi': 'blue', "O'rtacha": 'yellow', 'Yomon': 'red' }
    const color = gradeColors[result.grade] || 'gray'
    return (
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Test natijalari</h1>
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className={`text-6xl font-bold text-${color}-500 mb-2`}>{result.percentage}%</div>
          <div className={`text-xl font-semibold text-${color}-600 mb-6`}>{result.grade}</div>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-800">{result.correct_count}</div>
              <div className="text-xs text-gray-500">To'g'ri</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-800">{result.total_questions - result.correct_count}</div>
              <div className="text-xs text-gray-500">Xato</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-800">{result.total_points}</div>
              <div className="text-xs text-gray-500">Ball</div>
            </div>
          </div>
          <button onClick={onBack} className="bg-blue-600 text-white px-8 py-2.5 rounded-lg text-sm hover:bg-blue-700">
            Testlar ro'yxatiga qaytish
          </button>
        </div>
      </div>
    )
  }

  const q = questions[current]

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">{test.title}</h1>
        <div className={`text-lg font-mono font-bold px-4 py-2 rounded-lg ${remaining < 60 ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
          ⏱ {formatted}
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5 mb-6">
        {questions.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`h-2 flex-1 rounded-full transition-colors ${
              answers[questions[i]?.id] ? 'bg-green-400' : i === current ? 'bg-blue-500' : 'bg-gray-200'
            }`} />
        ))}
      </div>

      {/* Savol */}
      {q && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between text-sm text-gray-400 mb-4">
            <span>{current + 1} / {questions.length}</span>
            <span>{q.points} ball</span>
          </div>
          <p className="text-gray-800 font-medium text-lg mb-6 whitespace-pre-wrap">{q.question_text}</p>
          <div className="space-y-3">
            {['A', 'B', 'C', 'D'].map((opt) => {
              const text = q[`option_${opt.toLowerCase()}`]
              const selected = answers[q.id] === opt
              return (
                <button key={opt} onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors text-sm ${
                    selected ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <span className="font-bold mr-2">{opt}.</span> {text}
                </button>
              )
            })}
          </div>

          <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
            <button onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-40">
              ← Oldingi
            </button>
            {current < questions.length - 1 ? (
              <button onClick={() => setCurrent(current + 1)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                Keyingi →
              </button>
            ) : (
              <button onClick={handleSubmit}
                className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                Topshirish ✓
              </button>
            )}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-gray-400 mt-4">
        Javob berilgan: {Object.keys(answers).length} / {questions.length}
      </p>
    </div>
  )
}
