import { useEffect, useState } from 'react'
import { testsApi } from '../services/api'

const OPT_COLORS = {
  default: 'border-gray-200 bg-white text-gray-700',
  correct: 'border-green-400 bg-green-50 text-green-800 font-medium',
  wrong: 'border-red-300 bg-red-50 text-red-700',
  selected: 'border-blue-400 bg-blue-50 text-blue-800',
}

export default function StudyMode({ test, onBack }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [chosen, setChosen] = useState({})
  const [revealed, setRevealed] = useState({})

  useEffect(() => {
    testsApi.getQuestions(test.id)
      .then(({ data }) => setQuestions(data))
      .finally(() => setLoading(false))
  }, [test.id])

  if (loading) return <div className="text-gray-400 text-sm">Yuklanmoqda...</div>

  const q = questions[current]
  const isRevealed = revealed[current]
  const userAnswer = chosen[current]

  function choose(letter) {
    if (isRevealed) return
    setChosen((p) => ({ ...p, [current]: letter }))
  }

  function reveal() {
    setRevealed((p) => ({ ...p, [current]: true }))
  }

  function optionColor(letter) {
    if (!isRevealed) {
      return userAnswer === letter ? OPT_COLORS.selected : OPT_COLORS.default
    }
    if (letter === q.correct_answer) return OPT_COLORS.correct
    if (userAnswer === letter && letter !== q.correct_answer) return OPT_COLORS.wrong
    return OPT_COLORS.default
  }

  const correctCount = questions.filter((_, i) => revealed[i] && chosen[i] === questions[i]?.correct_answer).length
  const answeredCount = Object.keys(revealed).length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm">← Orqaga</button>
        <h1 className="text-xl font-bold text-gray-800 flex-1">{test.title}</h1>
        <span className="text-sm text-gray-500">
          {answeredCount}/{questions.length} — {answeredCount > 0 ? Math.round(correctCount / answeredCount * 100) : 0}% to'g'ri
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i === current ? 'bg-blue-500' :
              revealed[i]
                ? chosen[i] === questions[i]?.correct_answer ? 'bg-green-400' : 'bg-red-400'
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Question card */}
      {q && (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
          <div className="flex items-start gap-3">
            <span className="text-sm font-bold text-gray-400 shrink-0 mt-0.5">{current + 1}.</span>
            <p className="text-base text-gray-800 leading-relaxed">{q.question_text}</p>
          </div>

          <div className="space-y-2">
            {['A', 'B', 'C', 'D'].map((letter) => {
              const optKey = `option_${letter.toLowerCase()}`
              return (
                <button
                  key={letter}
                  onClick={() => choose(letter)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left text-sm transition-all ${optionColor(letter)}`}
                >
                  <span className="font-bold w-5 shrink-0">{letter}</span>
                  <span>{q[optKey]}</span>
                  {isRevealed && letter === q.correct_answer && (
                    <span className="ml-auto text-green-600 font-bold">✓</span>
                  )}
                  {isRevealed && userAnswer === letter && letter !== q.correct_answer && (
                    <span className="ml-auto text-red-500">✗</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Action row */}
          <div className="flex items-center justify-between pt-2">
            {!isRevealed ? (
              <button
                onClick={reveal}
                className="text-sm text-blue-600 hover:underline"
              >
                Javobni ko'rish
              </button>
            ) : (
              <span className={`text-sm font-medium ${userAnswer === q.correct_answer ? 'text-green-600' : 'text-red-500'}`}>
                {userAnswer === q.correct_answer ? "To'g'ri!" : `To'g'ri javob: ${q.correct_answer}`}
              </span>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                ←
              </button>
              <button
                onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
                disabled={current === questions.length - 1}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {answeredCount === questions.length && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-green-700 font-medium">
            Barcha savollar ko'rib chiqildi — {correctCount}/{questions.length} to'g'ri ({Math.round(correctCount / questions.length * 100)}%)
          </p>
        </div>
      )}
    </div>
  )
}
