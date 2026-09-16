import api from './api'

export const signup = (payload) => api.post('/auth/signup', payload).then((r) => r.data)

export const login = (email, password) => api.post('/auth/login', { email, password }).then((r) => r.data)

export const fetchMe = () => api.get('/auth/me').then((r) => r.data)
