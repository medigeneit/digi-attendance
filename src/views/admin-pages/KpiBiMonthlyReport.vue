<script setup>
/* ===== Imports ===== */
import LoaderView from '@/components/common/LoaderView.vue'
import { useKpiReportStore } from '@/stores/kpi-report'
import { storeToRefs } from 'pinia'
import { ref, computed, onMounted, watch } from 'vue'

/* ===== Store & Refs ===== */
const store = useKpiReportStore()
const { meta, rows, isLoading, error } = storeToRefs(store)

/* ===== Filters / Params ===== */
const currentYear = new Date().getFullYear()
const year  = ref(currentYear)
const years = ref([])

const scope          = ref('department') // or 'user'
const department_id  = ref('')           // optional
const form_id        = ref('')           // optional
const rule           = ref('any')        // 'any' | 'both'

/* ===== Derived meta ===== */
const periods = computed(() => meta.value?.periods || [])
const availableYearsFromMeta = computed(() => meta.value?.available_years || null)
const periodByKey = computed(() => {
  const m = Object.create(null)
  for (const p of periods.value) m[p.key] = p
  return m
})

/* ===== Year options ===== */
function buildYearOptions(from = 2018, to = currentYear + 1) {
  const arr = []
  for (let y = to; y >= from; y--) arr.push(y)
  const ySel = Number(year.value)
  if (!arr.includes(ySel)) arr.unshift(ySel)
  years.value = Array.from(new Set(arr))
}

function applyAvailableYears(vals) {
  if (Array.isArray(vals) && vals.length) {
    years.value = [...new Set(vals.map(Number))].sort((a, b) => b - a)
    if (!years.value.includes(Number(year.value))) year.value = years.value[0]
  } else {
    buildYearOptions()
  }
}

watch(availableYearsFromMeta, applyAvailableYears, { immediate: true })

watch(year, () => {
  const y = Number(year.value)
  if (!Number.isInteger(y) || y < 2000 || y > 2100) return
  load()
})

/* ===== Cell states ===== */
const completed            = ref(Object.create(null))  // Report completion
const targetCompleted      = ref(Object.create(null))  // Target completion
const isSaving             = ref(Object.create(null))  // key => boolean (submitting)
const prevCompleted        = ref(Object.create(null))
const prevTargetCompleted  = ref(Object.create(null))
const lastSubmitAt         = ref(Object.create(null))
const SUBMIT_COOLDOWN_MS   = 1500

const keyOf = (rowKey, pKey) => `${rowKey}::${pKey}`

/* ===== Helpers ===== */
function deptIdOfRow(row) {
  if (meta.value?.scope !== 'department') return null
  const m = String(row?.key || '').match(/^dept:(\d+)$/)
  return m ? Number(m[1]) : null
}
function formIdOfPeriod(pKey) {
  const p = periodByKey.value[pKey]
  return p?.form_id ? Number(p.form_id) : null
}
function labelOfPeriod(pKey) {
  return periodByKey.value[pKey]?.label || pKey
}
function canSubmitNow(k) {
  const last = lastSubmitAt.value[k] || 0
  return (Date.now() - last) >= SUBMIT_COOLDOWN_MS
}

/* ===== Report (existing) ===== */
function syncPrevCompleted() {
  const m = Object.create(null)
  for (const r of rows.value || []) {
    for (const p of periods.value) {
      const k = keyOf(r.key, p.key)
      m[k] = completed.value[k]
    }
  }
  prevCompleted.value = m
}

