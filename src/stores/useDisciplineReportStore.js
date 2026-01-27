import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import apiClient from '../axios'

const toArray = (value) => (Array.isArray(value) ? value : [])

const normalizeMonth = (month) => {
  if (!month) return null
  const month_start = month.month_start || month.monthStart || month.start || month.value
  const label = month.label || month.name || ''
  return { ...month, month_start, label }
}

const normalizeRecord = (record) => {
  if (!record) return {}
  const paycutsRaw =
    record.paycuts || record.paycut_items || record.paycut_list || record.paycut || []
  return {
    ...record,
    manual_indisciplines: toArray(
      record.manual_indisciplines || record.indisciplines || record.manualIndisciplines
    ),
    manual_actions: toArray(record.manual_actions || record.actions || record.manualActions),
    attachments: toArray(record.attachments || record.attachment_files || record.files),
    letters: toArray(record.letters || record.text_letters || record.letter_attachments),
    paycuts: Array.isArray(paycutsRaw) ? paycutsRaw : paycutsRaw ? [paycutsRaw] : [],
  }
}

const normalizeResponsePayload = (response) => {
  const data = response?.data || {}
  if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    return data.data
  }
  return data
}

const normalizeReportRow = (row) => {
  if (!row?.user || !row?.months) return row
  const baseUser = row.user || {}
  const yearReview = row.year_review || {}
  const monthRecords = Object.entries(row.months || {}).map(([month_start, month]) => {
    const manualIndisciplines = toArray(month?.indiscipline?.manual)
    const manualActions = toArray(month?.actions?.manual)
    const paycut = month?.paycut || null
    const attachmentCount = Number(month?.attachment_count ?? month?.attachments_count ?? 0)
    return {
      month_start,
      paycut,
      paycuts: paycut ? [paycut] : [],
      manual_indisciplines: manualIndisciplines,
      manual_actions: manualActions,
      indisciplines: manualIndisciplines,
      actions: manualActions,
      attachments_count: attachmentCount,
      attachment_count: attachmentCount,
    }
  })
  const finalScore = yearReview?.final_score
  return {
    ...baseUser,
    month_records: monthRecords,
    final_outcome: finalScore ?? baseUser.final_outcome,
    final_score: finalScore ?? baseUser.final_score,
    yearly_final_outcome: finalScore ?? baseUser.yearly_final_outcome,
  }
}

const normalizeUser = (user) => {
  const normalized = normalizeReportRow(user)
  const month_records = toArray(
    normalized.month_records ||
      normalized.monthRecords ||
      normalized.records ||
      normalized.months
  )
  const monthMap = {}
  month_records.forEach((record) => {
    const month_start = record?.month_start || record?.monthStart
    if (!month_start) return
    monthMap[month_start] = normalizeRecord(record)
  })
  return { ...normalized, _monthMap: monthMap }
}

const normalizePagination = (payload) => {
  const meta = payload?.meta || payload?.pagination || {}
  const page = Number(payload?.current_page || meta.current_page || meta.page || 1)
  const perPage = Number(payload?.per_page || meta.per_page || meta.perPage || 25)
  const total = Number(payload?.total || meta.total || 0)
  const lastPage = Number(payload?.last_page || meta.last_page || meta.lastPage)
  return {
    page,
    per_page: perPage,
    total,
    last_page: lastPage || (perPage > 0 ? Math.ceil(total / perPage) : 1),
  }
}

const cleanParams = (payload) => {
  const params = {}
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params[key] = value
  })
  return params
}

