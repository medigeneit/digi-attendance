<script setup>
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useShiftStore } from '@/stores/shift'
import { useShiftScheduleStore } from '@/stores/shiftScheduleStore'

import dayjs from 'dayjs'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'

const store = useShiftScheduleStore()
const companyStore = useCompanyStore()
const shiftStore = useShiftStore()
const departmentStore = useDepartmentStore()

const { defaultShift } = storeToRefs(store)
const { companies, employees } = storeToRefs(companyStore)
const { departments } = storeToRefs(departmentStore)
const { shifts } = storeToRefs(shiftStore)

const selectedMonth = ref(dayjs().format('YYYY-MM'))
const selectedCompany = ref('')
const selectedDepartment = ref('')
const selectedEmployee = ref('')
const selectedShift = ref('')
const scheduleMap = ref({})
const selectedEmployeeIds = ref([])

const shiftColorMap = ref({
  WEEKEND: '#B91C1C', // Red
  HOLIDAY: '#6B7280', // Tailwind's Gray-500 equivalent
})

const colorPool = [
  '#FF5733',
  '#33C1FF',
  '#33FF57',
  '#FF33D4',
  '#FFD633',
  '#7D33FF',
  '#FF8C33',
  '#33FFF0',
  '#B833FF',
  '#3375FF',
  '#FF3333',
  '#33FFAA',
]

const allShifts = computed(() => Object.values(shifts.value || {}).flat())

function assignColorsToShifts() {
  let colorIndex = 0
  allShifts.value.forEach((shift) => {
    if (!shiftColorMap.value[shift.id]) {
      shiftColorMap.value[shift.id] = colorPool[colorIndex % colorPool.length]
      colorIndex++
    }
  })
}

const daysInMonth = computed(() =>
  Array.from({ length: dayjs(selectedMonth.value).daysInMonth() }, (_, i) => i + 1),
)

const getDayName = (day) => {
  const date = `${selectedMonth.value}-${String(day).padStart(2, '0')}`
  return dayjs(date).format('ddd')
}

const getShiftColorStyle = (empId, day) => {
  const shiftKey = scheduleMap.value?.[empId]?.[day]
  if (!shiftKey) return { backgroundColor: '#D1D5DB' } // default gray

  if (shiftKey === 'WEEKEND' || shiftKey === 'HOLIDAY') {
    return { backgroundColor: shiftColorMap.value[shiftKey] || '#D1D5DB' }
  }

  return { backgroundColor: shiftColorMap.value[shiftKey] || '#D1D5DB' }
}

const getShiftName = (empId, day) => {
  const shiftId = scheduleMap.value?.[empId]?.[day]
  const shift = allShifts.value.find((s) => s.id === shiftId)
  return shift?.name || ''
}

const assignShift = (empId, day) => {
  if (!selectedEmployeeIds.value.includes(parseInt(empId))) return
  if (!selectedShift.value) return
  if (!scheduleMap.value[empId]) scheduleMap.value[empId] = {}
  scheduleMap.value[empId][day] = selectedShift.value
}

const assignAllDatesForEmployee = (empId) => {
  if (!selectedEmployeeIds.value.includes(parseInt(empId))) return
  if (!selectedShift.value) return
  if (!scheduleMap.value[empId]) scheduleMap.value[empId] = {}
  daysInMonth.value.forEach((day) => {
    scheduleMap.value[empId][day] = selectedShift.value
  })
}

const assignAllDatesToSelectedEmployees = () => {
  selectedEmployeeIds.value.forEach(assignAllDatesForEmployee)
}

const assignWeekends = () => {
  selectedEmployeeIds.value.forEach((empId) => {
    const emp = employees.value.find((e) => e.id === parseInt(empId))
    const empWeekends = emp?.weekends?.map((day) => day.slice(0, 3)) || []
    if (!scheduleMap.value[empId]) scheduleMap.value[empId] = {}
    daysInMonth.value.forEach((day) => {
      const dayName = getDayName(day)
      if (empWeekends.includes(dayName)) {
        scheduleMap.value[empId][day] = 'WEEKEND'
      }
    })
  })
}

