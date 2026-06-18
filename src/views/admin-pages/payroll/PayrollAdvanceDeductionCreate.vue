<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import * as XLSX from 'xlsx'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import apiClient from '@/axios'
import { toNum } from '@/utils/currency'
import { usePayrollAdvanceDeductionStore } from '@/stores/payrollAdvanceDeduction'
import { useUserStore } from '@/stores/user'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const store = usePayrollAdvanceDeductionStore()
const userStore = useUserStore()

const activeTab = ref('bulk') // Default: bulk (client requirement)

const defaultMonth = () => new Date().toISOString().slice(0, 7)

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

// ─── Bulk form ───────────────────────────────────────────────────────────────

const bulkForm = ref({
  carry_on_month: route.query.carry_on_month || route.query.salary_month
    ? String(route.query.carry_on_month || route.query.salary_month).slice(0, 7)
    : defaultMonth(),
})

const employeeFilters = ref({
  company_id: route.query.company_id ? String(route.query.company_id) : '',
  department_id: route.query.department_id ? String(route.query.department_id) : '',
  employee_id: route.query.employee_id || route.query.user_id
    ? String(route.query.employee_id || route.query.user_id)
    : '',
  line_type: route.query.line_type ? String(route.query.line_type) : 'all',
})

const bulkRows = ref([])
const bulkErrors = ref({})
const loadingRows = ref(false)
const savingBulk = ref(false)
const search = ref('')
const importFileInputRef = ref(null)
const importPreview = ref({ fileName: '', totalRows: 0, acceptedRows: 0, skippedRows: 0, errorRows: [] })

const bulkMonthPeriod = computed({
  get: () => monthToPeriod(bulkForm.value.carry_on_month),
  set: (value) => { bulkForm.value.carry_on_month = periodToMonth(value) },
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
    const response = await apiClient.get(url, { params: { ...params, page, per_page: 200 } })
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
  return normalizeText(getEmployeeId(user)) === target || normalizeText(getUserId(user)) === target
}

const buildUserParams = () => {
  const params = { status: 'active' }
  if (employeeFilters.value.company_id) params.company_id = employeeFilters.value.company_id
  if (employeeFilters.value.department_id) params.department_id = employeeFilters.value.department_id
  if (employeeFilters.value.line_type && employeeFilters.value.line_type !== 'all')
    params.line_type = employeeFilters.value.line_type
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
    if (employeeFilters.value.employee_id)
      users = users.filter((user) => isSameEmployee(user, employeeFilters.value.employee_id))
    bulkRows.value = users.map((user) => ({
      user_id: user.id || user.user_id,
      employee_id: getEmployeeId(user),
      name: user.name || user.full_name || 'Unknown',
      department_name: user.department?.name || user.department_name || '',
      amount: '',
      note: '',
      is_selected: true,
    }))
    if (!bulkRows.value.length) toast.info('No employee found with selected filter.')
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

const selectedTotal = computed(() =>
  selectedRows.value.reduce((sum, row) => sum + toNum(row.amount), 0),
)

const validateBulk = () => {
  const errors = {}
  if (!bulkForm.value.carry_on_month) errors.carry_on_month = 'Carry on month is required.'
  if (!selectedRows.value.length) errors.rows = 'Select at least one employee.'
  if (selectedRows.value.some((row) => toNum(row.amount) <= 0))
    errors.amount = 'Selected rows must have advance deduction amount.'
  bulkErrors.value = errors
  return !Object.keys(errors).length
}

const saveBulkEntries = async () => {
  if (!validateBulk()) return
  savingBulk.value = true
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
    savingBulk.value = false
  }
}

const resetBulk = () => {
  bulkForm.value = { carry_on_month: defaultMonth() }
  employeeFilters.value = { company_id: '', department_id: '', employee_id: '', line_type: 'all' }
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
      errorRows.push({ rowNo, identifier: employeeId || (userId ? `user_id:${userId}` : 'N/A'), reason: reasons.join(' ') })
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
  savingBulk.value = true
  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const firstSheet = workbook.SheetNames[0]
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' })
    const { entries, skipped, errorRows } = parseImportRecords(rows)
    if (!entries.length) {
      importPreview.value = { fileName: file.name, totalRows: rows.length, acceptedRows: 0, skippedRows: skipped, errorRows }
      toast.error('No valid advance deduction rows found.')
      return
    }
    await store.createBulk({ entries })
    importPreview.value = { fileName: file.name, totalRows: rows.length, acceptedRows: entries.length, skippedRows: skipped, errorRows }
    toast.success(`${entries.length} advance deduction row(s) imported.`)
    bulkForm.value.carry_on_month = entries[0]?.carry_on_month || bulkForm.value.carry_on_month
  } catch (err) {
    toast.error(err.response?.data?.message || err.message || 'Failed to import advance deductions.')
  } finally {
    savingBulk.value = false
    if (importFileInputRef.value) importFileInputRef.value.value = ''
  }
}

