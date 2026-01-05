<script setup>
import { ref, computed, watch, onBeforeUnmount, onMounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useClearanceStore } from '@/stores/clearance'
import { useAuthStore } from '@/stores/auth'
import ClearanceEditorTable from '@/components/ClearanceEditorTable.vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'

/* ---------------- Stores ---------------- */
const c = useClearanceStore()
const auth = useAuthStore()
const route = useRoute()

/* ---------------- Local State ---------------- */
const departmentId = ref(null)
const templateId = ref(2) // default selected template
const autoPrintPending = ref(false)

const queryUserId = computed(() => {
  const raw = route.query.userId ?? route.query.user_id ?? route.query.uid
  const id = Number(raw)
  return Number.isNaN(id) ? null : id
})
const queryDepartmentId = computed(() => {
  const raw = route.query.departmentId ?? route.query.department_id ?? route.query.deptId
  const id = Number(raw)
  return Number.isNaN(id) ? null : id
})
const queryTemplateId = computed(() => {
  const raw = route.query.templateId ?? route.query.template_id
  const id = Number(raw)
  return Number.isNaN(id) ? null : id
})
const printRequested = computed(() => String(route.query.print || '') === '1')

const {
  userId,
  departments,
  statusFilter,
  users,
  itemsForTable,
  loading,
  saving,
  error,
  dirty,
} = storeToRefs(c)

/* ---------------- Helpers ---------------- */
const fmtDirtyCount = () => dirty.value.size
const canLoad = () => !!departmentId.value && !!templateId.value

const selectedDepartment = computed(() => {
  return (departments.value || []).find((d) => d.id === departmentId.value) || null
})
const selectedUser = computed(() => {
  return (users.value || []).find((u) => u.id === userId.value) || null
})

const userOptionLabel = (u) => {
  if (!u) return ''
  const name = u.name || 'Unnamed'
  const code = u.employee_code || u.employee_id || u.code || ''
  const desig = u.designation?.name || u.designation_name || ''
  const extra = [code, desig].filter(Boolean).join(' • ')
  return extra ? `${name} (${extra})` : name
}

const normalizeDate = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

