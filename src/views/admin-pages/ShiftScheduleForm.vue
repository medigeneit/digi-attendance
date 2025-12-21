<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useShiftStore } from '@/stores/shift'
import { useShiftScheduleStore } from '@/stores/shiftScheduleStore'

import dayjs from 'dayjs'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import { useRoute, useRouter } from 'vue-router'

/* ==== Stores ==== */
const scheduleStore   = useShiftScheduleStore()
const companyStore    = useCompanyStore()
const shiftStore      = useShiftStore()
const departmentStore = useDepartmentStore()
const router          = useRouter()
const route           = useRoute()

const { defaultShift } = storeToRefs(scheduleStore)
const { employees }    = storeToRefs(companyStore) // global employees (পুরনো ব্যবহার থাকলে)
const { shifts }       = storeToRefs(shiftStore)

/* ==== Local state ==== */
const selectedMonth       = ref(dayjs().format('YYYY-MM'))
const selectedCompany     = ref('')
const selectedDepartment  = ref('')
const selectedEmployeeId  = ref('')
const selectedShift       = ref('')
const line_type           = ref('all')

const pad = (value) => String(value).padStart(2, '0')
const period = ref({
  year: Number(selectedMonth.value.split('-')[0]) || dayjs().year(),
  month: Number(selectedMonth.value.split('-')[1]) || (dayjs().month() + 1),
  day: 1,
})

const periodMonth = computed(() => {
  if (!period.value.year || !period.value.month) return ''
  return `${period.value.year}-${pad(period.value.month)}`
})

const scheduleMap         = ref({})
const selectedEmployeeIds = ref([])

const routeQueryApplied   = ref(false)
const applyingRouteQuery  = ref(false)

/** এই লিস্টই department + line_type অনুযায়ী main employees */
const departmentEmployees = ref([])

/* Loading & request key for schedule API */
const isLoadingSchedule = ref(false)
const lastScheduleKey   = ref(null)

/* ==== Colors ==== */
const shiftColorMap = ref({
  WEEKEND: '#B91C1C', // red-700
  HOLIDAY: '#6B7280', // gray-500
})
const colorPool = [
  '#FF5733', '#33C1FF', '#33FF57', '#FF33D4', '#FFD633', '#7D33FF',
  '#FF8C33', '#33FFF0', '#B833FF', '#3375FF', '#FF3333', '#33FFAA',
]

/* ==== Required Filters (UX Gate) ==== */
const isFiltersReady = computed(() =>
  Boolean(
    selectedCompany.value &&
    selectedDepartment.value &&
    line_type.value &&
    line_type.value !== 'all',
  ),
)

const missingFilters = computed(() => ({
  company: !selectedCompany.value,
  department: !selectedDepartment.value,
  line_type: !line_type.value || line_type.value === 'all',
}))

const requiredText = computed(() => {
  const missing = []
  if (missingFilters.value.company) missing.push('Company')
  if (missingFilters.value.department) missing.push('Department')
  if (missingFilters.value.line_type) missing.push('Line Type')
  return missing.length ? `Required: ${missing.join(', ')}` : 'All required filters selected.'
})

/* ==== Helpers ==== */
const byId = (id) => (arr) => (arr || []).find((i) => Number(i?.id) === Number(id))

const allShifts = computed(() => {
  const v = shifts.value || {}
  return Array.isArray(v) ? v : Object.values(v).flat()
})

function assignColorsToShifts () {
  let i = 0
  allShifts.value.forEach(s => {
    const key = String(s.id)
    if (!shiftColorMap.value[key]) {
      shiftColorMap.value[key] = colorPool[i % colorPool.length]
      i++
    }
  })
}

const daysInMonth = computed(() => {
  if (!periodMonth.value) return []
  return Array.from({ length: dayjs(periodMonth.value).daysInMonth() }, (_, i) => i + 1)
})

const getDayName = (day) => {
  const date = `${periodMonth.value}-${String(day).padStart(2, '0')}`
  return dayjs(date).format('ddd')
}

