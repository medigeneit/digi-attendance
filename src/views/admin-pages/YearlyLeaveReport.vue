<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import LoaderView from '@/components/common/LoaderView.vue'

import { useLeaveReportStore } from '@/stores/leaveReport'
import { storeToRefs } from 'pinia'
import Swal from 'sweetalert2'
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const router = useRouter()
const route = useRoute()

const leaveStore = useLeaveReportStore()
const {
  isLoading,
  error,
  selectedYear: storeYear,
  pagination,
  companyReports,
  filters: storeFilters, // ✅ backend fallback flags (optional)
} = storeToRefs(leaveStore)

/* -------------------- helpers -------------------- */
const currentYear = new Date().getFullYear()
const safe = (v, fallback = '—') => (v === null || v === undefined || v === '' ? fallback : v)
const safeNum = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const parseYear = (val) => {
  const y = Number(val)
  if (!y || y < 2000 || y > 2100) return String(currentYear)
  return String(y)
}

const selectedYear = ref(parseYear(route.query.year || storeYear.value))
const period = ref({ year: Number(selectedYear.value) })

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '', // -> user_id param
})

const includePending = ref(route.query.include_pending ? route.query.include_pending === '1' : true)
const perPage = ref(Number(route.query.per_page || 25))
const page = ref(Number(route.query.page || 1))

const canFetch = computed(() => !!filters.value.company_id && !!selectedYear.value)

/** ✅ Tabs: Part 1 / Part 2 */
const activePart = ref(route.query.part === 'part2' ? 'part2' : 'part1')

const showMissing = () => {
  Swal.fire({
    icon: 'warning',
    title: 'Missing Selection!',
    text: 'Please select Company and Year first!',
    confirmButtonText: 'OK',
  })
}

/* -------------------- route sync -------------------- */
const syncRouteQuery = () => {
  router.replace({
    query: {
      ...route.query,
      company_id: filters.value.company_id || '',
      department_id: filters.value.department_id || 'all',
      line_type: filters.value.line_type || 'all',
      employee_id: filters.value.employee_id || '',
      year: selectedYear.value,
      include_pending: includePending.value ? '1' : '0',
      per_page: String(perPage.value),
      page: String(page.value),
      part: activePart.value, // ✅ keep tab in URL
    },
  })
}

const buildParams = () => {
  const params = {
    company_id: filters.value.company_id,
    department_id: filters.value.department_id,
    line_type: filters.value.line_type,
    year: Number(selectedYear.value),
    include_pending: includePending.value ? 1 : 0,
    per_page: perPage.value,
    page: page.value,
  }
  if (filters.value.employee_id) params.user_id = filters.value.employee_id
  return params
}

const fetchReport = async () => {
  if (!canFetch.value) return
  await leaveStore.fetchYearlyLeaveReport(buildParams())
}

const handleFilterChange = async () => {
  page.value = 1
  syncRouteQuery()
  await fetchReport()
}

/* -------------------- watchers -------------------- */
watch(
  period,
  (v) => {
    if (!v?.year) return
    const y = parseYear(v.year)
    if (selectedYear.value !== y) selectedYear.value = y
  },
  { deep: true }
)

watch(
  selectedYear,
  async (y) => {
    storeYear.value = y
    page.value = 1
    syncRouteQuery()
    await fetchReport()
  },
  { immediate: true }
)

watch(
  () => [includePending.value, perPage.value, page.value],
  async () => {
    syncRouteQuery()
    await fetchReport()
  }
)

watch(activePart, () => {
  syncRouteQuery()
})