const todayKey = () => {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

const stepState = computed(() => {
  if (!departmentId.value) return 'dept'
  if (!userId.value) return 'user'
  return 'work'
})

const exitDateKey = computed(() => normalizeDate(selectedUser.value?.last_working_date))
const isReadOnly = computed(() => {
  if (!exitDateKey.value) return false
  return exitDateKey.value <= todayKey()
})

/* ---------------- Confirm before resetting (department change) ---------------- */
const confirmDiscardIfDirty = async () => {
  if (dirty.value.size > 0 && typeof window !== 'undefined') {
    return window.confirm('You have unsaved changes. Changing Department will discard them. Continue?')
  }
  return true
}

/* ---------------- Bootstrap from auth dept ---------------- */
watch(
  () => auth.user?.department_id,
  async (deptId) => {
    if (!deptId) return
    if (queryDepartmentId.value) return
    departmentId.value = deptId
    users.value = []
    userId.value = null
    try {
      await c.loadUsersByDept(deptId)
      if (canLoad()) await c.refreshAll(deptId, templateId.value)
    } catch (e) {
      console.error('bootstrap error', e)
    }
  },
  { immediate: true }
)

watch(
  () => route.query,
  () => {
    if (queryDepartmentId.value) departmentId.value = queryDepartmentId.value
    if (queryTemplateId.value) templateId.value = queryTemplateId.value
    if (queryUserId.value) userId.value = queryUserId.value
    if (printRequested.value) autoPrintPending.value = true
  },
  { immediate: true }
)

/* ---------------- Reactivity ---------------- */
// Department change → reset user, reload users, refresh template bindings
watch(departmentId, async (newDept, oldDept) => {
  if (newDept === oldDept) return

  // dirty guard
  const ok = await confirmDiscardIfDirty()
  if (!ok) {
    departmentId.value = oldDept ?? null
    return
  }

  users.value = []
  userId.value = null

  if (newDept) {
    try {
      await c.loadUsersByDept(newDept)
      if (queryUserId.value) userId.value = queryUserId.value
      if (templateId.value) await c.refreshAll(newDept, templateId.value)
    } catch (e) {
      console.error('dept change error', e)
    }
  }
})

// Template change → refresh template bindings
watch(templateId, async (newTpl) => {
  if (departmentId.value && newTpl) {
    try {
      await c.refreshAll(departmentId.value, newTpl)
      if (userId.value) {
        await c.loadClearances(userId.value, departmentId.value, templateId.value)
      }
    } catch (e) {
      console.error('template change error', e)
    }
  }
})

// User change → load that user's clearances
watch(userId, async () => {
  if (canLoad() && userId.value) {
    try {
      await c.loadClearances(userId.value, departmentId.value, templateId.value)
    } catch (e) {
      console.error('user change error', e)
    }
  }
})

/* ---------------- Row update (local patch + dirty) ---------------- */
function onRowUpdate(tid, patch) {
  if (isReadOnly.value) return
  const rows = itemsForTable.value
  const idx = rows.findIndex((x) => x.template_item_id === tid)
  if (idx >= 0) {
    Object.assign(rows[idx], patch)
    c.markDirty(tid, true)
  }
}

/* ---------------- Actions ---------------- */
async function onSave() {
  try {
    if (!userId.value) return
    if (isReadOnly.value) return
    await c.saveBulk(departmentId.value, templateId.value)
  } catch (e) {
    console.error(e)
  }
}

async function onRefresh() {
  if (!canLoad()) return
  try {
    await c.refreshAll(departmentId.value, templateId.value)
    if (userId.value) {
      await c.loadClearances(userId.value, departmentId.value, templateId.value)
    }
  } catch (e) {
    console.error('refresh error', e)
  }
}

async function printClearanceSummary() {
  if (!userId.value) return
  document.body.classList.add('printing-clearance-summary')
  await nextTick()
  window.print()
  setTimeout(() => document.body.classList.remove('printing-clearance-summary'), 0)
}

/* ---------------- Summary counts ---------------- */
const counts = computed(() => {
  if (!userId.value) return { pending: 0, working: 0, completed: 0 }
  const arr = itemsForTable.value || []
  return {
    pending: arr.filter((r) => r.status === 'PENDING').length,
    working: arr.filter((r) => r.status === 'WORKING').length,
    completed: arr.filter((r) => r.status === 'COMPLETED').length,
  }
})

const printCompanyName = computed(() => selectedUser.value?.company?.name || 'Digi Attendance')
const printRows = computed(() => {
  const arr = itemsForTable.value || []
  return arr.map((row) => ({
    label: row.label || row.item_label || row.item_key || `#${row.template_item_id ?? row.id ?? ''}`,
    status: row.status || 'N/A',
    remarks: row.remarks || row.present_condition || ''
  }))
})

/* ---------------- Dirty guard (SSR-safe) ---------------- */
function beforeUnload(e) {
  if (dirty.value.size > 0) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(async () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', beforeUnload)
  }
  try {
    await c.fetchDepartments()
  } catch (e) {
    console.error('fetchDepartments error', e)
  }
})

watch([loading, itemsForTable, userId], async () => {
  if (!autoPrintPending.value) return
  if (!userId.value || loading.value) return
  autoPrintPending.value = false
  await nextTick()
  printClearanceSummary()
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeunload', beforeUnload)
  }
})

