<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { usePayrollBatchStore } from '@/stores/payrollBatch'
import LoaderView from '@/components/common/LoaderView.vue'
import PayrollStatusBadge from '@/components/payroll/PayrollStatusBadge.vue'
import { formatCurrency } from '@/utils/currency'

const props = defineProps({ id: { type: [String, Number], required: true } })
const router = useRouter()
const batchStore = usePayrollBatchStore()
const { item, loading, error, apiUnavailable } = storeToRefs(batchStore)

onMounted(() => {
  if (!apiUnavailable.value) batchStore.fetchItem(props.id)
})
</script>

<template>
  <div class="p-4 md:p-6 space-y-5">
    <div class="flex items-center gap-3">
      <button @click="router.back()" class="btn-3"><i class="far fa-arrow-left"></i></button>
      <h1 class="title-md md:title-lg">Payroll Batch Details</h1>
    </div>

    <div v-if="apiUnavailable" class="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-4 text-sm flex items-center gap-2">
      <i class="fas fa-info-circle"></i>
      Payroll batch API এখনো backend এ add করা হয়নি, তাই batch details আপাতত unavailable.
    </div>

    <LoaderView v-else-if="loading" />

    <div v-else-if="error"
      class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2">
      <i class="fas fa-exclamation-circle"></i> {{ error }}
    </div>

    <template v-else-if="item">
      <!-- Batch Header Card -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div class="flex flex-wrap gap-4 items-start justify-between mb-4">
          <div>
            <h2 class="text-xl font-bold text-blue-900">
              Batch <span class="font-mono">#{{ item.id }}</span>
            </h2>
            <p class="text-sm text-gray-500 mt-0.5">{{ item.company?.name || '—' }}</p>
          </div>
          <div class="text-right text-sm text-gray-500">
            <p>Generated: {{ item.created_at?.slice(0, 10) || '—' }}</p>
            <p>Prepared by: {{ item.prepared_by?.name || '—' }}</p>
          </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div class="bg-blue-50 rounded-xl p-3 text-center">
            <div class="text-xs text-blue-600 mb-1">Salary Month</div>
            <div class="font-bold text-blue-800">{{ item.salary_month || '—' }}</div>
          </div>
          <div class="bg-indigo-50 rounded-xl p-3 text-center">
            <div class="text-xs text-indigo-600 mb-1">Salary Type</div>
            <div class="font-bold text-indigo-800">{{ item.salary_type || '—' }}</div>
          </div>
          <div class="bg-emerald-50 rounded-xl p-3 text-center">
            <div class="text-xs text-emerald-600 mb-1">Total Payrolls</div>
            <div class="font-bold text-emerald-800">{{ item.payrolls?.length ?? '—' }}</div>
          </div>
          <div class="bg-amber-50 rounded-xl p-3 text-center">
            <div class="text-xs text-amber-600 mb-1">Remarks</div>
            <div class="font-medium text-amber-800 text-xs break-words">{{ item.remarks || '—' }}</div>
          </div>
        </div>
      </div>

      <!-- Payrolls Table -->
      <div v-if="item.payrolls?.length" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <div class="px-5 py-3 border-b font-semibold text-blue-800 flex items-center justify-between">
          <span>Payrolls ({{ item.payrolls.length }})</span>
        </div>
        <table class="w-full text-sm">
          <thead class="bg-blue-50 text-blue-900 text-xs uppercase">
            <tr>
              <th class="px-4 py-3 text-left">#</th>
              <th class="px-4 py-3 text-left">Employee</th>
              <th class="px-4 py-3 text-left">Dept.</th>
              <th class="px-4 py-3 text-right">Gross</th>
              <th class="px-4 py-3 text-right">Deductions</th>
              <th class="px-4 py-3 text-right">Net Salary</th>
              <th class="px-4 py-3 text-center">Status</th>
              <th class="px-4 py-3 text-center">View</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="(p, i) in item.payrolls" :key="p.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-4 py-3 text-gray-400 text-xs">{{ i + 1 }}</td>
              <td class="px-4 py-3">
                <div class="font-medium text-blue-900">{{ p.user?.name || '—' }}</div>
                <div class="text-xs text-gray-400">{{ p.user?.employee_id }}</div>
              </td>
              <td class="px-4 py-3 text-gray-500 text-xs">{{ p.user?.department?.name || '—' }}</td>
              <td class="px-4 py-3 text-right font-mono">{{ formatCurrency(p.gross_salary) }}</td>
              <td class="px-4 py-3 text-right font-mono text-red-600">{{ formatCurrency(p.total_deduction) }}</td>
              <td class="px-4 py-3 text-right font-mono font-bold text-emerald-700">{{ formatCurrency(p.net_salary) }}</td>
              <td class="px-4 py-3 text-center"><PayrollStatusBadge :status="p.payment_status" /></td>
              <td class="px-4 py-3 text-center">
                <button @click="router.push({ name: 'PayrollShow', params: { id: p.id } })"
                  class="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors" title="View Payroll">
                  <i class="far fa-eye text-xs"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="bg-gray-50 rounded-xl p-8 text-center text-gray-400">
        <i class="fas fa-folder-open text-3xl mb-2"></i>
        <p>No payrolls in this batch yet.</p>
      </div>

      <div class="flex gap-3">
        <button class="btn-3" @click="router.push({ name: 'PayrollBatchList' })">
          <i class="far fa-list"></i> All Batches
        </button>
      </div>
    </template>

    <div v-else class="bg-gray-50 rounded-xl p-12 text-center text-gray-400">
      <p>Batch not found.</p>
    </div>
  </div>
</template>
