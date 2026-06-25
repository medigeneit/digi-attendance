<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import * as XLSX from 'xlsx'
import apiClient from '@/axios'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import SalaryTransferLetterModal from '@/components/settings/SalaryTransferLetterModal.vue'
import { useCompanyBankAccountStore } from '@/stores/companyBankAccount'
import { useUnitStore } from '@/stores/unit'

const router = useRouter()
const route = useRoute()

const bankAccStore = useCompanyBankAccountStore()
const unitStore    = useUnitStore()
const { items: bankAccounts } = storeToRefs(bankAccStore)
const { units }               = storeToRefs(unitStore)

// ─── Filter state ─────────────────────────────────────────────────────────────
const currentMonth    = () => new Date().toISOString().slice(0, 7)
const salaryMonth     = ref(currentMonth())
const filterBankId    = ref('')
const filterUnitId    = ref('')
const filterBranchName = ref('')
const payrollCycle    = ref('regular')
const sortBy          = ref('department')
const sortDirection   = ref('asc')
const payrollCycleOptions = [
  { value: 'regular', label: 'Regular Monthly Payroll' },
  { value: 'half_salary_advance', label: 'Half Salary Advance' },
  { value: 'bonus_only', label: 'Bonus Only' },
]
const sortOptions = [
  { value: 'department', label: 'Department' },
  { value: 'designation_grade', label: 'Designation Grade' },
  { value: 'joining_date', label: 'Joining Date' },
  { value: 'bank_branch', label: 'Bank Branch' },
]
const sortDirectionOptions = [
  { value: 'asc', label: 'ASC' },
  { value: 'desc', label: 'DESC' },
]
const lineTypeOptions = [
  { value: 'all',           label: 'All Types'    },
  { value: 'executive',     label: 'Executive'    },
  { value: 'support_staff', label: 'Support Staff' },
  { value: 'doctor',        label: 'Doctor'       },
  { value: 'academy_body',  label: 'Academy Body' },
]
const filterLineType = ref('executive')

// ─── Data ─────────────────────────────────────────────────────────────────────
const rows       = ref([])
const loading    = ref(false)
const error      = ref('')
const showLetter = ref(false)

// ─── Month picker bridge ──────────────────────────────────────────────────────
const monthToPeriod = (v) => {
  const m = String(v || '').slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(m)) return { year: null, month: null, day: 1 }
  return { year: +m.slice(0, 4), month: +m.slice(5, 7), day: 1 }
}
const periodToMonth = (v) => {
  if (!v?.year || !v?.month) return ''
  return `${v.year}-${String(v.month).padStart(2, '0')}`
}
const monthPeriod = computed({
  get: () => monthToPeriod(salaryMonth.value),
  set: (v) => { salaryMonth.value = periodToMonth(v) },
})

// ─── Selected filter objects ──────────────────────────────────────────────────
const selectedBank = computed(() =>
  filterBankId.value ? bankAccounts.value.find(b => String(b.id) === filterBankId.value) ?? null : null
)
const selectedUnit = computed(() =>
  filterUnitId.value ? units.value.find(u => String(u.id) === filterUnitId.value) ?? null : null
)
const branchOptions = computed(() =>
  [...new Set(bankAccounts.value.map(b => b.branch_name).filter(Boolean))].sort()
)
const selectedBranch = computed(() => filterBranchName.value || null)
const selectedPayrollCycle = computed(() =>
  payrollCycleOptions.find(option => option.value === payrollCycle.value) || payrollCycleOptions[0]
)
const selectedSort = computed(() =>
  sortOptions.find(option => option.value === sortBy.value) || sortOptions[0]
)
const selectedSortDirection = computed(() =>
  sortDirectionOptions.find(option => option.value === sortDirection.value) || sortDirectionOptions[0]
)
const selectedLineType = computed(() =>
  lineTypeOptions.find(o => o.value === filterLineType.value) || lineTypeOptions[1]
)

const queryValue = (key, fallback = '') => {
  const value = route.query[key]
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback
}

