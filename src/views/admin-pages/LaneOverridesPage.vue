<script setup>
import { ref, onMounted, computed, watch, onUnmounted, nextTick } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useKpiAdminStore } from '@/stores/kpiAdmin'
import AsyncUserCombobox from '@/components/common/AsyncUserCombobox.vue'

/* ---------------- stores & router ---------------- */
const s = useKpiAdminStore()
const router = useRouter()

/* ---------------- state ---------------- */
const selectedCycleId = ref(null)
const tab = ref('department') // 'department' | 'employee'

const selectedDept = ref(null)  // { id, name }
const selectedEmp  = ref(null)  // { id, name, department_name }

const laneRows = ref([]) // { lane_key,label,assigned_user_id, assignee_name, assignee_dept }
const dirty = ref(false)

/* lookup lists */
const searchDept = ref('')
const deptList = ref([])
const searchUser = ref('')
const userList = ref([])

/* popovers */
const showDeptPopover = ref(false)
const showUserPopover = ref(false)
const deptPopoverRef = ref(null)
const userPopoverRef = ref(null)
const deptActiveIdx = ref(0)
const userActiveIdx = ref(0)

/* ---------------- utils ---------------- */
const debounce = (fn, delay = 300) => {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay) }
}

function useClickOutside(targetRef, handler) {
  const onClick = (e) => {
    const el = targetRef.value
    if (!el) return
    if (e.target === el || el.contains(e.target)) return
    handler()
  }
  onMounted(() => document.addEventListener('mousedown', onClick))
  onUnmounted(() => document.removeEventListener('mousedown', onClick))
}

useClickOutside(deptPopoverRef, () => { showDeptPopover.value = false })
useClickOutside(userPopoverRef, () => { showUserPopover.value = false })

/* ---------------- computed ---------------- */
const totalLanes = computed(() => laneRows.value.length)
const assignedCount = computed(() => laneRows.value.filter(r => r.assigned_user_id).length)

const targetSummary = computed(() =>
  tab.value === 'department'
    ? (selectedDept.value ? `Department: ${selectedDept.value.name}` : 'Select a department')
    : (selectedEmp.value ? `Employee: ${selectedEmp.value.name}` : 'Select an employee')
)

/* ---------------- lifecycle ---------------- */
onMounted(async () => {
  await s.fetchCycles()
  if (s.cycles.length) {
    selectedCycleId.value = s.cycles[0].id
    await loadCycle()
  }

  // unsaved guard (browser refresh/close)
  window.addEventListener('beforeunload', warnIfDirty)

  // hotkey: Ctrl/Cmd + S
  window.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', warnIfDirty)
  window.removeEventListener('keydown', onGlobalKeydown)
})

// unsaved guard (route navigation)
onBeforeRouteLeave((_to, _from, next) => {
  if (!dirty.value) return next()
  const ok = confirm('You have unsaved changes. Leave without saving?')
  if (ok) next()
  else next(false)
})

function warnIfDirty(e) { if (dirty.value) { e.preventDefault(); e.returnValue = '' } }
function onGlobalKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    if (canSave.value) save()
  }
}

/* ---------------- load cycle & overrides ---------------- */
async function loadCycle() {
  await s.loadCycle(selectedCycleId.value)

  laneRows.value = (s.lanesConfig || []).map(l => ({
    lane_key: l.key,
    label: l.label,
    assigned_user_id: null,
    assignee_name: null,
    assignee_dept: null
  }))
  dirty.value = false

  // reload overrides if a target already selected
  if ((tab.value === 'department' && selectedDept.value) || (tab.value === 'employee' && selectedEmp.value)) {
    await loadExistingOverrides()
  }
}

