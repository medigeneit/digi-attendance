<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { useMealEntryStore } from '@/stores/mealEntry'
import { useCompanyStore } from '@/stores/company'
import LoaderView from '@/components/common/LoaderView.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import AsyncUserCombobox from '@/components/common/AsyncUserCombobox.vue'
import apiClient from '@/axios'
import { toNum, formatCurrency } from '@/utils/currency'
import * as XLSX from 'xlsx'

const toast = useToast()
const route = useRoute()
const router = useRouter()
const mealStore = useMealEntryStore()
const companyStore = useCompanyStore()

const { list, loading, error, pagination } = storeToRefs(mealStore)
const { companies } = storeToRefs(companyStore)

const filters = ref({
  salary_month: new Date().toISOString().slice(0, 7),
  company_id: '',
  department_id: '',
  user_id: null,
  page: 1,
  per_page: 15,
})

// Modal state
const showModal = ref(false)
const showDeleteModal = ref(false)
const selectedItem = ref(null)
const modalSubmitting = ref(false)
const modalErrors = ref({})

const blankForm = () => ({
  user_id: null,
  salary_month: filters.value.salary_month,
  meal_rate: '',
  total_meal: '',
  additional_amount: '',
})

const modalForm = ref(blankForm())
const modalUserDisplay = ref({ name: null, dept: null })
const isEditMode = computed(() => !!selectedItem.value?.id)

// Bulk form state
const showBulkPanel = ref(false)
const bulkLoading = ref(false)
const bulkSubmitting = ref(false)
const bulkErrors = ref({})
const bulkSearch = ref('')
const bulkForm = ref({
  salary_month: new Date().toISOString().slice(0, 7),
  company_id: '',
  meal_rate: '',
  common_additional: '',
  department_id: '',
  line_type: 'all',
})
const bulkRows = ref([])
const bulkDepartments = ref([])
const filterDepartments = ref([])
const exportLoading = ref(false)
const showImportGuideModal = ref(false)
const importFileInputRef = ref(null)
const importPreview = ref({
  fileName: '',
  totalRows: 0,
  acceptedRows: 0,
  skippedRows: 0,
  errorRows: [],
})

const lineTypeOptions = [
  { value: 'all', label: 'All Line Type' },
  { value: 'executive', label: 'Executive' },
  { value: 'support_staff', label: 'Support Staff' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'academy_body', label: 'Academy Body' },
]

const normalizeHeader = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')

const normalizeRecord = (record) =>
  Object.entries(record || {}).reduce((acc, [key, val]) => {
    acc[normalizeHeader(key)] = val
    return acc
  }, {})

// Computed preview
const baseAmountPreview = computed(() => {
  const r = toNum(modalForm.value.meal_rate)
  const m = toNum(modalForm.value.total_meal)
  return r * m
})

const totalAmountPreview = computed(() => {
  return baseAmountPreview.value + toNum(modalForm.value.additional_amount)
})

const filteredBulkRows = computed(() => {
  const keyword = bulkSearch.value.trim().toLowerCase()
  if (!keyword) return bulkRows.value

  return bulkRows.value.filter((row) =>
    [row.name, row.employee_id, row.department_name]
      .map((v) => String(v || '').toLowerCase())
      .some((v) => v.includes(keyword)),
  )
})

const selectedBulkRows = computed(() => bulkRows.value.filter((row) => row.is_selected))

const bulkGrandTotal = computed(() =>
  selectedBulkRows.value.reduce(
    (sum, row) =>
      sum +
      (toNum(bulkForm.value.meal_rate) * toNum(row.total_meal)) +
      (toNum(row.total_additional_meal) * toNum(bulkForm.value.common_additional)),
    0,
  ),
)

const fetchUsersFn = (params) =>
  apiClient
    .get('/users', { params })
    .then((r) => (Array.isArray(r.data) ? r.data : r.data?.data || r.data?.users || []))

const toMonthValue = (value) => {
  const v = String(value || '').trim()
  if (!v) return ''
  if (/^\d{4}-\d{2}$/.test(v)) return v
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.slice(0, 7)
  return ''
}

const parseQueryInt = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number.parseInt(String(value), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

const buildFilterParams = () => {
  const params = {
    salary_month: toMonthValue(filters.value.salary_month),
    company_id: filters.value.company_id || '',
    department_id: filters.value.department_id || '',
    user_id: filters.value.user_id || null,
    page: filters.value.page,
    per_page: filters.value.per_page,
  }

  if (!params.salary_month) delete params.salary_month
  if (!params.company_id) delete params.company_id
  if (!params.department_id) delete params.department_id
  if (!params.user_id) delete params.user_id

  return params
}

const syncFiltersToQuery = async () => {
  const query = {
    ...buildFilterParams(),
  }

  await router.replace({
    query,
  })
}

const hydrateFiltersFromQuery = () => {
  const q = route.query || {}
  const monthFromQuery = toMonthValue(q.salary_month)

  filters.value.salary_month = monthFromQuery || filters.value.salary_month
  filters.value.company_id = q.company_id ? String(q.company_id) : ''
  filters.value.department_id = q.department_id ? String(q.department_id) : ''
  filters.value.user_id = parseQueryInt(q.user_id, null)
  filters.value.page = parseQueryInt(q.page, 1)
  filters.value.per_page = parseQueryInt(q.per_page, 15)
}

async function load() {
  const params = buildFilterParams()
  await syncFiltersToQuery()
  await mealStore.fetchList(params)
}

onMounted(async () => {
  hydrateFiltersFromQuery()
  await Promise.all([companyStore.fetchCompanies(), loadFilterDepartments(), load()])
})

const applyFilters = () => {
  filters.value.page = 1
  load()
}

const resetFilters = () => {
  filters.value = {
    salary_month: new Date().toISOString().slice(0, 7),
    company_id: '',
    department_id: '',
    user_id: null,
    page: 1,
    per_page: 15,
  }
  loadFilterDepartments()
  load()
}

const handleFilterCompanyChange = async () => {
  filters.value.department_id = ''
  await loadFilterDepartments()
  applyFilters()
}

const handlePageChange = (page) => {
  filters.value.page = page
  load()
}

const resetBulkForm = () => {
  bulkErrors.value = {}
  bulkSearch.value = ''
  bulkRows.value = []
  importPreview.value = {
    fileName: '',
    totalRows: 0,
    acceptedRows: 0,
    skippedRows: 0,
    errorRows: [],
  }
  bulkForm.value = {
    salary_month: filters.value.salary_month,
    company_id: filters.value.company_id || '',
    meal_rate: '',
    common_additional: '',
    department_id: '',
    line_type: 'all',
  }
}

const toggleBulkPanel = () => {
  showBulkPanel.value = !showBulkPanel.value
  if (showBulkPanel.value) {
    resetBulkForm()
    loadBulkDepartments()
  }
}

const rowTotal = (row) =>
  (toNum(bulkForm.value.meal_rate) * toNum(row.total_meal)) +
  (toNum(row.total_additional_meal) * toNum(bulkForm.value.common_additional))

const toArray = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  return []
}

