<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useKpiReportStore } from '@/stores/kpi-report'
import { storeToRefs } from 'pinia'
import { ref, computed, onMounted } from 'vue'

const store = useKpiReportStore()
const { meta, rows, isLoading, error } = storeToRefs(store)

/* Filters */
const year = ref(new Date().getFullYear())
const showMode = ref('all') // 'all' | 'complete' | 'pending'

/* Local state */
const completed = ref(Object.create(null))
const prevCompleted = ref(Object.create(null))
const isSaving = ref(Object.create(null))
const lastSubmitAt = ref(Object.create(null))
const SUBMIT_COOLDOWN_MS = 1000

/* Helpers */
const periods = computed(() => meta.value?.periods || [])
const keyOf = (rk, pk) => `${rk}::${pk}`
const deptIdOfRow = (row) => {
  if (meta.value?.scope !== 'department') return null
  const m = String(row?.key || '').match(/^dept:(\d+)$/)
  return m ? Number(m[1]) : null
}
const formIdOfPeriod = (pk) => {
  const p = periods.value.find(x => x.key === pk)
  return p?.form_id ? Number(p.form_id) : null
}
const cellAssignable = (row, pk) => !!row?.cells?.[pk]?.form_id && meta.value?.scope === 'department'

/* O(1) set for server-completed */
const serverCompletedSets = computed(() => {
  const out = Object.create(null)
  for (const p of periods.value) out[p.key] = new Set((p.completed_departments || []).map(Number))
  return out
})
function serverOrHeuristicComplete(row, pk) {
  const dId = deptIdOfRow(row)
  const set = serverCompletedSets.value[pk]
  if (set && dId && set.has(dId)) return true
  const c = row.cells?.[pk]
  const asg = +c?.assigned || 0
  const ic = +(c?.incharge?.done || 0)
  const co = +(c?.coordinator?.done || 0)
  return asg > 0 && (ic >= asg || co >= asg)
}
function initCompleted() {
  const map = Object.create(null)
  for (const r of rows.value || []) for (const p of periods.value)
    map[keyOf(r.key, p.key)] = serverOrHeuristicComplete(r, p.key)
  completed.value = map
  prevCompleted.value = { ...map }
}

/* Row filter */
function rowIsComplete(r) {
  let has = false
  for (const p of periods.value) {
    if (!cellAssignable(r, p.key)) continue
    has = true
    if (!completed.value[keyOf(r.key, p.key)]) return false
  }
  return has ? true : false
}
function rowIsPending(r) {
  let has = false
  for (const p of periods.value) {
    if (!cellAssignable(r, p.key)) continue
    has = true
    if (!completed.value[keyOf(r.key, p.key)]) return true
  }
  return has ? false : true
}
const filteredRows = computed(() => {
  if (!rows.value) return []
  if (showMode.value === 'all') return rows.value
  if (showMode.value === 'complete') return rows.value.filter(rowIsComplete)
  return rows.value.filter(rowIsPending)
})

/* Stats */
const totals = computed(() => {
  let total = 0, done = 0
  for (const r of rows.value || []) for (const p of periods.value) {
    if (!cellAssignable(r, p.key)) continue
    total++; if (completed.value[keyOf(r.key, p.key)]) done++
  }
  return { total, done, pending: Math.max(0, total - done) }
})

/* Update */
const canSubmit = k => (Date.now() - (lastSubmitAt.value[k] || 0)) >= SUBMIT_COOLDOWN_MS
const revert = k => completed.value[k] = prevCompleted.value[k]

async function onToggle(row, p) {
  const k = keyOf(row.key, p.key)
  if (!cellAssignable(row, p.key) || isSaving.value[k] || !canSubmit(k)) return revert(k)

  const deptId = deptIdOfRow(row), formId = formIdOfPeriod(p.key)
  if (!deptId || !formId) return revert(k)

  const newVal = !!completed.value[k]
  isSaving.value[k] = true
  try {
    await store.setReportCompletion({ form_id: formId, department_id: deptId, completed: newVal })
    lastSubmitAt.value[k] = Date.now()
    prevCompleted.value[k] = newVal
    const idx = periods.value.findIndex(x => x.key === p.key)
    if (idx >= 0) {
      const set = new Set((meta.value.periods[idx].completed_departments || []).map(Number))
      newVal ? set.add(deptId) : set.delete(deptId)
      meta.value.periods[idx].completed_departments = Array.from(set)
    }
  } catch (e) {
    console.error(e); revert(k); alert('Update failed, try again.')
  } finally { isSaving.value[k] = false }
}

