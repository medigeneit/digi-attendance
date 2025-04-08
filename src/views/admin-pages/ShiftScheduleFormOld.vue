<script setup>
import { useCompanyStore } from '@/stores/company'
import { useShiftStore } from '@/stores/shift'
import { useShiftScheduleStore } from '@/stores/shiftScheduleStore'
import dayjs from 'dayjs'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
const store = useShiftScheduleStore()
const companyStore = useCompanyStore()
const shiftStore = useShiftStore()

const { companies, employees } = storeToRefs(companyStore)
const { shifts } = storeToRefs(shiftStore)

const selectedMonth = ref(dayjs().format('YYYY-MM'))
const selectedCompany = ref('')
const selectedDepartment = ref('')
const selectedDesignation = ref('')
const selectedShift = ref('')
const departments = ref([])
const designations = ref([])
const scheduleMap = ref({})
const selectedEmployeeIds = ref([])

const shiftColorMap = ref({
  WEEKEND: 'bg-red-700',
})
const colorPool = [
  'bg-green-700',
  'bg-pink-600',
  'bg-blue-800',
  'bg-cyan-600',
  'bg-red-600',
  'bg-purple-700',
  'bg-yellow-500',
  'bg-indigo-500',
  'bg-amber-600',
]

const allShifts = computed(() => Object.values(shifts.value || {}).flat())

function assignColorsToShifts() {
  const shiftsArray = allShifts.value
  let colorIndex = 0
  shiftsArray.forEach((shift) => {
    shiftColorMap.value[shift.id] = colorPool[colorIndex % colorPool.length]
    colorIndex++
  })
  shiftColorMap.value['WEEKEND'] = 'bg-red-700'
}

const daysInMonth = computed(() =>
  Array.from({ length: dayjs(selectedMonth.value).daysInMonth() }, (_, i) => i + 1),
)

const getDayName = (day) => {
  const date = `${selectedMonth.value}-${String(day).padStart(2, '0')}`
  return dayjs(date).format('ddd')
}

const getShiftColorClass = (empId, day) => {
  const shiftKey = scheduleMap.value?.[empId]?.[day]
  if (!shiftKey) return 'bg-gray-300'
  if (['WEEKEND'].includes(shiftKey)) {
    return shiftColorMap.value[shiftKey] || 'bg-gray-300'
  }
  return shiftColorMap.value[parseInt(shiftKey)] || 'bg-gray-300'
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
  selectedEmployeeIds.value.forEach((empId) => {
    assignAllDatesForEmployee(empId)
  })
}

const assignWeekends = () => {
  selectedEmployeeIds.value.forEach((empId) => {
    const emp = employees.value.find((e) => e.id === parseInt(empId))
    const empWeekends = emp?.weekends?.map((day) => day.slice(0, 3)) || [] // Convert 'Friday' -> 'Fri'

    if (!scheduleMap.value[empId]) scheduleMap.value[empId] = {}
    daysInMonth.value.forEach((day) => {
      const dayName = getDayName(day)
      if (empWeekends.includes(dayName)) {
        scheduleMap.value[empId][day] = 'WEEKEND'
      }
    })
  })
}

// const loadGrid = async () => {
//   try {
//     await shiftStore.fetchShifts({ companyId: selectedCompany.value })
//     assignColorsToShifts()
//   } catch (err) {
//     console.error('Error loading grid data:', err)
//   }
// }

const saveSchedule = async () => {
  const payload = Object.entries(scheduleMap.value).flatMap(([empId, schedule]) => {
    if (!selectedEmployeeIds.value.includes(parseInt(empId))) return []
    return Object.entries(schedule).map(([day, shiftId]) => ({
      employee_id: parseInt(empId),
      date: `${selectedMonth.value}-${String(day).padStart(2, '0')}`,
      shift_id: shiftId,
    }))
  })

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
    await companyStore.fetchEmployee(companyId)
    await shiftStore.fetchShifts({ companyId: companyId })
    assignColorsToShifts()
    await loadScheduleData(companyId, selectedMonth.value)
  }
})

onMounted(async () => {
  await companyStore.fetchCompanies()
})

const loadScheduleData = async (companyId, month) => {
  try {
    const data = await store.fetchSchedules({
      params: {
        company_id: companyId,
        month: month, // format: YYYY-MM
      },
    })

    const mapped = {}

    data.forEach((item) => {
      selectedEmployeeIds.value.push(item.employee_id)
      const empId = item.employee_id
      const day = parseInt(item.date.split('-')[2])
      if (!mapped[empId]) mapped[empId] = {}
      mapped[empId][day] = item.shift_id || 'WEEKEND'
    })

    scheduleMap.value = mapped
  } catch (err) {
    console.error('Failed to load schedule data:', err)
  }
}
</script>

<template>
  <div class="p-4 max-w-[1600px] mx-auto">
    <div class="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4 items-center">
      <select v-model="selectedCompany" class="p-2 border rounded">
        <option value="">Select Company</option>
        <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>

      <select v-model="selectedShift" class="p-2 border rounded">
        <option value="">- Shift -</option>
        <option v-for="s in allShifts" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>

      <!-- <select v-model="selectedDepartment" class="p-2 border rounded">
        <option value="">- Department -</option>
        <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
      </select>

      <select v-model="selectedDesignation" class="p-2 border rounded">
        <option value="">- Designation -</option>
        <option v-for="des in designations" :key="des.id" :value="des.id">{{ des.name }}</option>
      </select> -->

      <input type="month" v-model="selectedMonth" class="p-2 border rounded" />

      <!-- <button @click="loadGrid" class="bg-blue-600 text-white px-4 py-2 rounded">
        Search Shift
      </button> -->
    </div>

    <!-- Color Legend with selectable shift -->
    <div class="flex flex-wrap gap-3 mb-4">
      <div
        v-for="shift in allShifts"
        :key="shift.id"
        class="flex items-center gap-2 cursor-pointer px-2 py-1 rounded"
        :class="{
          'ring-2 ring-blue-500': selectedShift === shift.id,
        }"
        @click="selectedShift = shift.id"
      >
        <div :class="['w-5 h-5 rounded', shiftColorMap[shift.id] || 'bg-gray-300']" />
        <span class="text-sm">{{ shift.name }}</span>
      </div>

      <!-- Hardcoded Holiday -->
      <!-- <div
        class="flex items-center gap-2 cursor-pointer px-2 py-1 rounded"
        :class="{ 'ring-2 ring-blue-500': selectedShift === 'HOLIDAY' }"
        @click="selectedShift = 'HOLIDAY'"
      >
        <div class="w-5 h-5 rounded bg-gray-500" />
        <span class="text-sm">Holiday</span>
      </div> -->

      <!-- Hardcoded Weekend -->
      <!-- <div
        class="flex items-center gap-2 cursor-pointer px-2 py-1 rounded"
        :class="{ 'ring-2 ring-blue-500': selectedShift === 'WEEKEND' }"
        @click="selectedShift = 'WEEKEND'"
      >
        <div class="w-5 h-5 rounded bg-red-700" />
        <span class="text-sm">Weekend</span>
      </div> -->
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
          <tr v-for="emp in employees" :key="emp.id">
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
                :class="getShiftColorClass(emp.id, day)"
                class="w-full h-6"
              ></div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="mb-4 mt-4">
      <button
        @click="saveSchedule"
        class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded shadow"
      >
        💾 Save Schedule
      </button>
    </div>
  </div>
</template>

<style scoped>
th,
td {
  white-space: nowrap;
}
</style>
