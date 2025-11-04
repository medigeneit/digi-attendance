<script setup>
import { getTaskEmployees } from '@/services/task'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import CompanyDepartmentSelectInput from '../common/CompanyDepartmentSelectInput.vue'
import EmployeeDropdownInput from '../EmployeeDropdownInput.vue'
import SelectDropdown from '../SelectDropdown.vue'
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
const selectedEmployeeId = computed(setAndGetModelValue('created-by'))
const month = computed(setAndGetModelValue('month'))
const priority = computed(setAndGetModelValue('priority'))
const status = computed(setAndGetModelValue('status'))

const emit = defineEmits([
  'update:modelValue',
  'clickPrioritySave',
  'clickPriorityDiscard',
  'clickAddTask',
  'clickAdd',
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

watch(() => toDepartmentId.value, loadEmployeesByDepartment)

watch(
  () => companyId.value,
  () => {
    fromDepartmentId.value = ''
    toDepartmentId.value = ''
    selectedEmployeeId.value = ''

    loadEmployeesByDepartment()
  },
)

const companyDepartments = computed(() => {
  if (!companyId.value) {
    return companyStore?.companies
  }

  return companyStore?.companies.filter((c) => c.id == companyId.value)
})
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center w-full gap-2">
      <h2 class="text-2xl font-bold text-gray-800">Requirements</h2>
      <button @click.prevent="emit('clickAdd')" class="btn-icon size-8 border border-gray-400">
        <i class="fas fa-plus text-sm"></i>
      </button>

      <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 ml-auto">
        <div class="relative">
          <SelectDropdown
            v-model="companyId"
            :options="companyStore?.companies || []"
            label="name"
            id="id"
            class="border border-gray-300 rounded h-8 bg-white !text-sm"
            clearable
          >
            <!-- <template #selected-option="{ option }">
              <div class="line-clamp-1 text-sm text-gray-900" :title="option?.name">
                <span v-if="option?.name">{{ option?.name }}</span>
                <span v-else class="text-gray-500 whitespace-nowrap">--ALL COMPANY--</span>
              </div>
            </template> -->
            <template #selected-option="{ option }">
              <span v-if="option" :title="option?.name" class="max-w-28 line-clamp-1">
                {{ option?.name }}
              </span>
              <span v-else>Company</span>
            </template>
          </SelectDropdown>
        </div>

        <CompanyDepartmentSelectInput
          v-model="fromDepartmentId"
          :companies="companyDepartments || []"
          class="relative"
          :className="{ select: 'border border-gray-300 rounded h-8 bg-white !text-sm' }"
          defaultOption="--ALL DEPARTMENT--"
        >
          <template #label>
            <span></span>
          </template>
          <template #selectedOption="{ option }">
            <span
              v-if="option"
              :user="option"
              avatar-size="xsmall"
              class="max-w-28 line-clamp-1"
              :title="option?.name"
            >
              <span class="text-gray-400">From:</span> {{ option?.short_name || option?.name }}
            </span>
            <span v-else>From Department</span>
          </template>
        </CompanyDepartmentSelectInput>

        <CompanyDepartmentSelectInput
          v-model="toDepartmentId"
          :companies="companyDepartments || []"
          class="relative"
          :className="{
            select: 'border border-gray-300 rounded h-8 bg-white !text-sm',
          }"
          v-if="route.name !== 'MyTaskList'"
          defaultOption="--ALL DEPARTMENT--"
        >
          <template #label><span></span></template>
          <template #selectedOption="{ option }">
            <span
              v-if="option"
              :user="option"
              avatar-size="xsmall"
              class="max-w-28 line-clamp-1"
              :title="option?.name"
            >
              <span class="text-gray-400">To:</span> {{ option?.short_name || option?.name }}
            </span>
            <span v-else>To Department</span>
          </template>
        </CompanyDepartmentSelectInput>

        <div
          class="relative lg:flex-grow"
          v-if="auth.isAdminMood && auth?.user?.role !== 'employee'"
        >
          <EmployeeDropdownInput
            :employees="employees"
            v-model="selectedEmployeeId"
            class="border border-gray-300 rounded h-8 bg-white max-w-64 !text-sm"
          >
            <template #selectedOption="{ option }">
              <span v-if="option" class="flex items-center gap-1 overflow-hidden">
                <span class="text-gray-400">User: </span>
                <UserChip :user="option" avatar-size="xsmall" class="inline" />
              </span>
              <span v-else>Employee</span></template
            >
          </EmployeeDropdownInput>
        </div>

        <div class="relative">
          <SelectDropdown
            v-model="priority"
            :searchable="false"
            :clearable="true"
            :options="[
              { label: '--Any Priority--', id: '' },
              { label: 'Normal', id: 'normal' },
              { label: 'IMPORTANT', id: 'IMPORTANT' },
              { label: 'URGENT', id: 'URGENT' },
            ]"
            class="border border-gray-300 rounded h-8 bg-white !text-sm"
          >
            <template #selected-option="{ option }">
              <span v-if="option" :user="option" avatar-size="xsmall" class="max-w-28 line-clamp-1">
                {{ option?.label }}
              </span>
              <span v-else>Priority</span>
            </template>
          </SelectDropdown>
        </div>

        <div class="relative">
          <SelectDropdown
            v-model="status"
            :searchable="false"
            :clearable="true"
            :options="[
              { label: '--ALL Status--', id: '' },
              { label: 'Pending', id: 'pending' },
              { label: 'Approved', id: 'approved' },
              { label: 'Rejected', id: 'rejected' },
            ]"
            class="border border-gray-300 rounded h-8 bg-white !text-sm"
          >
            <template #selected-option="{ option }">
              <span v-if="option" :user="option" avatar-size="xsmall" class="max-w-28 line-clamp-1">
                {{ option?.label }}
              </span>
              <span v-else>Status</span>
            </template>
          </SelectDropdown>
        </div>

        <div class="text-gray-600 max-w-40 relative rounded h-8 border border-gray-300 bg-white">
          <div class="!text-sm h-full">
            <label
              class="text-sm bg-white absolute top-0 bottom-0 left-2 right-8 flex items-center"
              v-if="!month"
            >
              Month
            </label>
            <input
              id="month-filter"
              v-model="month"
              type="month"
              class="rounded h-full !text-sm px-4 w-full"
              placeholder="All month"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
