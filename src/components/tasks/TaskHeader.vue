<script setup>
import { getTaskEmployees } from '@/services/task'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import CompanyDepartmentSelectInput from '../common/CompanyDepartmentSelectInput.vue'
import EmployeeDropdownInput from '../EmployeeDropdownInput.vue'
import SearchInput from '../SearchInput.vue'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  listHasRearranged: { type: Boolean, default: false },
  isMyTask: { type: Boolean, default: false },
})

const auth = useAuthStore()

const route = useRoute()

const companyId = computed(setAndGetModelValue('company-id'))
const fromDepartmentId = computed(setAndGetModelValue('from-department-id'))
const toDepartmentId = computed(setAndGetModelValue('to-department-id'))
const selectedEmployeeId = computed(setAndGetModelValue('user-ids'))
const month = computed(setAndGetModelValue('month'))
const taskStatus = computed(setAndGetModelValue('status'))
const isImportant = computed(setAndGetModelValue('is-important'))
const isUrgent = computed(setAndGetModelValue('is-urgent'))
const isTarget = computed(setAndGetModelValue('is-target'))
const isClosed = computed(setAndGetModelValue('is-closed'))
const search = computed(setAndGetModelValue('search'))

const emit = defineEmits([
  'update:modelValue',
  'clickPrioritySave',
  'clickPriorityDiscard',
  'clickAddTask',
])

const companyStore = useCompanyStore()
// const { employees } = storeToRefs(companyStore)

const employees = ref([])

function setAndGetModelValue(key) {
  return {
    get: () => props.modelValue[key] || '',
    set: (value) => {
      emit('update:modelValue', { ...props.modelValue, [key]: value || undefined })
    },
  }
}

const selectedEmployee = computed(() => getEmployee(selectedEmployeeId.value))

async function loadEmployeesByDepartment() {
  if (!props.isMyTask) {
    const company_id = props.modelValue?.['company-id']
    const department_id = toDepartmentId.value

    const params = {
      ...(company_id ? { company_id } : {}),
      ...(department_id ? { department_ids: [department_id] } : {}),
    }

    employees.value = (await getTaskEmployees({ params }))?.data?.employees || []
  }
}

onMounted(async () => {
  await companyStore.fetchCompanies({
    with: 'departments',
    ignore_permission: true,
  })

  await companyStore.fetchMyCompanies({
    with: 'departments',
  })

  await loadEmployeesByDepartment()
})

function getEmployee(employeeId) {
  if (!Array.isArray(employees.value)) {
    return null
  }
  return employees.value.find((emp) => emp.id == employeeId) || null
}

function handleUserDeSelect() {
  selectedEmployeeId.value = ''
}

watch(() => toDepartmentId.value, loadEmployeesByDepartment)

watch(
  () => companyId.value,
  () => {
    fromDepartmentId.value = ''
    toDepartmentId.value = ''

    //loadEmployeesByDepartment()
  },
)

function getFilteringView(filteredValue, items, { value, id, label, onCancel } = {}) {
  if (!filteredValue) {
    return []
  }

  const item = Array.isArray(items) ? items.find((item) => item?.[id] == filteredValue) : null

  if (!item) {
    return []
  }

  return [
    {
      label,
      value: typeof value == 'function' ? value(item) : item?.[value],
      id: item?.[id],
      onCancel,
    },
  ]
}