/* Selected IDs normalized + quick checker */
const selectedIdsNum = computed(() =>
  (selectedEmployeeIds.value || []).map(v => Number(v)).filter(Number.isFinite),
)
const selectedIdsSet = computed(() => new Set(selectedIdsNum.value))
const isChecked = (empId) => selectedIdsSet.value.has(Number(empId))

/* EmpId key helper */
const k = (empId) => String(empId)

/* ==== Cell rendering ==== */
const getShiftColorStyle = (empId, day) => {
  const val = scheduleMap.value?.[k(empId)]?.[day]
  if (!val) return { backgroundColor: '#E5E7EB' }
  const color = shiftColorMap.value[String(val)] || '#D1D5DB'
  return { backgroundColor: color }
}

const getShiftName = (empId, day) => {
  const val = scheduleMap.value?.[k(empId)]?.[day]
  if (val === 'WEEKEND' || val === 'HOLIDAY') return val
  const s = byId(val)(allShifts.value)
  return s?.name || ''
}

const getCellTitle = (empId, day) => {
  const dateStr = `${periodMonth.value}-${String(day).padStart(2, '0')}`
  const shiftName = getShiftName(empId, day)

  if (shiftName) return `${dateStr} — ${shiftName}`
  if (isChecked(empId)) return `${dateStr} — Click to set shift`
  return `${dateStr} — Check this employee to edit`
}

/* ==== Assignment actions (ONLY for checked rows) ==== */
function assignShift(empId, day) {
  if (!isChecked(empId)) return
  if (!selectedShift.value) return
  if (!scheduleMap.value[k(empId)]) scheduleMap.value[k(empId)] = {}
  scheduleMap.value[k(empId)][day] = selectedShift.value
}

function assignAllDatesForEmployee(empId) {
  if (!isChecked(empId)) return
  if (!selectedShift.value) return
  if (!scheduleMap.value[k(empId)]) scheduleMap.value[k(empId)] = {}
  daysInMonth.value.forEach((d) => {
    scheduleMap.value[k(empId)][d] = selectedShift.value
  })
}

function assignAllDatesToSelectedEmployees() {
  if (!selectedIdsNum.value.length || !selectedShift.value) return
  selectedIdsNum.value.forEach(assignAllDatesForEmployee)
}

function assignWeekends() {
  if (!selectedIdsNum.value.length) return
  selectedIdsNum.value.forEach((empId) => {
    const emp = byId(empId)(departmentEmployees.value)
    const empWeekends = (emp?.assign_weekend?.weekends || []).map(d => String(d).slice(0, 3))
    if (!scheduleMap.value[k(empId)]) scheduleMap.value[k(empId)] = {}
    daysInMonth.value.forEach((day) => {
      const dayName = getDayName(day)
      if (empWeekends.includes(dayName)) {
        scheduleMap.value[k(empId)][day] = 'WEEKEND'
      }
    })
  })
}

function clearAssignmentsForSelected() {
  if (!selectedIdsNum.value.length) return
  selectedIdsNum.value.forEach((empId) => {
    if (scheduleMap.value[k(empId)]) scheduleMap.value[k(empId)] = {}
  })
}

/* ==== Save (ONLY checked rows) ==== */
async function saveSchedule () {
  if (!isFiltersReady.value) {
    alert('Please select Company, Department and Line Type first.')
    return
  }

  if (!selectedIdsNum.value.length) {
    alert('Select at least one employee.')
    return
  }

  const payload = []
  for (const [empKey, schedule] of Object.entries(scheduleMap.value || {})) {
    const empId = Number(empKey)
    if (!selectedIdsSet.value.has(empId)) continue // only checked
    for (const [dayStr, value] of Object.entries(schedule || {})) {
      const day = Number(dayStr)
      if (!day || !value) continue
      const ymd = `${periodMonth.value}-${String(day).padStart(2, '0')}`
      let shift_id = null, status = null
      if (value === 'WEEKEND' || value === 'HOLIDAY') status = value
      else shift_id = Number(value)
      payload.push({ employee_id: empId, date: ymd, shift_id, status })
    }
  }

  if (!payload.length) {
    alert('No schedule data to save for checked employees.')
    return
  }

  try {
    await scheduleStore.saveSchedules({ payload })
    alert('Shift schedule saved successfully!')
  } catch (e) {
    console.error('Failed to save schedule', e)
    alert('Something went wrong while saving.')
  }
}

