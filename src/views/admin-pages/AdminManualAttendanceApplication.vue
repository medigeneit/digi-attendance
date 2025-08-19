<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import SelectedEmployeeCard from '@/components/user/SelectedEmployeeCard.vue'
import { useManualAttendanceStore } from '@/stores/manual-attendance'
import { useUserStore } from '@/stores/user'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const manualAttendanceStore = useManualAttendanceStore()
const userStore = useUserStore()

const selectedMonth = ref(route.query.date || manualAttendanceStore.selectedMonth || new Date().toISOString().slice(0, 7))
const forms = ref([])
const loading = ref(false)
const error = ref(null)
const directApprove = ref(true)

// ---- Filters: keep empty string for "unselected" so query can drop keys ----
const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || '',
  line_type: route.query.line_type || 'all',  
  employee_id: route.query.employee_id || '',
})

// ---------- Fetch ----------
const fetchManualAttendancesByUser = async () => {
  const payload = {
    company_id: filters.value.company_id,
    department_id: filters.value.department_id,
    line_type: filters.value.line_type,
    selectedMonth: selectedMonth.value,
    selectedStatus: manualAttendanceStore.selectedStatus,
  }

  if (filters.value.employee_id) {
    payload.user_id = filters.value.employee_id
    loading.value = true
    try {
      await manualAttendanceStore.fetchAdminManualAttendances(payload)
    } finally {
      loading.value = false
    }
  } else {
    // clear list if no employee
    if (typeof manualAttendanceStore.setAttendances === 'function') {
      manualAttendanceStore.setAttendances([])
    } else {
      manualAttendanceStore.attendances = []
    }
  }
}

// ---------- URL sync (build from scratch) ----------
function buildQuery() {
  const q = {}
  if (selectedMonth.value) q.date = String(selectedMonth.value)
  if (filters.value.company_id) q.company_id = String(filters.value.company_id)
  if (filters.value.department_id) q.department_id = String(filters.value.department_id)
  if (filters.value.line_type && filters.value.line_type !== 'all') q.line_type = String(filters.value.line_type)
  if (filters.value.employee_id) q.employee_id = String(filters.value.employee_id)
  return q
}

let qTimer = null
function syncQueryDebounced() {
  if (qTimer) clearTimeout(qTimer)
  qTimer = setTimeout(() => {
    router.replace({ query: buildQuery() }).catch(() => {})
  }, 120)
}

// ---------- Debounced apply + fetch-key guard ----------
let applyTimer = null
const lastKey = ref('')
async function runApply() {
  // sync URL
  syncQueryDebounced()

  // fetch guard
  const key = JSON.stringify({
    m: selectedMonth.value || '',
    c: filters.value.company_id || '',
    d: filters.value.department_id || '',
    t: filters.value.line_type || 'all',
    e: filters.value.employee_id || '',
  })
  if (key !== lastKey.value) {
    await fetchManualAttendancesByUser()
    lastKey.value = key
  }
}
function scheduleApply() {
  if (applyTimer) clearTimeout(applyTimer)
  applyTimer = setTimeout(runApply, 200)
}

// ---------- Lifecycle ----------
onMounted(async () => {
  await userStore.fetchUsers()
  scheduleApply()
})

// EmployeeFilter → parent notifier
function handleFilterChange() {
  scheduleApply()
}

function goBack() {
  router.go(-1)
}

// Keep route.date in sync if user types month
watch(selectedMonth, () => {
  scheduleApply()
})

// Any filter/month change → schedule apply
watch(
  () => ({ ...filters.value, month: selectedMonth.value }),
  () => scheduleApply(),
  { deep: true }
)

// ---------- Derived + rows builder ----------
const filteredAttendances = computed(() => manualAttendanceStore.attendances || [])

watch(
  () => manualAttendanceStore.attendances,
  (rows) => {
    forms.value = []
    ;(rows || []).forEach((attendance) => {
      forms.value.push({
        date: attendance?.date,
        type: 'Forget Punch',
        check_in: attendance?.entry_time,
        check_out: attendance?.exit_time,
        description: '',
        is_check: false,
      })
    })
  },
  { immediate: true, deep: true }
)

// ---------- UI Actions ----------
function toggleSelectAll() {
  const allSelected = forms.value.every((f) => f.is_check)
  forms.value.forEach((f) => { f.is_check = !allSelected })
}

