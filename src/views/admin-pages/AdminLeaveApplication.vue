<script setup>
import LeaveApplicationForm from '@/components/AdminLeaveApplicationAddForm.vue'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import SelectedEmployeeCard from '@/components/user/SelectedEmployeeCard.vue'
import UserLeaveBalanceModal from '@/components/UserLeaveBalanceModal.vue'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const leaveApplicationStore = useLeaveApplicationStore()
const userStore = useUserStore()

const { user, leaveApplications, loading } = storeToRefs(leaveApplicationStore)

const { userLeaveBalance } = storeToRefs(userStore)

const selectedYear = ref(route.query.year || leaveApplicationStore.selectedYear)
const search = ref(route.query.search || '')
const now = new Date()
const period = ref({
  year: Number(selectedYear.value) || now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate(),
})
const periodYear = computed(() => period.value?.year ?? now.getFullYear())

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '',
})

const showModal = ref(false)
const showLeaveTypeModal = ref(false)

const fetchApplicationsByUser = async () => {
  const payload = {
    selectedYear: selectedYear.value,
    selectedStatus: leaveApplicationStore.selectedStatus,
    query: search.value,
  }
  if (filters.value.employee_id) {
    payload.user_id = filters.value.employee_id
    loading.value = true
    await leaveApplicationStore.fetchYearlyUserLeaveApplications(payload)
    loading.value = false
  } else {
    leaveApplications.value = []
  }
}

onMounted(async () => {
  await fetchApplicationsByUser()

  if (route.query.employee_id) {
    await userStore.fetchUserLeaveBalances(route.query.employee_id, { year: periodYear.value })
  }
})

watch(
  () => route.query.employee_id,
  async (id) => {
    if (id) {
      await userStore.fetchUserLeaveBalances(id, { year: periodYear.value })
    }
  },
)

watch(periodYear, async (year) => {
  if (!year) return
  selectedYear.value = year
  await fetchApplicationsByUser()
  if (filters.value.employee_id) {
    await userStore.fetchUserLeaveBalances(filters.value.employee_id, { year })
  }
})

const filteredLeaveApplications = computed(() => leaveApplications.value || [])

const goBack = () => router.go(-1)

const handleFilterChange = async () => {
  router.replace({
    query: {
      ...route.query,
      company_id: filters.value.company_id,
      department_id: filters.value.department_id,
      line_type: filters.value.line_type,
      employee_id: filters.value.employee_id,
    },
  })
  await fetchApplicationsByUser()
}

const openAddModal = () => {
  showLeaveTypeModal.value = true
}

const handleFormSccessClosed = async () => {
  showModal.value = false
  await fetchApplicationsByUser()
}

const currentYear = new Date().getFullYear()
const yearOptions = ref([])
for (let y = 2023; y <= currentYear; y++) {
  yearOptions.value.push(y)
}

const deleteApplication = async (applicationId) => {
  if (confirm('Are you sure to delete this application?')) {
    await leaveApplicationStore.deleteLeaveApplication(applicationId)
    await fetchApplicationsByUser()
  }
}

const closeLeaveTypeModal = () => {
  showLeaveTypeModal.value = false
  userStore.fetchUserLeaveBalances(route.query.employee_id, { year: periodYear.value })
}

const formatDate = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const leaveTypeLabel = (application) => {
  const labels = [
    ...new Set(application?.leave_days?.map((leaveDay) => leaveDay?.leave_type?.name).filter(Boolean)),
  ]
  return labels.length ? labels.join(', ') : 'N/A'
}

const statusClass = (status) => {
  const value = String(status || '').toLowerCase()
  if (value === 'approved') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (value === 'rejected') return 'bg-rose-50 text-rose-700 ring-rose-200'
  if (value === 'pending') return 'bg-amber-50 text-amber-700 ring-amber-200'
  return 'bg-slate-50 text-slate-600 ring-slate-200'
}

</script>

