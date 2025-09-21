<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useKpiReportStore } from '@/stores/kpi-report'
import { storeToRefs } from 'pinia'
import { ref, computed, onMounted, watch } from 'vue'

const store = useKpiReportStore()
const { meta, rows, isLoading, error } = storeToRefs(store)

const year = ref(new Date().getFullYear())
const scope = ref('department')   // or 'user'
const department_id = ref('')     // optional
const form_id = ref('')
const rule = ref('any')           // 'any' or 'both'

const periods = computed(() => meta.value?.periods || [])

const completed = ref({})
const isSaving = ref({})          // key => boolean (submitting)
const prevCompleted = ref({})     // key => previous boolean (to revert)
const lastSubmitAt = ref({})      // key => timestamp (ms) for cooldown
const SUBMIT_COOLDOWN_MS = 1500

const keyOf = (rowKey, pKey) => `${rowKey}::${pKey}`

function deptIdOfRow(row) {
  if (meta.value?.scope !== 'department') return null
  const m = String(row?.key || '').match(/^dept:(\d+)$/)
  return m ? Number(m[1]) : null
}
function formIdOfPeriod(pKey) {
  const p = periods.value.find(x => x.key === pKey)
  return p?.form_id ? Number(p.form_id) : null
}
function labelOfPeriod(pKey) {
  return periods.value.find(x => x.key === pKey)?.label || pKey
}

function syncPrevCompleted() {
  const m = {}
  for (const r of rows.value || []) {
    for (const p of periods.value) {
      const k = keyOf(r.key, p.key)
      m[k] = completed.value[k]
    }
  }
  prevCompleted.value = m
}

function initCompleted() {
  const m = {}
  const periodMap = Object.fromEntries(
    periods.value.map(p => [p.key, new Set((p.completed_departments || []).map(Number))])
  )

  for (const r of rows.value || []) {
    const deptId = deptIdOfRow(r)
    for (const p of periods.value) {
      let val = false
      if (deptId && periodMap[p.key].has(deptId)) {
        val = true
      } else {
        // fallback heuristic (if JSON not set)
        const c = r.cells?.[p.key]
        const assigned = Number(c?.assigned ?? 0)
        const icDone   = Number(c?.incharge?.done ?? 0)
        const coDone   = Number(c?.coordinator?.done ?? 0)
        val = rule.value === 'both'
          ? (assigned > 0 && icDone >= assigned && coDone >= assigned)
          : (assigned > 0 && (icDone >= assigned || coDone >= assigned))
      }
      m[keyOf(r.key, p.key)] = val
    }
  }
  completed.value = m
  syncPrevCompleted()
}

function canSubmitNow(k) {
  const last = lastSubmitAt.value[k] || 0
  return (Date.now() - last) >= SUBMIT_COOLDOWN_MS
}

function startCompletedEdit(r, p) {
  const k = keyOf(r.key, p.key)
  prevCompleted.value[k] = completed.value[k]
}

async function onCompletedChange(r, p) {
  const k = keyOf(r.key, p.key)

  const newVal = !!completed.value[k]
  const oldVal = !!prevCompleted.value[k]

  // Confirm before save
  const title = `${r?.name ?? ''} • ${labelOfPeriod(p.key)}`
  const action = newVal ? 'mark as Completed' : 'mark as Pending'
  const ok = window.confirm(`Confirm\n${title}\n\nDo you want to ${action}?`)
  if (!ok) {
    completed.value[k] = oldVal
    return
  }

  // Prevent concurrent submit
  if (isSaving.value[k]) {
    completed.value[k] = oldVal
    window.alert('Already updating this cell. Please wait…')
    return
  }

  // Cooldown
  if (!canSubmitNow(k)) {
    completed.value[k] = oldVal
    window.alert('Just updated. Try again in a moment.')
    return
  }

  // Require form_id (N/A when assigned == 0)
  const formId = formIdOfPeriod(p.key)
  const deptId = deptIdOfRow(r)
  const hasFormId = !!(r?.cells?.[p.key]?.form_id && formId)
  if (meta.value?.scope !== 'department' || !deptId || !hasFormId) {
    completed.value[k] = oldVal
    window.alert('This period is not assignable (no form). Cannot update.')
    return
  }

  isSaving.value[k] = true
  try {
    await store.setReportCompletion({
      form_id: formId,
      department_id: deptId,
      completed: newVal,
    })

    // success
    lastSubmitAt.value[k] = Date.now()
    prevCompleted.value[k] = newVal

    // sync local periods for truthful UI
    const idx = periods.value.findIndex(x => x.key === p.key)
    if (idx >= 0) {
      const set = new Set((meta.value.periods[idx].completed_departments || []).map(Number))
      if (newVal) set.add(deptId); else set.delete(deptId)
      meta.value.periods[idx].completed_departments = Array.from(set)
    }
  } catch (e) {
    completed.value[k] = oldVal
    console.error(e)
    window.alert('Failed to update report completion.')
  } finally {
    isSaving.value[k] = false
  }
}

const cellAssignable = (row, pk) =>
  !!row?.cells?.[pk]?.form_id && meta.value?.scope === 'department'

async function load() {
  await store.fetchBiMonthly({
    year: Number(year.value),
    scope: scope.value,
    department_id: department_id.value ? Number(department_id.value) : undefined,
    form_id: form_id.value ? Number(form_id.value) : undefined,
    rule: rule.value
  })
  initCompleted()
}

