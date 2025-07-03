<script setup>
import Multiselect from '@/components/MultiselectDropdown.vue'
import { useCompanyStore } from '@/stores/company'
import { storeToRefs } from 'pinia'
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import CompanyDepartmentSelectInput from '../common/CompanyDepartmentSelectInput.vue'
import UserChip from '../user/UserChip.vue'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  listHasRearranged: { type: Boolean, default: false },
})

const route = useRoute()

const fromDepartmentId = computed(setAndGetModelValue('from-department-id'))
const toDepartmentId = computed(setAndGetModelValue('to-department-id'))
const selectedEmployeeId = computed(setAndGetModelValue('user-ids'))
const month = computed(setAndGetModelValue('month'))
const taskStatus = computed(setAndGetModelValue('status'))
const isImportant = computed(setAndGetModelValue('is-important'))
const isUrgent = computed(setAndGetModelValue('is-urgent'))
const isTarget = computed(setAndGetModelValue('is-target'))
const search = computed(setAndGetInputSearch('search'))

const emit = defineEmits([
  'update:modelValue',
  'clickPrioritySave',
  'clickPriorityDiscard',
  'clickAddTask',
])

const companyStore = useCompanyStore()
const { employees } = storeToRefs(companyStore)

function setAndGetModelValue(key) {
  return {
    get: () => props.modelValue[key] || '',
    set: (value) => {
      emit('update:modelValue', { ...props.modelValue, [key]: value || undefined })
    },
  }
}

function setAndGetInputSearch() {
  let timeoutId = 0

  const emitSearchText = (value) => {
    emit('update:modelValue', {
      ...props.modelValue,
      search: value || undefined,
    })
  }

  return {
    get: () => props.modelValue['search'] || '',
    set: (value) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(emitSearchText, 500, value)
    },
  }
}

const selectedEmployee = computed(() => getEmployee(selectedEmployeeId.value))

async function loadEmployees(newCompanyId) {
  if (newCompanyId) {
    await companyStore.fetchEmployee(newCompanyId)
  }
}

async function loadEmployeesByDepartment() {
  if (toDepartmentId.value) {
    const selectedCompany = companyStore.companies.find((company) =>
      company.departments.some((department) => department.id == toDepartmentId.value),
    )

    await companyStore.fetchEmployee(selectedCompany.id)
  }
}

onMounted(async () => {
  await companyStore.fetchCompanies({ with: 'departments', ignore_permission: true })

  if (props.modelValue?.['company-id']) {
    await loadEmployees(props.modelValue?.['company-id'])
  }
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
</script>

<template>
  <div class="mb-3 task-header">
    <div class="flex justify-between items-start mb-4">
      <h2 class="text-2xl font-bold text-gray-800 leading-none">Task List</h2>

      <div class="ml-auto flex gap-6 items-center">
        <div v-if="listHasRearranged" class="flex gap-2 items-center">
          <span class="text-red-500">Priority Changed</span>
          <button class="btn-3" @click.prevent="emit('clickPrioritySave')">Save</button>
          <button class="btn-3" @click.prevent="emit('clickPriorityDiscard')">Discard</button>
        </div>
        <button @click="emit('clickAddTask')" class="btn-1">Add Task</button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 mt-3">
      <div class="flex flex-wrap gap-4 w-full">
        <CompanyDepartmentSelectInput
          v-model="fromDepartmentId"
          :companies="companyStore?.companies || []"
          class="relative w-full md:w-64"
          :className="{ select: 'h-10 text-sm px-2 text-gray-600 border-2 border-gray-400' }"
          v-if="route.name !== 'MyTaskList'"
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
          :companies="companyStore?.companies || []"
          class="relative w-full md:w-64"
          :className="{ select: 'h-10 text-sm px-2 text-gray-600  border-2 border-gray-400' }"
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

        <div class="relative w-full md:w-72" v-if="route.name !== 'MyTaskList'">
          <Multiselect
            :modelValue="selectedEmployee"
            @select="handleUserSelect"
            @remove="handleUserDeSelect"
            :options="employees"
            :multiple="false"
            label="name"
            label-prefix="id"
            placeholder="--ALL EMPLOYEES--"
            class="text-gray-600 w-full"
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

        <div class="text-gray-600 w-40 relative">
          <label class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500">Status</label>
          <select v-model="taskStatus" class="input-1">
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

        <div class="text-gray-600 w-full md:w-40 relative">
          <label class="absolute text-xs left-2.5 -top-1.5 bg-slate-100 text-blue-500">Month</label>
          <input
            id="month-filter"
            v-model="month"
            type="month"
            class="input-1"
            placeholder="All month"
          />
        </div>
      </div>
    </div>
  </div>

  <div class="flex mb-4 items-end mt-5">
    <div class="text-gray-600 w-full md:w-64 lg:w-96 md:ml-auto relative">
      <label class="absolute text-xs left-2.5 -top-1.5 bg-slate-100 text-blue-500">Search</label>
      <input
        id="search"
        v-model="search"
        type="text"
        class="input-1 !pr-7 w-full"
        placeholder="Search by main task title"
      />
      <i class="fas fa-search absolute right-2 top-[50%] translate-y-[-50%]"></i>
    </div>

    <div class="w-full flex justify-end gap-5 mb-1">
      <RouterLink
        v-if="route.name !== 'MyTaskList'"
        class="text-sm btn-3 py-0.5"
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
        v-if="route.name !== 'MyTaskList'"
        class="text-sm btn-3 py-0.5"
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
  @apply h-10 px-1.5 text-sm;
}

.task-header .multiselect {
  box-sizing: border-box;
  @apply bg-green-300 h-10;
}

.task-header .multiselect .multiselect__placeholder {
  @apply inline text-sm;
}

.task-header .multiselect .multiselect__select {
  @apply leading-none;
}

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
