<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import ScreenshotCapture from '@/components/common/ScreenshotCapture.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import { useAuthStore } from '@/stores/auth'
import { useShortLeaveStore } from '@/stores/short-leave'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
const router = useRouter()
const route = useRoute()
const shortLeaveStore = useShortLeaveStore()
const authStore = useAuthStore()
const attachment = ref('attachment')
const loading = ref(true)
const rejectionModal = ref(false)
const rejectionReason = ref('')

const shortLeave = computed(() => shortLeaveStore.shortLeave)

onMounted(async () => {
  const { id } = route.params
  try {
    await shortLeaveStore.fetchShortLeaveById(id)
  } catch (err) {
    console.error('Failed to fetch short leave details:', err)
  } finally {
    loading.value = false
  }
})

const rejectShortLeave = async () => {
  try {
    await shortLeaveStore.rejectShortLeave(route.params.id, rejectionReason.value)
    alert('Short leave rejected successfully!')
    rejectionModal.value = false
    rejectionReason.value = ''
    await shortLeaveStore.fetchShortLeaveById(route.params.id)
  } catch (err) {
    console.error('Failed to reject short leave:', err)
    alert('Failed to reject short leave.')
  }
}

const uploadShortLeaveAttachment = async () => {
  try {
    const payload = {
      attachment: attachment.value,
    }
    await shortLeaveStore.uploadShortLeaveAttachment(route.params.id, payload)
    alert('Short leave rejected successfully!')
  } catch (err) {
    console.error('Failed to reject short leave:', err)
    alert('Failed to reject short leave.')
  }
}

const openRejectionModal = () => {
  rejectionModal.value = true
}

const acceptShortLeaveAction = async (action) => {
  try {
    const { id } = route.params
    if (action === 'handover') await shortLeaveStore.handoverAccept(id)
    if (action === 'inCharge') await shortLeaveStore.inChargeAccept(id)
    if (action === 'recommend') await shortLeaveStore.recommendByAccept(id)
    if (action === 'approve') await shortLeaveStore.approvedByAccept(id)
    alert(`${action} accepted successfully!`)
    await shortLeaveStore.fetchShortLeaveById(id)
  } catch (err) {
    console.error(`Failed to accept ${action}:`, err)
    alert(`Failed to accept ${action}.`)
  }
}

const goBack = () => router.go(-1)

function print() {
  window.print()
}

const fileUploadLink = async (event) => {
  const file = event.target.files[0]
  if (file) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await shortLeaveStore.fetchFileUpload(formData)
    console.log({ response: response?.url })
    attachment.value = response?.url
  }
}
</script>