/* Load */
async function load() {
  await store.fetchBiMonthly({ year: +year.value, scope: 'department', rule: 'any' })
  initCompleted()
}

/* Display helpers */
function countStr(cell, role) {
  const asg = +cell?.assigned || 0
  const done = role === 'ic' ? +(cell?.incharge?.done || 0) : +(cell?.coordinator?.done || 0)
  if (asg === 0 && done === 0) {
    const boolVal = role === 'ic' ? cell?.incharge : cell?.coordinator
    if (typeof boolVal === 'boolean') return boolVal ? '✓' : '—'
  }
  return `${done}/${asg}`
}
function statusClass(cell, role) {
  const asg = +cell?.assigned || 0
  const done = role === 'ic' ? +(cell?.incharge?.done || 0) : +(cell?.coordinator?.done || 0)
  if (asg === 0) return 'chip chip-muted'
  if (done >= asg) return 'chip chip-good'
  return 'chip chip-bad'
}

function doPrint(){ window.print() }
onMounted(load)
</script>

<template>
  <div class="page dense">
    <!-- Compact toolbar -->
    <div class="toolbar screen-only">
      <div class="controls">
        <label class="ctl">
          <span>Year</span>
          <input type="number" v-model.number="year" class="inp w-24" />
        </label>
        <label class="ctl">
          <span>Show</span>
          <select v-model="showMode" class="inp w-28">
            <option value="all">All</option>
            <option value="complete">Completed</option>
            <option value="pending">Pending</option>
          </select>
        </label>
        <button class="btn sm" @click="load">Generate</button>
        <button class="btn sm" @click="doPrint">Print</button>
      </div>
      <div class="stats">
        <span class="badge">Total: {{ totals.total }}</span>
        <span class="badge good">Completed: {{ totals.done }}</span>
        <span class="badge bad">Pending: {{ totals.pending }}</span>
      </div>
    </div>

    <!-- Print header -->
    <div class="print-only print-head">
      <div>Bi-Monthly KPI Report — Year {{ year }}</div>
      <div>Completed: {{ totals.done }}/{{ totals.total }}</div>
    </div>

    <!-- Body -->
    <div v-if="isLoading" class="center"><LoaderView /></div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <div v-else class="table-wrap">
      <table class="grid">
        <thead>
          <tr>
            <th class="th sticky-col w-10" rowspan="2">SL</th>
            <th class="th sticky-col left-10 min-w-[180px]" rowspan="2">Department</th>
            <th v-for="p in periods" :key="p.key" class="th text-center" :colspan="3">
              {{ p.label }}
            </th>
          </tr>
          <tr>
            <template v-for="p in periods" :key="p.key + ':sub'">
              <th class="th sub text-center"><abbr title="Report">R</abbr></th>
              <th class="th sub text-center"><abbr title="Incharge">I</abbr></th>
              <th class="th sub text-center"><abbr title="Coordinator">C</abbr></th>
            </template>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(r, i) in filteredRows" :key="r.key" class="row">
            <td class="td sticky-col text-center w-10">{{ i+1 }}</td>
            <td class="td sticky-col left-10">{{ r.name }}</td>

            <template v-for="p in periods" :key="r.key + '::' + p.key">
              <!-- Report (selectable) -->
              <td class="td">
                <div class="report">
                  <input
                    type="checkbox"
                    :disabled="!cellAssignable(r, p.key)"
                    v-model="completed[keyOf(r.key, p.key)]"
                    @change="onToggle(r, p)"
                    :title="completed[keyOf(r.key,p.key)] ? 'Completed' : 'Pending'"
                  />
                  <span
                    class="state s"
                    :class="completed[keyOf(r.key,p.key)] ? 'good' : 'bad'"
                    :title="completed[keyOf(r.key,p.key)] ? 'Completed' : 'Pending'"
                  >
                    {{ completed[keyOf(r.key, p.key)] ? 'C' : 'P' }}
                  </span>
                </div>
              </td>

              <!-- Incharge (read-only) -->
              <td class="td text-center">
                <span class="chip s w-12" :class="statusClass(r.cells[p.key], 'ic')">
                  {{ countStr(r.cells[p.key], 'ic') }}
                </span>
              </td>

              <!-- Coordinator (read-only) -->
              <td class="td text-center">
                <span class="chip s w-12" :class="statusClass(r.cells[p.key], 'co')">
                  {{ countStr(r.cells[p.key], 'co') }}
                </span>
              </td>
            </template>
          </tr>

          <tr v-if="!filteredRows || filteredRows.length===0">
            <td class="td text-center text-gray-600" colspan="100">No data</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
