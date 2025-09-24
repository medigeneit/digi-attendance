<script setup>
/* ===== Imports ===== */
import LoaderView from '@/components/common/LoaderView.vue'
import { useKpiReportStore } from '@/stores/kpi-report'
import { storeToRefs } from 'pinia'
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

/* ===== Store & Refs ===== */
const store = useKpiReportStore()
const { meta, rows, isLoading, error } = storeToRefs(store)

/* ===== Filters / Params ===== */
const currentYear = new Date().getFullYear()
const year  = ref(currentYear)
const years = ref([])

const scope          = ref('department') // or 'user'
const department_id  = ref('')
const form_id        = ref('')
const rule           = ref('any')        // 'any' | 'both'

/* ===== Derived meta ===== */
const periods = computed(() => meta.value?.periods || [])
const availableYearsFromMeta = computed(() => meta.value?.available_years || null)
const periodByKey = computed(() => {
  const m = Object.create(null)
  for (const p of periods.value) m[p.key] = p
  return m
})

/* ===== Highlight Keys (dynamic) ===== */
const route = useRoute()
const localDefaultHot = ['feb_mar','jun_jul','nov']
const highlightKeys = computed(() => {
  const q = route.query.hl
  if (q) return new Set(String(q).split(',').map(s => s.trim()).filter(Boolean))
  const metaKeys = meta.value?.highlight_period_keys
  if (Array.isArray(metaKeys) && metaKeys.length) return new Set(metaKeys)
  return new Set(localDefaultHot)
})
const isHot   = (p) => highlightKeys.value.has(p.key)
const hotBg   = (p) => (isHot(p) ? 'bg-amber-50' : 'bg-white')
const hotEdge = (p) => (isHot(p) ? 'border-amber-300' : 'border-gray-200')

/* ===== Year options ===== */
const current = currentYear
function buildYearOptions(from = 2018, to = current + 1) {
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
const completed            = ref(Object.create(null))
const targetCompleted      = ref(Object.create(null))
const isSaving             = ref(Object.create(null))
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
  for (const r of rows.value || []) for (const p of periods.value) {
    const k = keyOf(r.key, p.key)
    m[k] = completed.value[k]
  }
  prevCompleted.value = m
}
function initCompleted() {
  const m = Object.create(null)
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
  if (isSaving.value[k]) { completed.value[k] = oldVal; window.alert('Already updating…'); return }
  if (!canSubmitNow(k)) { completed.value[k] = oldVal; window.alert('Just updated. Try again shortly.'); return }

  const formId   = formIdOfPeriod(p.key)
  const deptId   = deptIdOfRow(r)
  const hasForm  = !!(r?.cells?.[p.key]?.form_id && formId)
  if (meta.value?.scope !== 'department' || !deptId || !hasForm) {
    completed.value[k] = oldVal
    window.alert('This period is not assignable (no form).')
    return
  }

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
    completed.value[k] = oldVal
    console.error(e); window.alert('Failed to update.')
  } finally {
    isSaving.value[k] = false
  }
}

