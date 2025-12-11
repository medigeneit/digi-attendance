<script setup>
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useChecklistBoardStore } from '@/stores/checklistBoard'
import ChecklistProgressCell from '@/components/checklist/ChecklistProgressCell.vue'
import EmploymentTypeCell from '@/components/checklist/EmploymentTypeCell.vue'

const store = useChecklistBoardStore()
const router = useRouter()

/* ---------------- UI State ---------------- */
const q = ref('')
const showOnlyMissing = ref(false)
const sortBy = ref('progress_desc')
const saving = reactive({}) // { [userId]: true }

/* ---------------- Helpers ---------------- */
const rowOf = (u) => store.rows?.[String(u?.id)] || {}
const clamp = (v, min, max) => Math.min(Math.max(Number(v || 0), min), max)

const actualPercent = (u) => {
  const r = rowOf(u)
  const val = r.percent ?? u?.percent ?? 0
  return clamp(val, 0, 100)
}
const targetPercent = (u) =>
  clamp(u?.checklist?.required_completion_percent ?? 100, 1, 100)

/* ---------------- Search + Sort ---------------- */
const personMatches = (u) => {
  const n = (s) => String(s || '').toLowerCase()
  const needle = n(q.value)
  if (!needle) return true
  return [u?.name, u?.employee_id, u?.department, u?.designation]
    .filter(Boolean)
    .some((v) => n(v).includes(needle))
}

const preparedUsers = computed(() => {
  let arr = (store.users || []).filter(personMatches)
  if (showOnlyMissing.value) {
    arr = arr.filter((u) => actualPercent(u) < targetPercent(u))
  }
  if (sortBy.value === 'name_asc') {
    arr = [...arr].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  } else if (sortBy.value === 'progress_asc') {
    arr = [...arr].sort((a, b) => actualPercent(a) - actualPercent(b))
  } else {
    arr = [...arr].sort((a, b) => actualPercent(b) - actualPercent(a))
  }
  return arr
})

/* ---------------- Nav ---------------- */
function goOpen(u) {
  const tplId = store.templateId
  if (!tplId) return
  router.push({
    name: 'checklist.create',
    params: { userId: u.id, templateId: tplId },
  })
}

/* ---------------- Employment Type (with confirmation) ---------------- */
const normType = (v) => String(v || '').toLowerCase()

async function onConfirmTypeChange(u, nextValue) {
  if (!u?.id) return
  const prev = normType(u.employment_type)

  // optimistic label mapping (keep backend expectation same as before)
  const labelOf = (v) =>
    v === 'probationary' ? 'Probationary' :
    v === 'permanent'    ? 'Permanent'    :
    v === 'contract'     ? 'Contract'     : '—'

  const prevLabel = labelOf(prev)
  const nextLabel = labelOf(nextValue)

  saving[u.id] = true
  u.employment_type = nextValue // keep normalized internally for our components
  try {
    await store.updateEmploymentType(u.id, nextLabel) // your API expects Title Case
  } catch (e) {
    // revert UI
    u.employment_type = prev
    console.error(e)
    alert('Failed to update employment type. Please try again.')
  } finally {
    saving[u.id] = false
  }
}

const formatDate = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative">
        <input
          v-model="q"
          type="search"
          placeholder="Search name / ID / dept / designation…"
          class="w-64 md:w-80 max-w-full rounded-lg border bg-white/90 px-8 py-2 text-sm outline-none focus:border-gray-400"
        />
        <svg class="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l3.387 3.387a1 1 0 01-1.414 1.414L12.9 14.32zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clip-rule="evenodd"/></svg>
        <button
          v-if="q"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
          @click="q = ''"
          aria-label="Clear search"
        >✕</button>
      </div>

      <!-- <div class="rounded-lg border p-1 text-xs">
        <button
          class="rounded-md px-2 py-1"
          :class="showOnlyMissing ? '' : 'bg-gray-900 text-white'"
          @click="showOnlyMissing = false"
        >All</button>
        <button
          class="rounded-md px-2 py-1"
          :class="showOnlyMissing ? 'bg-gray-900 text-white' : ''"
          @click="showOnlyMissing = true"
          title="Show only users below checklist target"
        >Only Missing</button>
      </div>

      <select v-model="sortBy" class="rounded-md border bg-white px-2 py-1 text-xs outline-none">
        <option value="progress_desc">Sort: Progress ↓</option>
        <option value="progress_asc">Sort: Progress ↑</option>
        <option value="name_asc">Sort: Name A–Z</option>
      </select> -->

      <div class="ml-auto">
        <span class="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
          Template: <span class="ml-1 font-medium">{{ store.templateId || 'Not selected' }}</span>
        </span>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto rounded-xl border shadow-sm">
      <table class="min-w-full text-[13px]">
        <thead class="sticky top-0 bg-gray-50/90 backdrop-blur">
          <tr class="text-left border-b">
            <th class="p-2 w-10">#</th>
            <th class="p-2 min-w-[220px]">User</th>
            <th class="p-2 hidden md:table-cell min-w-[160px]">Role</th>
            <th class="p-2 min-w-[260px]">Progress</th>
            <th class="p-2 w-48">Status</th>
            <th class="p-2 w-36">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(u, idx) in preparedUsers" :key="u.id" class="border-b hover:bg-gray-50/70">
            <td class="p-2">{{ idx + 1 }}</td>

            <!-- User -->
            <td class="p-2">
              <div class="flex items-center gap-2">
                <div class="relative h-8 w-8 shrink-0">
                  <img v-if="u.avatar" :src="u.avatar" alt="" class="h-8 w-8 rounded-full object-cover" />
                  <div v-else class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-[11px] font-semibold text-gray-700">
                    {{ (u.name || u.full_name || u.email || '??').slice(0,2).toUpperCase() }}
                  </div>
                </div>
                <div class="min-w-0">
                  <div class="font-medium truncate">{{ u.name || u.full_name || u.email }}</div>
                  <div class="text-[11px] text-gray-500 space-x-2 truncate">
                    <span v-if="u.joining_date">Joining Date: {{ formatDate(u.joining_date) }}</span>
                    <span class="hidden sm:inline">Dept: {{ u.department || '—' }}</span>
                  </div>
                </div>
              </div>
            </td>

            <!-- Role -->
            <td class="p-2 hidden md:table-cell">
              <div class="truncate" :title="u.designation">{{ u.designation || '—' }}</div>
            </td>

            <!-- Progress (single-mode, switchable) -->
            <td class="p-2">
              <ChecklistProgressCell
                :user="u"
                :actual-percent="actualPercent(u)"
                :target-percent="targetPercent(u)"
              />
            </td>

            <!-- Status with confirm -->
            <td class="p-2">
              <EmploymentTypeCell
                :user="u"
                :value="String(u.employment_type).toLowerCase()"
                :saving="!!saving[u.id]"
                :on-confirm-change="(next) => onConfirmTypeChange(u, next)"
              />
            </td>

            <!-- Actions -->
            <td class="p-2">
              <button
                class="px-3 py-1.5 rounded-md text-[12px] font-medium bg-gray-900 text-white hover:bg-black disabled:opacity-40"
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

    <!-- Empty/Loading -->
    <div v-if="store.loading" class="text-gray-600 text-sm">Loading…</div>
    <div
      v-else-if="!store.loading && preparedUsers.length === 0"
      class="rounded-xl border border-dashed p-10 text-center text-sm text-gray-500"
    >
      No users found for the current filters.
    </div>
  </div>
</template>
