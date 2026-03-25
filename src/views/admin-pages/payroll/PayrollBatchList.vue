<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { usePayrollBatchStore } from '@/stores/payrollBatch'
import { useCompanyStore } from '@/stores/company'
import LoaderView from '@/components/common/LoaderView.vue'
import PaginationBar from '@/components/PaginationBar.vue'

const router = useRouter()
const batchStore = usePayrollBatchStore()
const companyStore = useCompanyStore()

const { list, loading, error, pagination, apiUnavailable } = storeToRefs(batchStore)
const { companies } = storeToRefs(companyStore)

const filters = ref({ company_id: '', salary_month: '', page: 1, per_page: 15 })

async function load() {
  const params = { ...filters.value }
  if (!params.company_id) delete params.company_id
  if (!params.salary_month) delete params.salary_month
  await batchStore.fetchList(params)
}

onMounted(async () => {
  await Promise.all([companyStore.fetchCompanies(), load()])
})
</script>

<template>
  <div class="p-4 md:p-6 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <h1 class="title-md md:title-lg">Payroll Batches</h1>
      <button class="btn-2" :disabled="apiUnavailable" :class="{ 'opacity-60 cursor-not-allowed': apiUnavailable }" @click="router.push({ name: 'PayrollBatchGenerate' })">
        <i class="far fa-cog"></i>
        <span class="hidden md:flex">Generate Payroll</span>
      </button>
    </div>

    <div v-if="apiUnavailable" class="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-4 text-sm flex items-center gap-2">
      <i class="fas fa-info-circle"></i>
      Payroll batch API এখনো backend এ build করা হয়নি. এই অংশ আপাতত disabled রাখা হয়েছে.
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
        <input v-model="filters.salary_month" type="month"
          @change="() => { filters.page = 1; load() }"
          class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      <button class="btn-3" @click="() => { filters = { company_id: '', salary_month: '', page: 1, per_page: 15 }; load() }">
        <i class="far fa-undo"></i> Reset
      </button>
    </div>

    <LoaderView v-if="loading" />

    <div v-else-if="error"
      class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2">
      <i class="fas fa-exclamation-circle"></i> {{ error }}
    </div>

    <div v-else-if="!list.length" class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
      <i class="fas fa-layer-group text-4xl text-gray-300 mb-3"></i>
      <p class="text-lg font-medium text-gray-500">{{ apiUnavailable ? 'Payroll batch module is not active yet' : 'No payroll batches found' }}</p>
      <button class="btn-2 mt-4" :disabled="apiUnavailable" :class="{ 'opacity-60 cursor-not-allowed': apiUnavailable }" @click="router.push({ name: 'PayrollBatchGenerate' })">
        <i class="far fa-cog"></i> Generate Payroll
      </button>
    </div>

    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-blue-50 text-blue-900 text-xs uppercase">
          <tr>
            <th class="px-4 py-3 text-left">#</th>
            <th class="px-4 py-3 text-left">Batch ID</th>
            <th class="px-4 py-3 text-left">Company</th>
            <th class="px-4 py-3 text-center">Salary Month</th>
            <th class="px-4 py-3 text-center">Salary Type</th>
            <th class="px-4 py-3 text-left">Prepared By</th>
            <th class="px-4 py-3 text-center">Generated At</th>
            <th class="px-4 py-3 text-center">Payrolls</th>
            <th class="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="(batch, i) in list" :key="batch.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-3 text-gray-400 text-xs">{{ (filters.page - 1) * filters.per_page + i + 1 }}</td>
            <td class="px-4 py-3 font-mono text-blue-700 font-medium">#{{ batch.id }}</td>
            <td class="px-4 py-3 font-medium">{{ batch.company?.name || '—' }}</td>
            <td class="px-4 py-3 text-center">{{ batch.salary_month || '—' }}</td>
            <td class="px-4 py-3 text-center">
              <span class="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-medium">
                {{ batch.salary_type || '—' }}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-600">{{ batch.prepared_by?.name || '—' }}</td>
            <td class="px-4 py-3 text-center text-gray-500 text-xs">{{ batch.created_at?.slice(0, 10) || '—' }}</td>
            <td class="px-4 py-3 text-center">
              <span class="font-semibold text-blue-800">{{ batch.payrolls_count ?? (batch.payrolls?.length ?? '—') }}</span>
            </td>
            <td class="px-4 py-3 text-center">
              <button @click="router.push({ name: 'PayrollBatchShow', params: { id: batch.id } })"
                class="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors" title="View">
                <i class="far fa-eye text-xs"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <PaginationBar v-if="pagination.total > 0" :page="pagination.current_page || filters.page"
      :per-page="pagination.per_page || filters.per_page" :total="pagination.total || list.length"
      :last-page="pagination.last_page || 1"
      @page-change="(p) => { filters.page = p; load() }" />
  </div>
</template>