/* ==== Data loading ==== */
function buildScheduleKey ({ companyId, departmentId, lineType, month }) {
  return [companyId || '', departmentId || '', lineType || 'all', month || ''].join('-')
}

/**
 * Optimized schedule loader:
 * - Required filter না থাকলে call হবে না
 * - Same filter হলে আবার call হবে না
 * - stale response apply হবে না
 */
async function loadScheduleData ({ companyId, departmentId, lineType, month }) {
  if (!companyId || !departmentId || !month || lineType === 'all') {
    scheduleMap.value = {}
    return
  }

  const normalized = {
    companyId: Number(companyId) || null,
    departmentId: Number(departmentId) || null,
    lineType: lineType && lineType !== 'all' ? lineType : 'all',
    month,
  }

  const key = buildScheduleKey(normalized)

  if (lastScheduleKey.value === key) return

  lastScheduleKey.value = key
  isLoadingSchedule.value = true
  defaultShift.value = false
  scheduleMap.value = {}

  try {
    const params = {
      company_id:    normalized.companyId,
      department_id: normalized.departmentId,
      month:         normalized.month,
    }
    if (normalized.lineType && normalized.lineType !== 'all') {
      params.line_type = normalized.lineType
    }

    let data = await scheduleStore.fetchSchedules({ params })
    data = Array.isArray(data) ? data : (data || [])

    if (!data.length) {
      const fallback = await scheduleStore.fetchDefaultSchedules({ params })
      const fbArr = Array.isArray(fallback) ? fallback : (fallback || [])
      if (fbArr.length) {
        defaultShift.value = true
        data = fbArr
        alert('No saved schedule found. Default schedule loaded.')
      }
    }

    const mapped = {}
    data.forEach((item) => {
      const empId = Number(item?.employee_id)
      const dStr  = String(item?.date || '').split('-')[2]
      const day   = Number(dStr)
      if (!empId || !day) return
      if (!mapped[k(empId)]) mapped[k(empId)] = {}
      mapped[k(empId)][day] = item.shift_id ?? item.status
    })

    if (lastScheduleKey.value === key) {
      scheduleMap.value = mapped
    }
  } catch (e) {
    console.error('Failed to load schedule data:', e)
    alert('Error loading schedule. Please try again or contact admin.')
  } finally {
    if (lastScheduleKey.value === key) {
      isLoadingSchedule.value = false
    }
  }
}

async function loadDepartmentEmployees(departmentId) {
  // Required filters ready না হলে employees দেখাবো না
  if (!isFiltersReady.value || !departmentId) {
    departmentEmployees.value = []
    employees.value = []
    selectedEmployeeIds.value = []
    return []
  }

  const response = await departmentStore.fetchDepartmentEmployee(
    [Number(departmentId)],
    line_type.value,
  )

  const list = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : []

  departmentEmployees.value = list
  employees.value = list

  selectedEmployeeIds.value = selectedEmployeeIds.value.filter((id) =>
    list.some((e) => Number(e?.id) === Number(id)),
  )

  return list
}

function hasScheduleFilters(month = periodMonth.value || selectedMonth.value) {
  return Boolean(isFiltersReady.value && month)
}

