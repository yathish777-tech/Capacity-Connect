import api from './api'

export const askDoubtBot = (courseId, question) =>
  api.post('/ai-doubt/ask', { course_id: courseId, question }).then((r) => r.data)
