<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { useSalaryStructureStore } from '@/stores/salaryStructure'
import { useCompanyStore } from '@/stores/company'
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import { formatCurrency } from '@/utils/currency'

const router = useRouter()
const toast = useToast()
const structureStore = useSalaryStructureStore()
const companyStore = useCompanyStore()

const { list, loading, error, pagination } = storeToRefs(structureStore)
const { companies } = storeToRefs(companyStore)

const filters = ref({ company_id: '', search: '', page: 1, per_page: 15 })
const showDeleteModal = ref(false)
const selectedItem = ref(null)

async function load() {
  const params = { ...filters.value }
  if (!params.company_id) delete params.company_id
  if (!params.search) delete params.search
  await structureStore.fetchList(params)
}

onMounted(async () => {
  await Promise.all([companyStore.fetchCompanies(), load()])
})

const openDelete = (item) => {
  selectedItem.value = item
  showDeleteModal.value = true
}

const closeDelete = () => {
  showDeleteModal.value = false
  selectedItem.value = null
}

const handleDelete = async () => {
  try {
    await structureStore.deleteItem(selectedItem.value.id)
    toast.success('Salary structure deleted.')
    closeDelete()
  } catch (e) {
    toast.error(e.message)
    closeDelete()
  }
}

const handlePageChange = (p) => {
  filters.value.page = p
  load()
}

const applyFilters = () => {
  filters.value.page = 1
  load()
}

const resetFilters = () => {
  filters.value = { company_id: '', search: '', page: 1, per_page: 15 }
  load()
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-4">
    <HeaderWithButtons
      title="Salary Structures"
      right-button-label="Add Structure"
      @add="router.push({ name: 'PayrollSalaryStructureCreate' })"
    />

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div class="flex flex-wrap gap-3 items-end">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Company</label>
          <select
            v-model="filters.company_id"
            @change="applyFilters"
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Companies</option>
            <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Search Employee</label>
          <input
            v-model="filters.search"
            @input="applyFilters"
            type="text"
            placeholder="Name or employee ID..."
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-52"
          />
        </div>
        <button class="btn-3" @click="resetFilters">
          <i class="far fa-undo"></i> Reset
        </button>
      </div>
    </div>

    <!-- Loading -->
    <LoaderView v-if="loading" />

    <!-- Error -->
    <div
      v-else-if="error"
      class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-center gap-2 text-sm"
    >
      <i class="fas fa-exclamation-circle"></i> {{ error }}
    </div>

    <!-- Empty -->
    <div
      v-else-if="!list.length"
      class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center"
    >
      <i class="fas fa-file-invoice-dollar text-4xl text-gray-300 mb-3"></i>
      <p class="text-lg font-medium text-gray-500">No salary structures found</p>
      <p class="text-sm text-gray-400 mt-1">
        Add a salary structure to get started
      </p>
      <button
        class="btn-2 mt-4"
        @click="router.push({ name: 'PayrollSalaryStructureCreate' })"
      >
        <i class="far fa-plus"></i> Add Salary Structure
      </button>
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-blue-50 text-blue-900 text-xs uppercase">
          <tr>
            <th class="px-4 py-3 text-left">#</th>
            <th class="px-4 py-3 text-left">Employee</th>
            <th class="px-4 py-3 text-right">Basic</th>
            <th class="px-4 py-3 text-right">House Rent</th>
            <th class="px-4 py-3 text-right">Medical</th>
            <th class="px-4 py-3 text-right">Conveyance</th>
            <th class="px-4 py-3 text-right">PF Deduction</th>
            <th class="px-4 py-3 text-right">Gross Salary</th>
            <th class="px-4 py-3 text-center">Effective From</th>
            <th class="px-4 py-3 text-center">Status</th>
            <th class="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr
            v-for="(item, i) in list"
            :key="item.id"
            class="hover:bg-gray-50 transition-colors"
          >
            <td class="px-4 py-3 text-gray-400 text-xs">
              {{ (filters.page - 1) * filters.per_page + i + 1 }}
            </td>
            <td class="px-4 py-3">
              <div class="font-medium text-blue-900">{{ item.user?.name || '—' }}</div>
              <div class="text-xs text-gray-400">{{ item.user?.employee_id }}</div>
            </td>
            <td class="px-4 py-3 text-right font-mono text-gray-700">
              {{ formatCurrency(item.basic_salary) }}
            </td>
            <td class="px-4 py-3 text-right font-mono text-gray-700">
              {{ formatCurrency(item.house_rent) }}
            </td>
            <td class="px-4 py-3 text-right font-mono text-gray-700">
              {{ formatCurrency(item.medical_allowance) }}
            </td>
            <td class="px-4 py-3 text-right font-mono text-gray-700">
              {{ formatCurrency(item.conveyance_allowance) }}
            </td>
            <td class="px-4 py-3 text-right font-mono text-gray-700">
              {{
                item.pf_deduction != null
                  ? formatCurrency(item.pf_deduction)
                  : item.pf_percent != null && item.basic_salary != null
                    ? formatCurrency((Number(item.basic_salary) * Number(item.pf_percent)) / 100)
                    : '—'
              }}
            </td>
            <td class="px-4 py-3 text-right font-mono font-semibold text-blue-700">
              {{ formatCurrency(item.gross_salary) }}
            </td>
            <td class="px-4 py-3 text-center text-gray-600 text-xs">
              {{ item.effective_from || '—' }}
            </td>
            <td class="px-4 py-3 text-center">
              <span
                class="px-2 py-0.5 rounded-full text-xs border font-medium"
                :class="
                  item.is_active
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200'
                "
              >
                {{ item.is_active ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="px-4 py-3 text-center">
              <div class="flex items-center justify-center gap-1">
                <button
                  @click="
                    router.push({
                      name: 'PayrollSalaryStructureEdit',
                      params: { id: item.id },
                    })
                  "
                  class="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <i class="far fa-edit text-xs"></i>
                </button>
                <button
                  @click="openDelete(item)"
                  class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <i class="far fa-trash-alt text-xs"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <PaginationBar
      v-if="pagination.total > 0"
      :page="pagination.current_page || filters.page"
      :per-page="pagination.per_page || filters.per_page"
      :total="pagination.total || list.length"
      :last-page="pagination.last_page || 1"
      @page-change="handlePageChange"
    />

    <DeleteModal
      :show="showDeleteModal"
      title="Delete Salary Structure"
      :message="`Are you sure you want to delete the salary structure for ${selectedItem?.user?.name || 'this employee'}?`"
      @close="closeDelete"
      @confirm="handleDelete"
    />
  </div>
</template>
