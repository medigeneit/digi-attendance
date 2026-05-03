<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import * as XLSX from 'xlsx'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import apiClient from '@/axios'
import { toNum } from '@/utils/currency'
import { usePayrollAdvanceDeductionStore } from '@/stores/payrollAdvanceDeduction'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const store = usePayrollAdvanceDeductionStore()

const defaultMonth = () => new Date().toISOString().slice(0, 7)

const bulkForm = ref({
  carry_on_month: route.query.carry_on_month || route.query.salary_month ? String(route.query.carry_on_month || route.query.salary_month).slice(0, 7) : defaultMonth(),
})

const employeeFilters = ref({
  company_id: route.query.company_id ? String(route.query.company_id) : '',
  department_id: route.query.department_id ? String(route.query.department_id) : '',
  employee_id: route.query.employee_id || route.query.user_id ? String(route.query.employee_id || route.query.user_id) : '',
  line_type: route.query.line_type ? String(route.query.line_type) : 'all',
})

const bulkRows = ref([])
const bulkErrors = ref({})
const loadingRows = ref(false)
const saving = ref(false)
const search = ref('')
const importFileInputRef = ref(null)
const importPreview = ref({ fileName: '', totalRows: 0, acceptedRows: 0, skippedRows: 0, errorRows: [] })

const toMonthValue = (value) => {
  const v = String(value || '').trim()
  if (!v) return ''
  if (/^\d{4}-\d{2}$/.test(v)) return v
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.slice(0, 7)
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 7)
  return ''
}

const monthToPeriod = (value) => {
  const month = toMonthValue(value)
  if (!month) return { year: null, month: null, day: 1 }
  return { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)), day: 1 }
}

const periodToMonth = (value) => {
  if (!value?.year || !value?.month) return ''
  return `${value.year}-${String(value.month).padStart(2, '0')}`
}

const salaryMonthPeriod = computed({
  get: () => monthToPeriod(bulkForm.value.carry_on_month),
  set: (value) => {
    bulkForm.value.carry_on_month = periodToMonth(value)
  },
})

const normalizeHeader = (value) =>
  String(value || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')

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
    const response = await apiClient.get(url, {
      params: { ...params, page, per_page: 200 },
    })

    const data = response.data
    rows.push(...toArray(data))
    lastPage = data?.last_page || data?.meta?.last_page || 1
    page += 1
  } while (page <= lastPage)

  return rows
}

const normalizeText = (value) => String(value || '').trim().toLowerCase()

const getEmployeeId = (user) =>
  String(user?.employee_id || user?.employee_code || user?.emp_id || user?.emp_no || '').trim()

const getUserId = (user) => String(user?.id || user?.user_id || '').trim()

const isSameEmployee = (user, identifier) => {
  const target = normalizeText(identifier)
  if (!target) return true

  return (
    normalizeText(getEmployeeId(user)) === target ||
    normalizeText(getUserId(user)) === target
  )
}

const buildUserParams = () => {
  const params = {
    status: 'active',
  }

  if (employeeFilters.value.company_id) params.company_id = employeeFilters.value.company_id
  if (employeeFilters.value.department_id) params.department_id = employeeFilters.value.department_id

  if (employeeFilters.value.line_type && employeeFilters.value.line_type !== 'all') {
    params.line_type = employeeFilters.value.line_type
  }

  if (employeeFilters.value.employee_id) {
    params.employee_id = employeeFilters.value.employee_id
    params.user_id = employeeFilters.value.employee_id
  }

  return params
}

const onBulkFilterChange = (payload = {}) => {
  employeeFilters.value = {
    company_id: payload.company_id || '',
    department_id: payload.department_id || '',
    employee_id: payload.employee_id || payload.user_id || '',
    line_type: payload.line_type || 'all',
  }

  bulkRows.value = []
}

