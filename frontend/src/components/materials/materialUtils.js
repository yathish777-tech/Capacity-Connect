export function formatFileSize(bytes) {
  if (!bytes) return 'Size unavailable'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export function uploadDate(material) {
  const value = material.created_at || material.uploaded_at
  return value ? new Date(value).toLocaleDateString() : 'Upload date unavailable'
}

export function isPdf(material) {
  return material.mime_type === 'application/pdf' || material.file_type === 'pdf'
}

export function isVideo(material) {
  return material.file_type === 'video' || material.mime_type?.startsWith('video/')
}

export function isPresentation(material) {
  return material.file_type === 'ppt' || ['ppt', 'pptx'].includes(material.file_name?.split('.').pop()?.toLowerCase())
}
