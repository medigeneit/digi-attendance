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
const selectedEmployeeId = computed(setAndGetModelValue('user-id'))
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
    get() {
      console.log(`-- Getting ${key} value`, props.modelValue[key])
      return props.modelValue[key]
    },
    set(value) {
      console.log(`-- Setting ${key} to`, value, props.modelValue)

      emit('update:modelValue', {
        ...props.modelValue,
        [key]: value || undefined,
      })
    },
  }
}

const selectedEmployee = computed(() => getEmployee(selectedEmployeeId.value))

watch(
  () => selectedCompanyId.value,

  async (newCompanyId) => {
    if (newCompanyId) {
      await companyStore.fetchEmployee(newCompanyId)
    }
  },
)

watch(selectedEmployee, (emp) => {
  selectedEmployeeId.value = emp?.id || ''
})

onMounted(async () => {
  await companyStore.fetchCompanies()
})

function getEmployee(employeeId) {
  return employees.value.find((emp) => emp.id == employeeId) || null
}

function handleUserSelect(emp) {
  selectedEmployeeId.value = emp?.id || ''
}
</script>

<template>
  <div class="mb-3 task-header">
    {{ { selectedEmployeeId, selectedCompanyId, month } }}
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold text-gray-800">Task List</h2>
    </div>
    <div class="flex flex-wrap items-center gap-2 mt-3">
      <div class="flex flex-wrap gap-4">
        <div class="text-gray-600 w-64">
          <select id="company-filter" v-model="selectedCompanyId" class="input-1">
            <option value="">All Company</option>
            <option v-for="company in companies" :key="company.id" :value="company.id">
              {{ company.name }}
            </option>
          </select>
        </div>

        <Multiselect
          :modelValue="selectedEmployee"
          @select="handleUserSelect"
          :options="employees"
          :multiple="false"
          label="name"
          label-prefix="id"
          placeholder="Please select employee..."
          class="text-gray-600 w-64"
        >
          <template #option="{ option }">
            <UserChip :user="option" class="z-50" />
          </template>
        </Multiselect>
        <div class="text-gray-600 w-40">
          <select v-model="taskStatus" class="input-1">
            <option value="">All Tasks</option>
            <option value="not-completed">Not Completed</option>
            <option value="only-completed">Only Completed</option>
          </select>
        </div>

        <div class="text-gray-600 w-40">
          <input id="month-filter" v-model="month" type="month" class="input-1" />
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
      </div>

      <div class="ml-auto flex gap-6 items-center">
        <div v-if="listHasRearranged" class="flex gap-2 items-center">
          <span class="text-red-500">Priority Changed</span>
          <button class="btn-3" @click.prevent="emit('clickPrioritySave')">Save</button>
          <button class="btn-3" @click.prevent="emit('clickPriorityDiscard')">Discard</button>
        </div>
        <button @click="emit('clickAddTask')" class="btn-1">Add Task</button>
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
  @apply inline;
}

.task-header .multiselect .multiselect__select {
  @apply leading-none;
}

.task-header .multiselect .multiselect__single {
  @apply text-sm;
}

.task-header .multiselect__tags {
  @apply h-full min-h-full   p-1.5 pr-6;
}
/* .task-header .multiselect__option::after {
  @apply opacity-80 bottom-0 top-auto left-0 text-center;
} */
</style>
