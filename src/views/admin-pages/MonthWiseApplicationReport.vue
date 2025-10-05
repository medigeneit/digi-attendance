<script setup>
import { useLeaveApplicationStore } from '@/stores/leave-application'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/* ------------------ router ------------------ */
const route = useRoute()
const router = useRouter()

/* ------------------ store ------------------- */
const leaveApplicationStore = useLeaveApplicationStore()

/* ------------------ ui state ---------------- */
const loading = ref(false)
const error = ref(null)

const applicationReport = ref([])       // array of per-user summaries
const applicationReportMonth = ref('')  // YYYY-MM

/* filters */
const selectedMonth = ref(route.query.date || new Date().toISOString().slice(0, 7))
const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
})

/* ---- table ui ---- */
const q = ref('')               // search by name/emp/designation
const dense = ref(true)         // compact density
const showZeroOnly = ref(false) // show only rows that are all zeros

/* ---- column groups (persisted) ---- */
const COLS_KEY = 'monthly_application_cols_v2'
const cols = ref({
  ot: true,       // Overtime
  leave: true,    // Leave Day
  ex: false,      // Shift Exchange
  sl: true,       // Short Leave
  manual: true,   // <-- NEW: Manual separate group
})
try {
  const saved = JSON.parse(localStorage.getItem(COLS_KEY) || '{}')
  Object.assign(cols.value, saved)
} catch {}
watch(cols, v => localStorage.setItem(COLS_KEY, JSON.stringify(v)), { deep: true })

/* ---------------- helpers ------------------ */
const safeNum = (n) => (Number.isFinite(+n) ? +n : 0)
const toHM = (hours) => {
  const n = Number(hours) || 0
  const h = Math.floor(n)
  const m = Math.round((n - h) * 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}
const toHMShort = (hours) => {
  const n = Number(hours) || 0
  const h = Math.floor(n)
  const m = Math.round((n - h) * 60)
  return `${h}:${String(m).padStart(2, '0')}`
}
const normalizeLeaveByType = (byType) => {
  if (!byType) return {}
  if (Array.isArray(byType)) {
    const out = {}
    for (const it of byType) {
      if (it && it.type != null) out[String(it.type)] = safeNum(it.days)
    }
    return out
  }
  return typeof byType === 'object' ? byType : {}
}
const hasAnyPositive = (obj = {}) => Object.values(obj).some(v => safeNum(v) > 0)

/* --------------- computed (row+totals) ----- */
const coreRows = computed(() =>
  (applicationReport.value || []).map(r => {
    const _leaveBy = normalizeLeaveByType(r?.leave?.by_type)
    return {
      ...r,
      _leaveBy,
      _cl: safeNum(_leaveBy.CL),
      _ml: safeNum(_leaveBy.ML),
      _sl: safeNum(_leaveBy.SL),
      _leaveTotal: safeNum(r?.leave?.total_days),
      _otReq: safeNum(r?.overtime?.requested_hours),
      _otAppr: safeNum(r?.overtime?.approved_hours),
      _otApps: safeNum(r?.overtime?.count),
      _exOff: safeNum(r?.exchanges?.offday),
      _exShift: safeNum(r?.exchanges?.shift),
      _slTotal: safeNum(r?.short_leave?.total),
      _slMinutes: safeNum(r?.short_leave?.minutes),
      _manual: safeNum(r?.manual_attendance),
    }
  })
)

const filteredRows = computed(() => {
  const term = (q.value || '').toLowerCase().trim()
  let list = coreRows.value
  if (term) {
    list = list.filter(u =>
      String(u.user_name || '').toLowerCase().includes(term) ||
      String(u.employee_id || '').toLowerCase().includes(term) ||
      String(u.designation || '').toLowerCase().includes(term)
    )
  }
  if (showZeroOnly.value) {
    list = list.filter(u => {
      const metrics = {
        _cl: u._cl, _ml: u._ml, _sl: u._sl, _leaveTotal: u._leaveTotal,
        _otReq: u._otReq, _otAppr: u._otAppr, _otApps: u._otApps,
        _exOff: u._exOff, _exShift: u._exShift,
        _slTotal: u._slTotal, _slMinutes: u._slMinutes, _manual: u._manual,
      }
      return !hasAnyPositive(metrics)
    })
  }
  return list
})

const totals = computed(() => {
  const t = {
    cl: 0, ml: 0, sl: 0, leaveTotal: 0,
    otReq: 0, otAppr: 0, otApps: 0,
    exOff: 0, exShift: 0,
    slTotal: 0, slMinutes: 0, manual: 0,
  }
  for (const r of filteredRows.value) {
    t.cl += r._cl; t.ml += r._ml; t.sl += r._sl; t.leaveTotal += r._leaveTotal
    t.otReq += r._otReq; t.otAppr += r._otAppr; t.otApps += r._otApps
    t.exOff += r._exOff; t.exShift += r._exShift
    t.slTotal += r._slTotal; t.slMinutes += r._slMinutes; t.manual += r._manual
  }
  return t
})

/* dynamic colspans for group headers */
const groupColspan = (g) => {
  if (g === 'ot') return cols.value.ot ? 3 : 0
  if (g === 'leave') return cols.value.leave ? 4 : 0
  if (g === 'ex') return cols.value.ex ? 2 : 0
  if (g === 'sl') return cols.value.sl ? 2 : 0       // SL now only 2 columns
  if (g === 'manual') return cols.value.manual ? 1 : 0
  return 0
}

/* ---------------- fetcher ------------------- */
const fetchSummary = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await leaveApplicationStore.getMonthlyApplicationSummary({
      month: selectedMonth.value,
      companyId: filters.value.company_id || null,
      departmentId:
        !filters.value.department_id || filters.value.department_id === 'all'
          ? null
          : filters.value.department_id,
      includeEmpty: true,
    })
    const list =
      Array.isArray(res?.results) ? res.results
      : Array.isArray(res?.data)  ? res.data
      : Array.isArray(res)        ? res
      : []
    applicationReport.value = list
    applicationReportMonth.value = res?.month || selectedMonth.value
  } catch (e) {
    console.error(e)
    error.value = e?.response?.data?.message || e?.message || 'Failed to load monthly application summary.'
  } finally {
    loading.value = false
  }
}

