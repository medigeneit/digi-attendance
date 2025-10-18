<script setup>
import { onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useCTDIStore } from '@/stores/ctdi'

const route = useRoute()
const router = useRouter()
const s = useCTDIStore()
const {
  departmentId, templateId, search, groupBy,
  departments, templates, grouped,
  totalItems, activeCount, dirty, loading, saving, error,
} = storeToRefs(s)

// helper: coerce ?templateId=2 → 2 | null
function asInt(v) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

async function onFilterChanged() {
  if (departmentId.value && templateId.value) {
    await s.refresh()
  }
}

// 1) initial load + read query (?templateId=2)
onMounted(async () => {
  await s.loadFilters()

  // read templateId from route query (if present)
  const qTpl = asInt(route.query.templateId)
  if (qTpl) {
    templateId.value = qTpl
  }
  await onFilterChanged()
})

// 2) keep UI in sync when query changes externally
watch(() => route.query.templateId, (v) => {
  const qTpl = asInt(v)
  if (qTpl !== templateId.value) {
    templateId.value = qTpl
  }
})

// 3) when user changes dropdowns, refresh + sync query back to URL
watch([departmentId, templateId], async ([dept, tpl]) => {
  await onFilterChanged()
  const nextQuery = { ...route.query }
  if (tpl) nextQuery.templateId = String(tpl); else delete nextQuery.templateId
  if (dept) nextQuery.departmentId = String(dept); else delete nextQuery.departmentId

  router.replace({ query: nextQuery }).catch(() => {})
})
</script>


<template>
  <div class="max-w-7xl mx-auto p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Department ↔ Template Items Assign</h1>
        <p class="text-sm text-gray-600">
          Department incharge / respective personnel অনুযায়ী টেমপ্লেট আইটেম অ্যাক্টিভেট করুন
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button class="inline-flex items-center rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                @click="s.refresh" :disabled="loading">
          Refresh
        </button>
        <button class="inline-flex items-center rounded-lg bg-gray-900 px-3 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-60"
                @click="s.saveBulk()" :disabled="saving || dirty.size===0 || !departmentId || !templateId">
          <svg v-if="saving" class="h-4 w-4 mr-2 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"/>
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
          </svg>
          Save Assignments ({{ dirty.size }})
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="rounded-2xl bg-white shadow ring-1 ring-black/5 p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div class="lg:col-span-2">
          <label class="text-sm font-medium">Department</label>
          <select v-model="departmentId" class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20">
            <option :value="null">Select department</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>
        <div class="lg:col-span-2">
          <label class="text-sm font-medium">Template</label>
          <select v-model="templateId" class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20">
            <option :value="null">Select template</option>
            <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium">Group By</label>
          <select v-model="groupBy" class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20">
            <option value="section">Section</option>
            <option value="responsible_unit">Responsible Unit</option>
            <option value="none">No grouping</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium">Search</label>
          <input v-model.trim="search" type="text" placeholder="Search item/ key..."
                 class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"/>
        </div>
      </div>

      <div class="mt-3 text-sm flex items-center justify-between">
        <div class="text-gray-600">
          Total: <b>{{ totalItems }}</b>,
          Active: <b>{{ activeCount }}</b>,
          Unsaved changes: <b>{{ dirty.size }}</b>
        </div>
        <div v-if="error" class="text-rose-600">{{ error }}</div>
      </div>
    </div>

    <!-- Content -->
    <div v-if="loading" class="rounded-2xl bg-white shadow ring-1 ring-black/5 p-6 text-gray-600">
      Loading…
    </div>

    <div v-else class="space-y-6">
      <div v-for="(items, groupName) in grouped" :key="groupName" class="rounded-2xl bg-white shadow ring-1 ring-black/5">
        <div class="flex items-center justify-between px-4 py-3 border-b">
          <div class="flex items-center gap-3">
            <div class="text-base font-semibold">{{ groupName }}</div>
            <div class="text-xs text-gray-600">
              ({{ items.length }} items •
              active {{ items.filter(it => s.activeById.get(it.id)).length }})
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button class="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50"
                    @click="s.setGroup(groupName, true)">Select all</button>
            <button class="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50"
                    @click="s.setGroup(groupName, false)">Clear</button>
            <button class="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50"
                    @click="s.invertGroup(groupName)">Invert</button>
          </div>
        </div>

        <div class="divide-y">
          <div v-for="it in items" :key="it.id" class="flex items-center gap-4 px-4 py-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                class="h-5 w-5"
                :checked="s.activeById.get(it.id)"
                @change="e => s.setActive(it.id, e.target.checked)"
              />
              <div>
                <div class="font-medium leading-5">{{ it.label }}</div>
                <div class="text-xs text-gray-500">
                  Key: <span class="font-mono">{{ it.item_key }}</span>
                  <span class="mx-1">•</span>
                  Order: {{ it.order_no ?? 0 }}
                </div>
              </div>
            </label>

            <div class="ml-auto text-xs" :class="{'text-emerald-600': s.activeById.get(it.id), 'text-gray-400': !s.activeById.get(it.id)}">
              {{ s.activeById.get(it.id) ? 'Active' : 'Inactive' }}
            </div>

            <div v-if="dirty.has(it.id)" class="text-xs text-amber-600">unsaved</div>
          </div>
        </div>
      </div>

      <div v-if="totalItems===0" class="rounded-2xl bg-white shadow ring-1 ring-black/5 p-8 text-center text-gray-500">
        No items found
      </div>
    </div>

    <!-- Sticky Save bar (mobile UX) -->
    <div class="fixed bottom-4 right-4">
      <button
        class="rounded-full shadow-xl bg-gray-900 text-white px-4 py-3 text-sm hover:bg-gray-800 disabled:opacity-60"
        :disabled="saving || dirty.size===0 || !departmentId || !templateId"
        @click="s.saveBulk()"
      >
        Save ({{ dirty.size }})
      </button>
    </div>
  </div>
</template>
