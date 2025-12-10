<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import TodoReportHeading from '@/components/todo/TodoReportHeading.vue'
import { getDisplayDate, getYearMonthDayFormat } from '@/libs/datetime'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useTodoDateStore } from '@/stores/useTodoDateStore'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const todoDateStore = useTodoDateStore()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const { companies } = storeToRefs(companyStore)
const { departments } = storeToRefs(departmentStore)

const today = getYearMonthDayFormat(new Date())

const filters = reactive({
  companyId: route.query?.company_id || '',
  departmentId: route.query?.department_id || '',
  employeeId: route.query?.employee_id || '',
  lineType: route.query?.line_type || 'all',
  startDate: route.query?.start_date || today,
  endDate: route.query?.end_date || today,
})

const groupedByUser = computed(() => {
  const byUser = {}

  todoDateStore.todo_dates.forEach((todo) => {
    const userId = todo.user?.id || `unknown-${todo.id}`
    const dateKey = todo.date || 'unknown-date'

    if (!byUser[userId]) {
      byUser[userId] = { user: todo.user, dates: {} }
    }

    if (!byUser[userId].dates[dateKey]) {
      byUser[userId].dates[dateKey] = { date: dateKey, todos: [] }
    }

    byUser[userId].dates[dateKey].todos.push(todo)
  })

  return Object.values(byUser)
    .map((group) => {
      const dates = Object.values(group.dates)
        .map((d) => ({ ...d, rowSpan: d.todos.length }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))

      const rowSpan = dates.reduce((sum, d) => sum + d.rowSpan, 0)

      return {
        user: group.user,
        dates,
        rowSpan,
      }
    })
    .sort((a, b) => (a.user?.name || '').localeCompare(b.user?.name || ''))
})

const formattedRange = computed(() => {
  if (!filters.startDate || !filters.endDate) return ''
  const start = getDisplayDate(filters.startDate, { weekDay: 'long' })
  const end = getDisplayDate(filters.endDate, { weekDay: 'long' })
  return `${start} ~ ${end}`
})

const employees = computed(() => companyStore.employees || [])

const lineTypeLabels = {
  all: 'All Types',
  executive: 'Executive',
  support_staff: 'Support Staff',
  doctor: 'Doctor',
  academy_body: 'Academy Body',
}

const filterSummary = computed(() => {
  const company =
    filters.companyId && companies.value?.length
      ? companies.value.find((c) => String(c.id) === String(filters.companyId))?.name
      : null

  const department =
    filters.departmentId && departments.value?.length
      ? departments.value.find((d) => String(d.id) === String(filters.departmentId))?.name
      : null

  let employee = null
  if (filters.employeeId) {
    employee =
      employees.value?.find((e) => String(e.id) === String(filters.employeeId))?.name ||
      groupedByUser.value.find(
        (group) => String(group.user?.id || '') === String(filters.employeeId),
      )?.user?.name ||
      null
  }

  const dateLabel =
    filters.startDate === filters.endDate && filters.startDate
      ? getDisplayDate(filters.startDate, { weekDay: 'long' })
      : formattedRange.value || '-'

  return {
    company: company || (filters.companyId ? `#${filters.companyId}` : 'All Companies'),
    department:
      department || (filters.departmentId ? `#${filters.departmentId}` : 'All Departments'),
    employee: employee || (filters.employeeId ? `#${filters.employeeId}` : 'All Employees'),
    lineType: lineTypeLabels[filters.lineType] || filters.lineType || 'All Types',
    dateRange: dateLabel,
  }
})

const statusClass = (status) => {
  if (status === 'COMPLETED') return 'bg-green-100 text-green-700 border border-green-200'
  if (status === 'WORKING') return 'bg-blue-100 text-blue-700 border border-blue-200'
  if (status === 'PENDING') return 'bg-yellow-100 text-yellow-700 border border-yellow-200'
  return 'bg-gray-100 text-gray-700 border border-gray-200'
}

