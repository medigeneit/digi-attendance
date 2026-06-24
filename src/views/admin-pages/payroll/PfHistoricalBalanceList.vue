<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { usePfHistoricalBalanceStore } from '@/stores/pfHistoricalBalance'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import { formatCurrency } from '@/utils/currency'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'

const toast     = useToast()
const store     = usePfHistoricalBalanceStore()
const userStore = useUserStore()
const authStore = useAuthStore()
const { records, meta, loading, saving, error } = storeToRefs(store)

const canManage = computed(() => authStore.canFeature('pf.manage'))

// ── Filters ────────────────────────────────────────────────────────────────
const filters = ref({ company_id: '', department_id: '', line_type: 'all', user_id: '', year: '', page: 1, per_page: 20 })
const showFilters = ref(false)

const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 15 }, (_, i) => String(currentYear - i))

const load = () => {
  const p = { ...filters.value }
  if (!p.user_id)       delete p.user_id
  if (!p.year)          delete p.year
  if (!p.company_id)    delete p.company_id
  if (!p.department_id) delete p.department_id
  if (p.line_type === 'all') delete p.line_type
  store.fetchRecords(p)
}

onMounted(() => {
  load()
  userStore.fetchTypeWiseEmployees({ status: 'active' })
})

const onFilterChange = (payload) => {
  filters.value = {
    ...filters.value,
    company_id:    payload.company_id    || '',
    department_id: payload.department_id || '',
    line_type:     payload.line_type     || 'all',
    user_id:       payload.employee_id   || '',
    page: 1,
  }
  load()
}
const resetFilters = () => {
  filters.value = { company_id: '', department_id: '', line_type: 'all', user_id: '', year: '', page: 1, per_page: 20 }
  load()
}
const pageChanged = (page) => { filters.value.page = page; load() }

// ── Totals (filtered employee) ────────────────────────────────────────────
const totals = computed(() => {
  const emp  = records.value.reduce((s, r) => s + parseFloat(r.employee_amount || 0), 0)
  const empr = records.value.reduce((s, r) => s + parseFloat(r.employer_amount || 0), 0)
  return { employee: emp, employer: empr, total: emp + empr }
})

// ── Source label ───────────────────────────────────────────────────────────
const SOURCE_OPTIONS = [
  { value: 'manual',            label: 'Manual' },
  { value: 'accounts_register', label: 'Accounts Register' },
  { value: 'excel',             label: 'Excel' },
  { value: 'estimated',         label: 'Estimated' },
]
const sourceLabel = (v) => SOURCE_OPTIONS.find(s => s.value === v)?.label || v || '—'

// ── Add / Edit Modal ───────────────────────────────────────────────────────
const showModal   = ref(false)
const editId      = ref(null)
const formErrors  = ref({})
const selectedEmp = ref(null)

const blankForm = () => ({
  user_id: '', year: currentYear,
  period_from: '', period_to: '',
  employee_amount: '', employer_amount: '',
  source: '', reference_no: '', note: '',
})
const form = ref(blankForm())

function openAdd() {
  editId.value      = null
  selectedEmp.value = null
  form.value        = blankForm()
  formErrors.value  = {}
  showModal.value   = true
}
function openEdit(rec) {
  editId.value      = rec.id
  selectedEmp.value = rec.user ? { id: rec.user.id, name: rec.user.name, employee_id: rec.user.employee_id } : null
  form.value = {
    user_id:         rec.user_id,
    year:            rec.year,
    period_from:     rec.period_from?.substring(0, 10) || '',
    period_to:       rec.period_to?.substring(0, 10)   || '',
    employee_amount: rec.employee_amount,
    employer_amount: rec.employer_amount,
    source:          rec.source || '',
    reference_no:    rec.reference_no || '',
    note:            rec.note || '',
  }
  formErrors.value = {}
  showModal.value  = true
}

const onEmpSelected = (emp) => {
  selectedEmp.value  = emp
  form.value.user_id = emp?.id || ''
}

async function save() {
  formErrors.value = {}
  if (!form.value.user_id)     { formErrors.value.user_id     = 'Employee is required.';        return }
  if (!form.value.period_from) { formErrors.value.period_from = 'Period from is required.';     return }
  if (!form.value.period_to)   { formErrors.value.period_to   = 'Period to is required.';       return }
  if (form.value.period_to < form.value.period_from) {
    formErrors.value.period_to = 'Must be on or after period from.'
    return
  }
  try {
    if (editId.value) {
      await store.updateRecord(editId.value, form.value)
      toast.success('Record updated.')
    } else {
      await store.createRecord(form.value)
      toast.success('Record created.')
    }
    showModal.value = false
    load()
  } catch (err) {
    const se = err?.response?.data?.errors || {}
    formErrors.value = Object.fromEntries(Object.entries(se).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]))
    if (!Object.keys(formErrors.value).length) toast.error(err?.response?.data?.message || 'Save failed.')
  }
}

