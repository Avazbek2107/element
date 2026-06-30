import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Groups from './pages/Groups'
import Tests from './pages/Tests'
import Attendance from './pages/Attendance'
import Teachers from './pages/Teachers'
import Results from './pages/Results'
import Timetable from './pages/Timetable'
import Rooms from './pages/Rooms'
import Materials from './pages/Materials'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Yuklanmoqda...</div>
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/students" element={<PrivateRoute><Students /></PrivateRoute>} />
          <Route path="/groups" element={<PrivateRoute><Groups /></PrivateRoute>} />
          <Route path="/tests" element={<PrivateRoute><Tests /></PrivateRoute>} />
          <Route path="/attendance" element={<PrivateRoute><Attendance /></PrivateRoute>} />
          <Route path="/teachers" element={<PrivateRoute><Teachers /></PrivateRoute>} />
          <Route path="/results" element={<PrivateRoute><Results /></PrivateRoute>} />
          <Route path="/timetable" element={<PrivateRoute><Timetable /></PrivateRoute>} />
          <Route path="/rooms" element={<PrivateRoute><Rooms /></PrivateRoute>} />
          <Route path="/materials" element={<PrivateRoute><Materials /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