/* -------------------- compact matrix helpers (PART-1) -------------------- */
const monthKeys = computed(() => {
  const y = Number(selectedYear.value || currentYear)
  return Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`)
})

const monthLabel = (ym) => {
  const [, m] = ym.split('-')
  const names = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  return names[Number(m) - 1]
}

// ✅ compact labels (Special Leave must show SL)
const monthSubCols = [
  { key: 'CL', label: 'CL' },
  { key: 'ML', label: 'ML' },
  { key: 'SPECIAL LEAVE', label: 'SL' },
  { key: 'WITHOUT PAY LEAVE(WPL)', label: 'WPL' },
  // { key: 'DAY PAY CUT', label: 'DPC' },
]

const getMonthVal = (row, ym, colKey) => {
  const m = row?.months?.[ym]
  if (!m) return 0
  return safeNum(m?.[colKey] ?? 0)
}

// ✅ cell style: 0 -> dim
const cellClass = (v) =>
  Number(v) === 0 ? 'text-slate-300' : 'text-slate-700 font-semibold'

// ✅ compact "Employee" cell (Name + dept + desig)
const employeeLines = (row) => ({
  name: safe(row?.user?.name, 'Unknown'),
  meta: `${safe(row?.user?.department, '')}${row?.user?.department && row?.user?.designation ? ' • ' : ''}${safe(
    row?.user?.designation,
    ''
  )}`,
})

/* -------------------- PART-2 (Image-2) helpers -------------------- */
const PART2 = {
  CL: 'CL',
  ML: 'ML',
  SL: 'SPECIAL LEAVE',
  WPL: 'WITHOUT PAY LEAVE(WPL)',
  DPC: 'DAY PAY CUT',
}

const PART2_LABEL = (key) => {
  if (key === PART2.SL) return 'SL'
  if (key === PART2.WPL) return 'WPL'
  if (key === PART2.DPC) return 'DPC'
  return key
}

// From balances
const getBalQuota = (row, key) => safeNum(row?.balances?.[key]?.effective_annual_quota)
const getBalUsed = (row, key) => safeNum(row?.balances?.[key]?.used_approved_leave_days)
const getBalRemain = (row, key) => safeNum(row?.balances?.[key]?.remaining)

// DPC handling
const getDpcUsedDays = (row) => safeNum(row?.day_pay_cut_days)
const getDpcTotal = (row) => safeNum(row?.dpc_quota ?? row?.day_pay_cut_total ?? 0)
const getDpcBalance = (row) => safeNum(getDpcTotal(row) - getDpcUsedDays(row))

const part2Total = (row, key) => (key === PART2.DPC ? getDpcTotal(row) : getBalQuota(row, key))
const part2Used = (row, key) => (key === PART2.DPC ? getDpcUsedDays(row) : getBalUsed(row, key))
const part2Balance = (row, key) => (key === PART2.DPC ? getDpcBalance(row) : getBalRemain(row, key))

const part2Groups = computed(() => [
  { title: 'Total', mode: 'total', cols: [PART2.WPL, PART2.SL, PART2.DPC] },
  { title: 'Used', mode: 'used', cols: [PART2.CL, PART2.ML, PART2.SL, PART2.WPL, PART2.DPC] },
  { title: 'Balance', mode: 'balance', cols: [PART2.CL, PART2.ML, PART2.SL, PART2.WPL, PART2.DPC] },
])

const part2Cell = (row, mode, key) => {
  if (mode === 'total') return part2Total(row, key)
  if (mode === 'used') return part2Used(row, key)
  return part2Balance(row, key)
}
const part2CellClass = (v) => (Number(v) === 0 ? 'text-slate-300' : 'text-slate-700 font-semibold')

/* -------------------- Modal: Balance Summary + DPC Year -------------------- */
const summaryOpen = ref(false)
const summaryRow = ref(null)

const balanceTypes = [
  { key: 'CL', label: 'CL' },
  { key: 'ML', label: 'ML' },
  { key: 'SPECIAL LEAVE', label: 'SL' },
  { key: 'WITHOUT PAY LEAVE(WPL)', label: 'WPL' },
]

const getBalance = (row, typeKey, field) => {
  const b = row?.balances?.[typeKey]
  if (!b) return 0
  if (field === 'quota') return safeNum(b.effective_annual_quota ?? 0)
  if (field === 'used') return safeNum(b.used_approved_leave_days ?? 0)
  if (field === 'remaining') return safeNum(b.remaining ?? 0)
  return 0
}

const openSummary = (row) => {
  summaryRow.value = row
  summaryOpen.value = true
  document.documentElement.classList.add('overflow-hidden')
}
const closeSummary = () => {
  summaryOpen.value = false
  summaryRow.value = null
  document.documentElement.classList.remove('overflow-hidden')
}

const onKey = (e) => {
  if (e.key === 'Escape' && summaryOpen.value) closeSummary()
}
window.addEventListener('keydown', onKey)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

/* -------------------- Export helpers -------------------- */
const canExport = computed(() => canFetch.value && (companyReports.value || []).length > 0)

const filenameBase = computed(() => {
  const y = selectedYear.value || String(currentYear)
  return `yearly_leave_report_${safe(filters.value.company_id, 'company')}_${y}_${activePart.value}`
})

const toCsvValue = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** ✅ Export (switch by tab) */
const exportCSV = () => {
  if (!canExport.value) return showMissing()
  if (activePart.value === 'part2') return exportCSVPart2()
  return exportCSVPart1()
}
const downloadPDF = () => {
  if (!canExport.value) return showMissing()
  if (activePart.value === 'part2') return downloadPDFPart2()
  return downloadPDFPart1()
}

/* -------------------- PART-1 export -------------------- */
const exportCSVPart1 = () => {
  const headers = [
    'SL',
    'Employee Name',
    'Department',
    'Designation',
    ...monthKeys.value.flatMap((ym) => monthSubCols.map((c) => `${monthLabel(ym)}_${c.label}`)),
    'Year',
  ]

  const rows = (companyReports.value || []).map((row) => {
    const base = [
      row?.sl ?? '',
      safe(row?.user?.name, 'Unknown'),
      safe(row?.user?.department, ''),
      safe(row?.user?.designation, ''),
    ]
    const monthPart = monthKeys.value.flatMap((ym) => monthSubCols.map((c) => getMonthVal(row, ym, c.key)))
    return [...base, ...monthPart, selectedYear.value].map(toCsvValue)
  })

  const csv = [headers.map(toCsvValue).join(','), ...rows.map((r) => r.join(','))].join('\n')
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filenameBase.value}.csv`)
}

