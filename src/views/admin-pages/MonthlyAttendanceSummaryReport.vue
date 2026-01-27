<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import UpdateApprovalTime from '@/components/paycut/UpdateOrCreate.vue'
import DisplayFormattedWorkingHours from '@/components/paycut/DisplayFormattedWorkingHours.vue'

import AddonModal from '@/components/payroll/AddonModal.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import { ref, watch, onMounted, computed, nextTick, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

const authStore = useAuthStore()
const attendanceStore = useAttendanceStore()
const { monthly_company_summary, reportMeta } = storeToRefs(attendanceStore)

/* ---------------- utils ---------------- */
const toNum = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const payrollByUserId = ref({})

const getAddOnHour = (row) => {
  const period = payrollByUserId.value?.[row?.user_id]
  if (period && period.payable_hour !== undefined && period.payable_hour !== null) {
    return toNum(period.payable_hour)
  }
  const candidates = [
    row?.add_on,
    row?.add_on_hour,
    row?.add_on_hours,
    row?.total_addition,
    row?.total_addition_hours,
    row?.payable_hour,
    row?.addon,
  ]
  for (const val of candidates) {
    if (val === null || val === undefined || String(val).trim() === '') continue
    return toNum(val)
  }
  return 0
}

const sumBy = (rows, keyPath) => {
  return rows.reduce((acc, row) => {
    try {
      const val = keyPath.split('.').reduce((o, k) => (o ? o[k] : undefined), row)
      return acc + toNum(val)
    } catch {
      return acc
    }
  }, 0)
}
const pad = (value) => String(value || '').padStart(2, '0')
const formatOneDecimal = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0.0'
  return n.toFixed(1)
}

/* ---------------- reactive state ---------------- */
const selectedMonth = ref((route.query.date && String(route.query.date)) || attendanceStore.selectedMonth || '')

const parsePeriod = (value) => {
  const fallback = { year: new Date().getFullYear(), month: new Date().getMonth() + 1 }
  if (!value) return fallback
  const [year = '', month = ''] = String(value).split('-')
  if (!year || !month) return fallback
  return { year: Number(year) || fallback.year, month: Number(month) || fallback.month }
}
const period = ref(parsePeriod(selectedMonth.value))

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '',
})

// normalize store data → always array
const summaryRows = computed(() => (Array.isArray(monthly_company_summary.value) ? monthly_company_summary.value : []))

/* ---------------- snapshot meta ---------------- */
const isFinal = computed(() => !!(summaryRows.value[0] && summaryRows.value[0].is_final))

