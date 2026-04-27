<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import * as XLSX from 'xlsx'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import { useMealEntryStore } from '@/stores/mealEntry'
import LoaderView from '@/components/common/LoaderView.vue'
import apiClient from '@/axios'
import { formatCurrency, toNum } from '@/utils/currency'

const router = useRouter()
const toast = useToast()
const mealStore = useMealEntryStore()

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-100'

const employeeFilters = ref({
  company_id: '',
  department_id: '',
  employee_id: '',
  line_type: 'all',
})

const bulkForm = ref({
  salary_month: new Date().toISOString().slice(0, 7),
  meal_rate: '',
  common_additional: '',
})
const bulkRows = ref([])
const search = ref('')
const loadingRows = ref(false)
const saving = ref(false)
const bulkErrors = ref({})
const showImportGuideModal = ref(false)
const importFileInputRef = ref(null)
const importPreview = ref({ fileName: '', totalRows: 0, acceptedRows: 0, skippedRows: 0, errorRows: [] })

const toMonthValue = (value) => {
  const v = String(value || '').trim()
  if (!v) return ''
  if (/^\d{4}-\d{2}$/.test(v)) return v
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.slice(0, 7)
  return ''
}

const normalizeHeader = (value) =>
  String(value || '').trim().toLowerCase().replace(/\s+/g, '_')

const normalizeRecord = (record) =>
  Object.entries(record || {}).reduce((acc, [key, val]) => {
    acc[normalizeHeader(key)] = val
    return acc
  }, {})

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
    const response = await apiClient.get(url, { params: { ...params, page, per_page: 200 } })
    const data = response.data
    rows.push(...toArray(data))
    lastPage = data?.last_page || 1
    page += 1
  } while (page <= lastPage)
  return rows
}

const filteredRows = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  if (!keyword) return bulkRows.value
  return bulkRows.value.filter((row) =>
    [row.employee_id, row.name, row.department_name]
      .map((v) => String(v || '').toLowerCase())
      .some((v) => v.includes(keyword)),
  )
})

const selectedRows = computed(() => bulkRows.value.filter((row) => row.is_selected))

const additionalAmount = (row) => toNum(row.total_additional_meal) * toNum(bulkForm.value.common_additional)
const rowTotal = (row) => toNum(bulkForm.value.meal_rate) * toNum(row.total_meal) + additionalAmount(row)
const grandTotal = computed(() => selectedRows.value.reduce((sum, row) => sum + rowTotal(row), 0))

const validate = () => {
  const errors = {}
  if (!bulkForm.value.salary_month) errors.salary_month = 'Month is required.'
  if (bulkForm.value.meal_rate === '' || toNum(bulkForm.value.meal_rate) < 0) errors.meal_rate = 'Meal rate is required.'
  if (bulkForm.value.common_additional === '' || toNum(bulkForm.value.common_additional) < 0) {
    errors.common_additional = 'Special rate is required.'
  }
  if (!selectedRows.value.length) errors.rows = 'Select at least one employee.'
  bulkErrors.value = errors
  return !Object.keys(errors).length
}

