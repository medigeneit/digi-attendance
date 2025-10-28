<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { useKpiAdminStore } from '@/stores/kpiAdmin'
import AsyncUserCombobox from '@/components/common/AsyncUserCombobox.vue'

const s = useKpiAdminStore()

const selectedCycleId = ref(null)
const tab = ref('department') // 'department' | 'employee'
const selectedDept = ref(null)
const selectedEmp  = ref(null)
const laneRows = ref([]) // {lane_key,label,assigned_user_id, assignee_name, assignee_dept}

const searchDept = ref(''); const deptList = ref([])
const searchUser = ref(''); const userList = ref([])

const dirty = ref(false)

onMounted(async () => {
  await s.fetchCycles()
  if (s.cycles.length) {
    selectedCycleId.value = s.cycles[0].id
    await loadCycle()
  }
  // unsaved guard
  window.addEventListener('beforeunload', warnIfDirty)
})
function warnIfDirty(e){ if (dirty.value){ e.preventDefault(); e.returnValue = '' } }
onUnmounted(()=> window.removeEventListener('beforeunload', warnIfDirty))

async function loadCycle() {
  await s.loadCycle(selectedCycleId.value)
  laneRows.value = (s.lanesConfig || []).map(l => ({
    lane_key: l.key, label: l.label,
    assigned_user_id: null, assignee_name: null, assignee_dept: null
  }))
  dirty.value = false
  if ((tab.value === 'department' && selectedDept.value) || (tab.value === 'employee' && selectedEmp.value)) {
    await loadExistingOverrides()
  }
}

async function doLookupDepartments() { deptList.value = await s.lookupDepartments(searchDept.value) }
async function doLookupUsers() { userList.value = await s.lookupUsers(searchUser.value) }

const targetSummary = computed(()=> tab.value==='department'
  ? (selectedDept.value ? `Dept: ${selectedDept.value.name}` : 'Select a department')
  : (selectedEmp.value ? `Employee: ${selectedEmp.value.name}` : 'Select an employee')
)

