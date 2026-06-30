import { useEffect, useRef } from 'react'
import Avatar from './GenderAvatar'

const Row = ({ label, value }) =>
  value ? (
    <div className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-700 font-medium">{value}</span>
    </div>
  ) : null

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
        </div>
      </div>
    </div>
  )
}
