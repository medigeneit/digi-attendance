<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { todoStatusClass } from '@/libs/todos'
import { useKpiReportStore } from '@/stores/kpi-report'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'

/* ===== Store & Refs ===== */
const store = useKpiReportStore()
const { meta, rows, isLoading, error } = storeToRefs(store)

/* ===== Filters / Params ===== */
const currentYear = new Date().getFullYear()
const year = ref(currentYear)
const years = ref([])

/* ===== Derived meta ===== */
const columns = computed(() => meta.value?.columns || [])
const dynamicColumns = computed(() =>
  columns.value.filter((c) => c.key !== 'sl' && c.key !== 'department'),
)

/* ===== Year options ===== */
function buildYearOptions(from = 2020, to = currentYear + 1) {
  const arr = []
  for (let y = to; y >= from; y--) arr.push(y)
  years.value = arr
}

watch(year, () => {
  const y = Number(year.value)
  if (!Number.isInteger(y) || y < 2000 || y > 2100) return
  load()
})

function doPrint() {
  window.print()
}

function nowStr() {
  const d = new Date()
  return d.toLocaleString()
}

/* ===== Data load ===== */
async function load() {
  try {
    await store.fetchYearly({
      year: Number(year.value),
    })
  } catch (e) {
    console.error('fetchYearly failed:', e)
  }
}

/* ===== Init ===== */
onMounted(() => {
  buildYearOptions()
  load()
})
</script>

<template>
  <div class="space-y-4 px-4 print:px-0">
    <!-- Print Header -->
    <div class="hidden print:block mx-auto text-center mb-3">
      <h1 class="text-xl font-semibold text-gray-900">Yearly KPI Report</h1>
      <div class="text-sm text-gray-600">
        Year: <span class="font-medium">{{ year }}</span> • Generated: <span>{{ nowStr() }}</span>
      </div>
    </div>

    <!-- Controls -->
    <div
      class="flex flex-wrap items-end gap-3 sticky top-0 z-10 bg-white/80 backdrop-blur print:hidden p-2 -mx-2 rounded-md border border-gray-100"
    >
      <div class="flex items-center gap-2">
        <label class="text-xs font-medium text-gray-600">Year</label>
        <select
          v-model.number="year"
          class="w-32 rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50 disabled:opacity-60"
          :disabled="isLoading"
          aria-label="Select year"
        >
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>

      <div class="ml-auto flex gap-2">
        <button class="btn-3 !py-1.5 !px-3" @click="doPrint">
          <i class="far fa-print mr-1"></i> Print
        </button>
      </div>
    </div>

    <!-- Loader / Error -->
    <div v-if="isLoading" class="py-10 text-center">
      <LoaderView />
    </div>
    <div
      v-else-if="error"
      class="rounded-md border border-red-200 bg-red-50 p-3 text-red-700"
      role="alert"
      aria-live="polite"
    >
      {{ error }}
    </div>

    <!-- ===== Mobile Cards (sm-only) ===== -->
    <div v-else class="space-y-3 md:hidden">
      <div
        v-for="(r, i) in rows"
        :key="'card-' + r.key"
        class="rounded-xl border border-gray-200 bg-white shadow-sm p-3 break-inside-avoid"
      >
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium text-gray-900 truncate" :title="r.name">
            {{ i + 1 }}. {{ r.name }}
          </div>
          <div class="text-xs text-gray-500">Total: {{ r.employees_total }}</div>
        </div>

        <div class="mt-2 grid grid-cols-2 gap-2">
          <div
            v-for="col in dynamicColumns"
            :key="col.key"
            class="rounded-lg border border-gray-200 p-2 text-center"
            :class="todoStatusClass(r.cells?.[col.key])"
          >
            <div class="text-[11px] font-medium text-gray-600 truncate" :title="col.label">
              {{ col.label }}
            </div>
            <div class="text-sm font-semibold mt-1">
              {{ r.cells?.[col.key]?.display || '0/0' }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="!rows || rows.length === 0" class="px-3 py-6 text-center text-gray-600">
        No data
      </div>
    </div>

    <!-- ===== Desktop Table (md+) ===== -->
    <div class="hidden md:block overflow-x-auto rounded-xl border bg-white shadow-sm">
      <table class="table table-auto w-full text-sm">
        <thead class="text-gray-800 sticky top-0 z-[5]">
          <tr class="bg-gray-100/95 backdrop-blur">
            <th
              class="sticky left-0 z-[6] border-y border-r bg-gray-100/95 px-2 py-2 text-center"
              style="min-width: 2.25rem; width: 2.25rem"
            >
              SL
            </th>

            <th
              class="sticky z-[6] border-y border-r bg-gray-100/95 px-2 py-2 text-left"
              :style="{ left: '2rem', minWidth: '12.5rem', width: '12.5rem' }"
            >
              Department
            </th>

            <th
              v-for="col in dynamicColumns"
              :key="col.key"
              class="border-y border-r px-2 py-2 text-center font-medium"
            >
              <span class="text-xs">{{ col.label }}</span>
            </th>
          </tr>
        </thead>

        <tbody class="text-gray-800">
          <tr
            v-for="(r, i) in rows"
            :key="r.key"
            class="border-t even:bg-gray-100 hover:bg-sky-500/40 transition-colors break-inside-avoid"
          >
            <!-- sticky first 2 columns -->
            <td class="sticky left-0 z-[4] border-r bg-inherit px-2 text-center">{{ i + 1 }}</td>

            <td class="sticky z-[4] border-r bg-inherit px-2" :style="{ left: '2rem' }">
              <div class="truncate max-w-48 white-space-wrap" :title="r.name">{{ r.name }}</div>
            </td>

            <td v-for="col in dynamicColumns" :key="col.key" class="border-r text-center px-2 py-1">
              <span
                class="inline-block rounded py-0.5 px-1.5 font-mono text-[12px]"
                :class="todoStatusClass(r.cells?.[col.key])"
              >
                {{ r.cells?.[col.key]?.display || '0/0' }}
              </span>
            </td>
          </tr>

          <tr v-if="!rows || rows.length === 0">
            <td colspan="100" class="px-3 py-6 text-center text-gray-600">No data</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
thead tr {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* Prevent row splitting across pages */
.break-inside-avoid {
  break-inside: avoid;
  page-break-inside: avoid;
}

/* Print cleanup */
@media print {
  .print\:hidden {
    display: none !important;
  }
  .rounded-xl {
    border-radius: 0 !important;
  }
  .shadow-sm {
    box-shadow: none !important;
  }
  .md\:hidden {
    display: none !important;
  }
  .md\:block {
    display: block !important;
  }
  table {
    width: 100% !important;
  }
}
</style>