function initCompleted() {
  const m = Object.create(null)

  // Build fast lookup sets once
  const completedDeptByPeriod = Object.create(null)
  for (const p of periods.value) {
    completedDeptByPeriod[p.key] = new Set((p.completed_departments || []).map(Number))
  }

  for (const r of rows.value || []) {
    const deptId = deptIdOfRow(r)
    for (const p of periods.value) {
      let val = false
      if (deptId && completedDeptByPeriod[p.key].has(deptId)) {
        val = true
      } else {
        const c       = r.cells?.[p.key]
        const assigned= Number(c?.assigned ?? 0)
        const icDone  = Number(c?.incharge?.done ?? 0)
        const coDone  = Number(c?.coordinator?.done ?? 0)
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

function startCompletedEdit(r, p) {
  const k = keyOf(r.key, p.key)
  prevCompleted.value[k] = completed.value[k]
}

async function onCompletedChange(r, p) {
  const k = keyOf(r.key, p.key)
  const newVal = !!completed.value[k]
  const oldVal = !!prevCompleted.value[k]

  const title  = `${r?.name ?? ''} • ${labelOfPeriod(p.key)}`
  const action = newVal ? 'mark as Completed' : 'mark as Pending'
  const ok = window.confirm(`Confirm\n${title}\n\nDo you want to ${action}?`)
  if (!ok) { completed.value[k] = oldVal; return }

  if (isSaving.value[k]) {
    completed.value[k] = oldVal
    window.alert('Already updating this cell. Please wait…')
    return
  }
  if (!canSubmitNow(k)) {
    completed.value[k] = oldVal
    window.alert('Just updated. Try again in a moment.')
    return
  }

  const formId   = formIdOfPeriod(p.key)
  const deptId   = deptIdOfRow(r)
  const hasForm  = !!(r?.cells?.[p.key]?.form_id && formId)

  if (meta.value?.scope !== 'department' || !deptId || !hasForm) {
    completed.value[k] = oldVal
    window.alert('This period is not assignable (no form). Cannot update.')
    return
  }

  isSaving.value[k] = true
  try {
    await store.setReportCompletion({ form_id: formId, department_id: deptId, completed: newVal })

    lastSubmitAt.value[k] = Date.now()
    prevCompleted.value[k] = newVal

    // update local meta snapshot for truthy UI
    const idx = periods.value.findIndex(x => x.key === p.key)
    if (idx >= 0) {
      const set = new Set((meta.value.periods[idx].completed_departments || []).map(Number))
      newVal ? set.add(deptId) : set.delete(deptId)
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

/* ===== Target (mirror of Report) ===== */
function syncPrevTargetCompleted() {
  const m = Object.create(null)
  for (const r of rows.value || []) {
    for (const p of periods.value) {
      const k = keyOf(r.key, p.key)
      m[k] = targetCompleted.value[k]
    }
  }
  prevTargetCompleted.value = m
}

function initTargetCompleted() {
  const m = Object.create(null)

  const targetDeptByPeriod = Object.create(null)
  for (const p of periods.value) {
    targetDeptByPeriod[p.key] = new Set((p.target_completed_departments || []).map(Number))
  }

  for (const r of rows.value || []) {
    const deptId = deptIdOfRow(r)
    for (const p of periods.value) {
      let val = false
      if (deptId && targetDeptByPeriod[p.key].has(deptId)) {
        val = true
      } else {
        // Fallback heuristic: monthly_target have/of fulfilled
        const mt   = r?.cells?.[p.key]?.monthly_target
        const have = Number(mt?.have ?? 0)
        const of   = Number(mt?.of ?? 0)
        val = of > 0 && have >= of
      }
      m[keyOf(r.key, p.key)] = val
    }
  }
  targetCompleted.value = m
  syncPrevTargetCompleted()
}

function startTargetCompletedEdit(r, p) {
  const k = keyOf(r.key, p.key)
  prevTargetCompleted.value[k] = targetCompleted.value[k]
}

async function onTargetCompletedChange(r, p) {
  const k = keyOf(r.key, p.key)
  const newVal = !!targetCompleted.value[k]
  const oldVal = !!prevTargetCompleted.value[k]

  const title  = `${r?.name ?? ''} • ${labelOfPeriod(p.key)}`
  const action = newVal ? 'mark Target as Completed' : 'mark Target as Pending'
  const ok = window.confirm(`Confirm\n${title}\n\nDo you want to ${action}?`)
  if (!ok) { targetCompleted.value[k] = oldVal; return }

  if (isSaving.value[k]) {
    targetCompleted.value[k] = oldVal
    window.alert('Already updating this cell. Please wait…')
    return
  }
  if (!canSubmitNow(k)) {
    targetCompleted.value[k] = oldVal
    window.alert('Just updated. Try again in a moment.')
    return
  }

  const deptId = deptIdOfRow(r)
  if (meta.value?.scope !== 'department' || !deptId) {
    targetCompleted.value[k] = oldVal
    window.alert('This period is not assignable. Cannot update target.')
    return
  }

  const formId = formIdOfPeriod(p.key)

  isSaving.value[k] = true
  try {
    await store.setTargetCompletion({
      period_key: p.key,
      form_id: formId || undefined,
      department_id: deptId,
      completed: newVal,
    })

    lastSubmitAt.value[k] = Date.now()
    prevTargetCompleted.value[k] = newVal

    const idx = periods.value.findIndex(x => x.key === p.key)
    if (idx >= 0) {
      const set = new Set((meta.value.periods[idx].target_completed_departments || []).map(Number))
      newVal ? set.add(deptId) : set.delete(deptId)
      meta.value.periods[idx].target_completed_departments = Array.from(set)
    }
  } catch (e) {
    targetCompleted.value[k] = oldVal
    console.error(e)
    window.alert('Failed to update target completion.')
  } finally {
    isSaving.value[k] = false
  }
}

/* ===== UI helpers ===== */
const cellReportAssignable = (row, pk) =>
  !!row?.cells?.[pk]?.form_id && meta.value?.scope === 'department'

const cellTargetAssignable = (row, pk) => {
  if (meta.value?.scope !== 'department') return false
  const mt = row?.cells?.[pk]?.monthly_target
  return Number(mt?.of ?? 0) > 0 || !!row?.cells?.[pk]?.form_id
}

function tick(v){ return v ? '✓' : '—' }

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
  if (assigned === 0)            return 'border-gray-200 bg-gray-50 text-gray-600'
  if (done >= assigned)          return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  return 'border-rose-200 bg-rose-50 text-rose-700'
}

function doPrint(){ window.print() }

/* ===== Data load ===== */
async function load() {
  try {
    await store.fetchBiMonthly({
      year: Number(year.value),
      scope: scope.value,
      department_id: department_id.value ? Number(department_id.value) : undefined,
      form_id: form_id.value ? Number(form_id.value) : undefined,
      rule: rule.value
    })
  } catch (e) {
    console.error('fetchBiMonthly failed:', e)
  } finally {
    // (Re)build derived states from latest rows/meta
    initCompleted()
    initTargetCompleted()
  }
}

async function exportBiMonthly() {
  try {
    await store.exportBiMonthly({
      year: Number(year.value),
      scope: scope.value,
      department_id: department_id.value ? Number(department_id.value) : undefined,
      form_id: form_id.value ? Number(form_id.value) : undefined,
      rule: rule.value
    })
  } catch (e) {
    console.error('exportBiMonthly failed:', e)
    window.alert('Export failed. Please try again.')
  }
}

/* ===== Reactive rebuilds ===== */
watch([rows, periods, rule], initCompleted)
watch([rows, periods],       initTargetCompleted)

/* ===== Init ===== */
onMounted(() => {
  applyAvailableYears(availableYearsFromMeta.value)
  load()
})
</script>


<template>
  <div class="space-y-4 px-4 print:px-0">
    <!-- Controls -->
    <div class="flex flex-wrap items-end gap-3 print:hidden">
     <div>
        <label class="text-sm text-gray-600">Year</label>
        <select
          v-model.number="year"
          class="w-32 rounded border px-2 py-1"
          :disabled="isLoading"
          aria-label="Select year"
        >
          <option v-for="y in years" :key="y" :value="y">
            {{ y }}
          </option>
        </select>
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
              <!-- Target -->
              <td class="border py-1 text-center">
                <input
                  type="checkbox"
                  :disabled="!cellTargetAssignable(r, p.key) || isSaving[keyOf(r.key, p.key)]"
                  v-model="targetCompleted[keyOf(r.key, p.key)]"
                  @mousedown="startTargetCompletedEdit(r, p)"
                  @keydown.enter.prevent="startTargetCompletedEdit(r, p)"
                  @change="onTargetCompletedChange(r, p)"
                  :title="targetCompleted[keyOf(r.key,p.key)] ? 'Target Completed' : 'Target Pending'"
                />
                <!-- <div
                  v-if="r.cells?.[p.key]?.monthly_target"
                  class="mt-1 text-[10px] text-gray-500 text-center"
                >
                  {{ Number(r.cells[p.key].monthly_target.have||0) }} / {{ Number(r.cells[p.key].monthly_target.of||0) }}
                </div> -->
              </td>

              <!-- Report -->
              <td class="border py-1 text-center">
                <input
                  type="checkbox"
                  :disabled="!cellReportAssignable(r, p.key) || isSaving[keyOf(r.key, p.key)]"
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
                  class="inline-block text-center font-mono rounded"
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
