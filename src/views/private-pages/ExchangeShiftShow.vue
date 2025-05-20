<script setup>
import ApprovalItem from '@/components/applications/ApprovalItem.vue'
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

const onAction = async () => {
  await exchangeStore.fetchExchange(route.params.id)
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

    <div
      v-else
      class="bg-white rounded p-4 md:p-8 text-sm md:text-base space-y-1"
      id="leave-application"
    >
      <div>
        <h1 class="title-lg text-center">Shift Exchange Application</h1>
      </div>
      <div class="flex md:justify-end">
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

      <div class="grid md:grid-cols-2 pt-2">
        <div><b>Exchange Day:</b> {{ getDayName(exchange?.exchange_date) }}</div>
        <div><b>Date:</b> {{ exchange?.exchange_date }}</div>
        <div><b>From:</b> {{ exchange?.current_shift?.name }}</div>
        <div><b>To:</b> {{ exchange?.shift?.name }}</div>
        <div class="col-span-2 pt-2"><b>Reason:</b> {{ exchange?.reason || 'N/A' }}</div>
      </div>

      <div class="grid md:grid-cols-3 gap-x-4 py-1 md:justify-between items-end md:items-start">
        <div class="md:col-span-2 print:col-span-2">
          <div><b>Works in Hand:</b> {{ exchange?.works_in_hand || 'N/A' }}</div>
        </div>
        <ApprovalItem
          :application="exchange"
          type="shift_exchange_applications"
          item="handover"
          :onAction="onAction"
          class="pt-10 ml-auto hidden md:block"
        />
      </div>

      <hr class="my-2" />

      <div class="text-center">
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

      <div
        class="grid grid-cols-2 text-sm md:text-base md:grid-cols-3 md:gap-x-4 gap-y-14 pt-14 items-end"
      >
        <ApprovalItem
          :application="exchange"
          type="shift_exchange_applications"
          item="handover"
          :onAction="onAction"
          class="md:hidden"
        />

        <ApprovalItem
          :application="exchange"
          type="shift_exchange_applications"
          item="in_charge"
          :onAction="onAction"
        />

        <ApprovalItem
          :application="exchange"
          type="shift_exchange_applications"
          item="recommend_by"
          :onAction="onAction"
        />

        <ApprovalItem
          :application="exchange"
          type="shift_exchange_applications"
          item="approved_by"
          :onAction="onAction"
        />
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
        <div v-else class="text-center text-lg italic text-gray-400">No attachment</div>
        <!-- File Input -->
        <div v-if="authStore?.user?.id === exchange?.user_id">
          <input type="file" @change="fileUploadLink" class="w-full p-2 border rounded" />
          <p class="text-sm text-gray-600 mt-1">Selected File</p>
        </div>

        <!-- Show Selected File Name -->
      </div>
      <!-- <button type="button" v-if="attachment" class="btn-2" @click="uploadAttachment">
        Upload Attachment
      </button> -->
    </div>
    <ShareComponent>
      <ScreenshotCapture targetId="leave-application" platform="whatsapp" />
    </ShareComponent>
  </div>
</template>
