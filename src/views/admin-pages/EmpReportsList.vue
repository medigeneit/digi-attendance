<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import EmpReportMultiFilter from '@/components/reports/EmpReportMultiFilter.vue'
import { useUserStore } from '@/stores/user'
import { useEmpReportsStore } from '@/stores/empReports'
import { useAuthStore } from '@/stores/auth'

const userStore = useUserStore()
const empStore  = useEmpReportsStore()
const authStore = useAuthStore()
const { users, isLoading }          = storeToRefs(userStore)
const { summary, isLoadingSummary } = storeToRefs(empStore)
const canExportReports = computed(() => authStore.canFeature('emp_reports.export'))

// ─── Filter state ─────────────────────────────────────────────────────────────
const filterCompanyIds    = ref([])
const filterDepartmentIds = ref([])
const filterLineType      = ref('all')
const filterStatus       = ref('active')
const filterSearch       = ref('')
const filterJoiningYear  = ref('')
const filterHasBlood     = ref(false)
const sortBy             = ref('grade_joining_department')
const sortDir            = ref('asc')

const SORT_OPTIONS = [
  { value: 'grade_joining_department', label: 'Grade + Joining Date + Department' },
  { value: 'grade_joining', label: 'Grade + Joining Date' },
  { value: 'grade', label: 'Grade' },
  { value: 'joining_date', label: 'Joining Date' },
  { value: 'department', label: 'Department' },
  { value: 'designation', label: 'Designation' },
  { value: 'company', label: 'Company' },
  { value: 'name', label: 'Name' },
  { value: 'employee_id', label: 'Employee ID' },
  { value: 'line_type', label: 'Line Type' },
  { value: 'status', label: 'Status' },
  { value: 'last_working_date', label: 'Last Working Date' },
]

// ─── Year options ─────────────────────────────────────────────────────────────
const currentYear   = new Date().getFullYear()
const JOINING_YEARS = Array.from({ length: currentYear - 2010 + 1 }, (_, i) => currentYear - i)

// ─── Column definitions ───────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: 'sl',               label: 'SL',               default: true,  locked: true },
  { key: 'name',             label: 'Name',             default: true,  locked: true },
  { key: 'employee_id',      label: 'Emp ID',           default: true               },
  { key: 'designation',      label: 'Designation',      default: true               },
  { key: 'department',       label: 'Department',       default: true               },
  { key: 'joining_date',     label: 'Joining Date',     default: true               },
  { key: 'type',             label: 'Line Type',        default: true               },
  { key: 'status',           label: 'Status',           default: true               },
  { key: 'company',          label: 'Company',          default: false              },
  { key: 'email',            label: 'Email',            default: false              },
  { key: 'phone',            label: 'Contact No.',      default: false              },
  { key: 'blood',            label: 'Blood Group',      default: false              },
  { key: 'date_of_birth',    label: 'Date of Birth',    default: false              },
  { key: 'employment_type',  label: 'Employment Type',  default: false              },
  { key: 'grade',            label: 'Grade',            default: false              },
  { key: 'last_working_date',label: 'Last Working Date',default: false              },
]

const columns      = ref(Object.fromEntries(ALL_COLUMNS.map(c => [c.key, c.default])))
const activeColumns = computed(() => ALL_COLUMNS.filter(c => columns.value[c.key]))

// ─── Quick preset cards ────────────────────────────────────────────────────────
const PRESETS = [
  {
    key: 'all',          label: 'Employee Master',   sub: 'All active employees',
    icon: 'far fa-users',          iconCls: 'bg-blue-50 text-blue-600',
    p: { line_type: 'all', status: 'active' },
  },
  {
    key: 'executive',    label: 'Executive List',    sub: 'Full executive profile',
    icon: 'far fa-user-tie',       iconCls: 'bg-violet-50 text-violet-600',
    p: { line_type: 'executive', status: 'active' },
  },
  {
    key: 'support_staff',label: 'Support Staff',     sub: 'MLSS, drivers, guards',
    icon: 'far fa-hard-hat',       iconCls: 'bg-orange-50 text-orange-600',
    p: { line_type: 'support_staff', status: 'active' },
  },
  {
    key: 'doctor',       label: 'Doctor List',       sub: 'Medical & health staff',
    icon: 'far fa-user-md',        iconCls: 'bg-red-50 text-red-600',
    p: { line_type: 'doctor', status: 'active' },
  },
  {
    key: 'academy_body', label: 'Academy Body',      sub: 'Academic staff',
    icon: 'far fa-graduation-cap', iconCls: 'bg-emerald-50 text-emerald-600',
    p: { line_type: 'academy_body', status: 'active' },
  },
  {
    key: 'year_joining', label: 'Year-wise Joining', sub: 'Joined in selected year',
    icon: 'far fa-calendar-plus',  iconCls: 'bg-indigo-50 text-indigo-600',
    p: { line_type: 'all', status: 'active' },
  },
  {
    key: 'blood',        label: 'Blood Group Dir.',  sub: 'Emergency contact sheet',
    icon: 'far fa-tint',           iconCls: 'bg-rose-50 text-rose-600',
    p: { line_type: 'all', status: 'active', has_blood: true },
  },
  {
    key: 'offboarding',  label: 'Offboarding Report',sub: 'Exited employees',
    icon: 'far fa-sign-out-alt',   iconCls: 'bg-amber-50 text-amber-600',
    p: { line_type: 'all', status: 'inactive' },
  },
]