/* ===== Target (mirror of Report) ===== */
function syncPrevTargetCompleted() {
  const m = Object.create(null)
  for (const r of rows.value || []) for (const p of periods.value) {
    const k = keyOf(r.key, p.key); m[k] = targetCompleted.value[k]
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
  const k = keyOf(r.key, p.key); prevTargetCompleted.value[k] = targetCompleted.value[k]
}
async function onTargetCompletedChange(r, p) {
  const k = keyOf(r.key, p.key)
  const newVal = !!targetCompleted.value[k]
  const oldVal = !!prevTargetCompleted.value[k]
  const title  = `${r?.name ?? ''} • ${labelOfPeriod(p.key)}`
  const action = newVal ? 'mark Target as Completed' : 'mark Target as Pending'
  const ok = window.confirm(`Confirm\n${title}\n\nDo you want to ${action}?`)
  if (!ok) { targetCompleted.value[k] = oldVal; return }
  if (isSaving.value[k]) { targetCompleted.value[k] = oldVal; window.alert('Already updating…'); return }
  if (!canSubmitNow(k)) { targetCompleted.value[k] = oldVal; window.alert('Just updated. Try again shortly.'); return }

  const deptId = deptIdOfRow(r)
  if (meta.value?.scope !== 'department' || !deptId) {
    targetCompleted.value[k] = oldVal; window.alert('Not assignable.'); return
  }
  const formId = formIdOfPeriod(p.key)

  isSaving.value[k] = true
  try {
    await store.setTargetCompletion({ period_key: p.key, form_id: formId || undefined, department_id: deptId, completed: newVal })
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
    console.error(e); window.alert('Failed to update.')
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
const tick = (v) => (v ? '✓' : '—')
function countStr(cell, total, role) {
  const assigned = Number(cell?.assigned ?? 0)
  const done = role === 'ic' ? Number(cell?.incharge?.done ?? 0) : Number(cell?.coordinator?.done ?? 0)
  if (assigned === 0 && done === 0) {
    const boolVal = role === 'ic' ? cell?.incharge : cell?.coordinator
    if (typeof boolVal === 'boolean') return tick(boolVal)
  }
  return `${done}/${total}`
}
function statusClass(cell, role) {
  const assigned = Number(cell?.assigned ?? 0)
  const done = role === 'ic' ? Number(cell?.incharge?.done ?? 0) : Number(cell?.coordinator?.done ?? 0)
  if (assigned === 0)   return 'bg-gray-50 text-gray-600'
  if (done >= assigned) return 'bg-emerald-50 text-emerald-700'
  return 'bg-rose-50 text-rose-700'
}
function doPrint(){ window.print() }
function nowStr() {
  const d = new Date()
  // readable, local timezone
  return d.toLocaleString()
}

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
    <!-- Print Header -->
    <div class="hidden print:block mx-auto text-center mb-3">
      <h1 class="text-xl font-semibold text-gray-900">Bi-Monthly KPI Report</h1>
      <div class="text-sm text-gray-600">
        Year: <span class="font-medium">{{ year }}</span> • Generated: <span>{{ nowStr() }}</span>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex flex-wrap items-end gap-3 sticky top-0 z-10 bg-white/80 backdrop-blur print:hidden p-2 -mx-2 rounded-md border border-gray-100">
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
        <button class="btn-3 !py-1.5 !px-3" @click="exportBiMonthly">
          <i class="far fa-file-excel mr-1"></i> Excel
        </button>
        <button class="btn-3 !py-1.5 !px-3" @click="doPrint">
          <i class="far fa-print mr-1"></i> Print
        </button>
      </div>
    </div>

    <!-- Loader / Error -->
    <div v-if="isLoading" class="py-10 text-center">
      <LoaderView />
    </div>
    <div v-else-if="error" class="rounded-md border border-red-200 bg-red-50 p-3 text-red-700" role="alert" aria-live="polite">
      {{ error }}
    </div>

    <!-- ===== Mobile Cards (sm-only) ===== -->
    <div v-else class="space-y-3 md:hidden">
      <div v-for="(r, i) in rows" :key="'card-'+r.key" class="rounded-xl border border-gray-200 bg-white shadow-sm p-3 break-inside-avoid">
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium text-gray-900 truncate" :title="r.name">{{ i + 1 }}. {{ r.name }}</div>
          <div class="text-xs text-gray-500">Total: {{ r.employees_total }}</div>
        </div>

        <div class="mt-2 grid grid-cols-1 gap-2">
          <div v-for="p in periods" :key="p.key" class="rounded-lg border p-2"
               :class="[hotBg(p), isHot(p) ? 'border-amber-300' : 'border-gray-200']">
            <div class="flex items-center justify-between">
              <div class="text-[13px] font-semibold text-gray-800">{{ p.label }}</div>
              <div class="flex items-center gap-3">
                <!-- Report -->
                <label class="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    class="h-4 w-4 accent-emerald-500"
                    :aria-label="`Report • ${r.name} • ${p.label}`"
                    :disabled="!cellReportAssignable(r, p.key) || isSaving[keyOf(r.key, p.key)]"
                    v-model="completed[keyOf(r.key, p.key)]"
                    @mousedown="startCompletedEdit(r, p)"
                    @keydown.enter.prevent="startCompletedEdit(r, p)"
                    @change="onCompletedChange(r, p)"
                  />
                  <span class="text-[11px] text-gray-700">Report</span>
                </label>
                <!-- Target -->
                <label class="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    class="h-4 w-4 accent-sky-500"
                    :aria-label="`Target • ${r.name} • ${p.label}`"
                    :disabled="!cellTargetAssignable(r, p.key) || isSaving[keyOf(r.key, p.key)]"
                    v-model="targetCompleted[keyOf(r.key, p.key)]"
                    @mousedown="startTargetCompletedEdit(r, p)"
                    @keydown.enter.prevent="startTargetCompletedEdit(r, p)"
                    @change="onTargetCompletedChange(r, p)"
                  />
                  <span class="text-[11px] text-gray-700">Target</span>
                </label>
              </div>
            </div>

            <div class="mt-2 grid grid-cols-2 gap-2 text-center">
              <div class="rounded px-2 py-1 text-[12px]" :class="statusClass(r.cells[p.key], 'ic')">
                Inch: {{ countStr(r.cells[p.key], r.employees_total, 'ic') }}
              </div>
              <div class="rounded px-2 py-1 text-[12px]" :class="statusClass(r.cells[p.key], 'co')">
                Coord: {{ countStr(r.cells[p.key], r.employees_total, 'co') }}
              </div>
            </div>
            <div v-if="r.cells[p.key]?.max_total" class="mt-1 text-[10px] text-gray-500 text-center">
              {{ r.cells[p.key].final_total }} / {{ r.cells[p.key].max_total }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="!rows || rows.length===0" class="px-3 py-6 text-center text-gray-600">No data</div>
    </div>

    <!-- ===== Desktop Table (md+) ===== -->
    <div v-else class="hidden md:block overflow-x-auto rounded-xl border bg-white shadow-sm">
      <table class="min-w-[900px] w-full text-sm">
        <thead class="text-gray-800 sticky top-0 z-[5]">
          <!-- Row 1: group headers -->
          <tr class="bg-gray-100/95 backdrop-blur">
            <th rowspan="2"
                class="sticky left-0 z-[6] border-y border-r bg-gray-100/95 px-2 py-2 text-center"
                style="min-width:2.25rem; width:2.25rem">SL</th>

            <th rowspan="2"
                class="sticky z-[6] border-y border-r bg-gray-100/95 px-2 py-2 text-left"
                :style="{ left: '2rem', minWidth:'12.5rem', width:'12.5rem'}">
              {{ meta?.scope === 'user' ? 'Employee' : 'Department' }}
            </th>

            <th
              v-for="p in periods"
              :key="p.key"
              colspan="4"
              class="border-y px-2 py-2 text-center font-semibold border-x-2 text-red-500 print:text-black"
              :class="[ hotBg(p), hotEdge(p) ]"
            >
              <span class="whitespace-nowrap">{{ p.label }}</span>
            </th>
          </tr>

          <!-- Row 2: sub-columns -->
          <tr class="bg-gray-100/95 text-gray-700 whitespace-nowrap">
            <template v-for="p in periods" :key="p.key + '-sub'">
              <th class="border-y py-1 text-center text-[11px] w-8 border-r" :class="hotBg(p)">Report</th>
              <th class="border-y py-1 text-center text-[11px] w-8 border-r" :class="[ hotBg(p), hotEdge(p) ]">Target</th>
              <th class="border-y py-1 text-center text-[11px] w-8 border-r" :class="hotBg(p)">Inch.</th>
              <th class="border-y py-1 text-center text-[11px] border-r-2 w-8" :class="[ hotBg(p), hotEdge(p) ]">Coord.</th>
            </template>
          </tr>
        </thead>

        <tbody class="text-gray-800">
          <tr v-for="(r, i) in rows" :key="r.key"
              class="border-t odd:bg-gray-50 hover:bg-sky-50/40 transition-colors break-inside-avoid">
            <!-- sticky first 2 columns -->
            <td class="sticky left-0 z-[4] border-r bg-inherit px-2 text-center">{{ i + 1 }}</td>

            <td class="sticky z-[4] border bg-inherit px-2">
              <div class="truncate w-48" :title="r.name">{{ r.name }}</div>
            </td>

            <template v-for="p in periods" :key="p.key">
              <!-- Report -->
              <td class="border-r text-center" :class="hotBg(p)">
                <label class="inline-flex items-center justify-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    class="h-4 w-4 accent-emerald-500"
                    :aria-label="`Report • ${r.name} • ${p.label}`"
                    :disabled="!cellReportAssignable(r, p.key) || isSaving[keyOf(r.key, p.key)]"
                    v-model="completed[keyOf(r.key, p.key)]"
                    @mousedown="startCompletedEdit(r, p)"
                    @keydown.enter.prevent="startCompletedEdit(r, p)"
                    @change="onCompletedChange(r, p)"
                  />
                </label>
              </td>

              <!-- Target -->
              <td class="text-center border-r" :class="[ hotBg(p), hotEdge(p) ]">
                <label class="inline-flex items-center justify-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    class="h-4 w-4 accent-sky-500"
                    :aria-label="`Target • ${r.name} • ${p.label}`"
                    :disabled="!cellTargetAssignable(r, p.key) || isSaving[keyOf(r.key, p.key)]"
                    v-model="targetCompleted[keyOf(r.key, p.key)]"
                    @mousedown="startTargetCompletedEdit(r, p)"
                    @keydown.enter.prevent="startTargetCompletedEdit(r, p)"
                    @change="onTargetCompletedChange(r, p)"
                  />
                </label>
              </td>

              <!-- Incharge -->
              <td class="border-r text-center" :class="hotBg(p)">
                <span class="inline-block rounded py-0.5 font-mono text-[12px]"
                      :class="statusClass(r.cells[p.key], 'ic')">
                  {{ countStr(r.cells[p.key], r.employees_total, 'ic') }}
                </span>
              </td>

              <!-- Coordinator -->
              <td class="border-y text-center border-r-2" :class="[ hotBg(p), hotEdge(p) ]">
                <span class="inline-block rounded py-0.5 font-mono text-[12px]"
                      :class="statusClass(r.cells[p.key], 'co')">
                  {{ countStr(r.cells[p.key],  r.employees_total, 'co') }}
                </span>
                <div v-if="r.cells[p.key]?.max_total" class="mt-1 text-[10px] text-gray-500 text-center">
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
thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

/* Prevent row splitting across pages */
.break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }

/* Print cleanup */
@media print {
  .print\:hidden { display: none !important; }
  .rounded-xl { border-radius: 0 !important; }
  .shadow-sm { box-shadow: none !important; }
  .md\:hidden { display: none !important; }
  .md\:block { display: block !important; }
  table { width: 100% !important; }
}
</style>