async function submitManualAttendance() {
  loading.value = true
  error.value = null

  if (!filters.value.employee_id) {
    error.value = 'Please select an employee.'
    loading.value = false
    return
  }
  try {
    const selectedForms = forms.value.filter((f) => f.is_check && (f.check_in || f.check_out))
    if (!selectedForms.length) {
      error.value = 'Please select at least one row.'
      return
    }
    const payload = selectedForms.map((f) => ({
      user_id: filters.value.employee_id,
      type: f.type,
      check_in: f.check_in ? `${f.date} ${f.check_in}:00` : null,
      check_out: f.check_out ? `${f.date} ${f.check_out}:00` : null,
      description: f.description || ''
    }))

    const res = await manualAttendanceStore.createBulkManualAttendance({
      records: payload,
      direct_approve: directApprove.value,
    })
    if (res?.data?.length) await fetchManualAttendancesByUser()
  } catch (err) {
    error.value = err?.message || 'Failed to submit manual attendance requests.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg flex-wrap text-center">Admin Bulk Manual Attendance Applications</h1>
      <div></div>
    </div>

    <div class="flex flex-wrap gap-2">
      <EmployeeFilter
        v-model:company_id="filters.company_id"
        v-model:department_id="filters.department_id"
        v-model:employee_id="filters.employee_id"
        v-model:line_type="filters.line_type"
        :with-type="true"
        :initial-value="$route.query"
        @filter-change="handleFilterChange"
      />
      <div>
        <input
          id="monthSelect"
          type="month"
          v-model="selectedMonth"
          class="input-1"
        />
      </div>
    </div>

    <div v-if="manualAttendanceStore.loading" class="text-center py-4">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div v-if="filters?.employee_id" class="grid grid-cols-1  md:grid-cols-2 gap-4">
        <SelectedEmployeeCard :user="manualAttendanceStore.user" />
        <!-- <div class="grid gap-6">
          <div class="bg-white border rounded-lg p-4 shadow">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-y-1 text-sm text-gray-600">
              <p><strong>Name:</strong> {{ manualAttendanceStore?.user?.name }}</p>
              <p><strong>Data:</strong> {{ manualAttendanceStore?.user?.designation?.title }}</p>
              <p><strong>Department:</strong> {{ manualAttendanceStore?.user?.department?.name }}</p>
              <p><strong>Company:</strong> {{ manualAttendanceStore?.user?.company?.name }}</p>
              <p><strong>Phone:</strong> {{ manualAttendanceStore?.user?.phone }}</p>
              <p><strong>Email:</strong> {{ manualAttendanceStore?.user?.email }}</p>
              <p><strong>Joining Date:</strong> {{ manualAttendanceStore?.user?.joining_date }}</p>
              <p><strong>Blood Group:</strong> {{ manualAttendanceStore?.user?.blood || 'N/A' }}</p>
            </div>
          </div>
        </div> -->
      </div>

      <div class="overflow-x-auto">
        <div :class="error ? 'py-2': ''">
          <div v-if="error" class="text-red-500 text-sm text-left">{{ error }}</div>
        </div>
        <table class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md text-sm">
          <thead>
            <tr class="bg-gray-200">
              <th class="border border-gray-300 px-2 text-left py-2">
                <div class="flex items-center justify-center gap-2">
                  <input id="allCheck" type="checkbox" @change="toggleSelectAll" class="h-5 w-5 accent-blue-600 cursor-pointer" />
                  <label for="allCheck" class="text-sm cursor-pointer">All Check</label>
                </div>
              </th>
              <th class="border border-gray-300 px-2 text-left py-2">Date</th>
              <th class="border border-gray-300 px-2 text-left py-2">Type</th>
              <th class="border border-gray-300 px-2 text-left py-2">Check-In</th>
              <th class="border border-gray-300 px-2 text-left py-2">Check-Out</th>
              <th class="border border-gray-300 px-2 text-left py-2">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(form, index) in forms"
              :key="index"
              :class="['border-b border-gray-200 hover:bg-blue-200 cursor-pointer', form.is_check ? 'bg-yellow-100' : '']"
              @click="form.is_check = !form.is_check"
            >
              <td class="border border-gray-300 px-2 cursor-pointer text-center">
                <input type="checkbox" v-model="form.is_check" class="h-5 w-5" @click.stop />
              </td>
              <td class="border border-gray-300 px-2">
                <input type="date" v-model="form.date" class="w-full border border-gray-600 py-1 px-2 rounded-sm" @click.stop disabled />
              </td>
              <td class="border border-gray-300 px-2">
                <select v-model="form.type" class="w-full border border-gray-600 py-1 px-2 rounded-sm" @click.stop>
                  <option value="">Select Type</option>
                  <option value="Home Office">Home Office</option>
                  <option value="Remote Work">Remote Work</option>
                  <option value="Forget Punch">Forget Punch</option>
                </select>
              </td>
              <td class="border border-gray-300 px-2">
                <input type="time" v-model="form.check_in" class="w-full border border-gray-600 py-1 px-2 rounded-sm" @click.stop />
              </td>
              <td class="border border-gray-300 px-2">
                <input type="time" v-model="form.check_out" class="w-full border border-gray-600 py-1 px-2 rounded-sm" @click.stop />
              </td>
              <td class="border border-gray-300 px-2">
                <textarea
                  v-model="form.description"
                  @keyup.stop
                  @click.stop
                  :disabled="!form.check_in && !form.check_out"
                  class="w-full border border-gray-600 py-1 px-2 rounded-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                  cols="1"
                ></textarea>
              </td>
            </tr>
            <tr v-if="filteredAttendances.length === 0">
              <td colspan="6" class="p-2 text-center text-red-500">Please select any employee</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filters?.employee_id">
        <div class="space-y-6">
          <div v-if="error" class="text-red-500 text-sm text-left">{{ error }}</div>

          <div class="flex items-center justify-center gap-2 cursor-pointer">
            <input id="directApprove" type="checkbox" v-model="directApprove" class="accent-blue-600 h-6 w-6 cursor-pointer" />
            <label for="directApprove" class="text-lg cursor-pointer">Direct Approve</label>
          </div>

          <div class="flex justify-center">
            <button type="button" class="btn-2" :disabled="loading" @click="submitManualAttendance">
              <span v-if="loading"><i class="fas fa-spinner fa-spin mr-2"></i>Submitting...</span>
              <span v-else>Submit All</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
