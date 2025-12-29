<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import TodoReportHeading from '@/components/todo/TodoReportHeading.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { getDisplayDate, getYearMonthDayFormat } from '@/libs/datetime'
import { useAttendanceStore } from '@/stores/attendance'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useTodoDateStore } from '@/stores/useTodoDateStore'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const todoDateStore = useTodoDateStore()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const { companies } = storeToRefs(companyStore)
const { departments } = storeToRefs(departmentStore)
const headingRef = ref(null)

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
  return [...(headingRef.value?.employees || [])]
    .filter((emp) => {
      if (!filters.employeeId) return true
      return String(emp.id) === String(filters.employeeId)
    })
    .sort((a, b) => (a.user?.name || '').localeCompare(b.user?.name || ''))
    .map((employee) => {
      const userTodos = todoDateStore.todo_dates.filter(
        (todo) => String(todo.user?.id) === String(employee.id),
      )

      const byDate = {}

      userTodos.forEach((todo) => {
        const dateKey = todo.date || 'unknown-date'

        if (!byDate[dateKey]) {
          byDate[dateKey] = { date: dateKey, todos: [] }
        }

        byDate[dateKey].todos.push(todo)
      })

      let dates = Object.values(byDate)
        .map((d) => ({ ...d, rowSpan: d.todos.length }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))

      if (!dates.length) {
        dates = [
          {
            date: null,
            rowSpan: 1,
            todos: [{ id: `empty-${employee.id}`, isPlaceholder: true, title: '' }],
          },
        ]
      }

      const rowSpan = dates.reduce((sum, d) => sum + d.rowSpan, 0)

      return {
        user: employee,
        dates,
        rowSpan: Math.max(1, rowSpan),
      }
    })
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

const showAssignmentSummary = ref(false)
const assignmentSummaryRef = ref(null)
const selectedEmployeesCount = computed(() => groupedByUser.value?.length || 0)
const givenTodosCount = computed(() =>
  Math.max(
    0,
    selectedEmployeesCount.value - (todoAssignmentSummary.value?.withoutTodos?.length || 0),
  ),
)
const showWithoutTodos = ref(true)
const showTableWithoutTodos = ref(false)
const hideNoTodoRows = ref(false)
const tableNoTodosRef = ref(null)

const handleAssignmentOutsideClick = (event) => {
  if (!showAssignmentSummary.value) return
  if (!assignmentSummaryRef.value) return
  if (!assignmentSummaryRef.value.contains(event.target)) {
    showAssignmentSummary.value = false
  }
}

const todoAssignmentSummary = computed(() => {
  if (!groupedByUser.value?.length) return { withTodos: [], withoutTodos: [] }

  return groupedByUser.value.reduce(
    (acc, group, index) => {
      const totalTodos = group.dates.reduce(
        (sum, dateGroup) => sum + dateGroup.todos.filter((todo) => !todo.isPlaceholder).length,
        0,
      )

      const entry = {
        id:
          group.user?.id ??
          group.user?.user_id ??
          group.user?.uid ??
          group.user?.email ??
          `${group.user?.name || 'unknown'}-${index}`,
        name: group.user?.name || 'Unknown user',
      }

      if (totalTodos > 0) {
        acc.withTodos.push(entry)
      } else {
        acc.withoutTodos.push(entry)
      }
      return acc
    },
    { withTodos: [], withoutTodos: [] },
  )
})

const visibleGroupedByUser = computed(() => {
  if (!hideNoTodoRows.value) return groupedByUser.value

  const withoutSet = new Set(
    (todoAssignmentSummary.value.withoutTodos || []).map((u) => String(u.id ?? u.name ?? '')),
  )

  return groupedByUser.value.filter((group) => {
    const id =
      group.user?.id ??
      group.user?.user_id ??
      group.user?.uid ??
      group.user?.email ??
      group.user?.name ??
      ''
    return !withoutSet.has(String(id))
  })
})

function toggleHideNoTodos() {
  hideNoTodoRows.value = !hideNoTodoRows.value
  showTableWithoutTodos.value = hideNoTodoRows.value
}

