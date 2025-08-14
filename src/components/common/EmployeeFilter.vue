<script setup>
import { onMounted, ref, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import SelectDropdown from '../SelectDropdown.vue'
import UserChip from '../user/UserChip.vue'
import UserAvatar from '../UserAvatar.vue'

const props = defineProps({
  modelValue: Object,
  withType: { type: Boolean, default: true },
  initialValue: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue', 'filter-change'])

const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const { companies } = storeToRefs(companyStore)
const { departments } = storeToRefs(departmentStore)

// ===== Local state (primitive ids) =====
const selectedCompanyId = ref('')
const selectedDepartmentId = ref('all')
const selectedTypeId = ref(props.withType ? 'all' : null)
const selectedEmployeeId = ref('')

// ===== Derived option lists =====
const companyOptions = computed(() =>
  (companies.value || []).map(c => ({ id: String(c.id), label: c.name }))
)

const departmentOptions = computed(() => {
  const base = [{ id: 'all', label: 'All Departments' }]
  if (!selectedCompanyId.value) return base
  const list = (departments.value || []).map(d => ({ id: String(d.id), label: d.name }))
  return [...base, ...list]
})

const typeOptions = computed(() =>
  props.withType
    ? [
        { id: 'all', label: 'All Types' },
        { id: 'executive', label: 'Executive' },
        { id: 'support_staff', label: 'Support Staff' },
        { id: 'doctor', label: 'Doctor' },
        { id: 'academy_body', label: 'Academy Body' },
      ]
    : []
)

// Employees
const rawEmployees = computed(() => companyStore.employees || [])
const filterEmployees = ref([])

// ===== Initial load =====
onMounted(async () => {
  await companyStore.fetchCompanies()

  if (props.initialValue?.company_id) {
    // preselect company & load deps
    selectedCompanyId.value = String(props.initialValue.company_id)
    await loadCompanyDeps(selectedCompanyId.value)

    // department preset
    if (props.initialValue?.department_id && props.initialValue.department_id !== 'all') {
      selectedDepartmentId.value = String(props.initialValue.department_id)
    }

    // type preset
    if (props.withType && props.initialValue?.type && props.initialValue.type !== 'all') {
      selectedTypeId.value = String(props.initialValue.type)
    }

    // filter & preselect employee
    applyFilter()
    if (props.initialValue?.employee_id) {
      const empId = String(props.initialValue.employee_id)
      const found = filterEmployees.value.find(e => String(e.id) === empId)
      if (found) selectedEmployeeId.value = empId
    }

    emitFilter()
  } else {
    // clean emit
    emitFilter()
  }
})

// ===== Watchers =====
watch(selectedCompanyId, async (newCompanyId) => {
  // reset chain on company change
  selectedDepartmentId.value = 'all'
  selectedTypeId.value = props.withType ? 'all' : null
  selectedEmployeeId.value = ''
  filterEmployees.value = []

  if (newCompanyId) {
    await loadCompanyDeps(newCompanyId)
    applyFilter()
  } else {
    departments.value = []
    applyFilter()
  }
  emitFilter()
})

watch([selectedDepartmentId, selectedTypeId], () => {
  applyFilter()
})

watch(selectedEmployeeId, () => {
  emitFilter()
})

// ===== Helpers =====
async function loadCompanyDeps(companyId) {
  await Promise.all([
    departmentStore.fetchDepartments(companyId),
    companyStore.fetchEmployee(companyId),
  ])
}

function applyFilter() {
  let filtered = [...rawEmployees.value]

  if (selectedDepartmentId.value && selectedDepartmentId.value !== 'all') {
    filtered = filtered.filter(e => String(e.department_id) === String(selectedDepartmentId.value))
  }

  if (props.withType && selectedTypeId.value && selectedTypeId.value !== 'all') {
    filtered = filtered.filter(e => String(e.type) === String(selectedTypeId.value))
  }

  // Normalize option shape for SelectDropdown
  filterEmployees.value = filtered.map(e => ({
    ...e,
    id: String(e.id),
    label: e.name || e.label || `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim(),
  }))

  // keep selection only if still present
  if (selectedEmployeeId.value) {
    const stillExists = filterEmployees.value.some(e => e.id === String(selectedEmployeeId.value))
    if (!stillExists) selectedEmployeeId.value = ''
  }
}

let emitTimer = null
function emitFilter() {
  // debounce to avoid parent thrashing
  if (emitTimer) clearTimeout(emitTimer)
  emitTimer = setTimeout(() => {
    emit('update:modelValue', {
      company_id: selectedCompanyId.value || '',
      department_id: selectedDepartmentId.value || 'all',
      type: props.withType ? (selectedTypeId.value || 'all') : null,
      employee_id: selectedEmployeeId.value || '',
    })
    emit('filter-change')
  }, 0)
}

// ===== Clear helpers (unselect for all dropdowns) =====
function clearCompany() {
  selectedCompanyId.value = ''
  selectedDepartmentId.value = 'all'
  if (props.withType) selectedTypeId.value = 'all'
  selectedEmployeeId.value = ''
  filterEmployees.value = []
  departments.value = []
  emitFilter()
}

function clearDepartment() {
  selectedDepartmentId.value = 'all'
  selectedEmployeeId.value = ''
  applyFilter()
  emitFilter()
}

function clearType() {
  if (!props.withType) return
  selectedTypeId.value = 'all'
  selectedEmployeeId.value = ''
  applyFilter()
  emitFilter()
}

function clearEmployee() {
  selectedEmployeeId.value = ''
  emitFilter()
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <!-- Company -->
    <div class="relative">
      <SelectDropdown
        v-model="selectedCompanyId"
        :options="companyOptions"
        placeholder="Select Company"
        class="border-2 border-gray-300 rounded h-[44px] w-full md:w-64 bg-white"
      >
        <template #selected-option="{ option }">
          <div v-if="option" class="relative w-full pr-6">
            <div class="flex items-center gap-2 text-sm text-gray-700">
              <div class="line-clamp-1">{{ option?.label }}</div>
            </div>
            <!-- Clear -->
            <div v-if="selectedCompanyId" class="absolute right-1 text-xl top-0 bottom-0 flex items-center">
              <button
                @click.prevent="clearCompany()"
                class="text-gray-600 font-semibold hover:text-red-700"
                title="Clear selection"
              >&times;</button>
            </div>
          </div>
        </template>
      </SelectDropdown>
      <div class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 leading-none z-30">
        Company
      </div>
    </div>

    <!-- Department -->
    <div class="relative">
      <SelectDropdown
        v-model="selectedDepartmentId"
        :options="departmentOptions"
        placeholder="Select Department"
        class="border-2 border-gray-300 rounded h-[44px] w-full md:w-64 bg-white"
      >
        <template #selected-option="{ option }">
          <div v-if="option" class="relative w-full pr-6">
            <div class="flex items-center gap-2 text-sm text-gray-700">
              <div class="line-clamp-1">{{ option?.label }}</div>
            </div>
            <!-- Clear (hide when 'all') -->
            <div
              v-if="selectedDepartmentId && selectedDepartmentId !== 'all'"
              class="absolute right-1 text-xl top-0 bottom-0 flex items-center"
            >
              <button
                @click.prevent="clearDepartment()"
                class="text-gray-600 font-semibold hover:text-red-700"
                title="Clear selection"
              >&times;</button>
            </div>
          </div>
        </template>
      </SelectDropdown>
      <div class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 leading-none z-30">
        Department
      </div>

      <!-- Optional visual hint if no company chosen -->
      <div
        v-if="!selectedCompanyId"
        class="absolute inset-0 bg-white/50 cursor-not-allowed rounded"
        aria-hidden="true"
      />
    </div>

    <!-- Type (optional) -->
    <div v-if="withType" class="relative">
      <SelectDropdown
        v-model="selectedTypeId"
        :options="typeOptions"
        placeholder="Select Type"
        class="border-2 border-gray-300 rounded h-[44px] w-full md:w-64 bg-white"
      >
        <template #selected-option="{ option }">
          <div v-if="option" class="relative w-full pr-6">
            <div class="flex items-center gap-2 text-sm text-gray-700">
              <div class="line-clamp-1">{{ option?.label }}</div>
            </div>
            <!-- Clear (hide when 'all') -->
            <div
              v-if="selectedTypeId && selectedTypeId !== 'all'"
              class="absolute right-1 text-xl top-0 bottom-0 flex items-center"
            >
              <button
                @click.prevent="clearType()"
                class="text-gray-600 font-semibold hover:text-red-700"
                title="Clear selection"
              >&times;</button>
            </div>
          </div>
        </template>
      </SelectDropdown>
      <div class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 leading-none z-30">
        Line Type
      </div>
    </div>

    <!-- Employee -->
    <div class="relative">
      <SelectDropdown
        v-model="selectedEmployeeId"
        :options="filterEmployees"
        placeholder="--Select Employee--"
        class="border-2 border-gray-300 rounded h-[44px] w-full md:w-64 bg-white"
      >
        <template #option="{ option }">
          <UserChip :user="option || {}" class="w-full overflow-hidden border relative" />
        </template>

        <template #selected-option="{ option }">
          <div v-if="option" class="relative w-full pr-6">
            <div class="flex items-center gap-2 text-sm text-gray-700">
              <UserAvatar :user="option" />
              <div class="line-clamp-1">{{ option?.label }}</div>
            </div>
            <!-- Clear -->
            <div v-if="selectedEmployeeId" class="absolute right-1 text-xl top-0 bottom-0 flex items-center">
              <button
                @click.prevent="clearEmployee()"
                class="text-gray-600 font-semibold hover:text-red-700"
                title="Clear selection"
              >&times;</button>
            </div>
          </div>
        </template>
      </SelectDropdown>

      <div class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 leading-none z-30">
        Employee
      </div>
    </div>
  </div>
</template>
