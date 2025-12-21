<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import UpdateApprovalTime from '@/components/paycut/UpdateOrCreate.vue'
import DisplayFormattedWorkingHours from '@/components/paycut/DisplayFormattedWorkingHours.vue'

import { useAttendanceStore } from '@/stores/attendance'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import { ref, watch, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

const authStore = useAuthStore()
const attendanceStore = useAttendanceStore()
const { monthly_company_summary } = storeToRefs(attendanceStore)

// ---------- utils ----------
const toNum = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
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

// ---------- reactive state ----------
const selectedMonth = ref(
  (route.query.date && String(route.query.date)) || attendanceStore.selectedMonth || ''
)

const pad = (value) => String(value || '').padStart(2, '0')

const parsePeriod = (value) => {
  const fallback = { year: new Date().getFullYear(), month: new Date().getMonth() + 1 }
  if (!value) return fallback
  const [year = '', month = ''] = String(value).split('-')
  if (!year || !month) return fallback
  return {
    year: Number(year) || fallback.year,
    month: Number(month) || fallback.month,
  }
}

const period = ref(parsePeriod(selectedMonth.value))

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '',
})

// normalize store data → always an array to avoid reduce null error
const summaryRows = computed(() =>
  Array.isArray(monthly_company_summary.value) ? monthly_company_summary.value : []
)

// snapshot final status (same for whole month)
const isFinal = computed(() => {
  const first = summaryRows.value[0]
  return !!(first && first.is_final)
})

const finalizedAtLabel = computed(() => {
  const first = summaryRows.value[0]
  if (!first || !first.finalized_at) return ''
  try {
    const dt = new Date(first.finalized_at)
    const f = new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    return f.format(dt)
  } catch {
    return String(first.finalized_at)
  }
})

// footer totals (safe)
const totals = computed(() => {
  const rows = summaryRows.value
  return {
    cl: sumBy(rows, 'total_cl_leave'),
    ml: sumBy(rows, 'total_ml_leave'),
    sl: sumBy(rows, 'total_sl_leave'),
    wplDays: sumBy(rows, 'total_wpl_leave'),
    otHour: sumBy(rows, 'total_overtime_hours'),
    absentDays: sumBy(rows, 'total_absent'),
    wplHour: sumBy(rows, 'total_wpl_hour'),
    // snapshot theke approved paycut sum
    paycutHour: sumBy(rows, 'approved_paycut'),
    payableHour: sumBy(rows, 'payable_hour'),
  }
})

const viewMode = ref('table')
const tableDensity = ref('cozy')
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
  const formatter = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' })
  return formatter.format(new Date(year, month - 1))
})

// small helper for "HH:MM" style strings
const asDuration = (v, fallback = '0:00') => (v && String(v).trim() !== '' ? v : fallback)

// ---------- data actions ----------
const fetchAttendance = async () => {
  const companyId = filters.value.company_id
  const employeeId = filters.value.employee_id || ''
  const line_type = filters.value.line_type !== 'all' ? filters.value.line_type : ''

  if (!companyId) {
    alert('⚠️ Please select a company first.')
    return
  }

  try {
    await attendanceStore.getMonthlyAttendanceSummaryReport(
      companyId,
      line_type,
      employeeId,
      selectedMonth.value
    )
  } catch (error) {
    console.error('❌ Failed to load attendance:', error)
    alert('❌ Failed to load attendance data.')
  }
}


