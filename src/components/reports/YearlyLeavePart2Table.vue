<script setup>
import { computed } from 'vue'
import { useLeaveReportFormat } from '@/composables/useLeaveReportFormat'

const props = defineProps({
  rows: { type: Array, default: () => [] }, // companyReports
})

const { LEAVE, LABEL, employeeLines, getTotal, getUsed, getBalance } = useLeaveReportFormat()

// ✅ Exact like image-2 (recommended single SL in Used/Balance)
const groups = computed(() => [
  {
    title: 'Total',
    cols: [LEAVE.WPL, LEAVE.SL, LEAVE.DPC],
    mode: 'total',
  },
  {
    title: 'Used',
    cols: [LEAVE.CL, LEAVE.ML, LEAVE.SL, LEAVE.WPL, LEAVE.DPC],
    mode: 'used',
  },
  {
    title: 'Balance',
    cols: [LEAVE.CL, LEAVE.ML, LEAVE.SL, LEAVE.WPL, LEAVE.DPC],
    mode: 'balance',
  },
])

const cellVal = (row, mode, typeKey) => {
  if (mode === 'total') return getTotal(row, typeKey)
  if (mode === 'used') return getUsed(row, typeKey)
  return getBalance(row, typeKey)
}

const cellClass = (v) => (Number(v) === 0 ? 'text-slate-300' : 'text-slate-700 font-semibold')
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white shadow overflow-hidden">
    <div class="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
      Yearly Leave Report (Part-2)
      <span class="ml-2 text-xs font-medium text-slate-500">Total / Used / Balance</span>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full text-[11px] text-slate-700">
        <thead class="text-[10px] uppercase tracking-wide text-slate-500">
          <!-- group header -->
          <tr class="bg-slate-100">
            <th class="sticky left-0 z-20 bg-slate-100 px-3 py-2 text-left" rowspan="2">SL</th>
            <th class="sticky left-[52px] z-20 bg-slate-100 px-3 py-2 text-left min-w-[220px]" rowspan="2">
              Employee
            </th>

            <th
              v-for="g in groups"
              :key="g.title"
              class="px-2 py-2 text-center border-l border-slate-200"
              :colspan="g.cols.length"
            >
              {{ g.title }}
            </th>
          </tr>

          <!-- sub header -->
          <tr class="bg-slate-100">
            <template v-for="g in groups" :key="g.title + '_sub'">
              <th
                v-for="t in g.cols"
                :key="g.title + '_' + t"
                class="px-2 py-2 text-center border-l border-slate-200"
                :title="t"
              >
                <!-- ✅ Special Leave shows as SL -->
                <span v-if="t === LEAVE.SL">SL</span>
                <span v-else>{{ LABEL[t] }}</span>
              </th>
            </template>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100">
          <tr v-for="row in rows" :key="row?.user?.id" class="hover:bg-slate-50">
            <td class="sticky left-0 z-10 bg-white px-3 py-2 font-semibold">
              {{ row?.sl ?? '' }}
            </td>

            <td class="sticky left-[52px] z-10 bg-white px-3 py-2 min-w-[220px]">
              <div class="font-semibold text-slate-800 leading-5 truncate">
                {{ employeeLines(row).name }}
              </div>
              <div class="text-[10px] text-slate-500 leading-4 line-clamp-2">
                {{ employeeLines(row).meta }}
              </div>
            </td>

            <template v-for="g in groups" :key="row?.user?.id + '_' + g.title">
              <td
                v-for="t in g.cols"
                :key="row?.user?.id + '_' + g.title + '_' + t"
                class="px-2 py-2 text-center border-l border-slate-100 tabular-nums"
                :class="cellClass(cellVal(row, g.mode, t))"
              >
                {{ cellVal(row, g.mode, t) }}
              </td>
            </template>
          </tr>

          <tr v-if="!rows?.length">
            <td :colspan="2 + groups.reduce((a, g) => a + g.cols.length, 0)" class="px-4 py-10 text-center text-slate-500">
              No data found for selected filters.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
