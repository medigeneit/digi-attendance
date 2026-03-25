<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { usePayrollManagementStore } from '@/stores/payrollManagement'
import { useCompanyStore } from '@/stores/company'
import LoaderView from '@/components/common/LoaderView.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import PayrollStatusBadge from '@/components/payroll/PayrollStatusBadge.vue'
import PaymentStatusModal from '@/components/payroll/PaymentStatusModal.vue'
import { formatCurrency } from '@/utils/currency'

const router = useRouter()
const toast = useToast()
const payrollStore = usePayrollManagementStore()
const companyStore = useCompanyStore()

const { list, loading, error, pagination } = storeToRefs(payrollStore)
const { companies } = storeToRefs(companyStore)

const filters = ref({
  company_id: '',
  salary_month: '',
  salary_type: '',
  payment_status: '',
  page: 1,
  per_page: 15,
})

const showPaymentModal = ref(false)
const selectedPayroll = ref(null)

async function load() {
  const params = { ...filters.value }
  Object.keys(params).forEach((k) => { if (!params[k]) delete params[k] })
  await payrollStore.fetchList(params)
}

onMounted(async () => {
  await Promise.all([companyStore.fetchCompanies(), load()])
})

const openPaymentModal = (p) => {
  selectedPayroll.value = p
  showPaymentModal.value = true
}

const handlePaymentSubmit = async ({ id, payload }) => {
  try {
    await payrollStore.updatePaymentStatus(id, payload)
    toast.success('Payment status updated.')
    showPaymentModal.value = false
    selectedPayroll.value = null
  } catch (e) {
    toast.error(e.message || 'Update failed.')
  }
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <h1 class="title-md md:title-lg">Payrolls</h1>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Company</label>
        <select v-model="filters.company_id" @change="() => { filters.page = 1; load() }"
          class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">All Companies</option>
          <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Salary Month</label>
        <input v-model="filters.salary_month" type="month" @change="() => { filters.page = 1; load() }"
          class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Salary Type</label>
        <select v-model="filters.salary_type" @change="() => { filters.page = 1; load() }"
          class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">All Types</option>
          <option value="Monthly">Monthly</option>
          <option value="Weekly">Weekly</option>
          <option value="Bi-Weekly">Bi-Weekly</option>
          <option value="Hourly">Hourly</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Payment Status</label>
        <select v-model="filters.payment_status" @change="() => { filters.page = 1; load() }"
          class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">All Statuses</option>
          <option value="generated">Generated</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="hold">On Hold</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <button class="btn-3" @click="() => { filters = { company_id: '', salary_month: '', salary_type: '', payment_status: '', page: 1, per_page: 15 }; load() }">
        <i class="far fa-undo"></i> Reset
      </button>
    </div>

    <LoaderView v-if="loading" />

    <div v-else-if="error"
      class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2">
      <i class="fas fa-exclamation-circle"></i> {{ error }}
    </div>

    <div v-else-if="!list.length" class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
      <i class="fas fa-file-invoice-dollar text-4xl text-gray-300 mb-3"></i>
      <p class="text-lg font-medium text-gray-500">No payrolls found</p>
      <p class="text-sm text-gray-400 mt-1">Generate a payroll batch to create payroll records.</p>
    </div>

    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-blue-50 text-blue-900 text-xs uppercase">
          <tr>
            <th class="px-3 py-3 text-left">#</th>
            <th class="px-3 py-3 text-left">Employee</th>
            <th class="px-3 py-3 text-left">Dept.</th>
            <th class="px-3 py-3 text-center">Month</th>
            <th class="px-3 py-3 text-center">Type</th>
            <th class="px-3 py-3 text-right">Gross</th>
            <th class="px-3 py-3 text-right">Deductions</th>
            <th class="px-3 py-3 text-right">Net</th>
            <th class="px-3 py-3 text-center">Status</th>
            <th class="px-3 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="(p, i) in list" :key="p.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-3 py-3 text-gray-400 text-xs">{{ (filters.page - 1) * filters.per_page + i + 1 }}</td>
            <td class="px-3 py-3">
              <div class="font-medium text-blue-900">{{ p.user?.name || '—' }}</div>
              <div class="text-xs text-gray-400">{{ p.user?.employee_id }}</div>
            </td>
            <td class="px-3 py-3 text-xs text-gray-500">{{ p.user?.department?.name || '—' }}</td>
            <td class="px-3 py-3 text-center text-gray-600">{{ p.salary_month || '—' }}</td>
            <td class="px-3 py-3 text-center">
              <span class="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">{{ p.salary_type || '—' }}</span>
            </td>
            <td class="px-3 py-3 text-right font-mono">{{ formatCurrency(p.gross_salary) }}</td>
            <td class="px-3 py-3 text-right font-mono text-red-600">{{ formatCurrency(p.total_deduction) }}</td>
            <td class="px-3 py-3 text-right font-mono font-bold text-emerald-700">{{ formatCurrency(p.net_salary) }}</td>
            <td class="px-3 py-3 text-center"><PayrollStatusBadge :status="p.payment_status" /></td>
            <td class="px-3 py-3 text-center">
              <div class="flex items-center justify-center gap-1">
                <button @click="router.push({ name: 'PayrollShow', params: { id: p.id } })"
                  class="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg" title="View">
                  <i class="far fa-eye text-xs"></i>
                </button>
                <button @click="openPaymentModal(p)"
                  class="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg" title="Update Payment">
                  <i class="far fa-credit-card text-xs"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <PaginationBar v-if="pagination.total > 0" :page="pagination.current_page || filters.page"
      :per-page="pagination.per_page || filters.per_page" :total="pagination.total || list.length"
      :last-page="pagination.last_page || 1"
      @page-change="(p) => { filters.page = p; load() }" />

    <PaymentStatusModal
      :show="showPaymentModal"
      :payroll-id="selectedPayroll?.id"
      :current-status="selectedPayroll?.payment_status"
      @close="() => { showPaymentModal = false; selectedPayroll = null }"
      @submit="handlePaymentSubmit"
    />
  </div>
</template>
