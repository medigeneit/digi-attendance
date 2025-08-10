<script setup>
import Multiselect from '@/components/MultiselectDropdown.vue'
import { getTaskEmployees } from '@/services/task'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import CompanyDepartmentSelectInput from '../common/CompanyDepartmentSelectInput.vue'
import SearchInput from '../SearchInput.vue'
import UserChip from '../user/UserChip.vue'

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
  await loadEmployeesByDepartment()

  await companyStore.fetchCompanies({
    with: 'departments',
    ignore_permission: true,
  })

  await companyStore.fetchMyCompanies({
    with: 'departments',
  })
})

function getEmployee(employeeId) {
  if (!Array.isArray(employees.value)) {
    return null
  }
  return employees.value.find((emp) => emp.id == employeeId) || null
}

function handleUserSelect(emp) {
  selectedEmployeeId.value = emp?.id || ''
}

function handleUserDeSelect() {
  selectedEmployeeId.value = ''
}

watch(() => toDepartmentId.value, loadEmployeesByDepartment)

watch(
  () => companyId.value,
  () => {
    if (toDepartmentId.value !== '') {
      toDepartmentId.value = ''
    } else {
      loadEmployeesByDepartment()
    }
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
      value: item?.[value],
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
      label: 'From',
      value: 'short_name',
      id: 'id',
      onCancel: () => {
        fromDepartmentId.value = ''
      },
    }),
    ...getFilteringView(toDepartmentId.value, all_departments, {
      label: 'To',
      value: 'short_name',
      id: 'id',
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
</script>

<template>
  <div class="mb-3 task-header">
    <div class="flex justify-between items-start mb-4">
      <h2 class="text-2xl font-bold text-gray-800 leading-none h-10">Task List</h2>

      <div class="ml-auto flex gap-6 items-center" v-if="!isMyTask">
        <div v-if="listHasRearranged" class="flex gap-2 items-center">
          <span class="text-red-500">Priority Changed</span>
          <button class="btn-3" @click.prevent="emit('clickPrioritySave')">Save</button>
          <button class="btn-3" @click.prevent="emit('clickPriorityDiscard')">Discard</button>
        </div>
        <button @click="emit('clickAddTask')" class="btn-1">Add Main Task / Project</button>
      </div>
    </div>
    <!-- {{ employees }} -->

    <div class="flex flex-wrap items-center justify-center gap-2 mt-3">
      <div class="flex flex-wrap gap-x-4 gap-y-3 justify-between">
        <template v-if="!isMyTask">
          <div class="relative w-full md:w-48 flex-grow">
            <label class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 z-50">
              Company
            </label>

            <select
              v-model="companyId"
              class="h-8 text-xs px-2 text-gray-600 border-2 border-gray-400 rounded-md w-full"
            >
              <option value="">--ALL COMPANY--</option>
              <option
                v-for="company in companyStore?.myCompanies"
                :key="company.id"
                :value="company.id"
              >
                {{ company.name }}
              </option>
            </select>
          </div>

          <CompanyDepartmentSelectInput
            v-model="fromDepartmentId"
            :companies="companyStore?.companies || []"
            class="relative w-full md:w-40 flex-grow"
            :className="{ select: 'h-8 text-xs px-2 text-gray-600 border-2 border-gray-400' }"
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
            :companies="companyStore?.myCompanies || []"
            class="relative w-full md:w-40 flex-grow"
            :className="{
              select: 'h-8 text-xs px-2 text-gray-600  border-2 border-gray-400  ',
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
            <Multiselect
              :modelValue="selectedEmployee"
              @select="handleUserSelect"
              @remove="handleUserDeSelect"
              :options="employees"
              :multiple="false"
              label="name"
              label-prefix="id"
              placeholder="--ALL EMPLOYEES--"
              class="text-gray-600 w-full relative text-xs"
            >
              <template #option="{ option }">
                <UserChip :user="option" class="w-full line-clamp-1" />
              </template>
            </Multiselect>
            <div
              class="absolute right-8 text-xl top-0 bottom-0 flex items-center"
              v-if="selectedEmployee"
            >
              <button
                @click.prevent="handleUserDeSelect"
                class="mt-0.5 text-gray-500 hover:text-red-700"
              >
                &times;
              </button>
            </div>
            <label class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 z-50">
              Employee
            </label>
          </div>
        </template>

        <div class="w-32 relative h-8">
          <label class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500">Status</label>
          <select
            v-model="taskStatus"
            class="h-8 text-xs px-2 text-gray-600 border-2 border-gray-400 rounded-md w-full"
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
          <label class="absolute text-xs left-2.5 -top-1.5 bg-slate-100 text-blue-500">Month</label>
          <input
            id="month-filter"
            v-model="month"
            type="month"
            class="h-8 text-xs px-2 text-gray-600 border-2 border-gray-400 rounded-md w-full"
            placeholder="All month"
          />
        </div>
      </div>

      <SearchInput v-model="search" class="w-full md:w-64 lg:w-64 md:ml-auto" v-if="isMyTask" />
    </div>
  </div>

  <div class="flex flex-col md:flex-row mb-2 md:mb-4 items-end mt-6 gap-6">
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
