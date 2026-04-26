<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import * as XLSX from 'xlsx'
import { useSalaryStructureStore } from '@/stores/salaryStructure'
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import apiClient from '@/axios'
import { formatCurrency } from '@/utils/currency'
import { normalizeAllowances } from '@/utils/salaryPolicy'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
const router = useRouter()
const toast = useToast()
const structureStore = useSalaryStructureStore()

const { list, loading, error, pagination } = storeToRefs(structureStore)

const filters = ref({
  company_id: '',
  department_id: '',
  line_type: 'all',
  employee_id: '',
  page: 1,
  per_page: 15,
})

const buildCleanParams = () => {
  const params = { ...filters.value }

  if (params.employee_id) {
    params.user_id = params.employee_id
  }

  if (!params.company_id) delete params.company_id
  if (!params.department_id) delete params.department_id
  if (!params.employee_id) delete params.employee_id
  if (!params.user_id) delete params.user_id
  if (!params.line_type || params.line_type === 'all') delete params.line_type

  return params
}

const syncQueryParams = (params) => {
  router.replace({
    query: {
      ...params,
    },
  })
}


const showDeleteModal = ref(false)
const selectedItem = ref(null)
const showAllowanceModal = ref(false)
const selectedAllowanceItem = ref(null)
const exportLoading = ref(false)

async function load() {
 const params = buildCleanParams()

  syncQueryParams(params)

  await structureStore.fetchList(params)
}

onMounted(async () => {
  filters.value = {
    ...filters.value,
    company_id: router.currentRoute.value.query.company_id || '',
    department_id: router.currentRoute.value.query.department_id || '',
    line_type: router.currentRoute.value.query.line_type || 'all',
    employee_id: router.currentRoute.value.query.employee_id || '',
    page: Number(router.currentRoute.value.query.page || 1),
    per_page: Number(router.currentRoute.value.query.per_page || 15),
  }

  await load()
})

const openDelete = (item) => {
  selectedItem.value = item
  showDeleteModal.value = true
}

const closeDelete = () => {
  showDeleteModal.value = false
  selectedItem.value = null
}

const openAllowanceModal = (item) => {
  selectedAllowanceItem.value = item
  showAllowanceModal.value = true
}

