import { useEffect, useState } from 'react'
import { studentsApi, groupsApi, testsApi } from '../services/api'

export default function Dashboard() {
  const [stats, setStats] = useState({ students: 0, groups: 0, tests: 0 })

  useEffect(() => {
    Promise.all([studentsApi.list(), groupsApi.list(), testsApi.list()]).then(
      ([s, g, t]) => setStats({ students: s.data.length, groups: g.data.length, tests: t.data.length })
    ).catch(() => {})
  }, [])

  const cards = [
    { label: "O'quvchilar", value: stats.students, icon: '👨‍🎓', color: 'blue' },
    { label: 'Guruhlar', value: stats.groups, icon: '👥', color: 'green' },
    { label: 'Testlar', value: stats.tests, icon: '📝', color: 'purple' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4">
            <div className="text-4xl">{card.icon}</div>
            <div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-3xl font-bold text-gray-800">{card.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