const loadRows = async () => {
  bulkErrors.value = {}
  if (!bulkForm.value.salary_month) {
    bulkErrors.value.salary_month = 'Month is required.'
    return
  }
  loadingRows.value = true
  try {
    const [users, entries] = await Promise.all([
      fetchAllPages('/users', {
        ...(employeeFilters.value.company_id ? { company_id: employeeFilters.value.company_id } : {}),
        ...(employeeFilters.value.department_id ? { department_id: employeeFilters.value.department_id } : {}),
        ...(employeeFilters.value.line_type && employeeFilters.value.line_type !== 'all'
          ? { line_type: employeeFilters.value.line_type }
          : {}),
        ...(employeeFilters.value.employee_id ? { employee_id: employeeFilters.value.employee_id } : {}),
        status: 'active',
      }),
      fetchAllPages('/meal-entries', {
        ...(employeeFilters.value.company_id ? { company_id: employeeFilters.value.company_id } : {}),
        ...(employeeFilters.value.department_id ? { department_id: employeeFilters.value.department_id } : {}),
        ...(employeeFilters.value.employee_id ? { user_id: employeeFilters.value.employee_id } : {}),
        salary_month: bulkForm.value.salary_month,
      }),
    ])

    const entryMap = new Map(entries.map((entry) => [String(entry.user_id), entry]))
    if (!bulkForm.value.meal_rate && entries.length) bulkForm.value.meal_rate = entries[0]?.meal_rate ?? ''
    if (!bulkForm.value.common_additional && entries.length && toNum(entries[0]?.total_meal) > 0) {
      bulkForm.value.common_additional = toNum(entries[0]?.additional_amount) / toNum(entries[0]?.total_meal)
    }

    bulkRows.value = users.map((user) => {
      const current = entryMap.get(String(user.id))
      return {
        user_id: user.id,
        employee_id: user.employee_id || '',
        name: user.name || 'Unknown',
        department_name: user.department?.name || user.department_name || '',
        total_meal: current?.total_meal ?? '',
        total_additional_meal:
          current?.additional_amount && toNum(bulkForm.value.common_additional) > 0
            ? toNum(current.additional_amount) / toNum(bulkForm.value.common_additional)
            : '',
        is_selected: true,
      }
    })
  } catch (error) {
    toast.error(error.message || 'Failed to load employees.')
  } finally {
    loadingRows.value = false
  }
}

const saveBulkEntries = async () => {
  if (!validate()) return
  saving.value = true
  try {
    await mealStore.createBulk({
      salary_month: bulkForm.value.salary_month,
      meal_rate: toNum(bulkForm.value.meal_rate),
      entries: selectedRows.value.map((row) => ({
        user_id: row.user_id,
        salary_month: bulkForm.value.salary_month,
        meal_rate: toNum(bulkForm.value.meal_rate),
        total_meal: toNum(row.total_meal),
        additional_amount: additionalAmount(row),
      })),
    })
    toast.success('Bulk meal entries saved successfully.')
    router.push({ name: 'PayrollMealEntryList' })
  } catch (error) {
    if (error.errors) bulkErrors.value = error.errors
    toast.error(error.message || 'Failed to save bulk meal entries.')
  } finally {
    saving.value = false
  }
}

const resetForm = async () => {
  bulkForm.value = {
    salary_month: new Date().toISOString().slice(0, 7),
    meal_rate: '',
    common_additional: '',
  }
  employeeFilters.value = {
    company_id: '',
    department_id: '',
    employee_id: '',
    line_type: 'all',
  }
  search.value = ''
  bulkRows.value = []
  bulkErrors.value = {}
  importPreview.value = { fileName: '', totalRows: 0, acceptedRows: 0, skippedRows: 0, errorRows: [] }
}

const openImportGuide = () => (showImportGuideModal.value = true)
const closeImportGuide = () => (showImportGuideModal.value = false)

