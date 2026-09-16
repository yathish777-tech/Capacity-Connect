import api from './api'

export const enrollInCourse = (courseId) => api.post(`/trainee/courses/${courseId}/enroll`).then((r) => r.data)

export const getMyEnrollments = () => api.get('/trainee/enrollments').then((r) => r.data)

export const submitFeedback = (courseId, rating, comments) =>
  api.post('/trainee/feedback', { course_id: courseId, rating, comments }).then((r) => r.data)
