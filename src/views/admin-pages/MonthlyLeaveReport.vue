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
const { isLoading, error, selectedYear: storeYear, pagination, companyReports, filters: storeFilters } =
  storeToRefs(leaveStore)

/* -------------------- helpers -------------------- */
const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth() + 1

const safe = (v, fallback = '—') => (v === null || v === undefined || v === '' ? fallback : v)

const parseYear = (val) => {
  const y = Number(val)
  if (!y || y < 2000 || y > 2100) return String(currentYear)
  return String(y)
}

const parseMonth = (val) => {
  const m = Number(val)
  if (!m || m < 1 || m > 12) return currentMonth
  return m
}

const selectedYear = ref(parseYear(route.query.year || storeYear.value))
const selectedMonth = ref(parseMonth(route.query.month || currentMonth))

const period = ref({ year: Number(selectedYear.value) })

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '', // -> user_id
})

const strictUser = ref(route.query.strict_user ? route.query.strict_user === '1' : false)
const perPage = ref(Number(route.query.per_page || 25))
const page = ref(Number(route.query.page || 1))

const canFetch = computed(() => !!filters.value.company_id && !!selectedYear.value && !!selectedMonth.value)

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const monthShort = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const activeMonthLabel = computed(() => monthNames[selectedMonth.value - 1] || '—')

const showMissing = () => {
  Swal.fire({
    icon: 'warning',
    title: 'Missing Selection!',
    text: 'Please select Company, Year and Month first!',
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
      month: String(selectedMonth.value),
      strict_user: strictUser.value ? '1' : '0',
      per_page: String(perPage.value),
      page: String(page.value),
    },
  })
}

const buildParams = () => {
  const params = {
    company_id: filters.value.company_id,
    department_id: filters.value.department_id,
    line_type: filters.value.line_type,
    year: Number(selectedYear.value),
    month: Number(selectedMonth.value),
    strict_user: strictUser.value ? 1 : 0,
    per_page: perPage.value,
    page: page.value,
  }
  if (filters.value.employee_id) params.user_id = filters.value.employee_id
  return params
}

/* -------------------- days handling -------------------- */
// store doesn't keep days[], keep local
const days = ref([])

const fetchReportWithDays = async () => {
  if (!canFetch.value) return
  const data = await leaveStore.fetchMonthlyLeaveReport(buildParams())
  days.value = Array.isArray(data?.days) ? data.days : []
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
    await fetchReportWithDays()
  },
  { immediate: true }
)

watch(
  selectedMonth,
  async () => {
    page.value = 1
    syncRouteQuery()
    await fetchReportWithDays()
  },
  { immediate: true }
)

watch(
  () => [strictUser.value, perPage.value, page.value],
  async () => {
    syncRouteQuery()
    await fetchReportWithDays()
  }
)

watch(
  () => [filters.value.company_id, filters.value.department_id, filters.value.line_type, filters.value.employee_id],
  async () => {
    page.value = 1
    syncRouteQuery()
    await fetchReportWithDays()
  }
)

/* -------------------- table helpers -------------------- */
const compactDate = (labelOrIso) => {
  if (!labelOrIso) return ''
  const s = String(labelOrIso)
  if (s.includes('/')) {
    const [dd, mm] = s.split('/')
    return `${dd}/${mm}`
  }
  if (s.includes('-')) {
    const [, mm, dd] = s.split('-')
    return `${dd}/${mm}`
  }
  return s
}

const employeeLines = (row) => ({
  name: safe(row?.user?.name, 'Unknown'),
  meta: `${safe(row?.user?.department, '')}${row?.user?.department && row?.user?.designation ? ' • ' : ''}${safe(
    row?.user?.designation,
    ''
  )}`,
})

// ✅ short labels for display/export
const normalizeCell = (v) => {
  const x = String(v ?? '0').trim()
  const up = x.toUpperCase()
  if (up === 'WEEKEND') return 'WK'
  if (up === 'HOLIDAY') return 'HD'
  return x === '' ? '0' : x
}

const cellValue = (row, d) => {
  const iso = d?.date
  return normalizeCell(row?.cells?.[iso] ?? '0')
}

