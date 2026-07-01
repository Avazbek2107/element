import { useEffect, useState } from 'react'
import { groupsApi, aiApi } from '../services/api'
import { Users, Calendar, BarChart2, ClipboardList, Check, X, Clock, Shield, AlertTriangle, AlignLeft, Sparkles, GraduationCap } from 'lucide-react'

/* ─── Rang yordamchilari ──────────────────────────────────── */
function scoreColor(pct) {
  if (pct === null || pct === undefined) return { pill: 'bg-slate-100 text-slate-400', bar: '#cbd5e1' }
  if (pct >= 80) return { pill: 'bg-emerald-100 text-emerald-700', bar: '#10b981' }
  if (pct >= 60) return { pill: 'bg-blue-100 text-blue-700',       bar: '#3b82f6' }
  if (pct >= 40) return { pill: 'bg-amber-100 text-amber-700',     bar: '#f59e0b' }
  return           { pill: 'bg-rose-100 text-rose-700',            bar: '#f43f5e' }
}

/* ─── Thin progress bar ───────────────────────────────────── */
function ThinBar({ pct, color }) {
  return (
    <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
    </div>
  )
}

/* ─── Metric karta ────────────────────────────────────────── */
function MetricCard({ icon, label, value, sub, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col gap-3 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg} ${iconColor}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800 leading-tight tracking-tight">{value ?? '—'}</p>
        <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

/* ─── Attendance ring ─────────────────────────────────────── */
function AttendRing({ pct }) {
  if (pct === null || pct === undefined) return <span className="text-slate-300 text-sm">—</span>
  const r = 18
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#f43f5e'
  return (
    <div className="relative inline-flex items-center justify-center w-12 h-12">
      <svg viewBox="0 0 44 44" className="w-12 h-12 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>{pct}%</span>
    </div>
  )
}

/* ─── Asosiy modal ────────────────────────────────────────── */
export default function GroupReportModal({ group, onClose }) {
  const today    = new Date().toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const [dateFrom,    setDateFrom]    = useState(monthAgo)
  const [dateTo,      setDateTo]      = useState(today)
  const [report,      setReport]      = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [sortBy,      setSortBy]      = useState('absent')
  const [aiText,      setAiText]      = useState('')
  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiVisible,   setAiVisible]   = useState(false)

  const load = (from = dateFrom, to = dateTo) => {
    setLoading(true)
    groupsApi.report(group.id, { date_from: from, date_to: to })
      .then(({ data }) => setReport(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [group.id])

  const quickRange = (days) => {
    const to   = new Date().toISOString().slice(0, 10)
    const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
    setDateFrom(from); setDateTo(to); load(from, to)
  }

  const analyzeWithAi = async () => {
    if (!report) return
    setAiLoading(true)
    setAiVisible(true)
    setAiText('')
    try {
      const payload = {
        group_name:   group.name,
        teacher_name: group.teacher_name || '',
        period:       `${dateFrom} – ${dateTo}`,
        summary:      report.summary,
        students:     report.students,
      }
      const { data } = await aiApi.analyzeReport(payload)
      setAiText(data.analysis || '')
    } catch (e) {
      setAiText('Xato yuz berdi. Iltimos qayta urinib ko\'ring.')
    } finally {
      setAiLoading(false)
    }
  }

  const s = report?.summary || {}

  const sorted = [...(report?.students || [])].sort((a, b) => {
    if (sortBy === 'absent')  return b.absent - a.absent
    if (sortBy === 'present') return b.present - a.present
    if (sortBy === 'attend')  return (b.attend_rate  ?? -1) - (a.attend_rate  ?? -1)
    if (sortBy === 'test')    return (b.avg_test_pct ?? -1) - (a.avg_test_pct ?? -1)
    if (sortBy === 'name')    return a.name.localeCompare(b.name)
    return 0
  })

  const atRisk = sorted.filter(st =>
    (st.attend_rate !== null  && st.attend_rate  < 70) ||
    (st.avg_test_pct !== null && st.avg_test_pct < 50) ||
    st.absent >= 3
  )

  const maxAbsent = Math.max(...sorted.map(x => x.absent), 1)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-5xl max-h-[95vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#f8fafc' }}>

        {/* ═══ HEADER ═════════════════════════════════════════════ */}
        <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center gap-4 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900 truncate">{group.name}</h2>
            {group.teacher_name && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-slate-400"><GraduationCap className="w-3.5 h-3.5" /></span>
                <span className="text-xs text-slate-400">{group.teacher_name}</span>
              </div>
            )}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ═══ FILTR ══════════════════════════════════════════════ */}
        <div className="bg-white border-b border-slate-100 px-6 py-3 flex flex-wrap items-center gap-2.5 shrink-0">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Davr</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all" />
          <span className="text-slate-300 font-light">—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all" />
          <button onClick={() => load()}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg font-medium transition-colors">
            Qo'llash
          </button>
          <div className="flex gap-1 ml-auto items-center flex-wrap">
            {[['7 kun', 7], ['30 kun', 30], ['3 oy', 90]].map(([lbl, d]) => (
              <button key={d} onClick={() => quickRange(d)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                {lbl}
              </button>
            ))}
            {report && (
              <button onClick={analyzeWithAi} disabled={aiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <Sparkles className="w-4 h-4" />
                {aiLoading ? 'Tahlil...' : 'AI tahlil'}
              </button>
            )}
          </div>
        </div>

        {/* ═══ KONTENT ════════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-9 h-9 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-sm text-slate-400">Yuklanmoqda…</p>
            </div>
          ) : !report ? (
            <p className="text-center text-slate-400 py-24">Ma'lumot yuklashda xato</p>
          ) : (
            <>
              {/* ── AI tahlil paneli ── */}
              {aiVisible && (
                <div className="rounded-2xl border border-indigo-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-50 to-violet-50 px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-500"><Sparkles className="w-4 h-4" /></span>
                      <p className="text-sm font-semibold text-indigo-700">Claude AI tahlili</p>
                    </div>
                    <button onClick={() => setAiVisible(false)}
                      className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors">
                      Yopish
                    </button>
                  </div>
                  <div className="bg-white p-5">
                    {aiLoading ? (
                      <div className="flex items-center gap-3 text-slate-400">
                        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
                        <span className="text-sm">Claude tahlil qilmoqda…</span>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {aiText}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Metric kartalar ── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <MetricCard
                  icon={<Users className="w-5 h-5" />}
                  label="O'quvchilar"
                  value={s.student_count}
                  iconBg="bg-indigo-50" iconColor="text-indigo-500"
                />
                <MetricCard
                  icon={<Calendar className="w-5 h-5" />}
                  label="O'tilgan darslar"
                  value={s.total_lessons}
                  sub={s.total_lessons === 0 ? "Davr bo'sh" : `${dateFrom} – ${dateTo}`}
                  iconBg="bg-violet-50" iconColor="text-violet-500"
                />
                <MetricCard
                  icon={<BarChart2 className="w-5 h-5" />}
                  label="Davomat"
                  value={s.attend_rate !== undefined ? `${s.attend_rate}%` : '—'}
                  sub={`${s.total_present ?? 0} keldi · ${s.total_absent ?? 0} kelmadi`}
                  iconBg="bg-emerald-50" iconColor="text-emerald-500"
                />
                <MetricCard
                  icon={<ClipboardList className="w-5 h-5" />}
                  label="Testlar"
                  value={s.total_tests}
                  sub={`${s.test_submissions ?? 0} ta topshirildi`}
                  iconBg="bg-amber-50" iconColor="text-amber-500"
                />
                <MetricCard
                  icon={<BarChart2 className="w-5 h-5" />}
                  label="Test o'rtacha"
                  value={s.avg_test_pct != null ? `${s.avg_test_pct}%` : '—'}
                  sub={s.total_tests === 0 ? 'Test mavjud emas' : undefined}
                  iconBg="bg-rose-50" iconColor="text-rose-500"
                />
              </div>

              {/* ── Yo'qlama xulosasi ── */}
              {s.total_lessons > 0 && (() => {
                const total = (s.total_present||0) + (s.total_absent||0) + (s.total_late||0) + (s.total_excused||0)
                const bars = [
                  { label: 'Keldi',      val: s.total_present, color: '#10b981', icon: <Check className="w-4 h-4" />, iconCls: 'text-emerald-500' },
                  { label: 'Kelmadi',    val: s.total_absent,  color: '#f43f5e', icon: <X className="w-4 h-4" />,    iconCls: 'text-rose-500'    },
                  { label: 'Kech qoldi', val: s.total_late,    color: '#3b82f6', icon: <Clock className="w-4 h-4" />,      iconCls: 'text-blue-500'    },
                  { label: 'Sababli',    val: s.total_excused, color: '#f59e0b', icon: <Shield className="w-4 h-4" />,     iconCls: 'text-amber-500'   },
                ]
                return (
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <p className="text-sm font-semibold text-slate-700 mb-4">Yo'qlama xulosasi</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                      {bars.map(({ label, val, color, icon, iconCls }) => {
                        const pct = total > 0 ? Math.round(val / total * 100) : 0
                        return (
                          <div key={label}>
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className={iconCls}>{icon}</span>
                              <span className="text-xs font-medium text-slate-500">{label}</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-800 leading-none mb-1.5">{val}</p>
                            <ThinBar pct={pct} color={color} />
                            <p className="text-xs mt-1.5 font-semibold" style={{ color }}>{pct}%</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* ── Xavf ostidagilar ── */}
              {atRisk.length > 0 && (
                <div className="rounded-2xl border border-rose-100 overflow-hidden">
                  <div className="bg-rose-50 px-5 py-3 flex items-center gap-2">
                    <span className="text-rose-500"><AlertTriangle className="w-4 h-4" /></span>
                    <p className="text-sm font-semibold text-rose-700">
                      E'tibor talab etadi — {atRisk.length} ta o'quvchi
                    </p>
                  </div>
                  <div className="bg-white p-4 flex flex-wrap gap-2">
                    {atRisk.map(st => (
                      <div key={st.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 min-w-[160px]">
                        <p className="text-xs font-semibold text-slate-700">{st.name}</p>
                        <div className="flex flex-col gap-0.5 mt-1">
                          {st.absent >= 3 && (
                            <span className="text-xs text-rose-600 font-medium">{st.absent} dars qoldirgan</span>
                          )}
                          {st.attend_rate !== null && st.attend_rate < 70 && (
                            <span className="text-xs text-amber-600">Davomat: {st.attend_rate}%</span>
                          )}
                          {st.avg_test_pct !== null && st.avg_test_pct < 50 && (
                            <span className="text-xs text-orange-500">Test: {st.avg_test_pct}%</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── O'quvchilar jadvali ── */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-50 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-700">
                    O'quvchilar
                    <span className="ml-2 text-xs font-normal text-slate-400">{report.students.length} ta</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400"><AlignLeft className="w-3.5 h-3.5" /></span>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white">
                      <option value="absent">Ko'p qoldirganlar</option>
                      <option value="present">Ko'p kelganlar</option>
                      <option value="attend">Davomat %</option>
                      <option value="test">Test ball</option>
                      <option value="name">Ism bo'yicha</option>
                    </select>
                  </div>
                </div>

                {sorted.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-sm text-slate-400">Bu guruhda o'quvchilar yo'q</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {[
                            { label: '#',         cls: 'w-10 text-left  pl-5' },
                            { label: 'Ism Familiya', cls: 'text-left  px-4'  },
                            { label: 'Keldi',     cls: 'text-center px-3',  color: '#10b981' },
                            { label: 'Kelmadi',   cls: 'text-center px-3',  color: '#f43f5e' },
                            { label: 'Kech',      cls: 'text-center px-3',  color: '#3b82f6' },
                            { label: 'Sababli',   cls: 'text-center px-3',  color: '#f59e0b' },
                            { label: 'Davomat',   cls: 'text-center px-4'  },
                            { label: 'Test ball', cls: 'text-center px-4'  },
                            { label: 'Testlar',   cls: 'text-center px-3 pr-5' },
                          ].map(({ label, cls, color }) => (
                            <th key={label}
                              className={`py-3 text-xs font-semibold uppercase tracking-wide border-b border-slate-100 ${cls}`}
                              style={{ color: color || '#94a3b8' }}>
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {sorted.map((st, i) => {
                          const aC = scoreColor(st.attend_rate)
                          const tC = scoreColor(st.avg_test_pct)
                          const absPct = maxAbsent > 0 ? (st.absent / maxAbsent) * 100 : 0
                          return (
                            <tr key={st.id} className="hover:bg-slate-50/70 transition-colors group">
                              <td className="pl-5 py-3.5 text-xs text-slate-300 font-mono">{i + 1}</td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0 select-none">
                                    {st.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                  </div>
                                  <span className="font-medium text-slate-800 text-sm">{st.name}</span>
                                </div>
                              </td>
                              <td className="px-3 py-3.5 text-center">
                                <span className="font-bold text-emerald-600">{st.present}</span>
                              </td>
                              <td className="px-3 py-3.5 text-center">
                                <div className="flex flex-col items-center gap-1.5">
                                  <span className={`font-bold text-sm ${st.absent > 0 ? 'text-rose-500' : 'text-slate-200'}`}>
                                    {st.absent}
                                  </span>
                                  {st.absent > 0 && (
                                    <div className="w-10">
                                      <ThinBar pct={absPct} color="#f43f5e" />
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-3.5 text-center">
                                <span className={`font-semibold ${st.late > 0 ? 'text-blue-500' : 'text-slate-200'}`}>
                                  {st.late}
                                </span>
                              </td>
                              <td className="px-3 py-3.5 text-center">
                                <span className={`font-semibold ${st.excused > 0 ? 'text-amber-500' : 'text-slate-200'}`}>
                                  {st.excused}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <AttendRing pct={st.attend_rate} />
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                {st.avg_test_pct != null ? (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${tC.pill}`}>
                                    {st.avg_test_pct}%
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-xs">—</span>
                                )}
                              </td>
                              <td className="px-3 pr-5 py-3.5 text-center text-xs text-slate-400">
                                {st.tests_taken > 0 ? `${st.tests_taken} ta` : <span className="text-slate-200">—</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
