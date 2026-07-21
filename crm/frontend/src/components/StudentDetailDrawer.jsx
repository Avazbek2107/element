import { useEffect, useRef, useState } from 'react'
import Avatar from './GenderAvatar'
import { telegramApi, studentsApi, aiApi, messagesApi } from '../services/api'
import toast from 'react-hot-toast'
import { CheckCircle2, Sparkles, TrendingUp, Send } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const GRADE_COLOR = { "A'lo": '#22c55e', 'Yaxshi': '#3b82f6', "O'rtacha": '#f59e0b', 'Yomon': '#ef4444' }

function ScoreTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700">{d.title}</p>
      <p className="text-gray-500">{new Date(d.submitted_at).toLocaleDateString('uz-UZ')}</p>
      <p className="font-bold" style={{ color: GRADE_COLOR[d.grade] || '#6366f1' }}>{d.percentage}%</p>
    </div>
  )
}

/* ── Progress bo'limi: test tarixi + AI tahlil ── */
function ProgressSection({ student }) {
  const [progress,   setProgress]   = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [aiText,     setAiText]     = useState('')
  const [aiLoading,  setAiLoading]  = useState(false)
  const [aiVisible,  setAiVisible]  = useState(false)

  useEffect(() => {
    setLoading(true)
    studentsApi.progress(student.id)
      .then(({ data }) => setProgress(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [student.id])

  const analyzeWithAi = async () => {
    if (!progress) return
    setAiLoading(true)
    setAiVisible(true)
    setAiText('')
    try {
      const fish = [student.last_name, student.first_name].filter(Boolean).join(' ')
      const { data } = await aiApi.analyzeStudent({
        student_name: fish,
        test_history: progress.test_history,
        attendance_summary: { rate: progress.attendance_rate_overall },
      })
      setAiText(data.analysis || '')
    } catch {
      setAiText('Xato yuz berdi. Iltimos qayta urinib ko\'ring.')
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) {
    return <p className="text-xs text-gray-400 py-4 text-center">Yuklanmoqda...</p>
  }
  if (!progress) return null

  const hasTests = progress.test_history?.length > 0

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">O'quv natijalari</p>
        {hasTests && (
          <button
            onClick={analyzeWithAi}
            disabled={aiLoading}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Sparkles className="w-3 h-3" />
            {aiLoading ? 'Tahlil...' : 'AI tahlil'}
          </button>
        )}
      </div>

      {/* Mini statlar */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-[11px] text-gray-400">O'rtacha ball</p>
          <p className="text-lg font-bold text-gray-800">
            {progress.score_avg != null ? `${progress.score_avg}%` : '—'}
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-[11px] text-gray-400">Davomat</p>
          <p className="text-lg font-bold text-gray-800">
            {progress.attendance_rate_overall != null ? `${progress.attendance_rate_overall}%` : '—'}
          </p>
        </div>
      </div>

      {/* Test tarixi grafigi */}
      {hasTests ? (
        <div className="rounded-xl border border-gray-100 p-3">
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={progress.test_history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="submitted_at" tick={false} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ScoreTooltip />} />
              <Line type="monotone" dataKey="percentage" stroke="#6366f1" strokeWidth={2}
                dot={{ r: 3, fill: '#6366f1' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center">
          <TrendingUp className="w-6 h-6 text-gray-300 mx-auto mb-1" />
          <p className="text-xs text-gray-400">Hali test topshirilmagan</p>
        </div>
      )}

      {/* AI tahlil paneli */}
      {aiVisible && (
        <div className="mt-3 rounded-xl border border-indigo-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Claude AI tahlili
            </span>
            <button onClick={() => setAiVisible(false)} className="text-[11px] text-indigo-400 hover:text-indigo-600">
              Yopish
            </button>
          </div>
          <div className="bg-white p-3">
            {aiLoading ? (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <span className="text-xs">Claude tahlil qilmoqda…</span>
              </div>
            ) : (
              <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{aiText}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const Row = ({ label, value }) =>
  value ? (
    <div className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-700 font-medium">{value}</span>
    </div>
  ) : null

function CodeBlock({ label, code, deepLink, isLinked, onLoad, loading }) {
  const copy = () => {
    navigator.clipboard.writeText(code)
    toast.success('Nusxalandi')
  }
  return (
    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${isLinked ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
          {isLinked ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Bog'langan</span> : "Bog'lanmagan"}
        </span>
      </div>
      {!code && (
        <button onClick={onLoad} disabled={loading}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50">
          {loading ? 'Yuklanmoqda...' : 'Kodni olish'}
        </button>
      )}
      {code && (
        <>
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono font-bold bg-white border border-gray-200 rounded-lg px-3 py-1">
              {code}
            </code>
            <button onClick={copy} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
              Nusxalash
            </button>
          </div>
          {deepLink && (
            <a href={deepLink} target="_blank" rel="noreferrer"
              className="inline-block text-xs text-blue-500 hover:text-blue-700">
              Telegram havolasi →
            </a>
          )}
        </>
      )}
    </div>
  )
}

function TelegramLinkBox({ student }) {
  const [parentInfo,  setParentInfo]  = useState(null)
  const [studentInfo, setStudentInfo] = useState(null)
  const [loadingP, setLoadingP] = useState(false)
  const [loadingS, setLoadingS] = useState(false)

  const loadParent = async () => {
    setLoadingP(true)
    try { const { data } = await telegramApi.getLinkCode(student.id);        setParentInfo(data)  }
    catch { toast.error('Kodni olishda xato') }
    finally { setLoadingP(false) }
  }
  const loadStudent = async () => {
    setLoadingS(true)
    try { const { data } = await telegramApi.getStudentLinkCode(student.id); setStudentInfo(data) }
    catch { toast.error('Kodni olishda xato') }
    finally { setLoadingS(false) }
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Telegram bog'lanish</p>
      <CodeBlock
        label="Ota-ona kodi"
        code={parentInfo?.link_code ?? (student.link_code || null)}
        deepLink={parentInfo?.deep_link}
        isLinked={parentInfo ? parentInfo.is_linked : !!student.parent_telegram_id}
        onLoad={loadParent}
        loading={loadingP}
      />
      <CodeBlock
        label="O'quvchi kodi (test topshirish)"
        code={studentInfo?.student_link_code ?? (student.student_link_code || null)}
        deepLink={studentInfo?.deep_link}
        isLinked={studentInfo ? studentInfo.is_linked : !!student.student_telegram_id}
        onLoad={loadStudent}
        loading={loadingS}
      />
    </div>
  )
}

const CHANNEL_LABELS = {
  telegram: { label: 'Telegram', color: 'text-blue-600' },
  sms:      { label: 'SMS',      color: 'text-green-600' },
  none:     { label: "Yetkazilmadi", color: 'text-gray-400' },
}

function ParentMessageBox({ student }) {
  const [body,    setBody]    = useState('')
  const [sending, setSending] = useState(false)
  const [log,     setLog]     = useState([])
  const [loading, setLoading] = useState(true)

  const loadLog = () => {
    setLoading(true)
    messagesApi.parentLog(student.id)
      .then(({ data }) => setLog(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadLog() }, [student.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    if (!body.trim()) { toast.error("Xabar matnini kiriting"); return }
    setSending(true)
    try {
      const { data } = await messagesApi.sendToParent({ recipient_student_id: student.id, body: body.trim() })
      if (data.status === 'sent') {
        toast.success(`${CHANNEL_LABELS[data.channel]?.label || data.channel} orqali yuborildi`)
      } else if (data.status === 'no_contact') {
        toast.error("Ota-onaning Telegram yoki telefon raqami bog'lanmagan")
      } else {
        toast.error('Yuborishda xatolik')
      }
      setBody('')
      loadLog()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Xatolik')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ota-onaga xabar yuborish</p>
      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={2}
          placeholder="Xabar matni..."
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          onClick={handleSend}
          disabled={sending}
          className="shrink-0 w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 self-end"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {!loading && log.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {log.slice(0, 5).map(m => (
            <div key={m.id} className="flex items-start justify-between gap-2 text-xs bg-gray-50 rounded-lg px-2.5 py-1.5">
              <span className="text-gray-600 truncate">{m.body}</span>
              <span className={`shrink-0 font-medium ${CHANNEL_LABELS[m.channel]?.color || 'text-gray-400'}`}>
                {CHANNEL_LABELS[m.channel]?.label || m.channel}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function StudentDetailDrawer({ student, onClose, onEdit }) {
  const drawerRef = useRef()

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => {
      if (drawerRef.current) {
        drawerRef.current.style.transform = 'translateX(0)'
        drawerRef.current.style.opacity = '1'
      }
    })
  }, [])

  const fish = [student.last_name, student.first_name, student.middle_name]
    .filter(Boolean).join(' ')

  const formatDate = (d) => {
    if (!d) return null
    const dt = new Date(d)
    return dt.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const genderLabel = student.gender === 'female' ? 'Qiz' : student.gender === 'male' ? "O'g'il" : null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        style={{ transform: 'translateX(100%)', opacity: 0, transition: 'transform 0.35s cubic-bezier(.22,1,.36,1), opacity 0.25s ease' }}
        className="w-full max-w-sm bg-white h-full overflow-y-auto shadow-2xl flex flex-col"
      >
        {/* Header gradient */}
        <div className={`relative pt-10 pb-6 px-6 ${student.gender === 'female' ? 'bg-gradient-to-br from-pink-400 to-rose-600' : 'bg-gradient-to-br from-blue-400 to-blue-700'}`}>
          <div className="absolute top-4 right-4 flex gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(student)}
                className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium hover:bg-white/35 transition-colors"
              >
                Tahrirlash
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Avatar */}
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white/60 shadow-lg">
              <Avatar gender={student.gender} avatarUrl={student.avatar_url} />
            </div>
          </div>

          {/* FISH */}
          <h2 className="text-white text-center font-bold text-lg leading-snug">{fish}</h2>
          <div className="flex justify-center gap-2 mt-2">
            {genderLabel && (
              <span className="text-xs bg-white/25 text-white px-2.5 py-0.5 rounded-full">
                {genderLabel}
              </span>
            )}
            {student.group_name && (
              <span className="text-xs bg-white/25 text-white px-2.5 py-0.5 rounded-full">
                {student.group_name}
              </span>
            )}
            <span className={`text-xs px-2.5 py-0.5 rounded-full ${student.is_active ? 'bg-green-400/80 text-white' : 'bg-red-400/80 text-white'}`}>
              {student.is_active ? 'Faol' : 'Nofaol'}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 px-6 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Shaxsiy ma'lumotlar</p>
          <Row label="Tug'ilgan sana"  value={formatDate(student.birth_date)} />
          <Row label="Email"           value={student.email} />
          <Row label="Telefon"         value={student.phone} />
          <Row label="Manzil"          value={student.address} />

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-5 mb-2">O'qish ma'lumotlari</p>
          <Row label="Guruh"           value={student.group_name} />
          <Row label="Kurs boshlandi"  value={formatDate(student.course_start_date)} />
          <Row label="Kurs tugaydi"    value={formatDate(student.course_end_date)} />
          <Row label="Ro'yxatga olingan" value={formatDate(student.enrolled_date)} />

          <ProgressSection student={student} />

          {(student.doc_type || student.doc_series) && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-5 mb-2">Hujjat</p>
              <Row
                label="Hujjat turi"
                value={
                  student.doc_type === 'passport' ? 'Pasport'
                  : student.doc_type === 'birth_cert' ? "Tug'ilganlik to'g'risida guvohnoma"
                  : student.doc_type
                }
              />
              <Row label="Seriya / Raqam" value={student.doc_series} />
            </>
          )}

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-5 mb-2">Ota-ona</p>
          <Row label="Ota-ona telefoni" value={student.parent_phone} />
          <TelegramLinkBox student={student} />
          <ParentMessageBox student={student} />
        </div>
      </div>
    </div>
  )
}