// ✅ detect leave status like CL(A) / CL(P) / CL(R)
const parseLeaveStatus = (val) => {
  const x = String(val ?? '').trim().toUpperCase()
  const m = x.match(/^([A-Z]+)\((A|P|R)\)$/) // e.g. CL(A)
  if (!m) return null
  return { type: m[1], status: m[2] } // A/P/R
}

// ✅ badge class (bg + text)
const cellBadgeClass = (v) => {
  const x = String(v || '0').trim().toUpperCase()

  if (x === '0') return 'badge badge--zero'
  if (x === 'WK') return 'badge badge--wk'
  if (x === 'HD') return 'badge badge--hd'

  const parsed = parseLeaveStatus(x)
  if (parsed) {
    if (parsed.status === 'A') return 'badge badge--appr'
    if (parsed.status === 'P') return 'badge badge--pend'
    if (parsed.status === 'R') return 'badge badge--rej'
    return 'badge badge--lv'
  }

  // fallback if backend sends without suffix
  if (['CL', 'ML', 'SL', 'WPL'].includes(x)) return 'badge badge--lv'

  return 'badge badge--lv'
}

const cellTdClass = (v) => {
  const x = String(v || '0').trim().toUpperCase()
  if (x === '0') return 'text-slate-300'
  return 'text-slate-800 font-semibold'
}

/* -------------------- month selector -------------------- */
const setMonth = (m) => {
  selectedMonth.value = m
}

/* -------------------- Export (Monthly) -------------------- */
const canExport = computed(
  () => canFetch.value && (companyReports.value || []).length > 0 && (days.value || []).length > 0
)