const saveSchedule = async () => {
  if (!selectedEmployeeIds.value.length) {
    alert('Please select employees before saving.')
    return
  }

  if (!confirm('Are you sure you want to save the schedule?')) return

  const payload = []

  for (const [empId, schedule] of Object.entries(scheduleMap.value)) {
    if (!selectedEmployeeIds.value.includes(parseInt(empId))) continue

    for (const [day, shiftValue] of Object.entries(schedule)) {
      let shift_id = null
      let status = null

      if (shiftValue === 'WEEKEND' || shiftValue === 'HOLIDAY') {
        status = shiftValue
      } else {
        shift_id = shiftValue
      }

      payload.push({
        employee_id: parseInt(empId),
        date: `${selectedMonth.value}-${String(day).padStart(2, '0')}`,
        shift_id,
        status,
      })
    }
  }

  console.log({ payload })

  if (!payload.length) {
    alert('No schedule data to save.')
    return
  }

  try {
    await store.saveSchedules({ payload })
    alert('Shift schedule saved successfully!')
  } catch (err) {
    console.error('Failed to save schedule', err)
    alert('Something went wrong while saving.')
  }
}

watch(selectedCompany, async (companyId) => {
  if (companyId) {
    selectedDepartment.value = ''
    selectedEmployeeIds.value = []
    employees.value = []
    scheduleMap.value = {}

    await companyStore.fetchEmployee(companyId)
    await departmentStore.fetchDepartments({ companyId })
    await shiftStore.fetchShifts({ companyId })
    assignColorsToShifts()
  }
})

watch(selectedDepartment, async (departmentId) => {
  if (departmentId) {
    const payload = {
      companyId: selectedCompany.value,
      departmentIds: [departmentId],
    }
    const response = await departmentStore.fetchDepartmentEmployee(payload)
    employees.value = response

    selectedEmployeeIds.value = []
    await loadScheduleData(selectedCompany.value, departmentId, selectedMonth.value)
  }
})

watch(selectedMonth, async (month) => {
  if (month && selectedCompany.value && selectedDepartment.value) {
    await companyStore.fetchEmployee(selectedCompany.value)
    await shiftStore.fetchShifts({ companyId: selectedCompany.value })
    assignColorsToShifts()
    await loadScheduleData(selectedCompany.value, selectedDepartment.value, month)
  }
})

const filteredEmployees = computed(() => {
  if (!selectedEmployee.value) return employees.value
  return employees.value.filter((emp) => emp.id === parseInt(selectedEmployee.value?.id))
})

onMounted(async () => {
  await companyStore.fetchCompanies()
})

const loadScheduleData = async (companyId, departmentId, month) => {
  try {
    if (!companyId || !departmentId || !month) {
      alert('Company, Department, and Month are required to load schedule.')
      return
    }

    scheduleMap.value = {}
    selectedEmployeeIds.value = []
    defaultShift.value = false

    const response = await store.fetchSchedules({
      params: { company_id: companyId, department_id: departmentId, month },
    })

    let data = response || []
    const mapped = {}

    if (!data.length) {
      const fallback = await store.fetchDefaultSchedules({
        params: { company_id: companyId, department_id: departmentId, month },
      })
      console.warn('[Fallback Schedule Loaded]', fallback)
      alert('No saved schedule found. Default schedule loaded.')
      data = fallback
      defaultShift.value = true
    }

    data.forEach((item) => {
      if (!item?.employee_id || !item?.date) return
      const empId = item.employee_id
      const day = parseInt(item.date.split('-')[2])
      if (!mapped[empId]) mapped[empId] = {}
      mapped[empId][day] = item.shift_id || item.status
      if (!defaultShift.value && !selectedEmployeeIds.value.includes(empId)) {
        selectedEmployeeIds.value.push(empId)
      }
    })

    scheduleMap.value = mapped
  } catch (err) {
    console.error('Failed to load schedule data:', err)
    alert('Error loading schedule. Please try again or contact admin.')
  }
}
</script>