const filteringItems = computed(() => {
  const all_departments = companyStore.companies.reduce(
    (departments, company) => [...departments, ...company.departments],
    [],
  )

  const checkBoxView = (checked, { label, value, id, onCancel }) => {
    if (!checked) {
      return []
    }

    return [
      {
        label,
        value,
        id,
        onCancel,
      },
    ]
  }
  const monthView = (month, { label, onCancel }) => {
    if (!month) {
      return []
    }

    const d = new Date(month)

    return [
      {
        label,
        value: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), // e.g., "July 2025"
        id: month,
        onCancel,
      },
    ]
  }

  return [
    ...getFilteringView(companyId.value, companyStore.companies, {
      label: 'Company',
      value: 'short_name',
      id: 'id',
      onCancel: () => {
        companyId.value = ''
      },
    }),
    ...getFilteringView(fromDepartmentId.value, all_departments, {
      id: 'id',
      label: 'From',
      value: (dept) => dept.short_name || dept.name,
      onCancel: () => {
        fromDepartmentId.value = ''
      },
    }),
    ...getFilteringView(toDepartmentId.value, all_departments, {
      id: 'id',
      label: 'To',
      value: (dept) => dept.short_name || dept.name,
      onCancel: () => {
        toDepartmentId.value = ''
      },
    }),
    ...getFilteringView(selectedEmployee.value?.id, employees.value, {
      label: 'Employee',
      value: 'name',
      id: 'id',
      onCancel: handleUserDeSelect,
    }),
    ...getFilteringView(
      taskStatus.value,
      [
        { id: 'only-completed', name: 'Completed Only' },
        { id: 'not-completed', name: 'Not Completed' },
      ],
      {
        label: '',
        value: 'name',
        id: 'id',
        onCancel: () => {
          taskStatus.value = ''
        },
      },
    ),
    ...checkBoxView(isImportant.value, {
      label: '',
      value: 'Important ',
      id: true,
      onCancel: () => {
        isImportant.value = ''
      },
    }),
    ...checkBoxView(isUrgent.value, {
      label: '',
      value: 'Urgent ',
      id: true,
      onCancel: () => {
        isUrgent.value = ''
      },
    }),
    ...checkBoxView(isTarget.value, {
      label: '',
      value: 'Targeted Task',
      id: true,
      onCancel: () => {
        isTarget.value = ''
      },
    }),
    ...monthView(month.value, {
      label: '',
      onCancel: () => {
        month.value = ''
      },
    }),
  ]
})

const companyDepartments = computed(() => {
  if (!companyId.value) {
    return companyStore?.companies
  }

  return companyStore?.companies.filter((c) => c.id == companyId.value)
})
</script>

