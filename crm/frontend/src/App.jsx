import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Suspense, lazy } from 'react'
import Layout from './components/Layout'

const Login     = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Students  = lazy(() => import('./pages/Students'))
const Groups    = lazy(() => import('./pages/Groups'))
const Tests     = lazy(() => import('./pages/Tests'))
const Attendance= lazy(() => import('./pages/Attendance'))
const Teachers  = lazy(() => import('./pages/Teachers'))
const Results   = lazy(() => import('./pages/Results'))
const Timetable = lazy(() => import('./pages/Timetable'))
const Rooms     = lazy(() => import('./pages/Rooms'))
const Materials = lazy(() => import('./pages/Materials'))
const Payments    = lazy(() => import('./pages/Payments'))
const Assessments = lazy(() => import('./pages/Assessments'))
const SuperAdmin  = lazy(() => import('./pages/SuperAdmin'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
      Yuklanmoqda...
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Suspense fallback={<PageLoader />}>
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
            <Route path="/payments"     element={<PrivateRoute><Payments    /></PrivateRoute>} />
            <Route path="/assessments"  element={<PrivateRoute><Assessments /></PrivateRoute>} />
            <Route path="/super-admin"  element={<PrivateRoute><SuperAdmin  /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
