<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { useEmployeeLoanStore } from '@/stores/employeeLoan'
import { useCompanyStore } from '@/stores/company'
import LoaderView from '@/components/common/LoaderView.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import AsyncUserCombobox from '@/components/common/AsyncUserCombobox.vue'
import LoanInstallmentPreview from '@/components/payroll/LoanInstallmentPreview.vue'
import apiClient from '@/axios'
import { toNum, formatCurrency } from '@/utils/currency'

const router = useRouter()
const toast = useToast()
const loanStore = useEmployeeLoanStore()
const companyStore = useCompanyStore()

const { list, loading, error, pagination } = storeToRefs(loanStore)
const { companies } = storeToRefs(companyStore)

const filters = ref({ company_id: '', user_id: '', status: '', page: 1, per_page: 15 })
const showModal = ref(false)
const showDeleteModal = ref(false)
const selectedItem = ref(null)
const modalSubmitting = ref(false)
const modalErrors = ref({})
const isAutoSettingInstallment = ref(false)
const isInstallmentManuallyCustomized = ref(false)
const lastAutoInstallmentAmount = ref(null)

const blankForm = () => ({
  user_id: null,
  loan_title: '',
  loan_amount: '',
  installment_amount: '',
  total_installments: '',
  start_month: '',
  status: 'active',
  remarks: '',
})

const modalForm = ref(blankForm())
const modalUserDisplay = ref({ name: null, dept: null })
const isEditMode = computed(() => !!selectedItem.value?.id)

const previewLoan = computed(() => ({
  loan_amount: modalForm.value.loan_amount,
  installment_amount: modalForm.value.installment_amount,
  total_installments: modalForm.value.total_installments,
  start_month: modalForm.value.start_month,
}))

const calculateInstallmentAmount = (loanAmount, totalInstallments) => {
  const loan = toNum(loanAmount)
  const total = Math.trunc(toNum(totalInstallments))
  if (loan <= 0 || total <= 0) return null
  return parseFloat((loan / total).toFixed(2))
}

const applyAutoInstallmentAmount = () => {
  const autoAmount = calculateInstallmentAmount(
    modalForm.value.loan_amount,
    modalForm.value.total_installments,
  )
  isAutoSettingInstallment.value = true
  modalForm.value.installment_amount = autoAmount ?? ''
  isAutoSettingInstallment.value = false
  lastAutoInstallmentAmount.value = autoAmount
}

const fetchUsersFn = (params) =>
  apiClient
    .get('/users', { params })
    .then((r) => (Array.isArray(r.data) ? r.data : r.data?.data || r.data?.users || []))

async function load() {
  const params = { ...filters.value }
  if (!params.company_id) delete params.company_id
  if (!params.user_id) delete params.user_id
  if (!params.status) delete params.status
  await loanStore.fetchList(params)
}

onMounted(async () => {
  await Promise.all([companyStore.fetchCompanies(), load()])
})

const openCreate = () => {
  selectedItem.value = null
  modalForm.value = blankForm()
  isInstallmentManuallyCustomized.value = false
  lastAutoInstallmentAmount.value = null
  modalUserDisplay.value = { name: null, dept: null }
  modalErrors.value = {}
  showModal.value = true
}

const openEdit = (item) => {
  selectedItem.value = item
  modalForm.value = {
    user_id: item.user_id,
    loan_title: item.loan_title,
    loan_amount: item.loan_amount ?? '',
    installment_amount: item.installment_amount ?? '',
    total_installments: item.total_installments ?? '',
    start_month: item.start_month || '',
    status: item.status || 'active',
    remarks: item.remarks || '',
  }
  lastAutoInstallmentAmount.value = calculateInstallmentAmount(
    modalForm.value.loan_amount,
    modalForm.value.total_installments,
  )
  isInstallmentManuallyCustomized.value =
    modalForm.value.installment_amount !== '' &&
    modalForm.value.installment_amount !== null &&
    Number(modalForm.value.installment_amount) !== Number(lastAutoInstallmentAmount.value)
  modalUserDisplay.value = item.user
    ? { name: item.user.name, dept: item.user.department?.name || null }
    : { name: null, dept: null }
  modalErrors.value = {}
  showModal.value = true
}

watch(
  () => [modalForm.value.loan_amount, modalForm.value.total_installments],
  () => {
    const isBlank =
      modalForm.value.installment_amount === '' || modalForm.value.installment_amount === null
    if (isBlank || !isInstallmentManuallyCustomized.value) {
      applyAutoInstallmentAmount()
    }
  }
)