<template>
  <div class="min-h-screen bg-slate-50 px-3 py-3 text-slate-800 md:px-5">
    <header class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <button
          class="inline-flex h-9 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
          @click="goBack"
        >
          <i class="far fa-arrow-left text-blue-600"></i>
          Back
        </button>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">HRD</p>
          <h1 class="text-xl font-bold text-slate-900 md:text-2xl">Annual Leave History</h1>
        </div>
      </div>

      <div v-if="filters?.employee_id" class="flex flex-wrap items-center gap-2">
        <button
          @click="openAddModal"
          type="button"
          class="inline-flex h-9 items-center gap-2 rounded bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <i class="far fa-sliders-h text-blue-600"></i>
          Set Balance
        </button>
        <button
          @click="showModal = true"
          type="button"
          class="inline-flex h-9 items-center gap-2 rounded bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <i class="far fa-plus"></i>
          Add Application
        </button>
      </div>
    </header>

    <section class="sticky top-14 z-50 mb-3 rounded border border-slate-200 bg-white p-3 shadow-sm">
      <EmployeeFilter
        v-model:company_id="filters.company_id"
        v-model:department_id="filters.department_id"
        v-model:employee_id="filters.employee_id"
        v-model:line_type="filters.line_type"
        :with-type="true"
        :initial-value="$route.query"
        @filter-change="handleFilterChange"
        class="w-full"
      >
        <FlexibleDatePicker
          v-model="period"
          :show-year="true"
          :show-month="false"
          :show-date="false"
          label="Year"
        />
      </EmployeeFilter>
    </section>

    <div v-if="leaveApplicationStore.loading" class="rounded border border-slate-200 bg-white py-16 text-center shadow-sm">
      <LoaderView />
    </div>

    <div v-else-if="!filters?.employee_id" class="rounded border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded bg-blue-50 text-blue-600">
        <i class="far fa-user-search text-xl"></i>
      </div>
      <h2 class="mt-3 text-base font-bold text-slate-800">Select an employee</h2>
      <p class="mt-1 text-sm text-slate-500">Use the filters above to load annual leave history and balances.</p>
    </div>

    <div v-else class="space-y-3">
      <section class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
        <SelectedEmployeeCard :user="user" class="min-h-[128px] rounded border border-slate-200 bg-white shadow-sm" />

        <div class="rounded border border-slate-200 bg-white shadow-sm">
          <div class="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <div>
              <h2 class="text-sm font-bold text-slate-800">Leave Balance</h2>
              <p class="text-[11px] text-slate-500">{{ periodYear }} entitlement and usage</p>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full min-w-[390px] text-xs">
              <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th class="px-3 py-2 text-left">Type</th>
                  <th class="px-2 py-2 text-center">Total</th>
                  <th class="px-2 py-2 text-center">Used</th>
                  <th class="px-2 py-2 text-center">Pending</th>
                  <th class="px-2 py-2 text-center">Remaining</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="leave in userLeaveBalance" :key="leave.id" class="hover:bg-slate-50">
                  <td class="px-3 py-2 font-semibold text-slate-800">{{ leave.name }}</td>
                  <td class="px-2 py-2 text-center font-mono">{{ leave.annual_quota }}</td>
                  <td class="px-2 py-2 text-center font-mono text-rose-600">{{ leave.used_days }}</td>
                  <td class="px-2 py-2 text-center font-mono text-amber-600">{{ leave?.pending_days }}</td>
                  <td class="px-2 py-2 text-center font-mono font-bold text-emerald-700">{{ leave.remaining_days }}</td>
                </tr>
                <tr v-if="!userLeaveBalance?.length">
                  <td colspan="5" class="px-3 py-5 text-center text-slate-500">No balance configured</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
          <div>
            <h2 class="text-sm font-bold text-slate-800">Application Register</h2>
            <p class="text-[11px] text-slate-500">{{ periodYear }} records for selected employee</p>
          </div>
          <button
            @click="showModal = true"
            type="button"
            class="inline-flex h-8 items-center gap-2 rounded bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700"
          >
            <i class="far fa-plus"></i>
            Add Application
          </button>
        </div>

        <div class="hidden overflow-x-auto md:block">
          <table class="w-full min-w-[1060px] text-xs">
            <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th class="w-10 px-3 py-2 text-center">#</th>
                <th class="px-3 py-2 text-left">Created</th>
                <th class="px-3 py-2 text-left">Last Working</th>
                <th class="px-3 py-2 text-left">Resumption</th>
                <th class="px-3 py-2 text-left">Leave Period</th>
                <th class="px-3 py-2 text-left">Total Days</th>
                <th class="px-3 py-2 text-left">Type</th>
                <th class="px-3 py-2 text-center">Status</th>
                <th class="w-32 px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="(application, index) in filteredLeaveApplications"
                :key="application?.id || index"
                class="hover:bg-blue-50/60"
              >
                <td class="px-3 py-2 text-center font-mono text-slate-500">{{ index + 1 }}</td>
                <td class="px-3 py-2 font-medium">{{ formatDate(application?.created_at) }}</td>
                <td class="px-3 py-2">{{ formatDate(application?.last_working_date) }}</td>
                <td class="px-3 py-2">{{ formatDate(application?.resumption_date) }}</td>
                <td class="px-3 py-2 font-medium text-slate-700">{{ application?.leave_period || '-' }}</td>
                <td class="px-3 py-2 font-mono text-slate-700" v-html="application?.duration || application?.total_leave_days || '-'"></td>
                <td class="px-3 py-2">
                  <span class="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-700">{{ leaveTypeLabel(application) }}</span>
                </td>
                <td class="px-3 py-2 text-center">
                  <span class="inline-flex rounded-full px-2 py-1 text-[11px] font-bold ring-1" :class="statusClass(application?.status)">
                    {{ application?.status || 'Draft' }}
                  </span>
                </td>
                <td class="px-3 py-2">
                  <div class="flex justify-center gap-1">
                    <RouterLink
                      :to="{ name: 'LeaveApplicationShow', params: { id: application?.id } }"
                      class="inline-flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-700"
                      target="_blank"
                      title="View"
                    >
                      <i class="far fa-eye"></i>
                    </RouterLink>
                    <RouterLink
                      v-if="!['Approved', 'Rejected'].includes(application?.status)"
                      :to="{ name: 'LeaveApplicationEdit', params: { id: application?.id } }"
                      class="inline-flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-orange-600 hover:bg-orange-100"
                      target="_blank"
                      title="Edit"
                    >
                      <i class="far fa-edit"></i>
                    </RouterLink>
                    <button
                      @click="deleteApplication(application?.id)"
                      class="inline-flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-rose-600 hover:bg-rose-100"
                      title="Delete"
                    >
                      <i class="far fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredLeaveApplications.length">
                <td colspan="9" class="px-3 py-10 text-center text-slate-500">No application found for {{ periodYear }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="grid gap-2 p-3 md:hidden">
          <article
            v-for="(application, index) in filteredLeaveApplications"
            :key="application?.id || index"
            class="rounded border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="font-semibold text-slate-900">{{ leaveTypeLabel(application) }}</p>
                <p class="text-xs text-slate-500">{{ formatDate(application?.last_working_date) }} to {{ formatDate(application?.resumption_date) }}</p>
              </div>
              <span class="rounded-full px-2 py-1 text-[11px] font-bold ring-1" :class="statusClass(application?.status)">
                {{ application?.status || 'Draft' }}
              </span>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div class="rounded bg-slate-50 p-2">
                <p class="text-slate-400">Created</p>
                <p class="font-semibold">{{ formatDate(application?.created_at) }}</p>
              </div>
              <div class="rounded bg-slate-50 p-2">
                <p class="text-slate-400">Total</p>
                <p class="font-semibold" v-html="application?.duration || application?.total_leave_days || '-'"></p>
              </div>
              <div class="col-span-2 rounded bg-slate-50 p-2">
                <p class="text-slate-400">Leave Period</p>
                <p class="font-semibold">{{ application?.leave_period || '-' }}</p>
              </div>
            </div>
            <div class="mt-3 flex justify-end gap-2">
              <RouterLink :to="{ name: 'LeaveApplicationShow', params: { id: application?.id } }" class="btn-2 px-3 py-1 text-xs" target="_blank">View</RouterLink>
              <RouterLink v-if="!['Approved', 'Rejected'].includes(application?.status)" :to="{ name: 'LeaveApplicationEdit', params: { id: application?.id } }" class="btn-3 px-3 py-1 text-xs" target="_blank">Edit</RouterLink>
              <button @click="deleteApplication(application?.id)" class="btn-3 px-3 py-1 text-xs text-rose-600">Delete</button>
            </div>
          </article>
          <div v-if="!filteredLeaveApplications.length" class="rounded border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No application found for {{ periodYear }}
          </div>
        </div>
      </section>
    </div>
  </div>

  <UserLeaveBalanceModal :show="showLeaveTypeModal" :user="user" @close="closeLeaveTypeModal" />

  <!-- ✅ MODAL -->
  <Teleport to="body">
    <div
      v-if="showModal"
      class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-3"
    >
      <div
        class="w-full max-w-7xl overflow-hidden rounded-lg bg-white shadow-2xl"
      >
        <LeaveApplicationForm
          :userInfo="user"
          @close="showModal = false"
          @formSuccessClosed="handleFormSccessClosed"
        />
      </div>
    </div>
  </Teleport>
</template>