const closeAllowanceModal = () => {
  showAllowanceModal.value = false
  selectedAllowanceItem.value = null
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

const onEmployeeFilterChange = (payload = {}) => {
  filters.value = {
    ...filters.value,
    company_id: payload.company_id || '',
    department_id: payload.department_id || '',
    line_type: payload.line_type || 'all',
    employee_id: payload.employee_id || '',
    page: 1,
  }
  load()
}

const resetFilters = () => {
  filters.value = {
    company_id: '',
    department_id: '',
    line_type: 'all',
    employee_id: '',
    page: 1,
    per_page: 15,
  }
  load()
}

const normalizeLineType = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_')
const filteredList = computed(() => list.value || [])

// const filteredList = computed(() => {
//   const companyId = String(filters.value.company_id || '')
//   const departmentId = String(filters.value.department_id || '')
//   const employeeId = String(filters.value.employee_id || '')
//   const lineType = normalizeLineType(filters.value.line_type)

//   return (list.value || []).filter((item) => {
//     const user = item?.user || {}

//     if (companyId && String(user.company_id || user.company?.id || '') !== companyId) {
//       return false
//     }

//     if (departmentId && String(user.department_id || user.department?.id || '') !== departmentId) {
//       return false
//     }

//     if (employeeId && String(item?.user_id || user.id || '') !== employeeId) {
//       return false
//     }

//     // if (lineType && lineType !== 'all') {
//     //   const userType = normalizeLineType(user.type || user.employment_type)
//     //   if (userType !== lineType) return false
//     // }

//     return true
//   })
// })

const hasClientSideRefinement = computed(() => false)

const EMPTY_ALLOWANCE_SUMMARY = {
  allowances: [],
  activeCount: 0,
  total: 0,
}

const toNum = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const calculateAllowanceDisplayTotal = (allowances = []) =>
  Array.isArray(allowances)
    ? allowances.reduce((sum, allowance) => {
        if (!allowance?.is_active) return sum
        return sum + toNum(allowance?.amount)
      }, 0)
    : 0

const allowanceSummaryMap = computed(() => {
  const map = {}

  for (const item of list.value) {
    const allowances = normalizeAllowances(item?.allowances).filter(
      (a) => a.allowance_name || a.allowance_code || Number(a.amount) > 0,
    )

    map[item.id] = {
      allowances,
      activeCount: allowances.filter((a) => a.is_active).length,
      total: calculateAllowanceDisplayTotal(allowances),
    }
  }

  return map
})

const getAllowanceSummary = (item) =>
  allowanceSummaryMap.value?.[item.id] ?? EMPTY_ALLOWANCE_SUMMARY

const selectedAllowanceSummary = computed(() =>
  selectedAllowanceItem.value
    ? getAllowanceSummary(selectedAllowanceItem.value)
    : EMPTY_ALLOWANCE_SUMMARY,
)

const buildExportParams = (page = 1) => {
  const params = {
    page,
    per_page: 200,
  }

  if (filters.value.company_id) params.company_id = filters.value.company_id
  if (filters.value.department_id) params.department_id = filters.value.department_id
  if (filters.value.line_type && filters.value.line_type !== 'all') {
    params.line_type = filters.value.line_type
  }
  if (filters.value.employee_id) {
    params.employee_id = filters.value.employee_id
    params.user_id = filters.value.employee_id
  }

  return params
}

const fetchAllStructuresForExport = async () => {
  const allRows = []
  let page = 1
  let lastPage = 1

  do {
    const response = await apiClient.get('/salary-structures', { params: buildExportParams(page) })
    const payload = response?.data

    if (Array.isArray(payload?.data)) {
      allRows.push(...payload.data)
      lastPage = Number(payload.last_page || 1)
    } else if (Array.isArray(payload)) {
      allRows.push(...payload)
      break
    } else {
      break
    }

    page += 1
  } while (page <= lastPage)

  return allRows
}

const toAllowanceDetailText = (allowance) => {
  const name = allowance.allowance_name || 'Additional Allowance'
  const code = allowance.allowance_code || 'No code'
  const amount = formatCurrency(allowance.amount || 0)
  const status = allowance.is_active ? 'Active' : 'Inactive'
  const remarks = allowance.remarks ? ` | Remarks: ${allowance.remarks}` : ''
  return `${name} (${code}) - ${amount} [${status}]${remarks}`
}

const exportExcel = async () => {
  try {
    exportLoading.value = true
    const rows = await fetchAllStructuresForExport()
    const exportRows = rows.filter((item) => {
      const user = item?.user || {}
      const companyId = String(filters.value.company_id || '')
      const departmentId = String(filters.value.department_id || '')
      const employeeId = String(filters.value.employee_id || '')
      const lineType = normalizeLineType(filters.value.line_type)

      if (companyId && String(user.company_id || user.company?.id || '') !== companyId) return false
      if (departmentId && String(user.department_id || user.department?.id || '') !== departmentId) {
        return false
      }
      if (employeeId && String(item?.user_id || user.id || '') !== employeeId) return false
      if (lineType && lineType !== 'all') {
        const userType = normalizeLineType(user.type || user.employment_type)
        if (userType !== lineType) return false
      }

      return true
    })

    if (!exportRows.length) {
      toast.info('No salary structure found for export.')
      return
    }

    const mainSheetRows = []
    const allowanceSheetRows = []

    exportRows.forEach((item) => {
      const allowances = normalizeAllowances(item?.allowances).filter(
        (a) => a.allowance_name || a.allowance_code || Number(a.amount) > 0,
      )
      const activeAllowances = allowances.filter((a) => a.is_active)
      const allowanceTotal = calculateAllowanceDisplayTotal(allowances)

      mainSheetRows.push({
        ID: item.id,
        Employee_Name: item.user?.name || '',
        Employee_ID: item.user?.employee_id || '',
        Company: item.user?.company?.name || '',
        Department: item.user?.department?.name || '',
        Designation: item.user?.designation?.title || '',
        Basic: Number(item.basic_salary || 0),
        House_Rent: Number(item.house_rent || 0),
        Medical: Number(item.medical_allowance || 0),
        Conveyance: Number(item.conveyance_allowance || 0),
        Allowance_Count: allowances.length,
        Active_Allowance_Count: activeAllowances.length,
        Allowance_Total: Number(allowanceTotal || 0),
        Allowance_Details: allowances
          .map((allowance) => toAllowanceDetailText(allowance))
          .join('\n'),
        PF_Deduction:
          item.pf_deduction != null
            ? Number(item.pf_deduction)
            : item.pf_percent != null && item.basic_salary != null
              ? (Number(item.basic_salary) * Number(item.pf_percent)) / 100
              : '',
        Gross_Salary: Number(item.gross_salary || 0),
        Effective_From: item.effective_from || '',
        Status: item.is_active ? 'Active' : 'Inactive',
      })

      if (!allowances.length) {
        allowanceSheetRows.push({
          Structure_ID: item.id,
          Employee_Name: item.user?.name || '',
          Employee_ID: item.user?.employee_id || '',
          Allowance_Name: '',
          Allowance_Code: '',
          Amount: '',
          Status: '',
          Remarks: '',
          Effective_From: item.effective_from || '',
        })
      } else {
        allowances.forEach((allowance) => {
          allowanceSheetRows.push({
            Structure_ID: item.id,
            Employee_Name: item.user?.name || '',
            Employee_ID: item.user?.employee_id || '',
            Allowance_Name: allowance.allowance_name || '',
            Allowance_Code: allowance.allowance_code || '',
            Amount: Number(allowance.amount || 0),
            Status: allowance.is_active ? 'Active' : 'Inactive',
            Remarks: allowance.remarks || '',
            Effective_From: item.effective_from || '',
          })
        })
      }
    })

    const workbook = XLSX.utils.book_new()
    const mainSheet = XLSX.utils.json_to_sheet(mainSheetRows)
    const allowanceSheet = XLSX.utils.json_to_sheet(allowanceSheetRows)

    XLSX.utils.book_append_sheet(workbook, mainSheet, 'Salary Structures')
    XLSX.utils.book_append_sheet(workbook, allowanceSheet, 'Allowance Details')

    const dateStamp = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(workbook, `salary-structures-full-${dateStamp}.xlsx`)
    toast.success('Excel downloaded successfully.')
  } catch (e) {
    toast.error(e?.message || 'Failed to export salary structures.')
  } finally {
    exportLoading.value = false
  }
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
      <EmployeeFilter
        :company_id="filters.company_id"
        :department_id="filters.department_id"
        :line_type="filters.line_type"
        :employee_id="filters.employee_id"
        @update:company_id="(value) => (filters.company_id = value)"
        @update:department_id="(value) => (filters.department_id = value)"
        @update:line_type="(value) => (filters.line_type = value)"
        @update:employee_id="(value) => (filters.employee_id = value)"
        @filter-change="onEmployeeFilterChange"
      >
        <div class="flex items-end justify-end gap-2">
          <button class="btn-3" @click="resetFilters"><i class="far fa-undo"></i> Reset</button>
          <button class="btn-2" :disabled="exportLoading" @click="exportExcel">
            <i class="far fa-file-excel"></i>
            {{ exportLoading ? 'Exporting...' : 'Export Excel' }}
          </button>
        </div>
      </EmployeeFilter>
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
      v-else-if="!filteredList.length"
      class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center"
    >
      <i class="fas fa-file-invoice-dollar text-4xl text-gray-300 mb-3"></i>
      <p class="text-lg font-medium text-gray-500">No salary structures found</p>
      <p class="text-sm text-gray-400 mt-1">Add a salary structure to get started</p>
      <button class="btn-2 mt-4" @click="router.push({ name: 'PayrollSalaryStructureCreate' })">
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
            <th class="px-4 py-3 text-left">Department</th>
            <th class="px-4 py-3 text-right">Basic</th>
            <th class="px-4 py-3 text-right">H.Rent</th>
            <th class="px-4 py-3 text-right">Medical</th>
            <th class="px-4 py-3 text-right">Conveyance</th>
            <th class="px-4 py-3 text-right">Allowances</th>
            <th class="px-4 py-3 text-right">Revisions</th>
            <th class="px-4 py-3 text-right">PF</th>
            <th class="px-4 py-3 text-right">Gross</th>
            <th class="px-4 py-3 text-center">Effective From</th>
            <th class="px-4 py-3 text-center">Status</th>
            <th class="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="(item, i) in filteredList" :key="item.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-3 text-gray-400 text-xs">
              {{ (filters.page - 1) * filters.per_page + i + 1 }}
            </td>
            <td class="px-4 py-3 min-w-[230px]">
              <div class="font-medium text-blue-900">{{ item.user?.name || '—' }}</div>
              <div class="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  class="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-600"
                >
                  ID: {{ item.user?.employee_id || '-' }}
                </span>
                <span
                  class="inline-flex items-center rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-500"
                >
                  Join: {{ item.user?.joining_date || '-' }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="text-xs text-gray-400">{{ item.user?.department?.name }}</div>
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
            <td class="px-4 py-3 text-right">
              <div class="inline-flex  flex-col items-end gap-1.5">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 transition-colors"
                  :class="
                    getAllowanceSummary(item).allowances.length
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                  "
                  :disabled="!getAllowanceSummary(item).allowances.length"
                  @click="openAllowanceModal(item)"
                >
                  <span class="font-mono font-semibold">
                    {{ formatCurrency(getAllowanceSummary(item).total) }}
                  </span>
                  <i class="far fa-eye text-xs"></i>
                </button>
                <div
                  v-if="!getAllowanceSummary(item).allowances.length"
                  class="text-xs text-slate-400"
                >
                  No allowance
                </div>
              </div>
            </td>
            <td class="px-4 py-3 text-right font-mono text-gray-700 ">
              <div class="min-w-[66px] flex flex-col items-end gap-1.5">
                  <span class="text-xs"> {{ item.latest_revision?.effective_month }}</span>
                  <span class="text-green-500">{{ item.latest_revision?.increment_value}}</span>
              </div>
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
                      name: 'PayrollSalaryRevisionCreate',
                      query: {
                        company_id: item.user?.company_id,
                        department_id: item.user?.department_id,
                        line_type: item.user?.type || 'executive',
                        employee_id: item.user?.id,
                        user_id: item.user?.id,
                      },
                    })
                  "
                  class="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-700 transition hover:border-cyan-300 hover:bg-cyan-100 hover:text-cyan-800"
                  title="Create Salary Revision"
                >
                  <i class="far fa-sync-alt text-[11px]"></i>
                  <span class="text-[11px]">Revision</span>
                </button>
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
      :total="hasClientSideRefinement ? filteredList.length : pagination.total || filteredList.length"
      :last-page="hasClientSideRefinement ? 1 : pagination.last_page || 1"
      @page-change="handlePageChange"
    />

    <DeleteModal
      :show="showDeleteModal"
      title="Delete Salary Structure"
      :message="`Are you sure you want to delete the salary structure for ${selectedItem?.user?.name || 'this employee'}?`"
      @close="closeDelete"
      @confirm="handleDelete"
    />

    <div
      v-if="showAllowanceModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeAllowanceModal"
    >
      <div
        class="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-xl border border-gray-200"
      >
        <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h3 class="text-base font-semibold text-gray-800">Allowance Details</h3>
            <p class="text-xs text-gray-500 mt-0.5">
              {{ selectedAllowanceItem?.user?.name || '-' }} ({{
                selectedAllowanceItem?.user?.employee_id || '-'
              }})
            </p>
          </div>
          <button
            class="text-gray-400 hover:text-gray-700"
            title="Close"
            @click="closeAllowanceModal"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="px-5 py-4 space-y-4 overflow-y-auto max-h-[calc(90vh-73px)]">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
              <p class="text-xs text-blue-700">Total Allowance</p>
              <p class="text-sm font-semibold text-blue-900 font-mono">
                {{ formatCurrency(selectedAllowanceSummary.total) }}
              </p>
            </div>
            <div class="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
              <p class="text-xs text-emerald-700">Active</p>
              <p class="text-sm font-semibold text-emerald-900">
                {{ selectedAllowanceSummary.activeCount }}
              </p>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p class="text-xs text-slate-600">Total Items</p>
              <p class="text-sm font-semibold text-slate-900">
                {{ selectedAllowanceSummary.allowances.length }}
              </p>
            </div>
          </div>

          <div
            v-if="!selectedAllowanceSummary.allowances.length"
            class="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500"
          >
            No additional allowance found for this salary structure.
          </div>

          <div v-else class="overflow-x-auto rounded-lg border border-slate-200">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 text-slate-700 text-xs uppercase">
                <tr>
                  <th class="px-3 py-2 text-left">Name</th>
                  <th class="px-3 py-2 text-left">Code</th>
                  <th class="px-3 py-2 text-right">Amount</th>
                  <th class="px-3 py-2 text-center">Status</th>
                  <th class="px-3 py-2 text-left">Remarks</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="(allowance, idx) in selectedAllowanceSummary.allowances"
                  :key="`${idx}-${allowance.allowance_code}-${allowance.allowance_name}`"
                >
                  <td class="px-3 py-2 text-slate-800">
                    {{ allowance.allowance_name || 'Additional Allowance' }}
                  </td>
                  <td class="px-3 py-2 text-slate-500">{{ allowance.allowance_code || '-' }}</td>
                  <td class="px-3 py-2 text-right font-mono text-slate-800">
                    {{ formatCurrency(allowance.amount) }}
                  </td>
                  <td class="px-3 py-2 text-center">
                    <span
                      class="px-2 py-0.5 rounded-full text-xs border font-medium"
                      :class="
                        allowance.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      "
                    >
                      {{ allowance.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td class="px-3 py-2 text-slate-500">{{ allowance.remarks || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