function applyQueryFilters() {
  const queryCycle    = queryValue('payroll_cycle', 'regular')
  const queryLineType = queryValue('line_type', 'executive')
  salaryMonth.value    = queryValue('salary_month', currentMonth())
  filterBankId.value   = queryValue('bank_account_id', '')
  filterUnitId.value   = queryValue('unit_id', '')
  filterBranchName.value = queryValue('branch_name', '')
  filterLineType.value = lineTypeOptions.some(o => o.value === queryLineType) ? queryLineType : 'executive'
  payrollCycle.value   = payrollCycleOptions.some(option => option.value === queryCycle) ? queryCycle : 'regular'
  sortBy.value         = sortOptions.some(option => option.value === queryValue('sort_by')) ? queryValue('sort_by') : 'department'
  sortDirection.value  = sortDirectionOptions.some(option => option.value === queryValue('sort_direction')) ? queryValue('sort_direction') : 'asc'
}

function buildRouteQuery() {
  return {
    salary_month:   salaryMonth.value,
    payroll_cycle:  payrollCycle.value || 'regular',
    sort_by:        sortBy.value || 'department',
    sort_direction: sortDirection.value || 'asc',
    line_type:      filterLineType.value || 'executive',
    ...(filterBankId.value ? { bank_account_id: filterBankId.value } : {}),
    ...(filterUnitId.value ? { unit_id: filterUnitId.value } : {}),
    ...(filterBranchName.value ? { branch_name: filterBranchName.value } : {}),
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toArray  = (d) => Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []
const getUnit   = (r) => r.unit_name || r.unit?.name || r.department_name || ''
const getBranch = (r) => r.bank_account?.branch_name || ''
const getAccountHolderName = (r) => r.account_name || r.employee_name || ''
const displayBranchName = (branch) => String(branch || '').trim().replace(/\s+Branch$/i, '')
const fmtMoney = (v) => {
  const n = Number(v)
  return Number.isFinite(n)
    ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
    : '—'
}
const fmtMonthLabel = (v) => {
  if (!v) return '—'
  const [y, m] = v.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1))
}

// ─── Stats ────────────────────────────────────────────────────────────────────
const grandTotal  = computed(() => rows.value.reduce((s, r) => s + Number(r.payable_amount || 0), 0))
const uniqueBanks = computed(() => [...new Set(rows.value.map(r => r.payable_account).filter(Boolean))])
const uniqueUnits = computed(() => [...new Set(rows.value.map(r => getUnit(r)).filter(Boolean))])
const hasUnits    = computed(() => uniqueUnits.value.length > 0)

// ─── Export column definitions ───────────────────────────────────────────────
const EXPORT_COLS = [
  { key: 'sl',              label: 'SL',           locked: true  },
  { key: 'employee_name',   label: 'Account Holder Name', locked: true  },
  { key: 'employee_code',   label: 'Employee ID',  locked: false },
  { key: 'payable_account', label: 'Bank Name',    locked: false },
  { key: 'branch',          label: 'Branch',       locked: false },
  { key: 'unit',            label: 'Unit',         locked: false },
  { key: 'account_name',    label: 'A/C Name',     locked: false },
  { key: 'account_number',  label: 'A/C Number',   locked: false },
  { key: 'payable_amount',  label: 'Amount (BDT)', locked: false },
]
const colVis = reactive(
  Object.fromEntries(
    EXPORT_COLS.map(c => [c.key, c.key !== 'account_name'])
  )
)
const activeCols = computed(() => EXPORT_COLS.filter(c => colVis[c.key]))
const showColConfig = ref(false)

function exportCellValue(col, row, idx) {
  switch (col.key) {
    case 'sl':              return idx + 1
    case 'employee_name':   return getAccountHolderName(row) || '—'
    case 'employee_code':   return row.employee_code   || '—'
    case 'payable_account': return row.payable_account || '—'
    case 'branch':          return getBranch(row)      || '—'
    case 'unit':            return getUnit(row)        || '—'
    case 'account_name':    return row.account_name    || '—'
    case 'account_number':  return row.account_number  || '—'
    case 'payable_amount':  return Number(row.payable_amount) || 0
    default:                return '—'
  }
}

