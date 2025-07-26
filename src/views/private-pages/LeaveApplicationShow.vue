<script setup>
import ApprovalItem from '@/components/applications/ApprovalItem.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import { useAuthStore } from '@/stores/auth'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useNotificationStore } from '@/stores/notification'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const leaveApplicationStore = useLeaveApplicationStore()

const router = useRouter()
const route = useRoute()
const attachment = ref(null)
const loading = ref(true)

const leaveApplication = computed(() => leaveApplicationStore.leaveApplication)

onMounted(async () => {
  try {
    await leaveApplicationStore.fetchLeaveApplicationById(route.params.id)
  } catch (error) {
    console.error('Failed to load leave application:', error)
  } finally {
    loading.value = false
  }
})

function print() {
  window.print()
}

const onAction = async () => {
  await leaveApplicationStore.fetchLeaveApplicationById(route.params.id)
}

const goBack = () => router.go(-1)

const totalWithWeekendDays = computed(() => {
  if (
    !leaveApplication.value ||
    !leaveApplication.value.last_working_date ||
    !leaveApplication.value.resumption_date
  ) {
    return 0 // Return 0 if leaveApplication is null or dates are missing
  }

  const lastWorkingDate = new Date(leaveApplication?.value.last_working_date)
  const resumptionDate = new Date(leaveApplication?.value.resumption_date)

  // Calculate the difference in milliseconds and convert to days
  const diffTime = resumptionDate - lastWorkingDate
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) // Convert milliseconds to days

  return diffDays - 1 // Exclude last working day itself
})

const uploadLeaveApplicationAttachment = async () => {
  try {
    const payload = {
      attachment: attachment.value,
    }
    await leaveApplicationStore.uploadLeaveApplicationAttachment(route.params.id, payload)
  } catch (err) {
    console.error('Failed to reject short leave:', err)
    alert('Failed to reject short leave.')
  }
}

const fileUploadLink = async (event) => {
  const file = event.target.files[0]
  if (file) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'leave-application')
    const response = await leaveApplicationStore.fetchFileUpload(formData)
    attachment.value = response?.url
    uploadLeaveApplicationAttachment()
  }
}


const formatDateTime = (timestamp) => {
  const d = new Date(timestamp)
  const date = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) // e.g., "19 Jul 2025"

  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) // e.g., "04:30 PM"

  return `${date} , ${time}`
}
</script>