const downloadPDFPart1 = () => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(14)
  doc.text('Yearly Leave Matrix (Part-1)', 40, 40)
  doc.setFontSize(10)
  doc.text(`Year: ${selectedYear.value}`, 40, 60)
  doc.text(`Company ID: ${safe(filters.value.company_id, '')}`, 40, 76)
  doc.text(
    `Department: ${safe(filters.value.department_id, 'all')} • Line Type: ${safe(filters.value.line_type, 'all')}`,
    40,
    92
  )
  if (filters.value.employee_id) {
    doc.text(`User filter: ${safe(filters.value.employee_id, '')}`, pageWidth - 40, 76, { align: 'right' })
  }

  const head = [
    [
      'SL',
      'Employee',
      ...monthKeys.value.flatMap((ym) => monthSubCols.map((c) => `${monthLabel(ym)} ${c.label}`)),
    ],
  ]

  const body = (companyReports.value || []).map((row) => {
    const e = employeeLines(row)
    const base = [row?.sl ?? '', `${e.name}\n${e.meta}`]
    const monthPart = monthKeys.value.flatMap((ym) => monthSubCols.map((c) => getMonthVal(row, ym, c.key)))
    return [...base, ...monthPart]
  })

  autoTable(doc, {
    startY: 110,
    head,
    body,
    styles: { fontSize: 7, cellPadding: 3, valign: 'middle' },
    headStyles: { fillColor: [241, 245, 249] },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 30, right: 30 },
  })

  doc.save(`${filenameBase.value}.pdf`)
}

