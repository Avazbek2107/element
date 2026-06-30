import { useEffect, useState } from 'react'
import { testsApi, groupsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import TestForm from './TestForm'
import TestTake from './TestTake'

export default function Tests() {
  const { user } = useAuth()
  const [tests, setTests] = useState([])
  const [view, setView] = useState('list') // list | create | take
  const [selectedTest, setSelectedTest] = useState(null)

  const isTeacher = ['admin', 'teacher'].includes(user?.role)

  const load = () => testsApi.list().then(({ data }) => setTests(data)).catch(() => {})

  useEffect(() => { load() }, [])

  const handlePublish = async (id) => {
    try {
      await testsApi.publish(id)
      toast.success('Test nashr etildi')
      load()
    } catch {
      toast.error('Xatolik')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return
    try {
      await testsApi.delete(id)
      toast.success("Test o'chirildi")
      load()
    } catch {
      toast.error('Xatolik')
    }
  }

  if (view === 'create') {
    return <TestForm onBack={() => { setView('list'); load() }} />
  }

  if (view === 'take' && selectedTest) {
    return <TestTake test={selectedTest} onBack={() => { setView('list'); setSelectedTest(null) }} />
  }

  const typeLabels = { weekly: 'Haftalik', monthly: 'Oylik', final: 'Yakuniy', practice: 'Amaliyot' }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Testlar</h1>
        {isTeacher && (
          <button onClick={() => setView('create')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            + Yangi test
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tests.map((t) => (
          <div key={t.id} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-800">{t.title}</h3>
              <div className="flex gap-2">
                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                  {typeLabels[t.test_type]}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${t.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {t.is_published ? 'Nashr' : 'Qoralama'}
                </span>
              </div>
            </div>
            {t.description && <p className="text-sm text-gray-500 mb-3">{t.description}</p>}
            <div className="flex gap-4 text-xs text-gray-400 mb-4">
              <span>⏱ {t.duration_minutes} daqiqa</span>
              <span>❓ {t.total_questions} savol</span>
              <span>✅ O'tish: {t.passing_score}%</span>
            </div>
            <div className="flex gap-2 pt-3 border-t border-gray-100">
              {isTeacher && (
                <>
                  {!t.is_published && (
                    <button onClick={() => handlePublish(t.id)} className="text-green-600 text-xs hover:underline">Nashr etish</button>
                  )}
                  <button onClick={() => handleDelete(t.id)} className="text-red-500 text-xs hover:underline">O'chirish</button>
                </>
              )}
              {!isTeacher && t.is_published && (
                <button onClick={() => { setSelectedTest(t); setView('take') }}
                  className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs hover:bg-blue-700">
                  Testni boshlash
                </button>
              )}
            </div>
          </div>
        ))}
        {tests.length === 0 && (
          <p className="col-span-2 text-center text-gray-400 py-12">Testlar topilmadi</p>
        )}
      </div>
    </div>
  )
}