<template>
  <div class="my-container max-w-3xl space-y-6">
    <div class="flex items-center justify-between gap-2 print:hidden">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-lg flex-wrap text-center">Short Leave Details</h1>

      <div>
        <button class="btn-2" @click="print">
          <i class="far fa-print"></i>
          Print
        </button>
      </div>
    </div>

    <LoaderView v-if="loading" />

    <div v-else class="bg-white rounded space-y-2 p-4 md:p-8" id="leave-application">
      <div>{{ shortLeave?.user.company.name }}</div>
      <h2 class="title-md">Short Leave Application</h2>
      <div class="">
        <div class="grid md:grid-cols-2">
          <div><b>Date:</b> {{ shortLeave?.date }}</div>
          <div><b>Start Time:</b> {{ shortLeave?.start_time }}</div>
          <div><b>End Time:</b> {{ shortLeave?.end_time }}</div>
          <div><b>Total Minutes:</b> {{ shortLeave?.total_minutes }}</div>
          <div><b>Reason:</b> {{ shortLeave?.reason || 'N/A' }}</div>
        </div>
        <div class="grid md:grid-cols-2 gap-4 pt-10">
          <div class="">
            <hr class="w-44 border-black" />
            <div><b>Applicant</b></div>
            <p class="font-medium">{{ shortLeave?.user.name }}</p>
            <div class="text-sm">
              <p>{{ shortLeave?.user?.department?.name }}</p>
              <p>{{ shortLeave?.user?.designation?.title }}</p>
            </div>
          </div>

          <div>
            <p>{{ shortLeave?.handover_user?.name || 'Not assigned' }}</p>
            <div
              v-if="!shortLeave?.status && shortLeave.handover_user_id === authStore.user.id"
              class="print:hidden"
            >
              <p class="text-xs">
                {{ shortLeave?.user?.name }} has assigned you for his handover. <br />
                Do you agree?
              </p>
              <div class="flex gap-2">
                <button
                  class="font-bold text-lg text-green-600 px-2"
                  @click="acceptShortLeaveAction('handover')"
                >
                  ✔
                </button>
                <button class="px-2">❌</button>
              </div>
            </div>
            <hr class="w-44 border-black mt-1" />
            <h4 class="font-bold">
              Handover
              <span
                v-if="shortLeave?.handover_user_id && shortLeave?.status"
                class="text-green-600 print:text-black"
              >
                (✔)
              </span>
              <span
                v-if="shortLeave?.handover_user_id && !shortLeave?.status"
                class="pl-2 text-yellow-700"
                ><i class="fad fa-spinner"></i
              ></span>
            </h4>
          </div>
        </div>
      </div>

      <hr />

      <!-- Approval Details -->
      <div>
        <h3 class="title-md">
          Approvals
          <span
            :class="{
              'text-yellow-500': shortLeave?.status === 'Pending',
              'text-green-500': shortLeave?.status === 'Approved',
              'text-red-500': shortLeave?.status === 'Rejected',
            }"
          >
            ({{ shortLeave?.status || 'N/A' }})
          </span>
        </h3>
        <div v-if="shortLeave?.status === 'Rejected'">
          <div><b>Rejected By:</b> {{ shortLeave?.rejected_by_user?.name || 'N/A' }}</div>
          <div><b>Rejection Reason:</b> {{ shortLeave?.rejection_reason || 'N/A' }}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="pt-10">
          <div
            v-if="
              shortLeave.status !== 'Rejected' &&
              shortLeave.status !== 'Approved' &&
              !shortLeave?.in_charge_user_id &&
              shortLeave?.user?.other_approval?.in_charge_user_id === authStore.user.id
            "
            class="print:hidden"
          >
            <p class="">
              {{ shortLeave?.user?.other_approval?.in_charge_user?.name || 'N/A' }}
            </p>
            <p class="text-xs text-blue-600">
              {{ shortLeave?.user?.name }} has submitted an application. <br />
              Will you forward it?
            </p>
            <div class="flex gap-4">
              <button
                class="font-bold text-lg text-green-600"
                @click="acceptShortLeaveAction('inCharge')"
              >
                ✔
              </button>
              <button class="" @click="openRejectionModal">❌</button>
            </div>
          </div>
          <p>{{ shortLeave?.in_charge_user?.name || '' }}</p>
          <hr class="w-44 border-black" />
          <p class="font-bold">
            In-Charge
            <span v-if="shortLeave?.in_charge_user_id" class="text-green-600">(✔)</span>
          </p>
        </div>

        <div class="pt-10">
          <div
            v-if="
              shortLeave.status !== 'Rejected' &&
              shortLeave.status !== 'Approved' &&
              !shortLeave?.recommend_by_user_id &&
              shortLeave?.user?.other_approval?.recommend_by_user_id === authStore.user.id
            "
            class="print:hidden"
          >
            <p class="">
              {{ shortLeave?.user?.other_approval?.recommend_by_user?.name || 'N/A' }}
            </p>
            <p class="text-xs text-blue-600">
              {{ shortLeave?.user?.name }} has submitted an application.<br />
              Will you recommend it?
            </p>
            <div class="flex gap-4">
              <button
                class="font-bold text-lg text-green-600"
                @click="acceptShortLeaveAction('recommend')"
              >
                ✔
              </button>
              <button class="" @click="openRejectionModal">❌</button>
            </div>
          </div>
          <p>{{ shortLeave?.recommend_by_user?.name || '' }}</p>
          <hr class="w-44 border-black" />
          <p class="font-bold">
            Recommend By
            <span v-if="shortLeave?.recommend_by_user_id" class="text-green-600">(✔)</span>
          </p>
        </div>
      </div>

      <div class="flex flex-col pt-10">
        <div
          v-if="
            shortLeave.status !== 'Rejected' &&
            shortLeave.status !== 'Approved' &&
            !shortLeave?.approved_by_user_id &&
            shortLeave?.user?.other_approval?.approved_by_user_id === authStore.user.id
          "
          class="print:hidden"
        >
          <p class="">
            {{ shortLeave?.user?.other_approval?.approved_by_user?.name || 'N/A' }}
          </p>
          <p class="text-xs text-blue-600">
            {{ shortLeave?.user?.name }} has submitted an application.<br />
            Will you accept it?
          </p>
          <div class="flex gap-4">
            <button
              class="font-bold text-lg text-green-600"
              @click="acceptShortLeaveAction('approve')"
            >
              ✔
            </button>
            <button class="" @click="openRejectionModal">❌</button>
          </div>
        </div>
        <p>{{ shortLeave?.approved_by_user?.name || '' }}</p>
        <hr class="w-44 border-black" />
        <p class="font-bold">
          Approved By
          <span v-if="shortLeave?.approved_by_user_id" class="text-green-600">(✔)</span>
        </p>
      </div>
    </div>
    <div>
      <div>
        <label>Attachment</label>
        <!-- Show existing file link if available -->
        <div
          v-if="shortLeave?.attachment && typeof shortLeave?.attachment === 'string'"
          class="mb-2"
        >
          <img :src="shortLeave?.attachment" alt="" />
        </div>
        <!-- File Input -->
        <input type="file" @change="fileUploadLink" class="w-full p-2 border rounded" />

        <!-- Show Selected File Name -->
        <p v-if="fileName" class="text-sm text-gray-600 mt-1">Selected File: {{ fileName }}</p>
      </div>
      <button type="button" v-if="attachment" class="btn-2" @click="uploadShortLeaveAttachment">
        Upload Attachment
      </button>
    </div>

    <ShareComponent>
      <ScreenshotCapture targetId="leave-application" platform="whatsapp" />
    </ShareComponent>
  </div>
  <div v-if="rejectionModal" class="modal-bg">
    <div class="modal-card">
      <h3 class="title-lg">Reject Short Leave</h3>
      <textarea
        v-model="rejectionReason"
        rows="4"
        placeholder="Enter rejection reason..."
        class="w-full border rounded-lg p-2 text-gray-700"
      ></textarea>
      <div class="flex justify-end gap-2 mt-4">
        <button class="btn-3" @click="rejectionModal = false">Cancel</button>
        <button class="btn-2 bg-red-500 text-white" @click="rejectShortLeave">Confirm</button>
      </div>
    </div>
  </div>
</template>
