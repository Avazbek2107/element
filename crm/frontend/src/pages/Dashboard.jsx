import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { statsApi, attendanceApi } from '../services/api'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

/* ── SVG ikonlar ── */
const IcUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IcTeacher = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
  </svg>
)
const IcBuilding = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <rect x="2" y="7" width="20" height="14" rx="1"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
)
const IcDoc = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
)
const IcChart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
)
const IcClipboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-gray-300">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
)
const IcCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-gray-300">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IcDocEmpty = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-gray-300">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
)

/* ── StatCard ── */
function StatCard({ label, value, sub, color = 'blue', icon }) {
  const colors = {
    blue:   'from-blue-500 to-blue-600',
    green:  'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    rose:   'from-rose-500 to-rose-600',
  }
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-800 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-5 ${className}`}>
      <p className="text-sm font-semibold text-gray-700 mb-4">{title}</p>
      {children}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 text-xs">
      {label && <p className="font-semibold text-gray-600 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value} ta
        </p>
      ))}
    </div>
  )
}

/* ── Donut chart ── */
function DonutChart({ data, total, label }) {
  const isEmpty = total === 0
  const display = isEmpty
    ? [{ name: "Ma'lumot yo'q", value: 1, color: '#e5e7eb' }]
    : data.filter((d) => d.value > 0)

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={display}
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={isEmpty ? 0 : 3}
            dataKey="value"
            stroke="none"
          >
            {display.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          {!isEmpty && <Tooltip content={<CustomTooltip />} />}
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold text-gray-800">{isEmpty ? '—' : total}</span>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
    </div>
  )
}

function DonutLegend({ data, total }) {
  return (
    <div className="space-y-2 mt-2">
      {data.map((d) => (
        <div key={d.name} className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-gray-600">{d.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 bg-gray-100 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: total > 0 ? `${(d.value / total) * 100}%` : '0%',
                  background: d.color,
                }}
              />
            </div>
            <span className="font-semibold text-gray-700 w-6 text-right">{d.value}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Mini progress karta ── */
function MiniStat({ label, value, total, color, label2 }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <p className="text-xs text-gray-400 mb-2 leading-tight">{label}</p>
      <p className="text-xl font-bold text-gray-800">{value}</p>
      {label2 && <p className="text-xs text-gray-400">{label2}</p>}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <p className="text-xs mt-1" style={{ color }}>{pct}%</p>
    </div>
  )
}

/* ── Asosiy komponent ── */
export default function Dashboard() {
  const [stats, setStats]         = useState(null)
  const [today, setToday]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [groups, setGroups]       = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)   // null = hammasi
  const [filterLoading, setFilterLoading] = useState(false)

  // Birinchi yuklash: guruhlar ro'yxati + umumiy statistika
  useEffect(() => {
    Promise.all([statsApi.get(), attendanceApi.today()])
      .then(([{ data: s }, { data: t }]) => {
        setStats(s)
        setToday(t)
        setGroups(s.recent_groups ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Guruh o'zgarganda faqat filtrlangan bo'limlarni yangilash
  useEffect(() => {
    if (loading) return
    setFilterLoading(true)
    Promise.all([
      statsApi.get(selectedGroup),
      attendanceApi.today(selectedGroup),
    ])
      .then(([{ data: s }, { data: t }]) => { setStats(s); setToday(t) })
      .catch(() => {})
      .finally(() => setFilterLoading(false))
  }, [selectedGroup]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="text-gray-400 text-sm py-10 text-center">Yuklanmoqda...</div>
  if (!stats)  return <div className="text-red-400 text-sm py-10 text-center">Ma'lumot yuklashda xato</div>

  const todayTotal = today ? today.present + today.absent + today.late : 0
  const presentPct = todayTotal > 0 ? Math.round((today.present / todayTotal) * 100) : 0

  const genderTotal = stats.gender_stats.reduce((s, d) => s + d.value, 0)
  const gradeTotal  = stats.grade_stats.reduce((s, d) => s + d.value, 0)

  const attendanceHasData = stats.attendance_week?.some(
    (d) => d.keldi + d.kelmadi + d.kechikdi > 0
  )
  const testTypeHasData = stats.test_type_stats?.some(
    (d) => d.nashr + d.qoralama > 0
  )
  const groupHasData = stats.group_stats?.some((g) => g.count > 0)

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {/* ── 1. Asosiy stat kartalar ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          icon={<IcUsers />}
          label="Jami o'quvchilar"
          value={stats.students_total}
          sub={`${stats.students_with_group} ta guruhda`}
          color="blue"
        />
        <StatCard
          icon={<IcTeacher />}
          label="O'qituvchilar"
          value={stats.teachers_total}
          sub="faol o'qituvchi"
          color="purple"
        />
        <StatCard
          icon={<IcBuilding />}
          label="Guruhlar"
          value={stats.groups_total}
          sub={`${stats.students_no_group} ta guruhsiz`}
          color="green"
        />
        <StatCard
          icon={<IcDoc />}
          label="Testlar"
          value={stats.tests_published}
          sub={`Jami ${stats.tests_total} ta (${stats.tests_draft} qoralama)`}
          color="orange"
        />
        <StatCard
          icon={<IcChart />}
          label="Test natijalari"
          value={stats.results_total}
          sub={stats.results_total > 0 ? `O'rtacha: ${stats.avg_percentage}%` : "Hali natija yo'q"}
          color="rose"
        />
      </div>

      {/* ── 2. Donut diagrammalar + yo'qlama ── */}
      {/* Guruh filtri */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 font-medium shrink-0">Guruh bo'yicha:</span>
        <select
          value={selectedGroup ?? ''}
          onChange={(e) => setSelectedGroup(e.target.value ? Number(e.target.value) : null)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Barcha guruhlar</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.student_count} o'quvchi)
            </option>
          ))}
        </select>
        {filterLoading && (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin ml-1 shrink-0" />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <ChartCard title={selectedGroup ? `Jins — ${groups.find(g => g.id === selectedGroup)?.name ?? ''}` : "O'quvchilar jinsi"}>
          <DonutChart data={stats.gender_stats} total={genderTotal} label="o'quvchi" />
          <DonutLegend data={stats.gender_stats} total={genderTotal} />
        </ChartCard>

        <ChartCard title={selectedGroup ? `Baholar — ${groups.find(g => g.id === selectedGroup)?.name ?? ''}` : "Test baholari taqsimoti"}>
          <DonutChart data={stats.grade_stats} total={gradeTotal} label="natija" />
          <DonutLegend data={stats.grade_stats} total={gradeTotal} />
        </ChartCard>

        <ChartCard title={selectedGroup ? `Bugungi yo'qlama — ${groups.find(g => g.id === selectedGroup)?.name ?? ''}` : "Bugungi yo'qlama"}>
          {todayTotal === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <IcClipboard />
              <p className="text-sm mt-3">Bugun yo'qlama belgilanmagan</p>
              <Link to="/attendance" className="mt-3 text-xs text-blue-500 hover:underline">
                Yo'qlama belgilash →
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>Davomat</span>
                  <span className="font-semibold text-green-600">{presentPct}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-green-500 transition-all"
                    style={{ width: `${presentPct}%` }}
                  />
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Keldi',    value: today.present, dot: 'bg-green-500',  light: 'bg-green-50',  text: 'text-green-700' },
                  { label: 'Kelmadi',  value: today.absent,  dot: 'bg-red-500',    light: 'bg-red-50',    text: 'text-red-600'   },
                  { label: 'Kechikdi', value: today.late,    dot: 'bg-amber-500',  light: 'bg-amber-50',  text: 'text-amber-600' },
                ].map(({ label, value, dot, light, text }) => (
                  <div key={label} className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${light}`}>
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${dot}`} />
                      <span className="text-sm text-gray-600">{label}</span>
                    </div>
                    <span className={`text-lg font-bold ${text}`}>{value}</span>
                  </div>
                ))}
              </div>
              <Link to="/attendance" className="block text-center text-xs text-blue-500 mt-4 hover:underline">
                Batafsil ko'rish →
              </Link>
            </>
          )}
        </ChartCard>
      </div>

      {/* ── 3. Guruhlar bo'yicha o'quvchilar ── */}
      {stats.group_stats?.length > 0 && (
        <ChartCard title="Guruhlar bo'yicha o'quvchilar soni">
          {groupHasData ? (
            <ResponsiveContainer width="100%" height={Math.max(180, stats.group_stats.length * 44)}>
              <BarChart
                data={stats.group_stats}
                layout="vertical"
                margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={60}
                  tick={{ fontSize: 12, fill: '#374151' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="O'quvchi" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={22}
                  label={{ position: 'right', fontSize: 11, fill: '#6b7280', formatter: (v) => v > 0 ? v : '' }}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-300 text-sm">
              Guruhda o'quvchi yo'q
            </div>
          )}
        </ChartCard>
      )}

      {/* ── 4. Yo'qlama 7 kun + Test turlari ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <ChartCard title="Yo'qlama — so'nggi 7 kun">
          {attendanceHasData ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.attendance_week} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="sana" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="keldi"    name="Keldi"    fill="#22c55e" radius={[3,3,0,0]} barSize={12} />
                <Bar dataKey="kelmadi"  name="Kelmadi"  fill="#ef4444" radius={[3,3,0,0]} barSize={12} />
                <Bar dataKey="kechikdi" name="Kechikdi" fill="#f59e0b" radius={[3,3,0,0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-300">
              <IcCalendar />
              <p className="text-sm mt-3">So'nggi 7 kunda yo'qlama yo'q</p>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Test turlari (nashr / qoralama)">
          {testTypeHasData ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.test_type_stats} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="nashr"    name="Nashr"    fill="#3b82f6" radius={[3,3,0,0]} barSize={20} />
                <Bar dataKey="qoralama" name="Qoralama" fill="#d1d5db" radius={[3,3,0,0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-300">
              <IcDocEmpty />
              <p className="text-sm mt-3">Hali testlar kiritilmagan</p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── 5. O'rtacha ball ko'rsatkichi ── */}
      {stats.results_total > 0 && (
        <ChartCard title="O'rtacha test natijasi">
          <div className="flex items-center gap-5">
            <div className="shrink-0 text-center w-20">
              <p className={`text-4xl font-bold ${
                stats.avg_percentage >= 75 ? 'text-green-500' :
                stats.avg_percentage >= 50 ? 'text-amber-500' : 'text-red-500'
              }`}>
                {stats.avg_percentage}%
              </p>
              <p className="text-xs text-gray-400 mt-1">o'rtacha</p>
            </div>
            <div className="flex-1">
              <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-4 rounded-full transition-all duration-700 ${
                    stats.avg_percentage >= 75 ? 'bg-green-500' :
                    stats.avg_percentage >= 50 ? 'bg-amber-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${stats.avg_percentage}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                <span>0%</span>
                <span className="text-amber-500">50% (o'tish)</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </ChartCard>
      )}

      {/* ── 6. Qo'shimcha statistikalar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniStat
          label="Guruhga biriktirilgan"
          value={stats.students_with_group}
          total={stats.students_total}
          color="#3b82f6"
        />
        <MiniStat
          label="Guruhsiz o'quvchilar"
          value={stats.students_no_group}
          total={stats.students_total}
          color="#f59e0b"
        />
        <MiniStat
          label="Nashr etilgan testlar"
          value={stats.tests_published}
          total={stats.tests_total}
          color="#22c55e"
        />
        <MiniStat
          label="O'g'il / Qiz nisbati"
          value={stats.gender_stats.find(g => g.name === "O'g'il")?.value ?? 0}
          total={stats.students_total}
          color="#3b82f6"
          label2={`${stats.gender_stats.find(g => g.name === 'Qiz')?.value ?? 0} qiz`}
        />
      </div>
    </div>
  )
}