onBeforeRouteLeave((to, from, next) => {
  if (dirty.value.size > 0 && typeof window !== 'undefined') {
    if (!window.confirm('You have unsaved changes. Leave anyway?')) return next(false)
  }
  next()
})
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Sticky Header / Actions -->
    <div class="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
      <div class="flex flex-wrap items-center justify-between gap-4 py-3">
        <div class="p-2 space-y-1">
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-semibold tracking-tight">User Clearance</h1>

            <!-- Step badge -->
            <span
              class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
              :class="{
                'bg-slate-100 text-slate-700': stepState === 'dept',
                'bg-blue-50 text-blue-700': stepState === 'user',
                'bg-emerald-50 text-emerald-700': stepState === 'work',
              }"
            >
              {{
                stepState === 'dept'
                  ? 'Step 1: Department'
                  : stepState === 'user'
                  ? 'Step 2: User'
                  : 'Step 3: Update'
              }}
            </span>
          </div>

          <p class="text-sm text-gray-600">
            Assign করা আইটেম অনুযায়ী ইউজারের ক্লিয়ারেন্স আপডেট করুন
          </p>

          <!-- Selected context -->
          <div class="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
              Dept:
              <b class="text-slate-800">{{ selectedDepartment?.name || '—' }}</b>
            </span>
            <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
              User:
              <b class="text-slate-800">{{ selectedUser?.name || '—' }}</b>
            </span>
            <span
              v-if="dirty.size"
              class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-700"
            >
              Unsaved: <b>{{ fmtDirtyCount() }}</b>
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- quick status chips -->
          <div
            v-if="userId"
            class="hidden md:flex items-center gap-2 text-xs text-gray-600"
            aria-label="Summary"
          >
            <span class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
              Pending: <b>{{ counts.pending }}</b>
            </span>
            <span class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
              Working: <b>{{ counts.working }}</b>
            </span>
            <span class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
              Completed: <b>{{ counts.completed }}</b>
            </span>
          </div>

          <button
            class="btn-3"
            @click="printClearanceSummary"
            :disabled="!userId"
            title="Print clearance summary"
          >
            Print
          </button>

          <button
            class="btn-2"
            @click="onRefresh"
            :disabled="loading || !departmentId || !templateId"
            title="Reload template bindings and current user's items"
            :aria-busy="loading ? 'true' : 'false'"
          >
            <span v-if="loading">Refreshing…</span>
            <span v-else>Refresh</span>
          </button>

          <button
            class="btn-1"
            @click="onSave"
            :disabled="saving || dirty.size === 0 || !userId || isReadOnly"
            :title="isReadOnly ? 'This user is exited. Clearance is read-only.' : (!userId ? 'Select a user first' : '')"
            :aria-busy="saving ? 'true' : 'false'"
          >
            <span v-if="saving">Saving…</span>
            <span v-else>Save Changes ({{ fmtDirtyCount() }})</span>
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="isReadOnly"
      class="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800"
    >
      Read-only: user has an exit date (Last working date: {{ exitDateKey || 'N/A' }}).
    </div>

    <!-- Filters / Context -->
    <div class="card p-4 space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <!-- Department -->
        <div class="space-y-1">
          <label class="text-sm font-medium text-slate-700">Department</label>
          <select v-model="departmentId" class="input-1">
            <option :value="null">Select Department</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">
              {{ d.name }}
            </option>
          </select>
          <p v-if="!departmentId" class="text-[11px] text-slate-500">
            Step 1: প্রথমে Department সিলেক্ট করুন
          </p>
        </div>

        <!-- User -->
        <div class="space-y-1">
          <label class="text-sm font-medium text-slate-700">User</label>
          <select
            v-model="userId"
            class="input-1"
            :disabled="!departmentId || loading"
          >
            <option :value="null">
              {{ !departmentId ? 'Select Department first' : loading ? 'Loading users…' : 'Select User' }}
            </option>
            <option v-for="u in users" :key="u.id" :value="u.id">
              {{ userOptionLabel(u) }}
            </option>
          </select>
          <p v-if="departmentId && !userId" class="text-[11px] text-slate-500">
            Step 2: এখন একটি User সিলেক্ট করুন
          </p>
        </div>

        <!-- Status Filter -->
        <div class="space-y-1">
          <label class="text-sm font-medium text-slate-700">Status Filter</label>
          <select v-model="statusFilter" class="input-1" :disabled="!userId">
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="WORKING">Working</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <p v-if="!userId" class="text-[11px] text-slate-500">
            User সিলেক্ট করলে filter কাজ করবে
          </p>
        </div>
      </div>

      <div v-if="error" class="mt-2 text-sm text-rose-600">{{ error }}</div>
    </div>

    <!-- Empty states -->
    <div v-if="!departmentId" class="card p-6 text-slate-600">
      <b>Step 1:</b> Select a <b>Department</b> to load users.
    </div>

    <div v-else-if="!userId" class="card p-6 text-slate-600">
      <b>Step 2:</b> Select a <b>User</b> to load clearance items.
    </div>

    <!-- Table / Loading -->
    <div v-else>
      <div v-if="loading" class="card p-6">
        <div class="animate-pulse space-y-3">
          <div class="h-4 bg-gray-200 rounded w-1/3"></div>
          <div class="h-4 bg-gray-200 rounded w-2/3"></div>
          <div class="h-4 bg-gray-200 rounded"></div>
          <div class="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>

      <ClearanceEditorTable
        v-else
        :rows="itemsForTable"
        :key="userId"
        :disabled="isReadOnly"
        @update:row="onRowUpdate"
      />
    </div>

    <!-- Print Area -->
    <div id="print-area" class="print-area">
      <div class="text-center">
        <h1 class="text-xl font-bold tracking-wide">{{ printCompanyName }}</h1>
        <p class="text-xs text-gray-500">User Exit & Clearance Summary</p>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><span class="text-gray-500">Name:</span> <span class="font-medium">{{ selectedUser?.name || 'N/A' }}</span></div>
        <div><span class="text-gray-500">Employee ID:</span> <span class="font-medium">{{ selectedUser?.employee_id || 'N/A' }}</span></div>
        <div><span class="text-gray-500">Department:</span> <span class="font-medium">{{ selectedUser?.department?.name || selectedDepartment?.name || 'N/A' }}</span></div>
        <div><span class="text-gray-500">Designation:</span> <span class="font-medium">{{ selectedUser?.designation?.title || selectedUser?.designation?.name || 'N/A' }}</span></div>
      </div>

      <div class="mt-4 rounded-md border border-gray-200 p-3 text-sm">
        <div><span class="text-gray-500">Last Working Date:</span> <span class="font-medium">{{ exitDateKey || 'N/A' }}</span></div>
        <div class="mt-1"><span class="text-gray-500">Exit Reason:</span> <span class="font-medium">{{ selectedUser?.exit_reason || 'N/A' }}</span></div>
      </div>

      <div class="mt-4">
        <div class="mb-2 text-sm font-semibold text-gray-700">Clearance Items Summary</div>
        <table class="w-full border border-gray-300 text-sm" style="border-collapse:collapse">
          <thead>
            <tr class="bg-gray-100 text-gray-700">
              <th class="border border-gray-300 px-2 py-1 text-left">Item</th>
              <th class="border border-gray-300 px-2 py-1 text-left w-[120px]">Status</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Remarks</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in printRows" :key="idx">
              <td class="border border-gray-300 px-2 py-1">{{ row.label || 'N/A' }}</td>
              <td class="border border-gray-300 px-2 py-1">{{ row.status || 'N/A' }}</td>
              <td class="border border-gray-300 px-2 py-1">{{ row.remarks || '—' }}</td>
            </tr>
            <tr v-if="!printRows.length">
              <td colspan="3" class="border border-gray-300 px-2 py-4 text-center text-gray-500">
                No clearance items found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-6 text-xs text-gray-500">
        Printed: {{ new Date().toLocaleString() }}
      </div>
    </div>
  </div>
</template>

<style>
.print-area {
  position: absolute;
  left: -9999px;
  top: 0;
  width: 100%;
}

@media print {
  body.printing-clearance-summary * {
    visibility: hidden;
  }
  body.printing-clearance-summary #print-area,
  body.printing-clearance-summary #print-area * {
    visibility: visible;
  }
  body.printing-clearance-summary #print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 12mm;
    background: white;
  }
  body.printing-clearance-summary {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
