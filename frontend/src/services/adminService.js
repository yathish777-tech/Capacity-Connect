import api from './api'

export const getOverview = () => api.get('/admin/overview').then((r) => r.data)

export const getUsers = () => api.get('/admin/users').then((r) => r.data)

export const getUserApprovals = (params = {}) => api.get('/admin/user-approvals', { params }).then((r) => r.data)
export const approveUser = (userId) => api.post(`/admin/user-approvals/${userId}/approve`).then((r) => r.data)
export const rejectUser = (userId, reason) =>
  api.post(`/admin/user-approvals/${userId}/reject`, { action: 'reject', reason }).then((r) => r.data)
export const bulkReviewUsers = (userIds, action, reason) =>
  api.post('/admin/user-approvals/bulk', { user_ids: userIds, action, reason }).then((r) => r.data)

export const getPendingTrainees = () => api.get('/admin/trainees/pending').then((r) => r.data)
export const reviewTrainee = (userId, action) =>
  api.post(`/admin/trainees/${userId}/review`, { action }).then((r) => r.data)

export const getPendingTrainers = () => api.get('/admin/trainers/pending').then((r) => r.data)
export const reviewTrainer = (userId, action) =>
  api.post(`/admin/trainers/${userId}/review`, { action }).then((r) => r.data)

export const createCourse = (payload) => api.post('/admin/courses', payload).then((r) => r.data)
export const getAdminCourses = () => api.get('/admin/courses').then((r) => r.data)
export const updateCourse = (courseId, payload) => api.put(`/admin/courses/${courseId}`, payload).then((r) => r.data)
export const archiveCourse = (courseId) => api.post(`/admin/courses/${courseId}/archive`).then((r) => r.data)
export const deleteCourse = (courseId) => api.delete(`/admin/courses/${courseId}`).then((r) => r.data)
export const getTrainerSuggestions = (courseId) =>
  api.get(`/admin/courses/${courseId}/trainer-suggestions`).then((r) => r.data)
export const sendCourseRequest = (courseId, trainerId, message) =>
  api.post(`/admin/courses/${courseId}/course-requests`, { trainer_id: trainerId, message }).then((r) => r.data)

export const getPendingMaterials = () => api.get('/admin/materials/pending').then((r) => r.data)
export const getAdminCourseMaterials = (courseId) =>
  api.get(`/admin/courses/${courseId}/materials`).then((r) => r.data)
export const getAdminMaterialUrl = (materialId) => api.get(`/admin/materials/${materialId}/url`).then((r) => r.data)
export const reviewMaterial = (materialId, action, remark) =>
  api.post(`/admin/materials/${materialId}/review`, { action, remark }).then((r) => r.data)
export const uploadAdminMaterial = (courseId, { title, fileType, file }) => {
  const form = new FormData()
  form.append('title', title)
  form.append('file_type', fileType)
  form.append('file', file)
  return api.post(`/admin/courses/${courseId}/materials`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
}
export const replaceAdminMaterial = (courseId, materialId, { title, fileType, file }) => {
  const form = new FormData()
  if (title) form.append('title', title)
  if (fileType) form.append('file_type', fileType)
  form.append('file', file)
  return api
    .put(`/admin/courses/${courseId}/materials/${materialId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}
export const deleteAdminMaterial = (courseId, materialId) =>
  api.delete(`/admin/courses/${courseId}/materials/${materialId}`).then((r) => r.data)

export const getPendingCertificates = () => api.get('/admin/certificates/pending').then((r) => r.data)
export const reviewCertificate = (certificateId, action) =>
  api.post(`/admin/certificates/${certificateId}/review`, { action }).then((r) => r.data)
export const uploadCertificateTemplate = (courseId, { file, x, y, fontSize }) => {
  const form = new FormData()
  form.append('file', file)
  form.append('x', x)
  form.append('y', y)
  form.append('font_size', fontSize)
  return api.put(`/admin/courses/${courseId}/certificate-template`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
}
export const getCertificateTemplate = (courseId) =>
  api.get(`/admin/courses/${courseId}/certificate-template`).then((r) => r.data)
export const deleteCertificateTemplate = (courseId) =>
  api.delete(`/admin/courses/${courseId}/certificate-template`).then((r) => r.data)
export const getCertificateRequests = (params = {}) =>
  api.get('/admin/certificate-requests', { params }).then((r) => r.data)
export const approveCertificateRequest = (requestId, remark) =>
  api.post(`/admin/certificate-requests/${requestId}/approve`, { remark }).then((r) => r.data)
export const rejectCertificateRequest = (requestId, remark) =>
  api.post(`/admin/certificate-requests/${requestId}/reject`, { remark }).then((r) => r.data)

export const createAnnouncement = (payload) => api.post('/admin/announcements', payload).then((r) => r.data)
export const getAnnouncements = () => api.get('/admin/announcements').then((r) => r.data)

export async function downloadReportCsv() {
  const response = await api.get('/admin/reports/export.csv', { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'capacity_connect_report.csv')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