const downloadBulkTemplate = () => {
  const header = [
    'employee_id,user_id,salary_month,meal_rate,total_meal,total_additional_meal,additional_rate,additional_amount,total_amount',
  ]
  const sample = [`EMP001,,${bulkForm.value.salary_month || ''},${bulkForm.value.meal_rate || ''},22,2,55,110,1320`]
  const csv = `${header.join('\n')}\n${sample.join('\n')}\n`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'meal-bulk-template.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

const continueImportFromGuide = () => {
  showImportGuideModal.value = false
  importFileInputRef.value?.click()
}

const applyImportedRows = async (records, fileName = '') => {
  const makeKey = (userId, employeeId) => {
    const u = String(userId || '').trim()
    if (u) return `u:${u}`
    const e = String(employeeId || '').trim().toLowerCase()
    if (e) return `e:${e}`
    return ''
  }

  const errorRows = []
  const importedMap = new Map()
  let skipped = 0
  let importedRate = null
  let importedAdditionalRate = null
  let importedMonth = ''

  records.forEach((raw, index) => {
    const rowNo = index + 2
    const record = normalizeRecord(raw)
    const employeeId = String(record.employee_id || '').trim()
    const userId = String(record.user_id || '').trim()
    const key = makeKey(userId, employeeId)
    const reasons = []

    if (!key) reasons.push('Missing user_id/employee_id.')
    if (record.total_meal === undefined || record.total_meal === null || String(record.total_meal) === '') {
      reasons.push('total_meal is required.')
    } else if (Number.isNaN(Number(record.total_meal)) || toNum(record.total_meal) < 0) {
      reasons.push('total_meal must be a non-negative number.')
    }
    if (record.salary_month && !toMonthValue(record.salary_month)) {
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

    const mealRate = record.meal_rate !== undefined && record.meal_rate !== null && String(record.meal_rate) !== ''
      ? toNum(record.meal_rate)
      : toNum(bulkForm.value.meal_rate)
    const addRate = record.additional_rate !== undefined && record.additional_rate !== null && String(record.additional_rate) !== ''
      ? toNum(record.additional_rate)
      : record.common_additional !== undefined && String(record.common_additional) !== ''
        ? toNum(record.common_additional)
        : null
    if (mealRate && !bulkForm.value.meal_rate) importedRate = mealRate
    if (addRate !== null && !Number.isNaN(addRate)) importedAdditionalRate = addRate
    if (record.salary_month && !importedMonth) importedMonth = toMonthValue(record.salary_month)

    const totalMeal = toNum(record.total_meal)
    const totalAdditionalMeal =
      record.total_additional_meal !== undefined && String(record.total_additional_meal) !== ''
        ? toNum(record.total_additional_meal)
        : record.additional_amount !== undefined && String(record.additional_amount) !== ''
          ? (addRate ? toNum(record.additional_amount) / addRate : '')
          : ''

    importedMap.set(key, {
      user_id: userId ? Number(userId) : null,
      employee_id: employeeId,
      name: record.name || '',
      department_name: record.department_name || '',
      total_meal: totalMeal,
      total_additional_meal: totalAdditionalMeal,
      is_selected: true,
    })
  })

  bulkRows.value = Array.from(importedMap.values())
  if (importedRate !== null) bulkForm.value.meal_rate = importedRate
  if (importedAdditionalRate !== null) bulkForm.value.common_additional = importedAdditionalRate
  if (importedMonth) bulkForm.value.salary_month = importedMonth

  importPreview.value = {
    fileName,
    totalRows: records.length,
    acceptedRows: records.length - skipped,
    skippedRows: skipped,
    errorRows,
  }
  toast[skipped ? 'info' : 'success'](skipped ? `${skipped} row(s) skipped.` : 'Import loaded successfully.')
}

const handleImportFile = async (event) => {
  const file = event?.target?.files?.[0]
  if (!file) return
  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const firstSheet = workbook.SheetNames[0]
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' })
    await applyImportedRows(rows, file.name)
  } catch (error) {
    toast.error(error.message || 'Failed to import file.')
  } finally {
    if (importFileInputRef.value) importFileInputRef.value.value = ''
  }
}

watch(
  () => [
    employeeFilters.value.company_id,
    employeeFilters.value.department_id,
    employeeFilters.value.line_type,
    employeeFilters.value.employee_id,
  ],
  () => {
    bulkRows.value = []
  },
)

watch(() => bulkForm.value.salary_month, () => {
  bulkRows.value = []
})
</script>

<template>
  <div class="p-3 md:p-4 space-y-3">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-700">Meal Entry</p>
        <h1 class="mt-1 text-xl font-semibold text-slate-900">Bulk Meal Entry</h1>
        <p class="mt-1 text-xs text-slate-500">Compact bulk workflow for active employees only.</p>
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn-3" @click="router.push({ name: 'PayrollMealEntryList' })">
          <i class="far fa-arrow-left"></i><span class="hidden sm:flex">Back</span>
        </button>
        <button type="button" class="btn-2" :disabled="loadingRows" @click="loadRows">
          <i class="far" :class="loadingRows ? 'fa-spinner fa-spin' : 'fa-users'"></i>
          <span>{{ loadingRows ? 'Loading...' : 'Load Active Employees' }}</span>
        </button>
      </div>
    </div>

    <div class="rounded-xl border border-gray-100 bg-white p-3 shadow-sm space-y-3">
      <EmployeeFilter
        v-model:company_id="employeeFilters.company_id"
        v-model:department_id="employeeFilters.department_id"
        v-model:employee_id="employeeFilters.employee_id"
        v-model:line_type="employeeFilters.line_type"
        :with-type="true"
        @filter-change="bulkRows = []"
      />

      <div class="grid gap-2 md:grid-cols-3">
        <div>
          <label class="block text-[11px] font-medium text-gray-600 mb-1">Month</label>
          <input v-model="bulkForm.salary_month" type="month" :class="inputClass" />
        </div>
        <div>
          <label class="block text-[11px] font-medium text-gray-600 mb-1">Meal Rate</label>
          <input v-model="bulkForm.meal_rate" type="number" min="0" step="0.01" :class="inputClass" placeholder="0.00" />
        </div>
        <div>
          <label class="block text-[11px] font-medium text-gray-600 mb-1">Special Rate</label>
          <input v-model="bulkForm.common_additional" type="number" min="0" step="0.01" :class="inputClass" placeholder="0.00" />
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="btn-3" @click="resetForm"><i class="far fa-undo"></i> Reset</button>
        <button type="button" class="btn-3" @click="openImportGuide"><i class="far fa-file-import"></i> Import CSV/XLSX</button>
        <button type="button" class="btn-3" @click="downloadBulkTemplate"><i class="far fa-file-download"></i> Template</button>
        <button type="button" class="btn-3" @click="loadRows"><i class="far fa-sync"></i> Refresh Rows</button>
        <div class="ml-auto w-full md:w-72"><input v-model="search" type="text" :class="inputClass" placeholder="Search employee..." /></div>
      </div>
      <p class="text-[11px] text-slate-500">
        Import columns: <span class="font-medium">employee_id or user_id, total_meal</span>. Optional:
        <span class="font-medium">salary_month, meal_rate, additional_rate, total_additional_meal, additional_amount, total_amount</span>.
      </p>
    </div>

    <div v-if="importPreview.totalRows" class="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p class="text-amber-800 font-medium">Import Preview <span v-if="importPreview.fileName" class="text-amber-700">({{ importPreview.fileName }})</span></p>
        <div class="flex items-center gap-3 text-amber-700"><span>Total: {{ importPreview.totalRows }}</span><span>Accepted: {{ importPreview.acceptedRows }}</span><span>Skipped: {{ importPreview.skippedRows }}</span></div>
      </div>
      <div v-if="importPreview.errorRows.length" class="overflow-x-auto rounded-md border border-amber-200 bg-white">
        <table class="w-full text-xs">
          <thead class="bg-amber-100 text-amber-900 uppercase"><tr><th class="px-3 py-2 text-left">Row</th><th class="px-3 py-2 text-left">Identifier</th><th class="px-3 py-2 text-left">Reason</th></tr></thead>
          <tbody class="divide-y divide-amber-100">
            <tr v-for="(errRow, idx) in importPreview.errorRows" :key="`${errRow.rowNo}-${errRow.identifier}-${idx}`"><td class="px-3 py-2">{{ errRow.rowNo }}</td><td class="px-3 py-2 font-medium">{{ errRow.identifier }}</td><td class="px-3 py-2 text-amber-900">{{ errRow.reason }}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <LoaderView v-if="loadingRows" />
    <div v-else-if="!bulkRows.length" class="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
      <i class="fas fa-layer-group text-4xl text-gray-300 mb-3"></i>
      <p class="text-base font-medium text-gray-500">No employees loaded</p>
      <p class="mt-1 text-xs text-gray-400">Choose filters and click Load Active Employees</p>
    </div>

    <div v-else class="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
      <table class="w-full text-xs md:text-sm">
        <thead class="bg-blue-50 text-[11px] uppercase text-blue-900"><tr><th class="px-3 py-2 text-center">Select</th><th class="px-3 py-2 text-left">Employee</th><th class="px-3 py-2 text-right">Total Meals</th><th class="px-3 py-2 text-right">Total Special Meal</th><th class="px-3 py-2 text-right">Special Amount</th><th class="px-3 py-2 text-right">Sub Total</th></tr></thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="row in filteredRows" :key="row.user_id" class="hover:bg-gray-50 transition-colors">
            <td class="px-3 py-2 text-center"><input v-model="row.is_selected" type="checkbox" class="h-4 w-4 accent-blue-600" /></td>
            <td class="px-3 py-2"><div class="font-medium text-blue-900">{{ row.name }}</div><div class="text-[11px] text-gray-400">{{ row.employee_id || '-' }} · {{ row.department_name || 'No department' }}</div></td>
            <td class="px-3 py-2 text-right"><input v-model="row.total_meal" type="number" min="0" step="1" class="w-24 rounded-lg border border-gray-300 px-2.5 py-1.5 text-right text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="0" /></td>
            <td class="px-3 py-2 text-right"><input v-model="row.total_additional_meal" type="number" min="0" step="0.01" class="w-28 rounded-lg border border-gray-300 px-2.5 py-1.5 text-right text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="0.00" /></td>
            <td class="px-3 py-2 text-right font-mono text-gray-700">{{ formatCurrency(additionalAmount(row)) }}</td>
            <td class="px-3 py-2 text-right font-mono font-semibold text-blue-700">{{ formatCurrency(rowTotal(row)) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div><p class="text-[11px] font-medium text-gray-500">Selected Rows</p><p class="text-base font-semibold text-slate-900">{{ selectedRows.length }}</p></div>
        <div><p class="text-[11px] font-medium text-gray-500">Grand Total</p><p class="text-base font-semibold text-blue-700">{{ formatCurrency(grandTotal) }}</p></div>
        <div class="flex gap-2">
          <button type="button" class="btn-3" @click="router.push({ name: 'PayrollMealEntryList' })">Cancel</button>
          <button type="button" class="btn-2" :disabled="saving || !bulkRows.length" @click="saveBulkEntries">
            <i class="far" :class="saving ? 'fa-spinner fa-spin' : 'fa-save'"></i>
            {{ saving ? 'Saving...' : 'Save Bulk Entries' }}
          </button>
        </div>
      </div>
      <p v-if="bulkErrors.salary_month" class="mt-3 text-xs text-red-500">{{ bulkErrors.salary_month }}</p>
      <p v-if="bulkErrors.meal_rate" class="mt-1 text-xs text-red-500">{{ bulkErrors.meal_rate }}</p>
      <p v-if="bulkErrors.common_additional" class="mt-1 text-xs text-red-500">{{ bulkErrors.common_additional }}</p>
      <p v-if="bulkErrors.rows" class="mt-1 text-xs text-red-500">{{ bulkErrors.rows }}</p>
    </div>

    <div v-if="showImportGuideModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="closeImportGuide">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b"><h3 class="font-bold text-blue-900 text-lg">Bulk Import Format Guide</h3><button @click="closeImportGuide" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button></div>
        <div class="p-6 space-y-4 text-sm">
          <p class="text-gray-600">Import file first row should contain headers in the expected format.</p>
          <div class="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-2"><p class="text-xs font-semibold text-blue-800 uppercase tracking-wide">Required Columns</p><p class="text-blue-900 font-medium">employee_id or user_id, total_meal</p><p class="text-xs text-blue-700">Additional part can be provided using <strong>total_additional_meal</strong>, <strong>additional_amount</strong>, <strong>total_amount</strong>, or <strong>additional_rate</strong>.</p></div>
          <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2"><p class="text-xs font-semibold text-gray-700 uppercase tracking-wide">Optional Columns</p><p class="text-gray-800">salary_month, meal_rate, additional_rate</p></div>
          <div class="flex flex-wrap justify-end gap-2 pt-1">
            <button type="button" class="btn-3" @click="downloadBulkTemplate"><i class="far fa-file-download"></i> Download Template</button>
            <button type="button" class="btn-3" @click="closeImportGuide">Cancel</button>
            <button type="button" class="btn-2" @click="continueImportFromGuide"><i class="far fa-file-import"></i> Continue to Import</button>
          </div>
        </div>
      </div>
    </div>

    <input ref="importFileInputRef" type="file" class="hidden" accept=".csv,.xlsx,.xls" @change="handleImportFile" />
  </div>
</template>