function syncQuery() {
  router.replace({
    query: {
      ...route.query,
      company_id: filters.companyId || undefined,
      department_id: filters.departmentId || undefined,
      employee_id: filters.employeeId || undefined,
      line_type: filters.lineType || undefined,
      start_date: filters.startDate || undefined,
      end_date: filters.endDate || undefined,
    },
  })
}

async function fetchTodos() {
  if (!filters.companyId || !filters.startDate || !filters.endDate) return
  await todoDateStore.fetchTodoDates({
    'company-id': filters.companyId,
    'department-id': filters.departmentId,
    'employee-id': filters.employeeId,
    'line-type': filters.lineType,
    'start-date': filters.startDate,
    'end-date': filters.endDate,
  })
}

function handleFilterChange(payload) {
  filters.companyId = payload.companyId || ''
  filters.departmentId = payload.departmentId || ''
  filters.employeeId = payload.employeeId || ''
  filters.lineType = payload.lineType || 'all'
  filters.startDate = payload.startDate || ''
  filters.endDate = payload.endDate || ''
}

function handlePrint() {
  window.print()
}

watch(
  () => filters.companyId,
  (companyId) => {
    if (!companyId) return
    departmentStore.fetchDepartments(companyId)
    companyStore.fetchEmployee(companyId)
  },
  { immediate: true },
)

watch(
  () => ({ ...filters }),
  (next, prev) => {
    if (JSON.stringify(next) === JSON.stringify(prev)) return
    syncQuery()
    fetchTodos()
  },
  { deep: true },
)

watch(
  () => route.query,
  (q) => {
    filters.companyId = q?.company_id || filters.companyId
    filters.departmentId = q?.department_id || filters.departmentId
    filters.employeeId = q?.employee_id || filters.employeeId
    filters.lineType = q?.line_type || filters.lineType
    filters.startDate = q?.start_date || filters.startDate
    filters.endDate = q?.end_date || filters.endDate
  },
)

onMounted(() => {
  companyStore.fetchCompanies({ ignore_permission: true })
  fetchTodos()
})
</script>

