<script setup>
import TodoReportHeading from '@/components/todo/TodoReportHeading.vue'
import { getDisplayDate, getYearMonthDayFormat } from '@/libs/datetime'
import { useTodoDateStore } from '@/stores/useTodoDateStore'
import { computed, onMounted, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const todoDateStore = useTodoDateStore()

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
  fetchTodos()
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <TodoReportHeading
      :company-id="filters.companyId"
      :department-id="filters.departmentId"
      :employee-id="filters.employeeId"
      :line-type="filters.lineType"
      :start-date="filters.startDate"
      :end-date="filters.endDate"
      :loading="todoDateStore.loading"
      class="mb-6"
      @change="handleFilterChange"
      @reload-click="fetchTodos"
    >
      <template #before>
        <div>
          <h1 class="text-xl font-semibold text-gray-800">Todo Report</h1>
          <p class="text-xs text-gray-500" v-if="formattedRange">Showing {{ formattedRange }}</p>
        </div>
      </template>
      <template #after>
        <button
          type="button"
          class="border px-3 py-2 rounded text-sm text-gray-700 bg-white hover:bg-gray-100"
          @click.prevent="handlePrint"
        >
          <i class="fas fa-print mr-1"></i> Print
        </button>
      </template>
    </TodoReportHeading>

    <div v-if="!filters.companyId || !filters.startDate || !filters.endDate" class="text-center text-gray-500 py-12">
      Select company and date range to view the report.
    </div>
    <div v-else-if="todoDateStore.loading" class="text-center text-gray-500 py-8">
      Loading report...
    </div>
    <div v-else-if="groupedByUser.length === 0" class="text-center text-gray-500 py-12">
      No todos found for this date.
    </div>
    <div v-else class="overflow-x-auto bg-white border rounded-md shadow-sm">
      <table class="min-w-full text-left text-sm">
        <thead class="bg-gray-50 text-gray-600 uppercase tracking-wide text-xs">
          <tr>
            <th class="px-4 py-3">Name</th>
            <th class="px-4 py-3">Date</th>
            <th class="px-4 py-3">Todo</th>
            <th class="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <template
            v-for="userGroup in groupedByUser"
            :key="userGroup.user?.id || (userGroup.dates[0]?.todos[0]?.id ?? Math.random())"
          >
            <template v-for="dateGroup in userGroup.dates" :key="`${userGroup.user?.id || 'u'}-${dateGroup.date}`">
              <template v-for="(todo, index) in dateGroup.todos" :key="todo.id">
                <tr class="hover:bg-gray-50">
                  <td
                    v-if="dateGroup === userGroup.dates[0] && index === 0"
                    :rowspan="userGroup.rowSpan"
                    class="px-4 py-3 align-top font-medium text-gray-800 whitespace-nowrap"
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
                    class="px-4 py-3 align-top text-xs text-gray-700 whitespace-nowrap"
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
                    <span class="text-xs font-semibold px-2.5 py-1 rounded-full" :class="statusClass(todo.status)">
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