const finalizedAtLabel = computed(() => {
  const first = summaryRows.value[0]
  if (!first || !first.finalized_at) return ''
  try {
    const dt = new Date(first.finalized_at)
    return new Intl.DateTimeFormat('en', {
      year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).format(dt)
  } catch {
    return String(first.finalized_at)
  }
})

/**
 * If backend has snapshot refreshed_at / recalculated_at, bind it here.
 * Otherwise we show “Loaded just now”.
 */
const lastRefreshedAt = ref(null) // Date | null
const lastRefreshedLabel = computed(() => {
  if (!lastRefreshedAt.value) return 'Not refreshed yet'
  try {
    return new Intl.DateTimeFormat('en', {
      month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(lastRefreshedAt.value)
  } catch {
    return String(lastRefreshedAt.value)
  }
})

/* ---------------- footer totals (safe) ---------------- */
const totals = computed(() => {
  const rows = summaryRows.value
  return {
    cl: sumBy(rows, 'total_cl_leave'),
    ml: sumBy(rows, 'total_ml_leave'),
    sl: sumBy(rows, 'total_sl_leave'),
    wplDays: sumBy(rows, 'total_wpl_leave'),
    otHour: sumBy(rows, 'total_overtime_hours'),
    addOnHour: rows.reduce((acc, row) => acc + row.payroll, 0),
    absentDays: sumBy(rows, 'total_absent'),
    wplHour: sumBy(rows, 'total_wpl_hour'),
    paycutHour: sumBy(rows, 'approved_paycut'),
    payableHour: sumBy(rows, 'payable_hour'),
  }
})

/* ---------------- view controls ---------------- */
const viewMode = ref('table')
const tableDensity = ref('compact')
const viewModeTabs = [
  { label: 'Table', value: 'table', icon: 'fal fa-table' },
  { label: 'Cards', value: 'cards', icon: 'fal fa-th-large' },
]
const densityTabs = [
  { label: 'Cozy', value: 'cozy' },
  { label: 'Compact', value: 'compact' },
]

const selectedMonthLabel = computed(() => {
  const value = selectedMonth.value
  if (!value) return 'Month not selected'
  const [year, month] = value.split('-').map((n) => Number(n))
  if (!year || !month) return value
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1))
})

// "HH:MM"
const asDuration = (v, fallback = '0:00') => (v && String(v).trim() !== '' ? v : fallback)

/* ---------------- page UX: toast + banner ---------------- */
const ui = ref({
  toast: null, // {type:'success'|'error'|'info', text:string}
  banner: null, // {type:'success'|'info', text:string}
})
const toastClass = computed(() => {
  const t = ui.value.toast?.type
  if (t === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (t === 'error') return 'border-rose-200 bg-rose-50 text-rose-800'
  return 'border-slate-200 bg-slate-50 text-slate-800'
})
function showToast(type, text) {
  ui.value.toast = { type, text }
  window.clearTimeout(showToast._t)
  showToast._t = window.setTimeout(() => (ui.value.toast = null), 2500)
}
function showBanner(type, text, ms = 4000) {
  ui.value.banner = { type, text }
  window.clearTimeout(showBanner._b)
  showBanner._b = window.setTimeout(() => (ui.value.banner = null), ms)
}

const handleAddonUpdated = ({ period, userId }) => {
  if (!userId || !period) return
  payrollByUserId.value = { ...payrollByUserId.value, [userId]: period }
}

/* ---------------- data actions ---------------- */
const fetchAttendance = async () => {
  const companyId = filters.value.company_id
  const departmentId = filters.value.department_id
  const employeeId = filters.value.employee_id || ''
  const line_type = filters.value.line_type !== 'all' ? filters.value.line_type : ''

  if (!companyId) {
    showToast('info', 'Select a company first.')
    return
  }

  try {
    await attendanceStore.getMonthlyAttendanceSummaryReport(companyId, departmentId, line_type, employeeId, selectedMonth.value)
    lastRefreshedAt.value = new Date()
  } catch (error) {
    console.error('Failed:', error)
    showToast('error', 'Failed to load attendance data.')
  }
}

/* ---------------- query sync ---------------- */
const replaceQueryIfChanged = (nextQuery) => {
  const current = route.query
  const changed = Object.keys(nextQuery).some((k) => String(current[k] ?? '') !== String(nextQuery[k] ?? ''))
  if (changed) router.replace({ query: nextQuery })
}
const handleFilterChange = () => {
  replaceQueryIfChanged({
    ...route.query,
    company_id: filters.value.company_id || '',
    department_id: filters.value.department_id || 'all',
    line_type: filters.value.line_type || 'all',
    employee_id: filters.value.employee_id || '',
    date: selectedMonth.value || '',
  })
}

watch(selectedMonth, (date) => replaceQueryIfChanged({ ...route.query, date: date || '' }))

watch(
  period,
  (value) => {
    if (!value) return
    const formatted = `${value.year}-${pad(value.month)}`
    if (selectedMonth.value !== formatted) selectedMonth.value = formatted
  },
  { deep: true }
)

watch(selectedMonth, (value) => {
  const parsed = parsePeriod(value)
  if (!period.value || parsed.year !== period.value.year || parsed.month !== period.value.month) {
    period.value = parsed
  }
})

onMounted(() => {
  if (filters.value.company_id) fetchAttendance()
})

/* ---------------- exports ---------------- */
const getExportExcel = async () => {
  if (!filters.value.company_id) return
  const line_type = filters.value.line_type !== 'all' ? filters.value.line_type : ''
  await attendanceStore.downloadExcel(filters.value.company_id, line_type, selectedMonth.value)
}
const getDownloadPDF = async () => {
  if (!filters.value.company_id) return
  const line_type = filters.value.line_type !== 'all' ? filters.value.line_type : ''
  await attendanceStore.downloadPDF(filters.value.company_id, line_type, selectedMonth.value)
}
const goBack = () => router.go(-1)
const refreshPaycutList = async () => fetchAttendance()


/* ---------------- recalc & finalize ---------------- */
const isBusy = ref(false)

// UX: small confirmation without blocking alert()
// (if you still want confirm, keep it)
const askRecalc = () => true

const recalcMonthlySnapshot = async () => {
  if (!filters.value.company_id || !selectedMonth.value) {
    showToast('info', 'Select company & month first.')
    return
  }
  if (!askRecalc()) return

  const line_type = filters.value.line_type !== 'all' ? filters.value.line_type : ''
  const employeeId = filters.value.employee_id || ''
  const departmentId = filters.value.department_id || ''

  try {
    isBusy.value = true
    showBanner('info', `Recalculating snapshot for ${selectedMonthLabel.value}…`, 6000)

    await attendanceStore.recalculateMonthlySnapshot(
      filters.value.company_id,
      departmentId,
      line_type,
      employeeId,
      selectedMonth.value
    )

    await fetchAttendance()
    showBanner('success', '✅ Snapshot refreshed — numbers updated on this page.')
  } catch (error) {
    console.error('Failed recalc:', error)
    showToast('error', 'Failed to recalculate snapshot.')
  } finally {
    isBusy.value = false
  }
}

const toggleFinalize = async () => {
  if (!filters.value.company_id || !selectedMonth.value) {
    showToast('info', 'Select company & month first.')
    return
  }

  const action = isFinal.value ? 'unfinalize' : 'finalize'
  const label = action === 'finalize' ? 'Finalize' : 'Unfinalize'

  const line_type = filters.value.line_type !== 'all' ? filters.value.line_type : ''
  const employeeId = filters.value.employee_id || ''

  try {
    isBusy.value = true
    showBanner('info', `${label} in progress…`, 6000)

    await attendanceStore.finalizeMonthlySnapshot(
      filters.value.company_id,
      line_type,
      employeeId,
      selectedMonth.value,
      action
    )

    await fetchAttendance()
    showBanner('success', `✅ Month ${label.toLowerCase()}d successfully.`)
  } catch (error) {
    console.error('Finalize failed:', error)
    showToast('error', 'Failed to change final status.')
  } finally {
    isBusy.value = false
  }
}

/* ---------------- limit-height layout helpers ----------------
   We make TopBar + Filters sticky, and keep table scroll in remaining height.
-------------------------------------------------------------- */
const topBarRef = ref(null)
const filterBarRef = ref(null)
const chromeHeight = ref(260) // fallback

let ro = null
const recalcChromeHeight = async () => {
  await nextTick()
  const topH = topBarRef.value?.offsetHeight || 0
  const filterH = filterBarRef.value?.offsetHeight || 0
  const extra = 24 // spacing/margins
  chromeHeight.value = topH + filterH + extra
}

const tableMaxH = computed(() => {
  // clamp so it never goes too small
  return `max(320px, calc(100vh - ${chromeHeight.value}px))`
})

onMounted(async () => {
  await recalcChromeHeight()
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(recalcChromeHeight)
    if (topBarRef.value) ro.observe(topBarRef.value)
    if (filterBarRef.value) ro.observe(filterBarRef.value)
  } else {
    window.addEventListener('resize', recalcChromeHeight)
  }
})
onBeforeUnmount(() => {
  if (ro) ro.disconnect()
  window.removeEventListener('resize', recalcChromeHeight)
})
</script>

<template>
  <div class="px-4 space-y-4">
    <!-- Toast -->
    <div
      v-if="ui.toast"
      class="fixed right-4 top-4 z-[90] rounded-xl border px-4 py-2 text-sm shadow-sm"
      :class="toastClass"
    >
      {{ ui.toast.text }}
    </div>

    <!-- Banner (explains recalc result) -->
    <div
      v-if="ui.banner"
      class="sticky top-2 z-[80] rounded-2xl border px-4 py-2 text-sm shadow-sm"
      :class="ui.banner.type === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-slate-200 bg-slate-50 text-slate-800'"
    >
      {{ ui.banner.text }}
    </div>

    <!-- Top Bar (compact + sticky) -->
    <div ref="topBarRef" class="sticky top-0 z-50">
      <div class="glass-panel px-4 py-3 bg-white/90 backdrop-blur border border-slate-100">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3 min-w-0">
            <button class="btn-3 !h-10 !w-10 rounded-full shadow-sm" @click="goBack">
              <i class="far fa-arrow-left text-sm"></i>
            </button>

            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Monthly overview
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <h1 class="truncate text-base font-semibold text-slate-900">
                  Monthly Attendance Summary
                </h1>

                <span
                  v-if="summaryRows.length"
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  :class="isFinal ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
                >
                  <span class="inline-block h-2 w-2 rounded-full" :class="isFinal ? 'bg-emerald-500' : 'bg-amber-500'"></span>
                  {{ isFinal ? 'Finalized' : 'Draft' }}
                  <span v-if="isFinal && finalizedAtLabel" class="ml-1 text-[10px] font-normal">
                    ({{ finalizedAtLabel }})
                  </span>
                </span>
              </div>

              <p class="mt-1 text-xs text-slate-500">
                This page shows a <span class="font-semibold text-slate-700">snapshot</span> for
                <span class="font-semibold">{{ selectedMonthLabel }}</span>.
                <span class="ml-1 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  Click Recalculate to refresh all numbers on this report.
                </span>
              </p>

              <p class="mt-1 text-sm text-red-500 font-bold">
                Last calculate: <span class="font-semibold text-slate-500">{{ reportMeta?.last_update_human }}</span>
                <span class="mx-2">•</span>
                {{ summaryRows.length }} employees
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-2">
            <!-- View -->
            <div class="hidden lg:flex items-center gap-2">
              <span class="toolbar-label">View</span>
              <div class="segmented-control">
                <button
                  v-for="tab in viewModeTabs"
                  :key="tab.value"
                  type="button"
                  class="segmented-control__btn"
                  :class="{ 'is-active': viewMode === tab.value }"
                  @click="viewMode = tab.value"
                >
                  <i :class="tab.icon"></i>
                  <span>{{ tab.label }}</span>
                </button>
              </div>
            </div>

            <!-- Density -->
            <div class="hidden lg:flex items-center gap-2">
              <span class="toolbar-label">Density</span>
              <div class="segmented-control segmented-control--ghost">
                <button
                  v-for="option in densityTabs"
                  :key="option.value"
                  type="button"
                  class="segmented-control__btn"
                  :class="{ 'is-active': tableDensity === option.value }"
                  @click="tableDensity = option.value"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>

            <!-- Recalc -->
            <button
              type="button"
              class="btn-2 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!filters.company_id || !selectedMonth || isBusy || isFinal"
              @click="recalcMonthlySnapshot"
              title="Rebuild snapshot for this month (updates all numbers on this page)"
            >
              <i class="fal fa-rotate text-base" :class="isBusy ? 'animate-spin' : ''"></i>
              <span class="hidden sm:inline">{{ isBusy ? 'Recalculating…' : 'Recalculate' }}</span>
              <span class="sm:hidden">{{ isBusy ? '…' : 'Recalc' }}</span>
            </button>

            <!-- Finalize -->
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              :class="isFinal ? 'bg-slate-200 text-slate-800' : 'bg-emerald-500 text-white'"
              :disabled="!filters.company_id || !selectedMonth || isBusy || summaryRows.length === 0"
              @click="toggleFinalize"
              :title="isFinal ? 'Unlock month for edits' : 'Lock month as final'"
            >
              <i :class="isFinal ? 'fal fa-lock-open' : 'fal fa-lock'"></i>
              <span class="hidden sm:inline">{{ isFinal ? 'Unfinalize' : 'Finalize' }}</span>
            </button>

            <!-- Export -->
            <button
              type="button"
              @click="getExportExcel"
              class="btn-1 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-50"
              :disabled="!filters.company_id"
            >
              <i class="far fa-file-excel text-base text-green-500"></i>
              <span class="hidden sm:inline">Excel</span>
            </button>

            <button
              type="button"
              @click="getDownloadPDF"
              class="btn-1 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-50"
              :disabled="!filters.company_id"
            >
              <i class="fal fa-file-pdf text-base text-red-500"></i>
              <span class="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>

        <!-- Mobile: View/Density controls -->
        <div class="mt-3 flex flex-wrap items-center gap-2 lg:hidden">
          <span class="toolbar-label">View</span>
          <div class="segmented-control">
            <button
              v-for="tab in viewModeTabs"
              :key="tab.value"
              type="button"
              class="segmented-control__btn"
              :class="{ 'is-active': viewMode === tab.value }"
              @click="viewMode = tab.value"
            >
              <i :class="tab.icon"></i>
              <span>{{ tab.label }}</span>
            </button>
          </div>

          <span class="toolbar-label ml-2">Density</span>
          <div class="segmented-control segmented-control--ghost">
            <button
              v-for="option in densityTabs"
              :key="option.value"
              type="button"
              class="segmented-control__btn"
              :class="{ 'is-active': tableDensity === option.value }"
              @click="tableDensity = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters (sticky) -->
    <div ref="filterBarRef" class="sticky top-[92px] z-40">
      <div class="glass-panel p-3 bg-white/90 backdrop-blur">
        <div class="flex items-center justify-start gap-4">
          <EmployeeFilter
            v-model:company_id="filters.company_id"
            v-model:department_id="filters.department_id"
            v-model:employee_id="filters.employee_id"
            v-model:line_type="filters.line_type"
            :with-type="true"
            :initial-value="$route.query"
            @filter-change="handleFilterChange"
            class="w-full"
          >
            <div class="flex gap-2">
              <FlexibleDatePicker
                v-model="period"
                :show-year="false"
                :show-month="true"
                :show-date="false"
                label="Month"
              />
              <button type="button" @click="fetchAttendance()" class="btn-2 rounded">
                Search
              </button>
            </div>
          </EmployeeFilter>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <LoaderView v-if="attendanceStore.isLoading" />

    <div v-else>
      <!-- Select prompt -->
      <div v-if="!filters.company_id" class="empty-state">
        <p class="text-base font-semibold text-red-500">Select a company to start the report.</p>
        <p class="text-sm text-gray-500">Choose a company & filters above to preview this month.</p>
      </div>

      <!-- Empty state -->
      <div v-else-if="summaryRows.length === 0" class="empty-state glass-panel">
        <p class="text-base font-semibold text-gray-700">No attendance found</p>
        <p class="text-sm text-gray-500">Try a different set of filters or a different month.</p>
      </div>

      <!-- Data -->
      <div v-else class="space-y-4">
        <!-- Card View -->
        <div v-if="viewMode === 'cards'" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="(log, index) in summaryRows"
            :key="`${log?.user_id || 'card'}-${index}`"
            class="report-card"
            :class="{ 'report-card--alert': log?.under_target }"
          >
            <header class="report-card__header">
              <div>
                <p class="report-card__title">{{ log?.user }}</p>
                <p class="report-card__subtitle">{{ log?.designation }}</p>
              </div>
              <span
                class="report-card__tag"
                :class="log?.under_target ? 'report-card__tag--alert' : 'report-card__tag--ok'"
              >
                {{ log?.under_target ? 'Under target' : 'On track' }}
              </span>
            </header>

            <div class="report-card__body">
              <div class="report-card__row">
                <p class="report-card__body-label">Working Hour</p>
                <p class="report-card__primary" :class="log?.under_target ? 'text-red-600' : 'text-emerald-600'">
                  {{ asDuration(log?.total_working_hours) }}
                  <span class="text-gray-500 text-xs">/ {{ asDuration(log?.total_shift_hours) }}</span>
                </p>
              </div>

              <div class="report-card__grid">
                <div>
                  <p class="report-card__body-label">Attendance</p>
                  <p class="report-card__metric">
                    P {{ toNum(log?.total_present) }} | L {{ toNum(log?.total_leave) }} | A {{ toNum(log?.total_absent) }}
                  </p>
                </div>
                <div>
                  <p class="report-card__body-label">Weekend</p>
                  <p class="report-card__metric">{{ toNum(log?.total_weekend) }} days</p>
                </div>
                <div>
                  <p class="report-card__body-label">Actual Late</p>
                  <p class="report-card__metric">{{ toNum(log?.actual_late_day) }}d / {{ asDuration(log?.actual_late_hour) }}</p>
                </div>
                <div>
                  <p class="report-card__body-label">Actual Early</p>
                  <p class="report-card__metric">{{ toNum(log?.actual_early_day) }}d / {{ asDuration(log?.actual_early_hour) }}</p>
                </div>
                <div>
                  <p class="report-card__body-label">Short Leave</p>
                  <p class="report-card__metric">
                    First {{ toNum(log?.total_first_short_leave) }} | Last {{ toNum(log?.total_last_short_leave) }}
                  </p>
                </div>
                <div>
                  <p class="report-card__body-label">Leave Types</p>
                  <p class="report-card__metric">
                    CL {{ toNum(log?.total_cl_leave) }} | ML {{ toNum(log?.total_ml_leave) }} |
                    SL {{ toNum(log?.total_sl_leave) }} | WPL {{ toNum(log?.total_wpl_leave) }}
                  </p>
                </div>
                <div>
                  <p class="report-card__body-label">Hours Impact</p>
                  <p class="report-card__metric">
                    OT {{ toNum(log?.total_overtime_hours) }}h | Payable {{ toNum(log?.payable_hour) }}h
                  </p>
                </div>
                <div>
                  <p class="report-card__body-label">Deduction</p>
                  <p class="report-card__metric">
                    {{ toNum(log?.total_absent) * 9 }}h + {{ toNum(log?.total_wpl_hour) }}h
                  </p>
                </div>
              </div>
            </div>

            <footer class="report-card__footer">
              <div class="flex items-center gap-3 text-xs text-gray-500">
                <DisplayFormattedWorkingHours :workingHours="log?.approved_paycut" />
                <UpdateApprovalTime
                  class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600"
                  :userId="log?.user_id"
                  :month="selectedMonth"
                  v-if="authStore.user?.id === 8"
                  @updated="refreshPaycutList"
                />
              </div>

              <router-link
                :to="{ name: 'EmployeeAttendance', query: { ...route.query, employee_id: log?.user_id, date: selectedMonth } }"
                target="_blank"
                class="report-card__cta"
              >
                Job Card
                <i class="far fa-arrow-up-right-from-square text-xs"></i>
              </router-link>
            </footer>
          </article>
        </div>

        <!-- Table -->
        <div
          v-else
          class="table-shell"
          :class="[tableDensity === 'compact' ? 'table-density-compact' : 'table-density-cozy']"
        >
          <div class="table-scroll" :style="{ maxHeight: tableMaxH }">
            <table class="min-w-full table-auto border-collapse">
              <thead class="sticky top-0 bg-white shadow-sm z-10">
                <tr class="bg-gray-50 text-sm">
                  <th rowspan="2" class="th">#</th>
                  <th rowspan="2" class="th text-left">Employee Name</th>
                  <th rowspan="2" class="th text-left">Designation</th>
                  <th colspan="6" class="th">Attendance Summary</th>
                  <th colspan="2" class="th">Actual Late</th>
                  <th colspan="2" class="th">Remaining Late</th>
                  <th colspan="2" class="th">Actual Early</th>
                  <th colspan="2" class="th">Remaining Early</th>
                  <th rowspan="2" class="th">Working Hour</th>
                  <th colspan="4" class="th">Leave Day</th>
                  <th colspan="2" class="th">Short Leave</th>
                  <th colspan="2" class="th">Addition Hour</th>
                  <th colspan="3" class="th">Deduction Hour</th>
                  <th rowspan="2" class="th">Payable Hour</th>
                  <th rowspan="2" class="th">Action</th>
                </tr>
                <tr class="bg-gray-50 text-xs">
                  <th class="th">TD</th><th class="th">TP</th><th class="th">TW</th><th class="th">TL</th><th class="th">TA</th><th class="th">THD</th>
                  <th class="th">Day</th><th class="th">Hour</th>
                  <th class="th">Day</th><th class="th">Hour</th>
                  <th class="th">Day</th><th class="th">Hour</th>
                  <th class="th">Day</th><th class="th">Hour</th>
                  <th class="th">CL</th><th class="th">ML</th><th class="th">SL</th><th class="th">WPL</th>
                  <th class="th">Delay</th><th class="th">Early</th>
                  <th class="th">OT Hour</th><th class="th">Add-on</th>
                  <th class="th">Absent</th><th class="th">WPL</th><th class="th">Pay-cut</th>
                </tr>
              </thead>

              <tbody class="text-center text-xs">
                <tr
                  v-for="(log, index) in summaryRows"
                  :key="`${log?.user_id || 'u'}-${index}`"
                  class="border-b hover:bg-blue-50"
                  :class="{ 'table-row--alert': log?.under_target }"
                >
                  <td class="td">{{ index + 1 }}</td>
                  <td class="td text-left">{{ log?.user }}</td>
                  <td class="td text-left">{{ log?.designation }}</td>
                  <td class="td">{{ log?.total_monthly_days }}</td>
                  <td class="td">{{ log?.total_present }}</td>
                  <td class="td">{{ log?.total_weekend }}</td>
                  <td class="td">{{ log?.total_leave }}</td>
                  <td class="td">{{ log?.total_absent }}</td>
                  <td class="td">{{ log?.total_holiday }}</td>

                  <td class="td">{{ log?.actual_late_day }}</td>
                  <td class="td">{{ log?.actual_late_hour }}</td>
                  <td class="td">{{ log?.total_remain_late_day }}</td>
                  <td class="td">{{ log?.total_remain_late_hour }}</td>

                  <td class="td">{{ log?.actual_early_day }}</td>
                  <td class="td">{{ log?.actual_early_hour }}</td>
                  <td class="td">{{ log?.total_remain_early_day }}</td>
                  <td class="td">{{ log?.total_remain_early_hour }}</td>

                  <td class="td text-xs">
                    <p class="font-semibold" :class="log?.under_target ? 'text-red-600' : 'text-emerald-600'">
                      {{ log?.total_working_hours }}
                    </p>
                    <p class="text-[11px] text-gray-500">of {{ log?.total_shift_hours }}</p>
                  </td>

                  <td class="td">{{ log?.total_cl_leave }}</td>
                  <td class="td">{{ log?.total_ml_leave }}</td>
                  <td class="td">{{ log?.total_sl_leave }}</td>
                  <td class="td">{{ log?.total_wpl_leave }}</td>

                  <td class="td">
                    <p class="w-10 text-xs text-gray-600">
                      {{ log?.total_first_short_leave || 0 }} of
                      <span :class="{ 'text-red-600 font-bold': log?.actual_late_day >= 4 }">
                        {{ log?.actual_late_day || 0 }}
                      </span>
                    </p>
                  </td>

                  <td class="td">
                    <p class="w-10 text-xs text-gray-600">
                      {{ log?.total_last_short_leave || 0 }} of
                      <span :class="{ 'text-red-600 font-bold': log?.actual_early_day >= 4 }">
                        {{ log?.actual_early_day || 0 }}
                      </span>
                    </p>
                  </td>

                  <td class="td">{{ log?.total_overtime_hours ? `${log?.total_overtime_hours} H` : '' }}</td>
                  <td class="td">
                    <div class="flex gap-2 items-center">
                      <DisplayFormattedWorkingHours :workingHours="log?.payroll" />
                      <AddonModal
                        :userId="log.user_id"
                        :employeeName="log.user"
                        :month="selectedMonth"
                        @updated="handleAddonUpdated"
                      />
                    </div>
                  </td>

                  <td class="td">{{ toNum(log?.total_absent) * 9 }}h</td>
                  <td class="td">{{ log?.total_wpl_hour }}h</td>

                  <td class="td">
                    <div class="flex items-center justify-center gap-2">
                      <DisplayFormattedWorkingHours :workingHours="log?.approved_paycut" />
                      <UpdateApprovalTime
                        class="mr-2"
                        :userId="log?.user_id"
                        :month="selectedMonth"
                        v-if="authStore.user?.id === 8"
                        @updated="refreshPaycutList"
                      />
                    </div>
                  </td>

                  <td class="td">{{ log?.payable_hour }}</td>

                  <td class="td">
                    <router-link
                      :to="{ name: 'EmployeeAttendance', query: { ...route.query, employee_id: log?.user_id, date: selectedMonth } }"
                      target="_blank"
                      class="inline-flex w-20 items-center gap-1 rounded-md bg-blue-50 px-1 py-1 font-medium text-blue-700 hover:bg-blue-100"
                    >
                      Job Card
                      <i class="far fa-arrow-up-right-from-square text-xs"></i>
                    </router-link>
                  </td>
                </tr>
              </tbody>

              <tfoot>
                <tr class="bg-gray-100 text-center text-sm font-semibold">
                  <td colspan="18" class="td">Total</td>
                  <td class="td">{{ totals.cl }}</td>
                  <td class="td">{{ totals.ml }}</td>
                  <td class="td">{{ totals.sl }}</td>
                  <td class="td">{{ totals.wplDays }}</td>
                  <td class="td"></td>
                  <td class="td"></td>
                  <td class="td">{{ totals.otHour }}</td>
                  <td class="td">{{ formatOneDecimal(totals.addOnHour) }}</td>
                  <td class="td">{{ totals.absentDays }} day</td>
                  <td class="td">{{ totals.wplHour }}</td>
                  <td class="td">{{ totals.paycutHour }}</td>
                  <td class="td">{{ formatOneDecimal(totals.payableHour) }}</td>
                  <td class="td"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Add-on Modal -->

  </div>
</template>

<style scoped>
.glass-panel { @apply rounded-2xl border border-slate-100 bg-white/70 shadow-sm; }
.empty-state { @apply flex min-h-[120px] flex-col items-center justify-center gap-1 text-center; }
.table-shell { @apply rounded-2xl border border-slate-100 bg-white/90 shadow-lg; }
/* table-scroll height now comes from computed style */
.table-scroll { overflow: auto; }

.th { @apply border px-2 py-1 text-xs font-semibold text-gray-700 whitespace-nowrap; }
.td { @apply border px-2 py-1 whitespace-nowrap; }

.toolbar-label { @apply text-[11px] font-semibold uppercase tracking-wide text-slate-400; }
.segmented-control { @apply inline-flex items-center gap-1 rounded-full bg-slate-100 p-1; }
.segmented-control--ghost { @apply bg-transparent ring-1 ring-slate-200; }
.segmented-control__btn { @apply inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-slate-500 transition; }
.segmented-control__btn i { @apply text-[11px]; }
.segmented-control__btn.is-active { @apply bg-white text-slate-900 shadow; }

.table-density-compact .th { @apply px-1 py-0.5 text-[11px]; }
.table-density-compact .td { @apply px-1 py-0.5 text-[11px]; }

.table-row--alert { @apply bg-rose-50/40; }

.report-card { @apply flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg; }
.report-card--alert { @apply border-rose-100 bg-rose-50/70; }
.report-card__header { @apply flex items-start justify-between gap-4; }
.report-card__title { @apply text-base font-semibold text-slate-900; }
.report-card__subtitle { @apply text-xs text-slate-500; }
.report-card__tag { @apply rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide; }
.report-card__tag--ok { @apply bg-emerald-50 text-emerald-700; }
.report-card__tag--alert { @apply bg-rose-50 text-rose-700; }
.report-card__body { @apply space-y-4; }
.report-card__row { @apply flex items-baseline justify-between gap-3; }
.report-card__primary { @apply text-base font-semibold; }
.report-card__body-label { @apply text-[11px] font-semibold uppercase tracking-wide text-slate-400; }
.report-card__metric { @apply text-sm font-medium text-slate-800; }
.report-card__grid { @apply grid gap-3 sm:grid-cols-2; }
.report-card__footer { @apply flex items-center justify-between border-t border-dashed border-slate-200 pt-3; }
.report-card__cta { @apply inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700; }
</style>
