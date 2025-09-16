<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useKpiAssignmentsStore } from '@/stores/monthly-kpi-assignments'
import { storeToRefs } from 'pinia'
import { ref, onMounted, computed } from 'vue'
import { useToast } from 'vue-toastification'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import { useRoute, useRouter } from 'vue-router'

const toast = useToast()
const route = useRoute()
const router = useRouter()

const store = useKpiAssignmentsStore()
const { items, isLoading, isSaving, error } = storeToRefs(store)

/* ---------- Filters (from URL if present) ---------- */
const filters = ref({
  company_id:    route.query.company_id ? Number(route.query.company_id) : '',
  department_id: route.query.department_id ? Number(route.query.department_id) : '',
  employee_id:   route.query.employee_id ? Number(route.query.employee_id) : '',
  line_type:     route.query.line_type ?? '', // 'all' | 'executive' | ...
})
const hasOrg = computed(() => !!filters.value.company_id && !!filters.value.department_id)
const hasFilters = computed(() => hasOrg.value || !!filters.value.employee_id || !!filters.value.line_type)
const isBusy = computed(() => isLoading.value || isSaving.value)

/* ---------- Create form (employee auto-map) ---------- */
const today = new Date().toISOString().slice(0, 10)
const form = ref({
  user_id: filters.value.employee_id || '',
  monthly_kpi_form_id: '',
  assigned_from: today,
  assigned_to: '',
  assigned_by: '',
  active: true,
})

/* ---------- Fetcher ---------- */
async function fetchAll() {
  if (!hasOrg.value) {
    items.value = []
    return
  }
  const params = {
    company_id: Number(filters.value.company_id),
    department_id: Number(filters.value.department_id),
    line_type: filters.value.line_type || undefined,
    user_id: filters.value.employee_id || undefined, // চাইলে নির্দিষ্ট ইউজার
  }
  try {
    await store.fetchList(params) // <- স্টোরে এই params নেবেন
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to load assignments')
  }
}

/* ---------- EmployeeFilter hooks + URL sync ---------- */
function onEmpFilterChange() {
  form.value.user_id = filters.value.employee_id || ''
  syncUrl()
}
function syncUrl() {
  router.replace({
    query: {
      company_id: filters.value.company_id || undefined,
      department_id: filters.value.department_id || undefined,
      line_type: filters.value.line_type || undefined,
      employee_id: filters.value.employee_id || undefined,
    },
  }).catch(() => {})
}

/* ---------- Actions ---------- */
async function search() {
  if (!hasOrg.value) return toast.error('Select Company & Department')
  await fetchAll()
  syncUrl()
}
async function resetFilters() {
  filters.value = { company_id: '', department_id: '', employee_id: '', line_type: '' }
  form.value.user_id = ''
  await fetchAll()
  syncUrl()
}

/* ---------- Row action ---------- */
async function closeRow(row) {
  if (!confirm('Close this assignment?')) return
  try {
    await store.close(row.id)
    toast.success('Closed')
    await fetchAll()
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed')
  }
}

/* ---------- Lifecycle ---------- */
onMounted(fetchAll)

/* ---------- (optional) criteria search code আপনার আগে যেমন ছিল, রেখে দিন/ব্যবহার করুন ---------- */
</script>

<template>
  <div class="space-y-4 px-4">
    <div class="flex items-center justify-between gap-2">
      <h1 class="title-md md:title-lg">Criteria Assignments</h1>
    </div>

    <!-- Filters -->
    <div class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="grid gap-3 md:grid-cols-12">
        <div class="col-span-full">
          <label class="block text-sm font-medium text-gray-700 mb-1">Employee Scope</label>
          <EmployeeFilter
            v-model:company_id="filters.company_id"
            v-model:department_id="filters.department_id"
            v-model:employee_id="filters.employee_id"
            v-model:line_type="filters.line_type"
            :with-type="true"
            :initial-value="{ ...$route.query }"
            @filter-change="onEmpFilterChange"
            class="w-full"
          />
        </div>

        <div class="md:col-span-12 flex flex-wrap gap-2 items-center justify-end pt-2">
          <button class="btn-3" @click="resetFilters" :disabled="isBusy || !hasFilters">Reset</button>
          <button class="btn-3" @click="search" :disabled="isBusy || !hasOrg">Search</button>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="py-8 text-center"><LoaderView /></div>
    <div v-else-if="error" class="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{{ error }}</div>

    <div v-else class="overflow-x-auto rounded-xl border bg-white shadow-sm">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="bg-gray-100 text-left text-gray-700">
            <th class="px-3 py-2 w-12">#</th>
            <th class="px-3 py-2">User</th>
            <th class="px-3 py-2">Criteria</th>
            <th class="px-3 py-2">Period</th>
            <th class="px-3 py-2">Active</th>
            <th class="px-3 py-2 text-right w-28">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in items" :key="row.id" class="border-t">
            <td class="px-3 py-2">{{ i + 1 }}</td>
            <td class="px-3 py-2">
              <div v-if="row.user?.name" class="text-xs text-gray-700">{{ row.user.name }}</div>
            </td>
            <td class="px-3 py-2">
              <div v-if="row?.criteria?.name" class="text-xs text-gray-700">{{ row.criteria.name }}</div>
            </td>
            <td class="px-3 py-2">{{ row.assigned_from }} → {{ row.assigned_to || 'present' }}</td>
            <td class="px-3 py-2">
              <span :class="row.active ? 'text-green-600' : 'text-gray-500'">
                {{ row.active ? 'Yes' : 'No' }}
              </span>
            </td>
            <td class="px-3 py-2 text-right">
              <button class="btn-3" :disabled="isSaving || !row.active" @click="closeRow(row)">Close</button>
            </td>
          </tr>
          <tr v-if="!items || items.length === 0">
            <td colspan="6" class="px-3 py-6 text-center text-gray-600">No assignments</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
