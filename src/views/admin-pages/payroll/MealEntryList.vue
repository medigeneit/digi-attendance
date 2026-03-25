<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { useMealEntryStore } from '@/stores/mealEntry'
import { useCompanyStore } from '@/stores/company'
import LoaderView from '@/components/common/LoaderView.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import AsyncUserCombobox from '@/components/common/AsyncUserCombobox.vue'
import apiClient from '@/axios'
import { toNum, formatCurrency } from '@/utils/currency'

const toast = useToast()
const mealStore = useMealEntryStore()
const companyStore = useCompanyStore()

const { list, loading, error, pagination } = storeToRefs(mealStore)
const { companies } = storeToRefs(companyStore)

const filters = ref({
  salary_month: new Date().toISOString().slice(0, 7),
  company_id: '',
  user_id: '',
  page: 1,
  per_page: 15,
})

// Modal state
const showModal = ref(false)
const showDeleteModal = ref(false)
const selectedItem = ref(null)
const modalSubmitting = ref(false)
const modalErrors = ref({})

const blankForm = () => ({
  user_id: null,
  salary_month: filters.value.salary_month,
  meal_rate: '',
  total_meal: '',
  additional_amount: '',
  remarks: '',
})

const modalForm = ref(blankForm())
const modalUserDisplay = ref({ name: null, dept: null })
const isEditMode = computed(() => !!selectedItem.value?.id)

// Computed preview
const baseAmountPreview = computed(() => {
  const r = toNum(modalForm.value.meal_rate)
  const m = toNum(modalForm.value.total_meal)
  return r * m
})

const totalAmountPreview = computed(() => {
  return baseAmountPreview.value + toNum(modalForm.value.additional_amount)
})

const fetchUsersFn = (params) =>
  apiClient
    .get('/users', { params })
    .then((r) => (Array.isArray(r.data) ? r.data : r.data?.data || r.data?.users || []))

async function load() {
  const params = { ...filters.value }
  if (!params.company_id) delete params.company_id
  if (!params.user_id) delete params.user_id
  await mealStore.fetchList(params)
}

onMounted(async () => {
  await Promise.all([companyStore.fetchCompanies(), load()])
})

const applyFilters = () => {
  filters.value.page = 1
  load()
}

// Warn when meal_rate changes (affects all in that month)
const showRateWarn = ref(false)
watch(
  () => modalForm.value.meal_rate,
  (newVal, oldVal) => {
    if (isEditMode.value && oldVal !== '' && newVal !== oldVal) {
      showRateWarn.value = true
    }
  },
)

const openCreate = () => {
  selectedItem.value = null
  modalForm.value = blankForm()
  modalUserDisplay.value = { name: null, dept: null }
  modalErrors.value = {}
  showRateWarn.value = false
  showModal.value = true
}

const openEdit = (item) => {
  selectedItem.value = item
  modalForm.value = {
    user_id: item.user_id,
    salary_month: item.salary_month,
    meal_rate: item.meal_rate ?? '',
    total_meal: item.total_meal ?? '',
    additional_amount: item.additional_amount ?? '',
    remarks: item.remarks || '',
  }
  modalUserDisplay.value = item.user
    ? { name: item.user.name, dept: item.user.department?.name || null }
    : { name: null, dept: null }
  modalErrors.value = {}
  showRateWarn.value = false
  showModal.value = true
}

const openDelete = (item) => {
  selectedItem.value = item
  showDeleteModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedItem.value = null
}

const validateModal = () => {
  const errors = {}
  if (!modalForm.value.user_id) errors.user_id = 'Employee is required.'
  if (!modalForm.value.salary_month) errors.salary_month = 'Salary month is required.'
  if (modalForm.value.meal_rate === '' || isNaN(parseFloat(modalForm.value.meal_rate)))
    errors.meal_rate = 'Meal rate is required.'
  if (modalForm.value.total_meal === '' || isNaN(parseFloat(modalForm.value.total_meal)))
    errors.total_meal = 'Total meal count is required.'
  modalErrors.value = errors
  return !Object.keys(errors).length
}