async function exportBiMonthly() {
  await store.exportBiMonthly({
    year: Number(year.value),
    scope: scope.value,
    department_id: department_id.value ? Number(department_id.value) : undefined,
    form_id: form_id.value ? Number(form_id.value) : undefined,
    rule: rule.value
  })
}


// old tick (fallback)
function tick(v){ return v ? '✓' : '—' }

// show "done/assigned"
function countStr(cell, total, role /* 'ic'|'co' */) {
  const assigned = Number(cell?.assigned ?? 0)
  const done = role === 'ic'
    ? Number(cell?.incharge?.done ?? 0)
    : Number(cell?.coordinator?.done ?? 0)
  if (assigned === 0 && done === 0) {
    const boolVal = role === 'ic' ? cell?.incharge : cell?.coordinator
    if (typeof boolVal === 'boolean') return tick(boolVal)
  }
  return `${done}/${total}`
}

function statusClass(cell, role) {
  const assigned = Number(cell?.assigned ?? 0)
  const done = role === 'ic'
    ? Number(cell?.incharge?.done ?? 0)
    : Number(cell?.coordinator?.done ?? 0)
  if (assigned === 0) return 'border-gray-200 bg-gray-50 text-gray-600'
  if (done >= assigned) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  return 'border-rose-200 bg-rose-50 text-rose-700'
}

function doPrint(){ window.print() }

onMounted(load)
watch([rows, periods, rule], initCompleted)


</script>

<template>
  <div class="space-y-4 px-4 print:px-0">
    <!-- Controls -->
    <div class="flex flex-wrap items-end gap-3 print:hidden">
      <div>
        <label class="text-sm text-gray-600">Year</label>
        <input type="number" v-model.number="year" class="w-28 rounded border px-2 py-1">
      </div>
      <button class="btn-3" @click="exportBiMonthly">Excel Generate</button>
      <button class="btn-3" @click="doPrint"><i class="far fa-print mr-1"></i>Print</button>
    </div>

    <!-- Loader / Error -->
    <div v-if="isLoading" class="py-8 text-center"><LoaderView /></div>
    <div v-else-if="error" class="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{{ error }}</div>

    <!-- Report Table -->
    <div v-else class="overflow-x-auto rounded-xl border bg-white shadow-sm">
      <table class="min-w-full text-sm">
        <thead>
          <!-- Row 1 -->
          <tr class="bg-gray-100 text-gray-800">
            <th rowspan="2" class="border px-2 py-2 text-center">SL</th>
            <th rowspan="2" class="border px-2 py-2 text-left">
              {{ meta?.scope === 'user' ? 'Employee' : 'Department' }}
            </th>
            <th
              v-for="p in periods"
              :key="p.key"
              colspan="4"
              class="border px-2 py-2 text-center font-semibold"
            >
              {{ p.label }}
            </th>
          </tr>
          <!-- Row 2: sub-columns -->
          <tr class="bg-gray-100 text-gray-700">
            <template v-for="p in periods" :key="p.key + '-sub'">
              <th class="border px-1 py-1 text-center text-[11px]">Target</th>
              <th class="border px-1 py-1 text-center text-[11px]">Report</th>
              <th class="border px-1 py-1 text-center text-[11px]">Inch.</th>
              <th class="border px-1 py-1 text-center text-[11px]">Coord.</th>
            </template>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(r, i) in rows" :key="r.key" class="border-t">
            <td class="border px-1 py-2 text-center">{{ i+1 }}</td>
            <td class="border px-1 py-2 w-40">{{ r.name }}</td>

              <template v-for="p in periods" :key="p.key">
                <!-- Report -->
                <td class="border py-1 text-center">
                  <div
                    v-if="meta?.scope==='department'"
                    class="text-xs text-gray-500"
                  >
                     {{ r.cells[p.key].monthly_target.have || 0 }} / {{ r.cells[p.key].monthly_target.of || 0 }}
                  </div>
                </td>

                <td class="border py-1 text-center">
                  <input
                    type="checkbox"
                    :disabled="!cellAssignable(r, p.key) || isSaving[keyOf(r.key, p.key)]"
                    v-model="completed[keyOf(r.key, p.key)]"
                    @mousedown="startCompletedEdit(r, p)"
                    @keydown.enter.prevent="startCompletedEdit(r, p)"
                    @change="onCompletedChange(r, p)"
                    :title="completed[keyOf(r.key,p.key)] ? 'Completed' : 'Pending'"
                  />
                </td>

                <!-- Incharge -->
                <td class="border py-1 text-center">
                  <span
                    class="inline-block text-center font-mono rounded"
                    :class="statusClass(r.cells[p.key], 'ic')"
                  >
                    {{ countStr(r.cells[p.key], r.employees_total, 'ic') }}
                  </span>
                </td>

                <!-- Coordinator -->
                <td class="border px-2 py-2 text-center">
                  <span
                    class="inline-block  text-center font-mono rounded"
                    :class="statusClass(r.cells[p.key], 'co')"
                  >
                    {{ countStr(r.cells[p.key],  r.employees_total, 'co') }}
                  </span>
                  <div
                    v-if="r.cells[p.key]?.max_total"
                    class="mt-1 text-[10px] text-gray-500 text-center"
                  >
                    {{ r.cells[p.key].final_total }} / {{ r.cells[p.key].max_total }}
                  </div>
                </td>
              </template>
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
