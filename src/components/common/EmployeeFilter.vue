<script setup>
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import EmployeeDropdownInput from '../EmployeeDropdownInput.vue'
import SelectDropdown from '../SelectDropdown.vue'

const props = defineProps({
  company_id: { type: [String, Number], default: '' },
  department_id: { type: [String, Number], default: '' }, // '' means all/none
  employee_id: { type: [String, Number], default: '' },
  line_type: { type: String, default: 'all' }, // 'all'|'executive'|'support_staff'|'doctor'|'academy_body'
  withType: { type: Boolean, default: true },
  initialValue: { type: Object, default: () => ({}) },
})

const emit = defineEmits([
  'update:company_id',
  'update:department_id',
  'update:employee_id',
  'update:line_type',
  'filter-change',
])

const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const { companies } = storeToRefs(companyStore)
const { departments } = storeToRefs(departmentStore)

/* ---------- Local state ---------- */
const selectedCompanyId = ref(String(props.company_id || props.initialValue.company_id || ''))
const selectedDepartmentId = ref(
  props.department_id !== ''
    ? String(props.department_id)
    : props.initialValue.department_id && props.initialValue.department_id !== 'all'
      ? String(props.initialValue.department_id)
      : '',
)
const selectedTypeId = ref(
  props.withType ? String(props.line_type || props.initialValue.line_type || 'all') : null,
)
const selectedEmployeeId = ref(String(props.employee_id || props.initialValue.employee_id || ''))

/* ---------- Options ---------- */
const companyOptions = computed(() =>
  (companies.value || []).map((c) => ({ id: String(c.id), label: c.name })),
)

const departmentOptions = computed(() =>
  (departments.value || []).map((d) => ({ id: String(d.id), label: d.name })),
)

const typeOptions = computed(() =>
  props.withType
    ? [
        { id: 'all', label: 'All Types' },
        { id: 'executive', label: 'Executive' },
        { id: 'support_staff', label: 'Support Staff' },
        { id: 'doctor', label: 'Doctor' },
        { id: 'academy_body', label: 'Academy Body' },
      ]
    : [],
)

/* ---------- Employees ---------- */
const rawEmployees = computed(() => companyStore.employees || [])
const filterEmployees = ref([])

/* ---------- Lifecycle ---------- */
onMounted(async () => {
  await companyStore.fetchCompanies()
  if (selectedCompanyId.value) {
    await loadCompanyDeps(selectedCompanyId.value)
  }
  applyFilter() // builds employee list with pinning
  // আর কখনও mounted-এ employee_id ক্লিয়ার করবো না—even if not in filtered list
  emitAll()
})

/* ---------- Props → Local sync ---------- */
watch(
  () => props.company_id,
  (v) => {
    const next = String(v || '')
    if (next !== selectedCompanyId.value) selectedCompanyId.value = next
  },
)
watch(
  () => props.department_id,
  (v) => {
    const next = v === '' || v == null ? '' : String(v)
    if (next !== selectedDepartmentId.value) selectedDepartmentId.value = next
  },
)
watch(
  () => props.employee_id,
  (v) => {
    const next = String(v || '')
    if (next !== selectedEmployeeId.value) selectedEmployeeId.value = next
  },
)
watch(
  () => props.line_type,
  (v) => {
    if (!props.withType) return
    const next = String(v || 'all')
    if (next !== selectedTypeId.value) selectedTypeId.value = next
  },
)

/* ---------- Watchers (Local → Emits) ---------- */
// Company বদলালে chain reset (employee clear করা যুক্তিযুক্ত)
watch(selectedCompanyId, async (newCompanyId) => {
  selectedDepartmentId.value = ''
  selectedEmployeeId.value = ''
  filterEmployees.value = []

  emit('update:company_id', newCompanyId || '')
  emit('update:department_id', '')
  emit('update:employee_id', '')

  if (newCompanyId) {
    await loadCompanyDeps(newCompanyId)
  } else {
    departments.value = []
  }

  applyFilter()
  emitFilterChange()
})

// Department/Type বদলালে কেবল filter হবে; employee_id **কখনও clear নয়**
watch([selectedDepartmentId, selectedTypeId], () => {
  emit('update:department_id', selectedDepartmentId.value || '')
  if (props.withType) emit('update:line_type', selectedTypeId.value || 'all')
  applyFilter() // pin selected employee even if filtered out
  emitFilterChange()
})