const loadRows = async () => {
  bulkErrors.value = {}

  if (!bulkForm.value.carry_on_month) {
    bulkErrors.value.carry_on_month = 'Carry on month is required.'
    return
  }

  loadingRows.value = true

  try {
    const params = buildUserParams()
    let users = await fetchAllPages('/users', params)

    if (employeeFilters.value.employee_id) {
      users = users.filter((user) => isSameEmployee(user, employeeFilters.value.employee_id))
    }

    bulkRows.value = users.map((user) => ({
      user_id: user.id || user.user_id,
      employee_id: getEmployeeId(user),
      name: user.name || user.full_name || 'Unknown',
      department_name: user.department?.name || user.department_name || '',
      amount: '',
      note: '',
      is_selected: true,
    }))

    if (!bulkRows.value.length) {
      toast.info('No employee found with selected filter.')
    }
  } catch (err) {
    toast.error(err.response?.data?.message || err.message || 'Failed to load employees.')
  } finally {
    loadingRows.value = false
  }
}

const filteredRows = computed(() => {
  const keyword = search.value.trim().toLowerCase()

  if (!keyword) return bulkRows.value

  return bulkRows.value.filter((row) =>
    [row.employee_id, row.name, row.department_name]
      .map((value) => String(value || '').toLowerCase())
      .some((value) => value.includes(keyword)),
  )
})

const selectedRows = computed(() => bulkRows.value.filter((row) => row.is_selected))

const validateBulk = () => {
  const errors = {}

  if (!bulkForm.value.carry_on_month) errors.carry_on_month = 'Carry on month is required.'
  if (!selectedRows.value.length) errors.rows = 'Select at least one employee.'
  if (selectedRows.value.some((row) => toNum(row.amount) <= 0)) {
    errors.amount = 'Selected rows must have advance deduction amount.'
  }

  bulkErrors.value = errors
  return !Object.keys(errors).length
}

const backToList = () => {
  router.push({
    name: 'PayrollAdvanceDeductionList',
    query: {
      carry_on_month: bulkForm.value.carry_on_month,
      status: 'pending',
    },
  })
}

const saveBulkEntries = async () => {
  if (!validateBulk()) return

  saving.value = true

  try {
    await store.createBulk({
      entries: selectedRows.value.map((row) => ({
        user_id: row.user_id,
        employee_id: row.employee_id || null,
        carry_on_month: bulkForm.value.carry_on_month,
        amount: toNum(row.amount),
        reason: row.note || 'Advance deduction',
      })),
    })

    toast.success(`${selectedRows.value.length} advance deduction row(s) saved.`)
    backToList()
  } catch (err) {
    if (err.errors) bulkErrors.value = err.errors
    toast.error(err.response?.data?.message || err.message || 'Failed to save advance deductions.')
  } finally {
    saving.value = false
  }
}

const resetBulk = () => {
  bulkForm.value = {
    carry_on_month: defaultMonth(),
  }

  employeeFilters.value = {
    company_id: '',
    department_id: '',
    employee_id: '',
    line_type: 'all',
  }

  bulkRows.value = []
  search.value = ''
  bulkErrors.value = {}
  importPreview.value = { fileName: '', totalRows: 0, acceptedRows: 0, skippedRows: 0, errorRows: [] }
}

