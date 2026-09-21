import api from './api'

// Trainer
export const createQuestionnaire = (payload) => api.post('/assessments/questionnaires', payload).then((r) => r.data)
export const getMyQuestionnaires = (courseId) =>
  api.get('/assessments/questionnaires/mine', { params: courseId ? { course_id: courseId } : {} }).then((r) => r.data)
export const getQuestionnaireAttempts = (questionnaireId) =>
  api.get(`/assessments/questionnaires/${questionnaireId}/attempts`).then((r) => r.data)

// Trainee
export const getAvailableQuestionnaires = (courseId) =>
  api.get(`/assessments/course/${courseId}/available`).then((r) => r.data)
export const startAttempt = (questionnaireId) =>
  api.post(`/assessments/questionnaires/${questionnaireId}/start`).then((r) => r.data)
export const logViolation = (attemptId, violationType) =>
  api.post(`/assessments/attempts/${attemptId}/violation`, { violation_type: violationType }).then((r) => r.data)
export const submitAttempt = (attemptId, answers) =>
  api.post(`/assessments/attempts/${attemptId}/submit`, { answers }).then((r) => r.data)
export const getAttempt = (attemptId) => api.get(`/assessments/attempts/${attemptId}`).then((r) => r.data)
export const getAttemptReview = (attemptId) => api.get(`/assessments/attempts/${attemptId}/review`).then((r) => r.data)
export const requestReattempt = (attemptId, reason) => api.post(`/assessments/attempts/${attemptId}/request-reattempt`, { reason }).then((r) => r.data)
export const getPendingReattempts = () => api.get('/assessments/reattempt-requests/pending').then((r) => r.data)
export const reviewReattempt = (requestId, action) => api.post(`/assessments/reattempt-requests/${requestId}/review`, { action }).then((r) => r.data)