// keep URL query in sync when filters or month change
const replaceQueryIfChanged = (nextQuery) => {
  const current = route.query
  const changed = Object.keys(nextQuery).some(
    (k) => String(current[k] ?? '') !== String(nextQuery[k] ?? '')
  )
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

watch(selectedMonth, (date) => {
  replaceQueryIfChanged({ ...route.query, date: date || '' })
})

watch(
  period,
  (value) => {
    if (!value) return
    const formatted = `${value.year}-${pad(value.month)}`
    if (selectedMonth.value !== formatted) {
      selectedMonth.value = formatted
    }
  },
  { deep: true }
)

watch(selectedMonth, (value) => {
  const parsed = parsePeriod(value)
  if (
    parsed &&
    (!period.value ||
      parsed.year !== period.value.year ||
      parsed.month !== period.value.month)
  ) {
    period.value = parsed
  }
})

onMounted(() => {
  if (filters.value.company_id) fetchAttendance()
})

// exports: excel/pdf
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
const refreshPaycutList = async () => {
  await fetchAttendance()
}

// ---------- new: live recalc & finalize ----------
const isBusy = ref(false)

/**
 * Live recalc snapshot for selected month + company
 * NOTE: expects attendanceStore.recalculateMonthlySnapshot({ company_id, month })
 */
const recalcMonthlySnapshot = async () => {
  if (!filters.value.company_id || !selectedMonth.value) {
    alert('⚠️ Please select company & month first.')
    return
  }
  if (!confirm(`Recalculate monthly snapshot for ${selectedMonthLabel.value}?`)) return

  const line_type = filters.value.line_type !== 'all' ? filters.value.line_type : ''
  const employeeId = filters.value.employee_id || ''

  try {
    isBusy.value = true

    await attendanceStore.recalculateMonthlySnapshot(
      filters.value.company_id,
      line_type,
      employeeId,
      selectedMonth.value
    )

    await fetchAttendance()
    alert('✅ Snapshot recalculated successfully.')
  } catch (error) {
    console.error('❌ Failed to recalculate snapshot:', error)
    alert('❌ Failed to recalculate snapshot.')
  } finally {
    isBusy.value = false
  }
}


/**
 * Finalize / Unfinalize month
 * NOTE: expects attendanceStore.finalizeMonthlySnapshot({ company_id, month, action })
 */
const toggleFinalize = async () => {
  if (!filters.value.company_id || !selectedMonth.value) {
    alert('⚠️ Please select company & month first.')
    return
  }

  const action = isFinal.value ? 'unfinalize' : 'finalize'
  const label = action === 'finalize' ? 'Finalize' : 'Unfinalize'

  if (
    !confirm(
      `${label} monthly snapshot for ${selectedMonthLabel.value}?${
        action === 'finalize'
          ? '\n\nAfter finalize, data will be locked (unless unfinalized).'
          : ''
      }`
    )
  ) {
    return
  }

  const line_type = filters.value.line_type !== 'all' ? filters.value.line_type : ''
  const employeeId = filters.value.employee_id || ''

  try {
    isBusy.value = true

    await attendanceStore.finalizeMonthlySnapshot(
      filters.value.company_id,
      line_type,
      employeeId,
      selectedMonth.value,
      action
    )

    await fetchAttendance()
    alert(`✅ Month ${label.toLowerCase()}d successfully.`)
  } catch (error) {
    console.error('❌ Failed to change final status:', error)
    alert('❌ Failed to change final status.')
  } finally {
    isBusy.value = false
  }
}
</script>

<template>
  <div class="px-4 space-y-6">
    <!-- Top Bar -->
    <div class="report-hero glass-panel px-5 py-2">
      <div class="space-y-4">
        <div class="flex justify-between items-center gap-3">
          <button class="btn-3 !h-12 !w-12 rounded-full shadow-sm" @click="goBack">
            <i class="far fa-arrow-left text-lg"></i>
          </button>

          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Monthly overview
            </p>
            <h1 class="title-md">Monthly Attendance Summary</h1>
            <p class="text-sm text-gray-500">
              Keep teams aligned with a compact snapshot of utilization, leaves, and pay-impact in
              one view.
            </p>
          </div>
        </div>
      </div>

      <div class="report-hero__actions">
        <div class="report-toolbar">
          <div class="report-toolbar__group">
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

          <div class="report-toolbar__group">
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

          <p class="report-toolbar__meta">
            {{ summaryRows.length }} employees | {{ selectedMonthLabel }}
            <span
              v-if="summaryRows.length"
              class="ml-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              :class="isFinal ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
            >
              <span
                class="inline-block h-2 w-2 rounded-full"
                :class="isFinal ? 'bg-emerald-500' : 'bg-amber-500'"
              ></span>
              {{ isFinal ? 'Finalized' : 'Draft' }}
              <span v-if="isFinal && finalizedAtLabel" class="ml-1 text-[10px] font-normal">
                ({{ finalizedAtLabel }})
              </span>
            </span>
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2">
          <!-- Recalc -->
          <button
            type="button"
            class="btn-2 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-sm"
            :disabled="!filters.company_id || !selectedMonth || isBusy || isFinal"
            @click="recalcMonthlySnapshot"
          >
            <i class="fal fa-rotate text-base"></i>
            <span class="hidden sm:inline">Recalculate</span>
          </button>

          <!-- Finalize / Unfinalize -->
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-sm"
            :class="isFinal ? 'bg-slate-200 text-slate-800' : 'bg-emerald-500 text-white'"
            :disabled="!filters.company_id || !selectedMonth || isBusy || summaryRows.length === 0"
            @click="toggleFinalize"
          >
            <i :class="isFinal ? 'fal fa-lock-open' : 'fal fa-lock'"></i>
            <span class="hidden sm:inline">
              {{ isFinal ? 'Unfinalize Month' : 'Finalize Month' }}
            </span>
          </button>

          <button
            type="button"
            @click="getExportExcel"
            class="btn-1 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm"
            :disabled="!filters.company_id"
          >
            <i class="far fa-file-excel text-base text-green-500"></i>
            <span class="hidden sm:inline">Excel</span>
          </button>

          <button
            type="button"
            @click="getDownloadPDF"
            class="btn-1 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm"
            :disabled="!filters.company_id"
          >
            <i class="fal fa-file-pdf text-base text-red-500"></i>
            <span class="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="glass-panel p-4 space-y-3 z-50">
      <div class="flex flex-wrap">
        <EmployeeFilter
          v-model:company_id="filters.company_id"
          v-model:department_id="filters.department_id"
          v-model:employee_id="filters.employee_id"
          v-model:line_type="filters.line_type"
          :with-type="true"
          :initial-value="$route.query"
          @filter-change="handleFilterChange"
        >
        <div class="relative">
          <FlexibleDatePicker
            v-model="period"
            :show-year="false"
            :show-month="true"
            :show-date="false"
            />
          <label class="top-label">Month</label>
        </div>
        </EmployeeFilter>
        <button type="button" @click="fetchAttendance()" class="btn-2">Search</button>
      </div>
    </div>

    <!-- Loading -->
    <LoaderView v-if="attendanceStore.isLoading" />

    <div v-else>
      <!-- Empty / Select prompt -->
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
                <p
                  class="report-card__primary"
                  :class="log?.under_target ? 'text-red-600' : 'text-emerald-600'"
                >
                  {{ asDuration(log?.total_working_hours) }}
                  <span class="text-gray-500 text-xs">
                    / {{ asDuration(log?.total_shift_hours) }}
                  </span>
                </p>
              </div>

              <div class="report-card__grid">
                <div>
                  <p class="report-card__body-label">Attendance</p>
                  <p class="report-card__metric">
                    P {{ toNum(log?.total_present) }} | L {{ toNum(log?.total_leave) }} | A
                    {{ toNum(log?.total_absent) }}
                  </p>
                </div>
                <div>
                  <p class="report-card__body-label">Weekend</p>
                  <p class="report-card__metric">{{ toNum(log?.total_weekend) }} days</p>
                </div>
                <div>
                  <p class="report-card__body-label">Actual Late</p>
                  <p class="report-card__metric">
                    {{ toNum(log?.actual_late_day) }}d / {{ asDuration(log?.actual_late_hour) }}
                  </p>
                </div>
                <div>
                  <p class="report-card__body-label">Actual Early</p>
                  <p class="report-card__metric">
                    {{ toNum(log?.actual_early_day) }}d / {{ asDuration(log?.actual_early_hour) }}
                  </p>
                </div>
                <div>
                  <p class="report-card__body-label">Short Leave</p>
                  <p class="report-card__metric">
                    First {{ toNum(log?.total_first_short_leave) }} | Last
                    {{ toNum(log?.total_last_short_leave) }}
                  </p>
                </div>
                <div>
                  <p class="report-card__body-label">Leave Types</p>
                  <p class="report-card__metric">
                    CL {{ toNum(log?.total_cl_leave) }} |
                    ML {{ toNum(log?.total_ml_leave) }} |
                    SL {{ toNum(log?.total_sl_leave) }} |
                    WPL {{ toNum(log?.total_wpl_leave) }}
                  </p>
                </div>
                <div>
                  <p class="report-card__body-label">Hours Impact</p>
                  <p class="report-card__metric">
                    OT {{ toNum(log?.total_overtime_hours) }}h |
                    Payable {{ toNum(log?.payable_hour) }}h
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
                <!-- use snapshot approved_paycut (float) -->
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
                :to="{
                  name: 'EmployeeAttendance',
                  query: { ...route.query, employee_id: log?.user_id, date: selectedMonth }
                }"
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
          <div class="table-scroll">
            <table class="min-w-full table-auto border-collapse">
              <thead class="sticky top-0 bg-white shadow-sm">
                <tr class="bg-gray-50 text-sm">
                  <th rowspan="2" class="th">#</th>
                  <th rowspan="2" class="th text-left">Employee Name</th>
                  <th rowspan="2" class="th text-left">Designation</th>
                  <th colspan="5" class="th">Attendance Summary</th>
                  <th colspan="2" class="th">Actual Late</th>
                  <th colspan="2" class="th">Remaining Late</th>
                  <th colspan="2" class="th">Actual Early</th>
                  <th colspan="2" class="th">Remaining Early</th>
                  <th rowspan="2" class="th">Working Hour</th>
                  <th colspan="4" class="th">Leave Day</th>
                  <th colspan="2" class="th">Short Leave</th>
                  <th rowspan="2" class="th">OT Hour</th>
                  <th colspan="4" class="th">Deduction</th>
                  <th rowspan="2" class="th">Action</th>
                </tr>
                <tr class="bg-gray-50 text-xs">
                  <th class="th">TD</th>
                  <th class="th">TP</th>
                  <th class="th">TW</th>
                  <th class="th">TL</th>
                  <th class="th">TA</th>
                  <th class="th">Day</th>
                  <th class="th">Hour</th>
                  <th class="th">Day</th>
                  <th class="th">Hour</th>
                  <th class="th">Day</th>
                  <th class="th">Hour</th>
                  <th class="th">Day</th>
                  <th class="th">Hour</th>
                  <th class="th">CL</th>
                  <th class="th">ML</th>
                  <th class="th">SL</th>
                  <th class="th">WPL</th>
                  <th class="th">Delay</th>
                  <th class="th">Early</th>
                  <th class="th">Absent Hour</th>
                  <th class="th">WPL(Hour)</th>
                  <th class="th">Pay Cut</th>
                  <th class="th">Payable Hour</th>
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
                    <p class="text-[11px] text-gray-500">
                      of {{ log?.total_shift_hours }}
                    </p>
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

                  <td class="td">
                    {{ log?.total_overtime_hours ? `${log?.total_overtime_hours} H` : '' }}
                  </td>

                  <td class="td">{{ toNum(log?.total_absent) * 9 }}H</td>
                  <td class="td">{{ log?.total_wpl_hour }}H</td>

                  <td class="td">
                    <div class="flex items-center justify-center gap-2">
                      <!-- snapshot approved_paycut -->
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

                  <td class="td">{{ log?.payable_hour }}H</td>

                  <td class="td">
                    <router-link
                      :to="{
                        name: 'EmployeeAttendance',
                        query: { ...route.query, employee_id: log?.user_id, date: selectedMonth }
                      }"
                      target="_blank"
                      class="inline-flex w-20 items-center gap-1 rounded-md bg-blue-50 px-1 py-1 font-medium text-blue-700 hover:bg-blue-100"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M15 3h6v6"></path>
                        <path d="M10 14 21 3"></path>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      </svg>
                      Job Card
                    </router-link>
                  </td>
                </tr>
              </tbody>

              <tfoot>
                <tr class="bg-gray-100 text-center text-sm font-semibold">
                  <td colspan="17" class="td">Total</td>

                  <td class="td">{{ totals.cl }}</td>
                  <td class="td">{{ totals.ml }}</td>
                  <td class="td">{{ totals.sl }}</td>
                  <td class="td">{{ totals.wplDays }}</td>

                  <td class="td"></td>
                  <td class="td"></td>

                  <td class="td">{{ totals.otHour }}</td>
                  <td class="td">{{ totals.absentDays }} day</td>
                  <td class="td">{{ totals.wplHour }}</td>
                  <td class="td">{{ totals.paycutHour }}</td>
                  <td class="td">{{ totals.payableHour }}</td>
                  <td class="td"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-panel { @apply rounded-2xl border border-slate-100 bg-white/70 shadow-sm; }
.empty-state { @apply flex min-h-[120px] flex-col items-center justify-center gap-1 text-center; }
.table-shell { @apply rounded-2xl border border-slate-100 bg-white/90 shadow-lg; }
.table-scroll { max-height: 80vh; overflow: auto; }
.th { @apply border px-2 py-1 text-xs font-semibold text-gray-700; }
.td { @apply border px-2 py-1; }
.report-hero { @apply flex flex-col gap-6 md:flex-row md:items-center md:justify-between; }
.report-hero__actions { @apply flex flex-col items-end gap-3 text-right; }
.toolbar-label { @apply text-[11px] font-semibold uppercase tracking-wide text-slate-400; }
.report-toolbar { @apply mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white/60 px-4 py-2; }
.report-toolbar__group { @apply flex items-center gap-2; }
.report-toolbar__meta { @apply text-xs font-semibold text-slate-500; }
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