const presetYearJoining = ref(String(currentYear))
const activePresetKey = ref('')

// Badge count per preset from summary API
function presetBadge(preset) {
  if (!summary.value) return null
  const s = summary.value
  switch (preset.key) {
    case 'all':          return s.active
    case 'executive':    return s.by_type?.executive    ?? null
    case 'support_staff':return s.by_type?.support_staff ?? null
    case 'doctor':       return s.by_type?.doctor       ?? null
    case 'academy_body': return s.by_type?.academy_body ?? null
    case 'year_joining':
      return presetYearJoining.value
        ? s.joined_by_year?.[presetYearJoining.value] ?? 0
        : s.joined_this_year ?? null
    case 'offboarding':  return s.resigned_this_year    ?? null
    default:             return null
  }
}

// ─── KPI strip ────────────────────────────────────────────────────────────────
const yr = String(currentYear).slice(-2)
const kpiItems = computed(() => {
  if (!summary.value) return []
  const s = summary.value
  return [
    { label: 'Active Total',  value: s.active,                        cls: 'text-slate-800'  },
    { label: 'Executives',    value: s.by_type?.executive    ?? '—',  cls: 'text-slate-800'  },
    { label: 'Support Staff', value: s.by_type?.support_staff ?? '—', cls: 'text-slate-800'  },
    { label: 'Doctors',       value: s.by_type?.doctor       ?? '—',  cls: 'text-slate-800'  },
    { label: `Resigned '${yr}`,value: s.resigned_this_year,           cls: 'text-amber-600'  },
    { label: `Joined '${yr}`, value: s.joined_this_year,              cls: 'text-emerald-600'},
  ]
})

// ─── Cell value ───────────────────────────────────────────────────────────────
function cellValue(row, key, idx) {
  switch (key) {
    case 'sl':               return idx + 1
    case 'name':             return row.name                 ?? '—'
    case 'employee_id':      return row.employee_id          ?? '—'
    case 'designation':      return row.designation?.title   ?? '—'
    case 'department':       return row.department?.name     ?? '—'
    case 'joining_date':     return row.joining_date         ?? '—'
    case 'type':             return row.type                 ?? '—'
    case 'status':           return row.is_active ? 'Active' : 'Inactive'
    case 'company':          return row.company?.name        ?? '—'
    case 'email':            return row.email                ?? '—'
    case 'phone':            return row.phone                ?? '—'
    case 'blood':            return row.blood                ?? '—'
    case 'date_of_birth':    return row.date_of_birth        ?? '—'
    case 'employment_type':  return row.employment_type      ?? '—'
    case 'grade':            return row.designation?.grade   ?? '—'
    case 'last_working_date':return row.last_working_date    ?? '—'
    default:                 return '—'
  }
}

// ─── Build API params ─────────────────────────────────────────────────────────
function buildParams() {
  const p = {
    sort_by:  sortBy.value,
    sort_dir: sortDir.value,
  }
  const lt = filterLineType.value
  if (lt && lt !== 'all') p.line_type = lt

  const cos = filterCompanyIds.value
  if (cos.length === 1)      p.company_id  = cos[0]
  else if (cos.length > 1)   p.company_ids = cos

  const dps = filterDepartmentIds.value
  if (dps.length === 1)      p.department_id  = dps[0]
  else if (dps.length > 1)   p.department_ids = dps

  const st = filterStatus.value
  if (st) p.status = st

  const q = filterSearch.value
  if (q) p.q = q

  const jy = filterJoiningYear.value
  if (jy) p.joining_year = jy

  if (filterHasBlood.value) p.has_blood = 1

  return p
}