<template>
  <div>
    <div class="mb-4">
      <div class="flex items-start justify-between gap-4 border-b mb-6">
        <h2 class="text-xl font-semibold text-slate-800 flex items-center gap-3 mb-2">
          <i class="fad fa-tasks text-sky-600"></i>
          <span>{{ isClosed ? 'Closed' : '' }} Task List</span>
        </h2>

        <div v-if="!isMyTask" class="ml-auto">
          <button
            @click="emit('clickAddTask')"
            class="inline-flex items-center gap-2 px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-md shadow-sm text-sm"
          >
            <i class="fad fa-plus-circle"></i>
            <span>Add Task</span>
          </button>
        </div>
      </div>
      <!-- {{ employees }} -->

      <div class="flex flex-wrap items-center gap-3 mt-3">
        <div class="flex flex-wrap flex-grow gap-4 items-center">
          <CompanyDepartmentSelectInput
            v-model="fromDepartmentId"
            :companies="companyDepartments || []"
            class="relative w-full md:w-48"
            :className="{ select: 'h-8 text-sm border border-gray-200 bg-white' }"
            defaultOption="--ALL DEPARTMENT--"
          >
            <template #label>
              <div
                class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 leading-none z-30"
              >
                Task From Department
              </div>
            </template>
          </CompanyDepartmentSelectInput>

          <template v-if="!isMyTask">
            <CompanyDepartmentSelectInput
              v-model="toDepartmentId"
              :companies="companyDepartments || []"
              class="relative w-full md:w-40 flex-grow"
              :className="{ select: 'h-8 text-sm border border-gray-200 bg-white' }"
              v-if="route.name !== 'MyRequirementTaskList'"
              defaultOption="--ALL DEPARTMENT--"
            >
              <template #label>
                <div
                  class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 leading-none z-30"
                >
                  Task To Department
                </div>
              </template>
            </CompanyDepartmentSelectInput>

            <div
              class="relative w-full md:w-56 lg:flex-grow"
              v-if="auth.isAdminMood && auth?.user?.role !== 'employee'"
            >
              <!-- <SelectDropdown v-model="selectedEmployeeId" :options="employees" /> -->
              <div class="relative">
                <EmployeeDropdownInput
                  :employees="employees"
                  v-model="selectedEmployeeId"
                  class="border border-gray-200 rounded h-8 w-full bg-white text-sm"
                />
                <div
                  class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 leading-none z-30"
                >
                  Employee
                </div>
              </div>

              <label class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 z-50">
                Employee
              </label>
            </div>
          </template>

          <div class="w-32 relative h-8">
            <label class="absolute text-xs left-3 -top-1.5 bg-white text-sky-600">Status</label>
            <select
              v-model="taskStatus"
              class="h-full text-sm px-2 text-gray-700 border border-gray-200 rounded-md w-full"
            >
              <option value="">--ALL TASKS--</option>
              <option value="not-completed">Not Completed</option>
              <option value="only-completed">Completed</option>
            </select>
          </div>
          <div class="flex gap-4 items-center flex-shrink-0 text-sm">
            <label class="flex items-center gap-2">
              <input type="checkbox" v-model="isImportant" class="accent-sky-600" />
              <span>Important</span>
            </label>
            <label class="flex items-center gap-2">
              <input type="checkbox" v-model="isUrgent" class="accent-sky-600" />
              <span>Urgent</span>
            </label>
            <label class="flex items-center gap-2">
              <input type="checkbox" v-model="isTarget" class="accent-sky-600" />
              <span>Is Target</span>
            </label>
            <label
              :class="[
                'flex items-center gap-2 px-2 rounded h-8',
                isClosed ? 'bg-sky-800 text-white' : 'text-sky-800 border border-sky-200',
              ]"
            >
              <input type="checkbox" v-model="isClosed" class="accent-sky-600" />
              <span>Closed</span>
            </label>
          </div>

          <!-- <div class="text-gray-600 w-full md:w-32 relative xl:ml-auto">
            <label class="absolute text-xs left-2.5 -top-1.5 bg-white text-sky-600">Month</label>
            <input
              id="month-filter"
              v-model="month"
              type="month"
              class="h-8 text-sm px-2 text-gray-700 border border-gray-200 rounded-md w-full"
              placeholder="All month"
            />
          </div> -->
        </div>
        <SearchInput
          v-model="search"
          class="w-full md:w-64 lg:w-64 md:ml-auto h-8"
          v-if="isMyTask"
        />
      </div>
    </div>

    <div class="flex flex-col lg:flex-row mb-2 items-center gap-4 sticky top-[4.1rem] z-40 mt-6">
      <SearchInput v-model="search" class="w-full md:w-64 md:ml-auto" v-if="!isMyTask" />

      <div class="flex items-center gap-3 flex-grow flex-wrap">
        <div
          v-for="filtering in filteringItems"
          :key="filtering.label || filtering.value"
          class="inline-flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1"
        >
          <!-- <legend class="text-[9px] text-green-800">
          {{ filtering.label }}
        </legend> -->
          <div>
            <span class="text-[9px] text-green-800" v-if="filtering.label">
              {{ filtering.label }}: </span
            >{{ filtering.value }}
          </div>
          <button
            type="button"
            class="text-gray-400 hover:text-red-500"
            @click.prevent="filtering.onCancel"
          >
            <i class="fas fa-times-circle"></i>
          </button>
        </div>
      </div>
      <div class="flex justify-end gap-3" v-if="!isMyTask">
        <RouterLink
          class="text-xs sm:text-sm px-3 py-1 rounded border"
          :class="
            route.query?.view === 'userwise'
              ? 'bg-sky-600 text-white border-sky-600'
              : 'bg-white text-slate-700'
          "
          :to="{ query: { ...route.query, view: 'userwise' } }"
        >
          User Wise List
        </RouterLink>
        <RouterLink
          class="text-xs sm:text-sm px-3 py-1 rounded border"
          :class="
            route.query?.view !== 'userwise'
              ? 'bg-sky-600 text-white border-sky-600'
              : 'bg-white text-slate-700'
          "
          :to="{
            query: {
              ...Object.keys(route?.query || {})
                .filter((k) => route?.query[k] !== 'userwise')
                .reduce((acc, k) => ({ ...acc, [k]: route.query[k] }), {}),
            },
          }"
        >
          Department Wise List
        </RouterLink>
      </div>
    </div>
  </div>
</template>