const handleModalSubmit = async () => {
  if (!validateModal()) return
  modalSubmitting.value = true
  try {
    const payload = { ...modalForm.value }
    payload.meal_rate = toNum(payload.meal_rate)
    payload.total_meal = toNum(payload.total_meal)
    payload.additional_amount =
      payload.additional_amount === '' || payload.additional_amount === null
        ? null
        : toNum(payload.additional_amount)
    const subTotal = parseFloat(
      (payload.meal_rate * payload.total_meal + toNum(payload.additional_amount)).toFixed(2)
    )
    payload.sub_total = subTotal
    payload.total_amount = subTotal

    if (isEditMode.value) {
      await mealStore.updateItem(selectedItem.value.id, payload)
      toast.success('Meal entry updated.')
    } else {
      await mealStore.createItem(payload)
      toast.success('Meal entry created.')
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
    await mealStore.deleteItem(selectedItem.value.id)
    toast.success('Meal entry deleted.')
    showDeleteModal.value = false
    selectedItem.value = null
    load()
  } catch (e) {
    toast.error(e.message)
  }
}

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'
</script>

<template>
  <div class="p-4 md:p-6 space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between gap-2">
      <h1 class="title-md md:title-lg">Meal Entries</h1>
      <button class="btn-2" @click="openCreate">
        <i class="far fa-plus"></i>
        <span class="hidden md:flex">Add Meal Entry</span>
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div class="flex flex-wrap gap-3 items-end">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Month</label>
          <input
            v-model="filters.salary_month"
            type="month"
            @change="applyFilters"
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
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
        <button
          class="btn-3"
          @click="
            () => {
              filters = {
                salary_month: new Date().toISOString().slice(0, 7),
                company_id: '',
                user_id: '',
                page: 1,
                per_page: 15,
              }
              load()
            }
          "
        >
          <i class="far fa-undo"></i> Reset
        </button>
      </div>
    </div>

    <!-- Info Note -->
    <div
      class="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-3 flex items-start gap-2 text-xs"
    >
      <i class="fas fa-info-circle mt-0.5 text-blue-400"></i>
      <span>
        <strong>Meal Rate is common per month.</strong> Updating the meal rate for any entry within
        a month will apply to all entries for that month.
      </span>
    </div>

    <LoaderView v-if="loading" />

    <div
      v-else-if="error"
      class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-center gap-2 text-sm"
    >
      <i class="fas fa-exclamation-circle"></i> {{ error }}
    </div>

    <div
      v-else-if="!list.length"
      class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center"
    >
      <i class="fas fa-utensils text-4xl text-gray-300 mb-3"></i>
      <p class="text-lg font-medium text-gray-500">No meal entries found</p>
      <p class="text-sm text-gray-400 mt-1">for {{ filters.salary_month }}</p>
      <button class="btn-2 mt-4" @click="openCreate">
        <i class="far fa-plus"></i> Add Meal Entry
      </button>
    </div>

    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-blue-50 text-blue-900 text-xs uppercase">
          <tr>
            <th class="px-4 py-3 text-left">#</th>
            <th class="px-4 py-3 text-left">Employee</th>
            <th class="px-4 py-3 text-center">Month</th>
            <th class="px-4 py-3 text-right">Meal Rate</th>
            <th class="px-4 py-3 text-right">Total Meals</th>
            <th class="px-4 py-3 text-right">Total Amount</th>
            <th class="px-4 py-3 text-left">Remarks</th>
            <th class="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="(item, i) in list" :key="item.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-3 text-gray-400 text-xs">
              {{ (filters.page - 1) * filters.per_page + i + 1 }}
            </td>
            <td class="px-4 py-3">
              <div class="font-medium text-blue-900">{{ item.user?.name || '—' }}</div>
              <div class="text-xs text-gray-400">{{ item.user?.employee_id }}</div>
            </td>
            <td class="px-4 py-3 text-center font-medium">{{ item.salary_month }}</td>
            <td class="px-4 py-3 text-right font-mono">{{ formatCurrency(item.meal_rate) }}</td>
            <td class="px-4 py-3 text-right font-mono">{{ item.total_meal }}</td>
            <td class="px-4 py-3 text-right font-mono font-semibold text-blue-700">
              {{ formatCurrency(item.total_amount) }}
            </td>
            <td class="px-4 py-3 text-gray-500 text-xs">{{ item.remarks || '—' }}</td>
            <td class="px-4 py-3 text-center">
              <div class="flex items-center justify-center gap-1">
                <button
                  @click="openEdit(item)"
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
      @page-change="(p) => { filters.page = p; load() }"
    />

    <!-- Create/Edit Modal -->
    <teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
          <div class="flex items-center justify-between px-6 py-4 border-b">
            <h3 class="font-bold text-blue-900 text-lg">
              {{ isEditMode ? 'Edit Meal Entry' : 'Add Meal Entry' }}
            </h3>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <form @submit.prevent="handleModalSubmit" class="p-6 space-y-4">
            <!-- Meal rate warning -->
            <div
              v-if="showRateWarn"
              class="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 flex items-start gap-2 text-xs"
            >
              <i class="fas fa-exclamation-triangle mt-0.5 text-amber-500"></i>
              <span>
                Changing the meal rate will update the common rate for
                <strong>all meal entries in {{ modalForm.salary_month }}</strong>.
              </span>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Employee <span class="text-red-500">*</span>
              </label>
              <AsyncUserCombobox
                v-model="modalForm.user_id"
                v-model:display="modalUserDisplay"
                :fetcher="fetchUsersFn"
                placeholder="Search employee..."
              />
              <p v-if="modalErrors.user_id" class="text-red-500 text-xs mt-1">
                {{ modalErrors.user_id }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Salary Month <span class="text-red-500">*</span>
              </label>
              <input v-model="modalForm.salary_month" type="month" :class="inputClass" />
              <p v-if="modalErrors.salary_month" class="text-red-500 text-xs mt-1">
                {{ modalErrors.salary_month }}
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Meal Rate <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="modalForm.meal_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  :class="inputClass"
                  placeholder="0.00"
                />
                <p v-if="modalErrors.meal_rate" class="text-red-500 text-xs mt-1">
                  {{ modalErrors.meal_rate }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Total Meals <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="modalForm.total_meal"
                  type="number"
                  min="0"
                  step="1"
                  :class="inputClass"
                  placeholder="0"
                />
                <p v-if="modalErrors.total_meal" class="text-red-500 text-xs mt-1">
                  {{ modalErrors.total_meal }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Additional Amount</label>
                <input
                  v-model="modalForm.additional_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  :class="inputClass"
                  placeholder="0.00"
                />
                <p class="text-xs text-gray-400 mt-1">Optional special meal charge.</p>
              </div>
            </div>

            <!-- Read-only preview -->
            <div class="bg-blue-50 rounded-lg px-4 py-3 border border-blue-100 space-y-1.5">
              <div class="flex items-center justify-between text-xs text-blue-700">
                <span>Base (Rate × Meal)</span>
                <span class="font-mono">{{ formatCurrency(baseAmountPreview) }}</span>
              </div>
              <div class="flex items-center justify-between text-xs text-blue-700">
                <span>Additional Amount</span>
                <span class="font-mono">{{ formatCurrency(toNum(modalForm.additional_amount)) }}</span>
              </div>
              <div class="h-px bg-blue-200"></div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-blue-700 font-medium">Sub Total (Save হবে)</span>
                <span class="font-mono font-bold text-blue-800">
                  {{ formatCurrency(totalAmountPreview) }}
                </span>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <input
                v-model="modalForm.remarks"
                type="text"
                :class="inputClass"
                placeholder="Optional..."
              />
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button type="button" class="btn-3" @click="closeModal">Cancel</button>
              <button type="submit" class="btn-2" :disabled="modalSubmitting">
                <i
                  class="far"
                  :class="modalSubmitting ? 'fa-spinner fa-spin' : isEditMode ? 'fa-save' : 'fa-plus'"
                ></i>
                {{ modalSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Entry' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </teleport>

    <DeleteModal
      :show="showDeleteModal"
      title="Delete Meal Entry"
      :message="`Delete meal entry for ${selectedItem?.user?.name} (${selectedItem?.salary_month})?`"
      @close="showDeleteModal = false"
      @confirm="handleDelete"
    />
  </div>
</template>