async function loadScheduleIfReady(monthOverride) {
  const month = monthOverride || periodMonth.value || selectedMonth.value

  if (!hasScheduleFilters(month)) {
    scheduleMap.value = {}
    lastScheduleKey.value = null
    isLoadingSchedule.value = false
    defaultShift.value = false
    return
  }

  await loadScheduleData({
    companyId:    selectedCompany.value,
    departmentId: selectedDepartment.value,
    lineType:     line_type.value,
    month,
  })
}

/* ==== Route query sync ==== */
const filterQueryParams = computed(() => ({
  company_id:    selectedCompany.value,
  department_id: selectedDepartment.value,
  line_type:     line_type.value,
  employee_id:   selectedEmployeeId.value,
  month:         periodMonth.value,
}))

const sanitizeQueryParams = (params) =>
  Object.fromEntries(
    Object.entries(params || {}).filter(
      ([, value]) => value !== '' && value !== null && value !== undefined,
    ),
  )

function updateRouteQuery(filters = {}) {
  const merged    = { ...route.query, ...filters }
  const sanitized = sanitizeQueryParams(merged)
  const sameQuery =
    Object.keys(sanitized).length === Object.keys(route.query).length &&
    Object.entries(sanitized).every(
      ([key, value]) => String(route.query[key] ?? '') === String(value ?? ''),
    )

  if (sameQuery) return
  router.replace({ query: sanitized }).catch(() => {})
}

function applyFiltersFromRoute(query = route.query) {
  applyingRouteQuery.value = true

  selectedCompany.value    = query.company_id || ''
  selectedDepartment.value = query.department_id || ''
  selectedEmployeeId.value = query.employee_id || ''
  line_type.value          = query.line_type || 'all'

  const month = query.month || selectedMonth.value
  selectedMonth.value      = month
  if (month) {
    const [yr, mo] = month.split('-')
    if (yr) period.value.year = Number(yr)
    if (mo) period.value.month = Number(mo)
  }

  applyingRouteQuery.value = false
  routeQueryApplied.value  = true
}

/* ==== Lifecycle ==== */
onMounted(async () => {
  applyFiltersFromRoute()

  if (selectedCompany.value) {
    await Promise.all([
      departmentStore.fetchDepartments({ company_id: Number(selectedCompany.value) }),
      shiftStore.fetchShifts({ company_id: Number(selectedCompany.value) }),
    ])
    assignColorsToShifts()
  }

  if (selectedCompany.value && selectedDepartment.value) {
    await loadDepartmentEmployees(selectedDepartment.value)
    await loadScheduleIfReady()
  }
})

/* ==== Watchers ==== */
watch(selectedCompany, async (companyId) => {
  if (!companyId) return

  // reset related filters
  selectedDepartment.value  = ''
  selectedEmployeeIds.value = []
  selectedEmployeeId.value  = ''
  departmentEmployees.value = []
  employees.value           = []
  scheduleMap.value         = {}
  line_type.value           = 'all'
  lastScheduleKey.value     = null
  defaultShift.value        = false

  await Promise.all([
    departmentStore.fetchDepartments({ company_id: Number(companyId) }),
    shiftStore.fetchShifts({ company_id: Number(companyId) }),
  ])
  assignColorsToShifts()
})

watch(selectedDepartment, async (departmentId) => {
  if (!departmentId) {
    departmentEmployees.value = []
    employees.value = []
    selectedEmployeeIds.value = []
    scheduleMap.value = {}
    lastScheduleKey.value = null
    defaultShift.value = false
    return
  }

  if (!applyingRouteQuery.value) {
    selectedEmployeeId.value = ''
  }

  await loadDepartmentEmployees(departmentId)
  await loadScheduleIfReady()
})

watch(line_type, async () => {
  if (!selectedCompany.value || !selectedDepartment.value) return
  await loadDepartmentEmployees(selectedDepartment.value)
  await loadScheduleIfReady()
})

watch(periodMonth, async (month) => {
  if (!month) return
  selectedMonth.value = month
  await loadScheduleIfReady(month)
})