const fetchAllPages = async (url, params = {}) => {
  const rows = []
  let page = 1
  let lastPage = 1

  do {
    const response = await apiClient.get(url, {
      params: {
        ...params,
        page,
        per_page: 200,
      },
    })

    const data = response.data
    rows.push(...toArray(data))
    lastPage = data?.last_page || 1
    page += 1
  } while (page <= lastPage)

  return rows
}

const getUserLookup = async () => {
  const users = await fetchAllPages('/users', {
    ...(bulkForm.value.company_id ? { company_id: bulkForm.value.company_id } : {}),
    is_active: 1,
  })

  return {
    userById: new Map(users.map((user) => [String(user.id), user])),
    userByEmployeeId: new Map(
      users.map((user) => [String(user.employee_id || '').trim().toLowerCase(), user]),
    ),
  }
}

const loadFilterDepartments = async () => {
  try {
    const response = await apiClient.get('/departments', {
      params: {
        ...(filters.value.company_id ? { company_id: filters.value.company_id } : {}),
        per_page: 500,
      },
    })
    filterDepartments.value = toArray(response.data)
  } catch (_) {
    filterDepartments.value = []
  }
}

const loadBulkDepartments = async () => {
  try {
    const response = await apiClient.get('/departments', {
      params: {
        ...(bulkForm.value.company_id ? { company_id: bulkForm.value.company_id } : {}),
        per_page: 500,
      },
    })
    const rows = toArray(response.data)
    bulkDepartments.value = rows.map((row) => ({ id: row.id, name: row.name }))
  } catch (_) {
    bulkDepartments.value = []
  }
}

const loadBulkEmployees = async () => {
  bulkErrors.value = {}

  if (!bulkForm.value.salary_month) {
    bulkErrors.value.salary_month = 'Month is required for bulk entry.'
    return
  }

  bulkLoading.value = true
  try {
    const [users, entries] = await Promise.all([
      fetchAllPages('/users', {
        ...(bulkForm.value.company_id ? { company_id: bulkForm.value.company_id } : {}),
        ...(bulkForm.value.department_id ? { department_id: bulkForm.value.department_id } : {}),
        ...(bulkForm.value.line_type && bulkForm.value.line_type !== 'all'
          ? { line_type: bulkForm.value.line_type }
          : {}),
        is_active: 1,
      }),
      fetchAllPages('/meal-entries', {
        ...(bulkForm.value.company_id ? { company_id: bulkForm.value.company_id } : {}),
        salary_month: bulkForm.value.salary_month,
      }),
    ])

    const entryMap = new Map(entries.map((entry) => [entry.user_id, entry]))

    if (entries.length && (bulkForm.value.meal_rate === '' || bulkForm.value.meal_rate === null)) {
      bulkForm.value.meal_rate = entries[0]?.meal_rate ?? ''
    }

    bulkRows.value = users.map((user) => {
      const current = entryMap.get(user.id)

      return {
        user_id: user.id,
        employee_id: user.employee_id || '',
        name: user.name || 'Unknown',
        department_name: user.department?.name || user.department_name || '',
        total_meal: current?.total_meal ?? '',
        total_additional_meal:
          current?.additional_amount && toNum(bulkForm.value.common_additional) > 0
            ? toNum(current.additional_amount) / toNum(bulkForm.value.common_additional)
            : 0,
        is_selected: true,
      }
    })
  } catch (e) {
    toast.error(e.message || 'Failed to load employees for bulk entry.')
  } finally {
    bulkLoading.value = false
  }
}

const validateBulk = () => {
  const errors = {}

  if (!bulkForm.value.salary_month) errors.salary_month = 'Month is required.'
  if (bulkForm.value.meal_rate === '' || toNum(bulkForm.value.meal_rate) < 0) {
    errors.meal_rate = 'Meal rate is required.'
  }
  if (!selectedBulkRows.value.length) {
    errors.rows = 'Select at least one employee.'
  }

  const invalidRows = selectedBulkRows.value.filter(
    (row) =>
      row.total_meal === '' ||
      Number.isNaN(Number(row.total_meal)) ||
      toNum(row.total_meal) < 0 ||
      (row.total_additional_meal !== '' && Number.isNaN(Number(row.total_additional_meal))) ||
      toNum(row.total_additional_meal) < 0,
  )

  if (invalidRows.length) {
    errors.rows = 'All selected employees must have valid total meal and total additional meal values.'
  }

  bulkErrors.value = errors
  
  return !Object.keys(errors).length
}