// ─── Letter data ──────────────────────────────────────────────────────────────
const letterRows = computed(() =>
  rows.value.map(r => ({
    name:       getAccountHolderName(r) || '—',
    employeeId: r.employee_code  || '—',
    accountNo:  r.account_number || '—',
    amount:     r.payable_amount ?? '',
    unit:       getUnit(r) || '—',
    branch:     getBranch(r) || '—',
  }))
)

// ─── API ──────────────────────────────────────────────────────────────────────
async function fetchAllPages(url, params = {}) {
  const items = []
  let page = 1, last = 1
  do {
    const { data } = await apiClient.get(url, { params: { ...params, page, per_page: 200 } })
    items.push(...toArray(data))
    last = data?.meta?.last_page ?? 1
    page++
  } while (page <= last)
  return items
}

function buildParams() {
  const p = {
    salary_month:   salaryMonth.value,
    payroll_cycle:  payrollCycle.value || 'regular',
    sort_by:        sortBy.value || 'department',
    sort_direction: sortDirection.value || 'asc',
    line_type:      filterLineType.value || 'executive',
  }
  if (filterBankId.value) p.bank_account_id = filterBankId.value
  if (filterUnitId.value) p.unit_id         = filterUnitId.value
  if (filterBranchName.value) p.branch_name = filterBranchName.value
  return p
}

async function load() {
  error.value = ''
  if (!salaryMonth.value) { error.value = 'Please select a month.'; return }
  await router.replace({ query: buildRouteQuery() })
  loading.value = true
  try {
    rows.value = await fetchAllPages('/payroll-bank-advisers', buildParams())
  } catch (e) {
    error.value = e.message || 'Failed to load data.'
    rows.value = []
  } finally {
    loading.value = false
  }
}

// ─── Filter label helpers for export headers ──────────────────────────────────
function filterLines() {
  const lines = [
    `Month        : ${fmtMonthLabel(salaryMonth.value)}`,
    `Payroll Type : ${selectedPayrollCycle.value.label}`,
    `Employee Type: ${selectedLineType.value.label}`,
    `Sort         : ${selectedSort.value.label} (${selectedSortDirection.value.label})`,
  ]
  if (selectedBank.value) lines.push(`Bank  : ${selectedBank.value.bank_name}`)
  if (selectedBranch.value) lines.push(`Branch: ${displayBranchName(selectedBranch.value)}`)
  if (selectedUnit.value) lines.push(`Unit  : ${selectedUnit.value.short_name || selectedUnit.value.name}`)
  return lines
}

