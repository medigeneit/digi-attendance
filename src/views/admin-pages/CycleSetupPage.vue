<script setup>
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useKpiCycleAdmin } from '@/stores/kpiCycleAdmin'

const s = useKpiCycleAdmin()
const router = useRouter()

onMounted(() => s.fetchAll())

const rows = computed(() =>
  (s.list || []).map(c => ({
    ...c,
    statusText: typeof c.is_active === 'boolean'
      ? (c.is_active ? 'Active' : 'Inactive')
      : (c.status ?? 'draft')
  }))
)

async function activate(c) {
  await s.activate(c.id)
}
async function deactivate(c) {
  // যদি আপনার API-তে archive থাকে, নিচের লাইনটা ব্যবহার করুন:
  // await s.archive(c.id)
  // আর যদি deactivate API থাকে তাহলে:
  if (s.deactivate) await s.deactivate(c.id)
}
async function cloneRow(c) {
  const targetYear = Number(c.year) + 1
  await s.clone(c.id, targetYear)
}
async function removeRow(c) {
  if (!confirm('Delete this cycle? (Only if no reviews)')) return
  await s.remove(c.id)
}
</script>

<template>
  <div class="max-w-6xl mx-auto p-4 space-y-5">
    <header class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">KPI Cycles</h1>
      <button
        class="px-4 py-2 rounded-xl bg-slate-900 text-white"
        @click="$router.push({ name:'kpi-cycle-new' })"
      >
        + New Cycle
      </button>
    </header>

    <div class="rounded-2xl border overflow-hidden bg-white">
      <table class="w-full text-sm">
        <thead class="bg-slate-50">
          <tr>
            <th class="text-left px-3 py-2">Title</th>
            <th class="text-center px-3 py-2">Year</th>
            <th class="text-center px-3 py-2">Status</th>
            <th class="text-right px-3 py-2 w-64">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in rows" :key="c.id" class="border-t">
            <td class="px-3 py-2">{{ c.title }}</td>
            <td class="px-3 py-2 text-center">{{ c.year }}</td>
            <td class="px-3 py-2 text-center capitalize">
              <span
                :class="[
                  'px-2 py-0.5 text-xs rounded-full',
                  c.statusText==='Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                ]"
              >{{ c.statusText }}</span>
            </td>
            <td class="px-3 py-2 text-right">
              <button class="px-2 py-1 text-xs border rounded mr-2"
                @click="$router.push({ name:'kpi-cycle-edit', params:{ id: c.id } })">Edit</button>
              <button class="px-2 py-1 text-xs border rounded mr-2" @click="cloneRow(c)">Clone</button>
              <button
                v-if="c.is_active || c.status === 'active'"
                class="px-2 py-1 text-xs border rounded mr-2"
                @click="deactivate(c)"
              >
                Deactivate
              </button>
              <button
                v-else
                class="px-2 py-1 text-xs border rounded mr-2"
                @click="activate(c)"
              >
                Activate
              </button>
              <button class="px-2 py-1 text-xs border rounded" @click="removeRow(c)">Delete</button>
            </td>
          </tr>

          <tr v-if="!rows.length">
            <td colspan="4" class="px-3 py-10 text-center text-slate-500">
              No cycles yet. Create a new one.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
