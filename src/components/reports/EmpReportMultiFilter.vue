<script setup>
import apiClient from '@/axios'
import { useCompanyStore } from '@/stores/company'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  companyIds:    { type: Array,   default: () => [] },
  departmentIds: { type: Array,   default: () => [] },
  employeeIds:   { type: Array,   default: () => [] },
  employees:     { type: Array,   default: () => [] },
  showEmployees: { type: Boolean, default: false },
  employeesLoading: { type: Boolean, default: false },
  horizontal:    { type: Boolean, default: false },
})
const emit = defineEmits([
  'update:companyIds',
  'update:departmentIds',
  'update:employeeIds',
  'change',
])

const companyStore = useCompanyStore()
const { companies } = storeToRefs(companyStore)

const allDepts      = ref([])
const selCoIds      = ref(props.companyIds.map(String))
const selDeptIds    = ref(props.departmentIds.map(String))
const selEmployeeIds = ref(props.employeeIds.map(String))
const coOpen        = ref(false)
const deptOpen      = ref(false)
const employeeOpen  = ref(false)
const coSearch      = ref('')
const deptSearch    = ref('')
const employeeSearch = ref('')
const wrapRef       = ref(null)

// ─── Computed ─────────────────────────────────────────────────────────────────

const filteredCos = computed(() => {
  const q = coSearch.value.toLowerCase()
  return (companies.value || []).filter(c => !q || c.name.toLowerCase().includes(q))
})

const availableDepts = computed(() =>
  selCoIds.value.length
    ? allDepts.value.filter(d => selCoIds.value.includes(String(d.company_id)))
    : allDepts.value,
)

const filteredDepts = computed(() => {
  const q = deptSearch.value.toLowerCase()
  return availableDepts.value.filter(d => !q || d.name.toLowerCase().includes(q))
})

const filteredEmployees = computed(() => {
  const q = employeeSearch.value.trim().toLowerCase()
  return (props.employees || []).filter(employee => {
    if (!q) return true
    return [employee?.name, employee?.employee_id, employee?.phone, employee?.email]
      .some(value => String(value || '').toLowerCase().includes(q))
  })
})

const groupedDepts = computed(() => {
  if (selCoIds.value.length <= 1) return null
  const map = new Map()
  for (const d of filteredDepts.value) {
    const co = (companies.value || []).find(c => String(c.id) === String(d.company_id))
    const key = co?.name || 'Other'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(d)
  }
  return [...map.entries()]
})

const coChips = computed(() =>
  selCoIds.value.map(id => ({
    id,
    label: (companies.value || []).find(c => String(c.id) === id)?.name || id,
  })),
)

const deptChips = computed(() =>
  selDeptIds.value.map(id => ({
    id,
    label: allDepts.value.find(d => String(d.id) === id)?.name || id,
  })),
)

const employeeChips = computed(() =>
  selEmployeeIds.value.map(id => {
    const employee = (props.employees || []).find(item => String(item.id) === id)
    return { id, label: employee?.name || employee?.employee_id || id }
  }),
)

const allCosSelected = computed(() =>
  (companies.value || []).length > 0 &&
  selCoIds.value.length === (companies.value || []).length,
)

const allDeptsSelected = computed(() =>
  availableDepts.value.length > 0 && selDeptIds.value.length === availableDepts.value.length,
)

const allEmployeesSelected = computed(() =>
  (props.employees || []).length > 0 &&
  selEmployeeIds.value.length === (props.employees || []).length,
)

// ─── Actions ──────────────────────────────────────────────────────────────────

function toggleCo(id) {
  const s = String(id)
  selCoIds.value = selCoIds.value.includes(s)
    ? selCoIds.value.filter(x => x !== s)
    : [...selCoIds.value, s]
}

function toggleDept(id) {
  const s = String(id)
  selDeptIds.value = selDeptIds.value.includes(s)
    ? selDeptIds.value.filter(x => x !== s)
    : [...selDeptIds.value, s]
}