export const useDisciplineReportStore = defineStore('discipline-report', () => {
  const users = ref([])
  const months = ref([])
  const pagination = ref({ page: 1, per_page: 25, total: 0, last_page: 1 })
  const filters = ref({
    year: new Date().getFullYear(),
    search: '',
    company_id: '',
    department_id: '',
    line_type: 'all',
    employee_id: '',
    page: 1,
    per_page: 25,
  })
  const loading = ref(false)
  const error = ref(null)

  const reportUsers = computed(() => users.value)
  const reportMonths = computed(() => months.value)
  const reportPagination = computed(() => pagination.value)

  const setFilters = (next = {}) => {
    const allowedKeys = [
      'year',
      'search',
      'company_id',
      'department_id',
      'line_type',
      'employee_id',
      'page',
      'per_page',
    ]
    allowedKeys.forEach((key) => {
      if (key in next) filters.value[key] = next[key]
    })
  }

  const findUserIndex = (userId) =>
    users.value.findIndex(
      (user) => Number(user?.id || user?.user_id) === Number(userId)
    )

  const findMonthRecord = (userId, monthStart) => {
    const index = findUserIndex(userId)
    if (index < 0) return null
    return users.value[index]?._monthMap?.[monthStart] || null
  }

  const fetchReport = async (nextFilters = {}) => {
    loading.value = true
    error.value = null
    try {
      setFilters(nextFilters)
      const params = cleanParams({ ...filters.value, ...nextFilters })
      const response = await apiClient.get('/discipline-report', { params })
      const payload = normalizeResponsePayload(response)

      const rawUsers = Array.isArray(payload)
        ? payload
        : payload.users || payload.data || payload.items || []
      users.value = toArray(rawUsers).map(normalizeUser)

      months.value = toArray(payload.months || payload.month_list || payload.months_list)
        .map(normalizeMonth)
        .filter(Boolean)

      pagination.value = normalizePagination(payload)
    } catch (err) {
      error.value = err
      console.error('Error fetching discipline report:', err)
    } finally {
      loading.value = false
    }
  }

  const mergeMonthPayload = (payload, monthStart) => {
    const rawUsers = Array.isArray(payload)
      ? payload
      : payload.users || payload.data || payload.items || []
    const incoming = toArray(rawUsers).map(normalizeUser)

    if (!incoming.length) return

    incoming.forEach((incomingUser) => {
      const userId = incomingUser?.id || incomingUser?.user_id
      if (!userId) return
      const index = findUserIndex(userId)
      if (index === -1) {
        users.value.push(incomingUser)
        return
      }
      const target = users.value[index]
      const existingMap = target._monthMap || {}
      const nextMap = { ...existingMap }
      const incomingRecord = incomingUser._monthMap?.[monthStart]
      if (incomingRecord) {
        nextMap[monthStart] = incomingRecord
      }
      users.value[index] = {
        ...target,
        ...incomingUser,
        _monthMap: nextMap,
      }
    })

    if (payload.months) {
      months.value = toArray(payload.months).map(normalizeMonth).filter(Boolean)
    }
  }

  const refreshMonth = async (monthStart) => {
    if (!monthStart) return
    loading.value = true
    error.value = null
    try {
      const params = cleanParams({ ...filters.value, month_start: monthStart })
      const response = await apiClient.get('/discipline-report', { params })
      const payload = normalizeResponsePayload(response)
      mergeMonthPayload(payload, monthStart)
    } catch (err) {
      error.value = err
      console.error('Error refreshing discipline month:', err)
    } finally {
      loading.value = false
    }
  }

  const ensureMonthRecord = async (userId, year, monthStart) => {
    if (!userId || !monthStart) return
    try {
      const response = await apiClient.post('/discipline/month-records/ensure', {
        user_id: userId,
        year,
        month_start: monthStart,
      })

      const record = response?.data?.data || response?.data || null
      if (record) {
        const index = findUserIndex(userId)
        if (index >= 0) {
          const monthMap = users.value[index]._monthMap || {}
          users.value[index]._monthMap = {
            ...monthMap,
            [monthStart]: normalizeRecord(record),
          }
        }
      }
    } catch (err) {
      console.error('Error ensuring month record:', err)
      throw err
    }
  }

  const createManualIndiscipline = async (payload) => {
    const monthStart = payload?.month_start
    await apiClient.post('/discipline/indisciplines', payload)
    if (monthStart) await refreshMonth(monthStart)
  }

  const updateManualIndiscipline = async (id, patch, context = {}) => {
    const { user_id, month_start } = context
    const record = findMonthRecord(user_id, month_start)
    const list = record?.manual_indisciplines || []
    const index = list.findIndex((item) => item.id === id)
    const backup = index >= 0 ? { ...list[index] } : null
    if (index >= 0) list[index] = { ...list[index], ...patch }

    try {
      await apiClient.patch(`/discipline/indisciplines/${id}`, patch)
    } catch (err) {
      if (index >= 0 && backup) list[index] = backup
      throw err
    }
  }

  const deleteManualIndiscipline = async (id, context = {}) => {
    await apiClient.delete(`/discipline/indisciplines/${id}`)
    if (context?.month_start) await refreshMonth(context.month_start)
  }

  const createManualAction = async (payload) => {
    const monthStart = payload?.month_start
    await apiClient.post('/discipline/actions', payload)
    if (monthStart) await refreshMonth(monthStart)
  }

  const updateManualAction = async (id, patch, context = {}) => {
    const { user_id, month_start } = context
    const record = findMonthRecord(user_id, month_start)
    const list = record?.manual_actions || []
    const index = list.findIndex((item) => item.id === id)
    const backup = index >= 0 ? { ...list[index] } : null
    if (index >= 0) list[index] = { ...list[index], ...patch }

    try {
      await apiClient.patch(`/discipline/actions/${id}`, patch)
    } catch (err) {
      if (index >= 0 && backup) list[index] = backup
      throw err
    }
  }

  const deleteManualAction = async (id, context = {}) => {
    await apiClient.delete(`/discipline/actions/${id}`)
    if (context?.month_start) await refreshMonth(context.month_start)
  }

  const uploadAttachment = async ({ file, title, user_id, month_start, year }) => {
    const form = new FormData()
    form.append('file', file)
    if (title) form.append('title', title)
    if (user_id) form.append('user_id', user_id)
    if (month_start) form.append('month_start', month_start)
    if (year) form.append('year', year)
    await apiClient.post('/discipline/attachments', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (month_start) await refreshMonth(month_start)
  }

  const createLetter = async ({ title, body_html, user_id, month_start, year }) => {
    await apiClient.post('/discipline/letters', {
      title,
      body_html,
      user_id,
      month_start,
      year,
    })
    if (month_start) await refreshMonth(month_start)
  }

  const deleteAttachment = async (id, context = {}) => {
    await apiClient.delete(`/discipline/attachments/${id}`)
    if (context?.month_start) await refreshMonth(context.month_start)
  }

  const updateFinalScore = async ({ user_id, year, score }) => {
    const index = findUserIndex(user_id)
    const backup = index >= 0 ? { ...users.value[index] } : null
    if (index >= 0) {
      users.value[index] = {
        ...users.value[index],
        final_outcome: score,
        final_score: score,
        yearly_final_outcome: score,
      }
    }

    try {
      await apiClient.patch('/discipline-report/final-outcome', {
        user_id,
        year,
        score,
      })
    } catch (err) {
      if (index >= 0 && backup) users.value[index] = backup
      throw err
    }
  }

  return {
    filters,
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    users: reportUsers,
    months: reportMonths,
    pagination: reportPagination,
    fetchReport,
    refreshMonth,
    ensureMonthRecord,
    createManualIndiscipline,
    updateManualIndiscipline,
    deleteManualIndiscipline,
    createManualAction,
    updateManualAction,
    deleteManualAction,
    uploadAttachment,
    createLetter,
    deleteAttachment,
    updateFinalScore,
    setFilters,
  }
})
