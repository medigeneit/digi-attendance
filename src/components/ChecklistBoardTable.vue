<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useChecklistBoardStore } from '@/stores/checklistBoard'

const store = useChecklistBoardStore()
const router = useRouter()

// UI state (client-side helpers only)
const q = ref('')                            // quick local search (optional)
const showOnlyMissing = ref(false)           // show only users below target
const sortBy = ref('progress_desc')          // 'name_asc' | 'progress_desc' | 'progress_asc'

// --- helpers ---
const rowOf = (u) => store.rows[String(u.id)] || {}

const clamp = (v, min, max) => Math.min(Math.max(Number(v || 0), min), max)

const actualPercent = (u) => {
  const r = rowOf(u)
  const val = r.percent ?? u?.percent ?? 0
  return clamp(val, 0, 100)
}

const targetPercent = (u) => {
  // If backend provides a per-user required threshold via checklist, use it; else 100%
  const t = u?.checklist?.required_completion_percent ?? 100
  return clamp(t, 1, 100)
}

const statusOf = (u) => {
  const a = actualPercent(u)
  const t = targetPercent(u)
  if (a >= t) return 'completed'
  if (a > 0) return 'in_progress'
  return 'not_started'
}

const personMatches = (u) => {
  const n = (s) => String(s || '').toLowerCase()
  const needle = n(q.value)
  if (!needle) return true
  return [u.name, u.employee_id, u.department, u.designation].some(v => n(v).includes(needle))
}

function goOpen(u) {
  const tplId = store.templateId
  if (!tplId) return
  router.push({ name: 'checklist.create', params: { userId: u.id, templateId: tplId } })
}

// Final list for the table (start from server-filtered store.users)
const preparedUsers = computed(() => {
  let arr = (store.users || []).filter(personMatches)

  if (showOnlyMissing.value) {
    arr = arr.filter(u => actualPercent(u) < targetPercent(u))
  }

  if (sortBy.value === 'name_asc') {
    arr = [...arr].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  } else if (sortBy.value === 'progress_asc') {
    arr = [...arr].sort((a, b) => actualPercent(a) - actualPercent(b))
  } else {
    // progress_desc
    arr = [...arr].sort((a, b) => actualPercent(b) - actualPercent(a))
  }
  return arr
})
</script>

<template>
  <div class="space-y-6">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="relative">
        <input
          v-model="q"
          type="search"
          placeholder="Search name / ID / dept / designation…"
          class="w-72 max-w-full rounded-lg border bg-white/90 px-9 py-2 text-sm outline-none ring-0 focus:border-gray-400"
        />
        <!-- search icon -->
        <svg class="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l3.387 3.387a1 1 0 01-1.414 1.414L12.9 14.32zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clip-rule="evenodd"/></svg>
        <button v-if="q" class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500" @click="q = ''">✕</button>
      </div>

      <!-- segmented filters -->
      <div class="flex items-center gap-2">
        <div class="rounded-lg border p-1 text-xs">
          <button
            class="rounded-md px-2 py-1"
            :class="showOnlyMissing ? '' : 'bg-gray-900 text-white'"
            @click="showOnlyMissing = false"
          >All</button>
          <button
            class="rounded-md px-2 py-1"
            :class="showOnlyMissing ? 'bg-gray-900 text-white' : ''"
            @click="showOnlyMissing = true"
            title="Show only users who are below their required target"
          >Only Missing</button>
        </div>

        <div class="rounded-lg border p-1 text-xs">
          <select v-model="sortBy" class="rounded-md px-2 py-1 outline-none">
            <option value="progress_desc">Sort: Progress ↓</option>
            <option value="progress_asc">Sort: Progress ↑</option>
            <option value="name_asc">Sort: Name A–Z</option>
          </select>
        </div>
      </div>

      <div class="ml-auto">
        <span
          class="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700"
          title="You must select a template to create/open checklists"
        >
          Template:
          <span class="ml-1 font-medium">{{ store.templateId || 'Not selected' }}</span>
        </span>
      </div>
    </div>

    <!-- Flat table (no grouping) -->
    <div class="overflow-x-auto rounded-xl border shadow-sm">
      <table class="min-w-full text-sm">
        <thead class="sticky top-0 bg-gray-50/90 backdrop-blur">
          <tr class="text-left border-b">
            <th class="p-2">#</th>
            <th class="p-2 min-w-[220px]">User</th>
            <th class="p-2 min-w-[180px]">Position</th>
            <th class="p-2 w-72">Progress</th>
            <th class="p-2 w-28">Status</th>
            <th class="p-2 w-40">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(u,index) in preparedUsers" :key="index" class="border-b hover:bg-gray-50">
            <!-- User -->

            <!-- Position -->
            <td class="p-3">
              <div class="truncate" :title="u.id">{{ index+=1 }}</div>
            </td>
            
            <td class="p-3">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700"
                  :title="u.name"
                >
                
                  <img v-if="u.avatar" :src="u.avatar" alt="" class="h-9 w-9 rounded-full object-cover" />
                  <span v-else>{{ (u.name || u.full_name || u.email || '??').slice(0,2).toUpperCase() }}</span>
                </div>
                <div>
                  <div class="font-medium leading-tight">
                    {{ u.name || u.full_name || u.email }}
                  </div>
                  <div class="text-xs text-gray-500">
                    <span v-if="u.employee_id" class="mr-2">ID: {{ u.employee_id }}</span>
                    <span class="hidden sm:inline">Dept: {{ u.department }}</span>
                  </div>
                </div>
              </div>
            </td>
            

            <!-- Position -->
            <td class="p-3">
              <div class="truncate" :title="u.designation">{{ u.designation || '—' }}</div>
            </td>

            <!-- Progress with target marker -->
            <td class="p-3">
              <div class="relative w-full rounded-full bg-gray-200 h-2 overflow-hidden">
                <!-- target marker -->
                <div
                  class="pointer-events-none absolute top-0 h-2 w-0.5 bg-gray-600/60"
                  :style="{ left: `calc(${targetPercent(u)}% - 1px)` }"
                  :title="`Target ${targetPercent(u)}%`"
                />
                <div class="h-2 bg-green-500" :style="{ width: actualPercent(u) + '%' }" />
              </div>
              <div class="mt-1 flex items-center justify-between text-xs text-gray-600">
                <span>Actual: {{ actualPercent(u) }}%</span>
                <span>Target: {{ targetPercent(u) }}%</span>
              </div>
            </td>

            <!-- Status -->
            <td class="p-3">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs capitalize"
                :class="{
                  'bg-green-100 text-green-700': statusOf(u) === 'completed',
                  'bg-amber-100 text-amber-700': statusOf(u) === 'in_progress',
                  'bg-gray-100 text-gray-700': statusOf(u) === 'not_started',
                }"
              >
                {{ statusOf(u) }}
              </span>
            </td>

            <!-- Actions -->
            <td class="p-3">
              <button
                class="btn-2 py-1"
                :disabled="!store.templateId"
                :title="store.templateId ? '' : 'Select a template first'"
                @click="goOpen(u)"
              >
                {{ u?.checklist ? 'Open' : 'Create' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty states -->
    <div v-if="store.loading" class="text-gray-600">Loading…</div>
    <div v-else-if="!store.loading && preparedUsers.length === 0" class="rounded-xl border border-dashed p-10 text-center text-sm text-gray-500">
      No users found for the current filters.
    </div>
  </div>
</template>
