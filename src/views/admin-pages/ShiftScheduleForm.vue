<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useShiftStore } from '@/stores/shift'
import { useShiftScheduleStore } from '@/stores/shiftScheduleStore'

import dayjs from 'dayjs'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/* ==== Stores ==== */
const scheduleStore   = useShiftScheduleStore()
const companyStore    = useCompanyStore()
const shiftStore      = useShiftStore()
const departmentStore = useDepartmentStore()
const router = useRouter()
const route = useRoute()

const { defaultShift }         = storeToRefs(scheduleStore)
const { employees } = storeToRefs(companyStore)
const { shifts }               = storeToRefs(shiftStore)

/* ==== Filters/State ==== */
const selectedMonth       = ref(dayjs().format('YYYY-MM'))
const selectedCompany     = ref('')
const selectedDepartment  = ref('')
const selectedEmployeeId  = ref('')       
const selectedShift       = ref('')        
const scheduleMap         = ref({})       
const selectedEmployeeIds = ref([])        
const line_type           = ref('all')
const routeQueryApplied    = ref(false)
const applyingRouteQuery   = ref(false)

/* ==== Colors ==== */
const shiftColorMap = ref({
  WEEKEND: '#B91C1C', // red-700
  HOLIDAY: '#6B7280', // gray-500
})
const colorPool = [
  '#FF5733', '#33C1FF', '#33FF57', '#FF33D4', '#FFD633', '#7D33FF',
  '#FF8C33', '#33FFF0', '#B833FF', '#3375FF', '#FF3333', '#33FFAA',
]

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

const daysInMonth = computed(() => (
  Array.from({ length: dayjs(selectedMonth.value).daysInMonth() }, (_, i) => i + 1)
))
const getDayName = (day) => {
  const date = `${selectedMonth.value}-${String(day).padStart(2, '0')}`
  return dayjs(date).format('ddd')
}

