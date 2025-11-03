import apiClient from '@/axios'

const normalize = (row) => ({ id: Number(row.id), name: String(row.name), slug: row.slug })

function take(arr) {
  if (Array.isArray(arr?.data)) return arr.data
  if (Array.isArray(arr)) return arr
  return []
}

export async function fetchSkills(q = '', limit = 10) {
  try {
    const { data } = await apiClient.get('/lookups/skills', { params: { q, limit } })
    const rows = take(data).map(normalize)
    return rows
  } catch (e) {
    return []
  }
}

export async function createSkill(name) {
  const { data } = await apiClient.post('/lookups/skills', { name })
  return normalize(data)
}

export async function skillsByIds(ids = []) {
  if (!ids?.length) return []
  const { data } = await apiClient.post('/lookups/skills/by-ids', { ids })
  return take(data).map(normalize)
}
