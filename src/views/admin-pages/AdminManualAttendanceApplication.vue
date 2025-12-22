<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import SelectedEmployeeCard from '@/components/user/SelectedEmployeeCard.vue'
import { useManualAttendanceStore } from '@/stores/manual-attendance'
import { useUserStore } from '@/stores/user'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const manualAttendanceStore = useManualAttendanceStore()
const userStore = useUserStore()

const initialMonth =
  route.query.date ||
  manualAttendanceStore.selectedMonth ||
  new Date().toISOString().slice(0, 7)

const selectedMonth = ref(initialMonth)
const forms = ref([])
const loading = ref(false)
const error = ref(null)
const directApprove = ref(true)

// ---- Filters ----
const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || '',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '',
})

const pad = (value) => value.toString().padStart(2, '0')
const period = ref({
  year: Number(initialMonth.split('-')[0] || new Date().getFullYear()),
  month: Number(initialMonth.split('-')[1] || new Date().getMonth() + 1),
  day: 1,
})
const periodMonth = computed(() => {
  if (!period.value?.year || !period.value?.month) return ''
  return `${period.value.year}-${pad(period.value.month)}`
})

// ---------- Fetch ----------
const fetchManualAttendancesByUser = async () => {
  const payload = {
    company_id: filters.value.company_id,
    department_id: filters.value.department_id,
    line_type: filters.value.line_type,
    selectedMonth: selectedMonth.value,
    selectedStatus: manualAttendanceStore.selectedStatus,
  }

  if (filters.value.employee_id) {
    payload.user_id = filters.value.employee_id
    loading.value = true
    try {
      await manualAttendanceStore.fetchAdminManualAttendances(payload)
    } finally {
      loading.value = false
    }
  } else {
    if (typeof manualAttendanceStore.setAttendances === 'function') {
      manualAttendanceStore.setAttendances([])
    } else {
      manualAttendanceStore.attendances = []
    }
  }
}

// ---------- URL sync ----------
function buildQuery() {
  const q = {}
  if (selectedMonth.value) q.date = String(selectedMonth.value)
  if (filters.value.company_id) q.company_id = String(filters.value.company_id)
  if (filters.value.department_id) q.department_id = String(filters.value.department_id)
  if (filters.value.line_type && filters.value.line_type !== 'all') q.line_type = String(filters.value.line_type)
  if (filters.value.employee_id) q.employee_id = String(filters.value.employee_id)
  return q
}

let qTimer = null
function syncQueryDebounced() {
  if (qTimer) clearTimeout(qTimer)
  qTimer = setTimeout(() => {
    router.replace({ query: buildQuery() }).catch(() => {})
  }, 120)
}

// ---------- Debounced apply ----------
let applyTimer = null
const lastKey = ref('')

async function runApply() {
  syncQueryDebounced()

  const key = JSON.stringify({
    m: selectedMonth.value || '',
    c: filters.value.company_id || '',
    d: filters.value.department_id || '',
    t: filters.value.line_type || 'all',
    e: filters.value.employee_id || '',
  })
  if (key !== lastKey.value) {
    await fetchManualAttendancesByUser()
    lastKey.value = key
  }
}
function scheduleApply() {
  if (applyTimer) clearTimeout(applyTimer)
  applyTimer = setTimeout(runApply, 200)
}

// ---------- Lifecycle ----------
onMounted(async () => {
  await userStore.fetchUsers()
  scheduleApply()
})

function handleFilterChange() {
  scheduleApply()
}

function goBack() {
  router.go(-1)
}

watch(periodMonth, () => {
  selectedMonth.value = periodMonth.value
  scheduleApply()
})

watch(
  () => ({ ...filters.value, month: periodMonth.value }),
  () => scheduleApply(),
  { deep: true }
)

// ---------- Derived ----------
const filteredAttendances = computed(() => manualAttendanceStore.attendances || [])
const selectedFormsCount = computed(() => forms.value.filter((f) => f.is_check).length)
const canSubmitForms = computed(() => !!filters.value.employee_id && selectedFormsCount.value > 0)
const hasEmployeeSelected = computed(() => !!filters.value.employee_id)
const totalRows = computed(() => forms.value.length)