watch(
  () => modalForm.value.installment_amount,
  (newVal) => {
    if (isAutoSettingInstallment.value) return
    if (newVal === '' || newVal === null) {
      isInstallmentManuallyCustomized.value = false
      return
    }
    isInstallmentManuallyCustomized.value =
      Number(newVal) !== Number(lastAutoInstallmentAmount.value)
  }
)

const closeModal = () => {
  showModal.value = false
  selectedItem.value = null
}

const validateModal = () => {
  const errors = {}
  if (!modalForm.value.user_id) errors.user_id = 'Employee is required.'
  if (!modalForm.value.loan_title) errors.loan_title = 'Loan title is required.'
  if (!modalForm.value.loan_amount) errors.loan_amount = 'Loan amount is required.'
  if (!modalForm.value.installment_amount)
    errors.installment_amount = 'Installment amount is required.'
  if (!modalForm.value.total_installments)
    errors.total_installments = 'Total installments required.'
  if (!modalForm.value.start_month) errors.start_month = 'Start month is required.'
  modalErrors.value = errors
  return !Object.keys(errors).length
}

const handleModalSubmit = async () => {
  if (!validateModal()) return
  modalSubmitting.value = true
  try {
    if (isEditMode.value) {
      await loanStore.updateItem(selectedItem.value.id, modalForm.value)
      toast.success('Loan updated.')
    } else {
      await loanStore.createItem(modalForm.value)
      toast.success('Loan created.')
    }
    closeModal()
    load()
  } catch (e) {
    if (e.errors) modalErrors.value = e.errors
    toast.error(e.message)
  } finally {
    modalSubmitting.value = false
  }
}

const handleDelete = async () => {
  try {
    await loanStore.deleteItem(selectedItem.value.id)
    toast.success('Loan deleted.')
    showDeleteModal.value = false
    selectedItem.value = null
    load()
  } catch (e) {
    toast.error(e.message)
  }
}