// Employee change → upstream
watch(selectedEmployeeId, () => {
  emit('update:employee_id', selectedEmployeeId.value || '')
  emitFilterChange()
})

/* ---------- Helpers ---------- */
async function loadCompanyDeps(companyId) {
  await Promise.all([
    departmentStore.fetchDepartments(companyId),
    companyStore.fetchEmployee(companyId),
  ])
}

function formatEmployee(e) {
  return {
    ...e,
    id: String(e.id),
    label: e.name || e.label || `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim(),
  }
}

function applyFilter() {
  // 1) base list
  let filtered = [...rawEmployees.value]

  // 2) apply department
  if (selectedDepartmentId.value) {
    filtered = filtered.filter(
      (e) => String(e.department_id) === String(selectedDepartmentId.value),
    )
  }

  // 3) apply type
  if (props.withType && selectedTypeId.value && selectedTypeId.value !== 'all') {
    filtered = filtered.filter((e) => String(e.type) === String(selectedTypeId.value))
  }

  // 4) map to dropdown shape
  let mapped = filtered.map(formatEmployee)

  // 5) 🔒 pin currently selected employee if not present in filtered list
  if (selectedEmployeeId.value) {
    const exists = mapped.some((e) => e.id === String(selectedEmployeeId.value))
    if (!exists) {
      const found = rawEmployees.value.find(
        (e) => String(e.id) === String(selectedEmployeeId.value),
      )
      if (found) {
        mapped = [formatEmployee(found), ...mapped]
      }
      // ⚠️ আর employee_id clear করা হবে না
    }
  }

  filterEmployees.value = mapped
}

function emitAll() {
  emit('update:company_id', selectedCompanyId.value || '')
  emit('update:department_id', selectedDepartmentId.value || '')
  if (props.withType) emit('update:line_type', selectedTypeId.value || 'all')
  emit('update:employee_id', selectedEmployeeId.value || '')
  emitFilterChange()
}

let emitTimer = null
function emitFilterChange() {
  if (emitTimer) clearTimeout(emitTimer)
  emitTimer = setTimeout(
    () =>
      emit('filter-change', {
        company_id: selectedCompanyId.value,
        department_id: selectedDepartmentId.value,
        line_type: selectedTypeId.value,
        employee_id: selectedEmployeeId.value,
      }),
    0,
  )
}

/* ---------- Clear helpers ---------- */
function clearType() {
  if (!props.withType) return
  selectedTypeId.value = 'all'
  // employee sticky থাকবে, তাই employee_id untouched
  applyFilter()
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <!-- Company -->
    <div class="relative">
      <SelectDropdown
        v-model="selectedCompanyId"
        :options="companyOptions"
        class="border-2 border-gray-300 rounded h-[32px] w-full bg-white"
        clearable
      >
        <template #selected-option="{ option }">
          <div class="line-clamp-1 text-sm text-gray-900" :title="option?.label">
            <span v-if="option?.label">{{ option?.label }}</span>
            <span v-else class="text-gray-500 whitespace-nowrap">--Select Company--</span>
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
        class="border-2 border-gray-300 rounded h-[32px] w-full bg-white"
        clearable
      >
        <template #selected-option="{ option }">
          <div class="line-clamp-1 text-sm text-gray-900" :title="option?.label">
            <span v-if="option?.label">{{ option?.label }}</span>
            <span v-else class="text-gray-800 whitespace-nowrap">--All Departments--</span>
          </div>
        </template>
      </SelectDropdown>

      <div class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 leading-none z-30">
        Department
      </div>

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
        class="border-2 border-gray-300 rounded h-[32px] w-full bg-white"
      >
        <template #selected-option="{ option }">
          <div v-if="option" class="relative w-full pr-6">
            <div class="flex items-center gap-2 text-sm text-gray-700">
              <div class="line-clamp-1">{{ option?.label }}</div>
            </div>
            <div
              v-if="selectedTypeId && selectedTypeId !== 'all'"
              class="absolute right-1 text-xl top-0 bottom-0 flex items-center"
            >
              <button
                @click.prevent="clearType()"
                class="text-gray-600 font-semibold hover:text-red-700"
                title="Clear selection"
              >
                &times;
              </button>
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
      <EmployeeDropdownInput
        :employees="filterEmployees"
        v-model="selectedEmployeeId"
        class="border-2 border-gray-300 rounded h-[32px] w-full bg-white"
      />
      <div class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 leading-none z-30">
        Employee
      </div>
    </div>
  </div>
</template>
