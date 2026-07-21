import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useRef, useState } from 'react'
import { attendanceApi, messagesApi } from '../services/api'
import ElementLogo from './ElementLogo'
import AiChat from './AiChat'
import { Bell, Menu, X, ChevronDown } from 'lucide-react'

/* ── Navigatsiya tuzilishi ─────────────────────────────────────────── */
const NAV_STRUCTURE = [
  {
    type: 'link',
    path: '/',
    label: 'Dashboard',
    roles: ['super_admin', 'admin', 'teacher'],
  },
  {
    type: 'link',
    path: '/timetable',
    label: 'Dars jadvali',
    roles: ['super_admin', 'admin', 'teacher', 'student'],
  },
  {
    type: 'link',
    path: '/messages',
    label: 'Xabarlar',
    roles: ['super_admin', 'admin', 'teacher'],
  },
  {
    type: 'section',
    key: 'teachers',
    label: "O'qituvchilar",
    items: [
      { path: '/teachers', label: "O'qituvchilar", roles: ['super_admin', 'admin'], permission: 'teachers' },
    ],
  },
  {
    type: 'section',
    key: 'students',
    label: "O'quvchilar",
    items: [
      { path: '/students', label: "O'quvchilar", roles: ['super_admin', 'admin', 'teacher'], permission: 'students' },
    ],
  },
  {
    type: 'section',
    key: 'learning',
    label: "O'quv jarayoni",
    items: [
      { path: '/groups',      label: 'Guruhlar',  roles: ['super_admin', 'admin', 'teacher'], permission: 'groups' },
      { path: '/attendance',  label: "Yo'qlama",  roles: ['super_admin', 'admin', 'teacher'], permission: 'attendance' },
      { path: '/assessments', label: 'Baholash',  roles: ['super_admin', 'admin', 'teacher'], permission: 'assessments' },
      { path: '/tests',       label: 'Testlar',   roles: ['super_admin', 'admin', 'teacher', 'student'] },
      { path: '/results',     label: 'Natijalar', roles: ['super_admin', 'admin', 'teacher', 'student'] },
    ],
  },
  {
    type: 'section',
    key: 'resources',
    label: 'Resurslar',
    items: [
      { path: '/rooms',     label: "O'quv xonalari",    roles: ['super_admin', 'admin', 'teacher'], permission: 'rooms' },
      { path: '/materials', label: "O'quv materiallari", roles: ['super_admin', 'admin', 'teacher', 'student'], permission: 'materials' },
    ],
  },
  {
    type: 'section',
    key: 'payments',
    label: "To'lovlar",
    items: [
      { path: '/payments', label: "To'lovlar", roles: ['super_admin', 'admin'], permission: 'payments' },
    ],
  },
  {
    type: 'section',
    key: 'admin',
    label: 'Boshqaruv',
    items: [
      { path: '/super-admin', label: 'Boshqaruv', roles: ['super_admin'] },
      { path: '/security',    label: 'Xavfsizlik', roles: ['super_admin', 'admin'] },
    ],
  },
]

/* ── Xabarlar badge ─────────────────────────────────────────────────── */
function MessagesBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const load = () => messagesApi.unreadCount().then(({ data }) => setCount(data.count)).catch(() => {})
    load()
    const iv = setInterval(load, 60_000)
    return () => clearInterval(iv)
  }, [])

  if (count === 0) return null
  return (
    <span className="ml-auto w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold leading-none shrink-0">
      {count > 9 ? '9+' : count}
    </span>
  )
}

