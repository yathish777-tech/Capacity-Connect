import api from './api'

export const getOverview = () => api.get('/admin/overview').then((r) => r.data)

export const getUsers = () => api.get('/admin/users').then((r) => r.data)

export const getPendingTrainees = () => api.get('/admin/trainees/pending').then((r) => r.data)
export const reviewTrainee = (userId, action) =>
  api.post(`/admin/trainees/${userId}/review`, { action }).then((r) => r.data)

export const getPendingTrainers = () => api.get('/admin/trainers/pending').then((r) => r.data)
export const reviewTrainer = (userId, action) =>
  api.post(`/admin/trainers/${userId}/review`, { action }).then((r) => r.data)

export const createCourse = (payload) => api.post('/admin/courses', payload).then((r) => r.data)
export const getAdminCourses = () => api.get('/admin/courses').then((r) => r.data)
export const getTrainerSuggestions = (courseId) =>
  api.get(`/admin/courses/${courseId}/trainer-suggestions`).then((r) => r.data)
export const sendCourseRequest = (courseId, trainerId, message) =>
  api.post(`/admin/courses/${courseId}/course-requests`, { trainer_id: trainerId, message }).then((r) => r.data)

export const getPendingMaterials = () => api.get('/admin/materials/pending').then((r) => r.data)
export const getAdminCourseMaterials = (courseId) =>
  api.get(`/admin/courses/${courseId}/materials`).then((r) => r.data)
export const getAdminMaterialUrl = (materialId) => api.get(`/admin/materials/${materialId}/url`).then((r) => r.data)
export const reviewMaterial = (materialId, action) =>
  api.post(`/admin/materials/${materialId}/review`, { action }).then((r) => r.data)
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