// ─── Debounced preview ────────────────────────────────────────────────────────
let previewTimer = null
function schedulePreview() {
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(() => userStore.fetchUsers(buildParams()), 200)
}

function handleFilterChange({ company_ids, department_ids }) {
  filterCompanyIds.value    = company_ids    || []
  filterDepartmentIds.value = department_ids || []
  schedulePreview()
}

// ─── Preset actions ───────────────────────────────────────────────────────────
function applyPreset(preset) {
  activePresetKey.value    = preset.key
  filterLineType.value    = preset.p.line_type
  filterStatus.value      = preset.p.status
  filterJoiningYear.value = preset.key === 'year_joining' ? presetYearJoining.value : ''
  filterHasBlood.value    = !!preset.p.has_blood
  if (preset.key === 'blood') columns.value.blood = true
  schedulePreview()
}

async function downloadPreset(preset) {
  if (!canExportReports.value) return
  const params = {
    sort_by: sortBy.value,
    sort_dir: sortDir.value,
  }
  if (preset.p.line_type && preset.p.line_type !== 'all') params.line_type = preset.p.line_type
  if (preset.p.status)   params.status    = preset.p.status
  if (preset.key === 'year_joining' && presetYearJoining.value) params.joining_year = presetYearJoining.value
  if (preset.p.has_blood) params.has_blood = 1
  await empStore.downloadUsersExcel(params, `${preset.key}-report.xlsx`)
}

// ─── Client-side exports ──────────────────────────────────────────────────────
function getExportRows() {
  return users.value.map((row, idx) =>
    activeColumns.value.map(col => {
      const v = cellValue(row, col.key, idx)
      return typeof v === 'string' || typeof v === 'number' ? v : String(v)
    })
  )
}