<template>
  <div class="my-container max-w-3xl space-y-6">
    <div class="flex items-center justify-between gap-2 print:hidden">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-xl flex-wrap text-center">Leave Application</h1>
      <div>
        <button class="btn-2" @click="print">
          <i class="far fa-print"></i>
          Print
        </button>
      </div>
    </div>

    <LoaderView v-if="loading" />

    <div v-else class="card-bg p-4 md:p-8 print:text-black">
      <div>
        <h1 class="title-lg text-center">
          {{ leaveApplication?.user?.company?.name }}
        </h1>
        <p class="text-center text-sm">
          {{ leaveApplication?.user?.company.address }}
        </p>
      </div>
      <div class="space-y-4">
        <div class="grid md:grid-cols-2 print:grid-cols-2 gap-8">
          <div>
            <p>To</p>
            <p class="font-bold">Managing Director</p>
            <p class="">{{ leaveApplication?.user?.company?.name }}</p>
            <p class="text-sm">{{ leaveApplication?.user?.company.address }}</p>
            <div>
              <p class="pt-6">
                <b>Subject:</b>
                Leave Application for
                <template v-for="(leave, index) in leaveApplication?.leave_types" :key="index">
                  <span v-if="index && leave.days">,&nbsp;</span>
                  <span v-if="leave.days" class="font-semibold">
                    {{ leave.type }}
                  </span>
                </template>
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-4">
            <div>
              <h1 class="font-bold">Summary</h1>
              <table class="table-auto border border-black bg-white text-xs">
                <thead>
                  <tr class="bg-gray-200 border border-black">
                    <th class="border border-black px-2">Type</th>
                    <th class="border border-black px-2">Days</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(leave, index) in leaveApplication?.leave_types"
                    :key="index"
                    class="border border-black"
                  >
                    <td class="border border-black px-2">{{ leave.type }}</td>
                    <td class="border border-black px-2">{{ leave.days }}</td>
                  </tr>
                  <tr>
                    <td class="border-black px-2">WL/GHD</td>
                    <td class="border border-black px-2">
                      {{ totalWithWeekendDays - leaveApplication?.leave_days?.length }}
                    </td>
                  </tr>
                  <tr class="font-bold">
                    <td class="border border-black px-2">Total</td>
                    <td class="border border-black px-2">
                      {{ totalWithWeekendDays }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h1 class="font-bold">Last Leave</h1>
              <div>
                <table class="table-auto border border-black bg-white text-xs">
                  <thead>
                    <tr class="bg-gray-200 border border-black">
                      <th colspan="2" class="border border-black px-2">Date</th>
                    </tr>
                    <tr class="border border-black">
                      <td colspan="2" class="border border-black px-2 w-32">
                        {{ leaveApplication?.last_leave?.date || 'N/A' }}
                      </td>
                    </tr>
                    <tr class="bg-gray-200 border border-black">
                      <th class="border border-black px-2">Type</th>
                      <th class="border border-black px-2">Days</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr
                      v-for="(leave, index) in leaveApplication?.last_leave?.types"
                      :key="index"
                      class="border border-black"
                    >
                      <td class="border border-black px-2">{{ leave?.type }}</td>
                      <td class="border border-black px-2">{{ leave?.days }}</td>
                    </tr>
                    <tr class="font-bold">
                      <td class="border border-black px-2">Total</td>
                      <td class="border border-black px-2">
                        {{
                          leaveApplication?.last_leave?.types
                            ? leaveApplication.last_leave.types.reduce(
                                (sum, leave) => sum + leave.days,
                                0,
                              )
                            : 0
                        }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 class="font-bold">Leave Details:</h3>
          <div class="grid print:grid-cols-2 md:grid-cols-2 text-sm">
            <li><strong>Reason: </strong>{{ leaveApplication?.reason || 'No reason provided' }}</li>
            <li><strong>Leave Days:</strong> {{ leaveApplication?.leave_period }}</li>
            <li><strong>Total Days:</strong> {{ leaveApplication?.total_leave_days }}</li>
            <li><strong>Weekends:</strong> {{ leaveApplication?.user?.weekends?.join(', ') }}</li>
            <li><strong>Last Working Date:</strong> {{ leaveApplication?.last_working_date }}</li>
            <li><strong>Resumption Date:</strong> {{ leaveApplication?.resumption_date }}</li>
            <li><strong>Create Date:</strong> {{ formatDateTime(leaveApplication?.created_at) }}</li>
          </div>
        </div>
        <div class="text-sm">
          <p>
            <strong>Works in Hand: </strong
            >{{ leaveApplication?.works_in_hand || 'No details provided' }}
          </p>
        </div>
        <div class="pt-8 grid grid-cols-2">
          <div>
            <div class="text-sm">
              <hr class="w-44 border-black hidden print:block my-1" />
              <p class='font-bold'>
                <strong>Applicant: </strong> 
                <span class="text-blue-700 print:text-black">{{ leaveApplication?.user?.name }}</span>
              </p>
              <p><strong>Designation:</strong> {{ leaveApplication?.user?.designation?.title }}</p>
              <p><strong>Department:</strong> {{ leaveApplication?.user?.department?.name }}</p>
              <!-- <p><strong>Email:</strong> {{ leaveApplication?.user?.email }}</p> -->
              <p><strong>Phone:</strong> {{ leaveApplication?.user?.phone }}</p>
            </div>
          </div>

          <ApprovalItem
            :application="leaveApplication"
            type="leave_applications"
            item="handover"
            :onAction="onAction"
          />
        </div>

        <div>
          <h1 class="font-bold">Leave Balance</h1>
          <div class="overflow-x-auto">
            <table
              class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md text-sm"
            >
              <thead>
                <tr class="bg-gray-200">
                  <th class="border border-gray-500 px-4 py-0.5 text-left">Leave Type</th>
                  <th class="border border-gray-500 px-4 py-0.5 text-center">Total Days</th>
                  <th class="border border-gray-500 px-4 py-0.5 text-center">Used Days</th>
                  <th class="border border-gray-500 px-4 py-0.5 text-center">Remaining Days</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(balance, index) in leaveApplication?.leave_balance"
                  :key="index"
                  class="hover:bg-blue-200"
                >
                  <td class="border border-gray-500 px-4 py-0.5 text-left">
                    {{ balance.leave_type }}
                  </td>
                  <td class="border border-gray-500 px-4 py-0.5 text-center">
                    {{ balance.total_leave_days }}
                  </td>
                  <td class="border border-gray-500 px-4 py-0.5 text-center">
                    {{ balance.used_days }}
                  </td>
                  <td
                    class="border border-gray-500 px-4 py-0.5 text-center"
                    :class="{
                      'text-green-600 font-bold': balance.remaining_days > 0,
                      'text-red-600 font-bold': balance.remaining_days === 0,
                    }"
                  >
                    {{ balance.remaining_days }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="space-y-14">
        <p class="font-bold text-center text-lg">
          Leave Approval:
          <b
            :class="{
              'text-yellow-600': leaveApplication?.status === 'Pending',
              'text-green-600': leaveApplication?.status === 'Approved',
              'text-red-600': leaveApplication?.status === 'Rejected',
            }"
          >
            {{ leaveApplication?.status || 'N/A' }}
          </b>
        </p>
        <div v-if="leaveApplication?.status === 'Rejected'">
          <p><b>Rejected by: </b> {{ leaveApplication?.rejected_by_user?.name }}</p>
          <p><b>rejection Reason: </b> {{ leaveApplication.rejection_reason }}</p>
        </div>

        <div class="grid md:grid-cols-3 print:grid-cols-3 gap-4 text-sm items-end">
          <!-- In-Charge Approval -->
          <ApprovalItem
            :application="leaveApplication"
            type="leave_applications"
            item="in_charge"
            :onAction="onAction"
          />

          <!-- Coordinator Approval -->
          <ApprovalItem
            :application="leaveApplication"
            type="leave_applications"
            item="coordinator"
            :onAction="onAction"
          />

          <!-- Operational Admin Approval -->
          <ApprovalItem
            :application="leaveApplication"
            type="leave_applications"
            item="operational_admin"
            :onAction="onAction"
          />
        </div>

        <!-- Additional Approvals -->
        <div class="flex justify-evenly text-sm items-end">
          <!-- Recommend By Approval -->
          <ApprovalItem
            :application="leaveApplication"
            type="leave_applications"
            item="recommend_by"
            :onAction="onAction"
          />

          <!-- Approved By Approval -->
          <ApprovalItem
            :application="leaveApplication"
            type="leave_applications"
            item="approved_by"
            :onAction="onAction"
          />
        </div>
      </div>
    </div>
    <div>
      <label>Attachment</label>
      <!-- Show existing file link if available -->
      <div
        v-if="leaveApplication?.attachment && typeof leaveApplication?.attachment === 'string'"
        class="mb-2"
      >
        <a :href="leaveApplication?.attachment" target="_blank" class="text-blue-500 underline">
          View Current File
        </a>
      </div>
      <div v-else class="text-center text-lg italic text-gray-400">No attachment</div>
      <!-- File Input -->
      <div v-if="leaveApplication?.user_id === authStore?.user?.id">
        <input type="file" @change="fileUploadLink" class="w-full p-2 border rounded" />
      </div>
    </div>
    <ShareComponent />
  </div>
</template>