const handleBulkSubmit = async () => {

  if (!validateBulk()) return

  bulkSubmitting.value = true
  try {
    const { userById, userByEmployeeId } = await getUserLookup()

    const unresolved = []
    selectedBulkRows.value.forEach((row) => {
      let resolvedUser = null
      if (row.user_id !== undefined && row.user_id !== null && String(row.user_id).trim() !== '') {
        resolvedUser = userById.get(String(row.user_id).trim()) || null
      }

      if (!resolvedUser && row.employee_id) {
        const employeeKey = String(row.employee_id).trim().toLowerCase()
        resolvedUser = userByEmployeeId.get(employeeKey) || null
      }

      if (!resolvedUser) {
        unresolved.push({
          rowNo: '-',
          identifier: row.employee_id || `user_id:${row.user_id || 'N/A'}`,
          reason: 'User not found in active user list.',
        })
        return
      }

      row.user_id = resolvedUser.id
      if (!row.employee_id) row.employee_id = resolvedUser.employee_id || ''
      if (!row.name) row.name = resolvedUser.name || 'Unknown'
      if (!row.department_name) {
        row.department_name = resolvedUser.department?.name || resolvedUser.department_name || ''
      }
    })

    if (unresolved.length) {
      bulkErrors.value.rows = `User not found for ${unresolved.length} row(s). Check employee_id/user_id in import file.`
      importPreview.value = {
        ...importPreview.value,
        errorRows: [...importPreview.value.errorRows, ...unresolved],
      }
      return
    }

    const payload = {
      salary_month: bulkForm.value.salary_month,
      meal_rate: toNum(bulkForm.value.meal_rate),
      entries: selectedBulkRows.value.map((row) => ({
        user_id: row.user_id,
        salary_month: bulkForm.value.salary_month,
        meal_rate: toNum(bulkForm.value.meal_rate),
        total_meal: toNum(row.total_meal),
        additional_amount: toNum(row.total_additional_meal) * toNum(bulkForm.value.common_additional),
      })),
    }

    await mealStore.createBulk(payload)
    toast.success('Bulk meal entries saved successfully.')
    await load()
  } catch (e) {
    if (e.errors) bulkErrors.value = e.errors
    toast.error(e.message || 'Failed to save bulk meal entries.')
  } finally {
    bulkSubmitting.value = false
  }
}