<template>
  <div class="p-4 max-w-[1600px] mx-auto">
    <h2 class="text-center title-lg mb-4">Monthly Shift Schedule Plan</h2>
    <div class="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4 items-center">
      <select v-model="selectedCompany" class="p-2 border rounded">
        <option value="">Select Company</option>
        <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <select v-model="selectedDepartment" class="p-2 border rounded">
        <option value="">- Department -</option>
        <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
      </select>
      <div>
        <MultiselectDropdown
          v-model="selectedEmployee"
          :options="employees"
          :multiple="false"
          label="name"
          label-prefix="employee_id"
          placeholder="Select user"
        />
      </div>
      <select v-model="selectedShift" class="p-2 border rounded">
        <option value="">- Shift -</option>
        <option v-for="s in allShifts" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>

      <input type="month" v-model="selectedMonth" class="p-2 border rounded" />
    </div>

    <p v-if="defaultShift" class="text-yellow-600 font-medium mb-2 p-2 border rounded border-black">
      ⚠ Showing default schedule from current shift. Select employees manually before saving.
    </p>

    <!-- Color Legend with selectable shift -->
    <div class="flex flex-wrap gap-3 mb-4 p-4 bg-white rounded sticky top-16">
      <div
        v-for="shift in allShifts"
        :key="shift.id"
        class="flex items-center gap-2 cursor-pointer px-2 py-1 rounded"
        :class="{
          'ring-2 ring-blue-500': selectedShift === shift.id,
        }"
        @click="selectedShift = shift.id"
      >
        <div
          class="w-5 h-5 rounded"
          :style="{ backgroundColor: shiftColorMap[shift.id] || '#ccc' }"
        />
        <span class="text-sm">{{ shift.name }}</span>
      </div>

      <!-- Hardcoded Holiday -->
      <div
        class="flex items-center gap-2 cursor-pointer px-2 py-1 rounded"
        :class="{ 'ring-2 ring-blue-500': selectedShift === 'HOLIDAY' }"
        @click="selectedShift = 'HOLIDAY'"
      >
        <div class="w-5 h-5 rounded bg-gray-500" />
        <span class="text-sm">Holiday</span>
      </div>

      <!-- Hardcoded Weekend -->
      <div
        class="flex items-center gap-2 cursor-pointer px-2 py-1 rounded"
        :class="{ 'ring-2 ring-blue-500': selectedShift === 'WEEKEND' }"
        @click="selectedShift = 'WEEKEND'"
      >
        <div class="w-5 h-5 rounded" :style="{ backgroundColor: shiftColorMap['WEEKEND'] }" />
        <span class="text-sm">Weekend</span>
      </div>
    </div>

    <div class="mb-4 flex gap-4">
      <button
        @click="assignAllDatesToSelectedEmployees"
        class="bg-indigo-600 text-white px-4 py-2 rounded"
      >
        Assign Selected Shift to Checked Employees
      </button>

      <button @click="assignWeekends" class="bg-red-700 text-white px-4 py-2 rounded">
        Assign Weekends to Checked Employees
      </button>
    </div>

    <!-- Schedule Table -->
    <div class="overflow-auto">
      <table class="table-auto w-full border text-sm">
        <thead class="sticky top-0 bg-white z-10">
          <tr>
            <th class="border p-2">Emp ID</th>
            <th class="border p-2">Name</th>
            <th class="border p-2">Action</th>
            <th v-for="day in daysInMonth" :key="day" class="border text-center p-1 w-10">
              {{ day }}
              <div class="text-xs text-gray-400">{{ getDayName(day) }}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="emp in filteredEmployees" :key="emp.id">
            <td class="border p-2">
              <input type="checkbox" class="mr-2" :value="emp.id" v-model="selectedEmployeeIds" />
              {{ emp.code }}
            </td>
            <td class="border p-2 whitespace-nowrap">{{ emp.name }}</td>
            <td class="border p-2">
              <button
                class="text-xs bg-green-600 text-white px-2 py-1 rounded"
                @click="assignAllDatesForEmployee(emp.id)"
              >
                Apply to All Dates
              </button>
            </td>
            <td
              v-for="day in daysInMonth"
              :key="day"
              class="border text-center cursor-pointer"
              @click="assignShift(emp.id, day)"
            >
              <div
                :title="getShiftName(emp.id, day)"
                :style="getShiftColorStyle(emp.id, day)"
                class="w-full h-6"
              ></div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="mb-4 flex justify-center mt-4">
      <button @click="saveSchedule" class="btn-2">💾 Save Schedule</button>
    </div>
  </div>
</template>

<style scoped>
th,
td {
  white-space: nowrap;
}
</style>
