<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useUserMonthlyKpiStore } from '@/stores/user-monthly-kpi'
import { useMonthlyKpiFormsStore } from '@/stores/monthly-kpi-forms'
import { storeToRefs } from 'pinia'
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'

const toast = useToast()
const router = useRouter()
const route = useRoute()

// stores
const evalStore = useUserMonthlyKpiStore()
const { list, isLoading, error } = storeToRefs(evalStore)

const formsStore = useMonthlyKpiFormsStore?.()
const forms = ref([])

// pagination/meta (from API response)
const meta = ref({ total: 0, current_page: 1, last_page: 1, per_page: 10 })

// ✅ filters (EmployeeFilter mapping সহ)
const filters = ref({
  // EmployeeFilter-bound fields
  company_id: route.query.company_id ? Number(route.query.company_id) : '',
  department_id: route.query.department_id ? Number(route.query.department_id) : '',
  employee_id: route.query.employee_id ? Number(route.query.employee_id) : '', // UI dropdown value
  line_type: route.query.line_type ?? '',

  // actual API filter
  user_id: route.query.user_id ? Number(route.query.user_id) : '', // 👈 backend expects user_id

  // other filters
  form_id: route.query.form_id ? Number(route.query.form_id) : '',
  finalized: route.query.finalized ?? '', // '', '1', '0'
  per_page: route.query.per_page ? Number(route.query.per_page) : 10,
  page: route.query.page ? Number(route.query.page) : 1,
})

const hasFilters = computed(() =>
  !!filters.value.user_id || !!filters.value.form_id || filters.value.finalized !== ''
)

// API fetch
async function fetchAll() {
  const params = {
    user_id: filters.value.user_id || undefined, // 👈 employee_id → user_id mapped
    form_id: filters.value.form_id || undefined,
    finalized: filters.value.finalized === '' ? undefined : filters.value.finalized,
    per_page: filters.value.per_page,
    page: filters.value.page,
    // যদি backend company/department/line_type সাপোর্ট করে, তখন নিচেরগুলো আনকমেন্ট করুন:
    // company_id: filters.value.company_id || undefined,
    // department_id: filters.value.department_id || undefined,
    // line_type: filters.value.line_type || undefined,
  }

  const res = await evalStore.fetchList(params)
  if (res?.meta) {
    meta.value = {
      total: res.meta.total ?? 0,
      current_page: res.meta.current_page ?? 1,
      last_page: res.meta.last_page ?? 1,
      per_page: res.meta.per_page ?? filters.value.per_page,
    }
  } else {
    meta.value = { total: list.value?.length || 0, current_page: 1, last_page: 1, per_page: filters.value.per_page }
  }
}

// URL sync helpers
function syncUrl() {
  router.replace({
    query: {
      // keep both for deep-link + EmployeeFilter prefill
      user_id: filters.value.user_id || undefined,         // backend এর জন্য মূল ফিল্টার
      employee_id: filters.value.employee_id || undefined, // EmployeeFilter প্রিফিল
      company_id: filters.value.company_id || undefined,
      department_id: filters.value.department_id || undefined,
      line_type: filters.value.line_type || undefined,

      form_id: filters.value.form_id || undefined,
      finalized: filters.value.finalized || undefined,
      per_page: filters.value.per_page !== 10 ? String(filters.value.per_page) : undefined,
      page: filters.value.page > 1 ? String(filters.value.page) : undefined,
    },
  })
}

// EmployeeFilter change handler (👈 এখানেই mapping)
function handleFilterChange(payload) {
  // payload: { company_id?, department_id?, employee_id?, line_type? }
  filters.value.company_id   = payload?.company_id ?? ''
  filters.value.department_id = payload?.department_id ?? ''
  filters.value.employee_id  = payload?.employee_id ?? ''
  filters.value.line_type    = payload?.line_type ?? ''

  // 🔗 employee_id → user_id (single source of truth for API)
  filters.value.user_id = filters.value.employee_id || ''

  // চাইলে auto-search করতে পারেন; এখন manual search বাটনই রেখে দিলাম।
  // fetchAll(); syncUrl();
}

