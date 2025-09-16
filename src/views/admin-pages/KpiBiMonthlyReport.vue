<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useKpiReportStore } from '@/stores/kpi-report'
import { storeToRefs } from 'pinia'
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'

const toast = useToast()
const store = useKpiReportStore()
const { meta, rows, isLoading, error } = storeToRefs(store)

const year = ref(new Date().getFullYear())
const scope = ref('department')   // or 'user'
const department_id = ref('')     // optional
const form_id = ref('')
const rule = ref('any')           // 'any' or 'both'

const periods = computed(()=> meta.value?.periods || [])

async function load() {
  await store.fetchBiMonthly({
    year: Number(year.value),
    scope: scope.value,
    department_id: department_id.value ? Number(department_id.value) : undefined,
    form_id: form_id.value ? Number(form_id.value) : undefined,
    rule: rule.value
  })
}

function tick(v){ return v ? '✓' : '—' }

function doPrint(){ window.print() }

onMounted(load)
</script>

<template>
  <div class="space-y-4 px-4 print:px-0">
    <!-- Controls -->
    <div class="flex flex-wrap items-end gap-3 print:hidden">
      <div>
        <label class="text-sm text-gray-600">Year</label>
        <input type="number" v-model.number="year" class="w-28 rounded border px-2 py-1">
      </div>
      <div>
        <label class="text-sm text-gray-600">Scope</label>
        <select v-model="scope" class="rounded border px-2 py-1">
          <option value="department">Department</option>
          <option value="user">User</option>
        </select>
      </div>
      <div>
        <label class="text-sm text-gray-600">Dept ID (optional)</label>
        <input v-model="department_id" type="number" class="w-28 rounded border px-2 py-1">
      </div>
      <div>
        <label class="text-sm text-gray-600">Form ID (optional)</label>
        <input v-model="form_id" type="number" class="w-28 rounded border px-2 py-1">
      </div>
      <div>
        <label class="text-sm text-gray-600">Rule</label>
        <select v-model="rule" class="rounded border px-2 py-1">
          <option value="any">✓ if any saved</option>
          <option value="both">✓ if both saved</option>
        </select>
      </div>
      <button class="btn-3" @click="load">Generate</button>
      <button class="btn-3" @click="doPrint"><i class="far fa-print mr-1"></i>Print</button>
    </div>

    <!-- Loader / Error -->
    <div v-if="isLoading" class="py-8 text-center"><LoaderView /></div>
    <div v-else-if="error" class="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{{ error }}</div>

    <!-- Report Table -->
    <div v-else class="overflow-x-auto rounded-xl border bg-white shadow-sm">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="bg-gray-100 text-gray-800">
            <th class="border px-2 py-2 w-10 text-center">SL</th>
            <th class="border px-2 py-2 text-left">{{ meta?.scope === 'user' ? 'Employee' : 'Department' }}</th>
            <th v-for="p in periods" :key="p.key" class="border px-2 py-2 text-center">
              <div class="font-semibold">{{ p.label }}</div>
              <div class="text-[11px] text-gray-600">Inch. | Coord.</div>
            </th>
            <th class="border px-2 py-2 text-right w-24">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in rows" :key="r.key" class="border-t">
            <td class="border px-2 py-2 text-center">{{ i+1 }}</td>
            <td class="border px-2 py-2">{{ r.name }}</td>
            <td v-for="p in periods" :key="p.key" class="border px-2 py-2">
              <div class="flex items-center justify-center gap-3">
                <span class="inline-block w-10 text-center">{{ tick(r.cells[p.key]?.incharge) }}</span>
                <span class="inline-block w-10 text-center">{{ tick(r.cells[p.key]?.coordinator) }}</span>
              </div>
              <!-- optional numeric mini -->
              <div v-if="r.cells[p.key]?.max_total" class="mt-1 text-[11px] text-gray-500 text-center">
                {{ r.cells[p.key].final_total }} / {{ r.cells[p.key].max_total }}
              </div>
            </td>
            <td class="border px-2 py-2 text-right">
              {{
                Object.values(r.cells).reduce((acc, c) => acc + (c?.final_total || 0), 0)
              }}
            </td>
          </tr>

          <tr v-if="!rows || rows.length===0">
            <td colspan="100" class="px-3 py-6 text-center text-gray-600">No data</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .print\:hidden { display: none !important; }
  .btn-3 { display: none !important; }
  .rounded-xl { border-radius: 0 !important; }
}
</style>
