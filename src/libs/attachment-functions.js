// Helper functions
export function isImage(file) {
  if (!file) return false
  const ext = fileExtension(file)
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'jfif'].includes(ext)
}

export  function isPDF(file) {
  return fileExtension(file) === 'pdf'
}

export  function fileExtension(file) {
  if (typeof file === 'string') {
    return file.split('.').pop().toLowerCase()
  }
  return ''
}

export  function fileUrl(file) {
  if( typeof file !==  'string') {
    return ''
  }
  // If Laravel stores full URL, use directly; otherwise, prepend base path
  return file.startsWith('http')
    ? file
    : `${import.meta.env.VITE_API_BASE_URL || ''}/storage/${file}`
}