async function loadExistingOverrides() {
  const params = { cycle_id: selectedCycleId.value, scope: tab.value }
  if (tab.value === 'department' && selectedDept.value) params.department_id = selectedDept.value.id
  if (tab.value === 'employee' && selectedEmp.value) params.employee_id = selectedEmp.value.id

  const res = await s.fetchOverrides(params)
  const map = {}
  ;(res.data || []).forEach(o => {
    map[o.lane_key] = {
      id: o.assigned_user_id,
      name: o.assignee?.name || null,
      dept: o.assignee?.department?.name || (o.assignee?.department_name ?? null)
    }
  })

  laneRows.value = (s.lanesConfig || []).map(l => {
    const m = map[l.key] || null
    return {
      lane_key: l.key,
      label: l.label,
      assigned_user_id: m?.id ?? null,
      assignee_name: m?.name ?? null,
      assignee_dept: m?.dept ?? null
    }
  })
  dirty.value = false
}

/* ---------------- updates ---------------- */
function updateRow(row, id, display) {
  row.assigned_user_id = id
  row.assignee_name = display?.name || null
  row.assignee_dept = display?.dept || null
  dirty.value = true
}
function clearRow(row) {
  row.assigned_user_id = null
  row.assignee_name = null
  row.assignee_dept = null
  dirty.value = true
}
function applyToAllEmpty() {
  const src = laneRows.value.find(r => r.assigned_user_id)
  if (!src) return
  laneRows.value.forEach(r => {
    if (!r.assigned_user_id) {
      r.assigned_user_id = src.assigned_user_id
      r.assignee_name = src.assignee_name
      r.assignee_dept = src.assignee_dept
    }
  })
  dirty.value = true
}

/* ---------------- save ---------------- */
const canSave = computed(() =>
  !!selectedCycleId.value &&
  (tab.value === 'department' ? !!selectedDept.value : !!selectedEmp.value) &&
  dirty.value
)

async function save() {
  if (!selectedCycleId.value) return alert('Select cycle')
  if (tab.value === 'department' && !selectedDept.value) return alert('Select department')
  if (tab.value === 'employee' && !selectedEmp.value) return alert('Select employee')

  const payload = {
    cycle_id: selectedCycleId.value,
    scope: tab.value,
    department_id: tab.value === 'department' ? selectedDept?.value?.id : null,
    employee_id:   tab.value === 'employee'   ? selectedEmp?.value?.id   : null,
    overrides: laneRows.value.map(r => ({ lane_key: r.lane_key, assigned_user_id: r.assigned_user_id }))
  }
  try {
    await s.saveOverridesBulk(payload)
    dirty.value = false
    alert('Saved!')
  } catch (e) {
    console.error(e)
    alert('Failed to save')
  }
}

/* ---------------- lookups (debounced) ---------------- */
const doLookupDepartments = debounce(async () => {
  deptList.value = await s.lookupDepartments(searchDept.value)
  deptActiveIdx.value = 0
}, 250)

const doLookupUsers = debounce(async () => {
  userList.value = await s.lookupUsers(searchUser.value)
  userActiveIdx.value = 0
}, 250)

/* ---------------- popover actions & keys ---------------- */
function openDeptPopover() {
  showDeptPopover.value = true
  nextTick(() => {
    const el = document.getElementById('dept-search-input')
    el && el.focus()
  })
}
function openUserPopover() {
  showUserPopover.value = true
  nextTick(() => {
    const el = document.getElementById('user-search-input')
    el && el.focus()
  })
}

function pickDept(d) {
  selectedDept.value = d
  showDeptPopover.value = false
  deptList.value = []
  loadExistingOverrides()
}
function clearDept() {
  selectedDept.value = null
  laneRows.value = laneRows.value.map(r => ({ ...r, assigned_user_id: null, assignee_name: null, assignee_dept: null }))
  dirty.value = false
}

function pickUser(u) {
  selectedEmp.value = u
  showUserPopover.value = false
  userList.value = []
  loadExistingOverrides()
}
function clearUser() {
  selectedEmp.value = null
  laneRows.value = laneRows.value.map(r => ({ ...r, assigned_user_id: null, assignee_name: null, assignee_dept: null }))
  dirty.value = false
}