/* -------------------- PART-2 export -------------------- */
const exportCSVPart2 = () => {
  const cols = part2Groups.value.flatMap((g) => g.cols.map((k) => `${g.title}_${PART2_LABEL(k)}`))
  const headers = ['SL', 'Employee Name', 'Department', 'Designation', ...cols, 'Year']

  const rows = (companyReports.value || []).map((row) => {
    const base = [
      row?.sl ?? '',
      safe(row?.user?.name, 'Unknown'),
      safe(row?.user?.department, ''),
      safe(row?.user?.designation, ''),
    ]
    const data = part2Groups.value.flatMap((g) => g.cols.map((k) => part2Cell(row, g.mode, k)))
    return [...base, ...data, selectedYear.value].map(toCsvValue)
  })

  const csv = [headers.map(toCsvValue).join(','), ...rows.map((r) => r.join(','))].join('\n')
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filenameBase.value}.csv`)
}

const downloadPDFPart2 = () => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(14)
  doc.text('Yearly Leave Report (Part-2: Total / Used / Balance)', 40, 40)
  doc.setFontSize(10)
  doc.text(`Year: ${selectedYear.value}`, 40, 60)
  doc.text(`Company ID: ${safe(filters.value.company_id, '')}`, 40, 76)
  doc.text(
    `Department: ${safe(filters.value.department_id, 'all')} • Line Type: ${safe(filters.value.line_type, 'all')}`,
    40,
    92
  )
  if (filters.value.employee_id) {
    doc.text(`User filter: ${safe(filters.value.employee_id, '')}`, pageWidth - 40, 76, { align: 'right' })
  }

  const head = [
    [
      'SL',
      'Employee',
      ...part2Groups.value.flatMap((g) => g.cols.map((k) => `${g.title} ${PART2_LABEL(k)}`)),
    ],
  ]

  const body = (companyReports.value || []).map((row) => {
    const e = employeeLines(row)
    const base = [row?.sl ?? '', `${e.name}\n${e.meta}`]
    const data = part2Groups.value.flatMap((g) => g.cols.map((k) => part2Cell(row, g.mode, k)))
    return [...base, ...data]
  })

  autoTable(doc, {
    startY: 110,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 4, valign: 'middle' },
    headStyles: { fillColor: [241, 245, 249] },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 30, right: 30 },
  })

  doc.save(`${filenameBase.value}.pdf`)
}

/* -------------------- Modal export (optional) -------------------- */
const exportSummaryCSV = () => {
  const row = summaryRow.value
  if (!row) return

  const headers = ['Leave Type', 'Quota', 'Used', 'Remaining']
  const lines = balanceTypes.map((t) => [
    t.label,
    getBalance(row, t.key, 'quota'),
    getBalance(row, t.key, 'used'),
    getBalance(row, t.key, 'remaining'),
  ])

  lines.push(['DPC (Year)', row?.day_pay_cut_days ?? 0, '', ''])

  const csv = [headers.map(toCsvValue).join(','), ...lines.map((r) => r.map(toCsvValue).join(','))].join('\n')

  const name = safe(row?.user?.name, 'employee').replace(/\s+/g, '_')
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `summary_${name}_${selectedYear.value}.csv`)
}

const downloadSummaryPDF = () => {
  const row = summaryRow.value
  if (!row) return

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  doc.setFontSize(14)
  doc.text('Balance Summary', 40, 45)
  doc.setFontSize(10)
  doc.text(`Year: ${selectedYear.value}`, 40, 65)
  doc.text(`Name: ${safe(row?.user?.name, 'Unknown')}`, 40, 82)
  doc.text(`${safe(row?.user?.department, '')} • ${safe(row?.user?.designation, '')}`, 40, 98)

  const body = balanceTypes.map((t) => [
    t.label,
    getBalance(row, t.key, 'quota'),
    getBalance(row, t.key, 'used'),
    getBalance(row, t.key, 'remaining'),
  ])

  autoTable(doc, {
    startY: 120,
    head: [['Type', 'Quota', 'Used', 'Remaining']],
    body,
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [241, 245, 249] },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 40, right: 40 },
  })

  const y = (doc.lastAutoTable?.finalY || 120) + 18
  doc.setFontSize(11)
  doc.text(`DPC (Year): ${row?.day_pay_cut_days ?? 0}`, 40, y)

  const name = safe(row?.user?.name, 'employee').replace(/\s+/g, '_')
  doc.save(`summary_${name}_${selectedYear.value}.pdf`)
}

/* -------------------- UI actions -------------------- */
const goBack = () => router.go(-1)

const sumField = (row, field) => {
  if (!row) return 0
  return balanceTypes.reduce((acc, t) => acc + Number(getBalance(row, t.key, field) || 0), 0)
}

const summaryTotals = computed(() => {
  const row = summaryRow.value
  return {
    quota: sumField(row, 'quota'),
    used: sumField(row, 'used'),
    remaining: sumField(row, 'remaining'),
    dpc_days: Number(row?.day_pay_cut_days ?? 0),
    dpc_hours: Number(row?.hour_pay_cut ?? 0),
  }
})

/* -------------------- Sticky widths (fix overlap) -------------------- */
const SL_W = 56 // px
const EMP_W = 280 // px (compact but enough)
</script>

<template>
  <!-- ✅ IMPORTANT: min-w-0 prevents sidebar overlap, overflow-x hidden on page, table scroll inside -->
  <div class="w-full min-w-0 space-y-3 px-3 md:px-4">
    <!-- Header (compact) -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden sm:inline ml-2">Back</span>
      </button>

      <div class="min-w-0 flex-1 text-center">
        <h1 class="text-base md:text-lg font-bold text-slate-800 leading-6 truncate">Yearly Leave Report</h1>
        <p class="text-[11px] text-slate-500 truncate">
          Company: {{ safe(filters.company_id, '—') }} • Year: {{ selectedYear }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button type="button" class="btn-3" :disabled="!canExport" title="Export CSV" @click="exportCSV">
          <i class="far fa-file-csv"></i>
          <span class="hidden md:inline ml-2">CSV</span>
        </button>

        <button type="button" class="btn-3" :disabled="!canExport" title="Download PDF" @click="downloadPDF">
          <i class="far fa-file-pdf"></i>
          <span class="hidden md:inline ml-2">PDF</span>
        </button>

        <button v-if="!canFetch" type="button" class="btn-3" title="Missing Selection" @click="showMissing">
          <i class="far fa-circle-exclamation"></i>
        </button>
      </div>
    </div>

    <!-- Filters (compact card) -->
    <div class="rounded-2xl bg-white shadow-sm">
      <div class="p-3">
        <EmployeeFilter
          v-model:company_id="filters.company_id"
          v-model:department_id="filters.department_id"
          v-model:employee_id="filters.employee_id"
          v-model:line_type="filters.line_type"
          :with-type="true"
          :initial-value="$route.query"
          @filter-change="handleFilterChange"
        >
          <FlexibleDatePicker v-model="period" :show-year="true" :show-month="false" :show-date="false" label="Year" />
        </EmployeeFilter>
      </div>

      <!-- Tabs (pill) -->
      <div class="flex flex-wrap gap-2 border-t border-gray-200 px-3 py-2">
        <button
          class="tab-pill"
          :class="activePart === 'part1' ? 'tab-pill--active' : ''"
          @click="activePart = 'part1'"
        >
          Part 1 (Monthly)
        </button>

        <button
          class="tab-pill"
          :class="activePart === 'part2' ? 'tab-pill--active' : ''"
          @click="activePart = 'part2'"
        >
          Part 2 (Total / Used / Balance)
        </button>

            <label
              class="inline-flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-700"
            >
              <input type="checkbox" v-model="includePending" class="accent-slate-700" />
              Include Pending
          </label>

          <div class="flex items-center gap-2">
            <span class="text-[11px] font-semibold text-slate-600">Per Page</span>
            <select v-model="perPage" class="rounded-xl border bg-white px-3 py-2 text-[11px]">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="rounded-2xl border bg-white shadow-sm p-6 text-center">
      <LoaderView />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
      {{ error }}
    </div>

    <!-- Content -->
    <div v-else class="space-y-3">
      <!-- ===================== PART 1 ===================== -->
      <div
        v-if="activePart === 'part1'"
        class="rounded-2xl border bg-white shadow-sm overflow-hidden"
      >
        <!-- title bar -->
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-50 px-4 py-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-slate-800">Yearly Leave Matrix (Part-1)</span>

            <span
              v-if="filters.employee_id"
              class="text-[11px] font-semibold rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 border border-ink"
            >
              User: {{ filters.employee_id }}
            </span>

            <span
              v-if="storeFilters?.fallback_company_only"
              class="text-[11px] rounded-full bg-amber-100 text-amber-700 px-3 py-1 border border-ink"
            >
              Fallback: Company users
            </span>
          </div>

          <span class="text-[11px] text-slate-500">
            Page {{ pagination?.current_page ?? 1 }} / {{ pagination?.last_page ?? 1 }} • Total
            {{ pagination?.total ?? (companyReports?.length || 0) }}
          </span>
        </div>

        <!-- ✅ Table scroll container (fix sidebar overlap + show scrollbar nicely) -->
        <div class="overflow-x-auto max-w-[calc(100vw-18rem)]">
          
          <table
            class="min-w-max w-full text-[11px] text-slate-700"
            :style="{ '--slw': SL_W + 'px', '--empw': EMP_W + 'px' }"
          >
            <thead class="text-[10px] uppercase tracking-wide text-slate-500">
              <tr class="bg-slate-100">
                <th class="sticky-col sticky-col--sl bg-slate-100 px-3 py-2 text-left" rowspan="2">SL</th>

                <th class="sticky-col sticky-col--emp bg-slate-100 px-3 py-2 text-left" rowspan="2">
                  Employee
                </th>

                <th
                  v-for="ym in monthKeys"
                  :key="ym"
                  class="px-2 py-2 text-center border-l border-ink"
                  :colspan="monthSubCols.length"
                >
                  {{ monthLabel(ym) }}
                </th>
              </tr>

              <tr class="bg-slate-100">
                <template v-for="ym in monthKeys" :key="ym + '_sub'">
                  <th
                    v-for="c in monthSubCols"
                    :key="ym + '_' + c.key"
                    class="px-2 py-2 text-center border-l border-b border-t border-ink"
                    :title="c.key"
                  >
                    {{ c.label }}
                  </th>
                </template>
              </tr>
            </thead>

            <tbody class="divide-y divide-ink-soft">
              <tr
                v-for="row in companyReports"
                :key="row?.user?.id"
                class="hover:bg-sky-100 cursor-pointer"
                @click="openSummary(row)"
              >
                <!-- sticky SL -->
                <td class="sticky-col sticky-col--sl px-3 py-2 font-bold">
                  {{ row?.sl ?? '' }}
                </td>

                <!-- sticky Employee -->
                <td class="sticky-col sticky-col--emp  px-3 py-2">
                  <div class="font-semibold text-slate-800 leading-5 truncate max-w-[260px]">
                    {{ employeeLines(row).name }}
                  </div>
                  <div class="text-[10px] text-slate-500 leading-4 line-clamp-2 max-w-[260px]">
                    {{ employeeLines(row).meta }}
                  </div>
                </td>

                <!-- months -->
                <template v-for="ym in monthKeys" :key="row?.user?.id + '_' + ym">
                  <td
                    v-for="c in monthSubCols"
                    :key="row?.user?.id + '_' + ym + '_' + c.key"
                    class="px-2 py-2 text-center border-l border-ink-soft tabular-nums"
                    :class="cellClass(getMonthVal(row, ym, c.key))"
                  >
                    {{ getMonthVal(row, ym, c.key) }}
                  </td>
                </template>
              </tr>

              <tr v-if="!companyReports?.length">
                <td
                  :colspan="2 + monthKeys.length * monthSubCols.length + 1"
                  class="px-4 py-10 text-center text-slate-500"
                >
                  No data found for selected filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="pagination" class="flex items-center justify-between gap-2 border-t border-ink px-4 py-3">
          <p class="text-[11px] text-slate-500">
            Page {{ pagination.current_page }} of {{ pagination.last_page }} • Total {{ pagination.total }}
          </p>

          <div class="flex items-center gap-2">
            <button class="btn-3" :disabled="pagination.current_page <= 1" @click="page = Math.max(1, page - 1)">
              <i class="far fa-chevron-left"></i>
              <span class="hidden sm:inline ml-2">Prev</span>
            </button>

            <button class="btn-3" :disabled="pagination.current_page >= pagination.last_page" @click="page = page + 1">
              <span class="hidden sm:inline mr-2">Next</span>
              <i class="far fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- ===================== PART 2 ===================== -->
      <div v-else class="rounded-2xl border border-ink-strong bg-white shadow-sm overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-ink bg-slate-50 px-4 py-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-slate-800">Yearly Leave Report (Part-2)</span>
            <span class="text-[11px] font-medium text-slate-500">Total / Used / Balance</span>
          </div>

          <span class="text-[11px] text-slate-500">
            Page {{ pagination?.current_page ?? 1 }} / {{ pagination?.last_page ?? 1 }} • Total
            {{ pagination?.total ?? (companyReports?.length || 0) }}
          </span>
        </div>

        <div class="table-scroll">
          <table
            class="min-w-max w-full text-[11px] text-slate-700"
            :style="{ '--slw': SL_W + 'px', '--empw': EMP_W + 'px' }"
          >
            <thead class="text-[10px] uppercase tracking-wide text-slate-500">
              <tr class="bg-slate-100">
                <th class="sticky-col sticky-col--sl bg-slate-100 px-3 py-2 text-left" rowspan="2">SL</th>
                <th class="sticky-col sticky-col--emp bg-slate-100 px-3 py-2 text-left" rowspan="2">Employee</th>

                <th
                  v-for="g in part2Groups"
                  :key="g.title"
                  class="px-2 py-2 text-center border-l border-ink"
                  :colspan="g.cols.length"
                >
                  {{ g.title }}
                </th>
              </tr>

              <tr class="bg-slate-100">
                <template v-for="g in part2Groups" :key="g.title + '_sub'">
                  <th
                    v-for="k in g.cols"
                    :key="g.title + '_' + k"
                    class="px-2 py-2 text-center border-l border-ink"
                    :title="k"
                  >
                    {{ PART2_LABEL(k) }}
                  </th>
                </template>
              </tr>
            </thead>

            <tbody class="divide-y divide-ink-soft">
              <tr v-for="row in companyReports" :key="row?.user?.id" class="hover:bg-sky-100">
                <td class="sticky-col sticky-col--sl px-3 py-2 font-bold">
                  {{ row?.sl ?? '' }}
                </td>

                <td class="sticky-col sticky-col--emp px-3 py-2">
                  <div class="font-semibold text-slate-800 leading-5 truncate max-w-[260px]">
                    {{ employeeLines(row).name }}
                  </div>
                  <div class="text-[10px] text-slate-500 leading-4 line-clamp-2 max-w-[260px]">
                    {{ employeeLines(row).meta }}
                  </div>
                </td>

                <template v-for="g in part2Groups" :key="row?.user?.id + '_' + g.title">
                  <td
                    v-for="k in g.cols"
                    :key="row?.user?.id + '_' + g.title + '_' + k"
                    class="px-2 py-2 text-center border-l border-ink-soft tabular-nums"
                    :class="part2CellClass(part2Cell(row, g.mode, k))"
                  >
                    {{ part2Cell(row, g.mode, k) }}
                  </td>
                </template>
              </tr>

              <tr v-if="!companyReports?.length">
                <td
                  :colspan="2 + part2Groups.reduce((a, g) => a + g.cols.length, 0)"
                  class="px-4 py-10 text-center text-slate-500"
                >
                  No data found for selected filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="pagination" class="flex items-center justify-between gap-2 border-t border-ink px-4 py-3">
          <p class="text-[11px] text-slate-500">
            Page {{ pagination.current_page }} of {{ pagination.last_page }} • Total {{ pagination.total }}
          </p>

          <div class="flex items-center gap-2">
            <button class="btn-3" :disabled="pagination.current_page <= 1" @click="page = Math.max(1, page - 1)">
              <i class="far fa-chevron-left"></i>
              <span class="hidden sm:inline ml-2">Prev</span>
            </button>

            <button class="btn-3" :disabled="pagination.current_page >= pagination.last_page" @click="page = page + 1">
              <span class="hidden sm:inline mr-2">Next</span>
              <i class="far fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ✅ Summary Modal -->
    <div v-if="summaryOpen" class="fixed inset-0 z-[60]">
      <!-- overlay -->
      <div class="absolute inset-0 bg-black/40" @click="closeSummary"></div>

      <!-- modal -->
      <div
        class="absolute left-1/2 top-1/2 w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl overflow-hidden border border-ink-strong"
      >
        <!-- header -->
        <div class="flex items-start justify-between gap-3 border-b border-ink bg-slate-50 px-4 py-3">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-slate-800 truncate">
              {{ safe(summaryRow?.user?.name, 'Employee') }}
            </p>
            <p class="text-xs text-slate-500 truncate">
              {{ safe(summaryRow?.user?.department, '') }} • {{ safe(summaryRow?.user?.designation, '') }} • Year:
              {{ selectedYear }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button class="btn-3" title="Export Summary CSV" @click="exportSummaryCSV">
              <i class="far fa-file-csv"></i>
              <span class="hidden md:inline ml-2">CSV</span>
            </button>
            <button class="btn-3" title="Download Summary PDF" @click="downloadSummaryPDF">
              <i class="far fa-file-pdf"></i>
              <span class="hidden md:inline ml-2">PDF</span>
            </button>
            <button class="btn-3" title="Close" @click="closeSummary">
              <i class="far fa-times"></i>
            </button>
          </div>
        </div>

        <!-- body -->
        <div class="p-4 space-y-4">
          <!-- Total Summary -->
          <div class="rounded-2xl border border-ink-strong bg-white p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold text-slate-700">Total Summary</p>
                <p class="text-[11px] text-slate-500">Sum of all leave types (CL + ML + SL + WPL)</p>
              </div>

              <div class="text-right">
                <p class="text-[11px] text-slate-500">DPC (Year)</p>
                <p class="text-base font-bold text-indigo-700 tabular-nums">
                  {{ summaryTotals.dpc_days }}
                  <span class="text-xs font-semibold text-slate-500">days</span>
                </p>
                <p class="text-[11px] text-slate-500 tabular-nums">
                  {{ summaryTotals.dpc_hours }}
                  <span class="text-[10px]">hours</span>
                </p>
              </div>
            </div>

            <div class="mt-3 grid grid-cols-3 gap-2">
              <div class="rounded-xl bg-slate-50 px-3 py-2">
                <p class="text-[10px] uppercase tracking-wide text-slate-500">Quota</p>
                <p class="text-lg font-bold text-slate-800 tabular-nums">{{ summaryTotals.quota }}</p>
              </div>
              <div class="rounded-xl bg-slate-50 px-3 py-2">
                <p class="text-[10px] uppercase tracking-wide text-slate-500">Used</p>
                <p class="text-lg font-bold text-emerald-700 tabular-nums">{{ summaryTotals.used }}</p>
              </div>
              <div class="rounded-xl bg-slate-50 px-3 py-2">
                <p class="text-[10px] uppercase tracking-wide text-slate-500">Remaining</p>
                <p class="text-lg font-bold text-slate-800 tabular-nums">{{ summaryTotals.remaining }}</p>
              </div>
            </div>
          </div>

          <!-- Balance table -->
          <div class="rounded-2xl border border-ink-strong overflow-hidden">
            <div class="px-4 py-2 bg-slate-50 border-b border-ink text-xs font-semibold text-slate-700">
              Balance Summary (By Type)
            </div>

            <div class="table-scroll">
              <table class="min-w-full text-sm">
                <thead class="text-[11px] uppercase tracking-wide text-slate-500 bg-slate-100">
                  <tr>
                    <th class="px-4 py-2 text-left">Type</th>
                    <th class="px-4 py-2 text-right">Quota</th>
                    <th class="px-4 py-2 text-right">Used</th>
                    <th class="px-4 py-2 text-right">Remaining</th>
                  </tr>
                </thead>

                <tbody class="divide-y divide-ink-soft">
                  <tr v-for="t in balanceTypes" :key="t.key">
                    <td class="px-4 py-2 font-semibold text-slate-800">{{ t.label }}</td>
                    <td class="px-4 py-2 text-right tabular-nums">{{ getBalance(summaryRow, t.key, 'quota') }}</td>
                    <td class="px-4 py-2 text-right tabular-nums">{{ getBalance(summaryRow, t.key, 'used') }}</td>
                    <td class="px-4 py-2 text-right font-semibold tabular-nums">
                      {{ getBalance(summaryRow, t.key, 'remaining') }}
                    </td>
                  </tr>

                  <tr class="bg-slate-50 border-t border-ink-soft">
                    <td class="px-4 py-2 font-bold text-slate-800">Total</td>
                    <td class="px-4 py-2 text-right font-bold tabular-nums">{{ summaryTotals.quota }}</td>
                    <td class="px-4 py-2 text-right font-bold tabular-nums text-emerald-700">{{ summaryTotals.used }}</td>
                    <td class="px-4 py-2 text-right font-bold tabular-nums">{{ summaryTotals.remaining }}</td>
                  </tr>

                  <tr v-if="!summaryRow?.balances || Object.keys(summaryRow?.balances || {}).length === 0">
                    <td colspan="4" class="px-4 py-6 text-center text-slate-500">No balance data</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ✅ smooth horizontal scroll + visible scrollbar */
.table-scroll{
  display:block;
  width:100%;
  max-width:100%;
  min-width:0;

  overflow-x:auto;
  overflow-y:hidden;
  -webkit-overflow-scrolling:touch;
  overscroll-behavior-x:contain;

  scrollbar-gutter: stable both-edges; /* modern browsers */
}

.table-scroll::-webkit-scrollbar {
  height: 10px;
}
.table-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e1; /* slate-300 */
  border-radius: 999px;
}
.table-scroll::-webkit-scrollbar-track {
  background: #f1f5f9; /* slate-100 */
  border-radius: 999px;
}

.border-ink-strong {
  border-color: #0f172a; /* slate-900 */
}
.border-ink {
  border-color: #575f69; /* slate-800 */
}
.border-ink-soft {
  border-color: #334155; /* slate-700 */
}
.divide-ink-soft > :not([hidden]) ~ :not([hidden]) {
  border-top-width: 1px;
  border-color: #334155; /* slate-700 */
}

/* ✅ Sticky columns without overlap (uses CSS vars from table style) */
.sticky-col {
  position: sticky;
  z-index: 10;
  white-space: nowrap;
}

/* SL */
.sticky-col--sl {
  left: 0;
  width: var(--slw);
  min-width: var(--slw);
  max-width: var(--slw);
}

/* Employee */
.sticky-col--emp {
  left: var(--slw);
  width: var(--empw);
  min-width: var(--empw);
  max-width: var(--empw);
}

/* subtle divider shadow so sticky area looks separated */
.sticky-col--emp,
.sticky-col--sl {
  box-shadow: 1px 0 0 rgba(30, 41, 59, 0.7); /* slate-800 */
}

/* compact tab pills */
.tab-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  border: 1px solid #1f2937;
  background: #fff;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
}
.tab-pill--active {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}
</style>