/* --------------- lifecycle ------------------ */
onMounted(fetchSummary)

/* --------------- watchers ------------------- */
watch(selectedMonth, (m) => {
  router.replace({ query: { ...route.query, date: m } })
  fetchSummary()
})
watch(
  () => [filters.value.company_id, filters.value.department_id, filters.value.line_type],
  () => {
    router.replace({
      query: {
        ...route.query,
        company_id: filters.value.company_id || '',
        department_id: filters.value.department_id || 'all',
        line_type: filters.value.line_type || 'all',
      },
    })
    fetchSummary()
  }
)

/* --------------- export/print --------------- */
const downloadCSV = () => {
  const header = [
    '#','Employee',
    ...(cols.value.ot ? ['OT Req(h)','OT Appr(h)','OT Apps'] : []),
    ...(cols.value.leave ? ['CL','ML','SL','Leave Total'] : []),
    ...(cols.value.ex ? ['Offday Exch','Shift Exch'] : []),
    ...(cols.value.sl ? ['SL Total','SL Minutes'] : []),
    ...(cols.value.manual ? ['Manual'] : []),
  ]
  const rowsCsv = filteredRows.value.map((u, i) => ([
    i + 1,
    `${u.user_name}${u.employee_id ? ` (#${u.employee_id})` : ''}`,
    ...(cols.value.ot ? [u._otReq, u._otAppr, u._otApps] : []),
    ...(cols.value.leave ? [u._cl, u._ml, u._sl, u._leaveTotal] : []),
    ...(cols.value.ex ? [u._exOff, u._exShift] : []),
    ...(cols.value.sl ? [u._slTotal, u._slMinutes] : []),
    ...(cols.value.manual ? [u._manual] : []),
  ]))
  const csv = [header, ...rowsCsv].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `monthly-application-${applicationReportMonth.value || selectedMonth.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
const printTable = () => window.print()
</script>

<template>
  <div class="px-3 space-y-4">
    <!-- Title + Toolbar -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="min-w-[200px]">
        <h1 class="text-base font-semibold text-slate-800 leading-tight">Monthly Application Summary</h1>
        <p class="text-[11px] text-slate-500 -mt-0.5">Month: <b>{{ applicationReportMonth || selectedMonth }}</b></p>
      </div>
      <div class="flex-1"></div>

      <div class="hidden md:flex items-center gap-2 rounded-lg border bg-white p-1">
        <span class="px-2 py-0.5 text-[11px] text-slate-500">Cols:</span>
        <label class="cols-chk"><input type="checkbox" v-model="cols.ot" /> OT</label>
        <label class="cols-chk"><input type="checkbox" v-model="cols.leave" /> Leave</label>
        <label class="cols-chk"><input type="checkbox" v-model="cols.ex" /> Exch</label>
        <label class="cols-chk"><input type="checkbox" v-model="cols.sl" /> Short</label>
        <label class="cols-chk"><input type="checkbox" v-model="cols.manual" /> Manual</label>
      </div>

      <button class="btn-secondary" @click="downloadCSV">Export CSV</button>
      <button class="btn-secondary" @click="printTable">Print</button>
    </div>

    <!-- Controls -->
    <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-2">
      <EmployeeFilter
        v-model:company_id="filters.company_id"
        v-model:department_id="filters.department_id"
        v-model:line_type="filters.line_type"
        :with-type="true"
        :initial-value="$route.query"
      />
      <div>
        <label class="block text-[11px] text-gray-500 mb-0.5">Month</label>
        <input type="month" v-model="selectedMonth" class="input-1 py-1 h-8" />
      </div>

      <div class="flex items-center gap-2 ml-auto">
        <div class="relative">
          <input
            v-model="q"
            type="search"
            placeholder="Search employee / ID / designation"
            class="input-1 w-64 pl-8 h-8"
          />
          <span class="absolute left-2 top-1.5 text-slate-400 select-none">🔎</span>
        </div>
        <label class="flex items-center gap-1 text-[11px] text-slate-600">
          <input type="checkbox" v-model="dense" />
          Compact
        </label>
        <label class="flex items-center gap-1 text-[11px] text-slate-600">
          <input type="checkbox" v-model="showZeroOnly" />
          Zero-only
        </label>
      </div>
    </div>

    <!-- Loading / Error -->
    <LoaderView v-if="loading" />
    <div v-if="error" class="p-2 rounded bg-red-50 text-red-700 text-[12px] border border-red-200">
      {{ error }}
    </div>

    <!-- ======= LIST/TABLE VIEW ======= -->
    <div
      v-if="!loading"
      class="table-wrap group bg-white border rounded-xl shadow-sm overflow-auto print:overflow-visible"
      :class="dense ? 'max-h-[68vh]' : 'max-h-[74vh]'"
    >
      <table class="w-full text-[12px] print:text-[11px] leading-tight">
        <!-- width hints -->
        <colgroup>
          <col style="width:34px" />
          <col style="width:220px" />
          <template v-if="cols.ot"><col span="3" style="width:96px" /></template>
          <template v-if="cols.leave"><col span="4" style="width:96px" /></template>
          <template v-if="cols.ex"><col span="2" style="width:102px" /></template>
          <template v-if="cols.sl"><col span="2" style="width:96px" /></template>
          <template v-if="cols.manual"><col span="1" style="width:96px" /></template>
        </colgroup>

        <!-- Grouped header (Manual separated) -->
        <thead class="sticky top-0 z-20 bg-white/95 backdrop-blur">
          <tr class="*:px-2.5 *:py-1.5 *:text-center *:border-b *:border-slate-200 text-slate-700">
            <th rowspan="2" class="text-left sticky left-0 z-30 bg-white/95">#</th>
            <th rowspan="2" class="text-left sticky left-[34px] z-30 bg-white/95">Employee</th>

            <th v-if="cols.ot" :colspan="groupColspan('ot')" class="th-group th-ot">Overtime</th>
            <th v-if="cols.leave" :colspan="groupColspan('leave')" class="th-group th-leave">Leave Day</th>
            <th v-if="cols.ex" :colspan="groupColspan('ex')" class="th-group th-ex">Shift Exchange</th>
            <th v-if="cols.sl" :colspan="groupColspan('sl')" class="th-group th-sl">Short Leave</th>
            <th v-if="cols.manual" :colspan="groupColspan('manual')" class="th-group th-manual">Manual</th>
          </tr>
          <tr class="*:px-2.5 *:py-1 *:text-center *:border-b *:border-slate-200">
            <!-- OT -->
            <template v-if="cols.ot">
              <th class="th-col th-ot" title="Requested Hours">Req</th>
              <th class="th-col th-ot" title="Approved Hours">Appr</th>
              <th class="th-col th-ot" title="Applications Count">Apps</th>
            </template>

            <!-- Leave -->
            <template v-if="cols.leave">
              <th class="th-col th-leave" title="Casual Leave">CL</th>
              <th class="th-col th-leave" title="Medical Leave">ML</th>
              <th class="th-col th-leave" title="Sick Leave">SL</th>
              <th class="th-col th-leave" title="Total Leave Days">Total</th>
            </template>

            <!-- Exchange -->
            <template v-if="cols.ex">
              <th class="th-col th-ex" title="Offday Exchange">Offday</th>
              <th class="th-col th-ex" title="Shift Exchange">Shift</th>
            </template>

            <!-- Short Leave -->
            <template v-if="cols.sl">
              <th class="th-col th-sl" title="Short Leave Applications">Total</th>
              <th class="th-col th-sl" title="Short Leave Minutes">Minutes</th>
            </template>

            <!-- Manual (separate) -->
            <template v-if="cols.manual">
              <th class="th-col th-manual" title="Manual Adjustments">Count</th>
            </template>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100">
          <tr
            v-for="(u, idx) in filteredRows"
            :key="u.user_id || idx"
            class="hover:bg-slate-50/80"
            :class="dense ? 'h-9' : 'h-11'"
          >
            <!-- sticky cells -->
            <td class="px-2.5 text-left sticky left-0 z-20 bg-white">{{ idx + 1 }}</td>
            <td class="px-2.5 sticky left-[34px] z-20 bg-white">
              <div class="flex items-center gap-2">
                <span class="font-medium text-slate-800 truncate max-w-[180px]">{{ u.user_name }}</span>
                <span v-if="u.employee_id" class="text-[10px] text-slate-400">#{{ u.employee_id }}</span>
              </div>
              <div v-if="u.designation" class="text-[10px] text-slate-500 -mt-0.5 truncate max-w-[200px]">{{ u.designation }}</div>
            </td>

            <!-- overtime -->
            <template v-if="cols.ot">
              <td class="text-center whitespace-nowrap">
                <span :class="u._otReq>0?'badge':'muted'" :title="toHM(u._otReq)">{{ toHMShort(u._otReq) }}</span>
              </td>
              <td class="text-center whitespace-nowrap">
                <span :class="u._otAppr>0?'badge':'muted'" :title="toHM(u._otAppr)">{{ toHMShort(u._otAppr) }}</span>
              </td>
              <td class="text-center"><span :class="u._otApps>0?'badge':'muted'">{{ u._otApps }}</span></td>
            </template>

            <!-- leave -->
            <template v-if="cols.leave">
              <td class="text-center"><span :class="u._cl>0?'badge-soft-emerald':'muted'">{{ u._cl }}</span></td>
              <td class="text-center"><span :class="u._ml>0?'badge-soft-emerald':'muted'">{{ u._ml }}</span></td>
              <td class="text-center"><span :class="u._sl>0?'badge-soft-emerald':'muted'">{{ u._sl }}</span></td>
              <td class="text-center font-medium"><span :class="u._leaveTotal>0?'badge-strong':'muted'">{{ u._leaveTotal }}</span></td>
            </template>

            <!-- exchanges -->
            <template v-if="cols.ex">
              <td class="text-center"><span :class="u._exOff>0?'badge-soft-indigo':'muted'">{{ u._exOff }}</span></td>
              <td class="text-center"><span :class="u._exShift>0?'badge-soft-indigo':'muted'">{{ u._exShift }}</span></td>
            </template>

            <!-- short leave -->
            <template v-if="cols.sl">
              <td class="text-center"><span :class="u._slTotal>0?'badge-soft-amber':'muted'">{{ u._slTotal }}</span></td>
              <td class="text-center"><span :class="u._slMinutes>0?'badge-soft-amber':'muted'">{{ u._slMinutes }}</span></td>
            </template>

            <!-- manual separate -->
            <template v-if="cols.manual">
              <td class="text-center"><span :class="u._manual>0?'badge-soft-slate':'muted'">{{ u._manual }}</span></td>
            </template>
          </tr>

          <!-- Totals Row -->
          <tr class="bg-gradient-to-r from-slate-100 to-slate-50 *:px-2.5 *:py-1.5 font-semibold border-t sticky bottom-0 z-10">
            <td></td>
            <td class="text-slate-700">Totals ({{ filteredRows.length }} emp)</td>

            <template v-if="cols.ot">
              <td class="text-center">{{ toHMShort(totals.otReq) }}</td>
              <td class="text-center">{{ toHMShort(totals.otAppr) }}</td>
              <td class="text-center">{{ totals.otApps }}</td>
            </template>

            <template v-if="cols.leave">
              <td class="text-center">{{ totals.cl }}</td>
              <td class="text-center">{{ totals.ml }}</td>
              <td class="text-center">{{ totals.sl }}</td>
              <td class="text-center">{{ totals.leaveTotal }}</td>
            </template>

            <template v-if="cols.ex">
              <td class="text-center">{{ totals.exOff }}</td>
              <td class="text-center">{{ totals.exShift }}</td>
            </template>

            <template v-if="cols.sl">
              <td class="text-center">{{ totals.slTotal }}</td>
              <td class="text-center">{{ totals.slMinutes }}</td>
            </template>

            <template v-if="cols.manual">
              <td class="text-center">{{ totals.manual }}</td>
            </template>
          </tr>
        </tbody>
      </table>

      <!-- Scroll shadows -->
      <div class="scroll-shadow-left"></div>
      <div class="scroll-shadow-right"></div>
    </div>

    <!-- Empty -->
    <div v-if="!loading && filteredRows.length === 0" class="text-center text-slate-500 py-8">
      No records for {{ selectedMonth }}.
    </div>
  </div>
</template>

<style scoped>
/* inputs & buttons */
.input-1{ @apply rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100; }
.btn-secondary{ @apply inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200; }

/* tiny checkbox chips for columns */
.cols-chk{ @apply inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer; }
.cols-chk input{ @apply scale-90; }

/* highlighted group headers */
.th-group{ @apply text-[11px] font-semibold uppercase tracking-wide border border-slate-200; }
.th-col{ @apply text-[11px] font-medium border border-slate-200; }
.th-ot{ @apply bg-blue-50 text-blue-800; }
.th-leave{ @apply bg-emerald-50 text-emerald-800; }
.th-ex{ @apply bg-indigo-50 text-indigo-800; }
.th-sl{ @apply bg-amber-50 text-amber-800; }
.th-manual{ @apply bg-slate-50 text-slate-800; }  /* NEW */

/* subtle value badges */
.badge{ @apply inline-block px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[11px]; }
.badge-strong{ @apply inline-block px-1.5 py-0.5 rounded-md bg-emerald-600/10 text-emerald-700 border border-emerald-200 text-[11px]; }
.badge-soft-emerald{ @apply inline-block px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px]; }
.badge-soft-indigo{ @apply inline-block px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px]; }
.badge-soft-amber{ @apply inline-block px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 text-[11px]; }
.badge-soft-slate{ @apply inline-block px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200 text-[11px]; }
.muted{ @apply text-slate-400; }

/* table container & scroll shadows */
.table-wrap{ position: relative; }
.scroll-shadow-left,
.scroll-shadow-right{
  position: sticky; top: 0; bottom: 0; width: 14px; pointer-events: none; z-index: 25;
}
.scroll-shadow-left{ left: 0; background: linear-gradient(to right, rgba(2,6,23,0.08), transparent); }
.scroll-shadow-right{ float: right; right: 0; background: linear-gradient(to left, rgba(2,6,23,0.08), transparent); }

/* print tweaks */
@media print{
  .btn-secondary,.input-1,.cols-chk{ display:none !important; }
}
</style>