function onDeptKeydown(e) {
  const n = deptList.value.length
  if (!n) return
  if (e.key === 'ArrowDown') { e.preventDefault(); deptActiveIdx.value = (deptActiveIdx.value + 1) % n }
  if (e.key === 'ArrowUp')   { e.preventDefault(); deptActiveIdx.value = (deptActiveIdx.value - 1 + n) % n }
  if (e.key === 'Enter')     { e.preventDefault(); pickDept(deptList.value[deptActiveIdx.value]) }
  if (e.key === 'Escape')    { e.preventDefault(); showDeptPopover.value = false }
}

function onUserKeydown(e) {
  const n = userList.value.length
  if (!n) return
  if (e.key === 'ArrowDown') { e.preventDefault(); userActiveIdx.value = (userActiveIdx.value + 1) % n }
  if (e.key === 'ArrowUp')   { e.preventDefault(); userActiveIdx.value = (userActiveIdx.value - 1 + n) % n }
  if (e.key === 'Enter')     { e.preventDefault(); pickUser(userList.value[userActiveIdx.value]) }
  if (e.key === 'Escape')    { e.preventDefault(); showUserPopover.value = false }
}

/* ---------------- watchers ---------------- */
watch([tab, selectedCycleId], () => {
  selectedDept.value = null
  selectedEmp.value = null
  loadCycle()
})
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-6 space-y-6">
    <!-- Header -->
    <header class="sticky top-0 z-20 -mx-4 px-4 pt-3 pb-4 bg-white/90 backdrop-blur border-b shadow-sm">
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h1 class="text-lg md:text-xl font-semibold text-slate-900">KPI Lane Overrides</h1>
            <div class="text-xs text-slate-600 flex items-center gap-3">
              <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                Assigned: <b>{{ assignedCount }}</b>/<b>{{ totalLanes }}</b>
              </span>
              <span v-if="dirty" class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">Unsaved changes</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <select v-model="selectedCycleId" @change="loadCycle"
                    class="border border-slate-200 rounded-lg px-3 py-2 bg-white text-sm shadow-sm">
              <option v-for="c in s.cycles" :value="c.id" :key="c.id">
                {{ c.title }} ({{ c.year }})
              </option>
            </select>
            <button @click="loadCycle" class="px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Reload</button>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="inline-flex rounded-full border border-slate-200 overflow-hidden bg-white shadow-sm">
            <button @click="tab='department'" :class="['px-4 py-2 text-sm transition', tab==='department' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50']">Department</button>
            <button @click="tab='employee'"   :class="['px-4 py-2 text-sm transition border-l border-slate-200', tab==='employee'   ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50']">Employee</button>
          </div>

          <div class="flex items-center gap-2">
            <button @click="applyToAllEmpty" class="px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Apply to all empty lanes</button>
            <button @click="save"
                    :disabled="!canSave"
                    class="px-4 py-2 rounded-xl text-white text-sm font-medium transition shadow-sm"
                    :class="canSave ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400 cursor-not-allowed'">
              Save (Ctrl/Cmd+S)
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Target pickers -->
    <div class="w-full gap-4">
      <!-- Department picker -->
      <div v-if="tab==='department'" class="rounded-2xl border border-slate-200 bg-white p-4 relative shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <div class="text-sm font-semibold text-slate-800">Target Department</div>
          <span class="text-xs text-slate-500">{{ targetSummary }}</span>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50"
            @click="openDeptPopover"
          >
            {{ selectedDept ? 'Change department' : 'Choose department' }}
          </button>

          <div v-if="selectedDept" class="inline-flex items-center gap-2 bg-slate-100 text-slate-800 px-3 py-1.5 rounded-full">
            <span class="text-sm font-medium">{{ selectedDept.name }}</span>
            <button @click="clearDept" class="text-xs rounded-full px-2 py-0.5 border border-slate-200 hover:bg-white" title="Clear">Clear</button>
          </div>
        </div>

        <!-- Popover -->
        <transition enter-active-class="transition ease-out duration-150" enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0"
                    leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-1">
          <div v-if="showDeptPopover" ref="deptPopoverRef"
               class="absolute z-30 mt-2 w-full md:w-[28rem] max-h-[22rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div class="p-3 border-b border-slate-200">
              <input id="dept-search-input" v-model="searchDept" @input="doLookupDepartments" @keydown="onDeptKeydown"
                     placeholder="Search department" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
            </div>
            <div class="max-h-[18rem] overflow-auto">
              <template v-if="deptList.length">
                <button
                  v-for="(d, i) in deptList" :key="d.id"
                  @click="pickDept(d)"
                  class="flex w-full items-center justify-between px-3 py-2 border-b border-slate-100 last:border-b-0 text-left"
                  :class="i === deptActiveIdx ? 'bg-slate-50' : 'hover:bg-slate-50'"
                >
                  <span class="truncate">{{ d.name }}</span>
                  <span class="text-[11px] text-slate-500">#{{ d.id }}</span>
                </button>
              </template>
              <div v-else class="px-4 py-8 text-center text-sm text-slate-500">No departments found</div>
            </div>
          </div>
        </transition>
      </div>

      <!-- Employee picker -->
      <div v-else class="rounded-2xl border border-slate-200 p-4 bg-white relative shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <div class="text-sm font-semibold text-slate-800">Target Employee</div>
          <span class="text-xs text-slate-500">{{ targetSummary }}</span>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50"
            @click="openUserPopover"
          >
            {{ selectedEmp ? 'Change employee' : 'Choose employee' }}
          </button>

          <div v-if="selectedEmp" class="inline-flex items-center gap-2 bg-slate-100 text-slate-800 px-3 py-1.5 rounded-full">
            <span class="text-sm font-medium">
              {{ selectedEmp.name }}
              <span class="text-xs text-slate-500"> - {{ selectedEmp.department_name || 'N/A' }}</span>
            </span>
            <button @click="clearUser" class="text-xs rounded-full px-2 py-0.5 border border-slate-200 hover:bg-white" title="Clear">Clear</button>
          </div>
        </div>

        <!-- Popover -->
        <transition enter-active-class="transition ease-out duration-150" enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0"
                    leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-1">
          <div v-if="showUserPopover" ref="userPopoverRef"
               class="absolute z-30 mt-2 w-full md:w-[32rem] max-h-[22rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div class="p-3 border-b border-slate-200">
              <input id="user-search-input" v-model="searchUser" @input="doLookupUsers" @keydown="onUserKeydown"
                     placeholder="Search employee" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
            </div>
            <div class="max-h-[18rem] overflow-auto">
              <template v-if="userList.length">
                <button
                  v-for="(u, i) in userList" :key="u.id"
                  @click="pickUser(u)"
                  class="flex w-full items-center justify-between px-3 py-2 border-b border-slate-100 last:border-b-0 text-left"
                  :class="i === userActiveIdx ? 'bg-slate-50' : 'hover:bg-slate-50'"
                >
                  <span class="truncate">{{ u.name }}</span>
                  <span class="text-[11px] text-slate-500">{{ u.department_name || 'N/A' }}</span>
                </button>
              </template>
              <div v-else class="px-4 py-8 text-center text-sm text-slate-500">No employees found</div>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- Lanes table -->
    <div class="rounded-2xl border border-slate-200 bg-white overflow-auto shadow-sm">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="text-left px-3 py-2 w-[30%]">Lane</th>
            <th class="text-left px-3 py-2">Assignee</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in laneRows" :key="row.lane_key" class="border-t border-slate-100 hover:bg-slate-50/60">
            <td class="px-3 py-3">
              <div class="font-medium text-slate-800">{{ row.label }}</div>
              <div class="text-[11px] text-slate-500">{{ row.lane_key }}</div>
            </td>
            <td class="px-3 py-3">
              <AsyncUserCombobox
                :model-value="row.assigned_user_id"
                :display="{ name: row.assignee_name, dept: row.assignee_dept }"
                :lane-key="row.lane_key"
                :fetcher="(p) => s.lookupUsers(p)"
                placeholder="Search user for this lane"
                @update:modelValue="(v)=>updateRow(row, v, {name: row.assignee_name, dept: row.assignee_dept})"
                @update:display="(d)=>updateRow(row, row.assigned_user_id, d)"
                @cleared="()=>clearRow(row)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
