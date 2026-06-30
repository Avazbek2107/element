import { useEffect, useState } from 'react'
import { testsApi, groupsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

import TestForm from './TestForm'
import TestTake from './TestTake'
import ImportTestModal from '../components/ImportTestModal'
import StudyMode from '../components/StudyMode'
import PaperTestModal from '../components/PaperTestModal'

export default function Tests() {
  const { user } = useAuth()
  const [tests, setTests] = useState([])
  const [groups, setGroups] = useState([])
  const [view, setView] = useState('list')
  const [selectedTest, setSelectedTest] = useState(null)
  const [editTest, setEditTest] = useState(null)
  const [editQuestions, setEditQuestions] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [showPaper, setShowPaper] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(null)

  const isTeacher = ['admin', 'teacher'].includes(user?.role)

  const load = () => {
    testsApi.list().then(({ data }) => setTests(data)).catch(() => {})
  }

  useEffect(() => {
    load()
    if (isTeacher) groupsApi.list().then(({ data }) => setGroups(data)).catch(() => {})
  }, [])

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

  const handleEdit = async (test) => {
    setLoadingEdit(test.id)
    try {
      const { data: questions } = await testsApi.getQuestionsForEdit(test.id)
      setEditTest(test)
      setEditQuestions(questions)
      setView('edit')
    } catch {
      toast.error('Savollarni yuklashda xatolik')
    } finally {
      setLoadingEdit(null)
    }
  }

  const handleBackFromEdit = () => {
    setView('list')
    setEditTest(null)
    setEditQuestions(null)
    load()
  }

  if (view === 'create') return <TestForm onBack={() => { setView('list'); load() }} />
  if (view === 'edit' && editTest) {
    return (
      <TestForm
        editTest={editTest}
        editQuestions={editQuestions}
        onBack={handleBackFromEdit}
      />
    )
  }
  if (view === 'take' && selectedTest) {
    return <TestTake test={selectedTest} onBack={() => { setView('list'); setSelectedTest(null) }} />
  }
  if (view === 'study' && selectedTest) {
    return <StudyMode test={selectedTest} onBack={() => { setView('list'); setSelectedTest(null) }} />
  }

  const typeLabels = { weekly: 'Haftalik', monthly: 'Oylik', final: 'Yakuniy', practice: 'Amaliyot' }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Testlar</h1>
        {isTeacher && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg text-sm hover:bg-blue-50"
            >
              Word/PDF import
            </button>
            <button
              onClick={() => setShowPaper(true)}
              className="border border-orange-400 text-orange-600 px-4 py-2 rounded-lg text-sm hover:bg-orange-50"
            >
              📄 Qog'oz test
            </button>
            <button
              onClick={() => setView('create')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              + Yangi test
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tests.map((t) => (
          <div key={t.id} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-800 pr-2">{t.title}</h3>
              <div className="flex gap-2 shrink-0">
                {t.answer_key
                  ? <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">📄 Qog'oz</span>
                  : <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{typeLabels[t.test_type]}</span>
                }
                <span className={`text-xs px-2 py-0.5 rounded-full ${t.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {t.is_published ? 'Nashr' : 'Qoralama'}
                </span>
              </div>
            </div>
            {t.answer_key && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-orange-50 rounded-lg">
                <span className="text-xs text-gray-500">Bot uchun ID:</span>
                <code className="text-sm font-mono font-bold text-orange-700">#{t.id}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(`/javob ${t.id} `); toast.success('Nusxalandi') }}
                  className="ml-auto text-xs text-orange-600 hover:text-orange-800 font-medium"
                >
                  Nusxalash
                </button>
              </div>
            )}
            {t.description && <p className="text-sm text-gray-500 mb-3">{t.description}</p>}
            <div className="flex gap-4 text-xs text-gray-400 mb-4">
              <span>{t.duration_minutes} daqiqa</span>
              <span>{t.total_questions} savol</span>
              <span>O'tish: {t.passing_score}%</span>
            </div>
            <div className="flex gap-3 pt-3 border-t border-gray-100 flex-wrap items-center">
              {isTeacher && (
                <>
                  {!t.is_published && (
                    <button onClick={() => handlePublish(t.id)} className="text-green-600 text-xs hover:underline">
                      Nashr etish
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(t)}
                    disabled={loadingEdit === t.id}
                    className="text-blue-600 text-xs hover:underline disabled:opacity-50"
                  >
                    {loadingEdit === t.id ? 'Yuklanmoqda...' : 'Tahrirlash'}
                  </button>
                  <button
                    onClick={() => { setSelectedTest(t); setView('study') }}
                    className="text-indigo-600 text-xs hover:underline"
                  >
                    O'qitish rejimi
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="text-red-500 text-xs hover:underline">
                    O'chirish
                  </button>
                </>
              )}
              {!isTeacher && t.is_published && (
                <button
                  onClick={() => { setSelectedTest(t); setView('take') }}
                  className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs hover:bg-blue-700"
                >
                  Testni boshlash
                </button>
              )}
              {!isTeacher && t.is_published && (
                <button
                  onClick={() => { setSelectedTest(t); setView('study') }}
                  className="border border-gray-200 text-gray-600 px-4 py-1.5 rounded-lg text-xs hover:bg-gray-50"
                >
                  O'rganish
                </button>
              )}
            </div>
          </div>
        ))}
        {tests.length === 0 && (
          <p className="col-span-2 text-center text-gray-400 py-12">Testlar topilmadi</p>
        )}
      </div>

      {showImport && (
        <ImportTestModal
          groups={groups}
          onClose={() => setShowImport(false)}
          onCreated={load}
        />
      )}
      {showPaper && (
        <PaperTestModal
          groups={groups}
          onClose={() => setShowPaper(false)}
          onCreated={load}
        />
      )}
    </div>
  )
}