function downloadPDF() {
  if (!rows.value.length) return
  const cols    = activeCols.value
  const portrait = cols.length <= 6
  const doc     = new jsPDF({ orientation: portrait ? 'portrait' : 'landscape', unit: 'pt', format: 'A4' })
  const pw      = doc.internal.pageSize.width
  const ml      = 40

  const head = [cols.map(c => c.label)]
  const body = rows.value.map((r, i) => cols.map(c => {
    const v = exportCellValue(c, r, i)
    return c.key === 'payable_amount' ? fmtMoney(v) : String(v)
  }))

  const amtIdx  = cols.findIndex(c => c.key === 'payable_amount')
  const footRow = cols.map((_, i) => {
    if (i === 0)       return 'Total'
    if (i === amtIdx)  return fmtMoney(grandTotal.value)
    return ''
  })

  autoTable(doc, {
    head,
    body,
    foot: amtIdx !== -1 ? [footRow] : undefined,
    styles:             { fontSize: 8, cellPadding: 4 },
    headStyles:         { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    footStyles:         { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles:       amtIdx !== -1 ? { [amtIdx]: { halign: 'right' } } : {},
    margin: { top: 72 },
    didDrawPage(data) {
      // Title
      doc.setFontSize(11); doc.setTextColor(15, 23, 42)
      doc.text('Bank Advise', ml, 22)
      // Filter info
      doc.setFontSize(7.5); doc.setTextColor(80, 80, 80)
      filterLines().forEach((line, i) => doc.text(line, ml, 34 + i * 11))
      // Date top-right
      doc.setFontSize(7.5); doc.setTextColor(120)
      doc.text(new Date().toLocaleDateString(), pw - ml - 60, 22)
    },
  })

  doc.save(`bank-advise-${salaryMonth.value}.pdf`)
}

function downloadExcel() {
  if (!rows.value.length) return
  const cols    = activeCols.value
  const fLines  = filterLines()

  // Info rows at top
  const infoRows = [
    ['Bank Advise'],
    ...fLines.map(l => [l]),
    [],                              // blank separator
    cols.map(c => c.label),          // header row
  ]
  const body = rows.value.map((r, i) => cols.map(c => exportCellValue(c, r, i)))
  const amtIdx = cols.findIndex(c => c.key === 'payable_amount')
  const totalRow = cols.map((_, i) => i === 0 ? 'Total' : i === amtIdx ? grandTotal.value : '')

  const ws = XLSX.utils.aoa_to_sheet([
    ...infoRows,
    ...body,
    ...(amtIdx !== -1 ? [totalRow] : []),
  ])

  // Bold title cell
  const titleCell = ws['A1']
  if (titleCell) titleCell.s = { font: { bold: true, sz: 13 } }

  // Column widths (based on data rows only)
  ws['!cols'] = cols.map((c, ci) => ({
    wch: Math.max(c.label.length, ...body.map(row => String(row[ci] ?? '').length), 10),
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Bank Advise')
  XLSX.writeFile(wb, `bank-advise-${salaryMonth.value}.xlsx`)
}

function clearFilters() {
  filterBankId.value   = ''
  filterUnitId.value   = ''
  filterBranchName.value = ''
  filterLineType.value = 'executive'
  payrollCycle.value   = 'regular'
  sortBy.value         = 'department'
  sortDirection.value  = 'asc'
}

onMounted(async () => {
  applyQueryFilters()
  await Promise.all([
    bankAccStore.fetchCompanyBankAccounts(),
    unitStore.fetchUnits(),
    load(),
  ])
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-slate-50">

    <!-- ══ TOOLBAR ══════════════════════════════════════════════════════════════ -->
    <div class="sticky top-0 z-20 border-b border-slate-200 rounded-md shadow-sm print:hidden">

      <!-- Row 1: title + actions -->
      <div class="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
        <div class="flex items-center gap-3">
          <button
            class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            @click="router.push({ name: 'PayrollList' })"
          >
            <i class="far fa-arrow-left text-xs"></i>
          </button>
          <div>
            <div class="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-500">Payroll</div>
            <h1 class="text-base font-bold leading-tight text-slate-900">Bank Advise</h1>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Column toggle -->
          <button
            class="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition"
            :class="showColConfig
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
            @click="showColConfig = !showColConfig"
          >
            <i class="far fa-columns text-[11px]"></i>
            Columns
            <i class="fas text-[8px]" :class="showColConfig ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
          </button>
          <button
            class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-40"
            :disabled="loading || !rows.length"
            @click="downloadExcel"
          >
            <i class="far fa-file-excel text-emerald-500"></i>
            Excel
          </button>
          <button
            class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-40"
            :disabled="loading || !rows.length"
            @click="downloadPDF"
          >
            <i class="far fa-file-pdf text-rose-500"></i>
            PDF
          </button>
          <button
            class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-100 disabled:opacity-40"
            :disabled="!rows.length"
            @click="showLetter = true"
          >
            <i class="far fa-file-alt"></i>
            Print Letter
          </button>
        </div>
      </div>

      <!-- Row 2: filters inline -->
      <div class="flex flex-wrap items-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-2">

        <!-- Month -->
        <div class="shrink-0">
          <FlexibleDatePicker
            v-model="monthPeriod"
            :show-year="false"
            :show-month="true"
            :show-date="false"
            label="Month"
          />
        </div>

        <!-- Payroll Type -->
        <div class="min-w-[190px] flex-1 max-w-xs">
          <label class="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Payroll Type
          </label>
          <div class="relative">
            <select
              v-model="payrollCycle"
              class="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-7 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              :class="payrollCycle !== 'regular' ? 'border-blue-300 bg-blue-50/30 font-semibold text-blue-800' : ''"
            >
              <option v-for="option in payrollCycleOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <i class="fas fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] text-slate-400"></i>
          </div>
        </div>

        <!-- Bank Account -->
        <div class="min-w-[180px] flex-1 max-w-xs">
          <label class="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Bank Name
          </label>
          <div class="relative">
            <select
              v-model="filterBankId"
              class="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-7 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              :class="filterBankId ? 'border-amber-300 bg-amber-50/30 font-semibold text-amber-800' : ''"
            >
              <option value="">All Accounts</option>
              <option v-for="b in bankAccounts" :key="b.id" :value="String(b.id)">
                {{ b.bank_name }}
                <template v-if="b.account_name"> · {{ b.account_name }}</template>
              </option>
            </select>
            <i class="fas fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] text-slate-400"></i>
          </div>
        </div>

        <!-- Bank Branch -->
        <div class="min-w-[170px] flex-1 max-w-xs">
          <label class="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Bank Branch
          </label>
          <div class="relative">
            <select
              v-model="filterBranchName"
              class="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-7 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              :class="filterBranchName ? 'border-amber-300 bg-amber-50/30 font-semibold text-amber-800' : ''"
            >
              <option value="">All Branches</option>
              <option v-for="b in branchOptions" :key="b" :value="b">{{ displayBranchName(b) }}</option>
            </select>
            <i class="fas fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] text-slate-400"></i>
          </div>
        </div>

        <!-- Unit -->
        <div class="min-w-[160px] flex-1 max-w-xs">
          <label class="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Unit
          </label>
          <div class="relative">
            <select
              v-model="filterUnitId"
              class="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-7 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              :class="filterUnitId ? 'border-indigo-300 bg-indigo-50/30 font-semibold text-indigo-800' : ''"
            >
              <option value="">All Units</option>
              <option v-for="u in units" :key="u.id" :value="String(u.id)">
                {{ u.short_name || u.name }}
              </option>
            </select>
            <i class="fas fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] text-slate-400"></i>
          </div>
        </div>

        <!-- Employee Type -->
        <div class="min-w-[150px] flex-1 max-w-xs">
          <label class="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Employee Type
          </label>
          <div class="relative">
            <select
              v-model="filterLineType"
              class="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-7 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              :class="filterLineType !== 'all' ? 'border-teal-300 bg-teal-50/30 font-semibold text-teal-800' : ''"
            >
              <option v-for="o in lineTypeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
            <i class="fas fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] text-slate-400"></i>
          </div>
        </div>

        <!-- Sort By -->
        <div class="min-w-[170px] flex-1 max-w-xs">
          <label class="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Sort By
          </label>
          <div class="relative">
            <select
              v-model="sortBy"
              class="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-7 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <i class="fas fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] text-slate-400"></i>
          </div>
        </div>

        <!-- Sort Direction -->
        <div class="w-[104px] shrink-0">
          <label class="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Direction
          </label>
          <div class="relative">
            <select
              v-model="sortDirection"
              class="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-7 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option v-for="option in sortDirectionOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <i class="fas fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] text-slate-400"></i>
          </div>
        </div>

        <!-- Load -->
        <button
          class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          :disabled="loading"
          @click="load"
        >
          <i class="far text-xs" :class="loading ? 'fa-spinner fa-spin' : 'fa-search'"></i>
          Load
        </button>

        <!-- Clear (only when filters are active) -->
        <button
          v-if="filterBankId || filterUnitId || filterBranchName || filterLineType !== 'executive' || payrollCycle !== 'regular' || sortBy !== 'department' || sortDirection !== 'asc'"
          class="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 hover:bg-slate-50"
          @click="clearFilters"
        >
          <i class="far fa-times text-[10px]"></i>
          Clear
        </button>
      </div>

      <!-- Row 3: column toggles (expandable) -->
      <div v-if="showColConfig" class="flex flex-wrap items-center gap-2 border-t border-indigo-100 bg-indigo-50/50 px-5 py-2.5">
        <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mr-1">
          <i class="far fa-columns mr-1"></i>Export Columns
        </span>
        <button
          v-for="col in EXPORT_COLS"
          :key="col.key"
          type="button"
          class="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition"
          :class="colVis[col.key]
            ? 'border-indigo-300 bg-indigo-100 text-indigo-700'
            : 'border-slate-200 bg-white text-slate-400 hover:border-indigo-200 hover:text-slate-600'"
          :disabled="col.locked"
          :title="col.locked ? 'Always included' : ''"
          @click="!col.locked && (colVis[col.key] = !colVis[col.key])"
        >
          <i
            class="text-[8px]"
            :class="colVis[col.key] ? 'fas fa-check text-indigo-500' : 'fas fa-times text-slate-300'"
          ></i>
          {{ col.label }}
          <span v-if="col.locked" class="ml-0.5 text-[8px] text-indigo-400">●</span>
        </button>
        <span class="ml-2 text-[10px] text-indigo-400">
          {{ activeCols.length }} columns selected · applies to Excel &amp; PDF
        </span>
      </div>
    </div>

    <!-- ══ CONTENT ══════════════════════════════════════════════════════════════ -->
    <div class="flex-1 p-4 md:p-5">

      <!-- Error -->
      <div v-if="error" class="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
        <i class="far fa-exclamation-circle"></i> {{ error }}
      </div>

      <!-- Loader -->
      <LoaderView v-if="loading" />

      <!-- Empty state -->
      <div
        v-else-if="!rows.length"
        class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center shadow-sm"
      >
        <span class="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <i class="far fa-university text-2xl"></i>
        </span>
        <p class="text-sm font-semibold text-slate-600">No data found</p>
        <p class="mt-1 text-xs text-slate-400">Select filters and click Load.</p>
        <button class="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700" @click="load">
          <i class="far fa-search"></i> Load Data
        </button>
      </div>

      <!-- Data card -->
      <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <!-- Card header: inline stats + actions -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5">

          <!-- Stats chips -->
          <div class="flex flex-wrap items-center gap-3 text-xs">
            <span class="flex items-center gap-1.5 font-semibold text-slate-700">
              <i class="far fa-users text-blue-400"></i>
              {{ rows.length.toLocaleString() }}
              <span class="font-normal text-slate-400">employees</span>
            </span>
            <span class="text-slate-200">|</span>
            <span class="flex items-center gap-1.5 font-semibold text-slate-700">
              <i class="far fa-university text-amber-400"></i>
              {{ uniqueBanks.length }}
              <span class="font-normal text-slate-400">{{ uniqueBanks.length === 1 ? 'bank' : 'banks' }}</span>
            </span>
            <template v-if="hasUnits">
              <span class="text-slate-200">|</span>
              <span class="flex items-center gap-1.5 font-semibold text-slate-700">
                <i class="far fa-sitemap text-indigo-400"></i>
                {{ uniqueUnits.length }}
                <span class="font-normal text-slate-400">units</span>
              </span>
            </template>
            <span class="text-slate-200">|</span>
            <span class="flex items-center gap-1.5">
              <i class="far fa-money-bill-wave text-emerald-500"></i>
              <span class="font-extrabold text-emerald-700">{{ fmtMoney(grandTotal) }}</span>
              <span class="font-normal text-slate-400">BDT</span>
            </span>
          </div>

          <!-- Right: row count + print -->
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600">
              {{ rows.length }} rows
            </span>
            <span class="text-[11px] text-slate-400">{{ fmtMonthLabel(salaryMonth) }} · {{ selectedPayrollCycle.label }}</span>
            <span class="text-[11px] text-slate-400">Sort: {{ selectedSort.label }} {{ selectedSortDirection.label }}</span>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              @click="showLetter = true"
            >
              <i class="far fa-file-alt text-[11px]"></i>
              Print Letter
            </button>
          </div>
        </div>

        <!-- Active filter tags -->
        <div v-if="selectedPayrollCycle || selectedBank || selectedUnit" class="flex flex-wrap gap-1.5 border-b border-slate-100 px-5 py-2">
          <span
            class="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700"
          >
            <i class="far fa-calendar-check text-[9px]"></i>
            {{ selectedPayrollCycle.label }}
          </span>
          <span
            class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600"
          >
            <i class="far fa-sort-amount-down text-[9px]"></i>
            {{ selectedSort.label }} {{ selectedSortDirection.label }}
          </span>
          <span
            class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
            :class="filterLineType === 'all' ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-teal-200 bg-teal-50 text-teal-700'"
          >
            <i class="far fa-user-tag text-[9px]"></i>
            {{ selectedLineType.label }}
          </span>
          <span
            v-if="selectedBank"
            class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700"
          >
            <i class="far fa-university text-[9px]"></i>
            {{ selectedBank.bank_name }}
          </span>
          <span
            v-if="selectedBranch"
            class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700"
          >
            <i class="far fa-map-marker-alt text-[9px]"></i>
            {{ displayBranchName(selectedBranch) }}
          </span>
          <span
            v-if="selectedUnit"
            class="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700"
          >
            <i class="far fa-sitemap text-[9px]"></i>
            {{ selectedUnit.short_name || selectedUnit.name }}
          </span>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto [scrollbar-width:thin]">
          <table class="min-w-[760px] w-full border-collapse text-xs">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th class="w-9 px-3 py-2.5 text-center">#</th>
                <th class="px-4 py-2.5 text-left">Account Holder</th>
                <th class="px-3 py-2.5 text-left">ID</th>
                <th class="px-3 py-2.5 text-left">Bank Name</th>
                <th class="px-3 py-2.5 text-left">Branch</th>
                <th v-if="hasUnits" class="px-3 py-2.5 text-left">Unit</th>
                <th class="px-3 py-2.5 text-left">A/C Number</th>
                <th class="px-3 py-2.5 text-right">Amount (BDT)</th>
                <th class="px-3 py-2.5 text-center">Slip</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="(p, idx) in rows"
                :key="p.id"
                class="group transition-colors hover:bg-blue-50/40"
                :class="idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'"
              >
                <td class="px-3 py-2 text-center text-slate-300 group-hover:text-slate-400">{{ idx + 1 }}</td>
                <td class="px-4 py-2 font-semibold text-slate-900">{{ getAccountHolderName(p) || '—' }}</td>
                <td class="px-3 py-2">
                  <span class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600 transition group-hover:bg-blue-100 group-hover:text-blue-700">
                    {{ p.employee_code || '—' }}
                  </span>
                </td>
                <td class="px-3 py-2">
                  <span class="inline-flex items-center gap-1 rounded-md border border-amber-100 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    <i class="far fa-university text-[9px]"></i>
                    {{ p.payable_account || '—' }}
                  </span>
                </td>
                <td class="px-3 py-2 text-slate-600">{{ getBranch(p) || '—' }}</td>
                <td v-if="hasUnits" class="px-3 py-2 text-slate-600">{{ getUnit(p) || '—' }}</td>
                <td class="px-3 py-2 font-mono text-slate-600">{{ p.account_number || '—' }}</td>
                <td class="px-3 py-2 text-right font-mono font-semibold text-slate-800">{{ fmtMoney(p.payable_amount) }}</td>
                <td class="px-3 py-2 text-center">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                    @click="router.push({ name: 'PayrollSlipShow', params: { id: p.id } })"
                  >
                    <i class="far fa-receipt text-[9px]"></i>
                    Slip
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t-2 border-slate-200 bg-slate-50">
                <td :colspan="hasUnits ? 7 : 6" class="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total
                </td>
                <td class="px-3 py-2.5 text-right font-mono text-sm font-extrabold text-emerald-700">
                  {{ fmtMoney(grandTotal) }}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <!-- Letter modal -->
    <SalaryTransferLetterModal
      :show="showLetter"
      :bank-account="selectedBank"
      :employee-rows="letterRows"
      :salary-month="salaryMonth"
      @close="showLetter = false"
    />
  </div>
</template>
