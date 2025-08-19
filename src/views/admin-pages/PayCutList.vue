<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import UpdateOrCreate from '@/components/paycut/UpdateOrCreate.vue'
import { useAuthStore } from '@/stores/auth'
import { usePaycutStore } from '@/stores/paycut'
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const payCutStore = usePaycutStore()

// ---------- State ----------
const selectedMonth = ref(route.query.month || new Date().toISOString().slice(0, 7))
const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || '',
  type: route.query.type || 'all',     // <-- this is the "category" coming from EmployeeFilter
  employee_id: route.query.employee_id || ''
})
const loading = ref(false)

// ---------- Helpers ----------
async function fetchPaycutListData () {
  // Guard: need month + company
  if (!selectedMonth.value || !filters.value.company_id) {
    payCutStore.paycuts = [] // optional: clear list if not fetchable
    return
  }

  const query = {
    month: selectedMonth.value,
    company_id: String(filters.value.company_id)
  }
  if (filters.value.employee_id) query.user_id = String(filters.value.employee_id)

  loading.value = true
  try {
    await payCutStore.fetchPaycuts(query)
  } finally {
    loading.value = false
  }
}

function buildQueryFromFilters () {
  const q = {}

  if (selectedMonth.value) q.month = String(selectedMonth.value)
  if (filters.value.company_id) q.company_id = String(filters.value.company_id)
  if (filters.value.department_id) q.department_id = String(filters.value.department_id) // keep only when not empty
  if (filters.value.employee_id) q.employee_id = String(filters.value.employee_id)
  if (filters.value.type && filters.value.type !== 'all') q.type = String(filters.value.type)

  return q
}

let qTimer = null
function syncQueryDebounced () {
  if (qTimer) clearTimeout(qTimer)
  qTimer = setTimeout(() => {
    const next = buildQueryFromFilters()
    router.replace({ query: next }).catch(() => {})
  }, 120)
}

// Debounced apply + fetch with fetch-key guard
let applyTimer = null
const lastKey = ref('')
async function runApply () {
  // Sync URL
  syncQueryDebounced()

  // Build key for fetch guard
  const key = JSON.stringify({
    m: selectedMonth.value || '',
    c: filters.value.company_id || '',
    d: filters.value.department_id || '',
    t: filters.value.type || 'all',
    e: filters.value.employee_id || ''
  })

  if (key !== lastKey.value) {
    await fetchPaycutListData()
    lastKey.value = key
  }
}
function scheduleApply () {
  if (applyTimer) clearTimeout(applyTimer)
  applyTimer = setTimeout(runApply, 200)
}

// ---------- Watches ----------
watch(
  () => ({ ...filters.value, month: selectedMonth.value }),
  () => scheduleApply(),
  { deep: true }
)

// Optional: if route gets changed externally, rehydrate (rare)
watch(
  () => route.query,
  (q) => {
    // Only adopt changes if different (prevents loops)
    const nextMonth = q.month || ''
    if (nextMonth !== selectedMonth.value) selectedMonth.value = nextMonth

    const next = {
      company_id: q.company_id || '',
      department_id: q.department_id || '',
      type: q.type || 'all',
      employee_id: q.employee_id || ''
    }
    const cur = filters.value
    if (
      next.company_id !== cur.company_id ||
      next.department_id !== cur.department_id ||
      next.type !== cur.type ||
      next.employee_id !== cur.employee_id
    ) {
      filters.value = next
    }
  }
)

// First load
onMounted(async () => {
  scheduleApply()
})

// Called from EmployeeFilter via @filter-change
function handleFilterChange () {
  scheduleApply()
}

async function deletePaycut (id) {
  const confirmed = confirm('Are you sure you want to delete this paycut?')
  if (!confirmed) return
  await payCutStore.deletePaycut(id)
  await fetchPaycutListData()
}
</script>

<template>
  <div class="px-4 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button type="button" class="btn-3" @click="router.go(-1)">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg text-center">Monthly Paycut</h1>
      <div />
    </div>

    <div class="flex flex-wrap gap-4 items-center">
      <EmployeeFilter
        v-model:company_id="filters.company_id"
        v-model:department_id="filters.department_id"
        v-model:employee_id="filters.employee_id"
        v-model:category="filters.type"
        :with-type="true"
        :initial-value="$route.query"
        @filter-change="handleFilterChange"
        class="w-full"
      />
      <div>
        <input type="month" v-model="selectedMonth" class="input-1" />
      </div>
    </div>

    <LoaderView v-if="loading" />

    <div v-else-if="payCutStore.paycuts.length">
      <table class="table-auto w-full border mt-4 text-sm">
        <thead class="bg-gray-100 text-left">
          <tr>
            <th class="p-2">#</th>
            <th class="p-2">Employee</th>
            <th class="p-2">Paycut Hours</th>
            <th class="p-2">Reason</th>
            <th class="p-2">Note</th>
            <th class="p-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(cut, index) in payCutStore.paycuts" :key="cut.id" class="border-t">
            <td class="p-2">{{ index + 1 }}</td>
            <td class="p-2">{{ cut.user?.name || 'N/A' }}</td>
            <td class="p-2">{{ cut.paycut_hours }}</td>
            <td class="p-2">{{ cut.reason || '-' }}</td>
            <td class="p-2">{{ cut.note || '-' }}</td>
            <td class="p-2 text-center flex gap-2">
              <UpdateOrCreate
                v-if="authStore.user?.id === 8"
                :userId="cut.user_id"
                :month="selectedMonth"
                @updated="fetchPaycutListData"
              />
              <button type="button" class="text-red-500" @click="deletePaycut(cut.id)">
                <i class="fa fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else-if="!filters.company_id" class="text-red-500 text-sm text-center">
      Please select a company to load paycut data.
    </p>

    <p v-else class="text-gray-400 text-sm text-center">
      No paycuts found for the selected filters.
    </p>
  </div>
</template>