/* Selected IDs normalized + quick checker */
const selectedIdsNum = computed(() =>
  (selectedEmployeeIds.value || []).map(v => Number(v)).filter(Number.isFinite)
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
    const emp = byId(empId)(employees.value)
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
  if (!selectedIdsNum.value.length) {
    alert('Select at least one employee.')
    return
  }
  const payload = []
  for (const [empKey, schedule] of Object.entries(scheduleMap.value || {})) {
    const empId = Number(empKey)
    if (!selectedIdsSet.value.has(empId)) continue // ← only checked
    for (const [dayStr, value] of Object.entries(schedule || {})) {
      const day = Number(dayStr)
      if (!day || !value) continue
      const ymd = `${selectedMonth.value}-${String(day).padStart(2, '0')}`
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
async function loadScheduleData (companyId, departmentId, month) {
  try {
    if (!companyId || !departmentId || !month) {
      alert('Company, Department, and Month are required to load schedule.')
      return
    }
    scheduleMap.value = {}
    // keep current selection; do not auto-select anyone
    defaultShift.value = false

    const res = await scheduleStore.fetchSchedules({
      params: { company_id: Number(companyId), department_id: Number(departmentId), month }
    })
    let data = res || []

    if (!data.length) {
      const fallback = await scheduleStore.fetchDefaultSchedules({
        params: { company_id: Number(companyId), department_id: Number(departmentId), month }
      })
      console.warn('[Fallback Schedule Loaded]', fallback)
      alert('No saved schedule found. Default schedule loaded.')
      data = fallback || []
      defaultShift.value = true
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
    scheduleMap.value = mapped
  } catch (e) {
    console.error('Failed to load schedule data:', e)
    alert('Error loading schedule. Please try again or contact admin.')
  }
}

async function loadDepartmentEmployees(departmentId) {
  if (!departmentId) {
    employees.value = []
    selectedEmployeeIds.value = []
    return []
  }

  const response = await departmentStore.fetchDepartmentEmployee(
    [Number(departmentId)],
    line_type.value,
  )

  const list = response || []
  employees.value = list
  selectedEmployeeIds.value = selectedEmployeeIds.value.filter((id) =>
    list.some((e) => Number(e?.id) === Number(id)),
  )
  return list
}

const filterQueryParams = computed(() => ({
  company_id: selectedCompany.value,
  department_id: selectedDepartment.value,
  line_type: line_type.value,
  employee_id: selectedEmployeeId.value,
  month: selectedMonth.value,
}))

const sanitizeQueryParams = (params) =>
  Object.fromEntries(
    Object.entries(params || {}).filter(
      ([, value]) => value !== '' && value !== null && value !== undefined,
    ),
  )

function updateRouteQuery(filters = {}) {
  const merged = { ...route.query, ...filters }
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
  selectedCompany.value = query.company_id || ''
  selectedDepartment.value = query.department_id || ''
  selectedEmployeeId.value = query.employee_id || ''
  line_type.value = query.line_type || 'all'
  selectedMonth.value = query.month || selectedMonth.value
  applyingRouteQuery.value = false
  routeQueryApplied.value = true
}

onMounted(() => {
  applyFiltersFromRoute()
})

/* ==== Fetchers / Watchers ==== */
watch(selectedCompany, async (companyId) => {
  if (!companyId) return
  selectedDepartment.value  = ''
  selectedEmployeeIds.value = []
  employees.value = []
  scheduleMap.value = {}

  await departmentStore.fetchDepartments({ company_id: Number(companyId) })
  await shiftStore.fetchShifts({ company_id: Number(companyId) })
  assignColorsToShifts()
})

watch(selectedDepartment, async (departmentId) => {
  if (!departmentId) return
  await loadDepartmentEmployees(departmentId)
  if (!selectedCompany.value || !selectedMonth.value) return
  await loadScheduleData(selectedCompany.value, departmentId, selectedMonth.value)
})

watch(line_type, async () => {
  if (!selectedDepartment.value) return
  await loadDepartmentEmployees(selectedDepartment.value)
  if (!selectedCompany.value || !selectedMonth.value) return
  await loadScheduleData(selectedCompany.value, selectedDepartment.value, selectedMonth.value)
})

watch(selectedMonth, async (month) => {
  if (!month || !selectedCompany.value || !selectedDepartment.value) return
  await shiftStore.fetchShifts({ company_id: Number(selectedCompany.value) })
  assignColorsToShifts()
  await loadScheduleData(selectedCompany.value, selectedDepartment.value, month)
})

watch(
  filterQueryParams,
  (next) => {
    if (!routeQueryApplied.value || applyingRouteQuery.value) return
    updateRouteQuery(next)
  },
  { deep: true },
)

const filteredEmployees = computed(() => {
  if (!selectedEmployeeId.value) return employees.value || []
  const id = Number(selectedEmployeeId.value)
  return (employees.value || []).filter(e => Number(e?.id) === id)
})

/* Select-all for visible employees */
function toggleSelectAllVisible(checked) {
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
    <div class="flex items-center justify-between gap-3 mb-4">
      <h2 class="text-center text-2xl font-semibold">Monthly Shift Schedule Plan</h2>
      <div class="text-sm text-gray-500">Month: {{ selectedMonth }}</div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap justify-start items-center gap-3 mb-4">
      <EmployeeFilter
        v-model:company_id="selectedCompany"
        v-model:department_id="selectedDepartment"
        v-model:line_type="line_type"
        v-model:employee_id="selectedEmployeeId"
        :initial-value="{ company_id: selectedCompany, department_id: selectedDepartment, line_type, employee_id: selectedEmployeeId }"  
      />
      <select v-model="selectedShift" class="px-2 py-2 border rounded">
        <option value="">- Pick a Shift -</option>
        <option v-for="s in allShifts" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <input type="month" v-model="selectedMonth" class="h-10 px-2 border rounded" />
      <!-- visible select all -->
    
    </div>

    <!-- Rule: only checked editable -->
    <p class="text-sky-800 bg-sky-50 border border-sky-200 rounded p-2 mb-3">
      ✔ Only <b>checked</b> employees are editable & will be saved.
    </p>

    <p v-if="defaultShift" class="text-amber-700 bg-amber-50 border border-amber-100 rounded p-2 mb-3">
      ⚠ Showing default schedule from current shift. Select employees manually before saving.
    </p>

    <!-- Clickable Legend -->
    <div class="flex flex-wrap gap-3 mb-4 p-3 bg-white/70 backdrop-blur rounded sticky top-16 z-20 border">
      <div
        v-for="shift in allShifts"
        :key="shift.id"
        class="flex items-center gap-2 cursor-pointer px-2 py-1 rounded border hover:bg-gray-50"
        :class="{ 'ring-2 ring-blue-500': String(selectedShift) === String(shift.id) }"
        @click="selectedShift = shift.id"
      >
        <div class="w-4 h-4 rounded" :style="{ backgroundColor: shiftColorMap[String(shift.id)] || '#ccc' }"></div>
        <span class="text-sm">{{ shift.name }}</span>
      </div>
      <div
        class="flex items-center gap-2 cursor-pointer px-2 py-1 rounded border hover:bg-gray-50"
        :class="{ 'ring-2 ring-blue-500': selectedShift === 'HOLIDAY' }"
        @click="selectedShift = 'HOLIDAY'"
      >
        <div class="w-5 h-5 rounded bg-gray-500"></div>
        <span class="text-sm">Holiday</span>
      </div>
      <div
        class="flex items-center gap-2 cursor-pointer px-2 py-1 rounded border hover:bg-gray-50"
        :class="{ 'ring-2 ring-blue-500': selectedShift === 'WEEKEND' }"
        @click="selectedShift = 'WEEKEND'"
      >
        <div class="w-5 h-5 rounded" :style="{ backgroundColor: shiftColorMap['WEEKEND'] }"></div>
        <span class="text-sm">Weekend</span>
      </div>
    </div>

    <!-- Bulk actions (simplified labels) -->
    <div class="mb-4 flex flex-wrap gap-3">
      <button
        @click="assignAllDatesToSelectedEmployees"
        class="btn-4 bg-indigo-600 hover:bg-indigo-700 text-white"
        :disabled="!selectedIdsNum.length || !selectedShift"
        title="Set selected shift to all days for checked employees"
      >
        Set Shift → Checked (All Dates)
      </button>

      <button
        @click="assignWeekends"
        class="btn-4 bg-red-700 hover:bg-red-800 text-white"
        :disabled="!selectedIdsNum.length"
        title="Mark employee-specific weekends for checked employees"
      >
        Set Weekends → Checked
      </button>

      <button
        @click="clearAssignmentsForSelected"
        class="btn-4 bg-gray-700 hover:bg-gray-800 text-white"
        :disabled="!selectedIdsNum.length"
      >
        Clear (Checked)
      </button>

      <div class="justify-end flex-grow">
        <button @click="saveSchedule" class="btn-2">
          Save (Checked only)
        </button>
      </div>

       <label class="btn-3">
        <input
          type="checkbox"
          :checked="selectedIdsNum.length && selectedIdsNum.length === filteredEmployees.length"
          @change="toggleSelectAllVisible($event.target.checked)"
        />
        <span>Select all (visible)</span>
      </label>
    </div>

    <!-- Table -->
    <div class="overflow-auto border rounded">
      <table class="table-auto w-full text-sm">
        <thead class="sticky top-0 bg-white z-10">
          <tr>
            <th class="border p-2 text-left w-40">Employee</th>
            <th class="border p-2 w-40">Quick Action</th>
            <th
              v-for="day in daysInMonth"
              :key="day"
              class="border text-center p-1 min-w-[46px]"
              :title="`${selectedMonth}-${String(day).padStart(2,'0')}`"
            >
              <div class="font-medium leading-none">{{ day }}</div>
              <div class="text-[10px] text-gray-500">{{ getDayName(day) }}</div>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="emp in filteredEmployees"
            :key="emp.id"
            class="odd:bg-white even:bg-gray-50"
          >
            <td class="border p-2">
              <label class="flex items-center gap-2">
                <input
                  type="checkbox"
                  class="rounded"
                  :value="emp.id"
                  v-model="selectedEmployeeIds"
                />
                <div class="min-w-0">
                  <div class="font-medium leading-tight">{{ emp.name }}</div>
                </div>
              </label>
            </td>

            <td class="border p-2">
              <button
                class="btn-4 cursor-pointer"
                @click="assignAllDatesForEmployee(emp.id)"
                :disabled="!selectedShift || !isChecked(emp.id)">
                Selected shift to all dates
              </button>
            </td>

            <td
              v-for="day in daysInMonth"
              :key="day"
              class="border text-center"
              :class="isChecked(emp.id) ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed opacity-60'"
              @click="isChecked(emp.id) && assignShift(emp.id, day)"
              :title="isChecked(emp.id) ? (getShiftName(emp.id, day) || 'Click to set') : 'Check this employee to edit'"
            >
              <div
                :style="getShiftColorStyle(emp.id, day)"
                class="w-full h-6 rounded transition"
              ></div>
            </td>
          </tr>

          <tr v-if="!filteredEmployees?.length">
            <td colspan="999" class="text-center text-gray-500 p-6">
              No employees found for current filter.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Save -->
    <div class="flex justify-center mt-5">
      <button
        @click="saveSchedule"
        class="btn-2"
        :disabled="!selectedIdsNum.length"
        title="Saves only checked employees"
      >
        <i></i>
       Save (Checked only)
      </button>
    </div>
  </div>
</template>

<style scoped>
th, td { white-space: nowrap; }
</style>