const filenameBase = computed(() => {
  const y = selectedYear.value || String(currentYear)
  const m = String(selectedMonth.value).padStart(2, '0')
  return `monthly_leave_report_${safe(filters.value.company_id, 'company')}_${y}-${m}`
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

const exportCSV = () => {
  if (!canExport.value) return showMissing()

  const headers = ['SL', 'Employee', ...days.value.map((d) => compactDate(d.label || d.date))]
  const rows = (companyReports.value || []).map((row) => {
    const e = employeeLines(row)
    const base = [row?.sl ?? '', e.name]
    const body = days.value.map((d) => cellValue(row, d))
    return [...base, ...body].map(toCsvValue).join(',')
  })

  const csv = [headers.map(toCsvValue).join(','), ...rows].join('\n')
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filenameBase.value}.csv`)
}

const downloadPDF = () => {
  if (!canExport.value) return showMissing()

  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(14)
  doc.text('Monthly Leave Application Report', 40, 40)
  doc.setFontSize(10)
  doc.text(`Company ID: ${safe(filters.value.company_id, '')}`, 40, 60)
  doc.text(`Month: ${activeMonthLabel.value} • Year: ${selectedYear.value}`, 40, 76)
  doc.text(
    `Department: ${safe(filters.value.department_id, 'all')} • Line Type: ${safe(filters.value.line_type, 'all')}`,
    40,
    92
  )
  if (filters.value.employee_id) {
    doc.text(`User filter: ${safe(filters.value.employee_id, '')}`, pageWidth - 40, 76, { align: 'right' })
  }

  const head = [['SL', 'Employee', ...days.value.map((d) => compactDate(d.label || d.date))]]

  const body = (companyReports.value || []).map((row) => {
    const e = employeeLines(row)
    return [row?.sl ?? '', `${e.name}\n${e.meta}`, ...days.value.map((d) => cellValue(row, d))]
  })

  autoTable(doc, {
    startY: 115,
    head,
    body,
    styles: { fontSize: 7, cellPadding: 3, valign: 'middle' },
    headStyles: { fillColor: [241, 245, 249] },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 30, right: 30 },
  })

  doc.save(`${filenameBase.value}.pdf`)
}

/* -------------------- UI actions -------------------- */
const goBack = () => router.go(-1)

const onKey = (e) => {
  if (e.key === 'Escape') {
    /* noop */
  }
}
window.addEventListener('keydown', onKey)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

/* -------------------- Sticky widths -------------------- */
const SL_W = 56
const EMP_W = 260
</script>

<template>
  <div class="w-full min-w-0 space-y-3 px-3 md:px-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden sm:inline ml-2">Back</span>
      </button>

      <div class="min-w-0 flex-1 text-center">
        <h1 class="text-base md:text-lg font-bold text-slate-800 leading-6 truncate">Monthly Leave Report</h1>
        <p class="text-[11px] text-slate-500 truncate">
          Company: {{ safe(filters.company_id, '—') }} • {{ activeMonthLabel }} {{ selectedYear }}
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

    <!-- Filters -->
    <div class="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="p-3">
        <EmployeeFilter
          v-model:company_id="filters.company_id"
          v-model:department_id="filters.department_id"
          v-model:employee_id="filters.employee_id"
          v-model:line_type="filters.line_type"
          :with-type="true"
          :initial-value="$route.query"
          @filter-change="() => {}"
        >
          <FlexibleDatePicker v-model="period" :show-year="true" :show-month="false" :show-date="false" label="Year" />
        </EmployeeFilter>
      </div>

      <!-- Month selector -->
      <div class="border-t border-slate-300 bg-slate-50 px-3 py-2">
        <div class="month-strip">
          <button
            v-for="(name, i) in monthNames"
            :key="name"
            class="month-pill"
            :class="selectedMonth === i + 1 ? 'month-pill--active' : ''"
            @click="setMonth(i + 1)"
            :title="name"
          >
            <span class="truncate">{{ monthShort[i] }}</span>
          </button>
        </div>

        <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <label
              class="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700"
            >
              <input type="checkbox" v-model="strictUser" class="accent-slate-700" />
              Strict user
            </label>

            <span
              v-if="storeFilters?.fallback_company_only"
              class="text-[11px] rounded-full bg-amber-100 text-amber-700 px-3 py-1"
            >
              Fallback: Company users
            </span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-[11px] font-semibold text-slate-600">Per Page</span>
            <select v-model="perPage" class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-[11px]">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
              <option :value="200">200</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading / Error -->
    <div v-if="isLoading" class="rounded-2xl border border-slate-300 bg-white shadow-sm p-6 text-center">
      <LoaderView />
    </div>

    <div v-else-if="error" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
      {{ error }}
    </div>

    <!-- Table -->
    <div v-else class="rounded-2xl border border-slate-300 bg-white shadow-sm overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-white px-4 py-3">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-slate-900 truncate">
            {{ activeMonthLabel }} <span class="text-slate-500 font-medium">{{ selectedYear }}</span>
          </p>
          <p class="text-[11px] text-slate-500 truncate">
            Dates: {{ days?.[0]?.label || '—' }} → {{ days?.[days.length - 1]?.label || '—' }}
          </p>
        </div>

        <p class="text-[11px] text-slate-500">
          Page {{ pagination?.current_page ?? 1 }} / {{ pagination?.last_page ?? 1 }} • Total
          {{ pagination?.total ?? (companyReports?.length || 0) }}
        </p>
      </div>

      <!-- scroll container -->
      <div class="table-scroll">
        <table class="min-w-max w-full text-[11px] text-slate-700" :style="{ '--slw': SL_W + 'px', '--empw': EMP_W + 'px' }">
          <thead class="text-[10px] uppercase tracking-wide text-slate-500">
            <tr class="bg-slate-100">
              <th class="sticky-col sticky-col--sl bg-slate-100 px-3 py-2 text-left">SL</th>
              <th class="sticky-col sticky-col--emp bg-slate-100 px-3 py-2 text-left">Employee/User</th>

              <th
                v-for="d in days"
                :key="d.date"
                class="px-2 py-2 text-center border-l border-slate-300 whitespace-nowrap"
                :title="d.date"
              >
                <div class="font-bold text-slate-700">{{ compactDate(d.label || d.date) }}</div>
                <div class="text-[9px] text-slate-500 -mt-[2px]">{{ d.dow || '' }}</div>
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-300">
            <tr v-for="row in companyReports" :key="row?.user?.id" class="hover:bg-sky-50">
              <td class="sticky-col sticky-col--sl px-3 py-2 font-bold bg-white">
                {{ row?.sl ?? '' }}
              </td>

              <td class="sticky-col sticky-col--emp px-3 py-2 bg-white">
                <div class="font-semibold text-slate-800 leading-5 truncate max-w-[240px]">
                  {{ employeeLines(row).name }}
                </div>
                <div class="text-[10px] text-slate-500 leading-4 line-clamp-2 max-w-[240px]">
                  {{ employeeLines(row).meta }}
                </div>
              </td>

              <td
                v-for="d in days"
                :key="row?.user?.id + '_' + d.date"
                class="px-2 py-2 text-center border-l border-slate-300 tabular-nums"
                :class="cellTdClass(cellValue(row, d))"
              >
                <span :class="cellBadgeClass(cellValue(row, d))">
                  {{ cellValue(row, d) }}
                </span>
              </td>
            </tr>

            <tr v-if="!companyReports?.length">
              <td :colspan="2 + (days?.length || 0)" class="px-4 py-10 text-center text-slate-500">
                No data found for selected filters.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="pagination" class="flex items-center justify-between gap-2 border-t border-slate-300 px-4 py-3">
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

    <!-- Legend (color indicator) -->
    <div class="flex flex-wrap gap-2 text-[11px] text-slate-600">
      <span class="legend"><span class="dot dot--appr"></span><b>(A)</b> Approved</span>
      <span class="legend"><span class="dot dot--pend"></span><b>(P)</b> Pending</span>
      <span class="legend"><span class="dot dot--rej"></span><b>(R)</b> Rejected</span>
      <span class="legend"><span class="dot dot--wk"></span><b>WK</b> Weekend</span>
      <span class="legend"><span class="dot dot--hd"></span><b>HD</b> Holiday</span>
      <span class="legend"><span class="dot dot--zero"></span><b>0</b> Normal</span>
    </div>
  </div>
</template>

<style scoped>
/* ✅ smooth horizontal scroll + visible scrollbar */
.table-scroll {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scrollbar-gutter: stable both-edges;
}
.table-scroll::-webkit-scrollbar {
  height: 10px;
}
.table-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}
.table-scroll::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 999px;
}

/* ✅ Sticky columns */
.sticky-col {
  position: sticky;
  z-index: 10;
  white-space: nowrap;
}
.sticky-col--sl {
  left: 0;
  width: var(--slw);
  min-width: var(--slw);
  max-width: var(--slw);
}
.sticky-col--emp {
  left: var(--slw);
  width: var(--empw);
  min-width: var(--empw);
  max-width: var(--empw);
}
.sticky-col--emp,
.sticky-col--sl {
  box-shadow: 1px 0 0 rgba(226, 232, 240, 1);
}

/* Month strip (scrollable) */
.month-strip {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
  -webkit-overflow-scrolling: touch;
}
.month-strip::-webkit-scrollbar {
  height: 8px;
}
.month-strip::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}
.month-strip::-webkit-scrollbar-track {
  background: transparent;
}

/* Month pills (compact) */
.month-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #0f172a;
  font-size: 11px;
  font-weight: 900;
  min-width: 56px;
}
.month-pill--active {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}

/* ✅ badge pill */
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-weight: 900;
  font-size: 10px;
  line-height: 1;
  border: 1px solid transparent;
}
.badge--appr {
  background: #dcfce7;
  color: #166534;
  border-color: #bbf7d0;
}
.badge--pend {
  background: #fef9c3;
  color: #854d0e;
  border-color: #fde68a;
}
.badge--rej {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fecaca;
}
.badge--lv {
  background: #e0f2fe;
  color: #075985;
  border-color: #bae6fd;
}
.badge--wk {
  background: #f1f5f9;
  color: #475569;
  border-color: #e2e8f0;
}
.badge--hd {
  background: #ffe4e6;
  color: #9f1239;
  border-color: #fecdd3;
}
.badge--zero {
  background: transparent;
  color: #cbd5e1;
  border-color: transparent;
  font-weight: 700;
}

/* Legend */
.legend {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.55rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 999px;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}
.dot--appr {
  background: #22c55e;
}
.dot--pend {
  background: #f59e0b;
}
.dot--rej {
  background: #ef4444;
}
.dot--wk {
  background: #64748b;
}
.dot--hd {
  background: #fb7185;
}
.dot--zero {
  background: #cbd5e1;
}
</style>
