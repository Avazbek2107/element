import { useEffect, useState } from 'react'
import { resultsApi, testsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

const GRADE_STYLE = {
  "A'lo":      { bg: 'bg-green-100',  text: 'text-green-700',  bar: 'bg-green-500' },
  'Yaxshi':    { bg: 'bg-blue-100',   text: 'text-blue-700',   bar: 'bg-blue-500'  },
  "O'rtacha":  { bg: 'bg-yellow-100', text: 'text-yellow-700', bar: 'bg-yellow-500'},
  'Yomon':     { bg: 'bg-red-100',    text: 'text-red-600',    bar: 'bg-red-500'   },
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ScoreBar({ pct, grade }) {
  const style = GRADE_STYLE[grade] || GRADE_STYLE['Yomon']
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full ${style.bar}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function GradeBadge({ grade }) {
  const style = GRADE_STYLE[grade] || GRADE_STYLE['Yomon']
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
      {grade}
    </span>
  )
}

/* ─────────────────────────── Student view ─────────────────────────── */
function StudentResults() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    resultsApi.my()
      .then(({ data }) => setResults(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const avg = results.length
    ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)
    : 0
  const passed = results.filter((r) => r.percentage >= 50).length

  if (loading) return <div className="text-center py-20 text-gray-400">Yuklanmoqda...</div>

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">Mening natijalarim</h1>

      {results.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">📝</p>
          <p>Siz hali hech qanday test topshirmagansiz</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{results.length}</p>
              <p className="text-xs text-gray-400 mt-1">Topshirilgan test</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{avg}%</p>
              <p className="text-xs text-gray-400 mt-1">O'rtacha ball</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">{passed}/{results.length}</p>
              <p className="text-xs text-gray-400 mt-1">O'tdi</p>
            </div>
          </div>

          {/* Results list */}
          <div className="space-y-3">
            {results.map((r) => (
              <div key={r.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
                {/* Grade circle */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${(GRADE_STYLE[r.grade] || GRADE_STYLE['Yomon']).bg}`}>
                  <span className={`text-sm font-bold ${(GRADE_STYLE[r.grade] || GRADE_STYLE['Yomon']).text}`}>
                    {Math.round(r.percentage)}%
                  </span>
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{r.test_title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{r.correct_count}/{r.total_questions} to'g'ri</span>
                    <span className="text-gray-200">•</span>
                    <span className="text-xs text-gray-400">{r.total_points} ball</span>
                  </div>
                  <ScoreBar pct={r.percentage} grade={r.grade} />
                </div>

                {/* Right side */}
                <div className="text-right shrink-0 space-y-1">
                  <GradeBadge grade={r.grade} />
                  <p className="text-xs text-gray-400">{fmtDate(r.submitted_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ─────────────────────────── Teacher/Admin view ─────────────────────────── */
function AllResults() {
  const [results, setResults] = useState([])
  const [tests, setTests] = useState([])
  const [filterTest, setFilterTest] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const PAGE_SIZE = 30

  useEffect(() => {
    testsApi.list().then(({ data }) => setTests(data)).catch(() => {})
  }, [])

  const load = (p = page) => {
    setLoading(true)
    const params = { skip: (p - 1) * PAGE_SIZE, limit: PAGE_SIZE }
    if (filterTest) params.test_id = filterTest
    resultsApi.all(params)
      .then(({ data }) => { setResults(data.items); setTotal(data.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { setPage(1); load(1) }, [filterTest])
  useEffect(() => { load() }, [page])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Barcha natijalar</h1>
        <span className="text-sm text-gray-400">{total} ta natija</span>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex gap-3">
        <select
          value={filterTest}
          onChange={(e) => setFilterTest(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Barcha testlar</option>
          {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Yuklanmoqda...</div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Natijalar topilmadi</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">O'quvchi</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Test</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Ball</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">%</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Baho</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Sana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {results.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800">{r.student_name || `ID:${r.student_id}`}</td>
                  <td className="px-5 py-3 text-gray-600 max-w-[200px] truncate">{r.test_title}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{r.correct_count}/{r.total_questions}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-semibold ${r.percentage >= 75 ? 'text-green-600' : r.percentage >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                      {Math.round(r.percentage)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <GradeBadge grade={r.grade} />
                  </td>
                  <td className="px-5 py-3 text-right text-gray-400 text-xs">{fmtDate(r.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            ‹ Oldingi
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            Keyingi ›
          </button>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────── Main export ─────────────────────────── */
export default function Results() {
  const { user } = useAuth()
  return user?.role === 'student' ? <StudentResults /> : <AllResults />
}