watch(() => bulkForm.value.carry_on_month, () => { bulkRows.value = [] })

// ─── Single form ─────────────────────────────────────────────────────────────

const selectedEmployee = ref(null)
const singleForm = ref({
  carry_on_month: defaultMonth(),
  amount: '',
  note: '',
})
const singleErrors = ref({})
const savingSingle = ref(false)

const singleMonthPeriod = computed({
  get: () => monthToPeriod(singleForm.value.carry_on_month),
  set: (val) => { singleForm.value.carry_on_month = periodToMonth(val) },
})

watch(selectedEmployee, (emp) => {
  if (!emp) { singleForm.value.user_id = ''; singleForm.value.employee_id = '' }
})

const saveSingleEntry = async () => {
  singleErrors.value = {}
  if (!selectedEmployee.value?.id) { singleErrors.value.employee = 'Employee is required.'; return }
  if (!singleForm.value.carry_on_month) { singleErrors.value.carry_on_month = 'Month is required.'; return }
  if (!singleForm.value.amount || toNum(singleForm.value.amount) <= 0) { singleErrors.value.amount = 'Valid amount required.'; return }

  savingSingle.value = true
  try {
    await store.createBulk({
      entries: [{
        user_id: selectedEmployee.value.id,
        employee_id: getEmployeeId(selectedEmployee.value) || null,
        carry_on_month: singleForm.value.carry_on_month,
        amount: toNum(singleForm.value.amount),
        reason: singleForm.value.note || 'Advance deduction',
      }],
    })
    toast.success('Advance deduction saved successfully.')
    selectedEmployee.value = null
    singleForm.value = { carry_on_month: defaultMonth(), amount: '', note: '' }
    backToList()
  } catch (err) {
    toast.error(err.response?.data?.message || err.message || 'Failed to save.')
  } finally {
    savingSingle.value = false
  }
}

// ─── Common ───────────────────────────────────────────────────────────────────

const backToList = () => {
  router.push({
    name: 'PayrollAdvanceDeductionList',
    query: { carry_on_month: bulkForm.value.carry_on_month, status: 'pending' },
  })
}

onMounted(() => {
  userStore.fetchTypeWiseEmployees({ status: 'active' })
})
</script>