/* ===== Compact baseline ===== */
.page.dense { padding:10px; font-size:12px; line-height:1.28; }
.center { padding:14px; text-align:center; }
.error { border:1px solid #fecaca; background:#fff1f2; color:#b91c1c; padding:8px; border-radius:6px; }

/* Toolbar (extra tight) */
.toolbar { display:flex; justify-content:space-between; align-items:flex-end; gap:8px; margin-bottom:6px; }
.controls { display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap; }
.ctl { display:flex; flex-direction:column; gap:4px; font-size:11px; color:#6b7280; }
.inp { border:1px solid #d1d5db; border-radius:6px; padding:4px 6px; height:28px; }
.btn.sm { border:1px solid #111827; background:#111827; color:#fff; padding:4px 8px; height:28px; border-radius:6px; font-weight:600; }
.stats { display:flex; gap:6px; align-items:center; }
.badge { font-size:11px; padding:2px 6px; border-radius:9999px; background:#f3f4f6; color:#374151; }
.badge.good { background:#ecfdf5; color:#065f46; }
.badge.bad  { background:#fef2f2; color:#991b1b; }

/* Table */
.table-wrap { overflow:auto; border:1px solid #e5e7eb; border-radius:8px; background:#fff; }
.grid { width:100%; border-collapse:separate; border-spacing:0; table-layout:fixed; }
.th { position:sticky; top:0; z-index:2; background:#fafafa; color:#111827; padding:6px; border-bottom:1px solid #e5e7eb; white-space:nowrap; }
.th.sub { font-size:11px; }
.th abbr { text-decoration:none; cursor:help; }
.sticky-col { position:sticky; left:0; background:#fff; z-index:3; }
.left-10 { left:2.5rem; } /* SL col width */
.td { padding:4px 6px; border-bottom:1px solid #f3f4f6; vertical-align:middle; background:#fff; }
.row:nth-child(odd) .td { background:#fcfcfd; }

.report { display:flex; align-items:center; justify-content:center; gap:4px; }
.state.s { font-size:11px; font-weight:700; padding:0 4px; border-radius:10px; border:1px solid transparent; }
.state.s.good { background:#ecfdf5; color:#047857; border-color:#a7f3d0; }
.state.s.bad  { background:#fef2f2; color:#b91c1c; border-color:#fecaca; }

.chip.s { display:inline-block; border-radius:6px; padding:0 4px; border:1px solid transparent; font-variant-numeric: tabular-nums; font-size:11px; }
.chip-good { border-color:#a7f3d0; background:#ecfdf5; color:#047857; }
.chip-bad  { border-color:#fecaca; background:#fef2f2; color:#b91c1c; }
.chip-muted{ border-color:#e5e7eb; background:#f9fafb; color:#6b7280; }
.w-12 { width:3rem; }

/* Print */
@media print {
  .screen-only { display:none !important; }
  .print-only { display:block !important; }
  .page.dense { padding:0; font-size:11px; }
  .table-wrap { border:none; border-radius:0; }
  .th { background:#fff; color:#111; border-bottom:1px solid #000; }
  .td { border-bottom:1px solid #ddd; }
  .row { break-inside:avoid; }
}
.print-only.print-head { margin:0 0 6px 0; font-weight:700; }
</style>
