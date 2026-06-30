import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useRef, useState } from 'react'
import { attendanceApi } from '../services/api'
import ElementLogo from './ElementLogo'
import AiChat from './AiChat'

const navItems = [
  { path: '/',           label: 'Dashboard',          roles: ['admin', 'teacher'] },
  { path: '/students',   label: "O'quvchilar",         roles: ['admin', 'teacher'] },
  { path: '/groups',     label: 'Guruhlar',            roles: ['admin', 'teacher'] },
  { path: '/teachers',   label: "O'qituvchilar",       roles: ['admin'] },
  { path: '/attendance', label: "Yo'qlama",            roles: ['admin', 'teacher'] },
  { path: '/tests',      label: 'Testlar',             roles: ['admin', 'teacher', 'student'] },
  { path: '/results',    label: 'Natijalar',           roles: ['admin', 'teacher', 'student'] },
  { path: '/timetable',  label: 'Dars Jadvali',        roles: ['admin', 'teacher', 'student'] },
  { path: '/rooms',      label: "O'quv xona",          roles: ['admin', 'teacher'] },
  { path: '/materials',  label: "O'quv materiallari",  roles: ['admin', 'teacher', 'student'] },
]

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}

function NotificationBell() {
  const [notifs, setNotifs] = useState([])
  const [open,   setOpen]   = useState(false)
  const ref = useRef()

  useEffect(() => {
    const fetch = () => {
      attendanceApi.notifications()
        .then(({ data }) => setNotifs(data))
        .catch(() => {})
    }
    fetch()
    const interval = setInterval(fetch, 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!open) return
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <BellIcon />
        {notifs.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold leading-none">
            {notifs.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">Bildirishnomalar</span>
            {notifs.length > 0 && (
              <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                {notifs.length} ta
              </span>
            )}
          </div>

          {notifs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Bildirishnomalar yo'q</p>
          ) : (
            <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
              {notifs.map((n, i) => (
                <li key={i} className="px-4 py-3 hover:bg-red-50 transition-colors">
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{n.group_name}</p>
                      <p className="text-xs text-red-600 mt-0.5">Yo'qlama belgilanmagan — {n.time}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.date}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function SidebarContent({ user, location, onNavClick, onLogout }) {
  const visibleItems = navItems.filter(item => item.roles.includes(user?.role))

  return (
    <>
      <div className="p-5 border-b flex items-center gap-3">
        <ElementLogo size={38} />
        <div>
          <div className="text-base font-bold text-gray-900 tracking-wide">element</div>
          <div className="text-xs text-gray-400 tracking-widest uppercase">O'quv markazi</div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavClick}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === item.path
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate">{user?.first_name} {user?.last_name}</p>
          <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(user?.role === 'admin' || user?.role === 'teacher') && <NotificationBell />}
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

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location         = useLocation()
  const navigate         = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={closeSidebar}
        />
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

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 bg-white border-b border-gray-100 px-4 py-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <MenuIcon />
          </button>
          <ElementLogo size={28} />
          <span className="font-bold text-gray-800">element</span>
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>

      {/* AiChat — sidebar tashqarisida, transform ta'sir qilmaydi */}
      {(user?.role === 'admin' || user?.role === 'teacher') && <AiChat />}
    </div>
  )
}
