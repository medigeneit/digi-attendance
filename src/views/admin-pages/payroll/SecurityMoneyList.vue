<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from 'vue-toastification'
import DeleteModal from '@/components/common/DeleteModal.vue'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import { useSecurityMoneyStore } from '@/stores/securityMoney'
import { formatCurrency, toNum } from '@/utils/currency'

const toast = useToast()
const store = useSecurityMoneyStore()
const { list, loading, error, pagination } = storeToRefs(store)

const filters = ref({
  company_id: '',
  department_id: '',
  line_type: 'all',
  user_id: '',
  status: '',
  page: 1,
  per_page: 15,
})

const showModal = ref(false)
const showDeleteModal = ref(false)
const selectedItem = ref(null)
const submitting = ref(false)
const fieldErrors = ref({})
const formFilters = ref({
  company_id: '',
  department_id: '',
  line_type: 'all',
  user_id: '',
})

const blankForm = () => ({
  user_id: null,
  title: 'Security Money',
  amount: '',
  installment_amount: '',
  total_installments: '',
  opening_paid_installments: 0,
  opening_paid_amount: 0,
  start_month: '',
  status: 'active',
  remarks: '',
})

const form = ref(blankForm())
const isEditMode = computed(() => !!selectedItem.value?.id)

const buildParams = () => {
  const params = { ...filters.value }
  if (!params.company_id) delete params.company_id
  if (!params.department_id) delete params.department_id
  if (!params.line_type || params.line_type === 'all') delete params.line_type
  if (!params.user_id) delete params.user_id
  if (!params.status) delete params.status
  return params
}

const fetchList = async () => {
  await store.fetchList(buildParams())
}

const handleFilterChange = (payload = {}) => {
  filters.value.company_id = payload.company_id || ''
  filters.value.department_id = payload.department_id || ''
  filters.value.line_type = payload.line_type || 'all'
  filters.value.user_id = payload.employee_id || ''
  filters.value.page = 1
  fetchList()
}

const resetFilters = () => {
  filters.value = {
    company_id: '',
    department_id: '',
    line_type: 'all',
    user_id: '',
    status: '',
    page: 1,
    per_page: 15,
  }
  fetchList()
}

const handleFormEmployeeFilterChange = (payload = {}) => {
  formFilters.value = {
    company_id: payload.company_id || '',
    department_id: payload.department_id || '',
    line_type: payload.line_type || 'all',
    user_id: payload.employee_id || '',
  }
  form.value.user_id = payload.employee_id || null
}

const calculateInstallmentAmount = () => {
  const amount = toNum(form.value.amount)
  const total = Math.trunc(toNum(form.value.total_installments))
  form.value.installment_amount = amount > 0 && total > 0 ? Number((amount / total).toFixed(2)) : ''
  form.value.opening_paid_amount = openingPaidAmountPreview.value
}

