<script setup>
import { getTaskEmployees } from '@/services/task'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import CompanyDepartmentSelectInput from '../common/CompanyDepartmentSelectInput.vue'
import EmployeeDropdownInput from '../EmployeeDropdownInput.vue'
import SearchInput from '../SearchInput.vue'
import SelectDropdown from '../SelectDropdown.vue'

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
    <div class="mb-3 task-header">
      <div class="flex justify-between items-start mb-4">
        <h2 class="text-2xl font-bold text-gray-800 leading-none h-10">Task List</h2>

        <div class="ml-auto flex gap-6 items-center" v-if="!isMyTask">
          <!--
          <div v-if="listHasRearranged" class="flex gap-2 items-center">
            <span class="text-red-500">Priority Changed</span>
            <button class="btn-3" @click.prevent="emit('clickPrioritySave')">Save</button>
            <button class="btn-3" @click.prevent="emit('clickPriorityDiscard')">Discard</button>
          </div>
          -->
          <button @click="emit('clickAddTask')" class="btn-1">Add Main Task / Project</button>
        </div>
      </div>
      <!-- {{ employees }} -->

      <div class="flex flex-wrap items-center justify-center gap-2 mt-3">
        <div class="flex flex-wrap gap-x-4 gap-y-3 justify-between">
          <template v-if="!isMyTask">
            <div class="relative">
              <SelectDropdown
                v-model="companyId"
                :options="companyStore?.companies || []"
                label="name"
                id="id"
                class="border-2 border-gray-300 rounded h-[40px] w-full md:w-48 bg-white text-sm"
                clearable
              >
                <template #selected-option="{ option }">
                  <div class="line-clamp-1 text-sm text-gray-900" :title="option?.name">
                    <span v-if="option?.name">{{ option?.name }}</span>
                    <span v-else class="text-gray-500 whitespace-nowrap">--Select Company--</span>
                  </div>
                </template>
              </SelectDropdown>
              <div
                class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 leading-none z-30"
              >
                Company
              </div>
            </div>

            <CompanyDepartmentSelectInput
              v-model="fromDepartmentId"
              :companies="companyDepartments || []"
              class="relative w-full md:w-40 flex-grow"
              :className="{ select: 'h-10 text-sm border-2 border-gray-300' }"
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

            <CompanyDepartmentSelectInput
              v-model="toDepartmentId"
              :companies="companyDepartments || []"
              class="relative w-full md:w-40 flex-grow"
              :className="{
                select: 'h-10 text-sm border-2 border-gray-300  ',
              }"
              v-if="route.name !== 'MyTaskList'"
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
                  class="border-2 border-gray-300 rounded h-[40px] w-full bg-white !text-sm"
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

          <div class="w-32 relative h-10">
            <label class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500"
              >Status</label
            >
            <select
              v-model="taskStatus"
              class="h-full text-xs px-2 text-gray-600 border-2 border-gray-400 rounded-md w-full"
            >
              <option value="">--ALL TASKS--</option>
              <option value="not-completed">Not Completed</option>
              <option value="only-completed">Completed</option>
            </select>
          </div>

          <div class="flex gap-4 items-center flex-shrink-0">
            <label class="flex gap-2">
              <input type="checkbox" v-model="isImportant" />
              <span>Important</span>
            </label>
            <label class="flex gap-2">
              <input type="checkbox" v-model="isUrgent" />
              <span>Urgent</span>
            </label>
            <label class="flex gap-2">
              <input type="checkbox" v-model="isTarget" />
              <span>Is Target</span>
            </label>
          </div>

          <div class="text-gray-600 w-full md:w-32 relative">
            <label class="absolute text-xs left-2.5 -top-1.5 bg-slate-100 text-blue-500"
              >Month</label
            >
            <input
              id="month-filter"
              v-model="month"
              type="month"
              class="h-10 text-xs px-2 text-gray-600 border-2 border-gray-400 rounded-md w-full"
              placeholder="All month"
            />
          </div>
        </div>

        <SearchInput v-model="search" class="w-full md:w-64 lg:w-64 md:ml-auto" v-if="isMyTask" />
      </div>
    </div>

    <div
      class="flex flex-col md:flex-row mb-2 md:mb-4 items-end mt-6 gap-6 sticky top-[4.1rem] z-40 bg-white/80 py-2"
    >
      <SearchInput v-model="search" class="w-full md:w-64 md:ml-auto" v-if="!isMyTask" />

      <div class="flex items-center gap-3 flex-grow flex-wrap justify-center">
        <div
          v-for="filtering in filteringItems"
          :key="filtering.label || filtering.value"
          class="flex-shrink-0 text-xs bg-gray-50 border border-gray-300 rounded-md px-2 flex gap-1"
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
            class="text-gray-400 hover:text-red-400"
            @click.prevent="filtering.onCancel"
          >
            <i class="fas fa-times-circle"></i>
          </button>
        </div>
      </div>

      <div class="flex justify-end gap-5" v-if="!isMyTask">
        <RouterLink
          class="text-xs sm:text-sm btn-3 py-0.5 flex-shrink-0"
          :class="route.query?.view === 'userwise' ? 'bg-blue-500 text-white' : ''"
          :to="{
            query: {
              ...route.query,
              view: 'userwise',
            },
          }"
        >
          User Wise List
        </RouterLink>
        <RouterLink
          class="text-xs sm:text-sm btn-3 py-0.5 flex-shrink-0"
          :class="route.query?.view !== 'userwise' ? 'bg-blue-500 text-white' : ''"
          :to="{
            query: {
              ...Object.keys(route?.query || {})
                .filter((k) => route?.query[k] !== 'userwise')
                .reduce((acc, k) => ({ ...acc, [k]: route.query[k] }), {}),
            },
          }"
        >
          TaskWise List
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style>
.task-header .input-1 {
  @apply h-8 px-1.5 text-sm;
}

.task-header .multiselect {
  box-sizing: border-box;
  @apply bg-green-300 h-8 min-h-8;
}

.task-header .multiselect .multiselect__placeholder {
  @apply inline text-sm;
}

.task-header .multiselect .multiselect__select {
  @apply leading-none h-5 w-6;
}

/* .task-header .multiselect .multiselect__select::before {
  @apply top-0;
} */

.task-header .multiselect .multiselect__input {
  @apply text-sm;
}

.task-header .multiselect .multiselect__single {
  @apply text-sm;
}

/* .task-header .multiselect .multiselect__content-wrapper {
  @apply top-[102%] left-[-1%];
} */

.task-header .multiselect__tags {
  @apply h-full min-h-full   p-1.5 pr-6;
}
.task-header .multiselect__option::after {
  content: '';
}

.task-header .multiselect__option {
  @apply p-1 mb-1;
}

.task-header .multiselect__option--highlight {
  @apply bg-sky-100;
}

.task-header ul.multiselect__content {
  @apply p-1 mb-1 w-full;
}

.task-header .multiselect__element .multiselect__option--selected {
  @apply bg-blue-200;
}
</style>
