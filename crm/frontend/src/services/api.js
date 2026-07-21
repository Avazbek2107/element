import axios from 'axios'

// Token'lar endi httpOnly cookie'da saqlanadi (JS o'qiy olmaydi) — brauzer
// har so'rovga ularni avtomatik qo'shadi, shuning uchun withCredentials shart.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
})

let refreshing = null

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    const isAuthEndpoint = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh-token')
    if (error.response?.status === 401 && !original?._retry && !isAuthEndpoint) {
      original._retry = true
      try {
        refreshing = refreshing || api.post('/auth/refresh-token')
        await refreshing
        refreshing = null
        return api(original)
      } catch {
        refreshing = null
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  verify2fa: (data) => api.post('/auth/login/2fa-verify', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
}

export const twoFaApi = {
  status:  ()       => api.get('/2fa/status'),
  setup:   ()       => api.post('/2fa/setup'),
  confirm: (code)   => api.post('/2fa/confirm', { code }),
  disable: (code)   => api.post('/2fa/disable', { code }),
  reset:   (userId) => api.post(`/2fa/reset/${userId}`),
}

export const studentsApi = {
  list: (params) => api.get('/students', { params }),
  get: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  importFile: (formData) => api.post('/students/import', formData),
  progress: (id) => api.get(`/students/${id}/progress`),
}

export const groupsApi = {
  list: () => api.get('/groups'),
  get: (id) => api.get(`/groups/${id}`),
  create: (data) => api.post('/groups', data),
  update: (id, data) => api.put(`/groups/${id}`, data),
  delete: (id) => api.delete(`/groups/${id}`),
  assignStudent: (groupId, studentId) => api.post(`/groups/${groupId}/students/${studentId}`),
  removeStudent: (groupId, studentId) => api.delete(`/groups/${groupId}/students/${studentId}`),
  report: (id, params) => api.get(`/groups/${id}/report`, { params }),
}

export const testsApi = {
  list: () => api.get('/tests'),
  get: (id) => api.get(`/tests/${id}`),
  create: (data) => api.post('/tests', data),
  update: (id, data) => api.put(`/tests/${id}`, data),
  updateFull: (id, data) => api.put(`/tests/${id}/full`, data),
  delete: (id) => api.delete(`/tests/${id}`),
  publish: (id) => api.post(`/tests/${id}/publish`),
  parseFile: (formData) => api.post('/tests/parse-file', formData),
  export: (id, format) => api.get(`/tests/${id}/export`, { params: { format }, responseType: 'blob' }),
  getQuestions: (id) => api.get(`/tests/${id}/questions`),
  getQuestionsForEdit: (id) => api.get(`/tests/${id}/questions-edit`),
  addQuestion: (id, data) => api.post(`/tests/${id}/questions`, data),
  start: (id) => api.post(`/tests/${id}/start`),
  submit: (id, data) => api.post(`/tests/${id}/submit`, data),
  getResults: (id) => api.get(`/tests/${id}/results`),
}

export const usersApi = {
  importTeachers:  (formData) => api.post('/users/import-teachers', formData),
  listTeachers:    ()         => api.get('/users/teachers'),
  createTeacher:   (data)     => api.post('/users/teachers', data),
  updateTeacher:   (id, data) => api.put(`/users/teachers/${id}`, data),
  deleteTeacher:   (id)       => api.delete(`/users/teachers/${id}`),
}

export const materialsApi = {
  listModules:  ()            => api.get('/materials/modules'),
  createModule: (data)        => api.post('/materials/modules', data),
  updateModule: (id, data)    => api.put(`/materials/modules/${id}`, data),
  deleteModule: (id)          => api.delete(`/materials/modules/${id}`),
  listTopics:   (moduleId)    => api.get(`/materials/modules/${moduleId}/topics`),
  createTopic:  (moduleId, d) => api.post(`/materials/modules/${moduleId}/topics`, d),
  updateTopic:  (id, data)    => api.put(`/materials/topics/${id}`, data),
  deleteTopic:  (id)          => api.delete(`/materials/topics/${id}`),
}

export const roomsApi = {
  list:   ()         => api.get('/rooms'),
  create: (data)     => api.post('/rooms', data),
  update: (id, data) => api.put(`/rooms/${id}`, data),
  delete: (id)       => api.delete(`/rooms/${id}`),
}

export const statsApi = {
  get: (group_id) => api.get('/stats', { params: group_id ? { group_id } : {} }),
}

export const resultsApi = {
  my: () => api.get('/results/my'),
  all: (params) => api.get('/results', { params }),
}

export const attendanceApi = {
  list:          (params)         => api.get('/attendance', { params }),
  mark:          (data)           => api.post('/attendance', data),
  summary:       (group_id)       => api.get('/attendance/summary', { params: { group_id } }),
  today:         (group_id)       => api.get('/attendance/today', { params: group_id ? { group_id } : {} }),
  day:           (group_id, date) => api.get('/attendance', { params: { group_id, date_from: date, date_to: date } }),
  notifications: ()               => api.get('/attendance/notifications'),
}

export const aiApi = {
  generateQuestions: (data)    => api.post('/ai/generate-questions', data),
  analyzeReport:     (data)    => api.post('/ai/analyze-report', data),
  analyzeStudent:    (data)    => api.post('/ai/analyze-student', data),
  chat:              (data)    => api.post('/ai/chat', data),
}

export const assessmentsApi = {
  list:          (params)           => api.get('/assessments', { params }),
  bulkSave:      (data, send=false) => api.post(`/assessments/bulk?send=${send}`, data),
  sendReport:    (groupId, date)    => api.post(`/assessments/send-report?group_id=${groupId}&date=${date}`),
  getSchedule:   (groupId)          => api.get(`/assessments/schedule/${groupId}`),
  setSchedule:   (data)             => api.post('/assessments/schedule', data),
  deleteSchedule:(groupId)          => api.delete(`/assessments/schedule/${groupId}`),
}

export const paymentsApi = {
  list:    (params)     => api.get('/payments', { params }),
  summary: (params)     => api.get('/payments/summary', { params }),
  report:  (params)     => api.get('/payments/report', { params }),
  create:  (data)       => api.post('/payments', data),
  bulk:    (data)       => api.post('/payments/bulk', data),
  update:  (id, data)   => api.put(`/payments/${id}`, data),
  delete:  (id)         => api.delete(`/payments/${id}`),
}

export const superAdminApi = {
  listUsers:       (role)        => api.get('/superadmin/users', { params: role ? { role } : {} }),
  createUser:      (data)        => api.post('/superadmin/users', data),
  updateUser:      (id, data)    => api.put(`/superadmin/users/${id}`, data),
  setPermissions:  (id, perms)   => api.put(`/superadmin/users/${id}/permissions`, { permissions: perms }),
  deleteUser:      (id)          => api.delete(`/superadmin/users/${id}`),
  getModules:      ()            => api.get('/superadmin/modules'),
}

export const messagesApi = {
  inbox:        (params)   => api.get('/messages/inbox', { params }),
  unreadCount:  ()         => api.get('/messages/unread-count'),
  markRead:     (id)       => api.put(`/messages/${id}/read`),
  sendInternal: (data)     => api.post('/messages', data),
  sendToParent: (data)     => api.post('/messages', data),
  parentLog:    (studentId)=> api.get('/messages/parent-log', { params: { student_id: studentId } }),
  recipients:   ()         => api.get('/messages/recipients'),
}

export const auditApi = {
  list: (params) => api.get('/audit-logs', { params }),
}

export const telegramApi = {
  getLinkCode:        (studentId) => api.get(`/telegram/link-code/${studentId}`),
  getStudentLinkCode: (studentId) => api.get(`/telegram/student-link-code/${studentId}`),
}

export default api
