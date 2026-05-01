<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from 'vue-toastification'
import apiClient from '@/axios'
import AsyncUserCombobox from '@/components/common/AsyncUserCombobox.vue'
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
const userDisplay = ref({ name: null, dept: null })

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

const fetchUsers = (params) =>
  apiClient
    .get('/users', { params })
    .then((r) => (Array.isArray(r.data) ? r.data : r.data?.data || r.data?.users || []))

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

const calculateInstallmentAmount = () => {
  const amount = toNum(form.value.amount)
  const total = Math.trunc(toNum(form.value.total_installments))
  form.value.installment_amount = amount > 0 && total > 0 ? Number((amount / total).toFixed(2)) : ''
  form.value.opening_paid_amount = openingPaidAmountPreview.value
}

const previewInstallments = computed(() => {
  const rows = []
  const amount = toNum(form.value.amount)
  const installmentAmount = toNum(form.value.installment_amount)
  const total = Math.trunc(toNum(form.value.total_installments))
  const openingPaid = Math.max(0, Math.trunc(toNum(form.value.opening_paid_installments)))
  if (!form.value.start_month || amount <= 0 || installmentAmount <= 0 || total <= 0) return rows

  let remaining = amount
  const start = new Date(`${form.value.start_month.slice(0, 7)}-01T00:00:00`)
  for (let index = 0; index < total; index += 1) {
    const d = new Date(start)
    d.setMonth(start.getMonth() + index)
    const value = index === total - 1 ? remaining : Math.min(installmentAmount, remaining)
    rows.push({
      salary_month: d.toISOString().slice(0, 10),
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
  userDisplay.value = { name: null, dept: null }
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
  userDisplay.value = {
    name: item.user?.name || null,
    dept: item.user?.department?.name || null,
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
  <div class="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="title-md md:title-lg">Security Money</h1>
        <p class="text-sm text-slate-500">Security money installments deduct through payroll Security Money deduction.</p>
      </div>
      <button class="btn-2" @click="openCreate"><i class="far fa-plus"></i><span>Add Security Money</span></button>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <EmployeeFilter
        :company_id="filters.company_id"
        :department_id="filters.department_id"
        :line_type="filters.line_type"
        :employee_id="filters.user_id"
        @filter-change="handleFilterChange"
      />
      <div class="mt-3 max-w-xs">
        <label class="mb-1 block text-xs font-semibold text-slate-500">Status</label>
        <select v-model="filters.status" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">All</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
          <option value="Closed">Closed</option>
        </select>
      </div>
    </div>

    <LoaderView v-if="loading" />
    <div v-else-if="error" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{{ error }}</div>
    <div v-else class="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th class="px-3 py-2 text-left">Employee</th>
            <th class="px-3 py-2 text-left">Title</th>
            <th class="px-3 py-2 text-right">Amount</th>
            <th class="px-3 py-2 text-right">Installment</th>
            <th class="px-3 py-2 text-right">Remaining</th>
            <th class="px-3 py-2 text-left">Start</th>
            <th class="px-3 py-2 text-left">Status</th>
            <th class="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="item in list" :key="item.id" class="hover:bg-slate-50">
            <td class="px-3 py-2">
              <div class="font-medium text-slate-800">{{ item.user?.name || '-' }}</div>
              <div class="text-xs text-slate-400">{{ item.user?.employee_id || '' }}</div>
            </td>
            <td class="px-3 py-2">{{ item.title }}</td>
            <td class="px-3 py-2 text-right font-mono">{{ formatCurrency(item.amount) }}</td>
            <td class="px-3 py-2 text-right font-mono">{{ formatCurrency(item.installment_amount) }}</td>
            <td class="px-3 py-2 text-right font-mono">{{ formatCurrency(item.remaining_balance) }}</td>
            <td class="px-3 py-2">{{ item.start_month }}</td>
            <td class="px-3 py-2">
              <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{{ item.status }}</span>
              <div
                v-if="Number(item.opening_paid_installments || 0) > 0"
                class="mt-1 text-[11px] font-medium text-emerald-600"
              >
                Paid before: {{ item.opening_paid_installments }}
              </div>
            </td>
            <td class="px-3 py-2 text-right">
              <button class="btn-3 mr-2 text-xs" @click="openEdit(item)"><i class="far fa-pen"></i></button>
              <button class="btn-3 text-xs text-rose-600" @click="confirmDelete(item)"><i class="far fa-trash"></i></button>
            </td>
          </tr>
          <tr v-if="!list.length">
            <td colspan="8" class="px-3 py-8 text-center text-slate-400">No security money records found.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <PaginationBar
      v-if="pagination?.last_page > 1"
      :page="pagination.current_page || filters.page"
      :per-page="pagination.per_page || filters.per_page"
      :total="pagination.total || 0"
      :last-page="pagination.last_page || 1"
      @page-change="(page) => { filters.page = page; fetchList() }"
    />

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-slate-900">{{ isEditMode ? 'Edit' : 'Add' }} Security Money</h2>
          <button class="btn-3" @click="closeModal"><i class="far fa-times"></i></button>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="mb-1 block text-sm font-medium text-slate-700">Employee</label>
            <AsyncUserCombobox v-model="form.user_id" v-model:display="userDisplay" :fetcher="fetchUsers" />
            <p v-if="fieldErrors.user_id" class="mt-1 text-xs text-red-600">{{ fieldErrors.user_id }}</p>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Title</label>
            <input v-model="form.title" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Start Month</label>
            <input v-model="form.start_month" type="month" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <p v-if="fieldErrors.start_month" class="mt-1 text-xs text-red-600">{{ fieldErrors.start_month }}</p>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Amount</label>
            <input v-model="form.amount" type="number" min="0" step="0.01" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" @input="calculateInstallmentAmount" />
            <p v-if="fieldErrors.amount" class="mt-1 text-xs text-red-600">{{ fieldErrors.amount }}</p>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Total Installments</label>
            <input v-model="form.total_installments" type="number" min="1" step="1" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" @input="calculateInstallmentAmount" />
            <p v-if="fieldErrors.total_installments" class="mt-1 text-xs text-red-600">{{ fieldErrors.total_installments }}</p>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Already Paid Installments</label>
            <input v-model="form.opening_paid_installments" type="number" min="0" step="1" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <p class="mt-1 text-xs text-slate-500">Paid before system start: {{ formatCurrency(openingPaidAmountPreview) }}</p>
            <p v-if="fieldErrors.opening_paid_installments" class="mt-1 text-xs text-red-600">{{ fieldErrors.opening_paid_installments }}</p>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Installment Amount</label>
            <input v-model="form.installment_amount" type="number" min="0" step="0.01" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <p v-if="fieldErrors.installment_amount" class="mt-1 text-xs text-red-600">{{ fieldErrors.installment_amount }}</p>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select v-model="form.status" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="closed">Closed</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
            <textarea v-model="form.remarks" rows="2" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"></textarea>
          </div>
        </div>

        <div v-if="previewInstallments.length" class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h3 class="mb-2 text-sm font-semibold text-slate-800">Installment Preview</h3>
          <div class="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            <div v-for="row in previewInstallments" :key="row.salary_month" class="rounded-lg bg-white px-3 py-2 text-sm">
              <span class="text-slate-500">{{ row.salary_month }}</span>
              <span class="float-right font-mono font-semibold">{{ formatCurrency(row.amount) }}</span>
              <div
                class="mt-1 text-[11px] font-semibold"
                :class="row.status === 'Paid' ? 'text-emerald-600' : 'text-slate-400'"
              >
                {{ row.status }}
              </div>
            </div>
          </div>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <button class="btn-3" @click="closeModal">Cancel</button>
          <button class="btn-2" :disabled="submitting" @click="submit">
            <i class="far" :class="submitting ? 'fa-spinner fa-spin' : 'fa-save'"></i>
            <span>{{ submitting ? 'Saving...' : 'Save' }}</span>
          </button>
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
  </div>
</template>
