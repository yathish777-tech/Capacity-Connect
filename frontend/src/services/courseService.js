import api from './api'

export const getPublishedCourses = () => api.get('/courses').then((r) => r.data)

export const getCourse = (courseId) => api.get(`/courses/${courseId}`).then((r) => r.data)

export const getCourseMaterials = (courseId) => api.get(`/courses/${courseId}/materials`).then((r) => r.data)

export const getCourseMaterialUrl = (courseId, materialId) =>
  api.get(`/courses/${courseId}/materials/${materialId}/url`).then((r) => r.data)