<template>
  <div class="container print:flex-grow mx-auto print:w-full px-4 py-6 print:px-0 print:py-0">
    <TodoReportHeading
      :company-id="filters.companyId"
      :department-id="filters.departmentId"
      :employee-id="filters.employeeId"
      :line-type="filters.lineType"
      :start-date="filters.startDate"
      :end-date="filters.endDate"
      :loading="todoDateStore.loading"
      class="mb-4 print:px-0 print:py-0 print:mb-2 print:border-0 print:border-b print:border-gray-400 print:rounded-none print:w-full"
      @change="handleFilterChange"
      @reload-click="fetchTodos"
    >
      <template #before>
        <div>
          <h1 class="text-xl font-semibold text-gray-800">Todo Report</h1>
        </div>
      </template>
      <template #after>
        <button
          type="button"
          class="btn-icon print-hide disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
          @click.prevent="handlePrint"
          :disabled="todoDateStore.loading"
        >
          <i class="fas fa-print"></i>
        </button>
      </template>
    </TodoReportHeading>

    <div
      v-if="filters.companyId && filters.startDate && filters.endDate"
      class="bg-white border rounded-md mb-2 p-4 text-sm print:border-0 print:mb-2 print:px-0 print:w-full"
    >
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-y-2 gap-x-6">
        <div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">Company</div>
          <div class="font-medium text-gray-800">{{ filterSummary.company }}</div>
        </div>
        <div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">Department</div>
          <div
            class="font-medium"
            :class="[
              filterSummary.department == 'All Departments' ? 'text-gray-400' : 'text-gray-800',
            ]"
          >
            {{ filterSummary.department }}
          </div>
        </div>
        <div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">Line Type</div>
          <div
            class="font-medium"
            :class="[filterSummary.lineType == 'All Types' ? 'text-gray-400' : 'text-gray-800']"
          >
            {{ filterSummary.lineType }}
          </div>
        </div>
        <div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">Employee</div>
          <div
            class="font-medium"
            :class="[filterSummary.employee == 'All Employees' ? 'text-gray-400' : 'text-gray-800']"
          >
            {{ filterSummary.employee }}
          </div>
        </div>

        <div class="col-span-2">
          <div class="text-xs text-gray-500 uppercase tracking-wide">Date</div>
          <div class="font-medium text-gray-800">{{ filterSummary.dateRange }}</div>
        </div>
      </div>
    </div>

    <div
      v-if="!filters.companyId || !filters.startDate || !filters.endDate"
      class="text-center text-gray-500 py-12 border bg-gray-50 rounded-md"
    >
      <p class="text-red-500">Select company and date range to view the report.</p>
    </div>
    <LoaderView v-else-if="todoDateStore.loading">Loading report...</LoaderView>
    <div
      v-else-if="groupedByUser.length === 0"
      class="text-center text-gray-500 py-12 border bg-gray-50 rounded-md"
    >
      <div>
        <i class="fas fa-tasks fa-2x text-gray-300 mb-2"></i>
      </div>
      <div>No todos.</div>
    </div>
    <div
      v-else
      class="overflow-x-auto bg-white border border-t-0 rounded-md shadow-sm print:shadow-none print:rounded-none print:border-gray-400"
    >
      <table class="min-w-full text-left text-sm">
        <thead class="bg-gray-50 text-gray-600 uppercase tracking-wide text-xs">
          <tr class="border-y print:border-gray-400">
            <th class="px-4 py-3 border-r print:border-l print:border-l-gray-400">Name</th>
            <th class="px-4 py-3 border-x">Date</th>
            <th class="px-4 py-3 border-l">Todo</th>
            <th class="px-4 py-3 print:border-r print:border-gray-400">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <template
            v-for="userGroup in groupedByUser"
            :key="userGroup.user?.id || (userGroup.dates[0]?.todos[0]?.id ?? Math.random())"
          >
            <template
              v-for="dateGroup in userGroup.dates"
              :key="`${userGroup.user?.id || 'u'}-${dateGroup.date}`"
            >
              <template v-for="(todo, index) in dateGroup.todos" :key="todo.id">
                <tr class="hover:bg-gray-50 border">
                  <td
                    v-if="dateGroup === userGroup.dates[0] && index === 0"
                    :rowspan="userGroup.rowSpan"
                    class="px-4 py-3 align-top font-medium text-gray-800 whitespace-nowrap border-r"
                  >
                    <div>{{ userGroup.user?.name || 'Unknown user' }}</div>
                    <div v-if="userGroup.user?.department?.name" class="text-xs text-gray-500">
                      {{ userGroup.user?.department?.name }}
                    </div>
                    <div v-if="userGroup.user?.company?.name" class="text-[11px] text-gray-400">
                      {{ userGroup.user?.company?.name }}
                    </div>
                  </td>
                  <td
                    v-if="index === 0"
                    :rowspan="dateGroup.rowSpan"
                    class="px-4 py-3 align-top text-xs text-gray-700 whitespace-nowrap border-r"
                  >
                    {{ getDisplayDate(dateGroup.date) || dateGroup.date || '-' }}
                  </td>
                  <td class="px-4 py-3 text-gray-800">
                    <div class="font-medium">{{ todo.title }}</div>
                    <div class="text-xs text-gray-500">
                      {{ todo.todoable?.title || todo.todoable_type?.split('\\').pop() || '' }}
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="text-xs font-semibold px-2.5 py-1 rounded-full"
                      :class="statusClass(todo.status)"
                    >
                      {{ todo.status || 'N/A' }}
                    </span>
                  </td>
                </tr>
              </template>
            </template>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