function toggleEmployee(id) {
  const value = String(id)
  selEmployeeIds.value = selEmployeeIds.value.includes(value)
    ? selEmployeeIds.value.filter(item => item !== value)
    : [...selEmployeeIds.value, value]
}

function removeCo(id) {
  selCoIds.value = selCoIds.value.filter(x => x !== id)
}

function removeDept(id) {
  selDeptIds.value = selDeptIds.value.filter(x => x !== id)
}

function removeEmployee(id) {
  selEmployeeIds.value = selEmployeeIds.value.filter(item => item !== id)
}

function clearCos() {
  selCoIds.value = []
  selDeptIds.value = []
}

function toggleAllCos() {
  if (allCosSelected.value) {
    clearCos()
  } else {
    selCoIds.value = (companies.value || []).map(c => String(c.id))
  }
}

function toggleAllDepts() {
  selDeptIds.value = allDeptsSelected.value ? [] : availableDepts.value.map(d => String(d.id))
}

function toggleAllEmployees() {
  selEmployeeIds.value = allEmployeesSelected.value
    ? []
    : (props.employees || []).map(employee => String(employee.id))
}

// Prune invalid dept selections when company changes
watch(selCoIds, () => {
  if (selCoIds.value.length) {
    const valid = new Set(availableDepts.value.map(d => String(d.id)))
    selDeptIds.value = selDeptIds.value.filter(id => valid.has(id))
  } else {
    selDeptIds.value = []
  }
  selEmployeeIds.value = []
  emit('update:companyIds', [...selCoIds.value])
  emit('update:departmentIds', [...selDeptIds.value])
  emit('update:employeeIds', [])
  emitChange()
})

watch(selDeptIds, () => {
  selEmployeeIds.value = []
  emit('update:departmentIds', [...selDeptIds.value])
  emit('update:employeeIds', [])
  emitChange()
})
watch(selEmployeeIds, () => {
  emit('update:employeeIds', [...selEmployeeIds.value])
  emitChange()
})

watch(
  () => props.employeeIds,
  ids => {
    const next = (ids || []).map(String)
    if (next.join(',') !== selEmployeeIds.value.join(',')) selEmployeeIds.value = next
  },
)

function emitChange() {
  emit('change', {
    company_ids: [...selCoIds.value],
    department_ids: [...selDeptIds.value],
    employee_ids: [...selEmployeeIds.value],
  })
}

// ─── Dropdown helpers ─────────────────────────────────────────────────────────

function openCo() {
  deptOpen.value = false
  employeeOpen.value = false
  coOpen.value = !coOpen.value
  if (coOpen.value) coSearch.value = ''
}

function openDept() {
  if (!selCoIds.value.length) return
  coOpen.value = false
  employeeOpen.value = false
  deptOpen.value = !deptOpen.value
  if (deptOpen.value) deptSearch.value = ''
}

function openEmployee() {
  if (!selCoIds.value.length) return
  coOpen.value = false
  deptOpen.value = false
  employeeOpen.value = !employeeOpen.value
  if (employeeOpen.value) employeeSearch.value = ''
}

function handleOutside(e) {
  if (wrapRef.value && !wrapRef.value.contains(e.target)) {
    coOpen.value = false
    deptOpen.value = false
    employeeOpen.value = false
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  document.addEventListener('click', handleOutside, true)
  await companyStore.fetchCompanies({ ignore_permission: false })
  try {
    const { data } = await apiClient.get('/departments')
    allDepts.value = data || []
  } catch {
    allDepts.value = []
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutside, true)
})
</script>

