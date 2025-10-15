<script setup>
import { ref, computed, watch, onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useClearanceStore } from '@/stores/clearance'
import { useAuthStore } from '@/stores/auth'
import ClearanceEditorTable from '@/components/ClearanceEditorTable.vue'
import { onBeforeRouteLeave } from 'vue-router'

const c = useClearanceStore()
const auth = useAuthStore()

// Local filters
const departmentId = ref(null)
const templateId = ref(2)

const { userId, departments, statusFilter, users, itemsForTable, loading, saving, error, dirty } = storeToRefs(c)

/* ---------- Helpers ---------- */
const fmtDirtyCount = () => dirty.value.size
const canLoad = () => !!departmentId.value && !!templateId.value

/* ---------- Bootstrapping from auth dept (no default user select) ---------- */
watch(
  () => auth.user?.department_id,
  async (deptId) => {
    if (!deptId) return
    departmentId.value = deptId
    users.value = []
    userId.value = null
    await c.loadUsersByDept(deptId)
    if (canLoad()) {
      await c.refreshAll(deptId, templateId.value)
    }
  },
  { immediate: true }
)

/* ---------- Reactivity ---------- */
// Department change → reset user, reload users, refresh template bindings
watch(departmentId, async (newDept) => {
  users.value = []
  userId.value = null
  if (newDept) {
    await c.loadUsersByDept(newDept)
    if (templateId.value) {
      await c.refreshAll(newDept, templateId.value)
    }
  }
})

// Template change → refresh template bindings (doesn't touch selected user)
watch(templateId, async (newTpl) => {
  if (departmentId.value && newTpl) {
    await c.refreshAll(departmentId.value, newTpl)
  }
})

// User change → load that user's clearances
watch(userId, async () => {
  if (canLoad() && userId.value) {
    await c.loadClearances(userId.value, departmentId.value, templateId.value)
  }
})

/* Row update → local patch + markDirty */
function onRowUpdate(tid, patch) {
  const rows = itemsForTable.value
  const idx = rows.findIndex(x => x.template_item_id === tid)
  if (idx >= 0) {
    Object.assign(rows[idx], patch)
    c.markDirty(tid, true)
  }
}

async function onSave() {
  try {
    if (!userId.value) return
    await c.saveBulk(departmentId.value, templateId.value)
  } catch (e) {
    console.error(e)
  }
}

/* Summary counts */
const counts = computed(() => {
  if (!userId.value) return { pending: 0, working: 0, completed: 0 }
  const arr = itemsForTable.value || []
  return {
    pending:   arr.filter(r => r.status === 'PENDING').length,
    working:   arr.filter(r => r.status === 'WORKING').length,
    completed: arr.filter(r => r.status === 'COMPLETED').length,
  }
})

/* ---------- Dirty guard ---------- */
function beforeUnload(e) {
  if (dirty.value.size > 0) {
    e.preventDefault()
    e.returnValue = ''
  }
}
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))

onBeforeRouteLeave((to, from, next) => {
  if (dirty.value.size > 0 && !confirm('You have unsaved changes. Leave anyway?')) {
    return next(false)
  }
  next()
})

onMounted(() => {
  c.fetchDepartments()
})
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Sticky Header / Actions -->
    <div class="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
      <div class="flex items-start justify-between gap-4 py-3">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Department Clearance</h1>
          <p class="text-sm text-gray-600">Assign করা আইটেম অনুযায়ী ইউজারের ক্লিয়ারেন্স আপডেট করুন</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="btn-2"
            @click="c.refreshAll(departmentId, templateId)"
            :disabled="loading || !departmentId || !templateId"
            title="Reload template bindings for this department"
          >
            Refresh
          </button>
          <button
            class="btn-1"
            @click="onSave"
            :disabled="saving || dirty.size === 0 || !userId"
            :title="!userId ? 'Select a user first' : ''"
          >
            <span v-if="saving">Saving…</span>
            <span v-else>Save Changes ({{ fmtDirtyCount() }})</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Filters / Context -->
    <div class="card p-4 space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label class="text-sm font-medium">Department</label>
          <select v-model="departmentId" class="input-1">
            <option :value="null">Select Department</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>

        <div>
          <label class="text-sm font-medium">User</label>
          <select v-model="userId" class="input-1" :disabled="!departmentId">
            <option :value="null">Select user</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </div>

        <div>
          <label class="text-sm font-medium">Status Filter</label>
          <select v-model="statusFilter" class="input-1">
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="WORKING">Working</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      <div v-if="error" class="mt-2 text-sm text-rose-600">{{ error }}</div>
    </div>

    <div v-if="!userId" class="card p-6 text-gray-600">
      Select a <b>User</b> to load clearance items.
    </div>

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
        @update:row="onRowUpdate"
      />
    </div>
  </div>
</template>
