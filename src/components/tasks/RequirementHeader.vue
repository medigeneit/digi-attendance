<script setup>
import { getTaskEmployees } from '@/services/task'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import CompanyDepartmentSelectInput from '../common/CompanyDepartmentSelectInput.vue'
import EmployeeDropdownInput from '../EmployeeDropdownInput.vue'
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
const selectedEmployeeId = computed(setAndGetModelValue('created-by'))
const month = computed(setAndGetModelValue('month'))

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
    <div class="mb-3 task-header">
      <div class="flex flex-wrap items-center justify-center gap-2 mt-3">
        <div class="flex flex-wrap gap-x-4 gap-y-3 justify-between">
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
                  <span v-else class="text-gray-500 whitespace-nowrap">--ALL COMPANY--</span>
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
            class="relative w-full md:w-48 flex-grow"
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
            class="relative w-full md:w-48 flex-grow"
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
            <EmployeeDropdownInput
              :employees="employees"
              v-model="selectedEmployeeId"
              class="border-2 border-gray-300 rounded h-[40px] w-full bg-white !text-sm"
            />

            <label class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 z-50">
              Created By
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
      </div>
    </div>
  </div>
</template>