// ── Delete ─────────────────────────────────────────────────────────────────
const deletingId = ref(null)
async function deleteEntry(rec) {
  if (!confirm(`Delete PF entry for ${rec.user?.name || '#' + rec.user_id} (${rec.period_from?.substring(0, 10)} – ${rec.period_to?.substring(0, 10)})?`)) return
  deletingId.value = rec.id
  try {
    await store.deleteRecord(rec.id)
    toast.success('Deleted.')
    load()
  } catch { toast.error('Delete failed.') }
  finally { deletingId.value = null }
}
</script>

<template>
  <div class="min-h-screen space-y-0 bg-slate-50">

    <!-- ── Sticky Toolbar ─────────────────────────────────────────────── -->
    <div class="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-2">

        <!-- Title -->
        <div class="flex min-w-0 items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-500">Payroll</span>
          <span class="text-slate-300">/</span>
          <span class="text-sm font-bold text-slate-800">PF Historical Balances</span>
          <svg v-if="loading" class="h-3.5 w-3.5 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            @click="showFilters = !showFilters"
          >
            <i class="far fa-filter text-[10px]"></i>
            Filter
            <i :class="['far text-[10px] ml-0.5', showFilters ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
          </button>
          <button
            v-if="canManage"
            type="button"
            class="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            @click="openAdd"
          >
            <i class="far fa-plus text-[10px]"></i>
            Add Entry
          </button>
        </div>
      </div>

      <!-- Collapsible filters -->
      <div v-if="showFilters" class="mt-2.5 space-y-2 border-t border-slate-100 pt-2.5">
        <EmployeeFilter
          :company_id="filters.company_id"
          :department_id="filters.department_id"
          :employee_id="filters.user_id"
          :line_type="filters.line_type"
          @filter-change="onFilterChange"
        >
          <div>
            <label class="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Year</label>
            <select
              v-model="filters.year"
              class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              @change="filters.page = 1; load()"
            >
              <option value="">All years</option>
              <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>
        </EmployeeFilter>
        <div class="flex justify-end">
          <button type="button" class="text-xs text-slate-400 transition hover:text-indigo-600" @click="resetFilters">
            <i class="far fa-undo mr-1"></i>Reset filters
          </button>
        </div>
      </div>
    </div>

    <!-- ── Totals strip (employee filter active) ──────────────────────── -->
    <div v-if="filters.user_id && records.length" class="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-4 py-2 text-[11px]">
      <span class="text-slate-500">
        Employee PF: <span class="font-bold font-mono text-slate-800">{{ formatCurrency(totals.employee) }}</span>
      </span>
      <span class="text-slate-300">|</span>
      <span class="text-slate-500">
        Employer PF: <span class="font-bold font-mono text-slate-800">{{ formatCurrency(totals.employer) }}</span>
      </span>
      <span class="text-slate-300">|</span>
      <span class="text-indigo-600 font-semibold">
        Total: <span class="font-mono">{{ formatCurrency(totals.total) }}</span>
      </span>
      <RouterLink
        :to="`/payroll/pf-statement/${filters.user_id}`"
        class="ml-auto inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-600 transition hover:bg-indigo-100"
      >
        <i class="far fa-file-alt text-[9px]"></i> Full Statement
      </RouterLink>
    </div>


    <!-- ── Table ──────────────────────────────────────────────────────── -->
    <div class="bg-white">

      <div class="flex items-center justify-between border-b border-slate-100 px-4 py-2">
        <span class="text-[11px] text-slate-400">{{ meta.total ?? records.length }} record(s)</span>
        <button
          type="button"
          class="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          :disabled="loading"
          @click="load"
        >
          <i :class="['far fa-sync-alt text-[10px]', loading ? 'animate-spin' : '']"></i>
        </button>
      </div>

      <div v-if="error" class="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">
        <i class="far fa-exclamation-circle mr-1"></i>{{ error }}
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full border-collapse text-xs">
          <thead>
            <tr class="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th class="w-8 border-b border-slate-200 px-3 py-2 text-center">#</th>
              <th class="border-b border-slate-200 px-3 py-2 text-left">Employee</th>
              <th class="border-b border-slate-200 px-3 py-2 text-center">Year</th>
              <th class="border-b border-slate-200 px-3 py-2 text-left">Period</th>
              <th class="border-b border-slate-200 px-3 py-2 text-right">Employee PF</th>
              <th class="border-b border-slate-200 px-3 py-2 text-right">Employer PF</th>
              <th class="border-b border-slate-200 px-3 py-2 text-right">Total</th>
              <th class="border-b border-slate-200 px-3 py-2 text-left">Source</th>
              <th class="border-b border-slate-200 px-3 py-2 text-left">Reference</th>
              <th class="w-16 border-b border-slate-200 px-3 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>

            <!-- Skeleton rows -->
            <template v-if="loading && !records.length">
              <tr v-for="i in 8" :key="`sk-${i}`" class="animate-pulse border-b border-slate-100">
                <td class="px-3 py-2.5 text-center"><div class="mx-auto h-3 w-4 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5">
                  <div class="h-3 w-28 rounded bg-slate-100"></div>
                  <div class="mt-1 h-2.5 w-16 rounded bg-slate-100"></div>
                </td>
                <td class="px-3 py-2.5 text-center"><div class="mx-auto h-3 w-10 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5"><div class="h-3 w-36 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5 text-right"><div class="ml-auto h-3 w-16 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5 text-right"><div class="ml-auto h-3 w-16 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5 text-right"><div class="ml-auto h-3 w-16 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5"><div class="h-4 w-16 rounded-full bg-slate-100"></div></td>
                <td class="px-3 py-2.5"><div class="h-3 w-20 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5">
                  <div class="mx-auto flex justify-center gap-1">
                    <div class="h-5 w-5 rounded bg-slate-100"></div>
                    <div class="h-5 w-5 rounded bg-slate-100"></div>
                  </div>
                </td>
              </tr>
            </template>

            <!-- Data rows -->
            <tr
              v-for="(rec, idx) in records"
              :key="rec.id"
              class="group border-b border-l-2 border-slate-100 border-l-indigo-200 bg-white transition hover:bg-indigo-50/20"
            >
              <td class="px-3 py-2 text-center font-mono text-[11px] text-slate-400">
                {{ (meta.page - 1) * meta.per_page + idx + 1 }}
              </td>
              <td class="px-3 py-2">
                <div class="font-semibold leading-tight text-slate-800">{{ rec.user?.name || `#${rec.user_id}` }}</div>
                <div class="mt-0.5 text-[10px] text-slate-400">{{ rec.user?.employee_id }}</div>
              </td>
              <td class="px-3 py-2 text-center">
                <span class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">{{ rec.year }}</span>
              </td>
              <td class="px-3 py-2 text-slate-600">
                {{ rec.period_from?.substring(0, 10) }}
                <span class="mx-1 text-slate-300">–</span>
                {{ rec.period_to?.substring(0, 10) }}
              </td>
              <td class="px-3 py-2 text-right font-mono text-slate-700">{{ formatCurrency(rec.employee_amount) }}</td>
              <td class="px-3 py-2 text-right font-mono text-slate-700">{{ formatCurrency(rec.employer_amount) }}</td>
              <td class="px-3 py-2 text-right font-mono font-bold text-slate-800">
                {{ formatCurrency(parseFloat(rec.employee_amount) + parseFloat(rec.employer_amount)) }}
              </td>
              <td class="px-3 py-2">
                <span class="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {{ sourceLabel(rec.source) }}
                </span>
              </td>
              <td class="max-w-[130px] truncate px-3 py-2 text-[11px] text-slate-500" :title="rec.reference_no">
                {{ rec.reference_no || '—' }}
              </td>
              <td class="px-3 py-2">
                <div class="flex items-center justify-center gap-1">
                  <button
                    v-if="canManage"
                    type="button"
                    title="Edit"
                    class="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-400 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                    @click="openEdit(rec)"
                  >
                    <i class="far fa-pencil text-[10px]"></i>
                  </button>
                  <button
                    v-if="canManage"
                    type="button"
                    title="Delete"
                    :disabled="deletingId === rec.id"
                    class="inline-flex h-6 w-6 items-center justify-center rounded border border-rose-100 text-rose-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                    @click="deleteEntry(rec)"
                  >
                    <i :class="['far text-[10px]', deletingId === rec.id ? 'fa-spinner fa-spin' : 'fa-trash-alt']"></i>
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="!loading && !records.length">
              <td colspan="10" class="py-16 text-center">
                <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                  <i class="far fa-inbox text-xl text-slate-300"></i>
                </div>
                <p class="mt-3 text-sm font-semibold text-slate-500">No records found</p>
                <p class="text-xs text-slate-400">Filter by employee or year to narrow results</p>
                <button
                  v-if="canManage"
                  type="button"
                  class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                  @click="openAdd"
                >
                  <i class="far fa-plus"></i> Add Entry
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="border-t border-slate-100 px-4 py-2.5">
        <PaginationBar
          :page="Number(meta.page)"
          :per-page="Number(meta.per_page)"
          :total="Number(meta.total || 0)"
          :last-page="Number(meta.last_page || 1)"
          @page-change="pageChanged"
        />
      </div>
    </div>

    <!-- ── Add / Edit Modal ───────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          @mousedown.self="showModal = false"
        >
          <div class="w-full max-w-lg rounded-xl bg-white shadow-2xl ring-1 ring-slate-200">

            <!-- Header -->
            <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p class="text-sm font-bold text-slate-900">{{ editId ? 'Edit' : 'Add' }} PF Historical Balance</p>
                <p class="text-[11px] text-slate-500">Pre-software provident fund record</p>
              </div>
              <button type="button" @click="showModal = false"
                class="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <i class="far fa-times text-xs"></i>
              </button>
            </div>

            <!-- Body -->
            <div class="max-h-[70vh] space-y-3.5 overflow-y-auto px-4 py-4">

              <!-- Employee -->
              <div>
                <MultiselectDropdown
                  :model-value="selectedEmp"
                  :options="userStore.users"
                  :multiple="false"
                  :required="false"
                  label="name"
                  labelPrefix="employee_id"
                  top-label="Employee"
                  placeholder="Search employee..."
                  @update:modelValue="onEmpSelected"
                />
                <p v-if="formErrors.user_id" class="mt-1 text-[11px] text-rose-600">{{ formErrors.user_id }}</p>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-[11px] font-semibold text-slate-600">Year <span class="text-rose-500">*</span></label>
                  <input v-model.number="form.year" type="number" placeholder="2024"
                    class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                  <p v-if="formErrors.year" class="mt-1 text-[11px] text-rose-600">{{ formErrors.year }}</p>
                </div>

                <div>
                  <label class="mb-1 block text-[11px] font-semibold text-slate-600">Source</label>
                  <select v-model="form.source"
                    class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                    <option value="">— Select —</option>
                    <option v-for="s in SOURCE_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
                  </select>
                </div>

                <div>
                  <label class="mb-1 block text-[11px] font-semibold text-slate-600">Period From <span class="text-rose-500">*</span></label>
                  <input v-model="form.period_from" type="date"
                    class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                  <p v-if="formErrors.period_from" class="mt-1 text-[11px] text-rose-600">{{ formErrors.period_from }}</p>
                </div>

                <div>
                  <label class="mb-1 block text-[11px] font-semibold text-slate-600">Period To <span class="text-rose-500">*</span></label>
                  <input v-model="form.period_to" type="date" :min="form.period_from"
                    class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                  <p v-if="formErrors.period_to" class="mt-1 text-[11px] text-rose-600">{{ formErrors.period_to }}</p>
                </div>

                <div>
                  <label class="mb-1 block text-[11px] font-semibold text-slate-600">Employee PF <span class="text-rose-500">*</span></label>
                  <div class="relative">
                    <span class="absolute inset-y-0 left-2.5 flex items-center text-xs text-slate-400">৳</span>
                    <input v-model.number="form.employee_amount" type="number" min="0" step="0.01" placeholder="0.00"
                      class="h-9 w-full rounded-lg border border-slate-200 bg-white py-2 pl-7 pr-3 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                  </div>
                  <p v-if="formErrors.employee_amount" class="mt-1 text-[11px] text-rose-600">{{ formErrors.employee_amount }}</p>
                </div>

                <div>
                  <label class="mb-1 block text-[11px] font-semibold text-slate-600">Employer PF <span class="text-rose-500">*</span></label>
                  <div class="relative">
                    <span class="absolute inset-y-0 left-2.5 flex items-center text-xs text-slate-400">৳</span>
                    <input v-model.number="form.employer_amount" type="number" min="0" step="0.01" placeholder="0.00"
                      class="h-9 w-full rounded-lg border border-slate-200 bg-white py-2 pl-7 pr-3 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                  </div>
                  <p v-if="formErrors.employer_amount" class="mt-1 text-[11px] text-rose-600">{{ formErrors.employer_amount }}</p>
                </div>
              </div>

              <div>
                <label class="mb-1 block text-[11px] font-semibold text-slate-600">Reference No</label>
                <input v-model="form.reference_no" type="text" placeholder="e.g. PF Register Page 12"
                  class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              </div>

              <div>
                <label class="mb-1 block text-[11px] font-semibold text-slate-600">Note</label>
                <textarea v-model="form.note" rows="2" placeholder="Optional note…"
                  class="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"></textarea>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
              <button type="button" @click="showModal = false"
                class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" :disabled="saving" @click="save"
                class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                <i class="far" :class="saving ? 'fa-spinner fa-spin' : 'fa-save'"></i>
                {{ saving ? 'Saving…' : (editId ? 'Update' : 'Save') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>