watch(
  filterQueryParams,
  (next) => {
    if (!routeQueryApplied.value || applyingRouteQuery.value) return
    updateRouteQuery(next)
  },
  { deep: true },
)

/* ==== filteredEmployees ==== */
const filteredEmployees = computed(() => {
  if (!isFiltersReady.value) return []

  const baseList = departmentEmployees.value.length
    ? departmentEmployees.value
    : (employees.value || [])

  if (!selectedEmployeeId.value) return baseList

  const id = Number(selectedEmployeeId.value)
  return baseList.filter(e => Number(e?.id) === id)
})

/* Select-all for visible employees */
function toggleSelectAllVisible(checked) {
  if (!isFiltersReady.value) return
  if (checked) {
    selectedEmployeeIds.value = filteredEmployees.value.map(e => Number(e.id))
  } else {
    selectedEmployeeIds.value = []
  }
}
</script>

<template>
  <div class="p-4 max-w-[1600px] mx-auto">
    <!-- Title -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h2 class="text-xl md:text-2xl font-semibold">
        Monthly Shift Schedule Plan
      </h2>
      <div class="flex items-center gap-3 text-xs md:text-sm text-gray-500">
        <span>Month:</span>
        <span class="font-semibold">{{ periodMonth || selectedMonth }}</span>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap justify-start items-center gap-3 mb-2">
      <EmployeeFilter
        v-model:company_id="selectedCompany"
        v-model:department_id="selectedDepartment"
        v-model:line_type="line_type"
        v-model:employee_id="selectedEmployeeId"
        :initial-value="{
          company_id: selectedCompany,
          department_id: selectedDepartment,
          line_type,
          employee_id: selectedEmployeeId
        }"
      >
        <div class="flex gap-4">
          <label class="top-label">Shift</label>
          <select v-model="selectedShift" class="px-3 py-1 border rounded text-sm">
            <option value="">- Pick a Shift -</option>
            <option v-for="s in allShifts" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
      </EmployeeFilter>

      <div class="relative">
        <label class="top-label">Month</label>
        <FlexibleDatePicker
          v-model="period"
          :show-year="false"
          :show-month="true"
          :show-date="false"
        />
      </div>
    </div>

    <!-- Required filters status -->
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2">
      <div class="flex flex-wrap items-center gap-2 text-xs md:text-sm">
        <span
          class="inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold border"
          :class="isFiltersReady ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'"
        >
          <span
            class="h-2 w-2 rounded-full"
            :class="isFiltersReady ? 'bg-emerald-500' : 'bg-amber-500'"
          ></span>
          {{ requiredText }}
        </span>

        <span
          class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-slate-700"
          :class="missingFilters.company ? 'bg-white border-slate-200' : 'bg-emerald-50 border-emerald-200'"
        >
          <span class="text-xs">{{ missingFilters.company ? '○' : '✓' }}</span> Company
        </span>

        <span
          class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-slate-700"
          :class="missingFilters.department ? 'bg-white border-slate-200' : 'bg-emerald-50 border-emerald-200'"
        >
          <span class="text-xs">{{ missingFilters.department ? '○' : '✓' }}</span> Department
        </span>

        <span
          class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-slate-700"
          :class="missingFilters.line_type ? 'bg-white border-slate-200' : 'bg-emerald-50 border-emerald-200'"
        >
          <span class="text-xs">{{ missingFilters.line_type ? '○' : '✓' }}</span> Line Type
        </span>
      </div>

      <div class="text-[11px] md:text-xs text-slate-500">
        Employees & schedule will load automatically after selecting all required filters.
      </div>
    </div>

    <!-- Loading / info -->
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div class="text-xs md:text-sm text-sky-800 bg-sky-50 border border-sky-200 rounded px-2 py-1">
        ✔ Only <b>checked</b> employees are editable & will be saved.
      </div>

      <div
        v-if="isLoadingSchedule"
        class="text-xs md:text-sm text-gray-500 flex items-center gap-2"
      >
        <span class="inline-block w-2 h-2 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
        <span>Loading schedule...</span>
      </div>
    </div>

    <p
      v-if="defaultShift"
      class="text-xs md:text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 mb-3"
    >
      ⚠ Showing default schedule from current shift. Select employees manually before saving.
    </p>

    <!-- Clickable Legend -->
    <div
      class="flex flex-wrap gap-2 md:gap-3 mb-4 p-2 md:p-3 bg-white/70 backdrop-blur rounded sticky top-16 z-20 border"
    >
      <div
        v-for="shift in allShifts"
        :key="shift.id"
        class="flex items-center gap-2 cursor-pointer px-2 py-1 rounded border hover:bg-gray-50 text-xs md:text-sm"
        :class="{ 'ring-2 ring-blue-500': String(selectedShift) === String(shift.id) }"
        @click="selectedShift = shift.id"
      >
        <div
          class="w-4 h-4 rounded"
          :style="{ backgroundColor: shiftColorMap[String(shift.id)] || '#ccc' }"
        ></div>
        <span>{{ shift.name }}</span>
      </div>

      <div
        class="flex items-center gap-2 cursor-pointer px-2 py-1 rounded border hover:bg-gray-50 text-xs md:text-sm"
        :class="{ 'ring-2 ring-blue-500': selectedShift === 'HOLIDAY' }"
        @click="selectedShift = 'HOLIDAY'"
      >
        <div class="w-4 h-4 rounded bg-gray-500"></div>
        <span>Holiday</span>
      </div>

      <div
        class="flex items-center gap-2 cursor-pointer px-2 py-1 rounded border hover:bg-gray-50 text-xs md:text-sm"
        :class="{ 'ring-2 ring-blue-500': selectedShift === 'WEEKEND' }"
        @click="selectedShift = 'WEEKEND'"
      >
        <div class="w-4 h-4 rounded" :style="{ backgroundColor: shiftColorMap['WEEKEND'] }"></div>
        <span>Weekend</span>
      </div>
    </div>

    <!-- Bulk actions -->
    <div class="mb-3 flex flex-wrap gap-2 md:gap-3 items-center">
      <button
        @click="assignAllDatesToSelectedEmployees"
        class="btn-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm"
        :disabled="!isFiltersReady || !selectedIdsNum.length || !selectedShift"
        title="Set selected shift to all days for checked employees"
      >
        Set Shift → Checked (All Dates)
      </button>

      <button
        @click="assignWeekends"
        class="btn-4 bg-red-700 hover:bg-red-800 text-white text-xs md:text-sm"
        :disabled="!isFiltersReady || !selectedIdsNum.length"
        title="Mark employee-specific weekends for checked employees"
      >
        Set Weekends → Checked
      </button>

      <button
        @click="clearAssignmentsForSelected"
        class="btn-4 bg-gray-700 hover:bg-gray-800 text-white text-xs md:text-sm"
        :disabled="!isFiltersReady || !selectedIdsNum.length"
      >
        Clear (Checked)
      </button>

      <label class="btn-3 ml-auto flex items-center gap-2 text-xs md:text-sm">
        <input
          type="checkbox"
          :disabled="!isFiltersReady"
          :checked="selectedIdsNum.length && selectedIdsNum.length === filteredEmployees.length"
          @change="toggleSelectAllVisible($event.target.checked)"
        />
        <span>Select all (visible)</span>
      </label>

      <button
        @click="saveSchedule"
        class="btn-2 text-xs md:text-sm"
        :disabled="!isFiltersReady || !selectedIdsNum.length"
        title="Saves only checked employees"
      >
        Save (Checked only)
      </button>
    </div>

    <!-- Table -->
    <div class="overflow-auto border rounded">
      <table class="table-auto w-full text-xs md:text-sm">
        <thead class="sticky top-0 bg-white z-10">
          <tr>
            <th class="border p-2 w-40 sticky-col-1 text-left bg-white z-50">
              Employee
            </th>
            <th class="border p-2 w-32 sticky-col-2 text-center bg-white z-50">
              Quick Action
            </th>
            <th
              v-for="day in daysInMonth"
              :key="day"
              class="border text-center p-1 min-w-[32px] md:min-w-[40px]"
              :title="`${selectedMonth}-${String(day).padStart(2,'0')}`"
            >
              <div class="font-medium leading-none">{{ day }}</div>
              <div class="text-[9px] md:text-[10px] text-gray-500">
                {{ getDayName(day) }}
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="emp in filteredEmployees"
            :key="emp.id"
            class="odd:bg-white even:bg-gray-50"
          >
            <td class="border p-2 sticky-col-1 bg-inherit z-10">
              <label class="flex items-center gap-2">
                <input
                  type="checkbox"
                  class="rounded"
                  :value="emp.id"
                  v-model="selectedEmployeeIds"
                />
                <div class="min-w-0">
                  <div class="font-medium leading-tight truncate max-w-[150px]">
                    {{ emp.name }}
                  </div>
                </div>
              </label>
            </td>

            <td class="border p-1 md:p-2 sticky-col-2 bg-inherit z-10 text-center">
              <button
                class="btn-4 cursor-pointer text-[11px] md:text-xs px-2 py-1"
                @click="assignAllDatesForEmployee(emp.id)"
                :disabled="!selectedShift || !isChecked(emp.id)"
              >
                Apply to all
              </button>
            </td>

            <td
              v-for="day in daysInMonth"
              :key="day"
              class="border text-center"
              :class="isChecked(emp.id) ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default opacity-70'"
              @click="isChecked(emp.id) && assignShift(emp.id, day)"
              :title="getCellTitle(emp.id, day)"
            >
              <div
                :style="getShiftColorStyle(emp.id, day)"
                class="w-full h-5 md:h-6 rounded transition"
              ></div>
            </td>
          </tr>

          <!-- Empty State -->
          <tr v-if="!filteredEmployees?.length">
            <td colspan="999" class="p-8">
              <div class="mx-auto max-w-xl text-center">
                <div class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                  <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M10 6a2 2 0 104 0 2 2 0 00-4 0zM4 20a6 6 0 0112 0M16 11h6m-3-3v6" />
                  </svg>
                </div>

                <p class="mt-1 text-sm text-slate-600">
                  <template v-if="!isFiltersReady">
                    Select <b>Company</b>, <b>Department</b>, and <b>Line Type</b> to load employees.
                  </template>
                  <template v-else>
                    No employees found for the selected filters. Try changing filters/search.
                  </template>
                </p>

                <div class="mt-4 flex flex-wrap justify-center gap-2">
                  <span
                    v-if="missingFilters.company"
                    class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    <span class="h-2 w-2 rounded-full bg-amber-400"></span>
                    Select company
                  </span>

                  <span
                    v-if="missingFilters.department"
                    class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    <span class="h-2 w-2 rounded-full bg-amber-400"></span>
                    Select department
                  </span>

                  <span
                    v-if="missingFilters.line_type"
                    class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    <span class="h-2 w-2 rounded-full bg-amber-400"></span>
                    Select line type
                  </span>
                </div>
              </div>
            </td>
          </tr>

        </tbody>
      </table>
    </div>

    <!-- Bottom Save -->
    <div class="flex justify-center mt-4 md:mt-5">
      <button
        @click="saveSchedule"
        class="btn-2 text-xs md:text-sm"
        :disabled="!isFiltersReady || !selectedIdsNum.length"
        title="Saves only checked employees"
      >
        Save (Checked only)
      </button>
    </div>
  </div>
</template>

<style scoped>
th,
td {
  white-space: nowrap;
}

/* Sticky first two columns for better UX in horizontal scroll */
.sticky-col-1 {
  position: sticky;
  left: 0;
}

.sticky-col-2 {
  position: sticky;
  left: 12rem; /* approx 160px → Employee col width */
}
</style>
