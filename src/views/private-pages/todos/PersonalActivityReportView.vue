<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import UserHoverBubble from '@/components/user/UserHoverBubble.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import {
  getDisplayDate,
  getDisplayMonth,
  getMonthLastDate,
  getYearMonthDayFormat,
  getYearMonthFormat,
} from '@/libs/datetime'
import { useAuthStore } from '@/stores/auth'
import { useTodoDateStore } from '@/stores/useTodoDateStore'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
  selfOnly: { type: Boolean, default: false },
})

const todoDateStore = useTodoDateStore()
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const route = useRoute()
const router = useRouter()

const filterState = reactive({
  companyId: '',
  departmentId: '',
  employeeId: '',
  lineType: 'all',
})

const selectedMonth = ref('')
const employeeFilterRef = ref(null)

const startDate = computed(() => {
  if (!selectedMonth.value) return ''
  const [year, month] = selectedMonth.value.split('-').map(Number)
  if (!year || !month) return ''

  return getYearMonthDayFormat(new Date(year, month - 1, 1))
})

const endDate = computed(() => {
  if (!selectedMonth.value) return ''
  const [year, month] = selectedMonth.value.split('-').map(Number)
  if (!year || !month) return ''

  return getYearMonthDayFormat(getMonthLastDate(new Date(year, month - 1, 1)))
})

const monthLabel = computed(() =>
  selectedMonth.value ? getDisplayMonth(`${selectedMonth.value}-01`) : '',
)
const rangeLabel = computed(() =>
  startDate.value && endDate.value
    ? `${getDisplayDate(startDate.value)} ~ ${getDisplayDate(endDate.value)}`
    : '',
)

const effectiveCompanyId = computed(() => {
  if (props.selfOnly) return user.value?.company_id || ''
  return filterState.companyId
})

const reportReady = computed(() => {
  if (!startDate.value || !endDate.value) return false
  if (props.selfOnly) return !!selfEmployeeId.value && !!effectiveCompanyId.value
  return !!effectiveCompanyId.value
})
const todoDates = computed(() => todoDateStore.todo_dates || [])
const selfEmployeeId = computed(() => (user.value?.id ? String(user.value.id) : ''))

function handleFilterChange(payload) {
  filterState.companyId = payload.company_id || ''
  filterState.departmentId = payload.department_id || ''
  filterState.employeeId = props.selfOnly ? selfEmployeeId.value : payload.employee_id || ''
  filterState.lineType = payload.line_type || 'all'
}

function statusClass(status) {
  if (status === 'COMPLETED') return 'bg-green-100 text-green-700 border border-green-200'
  if (status === 'WORKING') return 'bg-blue-100 text-blue-700 border border-blue-200'
  if (status === 'PENDING') return 'bg-yellow-100 text-yellow-700 border border-yellow-200'
  return 'bg-gray-100 text-gray-700 border border-gray-200'
}

function getTodoKey(todo) {
  return (
    todo.todo_id ||
    todo.todoId ||
    todo.todo?.id ||
    todo.todo?.todo_id ||
    todo.id ||
    `${todo.title}-${todo.date}`
  )
}

const employees = computed(() => {
  if (props.selfOnly && user.value) {
    return [user.value]
  }

  const filterEmployees = employeeFilterRef.value?.employees || []
  if (filterEmployees.length) return filterEmployees

  // Fallback: derive unique users from todo data if filter list is empty
  const mapped = []
  const seen = new Set()
  todoDates.value.forEach((todo) => {
    const u = todo.user
    if (!u || !u.id) return
    const key = String(u.id)
    if (seen.has(key)) return
    seen.add(key)
    mapped.push(u)
  })
  return mapped
})
const visibleEmployees = computed(() => {
  if (filterState.employeeId) {
    return employees.value.filter((emp) => String(emp.id) === String(filterState.employeeId))
  }
  return employees.value
})

const monthlyRows = computed(() => {
  return visibleEmployees.value
    .map((employee) => {
      const userTodos = todoDates.value.filter(
        (todo) => String(todo.user?.id ?? todo.user_id) === String(employee.id),
      )

      const latestByTodo = {}
      for (const todo of userTodos) {
        const key = getTodoKey(todo)
        const existing = latestByTodo[key]

        const todoDate = new Date(todo.date)
        const existingDate = existing ? new Date(existing.date) : null

        if (!existing || (existingDate && todoDate > existingDate)) {
          latestByTodo[key] = todo
        }
      }

      const latestTodos = Object.values(latestByTodo).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      )

      const totals = {
        total: latestTodos.length,
        completed: latestTodos.filter((t) => t.status === 'COMPLETED').length,
        working: latestTodos.filter((t) => t.status === 'WORKING').length,
        pending: latestTodos.filter((t) => t.status === 'PENDING').length,
      }

      return {
        user: employee,
        latestTodos,
        totals,
      }
    })
    .sort((a, b) => (a.user?.name || '').localeCompare(b.user?.name || ''))
})