const addMonthsToMonth = (value, offset) => {
  const month = String(value || '').slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(month)) return ''

  const year = Number(month.slice(0, 4))
  const monthIndex = Number(month.slice(5, 7)) - 1 + offset
  const next = new Date(year, monthIndex, 1)

  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`
}

const previewInstallments = computed(() => {
  const rows = []
  const amount = toNum(form.value.amount)
  const installmentAmount = toNum(form.value.installment_amount)
  const total = Math.trunc(toNum(form.value.total_installments))
  const openingPaid = Math.max(0, Math.trunc(toNum(form.value.opening_paid_installments)))
  if (!form.value.start_month || amount <= 0 || installmentAmount <= 0 || total <= 0) return rows

  let remaining = amount
  for (let index = 0; index < total; index += 1) {
    const value = index === total - 1 ? remaining : Math.min(installmentAmount, remaining)
    rows.push({
      salary_month: addMonthsToMonth(form.value.start_month, index),
      amount: Number(value.toFixed(2)),
      status: index < openingPaid ? 'Paid' : 'Pending',
    })
    remaining = Math.max(0, Number((remaining - value).toFixed(2)))
  }
  return rows
})

const openingPaidAmountPreview = computed(() =>
  previewInstallments.value
    .filter((row) => row.status === 'Paid')
    .reduce((sum, row) => Number((sum + toNum(row.amount)).toFixed(2)), 0),
)

const openCreate = () => {
  selectedItem.value = null
  form.value = blankForm()
  formFilters.value = {
    company_id: '',
    department_id: '',
    line_type: 'all',
    user_id: '',
  }
  fieldErrors.value = {}
  showModal.value = true
}

const openEdit = (item) => {
  selectedItem.value = item
  form.value = {
    user_id: item.user_id,
    title: item.title || 'Security Money',
    amount: item.amount ?? '',
    installment_amount: item.installment_amount ?? '',
    total_installments: item.total_installments ?? '',
    opening_paid_installments: item.opening_paid_installments ?? 0,
    opening_paid_amount: item.opening_paid_amount ?? 0,
    start_month: item.start_month?.slice?.(0, 7) || item.start_month || '',
    status: String(item.status || 'active').toLowerCase(),
    remarks: item.remarks || '',
  }
  formFilters.value = {
    company_id: item.user?.company_id || '',
    department_id: item.user?.department_id || '',
    line_type: item.user?.type || 'all',
    user_id: item.user_id || '',
  }
  fieldErrors.value = {}
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedItem.value = null
  fieldErrors.value = {}
}

const validate = () => {
  const errors = {}
  if (!form.value.user_id) errors.user_id = 'Employee is required.'
  if (toNum(form.value.amount) <= 0) errors.amount = 'Amount must be greater than zero.'
  if (toNum(form.value.installment_amount) <= 0) errors.installment_amount = 'Installment amount is required.'
  if (Math.trunc(toNum(form.value.total_installments)) <= 0) errors.total_installments = 'Total installments is required.'
  if (Math.trunc(toNum(form.value.opening_paid_installments)) < 0) {
    errors.opening_paid_installments = 'Already paid installments cannot be negative.'
  }
  if (Math.trunc(toNum(form.value.opening_paid_installments)) > Math.trunc(toNum(form.value.total_installments))) {
    errors.opening_paid_installments = 'Already paid installments cannot exceed total installments.'
  }
  if (!form.value.start_month) errors.start_month = 'Start month is required.'
  if (toNum(form.value.installment_amount) * Math.trunc(toNum(form.value.total_installments)) < toNum(form.value.amount)) {
    errors.total_installments = 'Installment schedule must cover the full amount.'
  }
  fieldErrors.value = errors
  return !Object.keys(errors).length
}

const submit = async () => {
  if (!validate()) return
  submitting.value = true
  try {
    const payload = {
      ...form.value,
      amount: toNum(form.value.amount),
      installment_amount: toNum(form.value.installment_amount),
      total_installments: Math.trunc(toNum(form.value.total_installments)),
      opening_paid_installments: Math.trunc(toNum(form.value.opening_paid_installments)),
      opening_paid_amount: openingPaidAmountPreview.value,
    }

    if (isEditMode.value) {
      await store.updateItem(selectedItem.value.id, payload)
      toast.success('Security money updated.')
    } else {
      await store.createItem(payload)
      toast.success('Security money created.')
    }
    closeModal()
    fetchList()
  } catch (err) {
    fieldErrors.value = err.errors || {}
    toast.error(err.message)
  } finally {
    submitting.value = false
  }
}

const confirmDelete = (item) => {
  selectedItem.value = item
  showDeleteModal.value = true
}

const deleteSelected = async () => {
  if (!selectedItem.value?.id) return
  await store.deleteItem(selectedItem.value.id)
  showDeleteModal.value = false
  selectedItem.value = null
  toast.success('Security money deleted.')
  fetchList()
}

const paidInstallmentCount = (item) => {
  const installments = Array.isArray(item?.installments) ? item.installments : []
  return installments.filter((row) => ['deducted', 'paid'].includes(String(row?.status || '').toLowerCase())).length
}

const pageMetrics = computed(() => {
  const rows = Array.isArray(list.value) ? list.value : []
  return {
    totalRecords: Number(pagination.value?.total ?? rows.length),
    active: rows.filter((item) => String(item.status || '').toLowerCase() === 'active').length,
    principal: rows.reduce((sum, item) => sum + toNum(item.amount), 0),
    outstanding: rows.reduce((sum, item) => sum + toNum(item.remaining_balance), 0),
  }
})

const installmentProgress = (item) => {
  const total = Math.max(0, Math.trunc(toNum(item?.total_installments)))
  if (!total) return 0
  return Math.min(100, Math.round((paidInstallmentCount(item) / total) * 100))
}

const statusClass = (status) => {
  const value = String(status || '').toLowerCase()
  return {
    active: 'status-badge--active',
    completed: 'status-badge--completed',
    pending: 'status-badge--pending',
    closed: 'status-badge--closed',
  }[value] || 'status-badge--neutral'
}

const formatMonth = (value) => {
  if (!value) return '—'
  const raw = String(value).slice(0, 7)
  const [year, month] = raw.split('-').map(Number)
  if (!year || !month) return String(value)
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  )
}

const changePage = (page) => {
  filters.value.page = page
  fetchList()
}

watch(
  () => filters.value.status,
  () => {
    filters.value.page = 1
    fetchList()
  },
)

onMounted(fetchList)
</script>

<template>
  <main class="security-page">
    <header class="page-header">
      <div class="flex min-w-0 items-center gap-3">
        <div class="module-icon"><i class="far fa-shield-dollar"></i></div>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <p class="section-kicker">Payroll receivables</p>
            <span class="module-tag">ERP</span>
          </div>
          <h1 class="truncate text-xl font-bold tracking-tight text-slate-950">Security Money</h1>
          <p class="mt-0.5 text-xs text-slate-500">Employee deposits and payroll installment recovery.</p>
        </div>
      </div>
      <button class="primary-action" @click="openCreate">
        <i class="far fa-plus"></i><span>New entry</span>
      </button>
    </header>

    <section class="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <article class="metric-card">
        <div class="metric-icon bg-blue-50 text-blue-600"><i class="far fa-rectangle-list"></i></div>
        <div><p class="metric-label">Total records</p><p class="metric-value">{{ pageMetrics.totalRecords }}</p></div>
      </article>
      <article class="metric-card">
        <div class="metric-icon bg-emerald-50 text-emerald-600"><i class="far fa-circle-play"></i></div>
        <div><p class="metric-label">Active on page</p><p class="metric-value">{{ pageMetrics.active }}</p></div>
      </article>
      <article class="metric-card">
        <div class="metric-icon bg-violet-50 text-violet-600"><i class="far fa-coins"></i></div>
        <div><p class="metric-label">Page principal</p><p class="metric-money">{{ formatCurrency(pageMetrics.principal) }}</p></div>
      </article>
      <article class="metric-card">
        <div class="metric-icon bg-amber-50 text-amber-600"><i class="far fa-hourglass-half"></i></div>
        <div><p class="metric-label">Page outstanding</p><p class="metric-money">{{ formatCurrency(pageMetrics.outstanding) }}</p></div>
      </article>
    </section>

    <section class="filter-card">
      <div class="filter-heading">
        <div class="flex items-center gap-2"><i class="far fa-filter text-blue-600"></i><span>Filters</span></div>
        <button class="reset-button" @click="resetFilters"><i class="far fa-rotate-left"></i> Reset</button>
      </div>
      <div class="grid grid-cols-1 gap-3 p-3 xl:grid-cols-[1fr_150px_100px]">
        <EmployeeFilter
          :company_id="filters.company_id"
          :department_id="filters.department_id"
          :line_type="filters.line_type"
          :employee_id="filters.user_id"
          @update:company_id="(value) => (filters.company_id = value)"
          @update:department_id="(value) => (filters.department_id = value)"
          @update:line_type="(value) => (filters.line_type = value)"
          @update:employee_id="(value) => (filters.user_id = value)"
          @filter-change="handleFilterChange"
          :active-only="true"
          slot-class="hidden"
        />
        <label class="compact-field">
          <span>Status</span>
          <select v-model="filters.status">
            <option value="">All</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Closed">Closed</option>
          </select>
        </label>
        <label class="compact-field">
          <span>Rows</span>
          <select v-model.number="filters.per_page" @change="filters.page = 1; fetchList()">
            <option :value="15">15</option><option :value="25">25</option><option :value="50">50</option>
          </select>
        </label>
      </div>
    </section>

    <LoaderView v-if="loading" />
    <div v-else-if="error" class="error-state"><i class="far fa-circle-exclamation"></i>{{ error }}</div>
    <section v-else class="table-card">
      <div class="table-titlebar">
        <div><h2>Security money register</h2><p>{{ pagination?.total || list.length }} records &middot; newest schedule first</p></div>
        <span class="sync-state"><span></span> Payroll linked</span>
      </div>
      <div class="max-h-[64vh] overflow-auto">
      <table class="erp-table">
        <thead>
          <tr>
            <th class="employee-col text-left">Employee</th>
            <th class="text-right">Principal</th>
            <th class="text-right">Per month</th>
            <th class="min-w-[170px] text-left">Recovery progress</th>
            <th class="text-right">Outstanding</th>
            <th class="text-left">Start period</th>
            <th class="text-left">Status</th>
            <th class="w-20 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td class="employee-col">
              <div class="flex items-center gap-2.5">
                <div class="employee-avatar">{{ String(item.user?.name || '?').charAt(0).toUpperCase() }}</div>
                <div class="min-w-0">
                  <div class="max-w-[210px] truncate font-semibold text-slate-900" :title="item.user?.name">{{ item.user?.name || '-' }}</div>
                  <div class="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span class="font-mono">{{ item.user?.employee_id || 'No ID' }}</span>
                    <span v-if="item.user?.department?.name">&middot; {{ item.user.department.name }}</span>
                  </div>
                </div>
              </div>
            </td>
            <td class="money-cell">{{ formatCurrency(item.amount) }}</td>
            <td class="money-cell text-slate-600">{{ formatCurrency(item.installment_amount) }}</td>
            <td>
              <div class="mb-1.5 flex items-center justify-between text-[10px]"><span class="font-semibold text-slate-600">{{ paidInstallmentCount(item) }} of {{ item.total_installments || 0 }} paid</span><span class="font-mono text-slate-400">{{ installmentProgress(item) }}%</span></div>
              <div class="progress-track"><span :style="{ width: `${installmentProgress(item)}%` }"></span></div>
              <div v-if="Number(item.opening_paid_installments || 0) > 0" class="mt-1 text-[10px] text-emerald-600">
                {{ item.opening_paid_installments }} opening installments
              </div>
            </td>
            <td class="money-cell font-bold text-slate-900">{{ formatCurrency(item.remaining_balance) }}</td>
            <td><span class="month-chip"><i class="far fa-calendar"></i>{{ formatMonth(item.start_month) }}</span></td>
            <td>
              <span class="status-badge" :class="statusClass(item.status)"><span></span>{{ item.status }}</span>
            </td>
            <td>
              <div class="flex items-center justify-center gap-1">
                <button class="row-action" title="Edit entry" @click="openEdit(item)"><i class="far fa-pen"></i></button>
                <button class="row-action row-action--danger" title="Delete entry" @click="confirmDelete(item)"><i class="far fa-trash"></i></button>
              </div>
            </td>
          </tr>
          <tr v-if="!list.length">
            <td colspan="8" class="px-3 py-8 text-center text-slate-400">No security money records found.</td>
          </tr>
        </tbody>
      </table>
      </div>
    </section>

    <PaginationBar
      v-if="pagination?.last_page > 1"
      :page="pagination.current_page || filters.page"
      :per-page="pagination.per_page || filters.per_page"
      :total="pagination.total || 0"
      :last-page="pagination.last_page || 1"
      @page-change="changePage"
    />

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm">
      <div class="entry-modal max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div class="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><i class="far fa-shield-dollar"></i></div>
            <div><p class="section-kicker">Recovery agreement</p><h2 class="text-base font-bold text-slate-950">{{ isEditMode ? 'Edit security money' : 'New security money' }}</h2></div>
          </div>
          <button class="modal-close" @click="closeModal"><i class="far fa-times"></i></button>
        </div>

        <div class="p-4">
          <div class="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><span class="step-number">1</span> Employee scope</div>
          <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <EmployeeFilter
              :company_id="formFilters.company_id"
              :department_id="formFilters.department_id"
              :line_type="formFilters.line_type"
              :employee_id="formFilters.user_id"
              @update:company_id="(value) => (formFilters.company_id = value)"
              @update:department_id="(value) => (formFilters.department_id = value)"
              @update:line_type="(value) => (formFilters.line_type = value)"
              @update:employee_id="(value) => { formFilters.user_id = value; form.user_id = value || null }"
              @filter-change="handleFormEmployeeFilterChange"
              :active-only="true"
              slot-class="hidden"
            />
            <p v-if="fieldErrors.user_id" class="mt-1 text-xs text-red-600">{{ fieldErrors.user_id }}</p>
          </div>

          <div class="mb-3 mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><span class="step-number">2</span> Agreement terms</div>
          <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label class="form-label">Title</label>
            <input v-model="form.title" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="form-label">Start month</label>
            <input v-model="form.start_month" type="month" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <p v-if="fieldErrors.start_month" class="mt-1 text-xs text-red-600">{{ fieldErrors.start_month }}</p>
          </div>
          <div>
            <label class="form-label">Principal amount</label>
            <input v-model="form.amount" type="number" min="0" step="0.01" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" @input="calculateInstallmentAmount" />
            <p v-if="fieldErrors.amount" class="mt-1 text-xs text-red-600">{{ fieldErrors.amount }}</p>
          </div>
          <div>
            <label class="form-label">Installments</label>
            <input v-model="form.total_installments" type="number" min="1" step="1" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" @input="calculateInstallmentAmount" />
            <p v-if="fieldErrors.total_installments" class="mt-1 text-xs text-red-600">{{ fieldErrors.total_installments }}</p>
          </div>
          <div>
            <label class="form-label">Opening paid count</label>
            <input v-model="form.opening_paid_installments" type="number" min="0" step="1" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <p class="mt-1 text-xs text-slate-500">Paid before system start: {{ formatCurrency(openingPaidAmountPreview) }}</p>
            <p v-if="fieldErrors.opening_paid_installments" class="mt-1 text-xs text-red-600">{{ fieldErrors.opening_paid_installments }}</p>
          </div>
          <div>
            <label class="form-label">Monthly deduction</label>
            <input v-model="form.installment_amount" type="number" min="0" step="0.01" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <p v-if="fieldErrors.installment_amount" class="mt-1 text-xs text-red-600">{{ fieldErrors.installment_amount }}</p>
          </div>
          <div>
            <label class="form-label">Agreement status</label>
            <select v-model="form.status" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="closed">Closed</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div class="md:col-span-2 lg:col-span-1">
            <label class="form-label">Remarks</label>
            <textarea v-model="form.remarks" rows="2" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"></textarea>
          </div>
        </div>

        <div v-if="previewInstallments.length" class="mt-5 overflow-hidden rounded-xl border border-slate-200">
          <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
            <div><h3 class="text-xs font-bold uppercase tracking-wider text-slate-600">Installment schedule</h3><p class="mt-0.5 text-[10px] text-slate-400">{{ previewInstallments.length }} payroll periods generated</p></div>
            <div class="text-right"><p class="text-[10px] text-slate-400">Opening paid</p><p class="font-mono text-xs font-bold text-emerald-600">{{ formatCurrency(openingPaidAmountPreview) }}</p></div>
          </div>
          <div class="grid max-h-48 gap-px overflow-y-auto bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            <div v-for="(row, index) in previewInstallments" :key="row.salary_month" class="bg-white px-3 py-2 text-xs">
              <span class="text-slate-400">#{{ index + 1 }} &middot; {{ formatMonth(row.salary_month) }}</span>
              <span class="float-right font-mono font-semibold text-slate-800">{{ formatCurrency(row.amount) }}</span>
              <div
                class="mt-1 text-[11px] font-semibold"
                :class="row.status === 'Paid' ? 'text-emerald-600' : 'text-slate-400'"
              >
                {{ row.status }}
              </div>
            </div>
          </div>
        </div>

        </div>

        <div class="sticky bottom-0 flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
          <p class="hidden text-[11px] text-slate-400 sm:block">Required fields are validated before saving.</p>
          <div class="ml-auto flex gap-2">
          <button class="secondary-action" @click="closeModal">Cancel</button>
          <button class="primary-action" :disabled="submitting" @click="submit">
            <i class="far" :class="submitting ? 'fa-spinner fa-spin' : 'fa-save'"></i>
            <span>{{ submitting ? 'Saving...' : isEditMode ? 'Update entry' : 'Create entry' }}</span>
          </button>
          </div>
        </div>
      </div>
    </div>

    <DeleteModal
      :show="showDeleteModal"
      title="Delete Security Money"
      :message="`Delete ${selectedItem?.title || 'security money'}?`"
      @close="showDeleteModal = false"
      @confirm="deleteSelected"
    />
  </main>
</template>

<style scoped>
.security-page { @apply min-h-screen space-y-3 bg-slate-50/70 p-3 lg:p-4; }
.page-header { @apply flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm; }
.module-icon { @apply flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-base text-white shadow-sm shadow-blue-200; }
.section-kicker { @apply text-[9px] font-bold uppercase tracking-[0.16em] text-blue-600; }
.module-tag { @apply rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-slate-500; }
.primary-action { @apply inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300; }
.secondary-action { @apply inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 hover:bg-slate-50; }
.metric-card { @apply flex min-h-[78px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm; }
.metric-icon { @apply flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm; }
.metric-label { @apply text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400; }
.metric-value { @apply mt-0.5 text-lg font-bold tabular-nums text-slate-950; }
.metric-money { @apply mt-0.5 text-sm font-bold tabular-nums text-slate-950 sm:text-base; }
.filter-card { @apply overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm; }
.filter-heading { @apply flex h-9 items-center justify-between border-b border-slate-100 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-600; }
.reset-button { @apply inline-flex items-center gap-1 text-[10px] font-semibold normal-case tracking-normal text-slate-400 hover:text-blue-600; }
.compact-field { @apply relative min-w-0; }
.compact-field > span { @apply absolute -top-1.5 left-2 z-10 bg-white px-1 text-[9px] font-semibold text-blue-500; }
.compact-field select { @apply h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100; }
.error-state { @apply flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700; }
.table-card { @apply overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm; }
.table-titlebar { @apply flex items-center justify-between border-b border-slate-200 px-3 py-2.5; }
.table-titlebar h2 { @apply text-xs font-bold text-slate-900; }
.table-titlebar p { @apply mt-0.5 text-[10px] text-slate-400; }
.sync-state { @apply inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700; }
.sync-state > span { @apply h-1.5 w-1.5 rounded-full bg-emerald-500; }
.erp-table { @apply min-w-full border-separate border-spacing-0 text-xs; }
.erp-table thead { @apply sticky top-0 z-30 bg-slate-50; }
.erp-table th { @apply whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500; }
.erp-table td { @apply whitespace-nowrap border-b border-r border-slate-100 bg-white px-3 py-2 text-slate-600; }
.erp-table tbody tr:hover td { @apply bg-blue-50/40; }
.employee-col { @apply sticky left-0 z-10 min-w-[240px]; }
thead .employee-col { @apply z-40 bg-slate-50; }
.employee-avatar { @apply flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[10px] font-bold text-blue-700 ring-1 ring-blue-100; }
.money-cell { @apply text-right font-mono text-[11px] tabular-nums text-slate-800; }
.progress-track { @apply h-1.5 overflow-hidden rounded-full bg-slate-100; }
.progress-track span { @apply block h-full rounded-full bg-blue-500 transition-all; }
.month-chip { @apply inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200; }
.status-badge { @apply inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide; }
.status-badge > span { @apply h-1.5 w-1.5 rounded-full; }
.status-badge--active { @apply bg-blue-50 text-blue-700; } .status-badge--active > span { @apply bg-blue-500; }
.status-badge--completed { @apply bg-emerald-50 text-emerald-700; } .status-badge--completed > span { @apply bg-emerald-500; }
.status-badge--pending { @apply bg-amber-50 text-amber-700; } .status-badge--pending > span { @apply bg-amber-500; }
.status-badge--closed { @apply bg-slate-100 text-slate-600; } .status-badge--closed > span { @apply bg-slate-400; }
.status-badge--neutral { @apply bg-slate-50 text-slate-500; } .status-badge--neutral > span { @apply bg-slate-300; }
.row-action { @apply flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-[10px] text-slate-400 hover:border-slate-200 hover:bg-white hover:text-blue-600 hover:shadow-sm; }
.row-action--danger:hover { @apply border-rose-100 bg-rose-50 text-rose-600; }
.modal-close { @apply flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700; }
.step-number { @apply inline-flex h-5 w-5 items-center justify-center rounded-md bg-blue-50 text-[10px] text-blue-700; }
.form-label { @apply mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500; }
.entry-modal input, .entry-modal select, .entry-modal textarea { @apply h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100; }
.entry-modal textarea { @apply h-auto py-2; }

@media (max-width: 640px) {
  .security-page { @apply p-2; }
  .metric-card { @apply min-h-[72px] items-start gap-2 p-2.5; }
  .metric-icon { @apply h-8 w-8; }
  .employee-col { min-width: 210px; }
}
</style>