const handleTableNoTodoOutsideClick = (event) => {
  if (!showTableWithoutTodos.value) return
  if (!tableNoTodosRef.value) return
  if (!tableNoTodosRef.value.contains(event.target)) {
    showTableWithoutTodos.value = false
  }
}

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

  fetchDateRangeAttendance()
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

const isOnlyOneDate = computed(() => filters.startDate === filters.endDate)

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

onMounted(() => {
  document.addEventListener('click', handleAssignmentOutsideClick, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleAssignmentOutsideClick, true)
})

onMounted(() => {
  document.addEventListener('click', handleTableNoTodoOutsideClick, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleTableNoTodoOutsideClick, true)
})

const attendanceStore = useAttendanceStore()
const dateRangeAttendance = ref([])
const loadingAttendance = ref(false)
const isStartEndDateSame = computed(() => filters.startDate === filters.endDate)

const fetchDateRangeAttendance = async () => {
  if (!filters.companyId || !filters.startDate || !filters.endDate || !isStartEndDateSame.value)
    return

  loadingAttendance.value = true
  try {
    const res = await attendanceStore.getDateRangeAttendanceSummary(
      filters.startDate,
      filters.endDate,
      filters.companyId,
      filters.lineType,
      filters.employeeId,
      true,
    )
    if (res) {
      dateRangeAttendance.value = res
    }
  } finally {
    loadingAttendance.value = false
  }
}

function getAttendanceByDate(userId, date) {
  const foundAttendance =
    dateRangeAttendance.value?.find(
      (attendance) => String(attendance.employee_id) === String(userId),
    ) || null
  if (foundAttendance) {
    if (!date && isStartEndDateSame.value) {
      return foundAttendance?.attendance[filters.startDate] || null
    }
    return foundAttendance?.attendance[date] || null
  }
  return null
}

function getAttendanceDetails(userId, date) {
  const attendance = getAttendanceByDate(userId, date)
  if (!attendance) {
    return {
      hasData: false,
      in: '-',
      out: '-',
      late: '-',
      early: '-',
      comment: '-',
    }
  }

  return {
    hasData: true,
    in: attendance.in || '-',
    out: attendance.out || '-',
    late: attendance.late || '-',
    early: attendance.early || '-',
    comment: attendance.comment || '-',
  }
}
</script>

