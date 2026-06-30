import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ElementLogo from './ElementLogo'

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊', roles: ['admin', 'teacher'] },
  { path: '/students', label: "O'quvchilar", icon: '👨‍🎓', roles: ['admin', 'teacher'] },
  { path: '/groups', label: 'Guruhlar', icon: '👥', roles: ['admin', 'teacher'] },
  { path: '/tests', label: 'Testlar', icon: '📝', roles: ['admin', 'teacher', 'student'] },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleItems = navItems.filter((item) => item.roles.includes(user?.role))

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-5 border-b flex items-center gap-3">
          <ElementLogo size={38} />
          <div>
            <div className="text-base font-bold text-gray-900 tracking-wide">element</div>
            <div className="text-xs text-gray-400 tracking-widest uppercase">O'quv markazi</div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {visibleItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <p className="text-sm text-gray-500 mb-1">{user?.first_name} {user?.last_name}</p>
          <p className="text-xs text-gray-400 mb-3 capitalize">{user?.role}</p>
          <button
            onClick={handleLogout}
            className="w-full text-sm text-red-500 hover:text-red-700 text-left"
          >
            Chiqish
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