/* ── Bildirishnomalar qo'ng'irog'i ─────────────────────────────────── */
function NotificationBell() {
  const [notifs,    setNotifs]    = useState([])
  const [open,      setOpen]      = useState(false)
  const [pos,       setPos]       = useState({ top: 0, left: 0 })
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissed_notifs') || '[]') }
    catch { return [] }
  })
  const ref    = useRef()
  const btnRef = useRef()
  const navigate = useNavigate()

  const load = () => attendanceApi.notifications().then(({ data }) => setNotifs(data)).catch(() => {})

  useEffect(() => { load(); const iv = setInterval(load, 60_000); return () => clearInterval(iv) }, [])

  useEffect(() => {
    if (!open) return
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  const dismiss = (key, e) => {
    e.stopPropagation()
    const next = [...dismissed, key]
    setDismissed(next)
    localStorage.setItem('dismissed_notifs', JSON.stringify(next))
  }

  const visible = notifs.filter(n => !dismissed.includes(`${n.group_id}_${n.date}`))

  const dismissAll = () => {
    const keys = visible.map(n => `${n.group_id}_${n.date}`)
    const next = [...dismissed, ...keys]
    setDismissed(next)
    localStorage.setItem('dismissed_notifs', JSON.stringify(next))
    setOpen(false)
  }

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ bottom: window.innerHeight - r.top + 8, left: Math.max(8, r.left - 288 + r.width) })
    }
    setOpen(v => !v)
  }

  return (
    <div ref={ref}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {visible.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold leading-none">
            {visible.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-[9999] overflow-hidden"
          style={{ bottom: pos.bottom, left: pos.left }}
        >
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">Bildirishnomalar</span>
            {visible.length > 0 && (
              <button onClick={dismissAll} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                Barchasini yopish
              </button>
            )}
          </div>
          {visible.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Bildirishnomalar yo'q</p>
          ) : (
            <ul className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {visible.map(n => {
                const key = `${n.group_id}_${n.date}`
                return (
                  <li
                    key={key}
                    onClick={() => { setOpen(false); navigate(`/attendance?group_id=${n.group_id}&date=${n.date}`) }}
                    className="px-4 py-3 hover:bg-red-50 transition-colors cursor-pointer flex items-start justify-between gap-2 group"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{n.group_name}</p>
                        <p className="text-xs text-red-600 mt-0.5">Yo'qlama belgilanmagan — {n.time}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{n.date}</p>
                      </div>
                    </div>
                    <button
                      onClick={e => dismiss(key, e)}
                      className="shrink-0 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 mt-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Bo'lim komponenti ──────────────────────────────────────────────── */
function NavSection({ section, location, user, hasPermission, open, onToggle, onNavClick }) {
  const visibleItems = section.items.filter(item => {
    if (!item.roles.includes(user?.role)) return false
    if (item.permission) return hasPermission(item.permission)
    return true
  })
  if (visibleItems.length === 0) return null

  const isActive = visibleItems.some(item => location.pathname === item.path)

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md transition-colors group mt-1
          ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider">{section.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
        />
      </button>

      {open && (
        <div className="mt-0.5 space-y-0.5">
          {visibleItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavClick}
              className={`flex items-center gap-2 pl-5 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <span className={`w-1 h-1 rounded-full shrink-0 ${
                location.pathname === item.path ? 'bg-blue-500' : 'bg-gray-300'
              }`} />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Sidebar ichidagi kontent ───────────────────────────────────────── */
function SidebarContent({ user, location, onNavClick, onLogout }) {
  const { hasPermission } = useAuth()

  // Har bir section uchun ochiq/yopiq holat
  const [openSections, setOpenSections] = useState(() => {
    const defaults = {}
    NAV_STRUCTURE.forEach(item => { if (item.type === 'section') defaults[item.key] = true })
    try {
      const saved = JSON.parse(localStorage.getItem('nav_sections') || '{}')
      return { ...defaults, ...saved }
    } catch { return defaults }
  })

  const toggleSection = (key) => {
    setOpenSections(prev => {
      const isOpen = prev[key]
      const next = {}
      Object.keys(prev).forEach(k => { next[k] = false })
      next[key] = !isOpen
      localStorage.setItem('nav_sections', JSON.stringify(next))
      return next
    })
  }

  return (
    <>
      {/* Logo */}
      <div className="p-5 border-b flex items-center gap-3 shrink-0">
        <ElementLogo size={38} />
        <div>
          <div className="text-base font-bold text-gray-900 tracking-wide">element</div>
          <div className="text-xs text-gray-400 tracking-widest uppercase">O'quv markazi</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_STRUCTURE.map((entry, idx) => {
          if (entry.type === 'link') {
            if (!entry.roles.includes(user?.role)) return null
            return (
              <Link
                key={entry.path}
                to={entry.path}
                onClick={onNavClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === entry.path
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                {entry.label}
                {entry.path === '/messages' && <MessagesBadge />}
              </Link>
            )
          }

          return (
            <NavSection
              key={entry.key}
              section={entry}
              location={location}
              user={user}
              hasPermission={hasPermission}
              open={openSections[entry.key]}
              onToggle={() => toggleSection(entry.key)}
              onNavClick={onNavClick}
            />
          )
        })}
      </nav>

      {/* Foydalanuvchi */}
      <div className="p-4 border-t flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate">{user?.first_name} {user?.last_name}</p>
          <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {['super_admin', 'admin', 'teacher'].includes(user?.role) && <NotificationBell />}
          <button
            onClick={onLogout}
            className="text-xs text-red-500 hover:text-red-700 whitespace-nowrap px-1"
          >
            Chiqish
          </button>
        </div>
      </div>
    </>
  )
}

/* ── Asosiy Layout ──────────────────────────────────────────────────── */
export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location         = useLocation()
  const navigate         = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => { await logout(); navigate('/login') }
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-white shadow-md flex flex-col
        transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <SidebarContent
          user={user}
          location={location}
          onNavClick={closeSidebar}
          onLogout={handleLogout}
        />
      </aside>

      {/* Asosiy maydon */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 bg-white border-b border-gray-100 px-4 py-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <ElementLogo size={28} />
          <span className="font-bold text-gray-800">element</span>
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>

      {/* AI Chat */}
      {['super_admin', 'admin', 'teacher'].includes(user?.role) && <AiChat />}
    </div>
  )
}
