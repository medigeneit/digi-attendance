<script setup>
import { onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useClearanceStore } from '@/stores/clearance'
import ClearanceEditorTable from '@/components/ClearanceEditorTable.vue'
import StatusPill from '@/components/StatusPill.vue'

const c = useClearanceStore()
const {
  departmentId, templateId, userId, statusFilter,
  departments, templates, users, itemsForTable,
  loading, saving, error, dirty,
} = storeToRefs(c)

function fmtDirtyCount() { return dirty.value.size }

function onRowUpdate(tid, patch) {
  const rows = itemsForTable.value
  const idx = rows.findIndex(x => x.template_item_id===tid)
  if (idx>=0) {
    Object.assign(rows[idx], patch)
    c.markDirty(tid, true)
  }
}

function canLoad() {
  return departmentId.value && templateId.value
}

async function onFilterChanged() {
  if (!canLoad()) return
  await c.refreshAll()
  if (departmentId.value) await c.loadUsersByDept(departmentId.value)
}

async function onSave() {
  try {
    await c.saveBulk()
  } catch (e) {
    console.error(e)
  }
}

onMounted(async () => {
  await c.loadFiltersData()
})

watch([departmentId, templateId], onFilterChanged)

watch(userId, async () => {
  if (canLoad() && userId.value) await c.refreshAll()
})

</script>

<template>
  <div class="max-w-7xl mx-auto p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Department Clearance</h1>
        <p class="text-sm text-gray-600">Assign করা আইটেম অনুযায়ী ইউজারের ক্লিয়ারেন্স আপডেট করুন</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-ghost" @click="c.refreshAll" :disabled="loading">Refresh</button>
        <button class="btn btn-primary" @click="onSave" :disabled="saving || dirty.size===0">
          <svg v-if="saving" class="h-4 w-4 mr-2 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"/>
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
          </svg>
          Save Changes ({{ fmtDirtyCount() }})
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card p-4">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label class="text-sm font-medium">Department</label>
          <select v-model="departmentId" class="input">
            <option :value="null">Select department</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium">Template</label>
          <select v-model="templateId" class="input">
            <option :value="null">Select template</option>
            <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium">User</label>
          <select v-model="userId" class="input" :disabled="!departmentId">
            <option :value="null">Select user</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium">Status Filter</label>
          <select v-model="statusFilter" class="input">
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="WORKING">Working</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
        <div class="flex items-end">
          <div class="text-sm text-gray-600">
            Dirty: <b>{{ dirty.size }}</b>
          </div>
        </div>
      </div>
      <div v-if="error" class="mt-3 text-sm text-rose-600">{{ error }}</div>
    </div>

    <!-- Table -->
    <div v-if="loading" class="card p-6 text-gray-600">Loading…</div>
    <ClearanceEditorTable
      v-else
      :rows="itemsForTable"
      @update:row="onRowUpdate"
    />

    <!-- Summary -->
    <div class="flex items-center justify-between">
      <div class="text-sm text-gray-600">Showing {{ itemsForTable.length }} items</div>
      <div class="flex items-center gap-2">
        <span>Legend:</span>
        <StatusPill v="PENDING" />
        <StatusPill v="WORKING" />
        <StatusPill v="COMPLETED" />
      </div>
    </div>
  </div>
</template>