const downloadTemplate = () => {
  const csv = [
    'company_id,department_id,line_type,employee_id,user_id,amount,note,carry_on_month',
    `1,,,EMP001,,2000,salary advance recovery,${bulkForm.value.carry_on_month || defaultMonth()}`,
  ].join('\n')

  const blob = new Blob([`${csv}\n`], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')

  link.href = URL.createObjectURL(blob)
  link.download = 'payroll-advance-deduction-template.csv'
  link.click()

  URL.revokeObjectURL(link.href)
}

const parseImportRecords = (records) => {
  const entries = []
  const errorRows = []
  let skipped = 0

  records.forEach((raw, index) => {
    const rowNo = index + 2
    const record = normalizeRecord(raw)

    const employeeId = String(
      record.employee_id || record.employee_code || record.emp_id || record.emp_no || record.emp_n || '',
    ).trim()

    const userId = String(record.user_id || '').trim()
    const amount = record.amount ?? record.advance_amount ?? record.advance_deduction
    const carryOnMonth = toMonthValue(
      record.carry_on_month || record.salary_month || record.deduction_month || bulkForm.value.carry_on_month,
    )

    const reasons = []

    if (!employeeId && !userId) reasons.push('Missing employee_id or user_id.')
    if (amount === undefined || amount === '' || toNum(amount) <= 0) reasons.push('Invalid amount.')
    if (!carryOnMonth) reasons.push('Invalid carry_on_month.')

    if (reasons.length) {
      skipped += 1
      errorRows.push({
        rowNo,
        identifier: employeeId || (userId ? `user_id:${userId}` : 'N/A'),
        reason: reasons.join(' '),
      })
      return
    }

    entries.push({
      company_id: record.company_id || record.com || null,
      department_id: record.department_id || record.dept || null,
      line_type: record.line_type || record.type || null,
      employee_id: employeeId || null,
      user_id: userId ? Number(userId) : null,
      carry_on_month: carryOnMonth,
      amount: toNum(amount),
      reason: record.reason || record.note || null,
    })
  })

  return { entries, skipped, errorRows }
}

const handleImportFile = async (event) => {
  const file = event?.target?.files?.[0]
  if (!file) return

  saving.value = true

  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const firstSheet = workbook.SheetNames[0]
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' })

    const { entries, skipped, errorRows } = parseImportRecords(rows)

    if (!entries.length) {
      importPreview.value = {
        fileName: file.name,
        totalRows: rows.length,
        acceptedRows: 0,
        skippedRows: skipped,
        errorRows,
      }

      toast.error('No valid advance deduction rows found.')
      return
    }

    await store.createBulk({ entries })

    importPreview.value = {
      fileName: file.name,
      totalRows: rows.length,
      acceptedRows: entries.length,
      skippedRows: skipped,
      errorRows,
    }

    toast.success(`${entries.length} advance deduction row(s) imported.`)
    bulkForm.value.carry_on_month = entries[0]?.carry_on_month || bulkForm.value.carry_on_month
  } catch (err) {
    toast.error(err.response?.data?.message || err.message || 'Failed to import advance deductions.')
  } finally {
    saving.value = false
    if (importFileInputRef.value) importFileInputRef.value.value = ''
  }
}

watch(
  () => bulkForm.value.carry_on_month,
  () => {
    bulkRows.value = []
  },
)
</script>