const normalizeDateValue = (value) => {
  if (!value) return ''
  if (typeof value === 'string') {
    const tIndex = value.indexOf('T')
    if (tIndex > -1) return value.slice(0, tIndex)
    return value.slice(0, 10)
  }
  try {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10)
    }
  } catch (_err) {}
  return ''
}

const normalizeTimeValue = (value) => {
  if (!value) return ''
  if (typeof value === 'string') {
    const tIndex = value.indexOf('T')
    if (tIndex > -1 && value.length >= tIndex + 9) {
      return value.slice(tIndex + 1, tIndex + 6)
    }
    return value.slice(0, 5)
  }
  try {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      const hours = String(date.getHours()).padStart(2, '0')
      const mins = String(date.getMinutes()).padStart(2, '0')
      return `${hours}:${mins}`
    }
  } catch (_err) {}
  return ''
}

const sortAttendancesByDate = (items) => {
  return [...(items || [])].sort((a, b) => {
    const da = new Date(a?.date || a?.created_at || null)
    const db = new Date(b?.date || b?.created_at || null)
    return (da.getTime() || 0) - (db.getTime() || 0)
  })
}

watch(
  () => manualAttendanceStore.attendances,
  (rows) => {
    forms.value = []
    const sortedRows = sortAttendancesByDate(rows)
    sortedRows.forEach((attendance) => {
      forms.value.push({
        date: normalizeDateValue(attendance?.date),
        type: 'Forget Punch',
        check_in: normalizeTimeValue(attendance?.entry_time),
        check_out: normalizeTimeValue(attendance?.exit_time),
        description: '',
        is_check: false,
      })
    })
  },
  { immediate: true, deep: true }
)

// ---------- UI Actions ----------
function toggleSelectAll() {
  const allSelected = forms.value.length > 0 && forms.value.every((f) => f.is_check)
  forms.value.forEach((f) => { f.is_check = !allSelected })
}

function toggleRowSelection(row) {
  row.is_check = !row.is_check
}

