import api from './api'

export const requestCertificate = (courseId) =>
  api.post(`/trainee/courses/${courseId}/certificate-request`).then((r) => r.data)

export const getMyCertificates = () => api.get('/trainee/certificates').then((r) => r.data)
export async function downloadCertificate(certificateId) {
  const response = await api.get(`/trainee/certificates/${certificateId}/download`, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `certificate-${certificateId}.pdf`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