// actions
async function search() {
  filters.value.page = 1
  await fetchAll()
  syncUrl()
}
async function resetFilters() {
  filters.value = {
    company_id: '', department_id: '', employee_id: '', line_type: '',
    user_id: '', form_id: '', finalized: '', per_page: 10, page: 1,
  }
  await fetchAll()
  syncUrl()
}
async function changePage(p) {
  if (p < 1 || p > meta.value.last_page) return
  filters.value.page = p
  await fetchAll()
  syncUrl()
}
async function changePerPage() {
  filters.value.page = 1
  await fetchAll()
  syncUrl()
}

// create evaluation (👈 user_id = selected employee_id)
async function createEvaluation() {
  if (!filters.value.user_id || !filters.value.form_id) {
    toast.error('User এবং Form সিলেক্ট করুন')
    return
  }
  try {
    const created = await evalStore.create(Number(filters.value.user_id), Number(filters.value.form_id))
    toast.success('Evaluation created')
    router.push({ name: 'EvaluationShow', params: { id: created.id } })
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to create')
  }
}

// initial load + keep URL ↔ filters in sync
onMounted(async () => {
  if (formsStore) {
    await formsStore.fetchList?.({ per_page: 100 })
    forms.value = formsStore.items || []
  }

  // 🔁 initial mapping: যদি শুধু user_id থাকে, EmployeeFilter-এও সেট করো
  if (filters.value.user_id && !filters.value.employee_id) {
    filters.value.employee_id = filters.value.user_id
  }
  await fetchAll()
})

// external URL changes → filters update (and mapping)
watch(
  () => route.query,
  (q) => {
    filters.value.company_id   = q.company_id ? Number(q.company_id) : ''
    filters.value.department_id = q.department_id ? Number(q.department_id) : ''
    filters.value.employee_id  = q.employee_id ? Number(q.employee_id) : (q.user_id ? Number(q.user_id) : '')
    filters.value.line_type    = q.line_type ?? ''

    // keep mapping synced
    filters.value.user_id      = q.user_id ? Number(q.user_id) : (filters.value.employee_id || '')

    filters.value.form_id      = q.form_id ? Number(q.form_id) : ''
    filters.value.finalized    = q.finalized ?? ''
    filters.value.per_page     = q.per_page ? Number(q.per_page) : 10
    filters.value.page         = q.page ? Number(q.page) : 1

    fetchAll()
  }
)
</script>

