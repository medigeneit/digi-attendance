import apiClient from '@/axios'

export async function upsertLocationByName(name) {
  // backend: creates if not exists, returns { id, name, ... }
  try {
    const { data } = await apiClient.post('/lookups/locations', { name })
    return data
  } catch (e) {
    throw e
  }
}

export async function searchLocations(q = '', limit = 8) {
  try {
    const { data } = await apiClient.get('/lookups/locations', { params: { q, limit } })
    return Array.isArray(data?.data) ? data.data : (data || [])
  } catch (e) {
    return []
  }
}
