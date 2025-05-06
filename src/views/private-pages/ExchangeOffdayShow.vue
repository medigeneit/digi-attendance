<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import ScreenshotCapture from '@/components/common/ScreenshotCapture.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import { useAuthStore } from '@/stores/auth'
import { useExchangeStore } from '@/stores/exchange'
import { useNotificationStore } from '@/stores/notification'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const notificationStore = useNotificationStore()
const router = useRouter()
const route = useRoute()
const exchangeStore = useExchangeStore()
const authStore = useAuthStore()
const toast = useToast()
const loading = ref(true)
const rejectionModal = ref(false)
const rejectionReason = ref('')
const approvalModal = ref(false)
const approvalNote = ref('')
const attachment = ref(null)

const exchange = computed(() => exchangeStore.exchange)

onMounted(async () => {
  const { id } = route.params
  try {
    await exchangeStore.fetchExchange(id)
  } catch (err) {
    console.error('Failed to fetch exchange details:', err)
  } finally {
    loading.value = false
  }
})

let action = ref('')

function openApprovalModal(url) {
  action.value = url
  approvalModal.value = true
}

async function submitApproval() {
  acceptExchangeAction(action.value)
  approvalModal.value = false
}

const rejectExchange = async () => {
  try {
    await exchangeStore.rejectExchange(route.params.id, rejectionReason.value)
    rejectionModal.value = false
    rejectionReason.value = ''
    await exchangeStore.fetchExchange(route.params.id)
    refresh()
  } catch (err) {
    console.error('Failed to reject exchange request:', err)
    alert('Failed to reject exchange request.')
  }
}

const openRejectionModal = () => {
  rejectionModal.value = true
}

const acceptExchangeAction = async (action) => {
  try {
    const { id } = route.params
    if (action === 'handover') await exchangeStore.handoverAccept({ id, note: approvalNote.value })
    if (action === 'inCharge') await exchangeStore.inChargeAccept({ id, note: approvalNote.value })
    if (action === 'recommend')
      await exchangeStore.recommendByAccept({ id, note: approvalNote.value })
    if (action === 'approve') await exchangeStore.approvedByAccept({ id, note: approvalNote.value })
    // alert(`${action} accepted successfully!`)
    if (confirm('Are you sure you want to approve?')) {
      await exchangeStore.fetchExchange(id)
      refresh()
    }
  } catch (err) {
    console.error(`Failed to accept ${action}:`, err)
    alert(`Failed to accept ${action}.`)
  }
}
// uploadAttachmentExchange

const fileUploadLink = async (event) => {
  const file = event.target.files[0]
  if (file) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await exchangeStore.fetchFileUpload(formData)
    attachment.value = response?.url
    if (response?.url) {
      uploadAttachment()
      toast.success('File uploaded successfully')
    } else {
      toast.error('Failed to upload file')
    }
  }
}
const uploadAttachment = async () => {
  try {
    const payload = {
      attachment: attachment.value,
    }
    await exchangeStore.uploadAttachmentExchange(route.params.id, payload)
  } catch (err) {
    console.error('Failed to reject short leave:', err)
    alert('Failed to reject short leave.')
  }
}

function print() {
  window.print()
}

const goBack = () => router.go(-1)

const formatDate = (dateString) => new Date(dateString).toISOString().slice(0, 10)

const getDayName = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

async function refresh() {
  await notificationStore.markAsRead(route.query.notifyId)
}
</script>