function downloadCustomExcel() {
  if (!canExportReports.value) return
  const headers = activeColumns.value.map(c => c.label)
  const rows    = getExportRows()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = headers.map((h, ci) => ({
    wch: Math.max(h.length, ...rows.map(r => String(r[ci] ?? '').length), 10),
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Report')
  XLSX.writeFile(wb, 'employee-report.xlsx')
}

function downloadCustomPDF() {
  if (!canExportReports.value) return
  const landscape = activeColumns.value.length > 7
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'pt', format: 'A4' })
  autoTable(doc, {
    head: [activeColumns.value.map(c => c.label)],
    body: getExportRows(),
    styles:             { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
    headStyles:         { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 40 },
    didDrawPage(data) {
      doc.setFontSize(9); doc.setTextColor(100)
      doc.text('Employee Report', data.settings.margin.left, 28)
      doc.text(new Date().toLocaleDateString(), doc.internal.pageSize.width - 80, 28)
    },
  })
  doc.save('employee-report.pdf')
}

function printTable() { window.print() }

function toggleColumn(col) {
  if (!col.locked) columns.value[col.key] = !columns.value[col.key]
}

// ─── Watchers ─────────────────────────────────────────────────────────────────
watch(filterStatus,      schedulePreview)
watch(filterJoiningYear, schedulePreview)
watch(filterHasBlood,    schedulePreview)
watch(filterSearch,      schedulePreview)
watch(sortBy,            schedulePreview)
watch(sortDir,           schedulePreview)
watch(presetYearJoining, (year) => {
  if (activePresetKey.value !== 'year_joining') return
  filterJoiningYear.value = year || ''
})

// ─── Mount ────────────────────────────────────────────────────────────────────
onMounted(() => {
  empStore.fetchSummary()
  userStore.fetchUsers(buildParams())
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 px-3 py-3 text-slate-800 md:px-5 print:bg-white print:p-0">

    <!-- ── Page header + KPI strip ──────────────────────────────────────── -->
    <section class="mb-3 rounded-md border border-slate-200 bg-white shadow-sm print:hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div class="min-w-0">
          <div class="text-[10px] font-bold uppercase tracking-[0.24em] text-blue-700">EmpManage</div>
          <h1 class="mt-0.5 text-xl font-semibold leading-tight text-slate-950">Reports &amp; Lists</h1>
          <p class="mt-1 text-xs text-slate-500">Filter, preview and export HR data — Excel, PDF, Print.</p>
        </div>
        <RouterLink
          :to="{ name: 'EmployeeManagementView' }"
          class="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <i class="far fa-arrow-left"></i> EmpManage
        </RouterLink>
      </div>

      <!-- KPI strip -->
      <div v-if="isLoadingSummary" class="flex items-center gap-2 px-4 py-2.5 text-xs text-slate-400">
        <i class="far fa-spinner fa-spin"></i> Loading summary…
      </div>
      <div
        v-else-if="kpiItems.length"
        class="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:grid-cols-6"
      >
        <div v-for="item in kpiItems" :key="item.label" class="px-4 py-2.5">
          <div class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{{ item.label }}</div>
          <div class="mt-0.5 text-lg font-bold leading-tight" :class="item.cls">
            {{ typeof item.value === 'number' ? item.value.toLocaleString() : item.value }}
          </div>
        </div>
      </div>
    </section>

    <!-- ── Quick preset cards (PDF-style) ───────────────────────────────── -->
    <section class="mb-3 rounded-md border border-slate-200 bg-white shadow-sm print:hidden">
      <div class="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <h2 class="text-sm font-semibold text-slate-950">One-click Reports</h2>
        <span class="text-[11px] text-slate-400">Pre-built from your Manpower sheets</span>
      </div>

      <div class="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="preset in PRESETS"
          :key="preset.key"
          class="rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
        >
          <!-- Icon + badge row -->
          <div class="mb-3 flex items-start justify-between gap-2">
            <span
              class="flex h-10 w-10 items-center justify-center rounded-md text-base"
              :class="preset.iconCls"
            >
              <i :class="preset.icon"></i>
            </span>
            <span class="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              <template v-if="presetBadge(preset) !== null">
                {{ presetBadge(preset).toLocaleString() }}
              </template>
              <template v-else-if="isLoadingSummary">
                <i class="far fa-spinner fa-spin"></i>
              </template>
              <template v-else>—</template>
            </span>
          </div>

          <!-- Title + sub -->
          <div class="mb-1 text-sm font-semibold text-slate-900">{{ preset.label }}</div>
          <div class="mb-3 text-[11px] leading-4 text-slate-500">{{ preset.sub }}</div>

          <!-- Year selector (year_joining only) -->
          <div v-if="preset.key === 'year_joining'" class="mb-2">
            <select
              v-model="presetYearJoining"
              class="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="">All Years</option>
              <option v-for="y in JOINING_YEARS" :key="y" :value="String(y)">{{ y }}</option>
            </select>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <button
              v-if="canExportReports"
              class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-blue-600 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              @click="downloadPreset(preset)"
            >
              <i class="far fa-file-excel"></i> Excel
            </button>
            <button
              class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-200 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
              @click="applyPreset(preset)"
            >
              Preview ↓
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Custom report builder ─────────────────────────────────────────── -->
    <section class="rounded-md border border-slate-200 bg-white shadow-sm">

      <!-- Header: single-line title + scope + line type filters -->
      <div class="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2 print:hidden">
        <h2 class="shrink-0 text-sm font-semibold text-slate-950">Custom Report Builder</h2>
        <span class="shrink-0 text-slate-200">|</span>
        <EmpReportMultiFilter
          :company-ids="filterCompanyIds"
          :department-ids="filterDepartmentIds"
          :horizontal="true"
          class="flex-1"
          @change="handleFilterChange"
        />
        <select
          v-model="filterLineType"
          class="h-8 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="all">All Types</option>
          <option value="executive">Executive</option>
          <option value="support_staff">Support Staff</option>
          <option value="doctor">Doctor</option>
          <option value="academy_body">Academy Body</option>
        </select>
        <select
          v-model="filterStatus"
          class="h-8 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="">All Status</option>
        </select>
        <select
          v-model="filterJoiningYear"
          class="h-8 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="">All Years</option>
          <option v-for="y in JOINING_YEARS" :key="y" :value="String(y)">{{ y }}</option>
        </select>
        <span class="shrink-0 text-[11px] text-slate-400">Column toggles · Excel · PDF · Print</span>
      </div>

      <div class="flex min-h-0 flex-col md:flex-row md:divide-x md:divide-slate-100">

        <!-- Left: filters + column toggles -->
        <div class="w-full shrink-0 space-y-4 overflow-y-auto border-b border-slate-100 p-3 md:w-56 md:border-b-0 xl:w-64 print:hidden">

          <!-- Sorting -->
          <div class="space-y-2 rounded-md border border-slate-100 bg-slate-50 p-2">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sorting</div>
            <div>
              <label class="mb-0.5 block text-[11px] text-slate-500">Sort By</label>
              <select
                v-model="sortBy"
                class="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option v-for="option in SORT_OPTIONS" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="mb-0.5 block text-[11px] text-slate-500">Direction</label>
              <select
                v-model="sortDir"
                class="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>

          <!-- Search -->
          <div>
            <label class="mb-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <i class="far fa-search text-blue-400"></i>
              Search
            </label>
            <div class="flex gap-1">
              <input
                v-model="filterSearch"
                type="text"
                placeholder="Name / ID…"
                class="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                @keyup.enter="schedulePreview"
              />
              <button
                class="rounded-md bg-blue-600 px-2 py-1.5 text-xs text-white hover:bg-blue-700"
                @click="schedulePreview"
              >
                <i class="far fa-search"></i>
              </button>
            </div>
          </div>

          <!-- Column toggles -->
          <div class="space-y-0.5">
            <div class="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Columns</div>
            <div
              v-for="col in ALL_COLUMNS"
              :key="col.key"
              class="flex items-center justify-between gap-2 rounded px-1 py-0.5 hover:bg-slate-50"
            >
              <span class="text-[11px] text-slate-700">{{ col.label }}</span>
              <button
                :disabled="col.locked"
                class="relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40"
                :class="columns[col.key] ? 'bg-blue-600' : 'bg-slate-200'"
                @click="toggleColumn(col)"
              >
                <span
                  class="inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform"
                  :class="columns[col.key] ? 'translate-x-3.5' : 'translate-x-0.5'"
                ></span>
              </button>
            </div>
          </div>
        </div>

        <!-- Right: toolbar + table -->
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 print:hidden">
            <div class="text-xs text-slate-500">
              <span class="font-semibold text-slate-900">Preview</span>
              · {{ users.length.toLocaleString() }} rows · {{ activeColumns.length }} columns
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-if="canExportReports"
                class="inline-flex items-center gap-1.5 rounded bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700"
                @click="downloadCustomExcel"
              >
                <i class="far fa-file-excel"></i> Excel
              </button>
              <button
                v-if="canExportReports"
                class="inline-flex items-center gap-1.5 rounded bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700"
                @click="downloadCustomPDF"
              >
                <i class="far fa-file-pdf"></i> PDF
              </button>
              <button
                class="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                @click="printTable"
              >
                <i class="far fa-print"></i> Print
              </button>
            </div>
          </div>

          <!-- Print title -->
          <div class="hidden px-4 py-3 print:block">
            <div class="text-xs font-bold text-slate-800">Employee Report</div>
            <div class="text-[10px] text-slate-500">{{ new Date().toLocaleDateString() }}</div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="w-full min-w-max border-collapse text-xs">
              <thead>
                <tr class="border-b border-slate-200 bg-slate-50">
                  <th
                    v-for="col in activeColumns"
                    :key="col.key"
                    class="whitespace-nowrap px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500"
                  >
                    {{ col.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="isLoading">
                  <td :colspan="activeColumns.length" class="px-3 py-8 text-center text-slate-400">
                    <i class="far fa-spinner fa-spin mr-2"></i> Loading…
                  </td>
                </tr>
                <tr v-else-if="!users.length">
                  <td :colspan="activeColumns.length" class="px-3 py-8 text-center text-slate-400">
                    No records found.
                  </td>
                </tr>
                <template v-else>
                  <tr
                    v-for="(row, idx) in users"
                    :key="row.id"
                    class="border-b border-slate-100 hover:bg-blue-50/30"
                    :class="idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'"
                  >
                    <td
                      v-for="col in activeColumns"
                      :key="col.key"
                      class="whitespace-nowrap px-3 py-1.5"
                      :class="{
                        'font-medium text-slate-900': col.key === 'name',
                        'text-slate-400':             col.key === 'sl',
                      }"
                    >
                      <template v-if="col.key === 'status'">
                        <span
                          class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                          :class="row.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'"
                        >
                          {{ row.is_active ? 'Active' : 'Inactive' }}
                        </span>
                      </template>
                      <template v-else>{{ cellValue(row, col.key, idx) }}</template>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
@media print {
  .print\:hidden { display: none !important; }
  .print\:block  { display: block !important; }
  section { border: none !important; box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; }
  table { font-size: 9pt !important; }
  th, td { padding: 4pt 6pt !important; }
  thead tr { background: #1e3a8a !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