const loanStatusClass = (status) => {
  const s = (status || '').toLowerCase()
  if (s === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (s === 'closed') return 'bg-gray-50 text-gray-500 border-gray-200'
  if (s === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'
</script>

<template>
  <div class="p-4 md:p-6 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <h1 class="title-md md:title-lg">Employee Loans</h1>
      <button class="btn-2" @click="openCreate">
        <i class="far fa-plus"></i>
        <span class="hidden md:flex">Add Loan</span>
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Company</label>
        <select
          v-model="filters.company_id"
          @change="() => { filters.page = 1; load() }"
          class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Companies</option>
          <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Status</label>
        <select
          v-model="filters.status"
          @change="() => { filters.page = 1; load() }"
          class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
          <option value="pending">Pending</option>
        </select>
      </div>
      <button class="btn-3" @click="() => { filters = { company_id: '', user_id: '', status: '', page: 1, per_page: 15 }; load() }">
        <i class="far fa-undo"></i> Reset
      </button>
    </div>

    <LoaderView v-if="loading" />

    <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2">
      <i class="fas fa-exclamation-circle"></i> {{ error }}
    </div>

    <div v-else-if="!list.length" class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
      <i class="fas fa-hand-holding-usd text-4xl text-gray-300 mb-3"></i>
      <p class="text-lg font-medium text-gray-500">No loans found</p>
      <button class="btn-2 mt-4" @click="openCreate">
        <i class="far fa-plus"></i> Add Loan 
      </button>
    </div>

    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-blue-50 text-blue-900 text-xs uppercase">
          <tr>
            <th class="px-4 py-3 text-left">#</th>
            <th class="px-4 py-3 text-left">Employee</th>
            <th class="px-4 py-3 text-left">Title</th>
            <th class="px-4 py-3 text-right">Loan Amount</th>
            <th class="px-4 py-3 text-right">Installment</th>
            <th class="px-4 py-3 text-center">Total</th>
            <th class="px-4 py-3 text-center">Start Month</th>
            <th class="px-4 py-3 text-center">Status</th>
            <th class="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="(item, i) in list" :key="item.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-3 text-gray-400 text-xs">{{ (filters.page - 1) * filters.per_page + i + 1 }}</td>
            <td class="px-4 py-3">
              <div class="font-medium text-blue-900">{{ item.user?.name || '—' }}</div>
              <div class="text-xs text-gray-400">{{ item.user?.employee_id }}</div>
            </td>
            <td class="px-4 py-3 font-medium">{{ item.loan_title }}</td>
            <td class="px-4 py-3 text-right font-mono">{{ formatCurrency(item.loan_amount) }}</td>
            <td class="px-4 py-3 text-right font-mono">{{ formatCurrency(item.installment_amount) }}</td>
            <td class="px-4 py-3 text-center text-gray-600">{{ item.total_installments }}</td>
            <td class="px-4 py-3 text-center text-gray-600">{{ item.start_month }}</td>
            <td class="px-4 py-3 text-center">
              <span class="px-2 py-0.5 rounded-full text-xs border font-medium" :class="loanStatusClass(item.status)">
                {{ item.status || '—' }}
              </span>
            </td>
            <td class="px-4 py-3 text-center">
              <div class="flex items-center justify-center gap-1">
                <button @click="router.push({ name: 'PayrollEmployeeLoanShow', params: { id: item.id } })" class="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors" title="Details">
                  <i class="far fa-eye text-xs"></i>
                </button>
                <button @click="openEdit(item)" class="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                  <i class="far fa-edit text-xs"></i>
                </button>
                <button @click="() => { selectedItem = item; showDeleteModal = true }" class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                  <i class="far fa-trash-alt text-xs"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <PaginationBar v-if="pagination.total > 0" :page="pagination.current_page || filters.page" :per-page="pagination.per_page || filters.per_page" :total="pagination.total || list.length" :last-page="pagination.last_page || 1" @page-change="(p) => { filters.page = p; load() }" />

    <!-- Create/Edit Modal -->
    <teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
          <div class="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <h3 class="font-bold text-blue-900 text-lg">{{ isEditMode ? 'Edit Loan' : 'Add Loan' }}</h3>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
          </div>
          <div class="overflow-y-auto flex-1">
            <form @submit.prevent="handleModalSubmit" class="p-6 space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Employee <span class="text-red-500">*</span></label>
                <AsyncUserCombobox v-model="modalForm.user_id" v-model:display="modalUserDisplay" :fetcher="fetchUsersFn" placeholder="Search employee..." />
                <p v-if="modalErrors.user_id" class="text-red-500 text-xs mt-1">{{ modalErrors.user_id }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Loan Title <span class="text-red-500">*</span></label>
                <input v-model="modalForm.loan_title" type="text" :class="inputClass" placeholder="e.g. Personal Loan" />
                <p v-if="modalErrors.loan_title" class="text-red-500 text-xs mt-1">{{ modalErrors.loan_title }}</p>
              </div>
              <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <textarea v-model="modalForm.remarks" :class="inputClass" placeholder="Loan reason..."></textarea>
                  <p v-if="modalErrors.remarks" class="text-red-500 text-xs mt-1">{{ modalErrors.remarks }}</p>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Loan Amount <span class="text-red-500">*</span></label>
                  <input v-model="modalForm.loan_amount" type="number" min="0" step="0.01" :class="inputClass" placeholder="0.00" />
                  <p v-if="modalErrors.loan_amount" class="text-red-500 text-xs mt-1">{{ modalErrors.loan_amount }}</p>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Total Installments <span class="text-red-500">*</span></label>
                  <input v-model="modalForm.total_installments" type="number" min="1" step="1" :class="inputClass" placeholder="12" />
                  <p v-if="modalErrors.total_installments" class="text-red-500 text-xs mt-1">{{ modalErrors.total_installments }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Installment Amount <span class="text-red-500">*</span></label>
                  <input v-model="modalForm.installment_amount" type="number" min="0" step="0.01" :class="inputClass" placeholder="0.00" />
                  <p v-if="modalErrors.installment_amount" class="text-red-500 text-xs mt-1">{{ modalErrors.installment_amount }}</p>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Start Month <span class="text-red-500">*</span></label>
                  <input v-model="modalForm.start_month" type="month" :class="inputClass" />
                  <p v-if="modalErrors.start_month" class="text-red-500 text-xs mt-1">{{ modalErrors.start_month }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select v-model="modalForm.status" :class="inputClass">
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                
              </div>

              <!-- Installment Preview -->
              <div class="pt-2">
                <LoanInstallmentPreview :loan="previewLoan" />
              </div>

              <div class="flex justify-end gap-3 pt-2">
                <button type="button" class="btn-3" @click="closeModal">Cancel</button>
                <button type="submit" class="btn-2" :disabled="modalSubmitting">
                  <i class="far" :class="modalSubmitting ? 'fa-spinner fa-spin' : isEditMode ? 'fa-save' : 'fa-plus'"></i>
                  {{ modalSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Loan' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </teleport>

    <DeleteModal :show="showDeleteModal" title="Delete Loan" :message="`Delete loan '${selectedItem?.loan_title}' for ${selectedItem?.user?.name}?`" @close="() => { showDeleteModal = false; selectedItem = null }" @confirm="handleDelete" />
  </div>
</template>