async function submitManualAttendance() {
  loading.value = true
  error.value = null

  if (!filters.value.employee_id) {
    error.value = 'Please select an employee.'
    loading.value = false
    return
  }
  try {
    const selectedForms = forms.value.filter((f) => f.is_check && (f.check_in || f.check_out))
    if (!selectedForms.length) {
      error.value = 'Please select at least one row and fill Check-In/Check-Out time.'
      return
    }
    const payload = selectedForms.map((f) => ({
      user_id: filters.value.employee_id,
      type: f.type,
      check_in: f.check_in ? `${f.date} ${f.check_in}:00` : null,
      check_out: f.check_out ? `${f.date} ${f.check_out}:00` : null,
      description: f.description || ''
    }))

    const res = await manualAttendanceStore.createBulkManualAttendance({
      records: payload,
      direct_approve: directApprove.value,
    })
    if (res?.data?.length) await fetchManualAttendancesByUser()
  } catch (err) {
    error.value = err?.message || 'Failed to submit manual attendance requests.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-4 space-y-4">
    <!-- Top bar -->
    <div class="flex items-center justify-between gap-2">
      <button
        class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
        @click="goBack"
      >
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:inline">Back</span>
      </button>

      <div class="flex flex-col items-center text-center">
        <h1 class="text-base md:text-lg font-semibold text-slate-900">
          Admin Bulk Manual Attendance
        </h1>
        <p class="text-[11px] md:text-xs text-slate-500">
          Create multiple manual records for a single employee within a selected month
        </p>
      </div>

      <!-- Right side placeholder for future actions -->
      <div class="w-[80px] md:w-[120px]"></div>
    </div>

    <!-- Filters + Period -->
    <section class="p-3 rounded-2xl border border-white/20
         bg-white/60 backdrop-blur-md shadow-sm
         supports-[backdrop-filter]:bg-white/50 sticky top-14 z-50">
      <div class="flex items-center justify-between gap-2 mb-3">
        <div class="flex flex-col">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Filters
          </span>
          <span class="text-[11px] text-slate-400">
            Select company, department & employee, then choose the month
          </span>
        </div>
        <div class="flex items-center gap-2 text-xs text-slate-500">
          <span
            class="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-amber-700"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            Required: Employee & Month
          </span>
        </div>
      </div>

      <div class="flex flex-wrap gap-3 items-start">
        <EmployeeFilter
          v-model:company_id="filters.company_id"
          v-model:department_id="filters.department_id"
          v-model:employee_id="filters.employee_id"
          v-model:line_type="filters.line_type"
          :with-type="true"
          :initial-value="$route.query"
          @filter-change="handleFilterChange"
        >
          <div>
            <label for="" class="top-label -top-1">Month</label>
            <FlexibleDatePicker
              v-model="period"
              :show-year="false"
              :show-month="true"
              :show-date="false"
            />
          </div>
        </EmployeeFilter>
      </div>
    </section>

    <!-- Loader -->
    <div v-if="manualAttendanceStore.loading" class="py-8">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <!-- Employee summary -->
      <section v-if="hasEmployeeSelected" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectedEmployeeCard :user="manualAttendanceStore.user" />

        <div class="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col justify-between gap-3">
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Summary
              </span>
              <span
                class="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700"
              >
                Month: <span class="font-semibold">{{ selectedMonth }}</span>
              </span>
            </div>

            <div class="grid grid-cols-3 gap-3 mt-1 text-xs text-slate-600">
              <div class="flex flex-col gap-0.5">
                <span class="text-slate-500">Total rows</span>
                <span class="text-sm font-semibold text-slate-900">{{ totalRows }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-slate-500">Selected rows</span>
                <span class="text-sm font-semibold text-emerald-700">
                  {{ selectedFormsCount }}
                </span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-slate-500">Direct approve</span>
                <span class="text-sm font-semibold">
                  <span v-if="directApprove" class="text-emerald-700">Yes</span>
                  <span v-else class="text-slate-600">No (goes for approval)</span>
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
            <label
              for="directApprove"
              class="flex items-center gap-2 text-xs md:text-sm text-slate-700 cursor-pointer"
            >
              <input
                id="directApprove"
                type="checkbox"
                v-model="directApprove"
                class="h-4 w-4 accent-emerald-600 rounded cursor-pointer"
              />
              <span>Approve immediately without extra review</span>
            </label>
          </div>
        </div>
      </section>

      <!-- Main table Card -->
      <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div class="flex flex-col">
            <span class="text-sm font-semibold text-slate-800">
              Manual Attendance Rows
            </span>
            <span class="text-[11px] text-slate-500">
              Select the rows you want to send and optionally edit type / time / description.
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span
              class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Selected: <span class="font-semibold text-emerald-700">{{ selectedFormsCount }}</span>
            </span>
            <span class="hidden md:inline text-slate-400">
              Click the row or checkbox to (de)select
            </span>
          </div>
        </header>

        <div class="px-4 pt-3">
          <transition name="fade">
            <div v-if="error" class="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
              {{ error }}
            </div>
          </transition>
        </div>

        <div class="min-h-[220px]">
          <table
            v-if="forms.length"
            class="min-w-full table-fixed border-separate border-spacing-0 text-sm"
          >
            <thead>
              <tr class="bg-slate-50 text-slate-700 sticky top-40 z-50">
                <th
                  class="sticky top-0 z-10 w-[80px] border-b border-slate-200 px-2 py-2 text-center text-xs font-medium"
                >
                  <div class="inline-flex items-center gap-2">
                    <input
                      id="allCheck"
                      type="checkbox"
                      @change="toggleSelectAll"
                      class="h-4 w-4 cursor-pointer accent-indigo-600"
                    />
                    <label
                      for="allCheck"
                      class="cursor-pointer text-[11px] font-medium text-slate-700"
                    >
                      Select all
                    </label>
                  </div>
                </th>
                <th class="sticky top-0 z-10 border-b border-slate-200 px-2 py-2 text-left text-xs font-medium">
                  Date
                </th>
                <th class="sticky top-0 z-10 border-b border-slate-200 px-2 py-2 text-left text-xs font-medium">
                  Type
                </th>
                <th class="sticky top-0 z-10 border-b border-slate-200 px-2 py-2 text-left text-xs font-medium">
                  Check-In
                </th>
                <th class="sticky top-0 z-10 border-b border-slate-200 px-2 py-2 text-left text-xs font-medium">
                  Check-Out
                </th>
                <th class="sticky top-0 z-10 border-b border-slate-200 px-2 py-2 text-left text-xs font-medium">
                  Description
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(form, index) in forms"
                :key="index"
                @click="toggleRowSelection(form)"
                :class="[
                  'border-b border-slate-100 transition-colors',
                  form.is_check
                    ? 'bg-amber-50 hover:bg-amber-100'
                    : 'bg-white hover:bg-slate-50',
                ]"
              >
                <td class="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    v-model="form.is_check"
                    class="h-4 w-4 cursor-pointer accent-indigo-600"
                    @click.stop
                  />
                </td>

                <td class="px-2 py-2">
                  <input
                    type="date"
                    v-model="form.date"
                    class="w-full rounded-md border px-2 py-1 text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-200
                           disabled:bg-slate-100 disabled:text-slate-400"
                    @click.stop
                    :disabled="!form.is_check"
                  />
                </td>

                <td class="px-2 py-2">
                  <select
                    v-model="form.type"
                    class="w-full rounded-md border px-2 py-1 text-sm bg-white
                           focus:outline-none focus:ring-2 focus:ring-indigo-200
                           disabled:bg-slate-100 disabled:text-slate-400"
                    @click.stop
                    :disabled="!form.is_check"
                  >
                    <option value="">Select Type</option>
                    <option value="Home Office">Home Office</option>
                    <option value="Remote Work">Remote Work</option>
                    <option value="Forget Punch">Forget Punch</option>
                  </select>
                </td>

                <td class="px-2 py-2">
                  <input
                    type="time"
                    v-model="form.check_in"
                    class="w-full rounded-md border px-2 py-1 text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-200
                           disabled:bg-slate-100 disabled:text-slate-400"
                    @click.stop
                    :disabled="!form.is_check"
                  />
                </td>

                <td class="px-2 py-2">
                  <input
                    type="time"
                    v-model="form.check_out"
                    class="w-full rounded-md border px-2 py-1 text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-200
                           disabled:bg-slate-100 disabled:text-slate-400"
                    @click.stop
                    :disabled="!form.is_check"
                  />
                </td>

                <td class="px-2 py-2">
                  <textarea
                    v-model="form.description"
                    @keyup.stop
                    @click.stop
                    :disabled="!form.is_check"
                    class="w-full rounded-md border px-2 py-1 text-sm resize-none
                           focus:outline-none focus:ring-2 focus:ring-indigo-200
                           disabled:bg-slate-100 disabled:text-slate-400"
                    rows="2"
                  ></textarea>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty state -->
          <div
            v-else
            class="flex min-h-[180px] flex-col items-center justify-center gap-2 text-center"
          >
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400"
            >
              <i class="far fa-calendar-times"></i>
            </div>
            <p class="text-sm font-medium text-slate-700">
              No manual attendance rows available
            </p>
            <p class="text-xs text-slate-500 max-w-sm">
              Please select a company, department, employee and month. 
              Existing attendance dates for the month will appear here.
            </p>
          </div>
        </div>

        <!-- Footer actions -->
        <footer
          class="flex flex-col md:flex-row items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 bg-slate-50/60"
        >
          <div class="text-xs md:text-sm text-slate-600">
            Selected
            <span class="font-semibold text-slate-900">{{ selectedFormsCount }}</span>
            of
            <span class="font-semibold text-slate-900">{{ totalRows }}</span> row(s)
            <span class="text-slate-400"> · Only selected rows with time will be submitted</span>
          </div>

          <div class="flex items-center gap-3">
            <p
              v-if="!hasEmployeeSelected"
              class="text-xs text-red-500"
            >
              Select an employee to enable submission.
            </p>

            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-300"
              :disabled="loading || !canSubmitForms"
              @click="submitManualAttendance"
            >
              <span v-if="loading">
                <i class="fas fa-spinner fa-spin mr-2"></i> Submitting...
              </span>
              <span v-else>
                Submit {{ selectedFormsCount || 0 }} row(s)
              </span>
            </button>
          </div>
        </footer>
      </section>
    </div>
  </div>
</template>

