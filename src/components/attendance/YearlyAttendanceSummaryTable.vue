<script setup>
import { computed } from 'vue'
import LoaderView from '@/components/common/LoaderView.vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  meta: { type: Object, default: () => ({}) },
  isLoading: { type: Boolean, default: false },
  sortBy: { type: String, default: 'attendance_score_avg' },
  sortDir: { type: String, default: 'desc' },
  page: { type: Number, default: 1 },
  perPage: { type: Number, default: 10 },
})

const emit = defineEmits(['update:page', 'update:perPage', 'sort-change', 'row-click'])

const total = computed(() => Number(props.meta?.total || 0))
const lastPage = computed(() => Number(props.meta?.last_page || 1))

const rangeStart = computed(() =>
  total.value === 0 ? 0 : (props.page - 1) * props.perPage + 1,
)
const rangeEnd = computed(() =>
  total.value === 0 ? 0 : (props.page - 1) * props.perPage + props.rows.length,
)

const toggleSort = (key) => {
  if (!key) return
  const nextDir = props.sortBy === key && props.sortDir === 'asc' ? 'desc' : 'asc'
  emit('sort-change', { sort_by: key, sort_dir: nextDir })
}

const sortIndicator = (key) => {
  if (props.sortBy !== key) return ''
  return props.sortDir === 'asc' ? '↑' : '↓'
}

const presentBadgeClass = (value) => {
  const pct = Number(value || 0)
  if (pct >= 95) return 'bg-emerald-50 text-emerald-700'
  if (pct >= 80) return 'bg-amber-50 text-amber-700'
  return 'bg-rose-50 text-rose-700'
}

const formatPercent = (value) => {
  const pct = Number(value)
  if (!Number.isFinite(pct)) return '—'
  return `${pct.toFixed(1)}%`
}

const formatScore = (value) => {
  const score = Number(value)
  if (!Number.isFinite(score)) return { label: '—', pct: 0 }
  const bounded = Math.max(0, Math.min(5, score))
  return { label: `${bounded.toFixed(2)} / 5`, pct: (bounded / 5) * 100 }
}

const userLabel = (row) => {
  const name =
    row?.user_name || row?.name || row?.user || row?.employee_name || ''
  if (name && row?.user_id) return `${name} (${row.user_id})`
  return row?.user_id ? `#${row.user_id}` : name || '—'
}

const departmentLabel = (row) => {
  if (row?.department_name) return row.department_name
  if (row?.department_id == null) return 'Unassigned'
  return String(row?.department_id || 'Unassigned')
}
</script>

<template>
  <div class="rounded-2xl border border-slate-100 bg-white/90 shadow-lg">
    <div v-if="isLoading" class="py-8">
      <LoaderView />
    </div>

    <div v-else-if="rows.length === 0" class="empty-state">
      <p class="text-base font-semibold text-slate-700">No attendance summary found</p>
      <p class="text-sm text-slate-500">Try adjusting filters or year.</p>
    </div>

    <div v-else class="table-scroll">
      <table class="min-w-full table-auto border-collapse">
        <thead class="sticky top-0 bg-white shadow-sm">
          <tr class="bg-gray-50 text-sm text-left">
            <th class="th w-12">#</th>
            <th class="th cursor-pointer" @click="toggleSort('user_id')">
              User <span class="ml-1 text-[11px]">{{ sortIndicator('user_id') }}</span>
            </th>
            <th class="th">Department</th>
            <th class="th">Year</th>
            <th class="th cursor-pointer text-center" @click="toggleSort('yearly_present_pct')">
              Present % <span class="ml-1 text-[11px]">{{ sortIndicator('yearly_present_pct') }}</span>
            </th>
            <th class="th cursor-pointer text-center" @click="toggleSort('attendance_score_avg')">
              Score Avg <span class="ml-1 text-[11px]">{{ sortIndicator('attendance_score_avg') }}</span>
            </th>
            <th class="th text-center">Score Months</th>
            <th class="th cursor-pointer text-center" @click="toggleSort('total_months')">
              Total Months <span class="ml-1 text-[11px]">{{ sortIndicator('total_months') }}</span>
            </th>
          </tr>
        </thead>
        <tbody class="text-sm">
          <tr
            v-for="(row, index) in rows"
            :key="`${row?.user_id}-${row?.year}-${index}`"
            class="border-b hover:bg-blue-50 cursor-pointer"
            @click="$emit('row-click', row)"
          >
            <td class="td">{{ (page - 1) * perPage + (index + 1) }}</td>
            <td class="td font-semibold text-slate-700">{{ userLabel(row) }}</td>
            <td class="td text-slate-600">{{ departmentLabel(row) }}</td>
            <td class="td">{{ row?.year || '—' }}</td>
            <td class="td text-center">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="presentBadgeClass(row?.yearly_present_pct)"
              >
                {{ formatPercent(row?.yearly_present_pct) }}
              </span>
            </td>
            <td class="td">
              <div class="flex flex-col items-center gap-1">
                <div class="h-2 w-24 rounded-full bg-slate-100">
                  <div
                    class="h-2 rounded-full bg-emerald-500"
                    :style="{ width: `${formatScore(row?.attendance_score_avg).pct}%` }"
                  ></div>
                </div>
                <span class="text-[11px] text-slate-500">
                  {{ formatScore(row?.attendance_score_avg).label }}
                </span>
              </div>
            </td>
            <td class="td text-center">{{ row?.score_months ?? '—' }}</td>
            <td class="td text-center">{{ row?.total_months ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!isLoading && rows.length" class="flex items-center justify-between p-3 text-sm">
      <div class="text-slate-600">
        Showing <span class="font-medium">{{ rangeStart }}</span> to
        <span class="font-medium">{{ rangeEnd }}</span> of
        <span class="font-medium">{{ total }}</span>
      </div>
      <div class="flex items-center gap-3">
        <select
          class="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
          :value="perPage"
          @change="$emit('update:perPage', Number($event.target.value))"
        >
          <option :value="10">10 / page</option>
          <option :value="25">25 / page</option>
          <option :value="50">50 / page</option>
        </select>
        <div class="flex items-center gap-2">
          <button
            class="btn-3"
            :disabled="page <= 1"
            @click="$emit('update:page', Math.max(1, page - 1))"
          >
            Prev
          </button>
          <span class="text-slate-600">Page {{ page }} / {{ lastPage }}</span>
          <button
            class="btn-3"
            :disabled="page >= lastPage"
            @click="$emit('update:page', Math.min(lastPage, page + 1))"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.empty-state { @apply flex min-h-[140px] flex-col items-center justify-center gap-1 text-center; }
.table-scroll { max-height: 70vh; overflow: auto; }
.th { @apply border px-3 py-2 text-xs font-semibold text-gray-700; }
.td { @apply border px-3 py-2; }
</style>