const aggregateTotals = computed(() =>
  monthlyRows.value.reduce(
    (acc, row) => ({
      totalTodos: acc.totalTodos + row.totals.total,
      completed: acc.completed + row.totals.completed,
      working: acc.working + row.totals.working,
      pending: acc.pending + row.totals.pending,
    }),
    { totalTodos: 0, completed: 0, working: 0, pending: 0 },
  ),
)

function syncQuery() {
  router.replace({
    query: {
      ...route.query,
      month: selectedMonth.value || undefined,
      ...(props.selfOnly
        ? {}
        : {
            company_id: filterState.companyId || undefined,
            department_id: filterState.departmentId || undefined,
            employee_id: filterState.employeeId || undefined,
            line_type: filterState.lineType || undefined,
          }),
    },
  })
}

async function fetchTodos() {
  if (!reportReady.value) return

  await todoDateStore.fetchTodoDates({
    'company-id': effectiveCompanyId.value || undefined,
    'department-id': props.selfOnly ? undefined : filterState.departmentId,
    'employee-id': props.selfOnly ? selfEmployeeId.value : filterState.employeeId,
    'line-type': props.selfOnly ? undefined : filterState.lineType,
    'start-date': startDate.value,
    'end-date': endDate.value,
  })
}

function applySelfEmployee() {
  if (props.selfOnly && selfEmployeeId.value) {
    filterState.employeeId = selfEmployeeId.value
  }
}

function initFromRoute() {
  const q = route.query || {}
  selectedMonth.value =
    typeof q.month === 'string' && q.month ? q.month : selectedMonth.value || getYearMonthFormat(new Date())
  filterState.companyId = props.selfOnly ? '' : q.company_id || ''
  filterState.departmentId = props.selfOnly ? '' : q.department_id || ''
  filterState.employeeId = props.selfOnly ? selfEmployeeId.value : q.employee_id || ''
  filterState.lineType = props.selfOnly ? 'all' : q.line_type || 'all'
  applySelfEmployee()
}

watch(
  () => [
    filterState.companyId,
    filterState.departmentId,
    filterState.employeeId,
    filterState.lineType,
    startDate.value,
    endDate.value,
    selectedMonth.value,
  ],
  () => {
    applySelfEmployee()
    syncQuery()
    fetchTodos()
  },
)

watch(
  () => route.query,
  () => {
    initFromRoute()
  },
)

watch(selfEmployeeId, () => {
  applySelfEmployee()
  syncQuery()
  fetchTodos()
})

onMounted(() => {
  selectedMonth.value = selectedMonth.value || getYearMonthFormat(new Date())
  initFromRoute()
  fetchTodos()
})

function handlePrint() {
  window.print()
}
</script>