<template>
  <div class="space-y-4 px-4">
    <!-- Header -->
    <div class="flex items-center justify-between gap-2">
      <h1 class="title-md md:title-lg">User Monthly KPI Evaluations</h1>
      <div class="flex gap-2">
        <RouterLink :to="{ name: 'MonthlyKpiFormList' }" class="btn-2">Forms</RouterLink>
      </div>
    </div>

    <!-- Filters / Create -->
    <div class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="grid gap-3 md:grid-cols-12">
        <!-- ✅ EmployeeFilter → employee_id maps to user_id -->
        <div class="md:col-span-5">
          <label class="block text-sm font-medium text-gray-700 mb-1">Employee</label>
          <EmployeeFilter
            v-model:company_id="filters.company_id"
            v-model:department_id="filters.department_id"
            v-model:employee_id="filters.employee_id"
            v-model:line_type="filters.line_type"
            :with-type="true"
            :initial-value="$route.query"
            @filter-change="handleFilterChange"
            class="w-full"
          />
        </div>

        <div class="md:col-span-4">
          <label class="block text-sm font-medium text-gray-700">Form</label>
          <select v-model="filters.form_id"
                  class="mt-1 w-full rounded-md border px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200">
            <option value="">All</option>
            <option v-for="f in forms" :key="f.id" :value="f.id">
              #{{ f.id }} — {{ f.type }} — {{ f.start_month }}{{ f.end_month ? ` → ${f.end_month}` : '' }}
            </option>
          </select>
        </div>

        <div class="md:col-span-3">
          <label class="block text-sm font-medium text-gray-700">Status</label>
          <select v-model="filters.finalized"
                  class="mt-1 w-full rounded-md border px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200">
            <option value="">All</option>
            <option value="0">In progress</option>
            <option value="1">Finalized</option>
          </select>
        </div>

        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700">Per page</label>
          <select v-model.number="filters.per_page" @change="changePerPage"
                  class="mt-1 w-full rounded-md border px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </div>

        <div class="md:col-span-12 flex flex-wrap gap-2 justify-end pt-2">
          <button class="btn-3" @click="resetFilters" :disabled="isLoading || !hasFilters">Reset</button>
          <button class="btn-3" @click="search" :disabled="isLoading">Search</button>
          <button class="btn-2" @click="createEvaluation">Create Evaluation</button>
        </div>
      </div>
    </div>

    <!-- Loader / Error -->
    <div v-if="isLoading" class="py-8 text-center"><LoaderView /></div>
    <div v-else-if="error" class="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{{ error }}</div>

    <!-- Table -->
    <div v-else class="overflow-x-auto rounded-xl border bg-white shadow-sm">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="bg-gray-100 text-left text-gray-700">
            <th class="px-3 py-2 w-12">#</th>
            <th class="px-3 py-2">User</th>
            <th class="px-3 py-2">Form</th>
            <th class="px-3 py-2">Period</th>
            <th class="px-3 py-2">Total</th>
            <th class="px-3 py-2">Status</th>
            <th class="px-3 py-2 text-right w-28">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in list" :key="row.id" class="border-t">
            <td class="px-3 py-2">{{ (meta.current_page - 1) * meta.per_page + (i + 1) }}</td>
            <td class="px-3 py-2">{{ row.user?.name || ('#' + row.user_id) }}</td>
            <td class="px-3 py-2">{{ row.form?.criteria?.name || ('#' + row.monthly_kpi_form_id) }}</td>
            <td class="px-3 py-2">{{ row.month_start }} → {{ row.month_end }}</td>
            <td class="px-3 py-2">{{ row.obtained_total }} / {{ row.max_total }}</td>
            <td class="px-3 py-2">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                :class="row.finalized_at
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'">
                {{ row.finalized_at ? 'Finalized' : 'In progress' }}
              </span>
            </td>
            <td class="px-3 py-2 text-right">
              <RouterLink :to="{ name: 'EvaluationShow', params: { id: row.id } }" class="btn-2">Open</RouterLink>
            </td>
          </tr>

          <tr v-if="!list || list.length === 0">
            <td colspan="7" class="px-3 py-6 text-center text-gray-600">No data</td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="meta.last_page > 1" class="flex items-center justify-between p-3 text-sm">
        <div class="text-gray-600">
          Showing
          <span class="font-medium">
            {{ (meta.current_page - 1) * meta.per_page + (list.length ? 1 : 0) }}
          </span>
          to
          <span class="font-medium">
            {{ (meta.current_page - 1) * meta.per_page + list.length }}
          </span>
          of
          <span class="font-medium">{{ meta.total }}</span>
          results
        </div>
        <div class="flex items-center gap-2">
          <button class="btn-3" :disabled="meta.current_page === 1" @click="changePage(meta.current_page - 1)">Prev</button>
          <span class="text-gray-700">Page {{ meta.current_page }} / {{ meta.last_page }}</span>
          <button class="btn-3" :disabled="meta.current_page === meta.last_page" @click="changePage(meta.current_page + 1)">Next</button>
        </div>
      </div>
    </div>
  </div>
</template>
