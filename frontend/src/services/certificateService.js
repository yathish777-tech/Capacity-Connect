import api from './api'

export const requestCertificate = (courseId) =>
  api.post('/certificates/request', { course_id: courseId }).then((r) => r.data)

export const getMyCertificates = () => api.get('/certificates/mine').then((r) => r.data)
