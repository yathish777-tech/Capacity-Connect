import api from './api'

export const getMyCourseRequests = () => api.get('/trainer/course-requests').then((r) => r.data)
export const respondToCourseRequest = (requestId, accept) =>
  api.post(`/trainer/course-requests/${requestId}/respond`, { accept }).then((r) => r.data)

export const getMyCourses = () => api.get('/trainer/courses').then((r) => r.data)
export const getCourseTrainees = (courseId) => api.get(`/trainer/courses/${courseId}/trainees`).then((r) => r.data)

export const updateProfile = (payload) => api.patch('/trainer/profile', payload).then((r) => r.data)

export const getMyCourseMaterials = (courseId) =>
  api.get(`/trainer/courses/${courseId}/materials`).then((r) => r.data)

export const getMyCourseMaterialUrl = (courseId, materialId) =>
  api.get(`/trainer/courses/${courseId}/materials/${materialId}/url`).then((r) => r.data)

export const uploadMaterial = (courseId, { title, fileType, file }) => {
  const form = new FormData()
  form.append('title', title)
  form.append('file_type', fileType)
  form.append('file', file)
  return api
    .post(`/trainer/courses/${courseId}/materials`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}

export const replaceMaterial = (courseId, materialId, { title, fileType, file }) => {
  const form = new FormData()
  if (title) form.append('title', title)
  if (fileType) form.append('file_type', fileType)
  form.append('file', file)
  return api
    .put(`/trainer/courses/${courseId}/materials/${materialId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}

export const deleteMaterial = (courseId, materialId) =>
  api.delete(`/trainer/courses/${courseId}/materials/${materialId}`).then((r) => r.data)