<template>
  <div class="p-3 md:p-4 space-y-4">

    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-600">Payroll</p>
        <h1 class="mt-0.5 text-xl font-semibold text-slate-900">Add Advance Deduction</h1>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="btn-3" @click="backToList">
          <i class="far fa-arrow-left"></i> Back to List
        </button>
        <button type="button" class="btn-3" @click="downloadTemplate">
          <i class="far fa-download"></i> Template
        </button>
        <button type="button" class="btn-2" @click="importFileInputRef?.click()">
          <i class="far fa-file-import"></i> Import CSV/XLSX
        </button>
        <input ref="importFileInputRef" type="file" class="hidden" accept=".csv,.xlsx,.xls" @change="handleImportFile" />
      </div>
    </div>

    <!-- Tab Switcher -->
    <div class="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 w-fit">
      <button
        type="button"
        :class="[
          'rounded-lg px-5 py-2 text-sm font-semibold transition-all',
          activeTab === 'bulk'
            ? 'bg-white text-rose-700 shadow-sm ring-1 ring-slate-200'
            : 'text-slate-500 hover:text-slate-700',
        ]"
        @click="activeTab = 'bulk'"
      >
        <i class="far fa-users mr-1.5"></i>
        Bulk Entry
      </button>
      <button
        type="button"
        :class="[
          'rounded-lg px-5 py-2 text-sm font-semibold transition-all',
          activeTab === 'single'
            ? 'bg-white text-rose-700 shadow-sm ring-1 ring-slate-200'
            : 'text-slate-500 hover:text-slate-700',
        ]"
        @click="activeTab = 'single'"
      >
        <i class="far fa-user mr-1.5"></i>
        Single Entry
      </button>
    </div>

    <!-- ── Single Entry Tab ───────────────────────────────────────────────── -->
    <div v-if="activeTab === 'single'" class="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-100 px-5 py-4">
        <h2 class="text-sm font-semibold text-slate-800">Single Employee Advance Deduction</h2>
        <p class="mt-0.5 text-xs text-slate-500">Search an employee and enter the deduction details.</p>
      </div>
      <div class="p-5 space-y-4">

        <div class="grid gap-4 md:grid-cols-2">
          <!-- Employee Select -->
          <div class="md:col-span-2">
            <MultiselectDropdown
              v-model="selectedEmployee"
              :options="userStore.users"
              :multiple="false"
              :required="false"
              label="name"
              labelPrefix="employee_id"
              top-label="Employee"
              placeholder="Search employee..."
            />
            <p v-if="singleErrors.employee" class="mt-1 text-xs text-rose-600">{{ singleErrors.employee }}</p>
          </div>

          <!-- Month -->
          <div>
            <FlexibleDatePicker
              v-model="singleMonthPeriod"
              :show-year="false"
              :show-month="true"
              :show-date="false"
              label="Carry On Month"
            />
            <p v-if="singleErrors.carry_on_month" class="mt-1 text-xs text-rose-600">{{ singleErrors.carry_on_month }}</p>
          </div>

          <!-- Amount -->
          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-600">Amount</label>
            <input
              v-model="singleForm.amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
            <p v-if="singleErrors.amount" class="mt-1 text-xs text-rose-600">{{ singleErrors.amount }}</p>
          </div>

          <!-- Note -->
          <div class="md:col-span-2">
            <label class="mb-1 block text-xs font-semibold text-slate-600">Note <span class="font-normal text-slate-400">(optional)</span></label>
            <input
              v-model.trim="singleForm.note"
              type="text"
              placeholder="e.g. Salary advance recovery"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" class="btn-3" @click="backToList">Cancel</button>
          <button
            type="button"
            class="btn-2"
            :disabled="savingSingle"
            @click="saveSingleEntry"
          >
            <i class="far" :class="savingSingle ? 'fa-spinner fa-spin' : 'fa-save'"></i>
            {{ savingSingle ? 'Saving...' : 'Save Deduction' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Bulk Entry Tab ─────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'bulk'" class="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-100 px-5 py-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-sm font-semibold text-slate-800">Bulk Employee Advance Deduction</h2>
            <p class="mt-0.5 text-xs text-slate-500">Filter employees, load them, then enter amounts.</p>
          </div>
          <div class="flex gap-2">
            <button type="button" class="btn-3 text-xs" @click="resetBulk">
              <i class="far fa-undo"></i> Reset
            </button>
            <button
              type="button"
              class="btn-2 text-xs"
              :disabled="loadingRows"
              @click="loadRows"
            >
              <i class="far" :class="loadingRows ? 'fa-spinner fa-spin' : 'fa-users'"></i>
              {{ loadingRows ? 'Loading...' : 'Load Employees' }}
            </button>
          </div>
        </div>
      </div>

      <div class="p-5 space-y-4">
        <!-- Filters -->
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
            v-model="bulkMonthPeriod"
            :show-year="false"
            :show-month="true"
            :show-date="false"
            label="Carry On Month"
          />
        </EmployeeFilter>

        <!-- Validation errors -->
        <div v-if="bulkErrors.carry_on_month || bulkErrors.rows || bulkErrors.amount"
          class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <p v-if="bulkErrors.carry_on_month">{{ bulkErrors.carry_on_month }}</p>
          <p v-if="bulkErrors.rows">{{ bulkErrors.rows }}</p>
          <p v-if="bulkErrors.amount">{{ bulkErrors.amount }}</p>
        </div>

        <!-- Employee Table -->
        <LoaderView v-if="loadingRows" />
        <div v-else-if="!bulkRows.length"
          class="rounded-xl border border-dashed border-slate-200 p-10 text-center">
          <i class="far fa-users text-2xl text-slate-300"></i>
          <p class="mt-2 text-sm font-medium text-slate-500">No employees loaded</p>
          <p class="text-xs text-slate-400">Apply filters and click Load Employees</p>
        </div>
        <div v-else class="space-y-3">
          <!-- Search + summary bar -->
          <div class="flex flex-wrap items-center justify-between gap-2">
            <input
              v-model="search"
              type="text"
              placeholder="Search employee..."
              class="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
            <div class="flex gap-4 text-xs text-slate-500">
              <span>Rows: <b class="text-slate-700">{{ bulkRows.length }}</b></span>
              <span>Selected: <b class="text-slate-700">{{ selectedRows.length }}</b></span>
              <span v-if="selectedTotal > 0">Total: <b class="text-rose-700">{{ selectedTotal.toLocaleString() }}</b></span>
            </div>
          </div>

          <div class="overflow-x-auto rounded-lg border border-slate-200">
            <table class="min-w-full divide-y divide-slate-100 text-sm">
              <thead class="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th class="w-10 px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      class="h-4 w-4 accent-rose-600"
                      :checked="selectedRows.length === bulkRows.length"
                      @change="bulkRows.forEach(r => r.is_selected = $event.target.checked)"
                    />
                  </th>
                  <th class="px-3 py-2.5 text-left">Employee</th>
                  <th class="px-3 py-2.5 text-left">Department</th>
                  <th class="px-3 py-2.5 text-right">Amount</th>
                  <th class="px-3 py-2.5 text-left">Note</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="row in filteredRows"
                  :key="row.user_id"
                  :class="['transition', row.is_selected ? 'bg-white hover:bg-rose-50/30' : 'bg-slate-50/50 opacity-60']"
                >
                  <td class="px-3 py-2 text-center">
                    <input v-model="row.is_selected" type="checkbox" class="h-4 w-4 accent-rose-600" />
                  </td>
                  <td class="px-3 py-2">
                    <div class="font-medium text-slate-800">{{ row.name }}</div>
                    <div class="text-[11px] text-slate-400">{{ row.employee_id || '-' }}</div>
                  </td>
                  <td class="px-3 py-2 text-xs text-slate-500">{{ row.department_name || '-' }}</td>
                  <td class="px-3 py-2 text-right">
                    <input
                      v-model="row.amount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      class="w-28 rounded-lg border border-slate-200 px-2.5 py-1.5 text-right text-xs focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                    />
                  </td>
                  <td class="px-3 py-2">
                    <input
                      v-model.trim="row.note"
                      type="text"
                      placeholder="Note"
                      class="w-full min-w-48 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-slate-100">
            <button type="button" class="btn-3 text-xs" @click="bulkRows = []">Clear Rows</button>
            <button
              type="button"
              class="btn-2"
              :disabled="savingBulk || !selectedRows.length"
              @click="saveBulkEntries"
            >
              <i class="far" :class="savingBulk ? 'fa-spinner fa-spin' : 'fa-save'"></i>
              {{ savingBulk ? 'Saving...' : `Save ${selectedRows.length} Deduction${selectedRows.length !== 1 ? 's' : ''}` }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Import Result -->
    <div v-if="importPreview.fileName"
      class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
      <div class="font-semibold">
        {{ importPreview.fileName }}: {{ importPreview.acceptedRows }} accepted, {{ importPreview.skippedRows }} skipped
      </div>
      <div v-for="row in importPreview.errorRows.slice(0, 5)" :key="row.rowNo" class="mt-1 text-rose-700">
        Row {{ row.rowNo }} ({{ row.identifier }}): {{ row.reason }}
      </div>
    </div>

  </div>
</template>