<template>
  <div class="p-3 md:p-4 space-y-3">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-700">Payroll</p>
        <h1 class="mt-1 text-xl font-semibold text-slate-900">Bulk Advance Deduction</h1>
        <p class="mt-1 text-xs text-slate-500">Employee filter diye single ba multiple advance deduction entry save korun.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="btn-3" @click="backToList"><i class="far fa-arrow-left"></i> Back</button>
        <button type="button" class="btn-3" @click="downloadTemplate"><i class="far fa-download"></i> Template</button>
        <button type="button" class="btn-2" @click="importFileInputRef?.click()"><i class="far fa-file-import"></i> Import CSV/XLSX</button>
        <input ref="importFileInputRef" type="file" class="hidden" accept=".csv,.xlsx,.xls" @change="handleImportFile" />
      </div>
    </div>
    

    <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-semibold text-slate-900">Employee Selection</h2>
          <p class="mt-0.5 text-xs text-slate-500">Specific employee filter korle single row load hobe.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn-3" @click="resetBulk"><i class="far fa-undo"></i> Reset</button>
          <button type="button" class="btn-2" :disabled="loadingRows" @click="loadRows">
            <i class="far" :class="loadingRows ? 'fa-spinner fa-spin' : 'fa-users'"></i>
            {{ loadingRows ? 'Loading...' : 'Load Employees' }}
          </button>
        </div>
      </div>

      <EmployeeFilter
        :company_id="employeeFilters.company_id"
        :department_id="employeeFilters.department_id"
        :employee_id="employeeFilters.employee_id"
        :line_type="employeeFilters.line_type"
        :with-type="true"
        @update:company_id="employeeFilters.company_id = $event"
        @update:department_id="employeeFilters.department_id = $event"
        @update:employee_id="employeeFilters.employee_id = $event"
        @update:line_type="employeeFilters.line_type = $event"
        @filter-change="onBulkFilterChange"
      >
      <FlexibleDatePicker
        v-model="salaryMonthPeriod"
        :show-year="false"
        :show-month="true"
        :show-date="false"
        label="Carry On Month"
      />
    </EmployeeFilter>

      <!-- <div class="flex flex-wrap items-center gap-2">
        <div class="w-full md:w-80"><input v-model="search" type="text" :class="inputClass" placeholder="Search loaded employee..." /></div>
        <div class="ml-auto flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span>Rows: <b>{{ bulkRows.length }}</b></span>
          <span>Selected: <b>{{ selectedRows.length }}</b></span>
          <span>Total: <b class="text-rose-700">{{ formatCurrency(selectedTotal) }}</b></span>
        </div>
      </div> -->

      <div v-if="bulkErrors.carry_on_month || bulkErrors.rows || bulkErrors.amount" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
        <p v-if="bulkErrors.carry_on_month">{{ bulkErrors.carry_on_month }}</p>
        <p v-if="bulkErrors.rows">{{ bulkErrors.rows }}</p>
        <p v-if="bulkErrors.amount">{{ bulkErrors.amount }}</p>
      </div>

      <LoaderView v-if="loadingRows" />
      <div v-else-if="!bulkRows.length" class="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
        Filter select kore Load Employees click korun.
      </div>
      <div v-else class="overflow-x-auto rounded-lg border border-slate-200">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th class="px-3 py-2 text-center font-semibold">Select</th>
              <th class="px-3 py-2 text-left font-semibold">Employee</th>
              <th class="px-3 py-2 text-left font-semibold">Department</th>
              <th class="px-3 py-2 text-right font-semibold">Advance Deduction</th>
              <th class="px-3 py-2 text-left font-semibold">Note</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in filteredRows" :key="row.user_id" class="hover:bg-slate-50">
              <td class="px-3 py-2 text-center"><input v-model="row.is_selected" type="checkbox" class="h-4 w-4 accent-rose-600" /></td>
              <td class="px-3 py-2"><div class="font-medium text-slate-800">{{ row.name }}</div><div class="text-xs text-slate-500">{{ row.employee_id || '-' }}</div></td>
              <td class="px-3 py-2 text-slate-600">{{ row.department_name || '-' }}</td>
              <td class="px-3 py-2 text-right">
                <input v-model="row.amount" type="number" min="0" step="0.01" class="w-32 rounded-lg border border-slate-300 px-2.5 py-1.5 text-right text-xs focus:outline-none focus:ring-2 focus:ring-rose-200" placeholder="0.00" />
              </td>
              <td class="px-3 py-2">
                <input v-model.trim="row.note" type="text" class="w-full min-w-72 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-200" placeholder="Note" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-2">
        <button type="button" class="btn-3" @click="bulkRows = []">Clear Rows</button>
        <button type="button" class="btn-2" :disabled="saving || !bulkRows.length" @click="saveBulkEntries">
          <i class="far" :class="saving ? 'fa-spinner fa-spin' : 'fa-save'"></i>
          {{ saving ? 'Saving...' : 'Save Selected Deductions' }}
        </button>
      </div>
    </div>

    <div v-if="importPreview.fileName" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
      <div class="font-semibold">{{ importPreview.fileName }}: {{ importPreview.acceptedRows }} accepted, {{ importPreview.skippedRows }} skipped</div>
      <div v-for="row in importPreview.errorRows.slice(0, 3)" :key="row.rowNo" class="mt-1">
        Row {{ row.rowNo }} ({{ row.identifier }}): {{ row.reason }}
      </div>
    </div>
  </div>
</template>