<template>
  <div class="container print:flex-grow mx-auto print:w-full print:px-0 print:py-0">
    <TodoReportHeading
      ref="headingRef"
      :company-id="filters.companyId"
      :department-id="filters.departmentId"
      :employee-id="filters.employeeId"
      :line-type="filters.lineType"
      :start-date="filters.startDate"
      :end-date="filters.endDate"
      :loading="todoDateStore.loading"
      class="mb-4 print:px-0 print:py-0 print:mb-2 print:border-0 print:border-b print:border-gray-400 print:rounded-none print:w-full sticky top-[58px] z-50"
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

    <!-- <div>
      {{ groupedByUser }}
    </div> -->

    <div
      v-if="filters.companyId && filters.startDate && filters.endDate"
      class="bg-white border rounded-md mb-2 p-4 text-sm print:border-0 print:mb-2 print:px-0 print:w-full relative overflow-visible z-40"
    >
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-y-2 gap-x-6">
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

        <div ref="assignmentSummaryRef" class="print-hide relative">
          <button
            type="button"
            class="px-3 bg-white text-gray-700 hover:bg-gray-50 w-full text-bg text-right"
            @click="showAssignmentSummary = !showAssignmentSummary"
          >
            <div class="uppercase">Todo given</div>
            <div class="inline-flex items-center gap-5 font-bold">
              <div class="text-gray-700">{{ givenTodosCount }} / {{ selectedEmployeesCount }}</div>
              <i
                class="fas"
                :class="[showAssignmentSummary ? 'fa-chevron-up' : 'fa-chevron-down']"
              ></i>
            </div>
          </button>

          <div
            v-if="showAssignmentSummary"
            class="mt-2 w-[280px] sm:w-[320px] lg:w-[280px] xl:w-[320px] bg-white border border-gray-200 rounded-md p-3 shadow-lg text-left absolute right-0"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="text-xs text-gray-500 uppercase tracking-wide">Todo Status</div>
              <div class="text-[11px] text-gray-500">
                {{ givenTodosCount }} given / {{ selectedEmployeesCount }} selected
              </div>
            </div>

            <div class="space-y-3 max-h-56 overflow-auto pr-1 z-50">
              <div class="pt-2 border-t border-dashed border-gray-200">
                <div
                  class="text-[11px] text-gray-500 uppercase tracking-wide mb-1 flex items-center justify-between"
                >
                  <div class="flex items-center gap-2">
                    <span>Not given todos</span>
                    <span
                      v-if="todoAssignmentSummary.withoutTodos?.length"
                      class="bg-red-500 rounded-md px-1.5 text-white text-center"
                      >{{ todoAssignmentSummary.withoutTodos?.length }}</span
                    >
                  </div>
                  <button
                    type="button"
                    class="text-[10px] px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                    @click="showWithoutTodos = !showWithoutTodos"
                  >
                    {{ showWithoutTodos ? 'Hide' : 'Show' }}
                  </button>
                </div>
                <template v-if="showWithoutTodos">
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-if="!todoAssignmentSummary.withoutTodos.length"
                      class="text-xs text-gray-400"
                    >
                      Everyone has todos
                    </span>
                    <span
                      v-for="user in todoAssignmentSummary.withoutTodos"
                      :key="`without-${user.id}`"
                      class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-100 text-xs max-w-full"
                      :title="user.name"
                    >
                      <i class="fas fa-exclamation-circle"></i>
                      <span class="block max-w-[160px] truncate">{{ user.name }}</span>
                    </span>
                  </div>
                </template>
              </div>

              <div>
                <div class="text-[11px] text-gray-500 uppercase tracking-wide mb-1">
                  Given todos
                  <span
                    v-if="todoAssignmentSummary.withTodos?.length"
                    class="bg-green-500 rounded-md px-1.5 text-white text-center"
                    >{{ todoAssignmentSummary.withTodos?.length }}</span
                  >
                </div>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-if="!todoAssignmentSummary.withTodos.length"
                    class="text-xs text-gray-400"
                  >
                    No todos assigned
                  </span>
                  <span
                    v-for="user in todoAssignmentSummary.withTodos"
                    :key="`with-${user.id}`"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 text-xs max-w-full"
                    :title="user.name"
                  >
                    <i class="fas fa-check-circle"></i>
                    <span class="block max-w-[160px] truncate">{{ user.name }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- <pre>
      {{ headingRef?.employees }}
    </pre> -->

    <div
      v-if="!filters.companyId || !filters.startDate || !filters.endDate"
      class="text-center text-gray-500 py-12 border bg-gray-50 rounded-md"
    >
      <p class="text-red-500">Select company and date range to view the report.</p>
    </div>
    <LoaderView v-else-if="todoDateStore.loading">Loading report...</LoaderView>
    <div
      v-else
      class="overflow-x-auto md:overflow-clip bg-white border border-t-0 rounded-md shadow-sm print:shadow-none print:rounded-none print:border-gray-400"
    >
      <table class="min-w-full text-left text-sm border-separate border-spacing-0">
        <thead class="bg-gray-50 text-gray-600 uppercase tracking-wide text-xs">
          <tr class="border-y print:border-gray-400 sticky md:top-[123px] z-30 rounded-t-md">
            <th
              class="px-4 py-3 border w-[10px] bg-white bg-opacity-70 backdrop-blur-sm rounded-tl-md print:rounded-tl-none text-center"
            >
              sl
            </th>
            <th
              class="px-4 py-3 border md:w-[100px] print:w-auto print:border-l print:border-l-gray-400 bg-white bg-opacity-70 backdrop-blur-sm text-center whitespace-nowrap"
            >
              <div class="flex items-center justify-between gap-2">
                <span>Employee Name</span>
                <div
                  class="relative hidden md:block print:hidden"
                  ref="tableNoTodosRef"
                  v-if="!filters.employeeId"
                >
                  <button
                    type="button"
                    class="text-[11px] px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                    @click.stop="toggleHideNoTodos()"
                  >
                    No Todos ({{ todoAssignmentSummary.withoutTodos.length }})
                    <span class="ml-1 text-[10px] text-gray-500">
                      {{ hideNoTodoRows ? 'Hidden' : 'Showing' }}
                    </span>
                  </button>
                </div>
              </div>
            </th>
            <th
              v-if="!isOnlyOneDate"
              class="px-4 py-3 border bg-white bg-opacity-70 backdrop-blur-sm text-center"
            >
              Date
            </th>
            <th class="px-4 py-3 border bg-white text-center">Todo</th>
            <th
              class="px-4 py-3 border print:border-r print:border-gray-400 bg-white bg-opacity-70 backdrop-blur-sm text-center rounded-tr-md print:rounded-tr-none"
            >
              Status
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-if="visibleGroupedByUser.length === 0">
            <td :colspan="isOnlyOneDate ? 4 : 5" class="px-4 py-6 text-center text-gray-500">
              <div>
                <i class="fas fa-tasks fa-2x text-gray-300 mb-2"></i>
              </div>
              <div>No todos.</div>
            </td>
          </tr>
          <template
            v-for="(userGroup, userIndex) in visibleGroupedByUser"
            :key="userGroup.user?.id || (userGroup.dates[0]?.todos[0]?.id ?? Math.random())"
          >
            <template
              v-for="(dateGroup, dateIndex) in userGroup.dates"
              :key="`${userGroup.user?.id || 'u'}-${dateGroup.date}`"
            >
              <template
                v-for="(todo, todoIndex) in dateGroup.todos"
                :key="
                  todo.id ||
                  `${userGroup.user?.id || 'u'}-${dateGroup.date || 'empty'}-${todoIndex}`
                "
              >
                <tr class="border odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                  <td
                    v-if="dateIndex === 0 && todoIndex === 0"
                    :rowspan="userGroup.rowSpan || 1"
                    class="px-4 py-3 align-top font-bold text-xl text-gray-800 whitespace-nowrap border-l border-t bg-white"
                  >
                    <div class="sticky top-[180px] bg-white text-center">
                      {{ userIndex + 1 }}
                    </div>
                  </td>

                  <td
                    v-if="dateIndex === 0 && todoIndex === 0"
                    :rowspan="userGroup.rowSpan || 1"
                    class="px-4 py-3 align-top font-medium text-gray-800 whitespace-nowrap border-l border-t bg-white"
                  >
                    <div class="sticky top-[180px] bg-white flex">
                      <UserAvatar
                        size="medium"
                        :user="userGroup.user"
                        class="inline-block mr-2 align-middle"
                      />
                      <div>
                        <div>{{ userGroup.user?.name || 'Unknown user' }}</div>
                        <div v-if="userGroup.user?.department?.name" class="text-xs text-gray-500">
                          {{ userGroup.user?.department?.name }}
                        </div>
                        <!-- <div
                          v-if="userGroup.user?.department?.company?.name"
                          class="text-[11px] text-gray-400"
                        >
                          {{ userGroup.user?.department?.company?.name }}
                        </div> -->
                      </div>
                    </div>
                  </td>
                  <template v-if="todo.isPlaceholder">
                    <td
                      class="border-l border-t border-r bg-white px-3 py-3 text-center"
                      :colspan="isOnlyOneDate ? 2 : 3"
                    >
                      <div
                        class="flex items-center justify-center gap-2 text-red-600 text-sm font-medium"
                      >
                        <i class="far fa-clipboard-list text-red-400"></i>
                        <span>No todos assigned.</span>
                      </div>
                      <template v-if="isStartEndDateSame">
                        <div v-if="loadingAttendance" class="text-[11px] text-gray-500 mt-2">
                          Loading attendance…
                        </div>
                        <template
                          v-else
                          v-for="attendance in [
                            getAttendanceDetails(userGroup?.user?.id, dateGroup?.date),
                          ]"
                          :key="attendance.comment"
                        >
                          <div
                            class="md:w-[360px] lg:w-[500px] mt-3 text-[11px] text-red-600 bg-gray-50 border border-dashed border-red-200 rounded-lg p-2.5 text-left inline-block min-w-[220px] align-top"
                          >
                            <div
                              class="flex items-center gap-1.5 text-gray-700 font-semibold text-xs"
                            >
                              <i class="far fa-user-clock text-indigo-500 text-sm"></i>
                              <span>Attendance</span>
                            </div>
                            <div
                              v-if="attendance.hasData"
                              class="mt-2 grid grid-cols-2 md:grid-cols-5 gap-1.5"
                            >
                              <div
                                class="gap-1 flex items-center justify-between rounded-full bg-indigo-50 border border-indigo-100 px-2 py-1.5"
                              >
                                <span class="text-[10px] uppercase text-gray-500 tracking-wide"
                                  >In</span
                                >
                                <span
                                  class="font-semibold text-indigo-700 text-xs whitespace-nowrap"
                                  >{{ attendance.in }}</span
                                >
                              </div>
                              <div
                                class="gap-1 flex items-center justify-between rounded-full bg-sky-50 border border-sky-100 px-2 py-1.5"
                              >
                                <span class="text-[10px] uppercase text-gray-500 tracking-wide"
                                  >Out</span
                                >
                                <span
                                  class="font-semibold text-sky-700 text-xs whitespace-nowrap"
                                  >{{ attendance.out }}</span
                                >
                              </div>
                              <div
                                class="gap-1 flex items-center justify-between rounded-full bg-amber-50 border border-amber-100 px-2 py-1.5"
                              >
                                <span class="text-[10px] uppercase text-gray-500 tracking-wide"
                                  >Late</span
                                >
                                <span
                                  class="font-semibold text-amber-700 text-xs whitespace-nowrap"
                                >
                                  {{ attendance.late }}
                                </span>
                              </div>
                              <div
                                class="gap-1 flex items-center justify-between rounded-full bg-emerald-50 border border-emerald-100 px-2 py-1.5"
                              >
                                <span class="text-[10px] uppercase text-gray-500 tracking-wide"
                                  >Early</span
                                >
                                <span
                                  class="font-semibold text-emerald-700 text-xs whitespace-nowrap"
                                >
                                  {{ attendance.early }}
                                </span>
                              </div>
                              <div
                                class="text-center flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 px-2 py-1.5 md:col-span-1 col-span-2"
                              >
                                <span
                                  class="font-semibold text-slate-800 text-xs text-right whitespace-nowrap"
                                  >{{ attendance.comment }}</span
                                >
                              </div>
                            </div>
                            <div v-else class="mt-1 text-gray-500">
                              Attendance data unavailable.
                            </div>
                          </div>
                        </template>
                      </template>
                    </td>
                  </template>
                  <template v-else>
                    <td
                      v-if="todoIndex === 0 && !isOnlyOneDate"
                      :rowspan="dateGroup.rowSpan || 1"
                      class="px-4 py-3 align-top text-xs text-gray-700 whitespace-nowrap border-l border-t bg-white"
                    >
                      <div class="sticky top-[180px] bg-white">
                        {{ getDisplayDate(dateGroup.date) || dateGroup.date || '-' }}
                      </div>
                    </td>

                    <td class="px-4 py-3 text-gray-800 border-l border-t">
                      <div class="font-medium">
                        <span class="text-gray-400 mr-2">{{ todoIndex + 1 }}.</span>
                        {{ todo.title }}
                      </div>
                      <div class="text-xs text-gray-500">
                        {{ todo.todoable?.title || todo.todoable_type?.split('\\').pop() || '' }}
                      </div>
                    </td>

                    <td class="px-4 py-3 border-l border-t border-r text-center">
                      <span
                        class="text-xs font-semibold px-2.5 py-1 rounded-full"
                        :class="statusClass(todo.status)"
                      >
                        {{ todo.status || 'N/A' }}
                      </span>
                    </td>
                  </template>
                </tr>
              </template>
            </template>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