<template>
  <div ref="wrapRef" :class="horizontal ? 'flex flex-wrap items-end gap-3' : 'space-y-4'">

    <!-- ── Company multi-select ─────────────────────────────────────────────── -->
    <div class="relative" :class="horizontal ? 'min-w-[160px] flex-1' : ''">

      <!-- Label row -->
      <div v-if="!horizontal" class="mb-1.5 flex items-center justify-between">
        <span class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <i class="far fa-building text-blue-400"></i>
          Company
          <span
            v-if="selCoIds.length"
            class="rounded-full bg-blue-600 px-1.5 py-px text-[9px] font-bold leading-tight text-white"
          >{{ selCoIds.length }}</span>
        </span>
        <button
          v-if="selCoIds.length"
          type="button"
          class="text-[10px] text-slate-400 transition hover:text-rose-500"
          @click.stop="clearCos"
        >clear</button>
      </div>

      <!-- Trigger -->
      <button
        type="button"
        class="relative w-full rounded-md border text-left text-xs transition-all focus:outline-none"
        :style="horizontal ? 'min-height:2rem' : 'min-height:2.25rem'"
        :class="selCoIds.length
          ? 'border-blue-300 bg-blue-50/50 ring-1 ring-blue-200/50'
          : 'border-slate-200 bg-white hover:border-blue-200'"
        @click.stop="openCo"
      >
        <div class="flex min-h-[2rem] flex-wrap items-center gap-1 px-2 py-1 pr-7">
          <template v-if="coChips.length">
            <span
              v-for="chip in coChips"
              :key="chip.id"
              class="inline-flex items-center gap-0.5 rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700"
            >
              <span class="max-w-[80px] truncate">{{ chip.label }}</span>
              <button
                type="button"
                class="ml-0.5 opacity-60 hover:opacity-100"
                @click.stop="removeCo(chip.id)"
              ><i class="fas fa-times text-[8px]"></i></button>
            </span>
          </template>
          <span v-else class="text-slate-400">All companies</span>
        </div>
        <span class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
          <i
            class="fas fa-chevron-down text-[9px] transition-transform duration-150"
            :class="coOpen ? 'rotate-180' : ''"
          ></i>
        </span>
      </button>

      <!-- Dropdown -->
      <Transition name="dd">
        <div
          v-if="coOpen"
          class="absolute left-0 right-0 z-[60] mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl"
        >
          <div class="border-b border-slate-100 px-2 py-2">
            <div class="flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-1">
              <i class="far fa-search text-[10px] text-slate-400"></i>
              <input
                v-model="coSearch"
                type="text"
                placeholder="Search company…"
                class="flex-1 bg-transparent text-[11px] outline-none placeholder:text-slate-400"
                @click.stop
              />
            </div>
          </div>
          <div class="flex items-center justify-between border-b border-slate-100 px-2.5 py-1.5">
            <button
              type="button"
              class="flex items-center gap-1.5 text-[10px] font-semibold text-blue-600 hover:text-blue-700"
              @click.stop="toggleAllCos"
            >
              <span
                class="inline-flex h-3.5 w-3.5 items-center justify-center rounded border transition"
                :class="allCosSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'"
              ><i v-if="allCosSelected" class="fas fa-check text-[7px] text-white"></i></span>
              {{ allCosSelected ? 'Deselect All' : 'Select All' }}
            </button>
            <button
              type="button"
              class="text-[10px] text-slate-400 hover:text-rose-500"
              @click.stop="clearCos"
            >Clear</button>
          </div>
          <div class="max-h-44 overflow-y-auto py-1">
            <label
              v-for="c in filteredCos"
              :key="c.id"
              class="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 hover:bg-blue-50"
            >
              <span
                class="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition"
                :class="selCoIds.includes(String(c.id)) ? 'border-blue-600 bg-blue-600' : 'border-slate-300'"
              ><i v-if="selCoIds.includes(String(c.id))" class="fas fa-check text-[7px] text-white"></i></span>
              <input
                type="checkbox"
                :checked="selCoIds.includes(String(c.id))"
                class="sr-only"
                @change="toggleCo(c.id)"
              />
              <span class="flex-1 truncate text-[11px] text-slate-700">{{ c.name }}</span>
            </label>
            <div v-if="!filteredCos.length" class="py-3 text-center text-[11px] text-slate-400">
              No companies found
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- ── Department multi-select ──────────────────────────────────────────── -->
    <div class="relative" :class="horizontal ? 'min-w-[160px] flex-1' : ''">

      <!-- Label row -->
      <div v-if="!horizontal" class="mb-1.5 flex items-center justify-between">
        <span
          class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition"
          :class="!selCoIds.length ? 'text-slate-300' : 'text-slate-500'"
        >
          <i
            class="far fa-sitemap transition"
            :class="!selCoIds.length ? 'text-slate-300' : 'text-indigo-400'"
          ></i>
          Department
          <span
            v-if="selDeptIds.length"
            class="rounded-full bg-indigo-600 px-1.5 py-px text-[9px] font-bold leading-tight text-white"
          >{{ selDeptIds.length }}</span>
        </span>
        <button
          v-if="selDeptIds.length"
          type="button"
          class="text-[10px] text-slate-400 transition hover:text-rose-500"
          @click.stop="selDeptIds = []"
        >clear</button>
      </div>

      <!-- Trigger -->
      <button
        type="button"
        class="relative w-full rounded-md border text-left text-xs transition-all focus:outline-none"
        :style="horizontal ? 'min-height:2rem' : 'min-height:2.25rem'"
        :class="[
          !selCoIds.length
            ? 'cursor-not-allowed border-slate-100 bg-slate-50/80 opacity-50'
            : selDeptIds.length
              ? 'border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-200/50'
              : 'border-slate-200 bg-white hover:border-indigo-200',
        ]"
        :disabled="!selCoIds.length"
        @click.stop="openDept"
      >
        <div class="flex min-h-[2rem] flex-wrap items-center gap-1 px-2 py-1 pr-7">
          <template v-if="deptChips.length">
            <span
              v-for="chip in deptChips"
              :key="chip.id"
              class="inline-flex items-center gap-0.5 rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700"
            >
              <span class="max-w-[80px] truncate">{{ chip.label }}</span>
              <button
                type="button"
                class="ml-0.5 opacity-60 hover:opacity-100"
                @click.stop="removeDept(chip.id)"
              ><i class="fas fa-times text-[8px]"></i></button>
            </span>
          </template>
          <span
            v-else
            class="text-xs"
            :class="!selCoIds.length ? 'text-slate-300' : 'text-slate-400'"
          >
            {{ selCoIds.length ? 'All departments' : 'Select company first' }}
          </span>
        </div>
        <span
          class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transition"
          :class="!selCoIds.length ? 'text-slate-300' : 'text-slate-400'"
        >
          <i
            class="fas fa-chevron-down text-[9px] transition-transform duration-150"
            :class="deptOpen ? 'rotate-180' : ''"
          ></i>
        </span>
      </button>

      <!-- Dropdown -->
      <Transition name="dd">
        <div
          v-if="deptOpen && selCoIds.length"
          class="absolute left-0 right-0 z-[60] mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl"
        >
          <div class="border-b border-slate-100 px-2 py-2">
            <div class="flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-1">
              <i class="far fa-search text-[10px] text-slate-400"></i>
              <input
                v-model="deptSearch"
                type="text"
                placeholder="Search department…"
                class="flex-1 bg-transparent text-[11px] outline-none placeholder:text-slate-400"
                @click.stop
              />
            </div>
          </div>
          <div class="flex items-center justify-between border-b border-slate-100 px-2.5 py-1.5">
            <button
              type="button"
              class="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700"
              @click.stop="toggleAllDepts"
            >
              <span
                class="inline-flex h-3.5 w-3.5 items-center justify-center rounded border transition"
                :class="allDeptsSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'"
              ><i v-if="allDeptsSelected" class="fas fa-check text-[7px] text-white"></i></span>
              {{ allDeptsSelected ? 'Deselect All' : 'Select All' }}
            </button>
            <button
              type="button"
              class="text-[10px] text-slate-400 hover:text-rose-500"
              @click.stop="selDeptIds = []"
            >Clear</button>
          </div>
          <div class="max-h-44 overflow-y-auto py-1">
            <!-- Grouped view (multi-company selected) -->
            <template v-if="groupedDepts">
              <div v-for="[groupName, depts] in groupedDepts" :key="groupName">
                <div class="sticky top-0 bg-slate-50/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 backdrop-blur-sm">
                  {{ groupName }}
                </div>
                <label
                  v-for="d in depts"
                  :key="d.id"
                  class="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-indigo-50"
                >
                  <span
                    class="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition"
                    :class="selDeptIds.includes(String(d.id)) ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'"
                  ><i v-if="selDeptIds.includes(String(d.id))" class="fas fa-check text-[7px] text-white"></i></span>
                  <input
                    type="checkbox"
                    :checked="selDeptIds.includes(String(d.id))"
                    class="sr-only"
                    @change="toggleDept(d.id)"
                  />
                  <span class="flex-1 truncate text-[11px] text-slate-700">{{ d.name }}</span>
                </label>
              </div>
            </template>
            <!-- Flat view (single company or no grouping needed) -->
            <template v-else>
              <label
                v-for="d in filteredDepts"
                :key="d.id"
                class="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50"
              >
                <span
                  class="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition"
                  :class="selDeptIds.includes(String(d.id)) ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'"
                ><i v-if="selDeptIds.includes(String(d.id))" class="fas fa-check text-[7px] text-white"></i></span>
                <input
                  type="checkbox"
                  :checked="selDeptIds.includes(String(d.id))"
                  class="sr-only"
                  @change="toggleDept(d.id)"
                />
                <span class="flex-1 truncate text-[11px] text-slate-700">{{ d.name }}</span>
              </label>
            </template>
            <div v-if="!filteredDepts.length" class="py-3 text-center text-[11px] text-slate-400">
              No departments found
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Employee multi-select (optional) -->
    <div
      v-if="showEmployees"
      class="relative"
      :class="horizontal ? 'min-w-[200px] flex-1' : ''"
    >
      <div v-if="!horizontal" class="mb-1.5 flex items-center justify-between">
        <span
          class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition"
          :class="!selCoIds.length ? 'text-slate-300' : 'text-slate-500'"
        >
          <i class="far fa-users" :class="!selCoIds.length ? 'text-slate-300' : 'text-emerald-400'"></i>
          Specific Employees
          <span
            v-if="selEmployeeIds.length"
            class="rounded-full bg-emerald-600 px-1.5 py-px text-[9px] font-bold leading-tight text-white"
          >{{ selEmployeeIds.length }}</span>
        </span>
        <button
          v-if="selEmployeeIds.length"
          type="button"
          class="text-[10px] text-slate-400 transition hover:text-rose-500"
          @click.stop="selEmployeeIds = []"
        >clear</button>
      </div>

      <button
        type="button"
        class="relative w-full rounded-md border text-left text-xs transition-all focus:outline-none"
        :style="horizontal ? 'min-height:2rem' : 'min-height:2.25rem'"
        :class="[
          !selCoIds.length
            ? 'cursor-not-allowed border-slate-100 bg-slate-50/80 opacity-50'
            : selEmployeeIds.length
              ? 'border-emerald-300 bg-emerald-50/50 ring-1 ring-emerald-200/50'
              : 'border-slate-200 bg-white hover:border-emerald-200',
        ]"
        :disabled="!selCoIds.length"
        @click.stop="openEmployee"
      >
        <div class="flex min-h-[2rem] flex-wrap items-center gap-1 px-2 py-1 pr-7">
          <template v-if="employeeChips.length">
            <span
              v-for="chip in employeeChips"
              :key="chip.id"
              class="inline-flex items-center gap-0.5 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"
            >
              <span class="max-w-[100px] truncate">{{ chip.label }}</span>
              <button
                type="button"
                class="ml-0.5 opacity-60 hover:opacity-100"
                @click.stop="removeEmployee(chip.id)"
              ><i class="fas fa-times text-[8px]"></i></button>
            </span>
          </template>
          <span v-else class="text-xs" :class="!selCoIds.length ? 'text-slate-300' : 'text-slate-400'">
            {{ !selCoIds.length ? 'Select company first' : employeesLoading ? 'Loading employees…' : 'Select employees' }}
          </span>
        </div>
        <span class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
          <i
            class="fas text-[9px]"
            :class="employeesLoading ? 'fa-spinner fa-spin' : 'fa-chevron-down'"
          ></i>
        </span>
      </button>

      <Transition name="dd">
        <div
          v-if="employeeOpen && selCoIds.length"
          class="absolute left-0 right-0 z-[60] mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl"
        >
          <div class="border-b border-slate-100 px-2 py-2">
            <div class="flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-1">
              <i class="far fa-search text-[10px] text-slate-400"></i>
              <input
                v-model="employeeSearch"
                type="text"
                placeholder="Search employee…"
                class="flex-1 bg-transparent text-[11px] outline-none placeholder:text-slate-400"
                @click.stop
              />
            </div>
          </div>
          <div class="flex items-center justify-between border-b border-slate-100 px-2.5 py-1.5">
            <button
              type="button"
              class="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 hover:text-emerald-700"
              :disabled="!employees.length"
              @click.stop="toggleAllEmployees"
            >
              <span
                class="inline-flex h-3.5 w-3.5 items-center justify-center rounded border transition"
                :class="allEmployeesSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'"
              ><i v-if="allEmployeesSelected" class="fas fa-check text-[7px] text-white"></i></span>
              {{ allEmployeesSelected ? 'Deselect All' : 'Select All' }}
            </button>
            <button
              type="button"
              class="text-[10px] text-slate-400 hover:text-rose-500"
              @click.stop="selEmployeeIds = []"
            >Clear</button>
          </div>
          <div class="max-h-52 overflow-y-auto py-1">
            <label
              v-for="employee in filteredEmployees"
              :key="employee.id"
              class="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 hover:bg-emerald-50"
            >
              <span
                class="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition"
                :class="selEmployeeIds.includes(String(employee.id)) ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'"
              ><i v-if="selEmployeeIds.includes(String(employee.id))" class="fas fa-check text-[7px] text-white"></i></span>
              <input
                type="checkbox"
                :checked="selEmployeeIds.includes(String(employee.id))"
                class="sr-only"
                @change="toggleEmployee(employee.id)"
              />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[11px] text-slate-700">{{ employee.name }}</span>
                <span v-if="employee.employee_id" class="block truncate text-[9px] text-slate-400">{{ employee.employee_id }}</span>
              </span>
            </label>
            <div v-if="employeesLoading" class="py-3 text-center text-[11px] text-slate-400">
              Loading employees…
            </div>
            <div v-else-if="!filteredEmployees.length" class="py-3 text-center text-[11px] text-slate-400">
              No employees found
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Active scope summary pill (sidebar only) -->
    <div
      v-if="!horizontal && (selCoIds.length || selDeptIds.length)"
      class="flex items-center gap-1.5 rounded-md border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-2.5 py-1.5 text-[10px]"
    >
      <i class="fas fa-filter text-[9px] text-blue-400"></i>
      <span class="font-bold text-blue-700">{{ selCoIds.length || 'All' }}</span>
      <span class="text-slate-500">{{ selCoIds.length === 1 ? 'company' : 'companies' }}</span>
      <span class="text-slate-300">·</span>
      <span class="font-bold text-indigo-700">{{ selDeptIds.length || 'All' }}</span>
      <span class="text-slate-500">{{ selDeptIds.length === 1 ? 'dept' : 'depts' }}</span>
    </div>
  </div>
</template>

<style scoped>
.dd-enter-active, .dd-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.dd-enter-from, .dd-leave-to {
  opacity: 0;
  transform: translateY(-4px) scaleY(0.97);
}
</style>