const downloadBulkTemplate = () => {
  const header = ['employee_id,user_id,salary_month,meal_rate,total_meal,total_additional_meal,additional_rate,additional_amount,total_amount']
  const sample = [`EMP001,,${bulkForm.value.salary_month || ''},${bulkForm.value.meal_rate || ''},22,2,${bulkForm.value.common_additional || ''},120,1440`]
  const csv = `${header.join('\n')}\n${sample.join('\n')}\n`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'meal-bulk-template.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

const applyImportedRows = async (records, fileName = '') => {
  const makeKey = (userId, employeeId) => {
    const u = String(userId || '').trim()
    if (u) return `u:${u}`
    const e = String(employeeId || '').trim().toLowerCase()
    if (e) return `e:${e}`
    return ''
  }

  const existingMap = new Map(
    bulkRows.value
      .map((row) => [makeKey(row.user_id, row.employee_id), row])
      .filter(([key]) => Boolean(key)),
  )
  const importedMap = new Map()
  const errorRows = []

  let skipped = 0
  let importedRate = null
  let importedMonth = ''

  const monthFromFileName = (() => {
    const match = String(fileName || '').match(/(\d{4}-\d{2})/)
    return match ? match[1] : ''
  })()

  records.forEach((raw, index) => {
    const rowNo = index + 2
    const record = normalizeRecord(raw)
    const employeeId = String(record.employee_id || '').trim()
    const userId = record.user_id !== undefined && record.user_id !== null
      ? String(record.user_id).trim()
      : ''
    const key = makeKey(userId, employeeId)
    const reasons = []

    if (!key) {
      reasons.push('Missing user_id/employee_id.')
    }

    if (record.total_meal === undefined || record.total_meal === null || String(record.total_meal) === '') {
      reasons.push('total_meal is required.')
    } else if (Number.isNaN(Number(record.total_meal)) || toNum(record.total_meal) < 0) {
      reasons.push('total_meal must be a non-negative number.')
    }

    if (
      record.total_additional_meal !== undefined &&
      record.total_additional_meal !== null &&
      String(record.total_additional_meal) !== '' &&
      (Number.isNaN(Number(record.total_additional_meal)) || toNum(record.total_additional_meal) < 0)
    ) {
      reasons.push('total_additional_meal must be a non-negative number.')
    }

    if (
      record.additional_amount !== undefined &&
      record.additional_amount !== null &&
      String(record.additional_amount) !== '' &&
      (Number.isNaN(Number(record.additional_amount)) || toNum(record.additional_amount) < 0)
    ) {
      reasons.push('additional_amount must be a non-negative number.')
    }

    if (
      record.additional_meal !== undefined &&
      record.additional_meal !== null &&
      String(record.additional_meal) !== '' &&
      (Number.isNaN(Number(record.additional_meal)) || toNum(record.additional_meal) < 0)
    ) {
      reasons.push('additional_meal must be a non-negative number.')
    }

    if (
      record.total_amount !== undefined &&
      record.total_amount !== null &&
      String(record.total_amount) !== '' &&
      (Number.isNaN(Number(record.total_amount)) || toNum(record.total_amount) < 0)
    ) {
      reasons.push('total_amount must be a non-negative number.')
    }

    if (record.salary_month !== undefined && String(record.salary_month) !== '' && !toMonthValue(record.salary_month)) {
      reasons.push('salary_month must be YYYY-MM or YYYY-MM-DD.')
    }

    if (reasons.length) {
      errorRows.push({
        rowNo,
        identifier: employeeId || (userId ? `user_id:${userId}` : 'N/A'),
        reason: reasons.join(' '),
      })
      skipped += 1
      return
    }

    const mappedMealRate =
      record.meal_rate !== undefined && record.meal_rate !== null && String(record.meal_rate) !== ''
        ? toNum(record.meal_rate)
        : toNum(bulkForm.value.meal_rate)
    const mappedTotalMeal =
      record.total_meal !== undefined && record.total_meal !== null && String(record.total_meal) !== ''
        ? toNum(record.total_meal)
        : ''

    const importedAdditionalRate =
      record.additional_rate !== undefined && record.additional_rate !== null && String(record.additional_rate) !== ''
        ? toNum(record.additional_rate)
        : null
    if (importedAdditionalRate !== null && !Number.isNaN(importedAdditionalRate)) {
      bulkForm.value.common_additional = importedAdditionalRate
    }

    const activeAdditionalRate = toNum(bulkForm.value.common_additional)
    const mappedTotalAdditionalMeal =
      record.total_additional_meal !== undefined &&
      record.total_additional_meal !== null &&
      String(record.total_additional_meal) !== ''
        ? toNum(record.total_additional_meal)
        : record.additional_meal !== undefined && record.additional_meal !== null && String(record.additional_meal) !== ''
          ? toNum(record.additional_meal)
        : record.additional_amount !== undefined &&
            record.additional_amount !== null &&
            String(record.additional_amount) !== '' &&
            activeAdditionalRate > 0
          ? toNum(record.additional_amount) / activeAdditionalRate
        : record.total_amount !== undefined &&
            record.total_amount !== null &&
            String(record.total_amount) !== '' &&
            mappedTotalMeal !== '' &&
            !Number.isNaN(mappedMealRate) &&
            activeAdditionalRate > 0
          ? (toNum(record.total_amount) - (mappedMealRate * mappedTotalMeal)) / activeAdditionalRate
        : 0

    const mappedRow = {
      user_id: userId ? parseQueryInt(userId, null) : null,
      employee_id: employeeId,
      name: String(record.name || record.employee_name || employeeId || 'Unknown'),
      department_name: String(record.department_name || record.department || ''),
      total_meal: mappedTotalMeal,
      total_additional_meal: mappedTotalAdditionalMeal,
      is_selected: true,
    }

    importedMap.set(key, mappedRow)

    if (importedRate === null && record.meal_rate !== undefined && String(record.meal_rate) !== '') {
      importedRate = toNum(record.meal_rate)
    }

    if (!importedMonth && record.salary_month !== undefined && String(record.salary_month) !== '') {
      importedMonth = toMonthValue(record.salary_month)
    }

    if (
      (bulkForm.value.common_additional === '' || bulkForm.value.common_additional === null) &&
      record.common_additional !== undefined &&
      String(record.common_additional) !== ''
    ) {
      bulkForm.value.common_additional = toNum(record.common_additional)
    }

    if (
      (bulkForm.value.common_additional === '' || bulkForm.value.common_additional === null) &&
      record.common_additional_rate !== undefined &&
      String(record.common_additional_rate) !== ''
    ) {
      bulkForm.value.common_additional = toNum(record.common_additional_rate)
    }

  })

  try {
    const { userById, userByEmployeeId } = await getUserLookup()
    const unresolvedImported = []
    importedMap.forEach((mappedRow, key) => {
      let resolvedUser = null

      if (mappedRow.user_id !== undefined && mappedRow.user_id !== null && String(mappedRow.user_id) !== '') {
        resolvedUser = userById.get(String(mappedRow.user_id)) || null
      }

      if (!resolvedUser && mappedRow.employee_id) {
        resolvedUser = userByEmployeeId.get(String(mappedRow.employee_id).trim().toLowerCase()) || null
      }

      if (!resolvedUser) {
        unresolvedImported.push({ key, mappedRow })
        return
      }

      mappedRow.user_id = resolvedUser.id
      if (!mappedRow.employee_id) mappedRow.employee_id = resolvedUser.employee_id || ''
      if (!mappedRow.name || mappedRow.name === 'Unknown') mappedRow.name = resolvedUser.name || 'Unknown'
      if (!mappedRow.department_name) {
        mappedRow.department_name = resolvedUser.department?.name || resolvedUser.department_name || ''
      }
    })

    unresolvedImported.forEach(({ key, mappedRow }) => {
      importedMap.delete(key)
      errorRows.push({
        rowNo: '-',
        identifier: mappedRow.employee_id || `user_id:${mappedRow.user_id || 'N/A'}`,
        reason: 'User not found in active user list.',
      })
      skipped += 1
    })
  } catch (_) {
    toast.warning('Could not pre-validate user list during import. Validation will run on save.')
  }

  const mergedRows = [...bulkRows.value]
  importedMap.forEach((mappedRow, key) => {
    if (existingMap.has(key)) {
      Object.assign(existingMap.get(key), mappedRow)
      return
    }
    mergedRows.push(mappedRow)
  })
  bulkRows.value = mergedRows

  if (importedRate !== null && !Number.isNaN(importedRate)) {
    bulkForm.value.meal_rate = importedRate
  }

  const resolvedImportedMonth = importedMonth || monthFromFileName
  if (resolvedImportedMonth) {
    bulkForm.value.salary_month = resolvedImportedMonth
  }

  const acceptedRows = importedMap.size

  if (!acceptedRows) {
    toast.warning('No valid row found in the imported file.')
    importPreview.value = {
      fileName,
      totalRows: records.length,
      acceptedRows: 0,
      skippedRows: skipped,
      errorRows,
    }
    return
  }

  importPreview.value = {
    fileName,
    totalRows: records.length,
    acceptedRows,
    skippedRows: skipped,
    errorRows,
  }

  toast.success(`Imported ${acceptedRows} row(s). ${skipped ? `${skipped} row(s) skipped.` : ''}`)
}

const onImportFileChange = async (event) => {
  const input = event.target
  const file = input?.files?.[0]
  if (!file) return

  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      toast.warning('Imported file does not contain any sheet.')
      return
    }

    const worksheet = workbook.Sheets[firstSheetName]
    const jsonRows = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false,
      blankrows: false,
    })

    if (!jsonRows.length) {
      toast.warning('Imported file is empty.')
      return
    }

    await applyImportedRows(jsonRows, file.name)
  } catch (e) {
    toast.error('Failed to parse file. Please use valid CSV/XLSX format.')
  } finally {
    input.value = ''
  }
}