async function loadExistingOverrides() {
  const params = { cycle_id: selectedCycleId.value, scope: tab.value }
  if (tab.value==='department' && selectedDept.value) params.department_id = selectedDept.value.id
  if (tab.value==='employee' && selectedEmp.value) params.employee_id = selectedEmp.value.id

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

function updateRow(row, id, display){
  row.assigned_user_id = id
  row.assignee_name = display?.name || null
  row.assignee_dept = display?.dept || null
  dirty.value = true
}
function clearRow(row){
  row.assigned_user_id = null
  row.assignee_name = null
  row.assignee_dept = null
  dirty.value = true
}
function applyToAllEmpty() {
  // প্রথম non-empty কে সবার empty-তে বসিয়ে দিন
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

async function save() {
  if (!selectedCycleId.value) return alert('Select cycle')
  if (tab.value==='department' && !selectedDept.value) return alert('Select department')
  if (tab.value==='employee' && !selectedEmp.value) return alert('Select employee')

  const payload = {
    cycle_id: selectedCycleId.value,
    scope: tab.value,
    department_id: tab.value==='department' ? selectedDept?.value?.id : null,
    employee_id: tab.value==='employee' ? selectedEmp?.value?.id : null,
    overrides: laneRows.value.map(r => ({ lane_key: r.lane_key, assigned_user_id: r.assigned_user_id }))
  }
  try {
    await s.saveOverridesBulk(payload)
    dirty.value = false
    alert('Saved!')
  } catch (e) {
    console.error(e); alert('Failed to save')
  }
}

watch([tab, selectedCycleId], () => {
  selectedDept.value = null
  selectedEmp.value = null
  loadCycle()
})
</script>

<template>
  <div class="max-w-6xl mx-auto p-4 space-y-5">
    <!-- Pro Header -->
    <header class="sticky top-0 z-10 bg-white/85 backdrop-blur border-b -mx-4 px-4">
      <div class="flex flex-col gap-2 py-3">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h1 class="text-lg md:text-xl font-semibold">KPI — Permissions</h1>
            <div class="text-xs text-slate-600">
              <span>{{ targetSummary }}</span>
              <span v-if="dirty" class="ml-2 inline-flex items-center text-amber-700">• Unsaved changes</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <select v-model="selectedCycleId" @change="loadCycle"
                    class="border rounded-lg px-3 py-2 bg-white">
              <option v-for="c in s.cycles" :value="c.id" :key="c.id">{{ c.title }} ({{ c.year }})</option>
            </select>
            <button @click="loadCycle" class="px-3 py-2 border rounded-lg hover:bg-slate-50">Reload</button>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="inline-flex rounded-xl border overflow-hidden">
            <button @click="tab='department'" :class="['px-4 py-2 text-sm', tab==='department' ? 'bg-slate-900 text-white' : 'bg-white']">Department</button>
            <button @click="tab='employee'" :class="['px-4 py-2 text-sm border-l', tab==='employee' ? 'bg-slate-900 text-white' : 'bg-white']">Employee</button>
          </div>

          <div class="flex items-center gap-2">
            <button @click="applyToAllEmpty" class="px-3 py-1.5 border rounded-lg hover:bg-slate-50">Apply to all empty lanes</button>
            <button @click="save"
                    :disabled="!selectedCycleId || (tab==='department' ? !selectedDept : !selectedEmp) || !dirty"
                    class="px-4 py-2 rounded-xl text-white"
                    :class="dirty ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400 cursor-not-allowed'">
              Save Overrides
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Target pickers -->
    <div class="grid md:grid-cols-2 gap-4">
      <div v-if="tab==='department'" class="rounded-2xl border p-4">
        <div class="text-sm mb-2 font-medium">Select Department</div>
        <div class="relative">
          <input v-model="searchDept" @input="doLookupDepartments" placeholder="Search department…"
                 class="border rounded-lg px-3 py-2 w-full md:w-80" />
          <div v-if="deptList.length" class="absolute mt-1 border bg-white rounded-lg shadow max-h-56 overflow-auto w-full md:w-96 z-20">
            <button v-for="d in deptList" :key="d.id"
                    @click="selectedDept=d; deptList=[]; loadExistingOverrides()"
                    class="flex w-full items-center justify-between px-3 py-2 hover:bg-slate-50">
              <span>{{ d.name }}</span>
              <span class="text-xs text-slate-500">ID: {{ d.id }}</span>
            </button>
          </div>
        </div>
      </div>

      <div v-else class="rounded-2xl border p-4">
        <div class="text-sm mb-2 font-medium">Select Employee</div>
        <div class="relative">
          <input v-model="searchUser" @input="doLookupUsers" placeholder="Search employee…"
                 class="border rounded-lg px-3 py-2 w-full md:w-[26rem]" />
          <div v-if="userList.length" class="absolute mt-1 border bg-white rounded-lg shadow max-h-56 overflow-auto w-full md:w-[26rem] z-20">
            <button v-for="u in userList" :key="u.id"
                    @click="selectedEmp=u; userList=[]; loadExistingOverrides()"
                    class="flex w-full items-center justify-between px-3 py-2 hover:bg-slate-50">
              <span>{{ u.name }}</span>
              <span class="text-xs text-slate-500">{{ u.department_name || 'N/A' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
sujon
    <!-- Lanes table (pro look) -->
    <div class="rounded-2xl border">
      <table class="w-full text-sm">
        <thead class="bg-slate-50">
          <tr>
            <th class="text-left px-3 py-2 w-[28%]">Lane</th>
            <th class="text-left px-3 py-2">Assignee</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in laneRows" :key="row.lane_key" class="border-t">
            <td class="px-3 py-2">
              <div class="font-medium">{{ row.label }}</div>
              <div class="text-[11px] text-slate-500">{{ row.lane_key }}</div>
            </td>
            <td class="px-3 py-3">
              <AsyncUserCombobox
                :model-value="row.assigned_user_id"
                :display="{ name: row.assignee_name, dept: row.assignee_dept }"
                :lane-key="row.lane_key"
                :fetcher="(p) => s.lookupUsers(p)"
                placeholder="Search user for this lane…"
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
