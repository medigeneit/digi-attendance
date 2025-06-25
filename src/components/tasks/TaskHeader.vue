<script setup>
import Multiselect from '@/components/MultiselectDropdown.vue'
import { useCompanyStore } from '@/stores/company'
import { storeToRefs } from 'pinia'
import { computed, onMounted, watch } from 'vue'
import UserChip from '../user/UserChip.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({}),
  },
  listHasRearranged: {
    type: Boolean,
    default: false,
  },
})

const selectedCompanyId = computed(setAndGetModelValue('company-id'))
const selectedEmployeeId = computed(setAndGetModelValue('user-ids'))
const month = computed(setAndGetModelValue('month'))
const taskStatus = computed(setAndGetModelValue('status'))
const isImportant = computed(setAndGetModelValue('is-important'))
const isUrgent = computed(setAndGetModelValue('is-urgent'))

const emit = defineEmits([
  'update:modelValue',
  'clickPrioritySave',
  'clickPriorityDiscard',
  'clickAddTask',
])

const companyStore = useCompanyStore()
const { companies, employees } = storeToRefs(companyStore)

function setAndGetModelValue(key) {
  return {
    get: () => props.modelValue[key] || '',
    set: (value) => {
      console.log('---SETTING modelValue: ', { key, value })
      emit('update:modelValue', {
        ...props.modelValue,
        [key]: value || undefined,
      })
    },
  }
}

const selectedEmployee = computed(() => getEmployee(selectedEmployeeId.value))

async function loadEmployees(newCompanyId) {
  console.log({ newCompanyId })
  if (newCompanyId) {
    await companyStore.fetchEmployee(newCompanyId)
  }
}

watch(
  () => selectedCompanyId.value,

  loadEmployees,
)

onMounted(async () => {
  await companyStore.fetchCompanies()
  if (props.modelValue?.['company-id']) {
    await loadEmployees(props.modelValue?.['company-id'])
  }
})

function getEmployee(employeeId) {
  return employees.value.find((emp) => emp.id == employeeId) || null
}

function handleUserSelect(emp) {
  console.log('SELECTED', { emp })
  selectedEmployeeId.value = emp?.id || ''
}

function handleUserDeSelect() {
  selectedEmployeeId.value = ''
}
</script>

<template>
  <div class="mb-3 task-header">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold text-gray-800">Task List</h2>

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
        <div class="text-gray-600 w-full md:w-44">
          <select id="company-filter" v-model="selectedCompanyId" class="input-1">
            <option value="">All Company</option>
            <option v-for="company in companies" :key="company.id" :value="company.id">
              {{ company.name }}
            </option>
          </select>
        </div>

        <div class="relative w-full md:w-52">
          <Multiselect
            :modelValue="selectedEmployee"
            @select="handleUserSelect"
            @remove="handleUserDeSelect"
            :options="employees"
            :multiple="false"
            label="name"
            label-prefix="id"
            placeholder="All Employee"
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
        </div>

        <div class="text-gray-600 w-40">
          <select v-model="taskStatus" class="input-1">
            <option value="">All Tasks</option>
            <option value="not-completed">Not Completed</option>
            <option value="only-completed">Completed</option>
          </select>
        </div>

        <div class="flex gap-4 items-center flex-shrink-0">
          <label class="flex gap-2">
            <input type="checkbox" v-model="isImportant" value="1" />
            <span>Important</span>
          </label>
          <label class="flex gap-2">
            <input type="checkbox" v-model="isUrgent" value="1" />
            <span>Urgent</span>
          </label>
        </div>
        <div class="text-gray-600 w-full md:w-40 md:ml-auto">
          <input id="month-filter" v-model="month" type="month" class="input-1" />
        </div>
      </div>
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

.task-header .multiselect .multiselect__content-wrapper {
  @apply top-[102%] left-[-1%];
}

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