const openImportGuide = () => {
  showImportGuideModal.value = true
}

const closeImportGuide = () => {
  showImportGuideModal.value = false
}

const continueImportFromGuide = () => {
  showImportGuideModal.value = false
  importFileInputRef.value?.click()
}

const downloadFilteredExcel = async () => {
  exportLoading.value = true
  try {
    const params = buildFilterParams()
    delete params.page
    delete params.per_page

    const rows = await fetchAllPages('/meal-entries', params)
    if (!rows.length) {
      toast.warning('No data found for current filters.')
      return
    }

    const sheetRows = rows.map((item, index) => ({
      SL: index + 1,
      Month: item.salary_month,
      Employee_ID: item.user?.employee_id || '',
      Employee_Name: item.user?.name || '',
      Department: item.user?.department?.name || '',
      Meal_Rate: toNum(item.meal_rate),
      Total_Meals: toNum(item.total_meal),
      Additional_Amount: toNum(item.additional_amount),
      Total_Amount: toNum(item.total_amount),
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(sheetRows)
    XLSX.utils.book_append_sheet(wb, ws, 'Meal Entries')
    XLSX.writeFile(wb, `meal-entries-${filters.value.salary_month || 'export'}.xlsx`)
  } catch (e) {
    toast.error(e.message || 'Failed to download Excel file.')
  } finally {
    exportLoading.value = false
  }
}

// Warn when meal_rate changes (affects all in that month)
const showRateWarn = ref(false)
watch(
  () => modalForm.value.meal_rate,
  (newVal, oldVal) => {
    if (isEditMode.value && oldVal !== '' && newVal !== oldVal) {
      showRateWarn.value = true
    }
  },
)

const openCreate = () => {
  selectedItem.value = null
  modalForm.value = blankForm()
  modalUserDisplay.value = { name: null, dept: null }
  modalErrors.value = {}
  showRateWarn.value = false
  showModal.value = true
}

const openEdit = (item) => {
  selectedItem.value = item
  modalForm.value = {
    user_id: item.user_id,
    salary_month: item.salary_month,
    meal_rate: item.meal_rate ?? '',
    total_meal: item.total_meal ?? '',
    additional_amount: item.additional_amount ?? '',
  }
  modalUserDisplay.value = item.user
    ? { name: item.user.name, dept: item.user.department?.name || null }
    : { name: null, dept: null }
  modalErrors.value = {}
  showRateWarn.value = false
  showModal.value = true
}

const openDelete = (item) => {
  selectedItem.value = item
  showDeleteModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedItem.value = null
}

const validateModal = () => {
  const errors = {}
  if (!modalForm.value.user_id) errors.user_id = 'Employee is required.'
  if (!modalForm.value.salary_month) errors.salary_month = 'Salary month is required.'
  if (modalForm.value.meal_rate === '' || isNaN(parseFloat(modalForm.value.meal_rate)))
    errors.meal_rate = 'Meal rate is required.'
  if (modalForm.value.total_meal === '' || isNaN(parseFloat(modalForm.value.total_meal)))
    errors.total_meal = 'Total meal count is required.'
  modalErrors.value = errors
  return !Object.keys(errors).length
}

const handleModalSubmit = async () => {
  if (!validateModal()) return
  modalSubmitting.value = true
  try {
    const payload = { ...modalForm.value }
    payload.meal_rate = toNum(payload.meal_rate)
    payload.total_meal = toNum(payload.total_meal)
    payload.additional_amount =
      payload.additional_amount === '' || payload.additional_amount === null
        ? null
        : toNum(payload.additional_amount)
    if (isEditMode.value) {
      await mealStore.updateItem(selectedItem.value.id, payload)
      toast.success('Meal entry updated.')
    } else {
      await mealStore.createItem(payload)
      toast.success('Meal entry created.')
    }
    closeModal()
    load()
  } catch (e) {
    if (e.errors) modalErrors.value = e.errors
    toast.error(e.message)
  } finally {
    modalSubmitting.value = false
  }
}

const handleDelete = async () => {
  try {
    await mealStore.deleteItem(selectedItem.value.id)
    toast.success('Meal entry deleted.')
    showDeleteModal.value = false
    selectedItem.value = null
    load()
  } catch (e) {
    toast.error(e.message)
  }
}

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

watch(
  () => filters.value.salary_month,
  (month) => {
    if (!showBulkPanel.value) return
    bulkForm.value.salary_month = month
  },
)

watch(
  () => bulkForm.value.company_id,
  async () => {
    bulkForm.value.department_id = ''
    await loadBulkDepartments()
  },
)
</script>

<template>
  <div class="p-4 md:p-6 space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between gap-2">
      <h1 class="title-md md:title-lg">Meal Entries</h1>
      <div class="flex items-center gap-2">
        <button class="btn-3" @click="toggleBulkPanel">
          <i class="far" :class="showBulkPanel ? 'fa-times' : 'fa-layer-group'"></i>
          <span class="hidden md:flex">{{ showBulkPanel ? 'Close Bulk' : 'Bulk Entry' }}</span>
        </button>
        <button class="btn-2" @click="openCreate">
          <i class="far fa-plus"></i>
          <span class="hidden md:flex">Add Meal Entry</span>
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div class="flex flex-wrap gap-3 items-end">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Month</label>
          <input
            v-model="filters.salary_month"
            type="month"
            @change="applyFilters"
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Company</label>
          <select
            v-model="filters.company_id"
            @change="handleFilterCompanyChange"
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Companies</option>
            <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Department</label>
          <select
            v-model="filters.department_id"
            @change="applyFilters"
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Departments</option>
            <option v-for="d in filterDepartments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>
        <div class="min-w-[260px]">
          <label class="block text-xs font-medium text-gray-600 mb-1">Employee</label>
          <AsyncUserCombobox
            v-model="filters.user_id"
            :fetcher="fetchUsersFn"
            placeholder="Filter by employee..."
            @update:modelValue="applyFilters"
          />
        </div>
        <button class="btn-3" @click="resetFilters">
          <i class="far fa-undo"></i> Reset
        </button>
        <button class="btn-3" @click="downloadFilteredExcel" :disabled="exportLoading">
          <i class="far" :class="exportLoading ? 'fa-spinner fa-spin' : 'fa-file-excel'"></i>
          {{ exportLoading ? 'Downloading...' : 'Excel Download' }}
        </button>
      </div>
    </div>

    <!-- Info Note -->
    <div
      class="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-3 flex items-start gap-2 text-xs"
    >
      <i class="fas fa-info-circle mt-0.5 text-blue-400"></i>
      <span>
        <strong>Meal Rate is common per month.</strong> Updating the meal rate for any entry within
        a month will apply to all entries for that month.
      </span>
    </div>

    <section
      v-if="showBulkPanel"
      class="bg-white rounded-xl shadow-sm border border-gray-100 p-3 space-y-3"
    >
      <div class="flex items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-semibold text-blue-900">Bulk Meal Entry</h2>
          <p class="text-xs text-gray-500">
            Month wise same meal rate apply হবে, user wise total meal এবং additional amount দিতে পারবেন।
          </p>
        </div>
        <div class="text-right text-xs text-gray-500">
          <p>Selected: {{ selectedBulkRows.length }}</p>
          <p class="font-mono font-semibold text-blue-700">Total: {{ formatCurrency(bulkGrandTotal) }}</p>
        </div>
      </div>

      <div class="grid gap-2 md:grid-cols-[170px_1fr_170px_170px] items-end">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Month</label>
          <input v-model="bulkForm.salary_month" type="month" :class="inputClass" />
          <p v-if="bulkErrors.salary_month" class="text-red-500 text-xs mt-1">{{ bulkErrors.salary_month }}</p>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Company (Optional)</label>
          <select v-model="bulkForm.company_id" :class="inputClass">
            <option value="">All Companies</option>
            <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Department (Optional)</label>
          <select v-model="bulkForm.department_id" :class="inputClass">
            <option value="">All Departments</option>
            <option v-for="d in bulkDepartments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Line Type (Optional)</label>
          <select v-model="bulkForm.line_type" :class="inputClass">
            <option v-for="option in lineTypeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="grid gap-2 md:grid-cols-[1fr_1fr_auto] items-end">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Common Meal Rate</label>
          <input v-model="bulkForm.meal_rate" type="number" min="0" step="0.01" :class="inputClass" placeholder="0.00" />
          <p v-if="bulkErrors.meal_rate" class="text-red-500 text-xs mt-1">{{ bulkErrors.meal_rate }}</p>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Additional Rate</label>
          <input v-model="bulkForm.common_additional" type="number" min="0" step="0.01" :class="inputClass" placeholder="0.00" />
        </div>
        <button class="btn-3" @click="loadBulkEmployees" :disabled="bulkLoading">
          <i class="far" :class="bulkLoading ? 'fa-spinner fa-spin' : 'fa-users'"></i>
          {{ bulkLoading ? 'Loading...' : 'Load Employees' }}
        </button>
      </div>

      <div class="flex w-full flex-wrap items-center gap-2">
        <button class="btn-3" type="button" @click="downloadBulkTemplate">
          <i class="far fa-file-download"></i>
          Template
        </button>
        <button class="btn-3" type="button" @click="openImportGuide">
          <i class="far fa-file-import"></i>
          Import CSV/XLSX
        </button>
        <input
          ref="importFileInputRef"
          id="meal-bulk-import-file"
          type="file"
          class="hidden"
          accept=".csv,.xlsx,.xls"
          @change="onImportFileChange"
        />
      </div>

      <p class="text-xs text-gray-500">
        Import columns: <span class="font-medium">employee_id or user_id, total_meal</span>. Additional part দিতে পারেন <span class="font-medium">total_additional_meal</span>, <span class="font-medium">additional_amount</span> বা <span class="font-medium">total_amount</span> দিয়ে। Optional: <span class="font-medium">salary_month, meal_rate, additional_rate</span>.
      </p>

      <div v-if="importPreview.totalRows" class="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
          <p class="text-amber-800 font-medium">
            Import Preview
            <span v-if="importPreview.fileName" class="text-amber-700">({{ importPreview.fileName }})</span>
          </p>
          <div class="flex items-center gap-3 text-amber-700">
            <span>Total: {{ importPreview.totalRows }}</span>
            <span>Accepted: {{ importPreview.acceptedRows }}</span>
            <span>Skipped: {{ importPreview.skippedRows }}</span>
          </div>
        </div>

        <div v-if="importPreview.errorRows.length" class="overflow-x-auto rounded-md border border-amber-200 bg-white">
          <table class="w-full text-xs">
            <thead class="bg-amber-100 text-amber-900 uppercase">
              <tr>
                <th class="px-3 py-2 text-left">Row</th>
                <th class="px-3 py-2 text-left">Identifier</th>
                <th class="px-3 py-2 text-left">Reason</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-amber-100">
              <tr v-for="(errRow, idx) in importPreview.errorRows" :key="`${errRow.rowNo}-${errRow.identifier}-${idx}`">
                <td class="px-3 py-2">{{ errRow.rowNo }}</td>
                <td class="px-3 py-2 font-medium">{{ errRow.identifier }}</td>
                <td class="px-3 py-2 text-amber-900">{{ errRow.reason }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="bulkRows.length" class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              class="h-4 w-4 accent-blue-600"
              :checked="selectedBulkRows.length === bulkRows.length"
              @change="bulkRows.forEach((row) => (row.is_selected = $event.target.checked))"
            />
            <span class="text-xs text-gray-600">Select all</span>
          </div>
          <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div class="w-full sm:w-64">
              <input v-model="bulkSearch" type="text" :class="inputClass" placeholder="Search employee..." />
            </div>
          </div>
        </div>

        <div class="overflow-x-auto rounded-lg border border-gray-200">
          <table class="w-full text-sm">
            <thead class="bg-blue-50 text-blue-900 text-xs uppercase">
              <tr>
                <th class="px-3 py-2 text-center">Select</th>
                <th class="px-3 py-2 text-left">Employee</th>
                <th class="px-3 py-2 text-right">Total Meals</th>
                <th class="px-3 py-2 text-right">Total Additional Meal</th>
                <th class="px-3 py-2 text-right">Additional Amount</th>
                <th class="px-3 py-2 text-right">Sub Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="row in filteredBulkRows" :key="row.user_id || row.employee_id" class="bg-white">
                <td class="px-3 py-2 text-center">
                  <input type="checkbox" v-model="row.is_selected" class="h-4 w-4 accent-blue-600" />
                </td>
                <td class="px-3 py-2">
                  <p class="font-medium text-blue-900">{{ row.name }}</p>
                  <p class="text-xs text-gray-400">{{ row.employee_id }} • {{ row.department_name || 'No department' }}</p>
                </td>
                <td class="px-3 py-2">
                  <input v-model="row.total_meal" type="number" min="0" step="1" :class="inputClass + ' text-right'" placeholder="0" />
                </td>
                <td class="px-3 py-2">
                  <input v-model="row.total_additional_meal" type="number" min="0" step="0.01" :class="inputClass + ' text-right'" placeholder="0" />
                </td>
                <td class="px-3 py-2 text-right font-mono text-gray-700">
                  {{ formatCurrency(toNum(row.total_additional_meal) * toNum(bulkForm.common_additional)) }}
                </td>
                <td class="px-3 py-2 text-right font-mono font-semibold text-blue-700">
                  {{ formatCurrency(rowTotal(row)) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="bulkErrors.rows" class="text-red-500 text-xs">{{ bulkErrors.rows }}</p>

        <div class="flex justify-end gap-3">
          <button class="btn-3" type="button" @click="resetBulkForm">Clear</button>
          <button class="btn-2" type="button" :disabled="bulkSubmitting" @click="handleBulkSubmit">
            <i class="far" :class="bulkSubmitting ? 'fa-spinner fa-spin' : 'fa-save'"></i>
            {{ bulkSubmitting ? 'Saving...' : 'Save Bulk Entries' }}
          </button>
        </div>
      </div>
    </section>

    <LoaderView v-if="loading" />

    <div
      v-else-if="error"
      class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-center gap-2 text-sm"
    >
      <i class="fas fa-exclamation-circle"></i> {{ error }}
    </div>

    <div
      v-else-if="!list.length"
      class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center"
    >
      <i class="fas fa-utensils text-4xl text-gray-300 mb-3"></i>
      <p class="text-lg font-medium text-gray-500">No meal entries found</p>
      <p class="text-sm text-gray-400 mt-1">for {{ filters.salary_month }}</p>
      <button class="btn-2 mt-4" @click="openCreate">
        <i class="far fa-plus"></i> Add Meal Entry
      </button>
    </div>

    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-blue-50 text-blue-900 text-xs uppercase">
          <tr>
            <th class="px-4 py-3 text-left">#</th>
            <th class="px-4 py-3 text-left">Employee</th>
            <th class="px-4 py-3 text-center">Month</th>
            <th class="px-4 py-3 text-right">Meal Rate</th>
            <th class="px-4 py-3 text-right">Total Meals</th>
            <th class="px-4 py-3 text-right">Additional</th>
            <th class="px-4 py-3 text-right">Total Amount</th>
            <th class="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="(item, i) in list" :key="item.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-3 text-gray-400 text-xs">
              {{ (filters.page - 1) * filters.per_page + i + 1 }}
            </td>
            <td class="px-4 py-3">
              <div class="font-medium text-blue-900">{{ item.user?.name || '—' }}</div>
              <div class="text-xs text-gray-400">{{ item.user?.employee_id }}</div>
            </td>
            <td class="px-4 py-3 text-center font-medium">{{ item.salary_month }}</td>
            <td class="px-4 py-3 text-right font-mono">{{ formatCurrency(item.meal_rate) }}</td>
            <td class="px-4 py-3 text-right font-mono">{{ item.total_meal }}</td>
            <td class="px-4 py-3 text-right font-mono">{{ formatCurrency(item.additional_amount) }}</td>
            <td class="px-4 py-3 text-right font-mono font-semibold text-blue-700">
              {{ formatCurrency(item.total_amount) }}
            </td>
            <td class="px-4 py-3 text-center">
              <div class="flex items-center justify-center gap-1">
                <button
                  @click="openEdit(item)"
                  class="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <i class="far fa-edit text-xs"></i>
                </button>
                <button
                  @click="openDelete(item)"
                  class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <i class="far fa-trash-alt text-xs"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <PaginationBar
      v-if="pagination.total > 0"
      :page="pagination.current_page || filters.page"
      :per-page="pagination.per_page || filters.per_page"
      :total="pagination.total || list.length"
      :last-page="pagination.last_page || 1"
      @page-change="handlePageChange"
    />

    <!-- Create/Edit Modal -->
    <teleport to="body">
      <div
        v-if="showImportGuideModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
          <div class="flex items-center justify-between px-6 py-4 border-b">
            <h3 class="font-bold text-blue-900 text-lg">Bulk Import Format Guide</h3>
            <button @click="closeImportGuide" class="text-gray-400 hover:text-gray-600" aria-label="Close">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="p-6 space-y-4 text-sm">
            <p class="text-gray-600">
              Import করার আগে নিশ্চিত করুন file-এর first row header নিচের format অনুযায়ী আছে।
            </p>

            <div class="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-2">
              <p class="text-xs font-semibold text-blue-800 uppercase tracking-wide">Required Columns</p>
              <p class="text-blue-900 font-medium">employee_id or user_id, total_meal</p>
              <p class="text-xs text-blue-700">Additional part দিতে <strong>total_additional_meal</strong>, <strong>additional_amount</strong> বা <strong>total_amount</strong> এর যেকোনো একটি দিলেই হবে।</p>
            </div>

            <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
              <p class="text-xs font-semibold text-gray-700 uppercase tracking-wide">Optional Columns</p>
              <p class="text-gray-800">salary_month, meal_rate, additional_rate</p>
              <p class="text-xs text-gray-500">
                <strong>total_amount</strong> দিলে system additional amount হিসাব করে, এরপর additional rate দিয়ে total additional meal derive করে।
              </p>
            </div>

            <div class="rounded-lg border border-gray-200 overflow-x-auto">
              <table class="w-full text-xs">
                <thead class="bg-gray-100 text-gray-700">
                  <tr>
                    <th class="px-3 py-2 text-left">employee_id</th>
                    <th class="px-3 py-2 text-center">salary_month</th>
                    <th class="px-3 py-2 text-right">meal_rate</th>
                    <th class="px-3 py-2 text-right">additional_rate</th>
                    <th class="px-3 py-2 text-right">total_meal</th>
                    <th class="px-3 py-2 text-right">total_additional_meal</th>
                    <th class="px-3 py-2 text-right">additional_amount</th>
                    <th class="px-3 py-2 text-right">total_amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="bg-white text-gray-800">
                    <td class="px-3 py-2">EMP001</td>
                    <td class="px-3 py-2 text-center">2026-03</td>
                    <td class="px-3 py-2 text-right">60</td>
                    <td class="px-3 py-2 text-right">60</td>
                    <td class="px-3 py-2 text-right">22</td>
                    <td class="px-3 py-2 text-right">2</td>
                    <td class="px-3 py-2 text-right">120</td>
                    <td class="px-3 py-2 text-right">1440</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex flex-wrap justify-end gap-2 pt-1">
              <button type="button" class="btn-3" @click="downloadBulkTemplate">
                <i class="far fa-file-download"></i>
                Download Template
              </button>
              <button type="button" class="btn-3" @click="closeImportGuide">Cancel</button>
              <button type="button" class="btn-2" @click="continueImportFromGuide">
                <i class="far fa-file-import"></i>
                Continue to Import
              </button>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
          <div class="flex items-center justify-between px-6 py-4 border-b">
            <h3 class="font-bold text-blue-900 text-lg">
              {{ isEditMode ? 'Edit Meal Entry' : 'Add Meal Entry' }}
            </h3>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <form @submit.prevent="handleModalSubmit" class="p-6 space-y-4">
            <!-- Meal rate warning -->
            <div
              v-if="showRateWarn"
              class="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 flex items-start gap-2 text-xs"
            >
              <i class="fas fa-exclamation-triangle mt-0.5 text-amber-500"></i>
              <span>
                Changing the meal rate will update the common rate for
                <strong>all meal entries in {{ modalForm.salary_month }}</strong>.
              </span>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Employee <span class="text-red-500">*</span>
              </label>
              <AsyncUserCombobox
                v-model="modalForm.user_id"
                v-model:display="modalUserDisplay"
                :fetcher="fetchUsersFn"
                placeholder="Search employee..."
              />
              <p v-if="modalErrors.user_id" class="text-red-500 text-xs mt-1">
                {{ modalErrors.user_id }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Salary Month <span class="text-red-500">*</span>
              </label>
              <input v-model="modalForm.salary_month" type="month" :class="inputClass" />
              <p v-if="modalErrors.salary_month" class="text-red-500 text-xs mt-1">
                {{ modalErrors.salary_month }}
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Meal Rate <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="modalForm.meal_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  :class="inputClass"
                  placeholder="0.00"
                />
                <p v-if="modalErrors.meal_rate" class="text-red-500 text-xs mt-1">
                  {{ modalErrors.meal_rate }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Total Meals <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="modalForm.total_meal"
                  type="number"
                  min="0"
                  step="1"
                  :class="inputClass"
                  placeholder="0"
                />
                <p v-if="modalErrors.total_meal" class="text-red-500 text-xs mt-1">
                  {{ modalErrors.total_meal }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Additional Amount</label>
                <input
                  v-model="modalForm.additional_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  :class="inputClass"
                  placeholder="0.00"
                />
                <p class="text-xs text-gray-400 mt-1">Optional special meal charge.</p>
              </div>
            </div>

            <!-- Read-only preview -->
            <div class="bg-blue-50 rounded-lg px-4 py-3 border border-blue-100 space-y-1.5">
              <div class="flex items-center justify-between text-xs text-blue-700">
                <span>Base (Rate × Meal)</span>
                <span class="font-mono">{{ formatCurrency(baseAmountPreview) }}</span>
              </div>
              <div class="flex items-center justify-between text-xs text-blue-700">
                <span>Additional Amount</span>
                <span class="font-mono">{{ formatCurrency(toNum(modalForm.additional_amount)) }}</span>
              </div>
              <div class="h-px bg-blue-200"></div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-blue-700 font-medium">Sub Total (Save হবে)</span>
                <span class="font-mono font-bold text-blue-800">
                  {{ formatCurrency(totalAmountPreview) }}
                </span>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button type="button" class="btn-3" @click="closeModal">Cancel</button>
              <button type="submit" class="btn-2" :disabled="modalSubmitting">
                <i
                  class="far"
                  :class="modalSubmitting ? 'fa-spinner fa-spin' : isEditMode ? 'fa-save' : 'fa-plus'"
                ></i>
                {{ modalSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Entry' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </teleport>

    <DeleteModal
      :show="showDeleteModal"
      title="Delete Meal Entry"
      :message="`Delete meal entry for ${selectedItem?.user?.name} (${selectedItem?.salary_month})?`"
      @close="showDeleteModal = false"
      @confirm="handleDelete"
    />
  </div>
</template>
