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
const isClosed = computed(setAndGetModelValue('is-closed'))
const search = computed(setAndGetModelValue('search'))

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
    <div class="flex flex-col sm:flex-row flex-wrap items-start w-full gap-2">
      <div class="w-full sm:w-auto flex items-center gap-4">
        <h2 class="text-lg 2xl:text-2xl font-bold text-gray-800">Requirements</h2>
        <button @click.prevent="emit('clickAdd')" class="btn-icon size-7 border-gray-400">
          <i class="fas fa-plus text-sm"></i>
        </button>
      </div>

      <div
        class="grid 2xl:flex grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 md:ml-auto flex-wrap items-center justify-center gap-x-4 gap-y-3 w-full lg:w-auto"
      >
        <div class="relative">
          <SelectDropdown
            v-model="companyId"
            :options="companyStore?.companies || []"
            label="name"
            id="id"
            class="border border-gray-300 rounded h-8 bg-white !text-sm"
            clearable
          >
            <template #selected-option="{ option }">
              <span class="text-xs">
                <span
                  v-if="option"
                  :title="option?.name"
                  class="max-w-28 line-clamp-1 text-sky-500 font-semibold"
                >
                  {{ option?.name }}
                </span>
                <span v-else>Company</span>
              </span>
            </template>
            <template #option="{ option }">
              <div class="w-36 my-0.5">
                {{ option.name }}
              </div>
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
            <span class="text-xs">
              <span
                v-if="option"
                :user="option"
                avatar-size="xsmall"
                class="max-w-28 line-clamp-1"
                :title="option?.name"
              >
                <span class="text-gray-400">From:</span>
                <span class="text-sky-500 font-semibold mr-1">
                  {{ option?.short_name || option?.name }}
                </span>
              </span>
              <span v-else class="text-gray-600">--From Department--</span>
            </span>
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
            <span class="text-xs">
              <span
                v-if="option"
                :user="option"
                avatar-size="xsmall"
                class="max-w-28 line-clamp-1"
                :title="option?.name"
              >
                <span class="text-gray-400 mr-1">To:</span>
                <span class="text-sky-500 font-semibold">
                  {{ option?.short_name || option?.name }}
                </span>
              </span>
              <span v-else class="text-gray-600">--To Department--</span>
            </span>
          </template>
        </CompanyDepartmentSelectInput>

        <div class="relative" v-if="auth.isAdminMood && auth?.user?.role !== 'employee'">
          <EmployeeDropdownInput
            :employees="employees"
            v-model="selectedEmployeeId"
            class="border border-gray-300 rounded h-8 bg-white w-full lg:max-w-64 !text-sm"
          >
            <template #selectedOption="{ option }">
              <span class="text-xs">
                <span v-if="option" class="flex items-center gap-1 overflow-hidden text-xs">
                  <span class="text-gray-400">User: </span>
                  <UserChip :user="option" avatar-size="xsmall" class="inline" />
                </span>
                <span v-else class="text-gray-600">--All Employee--</span>
              </span>
            </template>
          </EmployeeDropdownInput>
        </div>

        <div class="relative">
          <SelectDropdown
            v-model="priority"
            :searchable="false"
            :clearable="true"
            :options="[
              { label: 'Normal', id: 'normal' },
              { label: 'IMPORTANT', id: 'IMPORTANT' },
              { label: 'URGENT', id: 'URGENT' },
            ]"
            class="border border-gray-300 rounded h-8 bg-white !text-sm"
          >
            <template #selected-option="{ option }">
              <span class="text-xs">
                <span
                  v-if="option"
                  :user="option"
                  avatar-size="xsmall"
                  class="max-w-28 line-clamp-1 text-sky-500 font-semibold"
                >
                  {{ option?.label }}
                </span>
                <span v-else>--Any Priority--</span>
              </span>
            </template>
          </SelectDropdown>
        </div>

        <div class="relative">
          <SelectDropdown
            v-model="status"
            :searchable="false"
            :clearable="true"
            :options="[
              { label: 'Pending', id: 'pending' },
              { label: 'Approved', id: 'approved' },
              { label: 'Rejected', id: 'rejected' },
            ]"
            class="border border-gray-300 rounded h-8 bg-white !text-sm"
          >
            <template #selected-option="{ option }">
              <span class="text-xs">
                <span
                  v-if="option"
                  :user="option"
                  avatar-size="xsmall"
                  class="max-w-28 line-clamp-1 text-sky-500 font-semibold"
                >
                  {{ option?.label }}
                </span>
                <span v-else>--ALL Status--</span>
              </span>
            </template>
          </SelectDropdown>
        </div>

        <div>
          <label
            class="flex items-center text-xs gap-1 text-gray-600 relative rounded h-8 border border-gray-300 bg-white px-2"
          >
            <input type="checkbox" class="size-[15px]" v-model="isClosed" />
            <span class="font-semibold" :class="[isClosed ? 'text-sky-500 font-semibold' : '']"
              >Is Closed</span
            >
          </label>
        </div>

        <div
          class="!text-sm flex text-gray-600 relative rounded h-8 border border-gray-300 bg-white pl-2 md:col-span-2 lg:col-span-1"
        >
          <label
            class="top-2 bottom-2 left-2 flex items-center text-xs text-gray-500 mr-1"
            for="month-filter"
          >
            Month:
          </label>
          <input
            id="month-filter"
            v-model="month"
            type="month"
            class="rounded h-full !text-xs w-full appearance-none text-gray-800 font-semibold outline-none pr-1"
            :class="[isClosed ? 'text-sky-500 font-semibold' : '']"
            placeholder="All month"
          />
        </div>
      </div>
    </div>
    <div class="mt-4 flex-col lg:flex-row flex lg:items-end">
      <div class="text-sm text-gray-700 mb-4 lg:mb-0">Showing requirements</div>
      <SearchInput
        v-model="search"
        class="lg:ml-auto !border !border-gray-300 w-full lg:w-96 h-[40px] px-4"
        placeholder="Search requirements "
        :label="null"
      />
    </div>
  </div>
</template>
