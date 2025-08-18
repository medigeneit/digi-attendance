<script setup>
import { onMounted, ref, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import SelectDropdown from '../SelectDropdown.vue'
import UserChip from '../user/UserChip.vue'
import UserAvatar from '../UserAvatar.vue'

const props = defineProps({
  company_id: { type: [String, Number], default: '' },
  department_id: { type: [String, Number], default: '' }, // '' means all/none
  employee_id: { type: [String, Number], default: '' },
  category: { type: String, default: 'all' }, // 'all'|'executive'|'support_staff'|'doctor'|'academy_body'
  withType: { type: Boolean, default: true },
  initialValue: { type: Object, default: () => ({}) }, // optional: prefill from route/query
})

const emit = defineEmits([
  'update:company_id',
  'update:department_id',
  'update:employee_id',
  'update:category',
  'filter-change',
])

const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const { companies } = storeToRefs(companyStore)
const { departments } = storeToRefs(departmentStore)

// ===== Local state (primitive ids) =====
const selectedCompanyId = ref(String(props.company_id || props.initialValue.company_id || ''))
const selectedDepartmentId = ref(
  props.department_id !== '' ? String(props.department_id) :
  props.initialValue.department_id && props.initialValue.department_id !== 'all'
    ? String(props.initialValue.department_id)
    : '' // keep '' to mean "no department filter"
)
const selectedTypeId = ref(
  props.withType
    ? String(props.category || props.initialValue.category || 'all')
    : null
)
const selectedEmployeeId = ref(String(props.employee_id || props.initialValue.employee_id || ''))

// ===== Derived option lists =====
const companyOptions = computed(() =>
  (companies.value || []).map(c => ({ id: String(c.id), label: c.name }))
)

const departmentOptions = computed(() => {
  const list = (departments.value || []).map(d => ({ id: String(d.id), label: d.name }))
  // No 'all' sentinel here; we use '' to represent "none selected"
  return list
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

  // If we have a company, load deps first
  if (selectedCompanyId.value) {
    await loadCompanyDeps(selectedCompanyId.value)
  }

  // Build initial employee list + selection
  applyFilter()

  // Hydrate selected employee if present
  if (selectedEmployeeId.value) {
    const found = filterEmployees.value.find(e => e.id === String(selectedEmployeeId.value))
    if (!found) {
      // employee no longer valid under current filters
      selectedEmployeeId.value = ''
      emit('update:employee_id', '')
    }
  }

  // Emit the initial state
  emitAll()
})

// ===== Watchers (props -> local sync, local -> emit) =====
watch(
  () => props.company_id,
  (v) => {
    if (String(v || '') !== selectedCompanyId.value) {
      selectedCompanyId.value = String(v || '')
    }
  }
)

watch(
  () => props.department_id,
  (v) => {
    const next = v === '' || v == null ? '' : String(v)
    if (next !== selectedDepartmentId.value) {
      selectedDepartmentId.value = next
    }
  }
)

watch(
  () => props.employee_id,
  (v) => {
    if (String(v || '') !== selectedEmployeeId.value) {
      selectedEmployeeId.value = String(v || '')
    }
  }
)

watch(
  () => props.category,
  (v) => {
    if (!props.withType) return
    const next = String(v || 'all')
    if (next !== selectedTypeId.value) {
      selectedTypeId.value = next
    }
  }
)

// When company changes (locally), reset chain and load deps
watch(selectedCompanyId, async (newCompanyId) => {
  // Reset chain on company change
  selectedDepartmentId.value = ''
  selectedEmployeeId.value = ''
  filterEmployees.value = []

  emit('update:company_id', newCompanyId || '')
  emit('update:department_id', '')
  emit('update:employee_id', '')

  if (newCompanyId) {
    await loadCompanyDeps(newCompanyId)
  } else {
    // clear departments list if no company
    departments.value = []
  }

  applyFilter()
  emitFilterChange()
})

// Department or Type change → re-filter employees
watch([selectedDepartmentId, selectedTypeId], () => {
  // Emit upward before applying filter so parent query updates
  emit('update:department_id', selectedDepartmentId.value || '')
  if (props.withType) {
    emit('update:category', selectedTypeId.value || 'all')
  }
  applyFilter()
  emitFilterChange()
})

// Employee change → just push upward
watch(selectedEmployeeId, () => {
  emit('update:employee_id', selectedEmployeeId.value || '')
  emitFilterChange()
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

  if (selectedDepartmentId.value) {
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
    if (!stillExists) {
      selectedEmployeeId.value = ''
      emit('update:employee_id', '')
    }
  }
}

function emitAll() {
  emit('update:company_id', selectedCompanyId.value || '')
  emit('update:department_id', selectedDepartmentId.value || '')
  if (props.withType) emit('update:category', selectedTypeId.value || 'all')
  emit('update:employee_id', selectedEmployeeId.value || '')
  emitFilterChange()
}

let emitTimer = null
function emitFilterChange() {
  if (emitTimer) clearTimeout(emitTimer)
  emitTimer = setTimeout(() => emit('filter-change'), 0)
}

// ===== Clear helpers (unselect for all dropdowns) =====
function clearCompany() {
  selectedCompanyId.value = ''
  selectedDepartmentId.value = ''
  selectedEmployeeId.value = ''
  filterEmployees.value = []
  departments.value = []
  // emits are handled by watchers (company watcher will emit)
}

function clearDepartment() {
  selectedDepartmentId.value = ''
  selectedEmployeeId.value = ''
  applyFilter()
  // emits handled by watch([selectedDepartmentId, selectedTypeId])
}

function clearType() {
  if (!props.withType) return
  selectedTypeId.value = 'all'
  selectedEmployeeId.value = ''
  applyFilter()
  // emits handled by watch([selectedDepartmentId, selectedTypeId])
}

function clearEmployee() {
  selectedEmployeeId.value = ''
  // emits handled by watch(selectedEmployeeId)
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
        class="border-2 border-gray-300 rounded h-[44px] w-full bg-white"
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
        class="border-2 border-gray-300 rounded h-[44px] w-full bg-white"
      >
        <template #selected-option="{ option }">
          <div v-if="option || selectedDepartmentId === ''" class="relative w-full pr-6">
            <div class="flex items-center gap-2 text-sm text-gray-700">
              <div class="line-clamp-1">
                {{ option?.label || 'All Departments' }}
              </div>
            </div>
            <!-- Clear (hide when empty = all) -->
            <div
              v-if="selectedDepartmentId"
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
        class="border-2 border-gray-300 rounded h-[44px] w-full bg-white"
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
        class="border-2 border-gray-300 rounded h-[44px] w-full bg-white"
      >
        <template #option="{ option }">
          <UserChip :user="option || {}" class="w-full overflow-hidden border relative" />
        </template>

        <template #selected-option="{ option }">
          <div v-if="option || selectedEmployeeId === ''" class="relative w-full pr-6">
            <div class="flex items-center gap-2 text-sm text-gray-700" v-if="option">
              <UserAvatar :user="option" />
              <div class="line-clamp-1">{{ option?.label }}</div>
            </div>
            <div v-else class="text-sm text-gray-500">All Employees</div>
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