<template>
  <div class="my-container max-w-3xl space-y-6">
    <div class="flex items-center justify-between gap-2 print:hidden">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-lg text-center">Exchange Details</h1>
      <div>
        <button class="btn-2" @click="print">
          <i class="far fa-print"></i>
          Print
        </button>
      </div>
    </div>

    <LoaderView v-if="loading" />

    <div v-else class="card-bg p-4 md:p-8">
      <div>
        <h1 class="title-lg text-center">Offday Exchange Application</h1>
      </div>
      <div class="flex justify-end">
        <div>Date: {{ formatDate(exchange?.created_at) }}</div>
      </div>
      <div>
        <p class="font-medium">
          Name: <b>{{ exchange?.user?.name }}</b>
        </p>
        <div class="gap-y-1">
          <p>
            Designation: <b>{{ exchange?.user?.designation?.title }}</b>
          </p>
        </div>
        <div class="gap-y-1">
          <p>
            Department: <b>{{ exchange?.user?.company?.name }}</b>
          </p>
        </div>
      </div>

      <div class="grid md:grid-cols-2 pt-3">
        <div><b>Holiday Day:</b> {{ getDayName(exchange?.current_date) }}</div>
        <div><b>Date:</b> {{ exchange?.current_date }}</div>
        <div><b>Exchange Day:</b> {{ getDayName(exchange?.exchange_date) }}</div>
        <div><b>Date:</b> {{ exchange?.exchange_date }}</div>
        <div class="col-span-2 pt-2"><b>Reason:</b> {{ exchange?.reason || 'N/A' }}</div>
      </div>

      <div class="grid print:grid-cols-2 md:grid-cols-2 gap-4 pt-10">
        <div>
          <div><b>Works in Hand:</b> {{ exchange?.works_in_hand || 'N/A' }}</div>
        </div>
        <div>
          <p>{{ exchange?.handover_user?.name || 'Not assigned' }}</p>
          <div
            v-if="!exchange?.status && exchange.handover_user_id === authStore.user.id"
            class="print:hidden"
          >
            <p class="text-xs">
              {{ exchange?.user?.name }} has assigned you for his handover.<br />
              Do you agree?
            </p>
            <div class="flex gap-2">
              <button
                class="font-bold text-lg text-green-600 px-2"
                @click="openApprovalModal('handover')"
              >
                ✔
              </button>
              <button class="px-2">❌</button>
            </div>
          </div>
          <hr class="w-44 border-black" />
          <h4 class="font-bold">
            Handover
            <span
              v-if="exchange?.handover_user_id && exchange?.status"
              class="text-green-600 print:text-black"
            >
              (✔)
            </span>
            <span
              v-if="exchange?.handover_user_id && !exchange?.status"
              class="pl-2 text-yellow-700"
              ><i class="fad fa-spinner"></i
            ></span>
          </h4>
          <p class="text-xs text-gray-500">
            {{ exchange?.handover_note }}
          </p>
        </div>
      </div>
      <hr />
      <div>
        <h3 class="title-md">
          Approvals
          <span
            :class="{
              'text-yellow-500': exchange?.status === 'Pending',
              'text-green-500': exchange?.status === 'Approved',
              'text-red-500': exchange?.status === 'Rejected',
            }"
          >
            ({{ exchange?.status || 'N/A' }})
          </span>
        </h3>
        <div v-if="exchange?.status === 'Rejected'">
          <div><b>Rejected By:</b> {{ exchange?.rejected_by_user?.name || 'N/A' }}</div>
          <div><b>Rejection Reason:</b> {{ exchange?.rejection_reason || 'N/A' }}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 print:grid-cols-3 md:grid-cols-3 gap-4">
        <div class="pt-10">
          <p v-if="exchange?.in_charge_user">{{ exchange?.in_charge_user?.name || '' }}</p>
          <p v-else>
            {{ exchange?.user?.other_approval?.in_charge_user?.name || '' }}
          </p>
          <div
            v-if="
              exchange.status !== 'Rejected' &&
              exchange.status !== 'Approved' &&
              !exchange?.in_charge_user_id &&
              exchange?.user?.other_approval?.in_charge_user_id === authStore.user.id
            "
            class="print:hidden"
          >
            <p class="text-xs text-blue-600">
              {{ exchange?.user?.name }} has submitted an application. <br />
              Will you forward it?
            </p>
            <div class="flex gap-4">
              <button
                class="font-bold text-lg text-green-600"
                @click="openApprovalModal('inCharge')"
              >
                ✔
              </button>
              <button class="" @click="openRejectionModal">❌</button>
            </div>
          </div>

          <hr class="w-28 md:w-44 border-black mt-2" />
          <p class="font-bold">
            In-Charge
            <span v-if="exchange?.in_charge_user_id" class="text-green-600">(✔)</span>
            <span
              v-if="!exchange?.in_charge_user_id && exchange?.user?.other_approval?.in_charge_user"
              class="pl-2 text-yellow-700"
              ><i class="fad fa-spinner"></i
            ></span>
          </p>
          <p class="text-xs text-gray-500">
            {{ exchange?.in_charge_note }}
          </p>
        </div>

        <div class="pt-10">
          <p v-if="exchange?.recommend_by_user">{{ exchange?.recommend_by_user?.name || '' }}</p>
          <p v-else>
            {{ exchange?.user?.other_approval?.recommend_by_user?.name || 'N/A' }}
          </p>
          <div
            v-if="
              exchange.status !== 'Rejected' &&
              exchange.status !== 'Approved' &&
              !exchange?.recommend_by_user_id &&
              exchange?.user?.other_approval?.recommend_by_user_id === authStore.user.id
            "
            class="print:hidden"
          >
            <p class="text-xs text-blue-600">
              {{ exchange?.user?.name }} has submitted an application.<br />
              Will you recommend it?
            </p>
            <div class="flex gap-4">
              <button
                class="font-bold text-lg text-green-600"
                @click="openApprovalModal('recommend')"
              >
                ✔
              </button>
              <button class="" @click="openRejectionModal">❌</button>
            </div>
          </div>

          <hr class="w-28 md:w-44 border-black mt-2" />
          <p class="font-bold">
            Recommend By
            <span v-if="exchange?.recommend_by_user_id" class="text-green-600">(✔)</span>
            <span
              v-if="
                !exchange?.recommend_by_user_id && exchange?.user?.other_approval?.recommend_by_user
              "
              class="pl-2 text-yellow-700"
              ><i class="fad fa-spinner"></i
            ></span>
          </p>
          <p class="text-xs text-gray-500">
            {{ exchange?.recommend_note }}
          </p>
        </div>
        <div class="pt-10">
          <p v-if="exchange?.approved_by_user">{{ exchange?.approved_by_user?.name || '' }}</p>
          <p v-else>
            {{ exchange?.user?.other_approval?.approved_by_user?.name || '' }}
          </p>
          <div
            v-if="
              exchange.status !== 'Rejected' &&
              exchange.status !== 'Approved' &&
              !exchange?.approved_by_user_id &&
              exchange?.user?.other_approval?.approved_by_user_id === authStore.user.id
            "
            class="print:hidden"
          >
            <p class="text-xs text-blue-600">
              {{ exchange?.user?.name }} has submitted an application.<br />
              Will you accept it?
            </p>
            <div class="flex gap-4">
              <button
                class="font-bold text-lg text-green-600"
                @click="openApprovalModal('approve')"
              >
                ✔
              </button>
              <button class="" @click="openRejectionModal">❌</button>
            </div>
          </div>

          <hr class="w-44 border-black mt-2" />
          <p class="font-bold">
            Approved By
            <span v-if="exchange?.approved_by_user_id" class="text-green-600">(✔)</span>
            <span
              v-if="
                !exchange?.approved_by_user_id && exchange?.user?.other_approval?.approved_by_user
              "
              class="pl-2 text-yellow-700"
              ><i class="fad fa-spinner"></i
            ></span>
          </p>
          <p class="text-xs text-gray-500">
            {{ exchange?.approval_note }}
          </p>
        </div>
      </div>
    </div>
    <div class="print:hidden">
      <div>
        <label>Attachment</label>
        <!-- Show existing file link if available -->
        <div v-if="exchange?.attachment && typeof exchange?.attachment === 'string'" class="mb-2">
          <a :href="exchange?.attachment" target="_blank" class="text-blue-500 underline">
            View Current File
          </a>
        </div>
        <!-- File Input -->
        <input type="file" @change="fileUploadLink" class="w-full p-2 border rounded" />

        <!-- Show Selected File Name -->
        <p class="text-sm text-gray-600 mt-1">Selected File</p>
      </div>
      <!-- <button type="button" v-if="attachment" class="btn-2" @click="uploadAttachment">
        Upload Attachment
      </button> -->
    </div>
    <ShareComponent>
      <ScreenshotCapture targetId="leave-application" platform="whatsapp" />
    </ShareComponent>
  </div>

  <div v-if="approvalModal" class="modal-bg">
    <div class="modal-card">
      <h3 class="title-lg">Accept Application</h3>
      <input
        v-model="approvalNote"
        rows="4"
        placeholder="Enter accept note..."
        class="w-full border rounded-lg p-2 text-gray-700"
      />
      <div class="flex justify-end gap-2 mt-4">
        <button class="btn-3" @click="approvalModal = false">Cancel</button>
        <button class="btn-2 bg-red-500 text-white" @click="submitApproval">Confirm</button>
      </div>
    </div>
  </div>

  <div v-if="rejectionModal" class="modal-bg">
    <div class="modal-card">
      <h3 class="title-lg">Reject Exchange Request</h3>
      <textarea
        v-model="rejectionReason"
        rows="4"
        placeholder="Enter rejection reason..."
        class="w-full border rounded-lg p-2 text-gray-700"
      ></textarea>
      <div class="flex justify-end gap-2 mt-4">
        <button class="btn-3" @click="rejectionModal = false">Cancel</button>
        <button class="btn-2 bg-red-500 text-white" @click="rejectExchange">Confirm</button>
      </div>
    </div>
  </div>
</template>
