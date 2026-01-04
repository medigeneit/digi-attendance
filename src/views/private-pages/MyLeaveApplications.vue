<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const leaveApplicationStore = useLeaveApplicationStore()

const now = new Date()
const period = ref({
  year: now.getFullYear(),
  month: 1,
  day: 1,
})

const periodYear = computed(() => period.value?.year ?? now.getFullYear())

watch(
  periodYear,
  (year) => {
    leaveApplicationStore.fetchMyLeaveApplications({
      year: year ? String(year) : null,
    })
  },
  { immediate: true }
)

const goBack = () => {
  router.go(-1)
}

const myLeaveApplications = computed(
  () => leaveApplicationStore.leaveApplications || []
)

const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const statusClass = (status) => {
  switch (status) {
    case 'Approved':
      return 'bg-green-100 text-green-700 border border-green-200'
    case 'Rejected':
      return 'bg-red-100 text-red-700 border border-red-200'
    case 'Pending':
    default:
      return 'bg-yellow-100 text-yellow-700 border border-yellow-200'
  }
}

function deleteApplication(applicationId) {
  const confirmed = confirm('Are you sure you want to delete this leave application?')
  if (confirmed) {
    leaveApplicationStore.deleteLeaveApplication(applicationId)
  }
}
</script>

<template>
  <div class="px-4 py-4 max-w-full mx-auto space-y-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <button class="btn-3 flex items-center gap-2" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:inline">Back</span>
      </button>

      <div class="flex-1 text-center">
        <h1 class="title-md md:title-lg">My Leave Applications</h1>
      </div>

      <div class="flex gap-3">
        <FlexibleDatePicker
          v-model="period"
          :show-year="true"
          :show-month="false"
          :show-date="false"
          label="Month"
        />
        <RouterLink :to="{ name: 'LeaveApplicationAdd' }" class="btn-2 flex items-center gap-2">
          <i class="far fa-paper-plane"></i>
          <span>Apply for Leave</span>
        </RouterLink>
      </div>
    </div>

    <!-- Loader -->
    <div v-if="leaveApplicationStore?.loading" class="flex justify-center py-10">
      <LoaderView />
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Empty state -->
      <div v-if="myLeaveApplications.length === 0" class="flex justify-center">
        <div class="max-w-md w-full bg-white rounded-lg border border-dashed border-gray-300 p-6 text-center space-y-3 shadow-sm">
          <h2 class="font-semibold text-gray-700">No leave applications yet</h2>
          <p class="text-sm text-gray-500">
            You haven't ? submitted any leave application. Click below to apply for leave.
          </p>
          <RouterLink :to="{ name: 'LeaveApplicationAdd' }" class="btn-2 inline-flex items-center gap-2 mt-2">
            <i class="far fa-paper-plane"></i>
            <span>Apply for Leave</span>
          </RouterLink>
        </div>
      </div>

      <!-- Desktop table -->
      <div v-else class="hidden md:block">
        <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 text-sm text-gray-600">
            <span>Total Applications: <strong>{{ myLeaveApplications.length }}</strong></span>
            <span v-if="periodYear" class="text-xs text-gray-400">
              Showing for year: <strong>{{ periodYear }}</strong>
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full table-auto text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-2 text-left font-semibold text-gray-600">#</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-600">Created Date</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-600">Last Working Date</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-600">Resumption Date</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-600">Total Days</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-600">Leave Types</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-600">Handover</th>
                  <th class="px-3 py-2 text-center font-semibold text-gray-600">Attachment</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(application, index) in myLeaveApplications"
                  :key="application?.id"
                  class="border-t border-gray-100 hover:bg-blue-50 transition-colors"
                >
                  <td class="px-3 py-2 align-top">{{ index + 1 }}</td>
                  <td class="px-3 py-2 align-top">
                    {{ formatDate(application?.created_at) }}
                  </td>
                  <td class="px-3 py-2 align-top">
                    {{ formatDate(application?.last_working_date) }}
                  </td>
                  <td class="px-3 py-2 align-top">
                    {{ formatDate(application?.resumption_date) }}
                  </td>
                  <td class="px-3 py-2 align-top">
                    <span class="font-medium">{{ application?.total_leave_days }}</span>
                    <span class="text-xs text-gray-500 ml-1">({{ application?.leave_period }})</span>
                  </td>
                  <td class="px-3 py-2 align-top">
                    {{ application.application_types }}
                  </td>
                  <td class="px-3 py-2 align-top">
                    {{ application?.handover_user?.name || 'N/A' }}
                  </td>
                  <td class="px-3 py-2 text-center align-top">
                    <a
                      v-if="application.attachment"
                      :href="application?.attachment"
                      target="_blank"
                      class="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 underline"
                    >
                      <i class="fad fa-link mr-1"></i>
                      <span class="text-xs">View</span>
                    </a>
                    <span v-else class="text-xs text-gray-400">—</span>
                  </td>
                  <td class="px-3 py-2 align-top">
                    <span
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      :class="statusClass(application?.status || 'Pending')"
                    >
                      <span
                        class="w-1.5 h-1.5 rounded-full mr-1.5"
                        :class="{
                          'bg-green-500': application?.status === 'Approved',
                          'bg-red-500': application?.status === 'Rejected',
                          'bg-yellow-400': !application?.status || application?.status === 'Pending'
                        }"
                      ></span>
                      {{ application?.status || 'Pending' }}
                    </span>
                  </td>
                  <td>
                    <div class="flex gap-2">
                      <RouterLink
                        :to="{ name: 'MyLeaveApplicationShow', params: { id: application?.id } }"
                        class="btn-icon"
                        title="View details"
                      >
                        <i class="far fa-eye"></i>
                      </RouterLink>

                      <button
                        type="button"
                        @click="deleteApplication(application?.id)"
                        class="btn-icon"
                        v-if="application.status == 'Pending' || !application.status"
                        title="Delete application"
                      >
                        <i class="far fa-trash text-red-600"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Mobile cards -->
      <div class="space-y-3 md:hidden">
        <div
          v-for="(application, index) in myLeaveApplications"
          :key="application?.id"
          class="bg-white border border-gray-200 rounded-lg p-3 shadow-sm space-y-2"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-xs text-gray-400">Application #{{ index + 1 }}</p>
              <p class="text-sm font-semibold text-gray-800">
                {{ application.application_types || 'Leave Application' }}
              </p>
            </div>
            <span
              class="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium"
              :class="statusClass(application?.status || 'Pending')"
            >
              {{ application?.status || 'Pending' }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>
              <p class="text-gray-400">Last Working</p>
              <p class="font-medium">{{ formatDate(application?.last_working_date) }}</p>
            </div>
            <div>
              <p class="text-gray-400">Resumption</p>
              <p class="font-medium">{{ formatDate(application?.resumption_date) }}</p>
            </div>
            <div>
              <p class="text-gray-400">Total Days</p>
              <p class="font-medium">
                {{ application?.total_leave_days }} {{ application?.leave_period }}
              </p>
            </div>
            <div>
              <p class="text-gray-400">Handover</p>
              <p class="font-medium">
                {{ application?.handover_user?.name || 'N/A' }}
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-gray-100">
            <div>
              <a
                v-if="application.attachment"
                :href="application?.attachment"
                target="_blank"
                class="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 underline"
              >
                <i class="fad fa-link mr-1"></i>
                <span>View Attachment</span>
              </a>
              <span v-else class="text-[11px] text-gray-400">No attachment</span>
            </div>

            <div class="flex gap-2">
              <RouterLink
                :to="{ name: 'MyLeaveApplicationShow', params: { id: application?.id } }"
                class="btn-icon"
              >
                <i class="far fa-eye"></i>
              </RouterLink>
              <button
                type="button"
                @click="deleteApplication(application?.id)"
                class="btn-icon"
                v-if="application.status == 'Pending' || !application.status"
              >
                <i class="far fa-trash text-red-600"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
