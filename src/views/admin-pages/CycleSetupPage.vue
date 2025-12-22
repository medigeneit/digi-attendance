<script setup>
import { onMounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useKpiCycleAdmin } from '@/stores/kpiCycleAdmin'

const s = useKpiCycleAdmin()
const router = useRouter()

const q = ref('')
const status = ref('all') // all | active | inactive | draft
const year = ref('all')   // all | 2025 | 2024 etc

const openMenuId = ref(null)

onMounted(() => s.fetchAll())

const normalized = computed(() =>
  (s.list || []).map(c => {
    const isActive = typeof c.is_active === 'boolean' ? c.is_active : (c.status === 'active')
    const statusText = isActive ? 'Active' : (c.status ?? 'Inactive')
    return { ...c, isActive, statusText }
  })
)

const years = computed(() => {
  const ys = new Set(normalized.value.map(x => x.year).filter(Boolean))
  return Array.from(ys).sort((a, b) => Number(b) - Number(a))
})

const rows = computed(() => {
  let data = normalized.value

  // search
  const term = q.value.trim().toLowerCase()
  if (term) {
    data = data.filter(x =>
      String(x.title || '').toLowerCase().includes(term) ||
      String(x.year || '').toLowerCase().includes(term)
    )
  }

  // status filter
  if (status.value !== 'all') {
    data = data.filter(x => {
      if (status.value === 'active') return x.isActive
      if (status.value === 'inactive') return !x.isActive
      return (x.status ?? '').toLowerCase() === status.value
    })
  }

  // year filter
  if (year.value !== 'all') data = data.filter(x => String(x.year) === String(year.value))

  // newest first
  return data.slice().sort((a, b) => Number(b.id) - Number(a.id))
})

function badgeClass(c) {
  if (c.isActive) return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if ((c.status || '').toLowerCase() === 'draft') return 'bg-amber-50 text-amber-700 ring-amber-200'
  return 'bg-slate-50 text-slate-700 ring-slate-200'
}

async function activate(c) {
  await s.activate(c.id)
}
async function deactivate(c) {
  if (s.deactivate) await s.deactivate(c.id)
  // else if (s.archive) await s.archive(c.id)
}
async function cloneRow(c) {
  const targetYear = Number(c.year) + 1
  await s.clone(c.id, targetYear)
}
async function removeRow(c) {
  if (!confirm('Delete this cycle? (Only if no reviews)')) return
  await s.remove(c.id)
}

function toggleMenu(id) {
  openMenuId.value = openMenuId.value === id ? null : id
}
function closeMenu() {
  openMenuId.value = null
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-6 space-y-5">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">KPI</p>
        <h1 class="mt-1 text-2xl font-semibold text-slate-900">KPI Cycles</h1>
        <p class="mt-1 text-sm text-slate-500">Create, activate, and manage review cycles.</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          @click="router.push({ name: 'kpi-cycle-new' })"
        >
          <span class="text-lg leading-none">+</span>
          New Cycle
        </button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col sm:flex-row gap-2 sm:items-center w-full">
          <!-- Search -->
          <div class="relative w-full sm:w-80">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
            <input
              v-model="q"
              type="text"
              placeholder="Search by title or year..."
              class="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <!-- Status -->
          <select
            v-model="status"
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>

          <!-- Year -->
          <select
            v-model="year"
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="all">All years</option>
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>

        <div class="text-xs text-slate-500">
          Showing <span class="font-semibold text-slate-700">{{ rows.length }}</span> cycles
        </div>
      </div>

      <!-- Table -->
      <div class="border-t border-slate-200">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th class="text-left px-4 py-3 w-24">Cycle</th>
              <th class="text-center px-4 py-3 w-24">Year</th>
              <th class="text-center px-4 py-3 w-28">Status</th>
              <th class="text-right px-4 py-3 w-44">Action</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="c in rows"
              :key="c.id"
              class="hover:bg-slate-50/60"
              @click="closeMenu"
            >
              <td class="px-4 py-3">
                <div class="flex items-start gap-3">
                  <div class="mt-0.5 h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    {{ String(c.year || '').slice(-2) || '•' }}
                  </div>
                  <div class="min-w-0">
                    <div class="font-semibold text-slate-900 truncate">{{ c.title }}</div>
                    <div class="text-xs text-slate-500">
                      ID: {{ c.id }}
                      <span v-if="c.created_at"> • Created: {{ String(c.created_at).slice(0, 10) }}</span>
                    </div>
                  </div>
                </div>
              </td>

              <td class="px-4 py-3 text-center text-slate-700">
                {{ c.year }}
              </td>

              <td class="px-4 py-3 text-center">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset"
                  :class="badgeClass(c)"
                >
                  {{ c.isActive ? 'Active' : (c.statusText || 'Inactive') }}
                </span>
              </td>

              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <!-- Primary toggle -->
                  <button
                    v-if="c.isActive"
                    class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                    @click.stop="deactivate(c)"
                  >
                    Deactivate
                  </button>
                  <button
                    v-else
                    class="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
                    @click.stop="activate(c)"
                  >
                    Activate
                  </button>

                  <!-- Menu -->
                  <div class="relative">
                    <button
                      class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                      @click.stop="toggleMenu(c.id)"
                    >
                      More ▾
                    </button>

                    <div
                      v-if="openMenuId === c.id"
                      class="absolute right-0 mt-2 w-44 rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden z-10"
                      @click.stop
                    >
                      <button
                        class="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                        @click="router.push({ name:'kpi-cycle-edit', params:{ id: c.id } }); closeMenu()"
                      >
                        Edit
                      </button>
                      <button
                        class="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                        @click="cloneRow(c); closeMenu()"
                      >
                        Clone to next year
                      </button>
                      <div class="h-px bg-slate-100"></div>
                      <button
                        class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        @click="removeRow(c); closeMenu()"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="!rows.length">
              <td colspan="4" class="px-4 py-12 text-center">
                <div class="mx-auto max-w-sm">
                  <div class="text-slate-900 font-semibold">No cycles found</div>
                  <p class="mt-1 text-sm text-slate-500">
                    Try clearing filters or create a new KPI cycle to get started.
                  </p>
                  <button
                    class="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    @click="router.push({ name:'kpi-cycle-new' })"
                  >
                    Create first cycle
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