<template>
  <div class="container mx-auto print:w-full print:px-0 print:py-0">
    <div
      class="flex flex-wrap items-center gap-3 mb-4 bg-white border rounded-md px-4 py-3 print:border-0 print:rounded-none print:px-0 print:py-0"
    >
      <div>
        <h1 class="text-xl font-semibold text-gray-800">Personal Activity Report</h1>
        <p class="text-sm text-gray-500">Monthwise summary from todo dates</p>
      </div>
      <span class="ml-auto flex items-center gap-2 text-sm text-gray-600 print:hidden">
        <i class="far fa-calendar-alt text-blue-500"></i>
        <span>{{ monthLabel }}</span>
        <span v-if="rangeLabel" class="text-gray-400">({{ rangeLabel }})</span>
      </span>
      <button
        type="button"
        class="btn-icon print-hide ml-2"
        @click.prevent="handlePrint"
        :disabled="todoDateStore.loading"
        title="Print"
      >
        <i class="fas fa-print"></i>
      </button>
    </div>

    <div class="bg-white border rounded-md p-4 mb-4 print:border-0 print:rounded-none print:p-0">
      <template v-if="props.selfOnly">
        <div class="flex flex-wrap items-center gap-3">
          <div class="relative h-[32px] w-[170px]">
            <label
              for="month"
              class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 leading-none z-30"
              >Month</label
            >
            <input
              id="month"
              type="month"
              v-model="selectedMonth"
              class="border-2 border-gray-300 rounded px-3 h-[32px] text-sm w-full bg-white"
            />
          </div>
          <div class="text-xs text-blue-600 flex items-center gap-2">
            <i class="fas fa-user-lock"></i>
            Showing only my todos (Employee ID: {{ selfEmployeeId || 'loading...' }})
          </div>
        </div>
      </template>
      <template v-else>
        <EmployeeFilter
          ref="employeeFilterRef"
          v-model:company_id="filterState.companyId"
          v-model:department_id="filterState.departmentId"
          v-model:employee_id="filterState.employeeId"
          v-model:line_type="filterState.lineType"
          @filter-change="handleFilterChange"
        >
          <div class="relative h-[32px]">
            <label
              for="month"
              class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 leading-none z-30"
              >Month</label
            >
            <input
              id="month"
              type="month"
              v-model="selectedMonth"
              class="border-2 border-gray-300 rounded px-3 h-[32px] text-sm w-full bg-white"
            />
          </div>
        </EmployeeFilter>
      </template>
    </div>

    <div
      v-if="!reportReady"
      class="text-center text-gray-500 py-12 border bg-gray-50 rounded-md min-h-[60vh] flex flex-col items-center justify-center space-y-4"
    >
      <i class="fad fa-tasks text-4xl"></i>
      <div class="empty-state glass-panel">
        <p class="text-base font-semibold text-rose-500">Select company and month to view PAR.</p>
        <p class="text-sm text-gray-500">Use the filter set above to load records.</p>
      </div>
    </div>

    <LoaderView v-else-if="todoDateStore.loading">Loading report...</LoaderView>

    <div v-else class="space-y-4">
      <div
        class="bg-white border rounded-md shadow-sm print:shadow-none print:border-0 print:rounded-none px-4 py-3 flex flex-wrap gap-4"
      >
        <div class="text-sm text-gray-700">
          <div class="text-xs uppercase tracking-wide text-gray-500">Employees</div>
          <div class="font-semibold">{{ monthlyRows.length }}</div>
        </div>
        <div class="text-sm text-gray-700">
          <div class="text-xs uppercase tracking-wide text-gray-500">Todos (latest in month)</div>
          <div class="font-semibold">{{ aggregateTotals.totalTodos }}</div>
        </div>
        <div class="text-sm text-gray-700">
          <div class="text-xs uppercase tracking-wide text-gray-500">Completed</div>
          <div class="font-semibold text-green-600">{{ aggregateTotals.completed }}</div>
        </div>
        <div class="text-sm text-gray-700">
          <div class="text-xs uppercase tracking-wide text-gray-500">Working</div>
          <div class="font-semibold text-blue-600">{{ aggregateTotals.working }}</div>
        </div>
        <div class="text-sm text-gray-700">
          <div class="text-xs uppercase tracking-wide text-gray-500">Pending</div>
          <div class="font-semibold text-amber-600">{{ aggregateTotals.pending }}</div>
        </div>
      </div>

      <div
        v-if="monthlyRows.length === 0"
        class="text-center text-gray-500 py-12 border bg-gray-50 rounded-md"
      >
        No data available for the selected month.
      </div>

      <div
        v-for="(row, index) in monthlyRows"
        :key="row.user?.id || index"
        class="bg-white border rounded-md shadow-sm print:shadow-none print:border-0 print:rounded-none"
      >
        <div class="flex flex-wrap items-center gap-4 px-4 py-3 border-b bg-gray-50">
          <UserHoverBubble :user="row.user">
            <template #trigger="{ user }">
              <div class="flex items-center gap-3">
                <UserAvatar :user="user" size="medium" />
                <div>
                  <div class="font-semibold text-gray-800">
                    {{ user?.name || 'Unknown user' }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ user?.department?.name || '-' }}
                  </div>
                  <div class="text-[11px] text-gray-400">
                    Month: {{ monthLabel }} <span v-if="rangeLabel">({{ rangeLabel }})</span>
                  </div>
                </div>
              </div>
            </template>
          </UserHoverBubble>

          <div class="flex items-center gap-2 ml-auto text-xs md:text-sm">
            <span class="px-2 py-1 rounded-full bg-slate-100 text-gray-800 border border-slate-200">
              Total {{ row.totals.total }}
            </span>
            <span class="px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
              Done {{ row.totals.completed }}
            </span>
            <span class="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              Working {{ row.totals.working }}
            </span>
            <span class="px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
              Pending {{ row.totals.pending }}
            </span>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-sm border-separate border-spacing-0">
            <thead class="bg-gray-50 text-gray-600 uppercase tracking-wide text-xs">
              <tr class="border-b">
                <th class="px-4 py-3 border text-center w-12">sl</th>
                <th class="px-4 py-3 border text-left">Todo</th>
                <th class="px-4 py-3 border text-left">Last Activity Date</th>
                <th class="px-4 py-3 border text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="row.latestTodos.length === 0">
                <td colspan="5" class="px-4 py-6 text-center text-gray-400">
                  No activity recorded for this month.
                </td>
              </tr>
              <tr
                v-for="(todo, todoIndex) in row.latestTodos"
                :key="getTodoKey(todo)"
                class="border-b"
              >
                <td class="px-4 py-3 text-center border">{{ todoIndex + 1 }}</td>
                <td class="px-4 py-3 border">
                  <div class="font-semibold text-gray-800">{{ todo.title }}</div>
                  <div class="text-xs text-gray-500">
                    {{ todo.todo?.todoable?.title || '' }}
                  </div>
                </td>

                <td class="px-4 py-3 border text-xs text-gray-700">
                  {{ getDisplayDate(todo.date) || todo.date }}
                </td>
                <td class="px-4 py-3 border text-center">
                  <span
                    class="text-xs font-semibold px-2.5 py-1 rounded-full"
                    :class="statusClass(todo.status)"
                  >
                    {{ todo.status || 'N/A' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .print-hide {
    display: none !important;
  }
}
</style>
