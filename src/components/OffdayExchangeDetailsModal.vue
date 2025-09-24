<!-- components/OffdayExchangeDetailsModal.vue -->
<script setup>
import ApprovalItem from '@/components/applications/ApprovalItem.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import ScreenshotCapture from '@/components/common/ScreenshotCapture.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import { useAuthStore } from '@/stores/auth'
import { useExchangeStore } from '@/stores/exchange'
import { computed, ref, watch } from 'vue'
import { useToast } from 'vue-toastification'

/* ---------- props & emits ---------- */
const props = defineProps({
  open: { type: Boolean, default: false },
  id: { type: [String, Number], required: true }, // offday exchange id
})
const emit = defineEmits(['update:open'])

/* ---------- stores & locals ---------- */
const authStore = useAuthStore()
const exchangeStore = useExchangeStore()
const toast = useToast()

const loading = ref(false)
const attachment = ref(null)
const exchange = computed(() => exchangeStore.exchange)

/* ---------- loaders & controls ---------- */
const close = () => emit('update:open', false)

const load = async () => {
  if (!props.id) return
  loading.value = true
  try {
    await exchangeStore.fetchExchange(props.id)
  } catch (err) {
    console.error('Failed to fetch exchange details:', err)
    toast.error('Failed to load offday exchange.')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.open, props.id],
  async ([open]) => {
    if (open) await load()
  },
  { immediate: true }
)

/* ---------- file upload ---------- */
const fileUploadLink = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  const response = await exchangeStore.fetchFileUpload(formData)
  attachment.value = response?.url || null
  if (response?.url) {
    await uploadAttachment()
    toast.success('File uploaded successfully')
  } else {
    toast.error('Failed to upload file')
  }
}

const uploadAttachment = async () => {
  try {
    const payload = { attachment: attachment.value }
    await exchangeStore.uploadAttachmentExchange(props.id, payload)
    await load()
  } catch (err) {
    console.error('Failed to upload attachment:', err)
    toast.error('Failed to upload attachment.')
  }
}

/* ---------- helpers ---------- */
function printPage() {
  window.print()
}
const formatDate = (dateString) =>
  dateString ? new Date(dateString).toISOString().slice(0, 10) : 'N/A'
const getDayName = (dateString) => {
  if (!dateString) return 'N/A'
  const d = new Date(dateString)
  return d.toLocaleDateString('en-US', { weekday: 'long' })
}

const onAction = async () => {
  await load()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[999] flex items-center justify-center bg-black/50"
      aria-modal="true"
      role="dialog"
      aria-labelledby="offday-exchange-title"
    >
      <!-- overlay -->
      <div class="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto bg-white p-4  print:static print:overflow-visible" @click="close"></div>

      <!-- modal -->
      <div class="fixed inset-0 flex items-center justify-center" @keydown.esc="close">
        <div
          class="relative w-full max-w-4xl rounded-lg bg-white max-h-[90vh] overflow-y-auto print:overflow-visible print:shadow-none print:max-h-none"
        >
          <!-- header -->
          <div class="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-white px-4 py-3 print:hidden">
            <button class="btn-3" @click="close">
              <i class="far fa-arrow-left"></i>
              <span class="hidden md:flex">Back</span>
            </button>
            <h1 id="offday-exchange-title" class="title-lg text-center">Offday Exchange Application</h1>
            <div>
               <button class="btn-3" @click="close">
                <i class="far fa-times"></i>
                <span class="hidden md:inline">Close</span>
              </button>
            </div>
          </div>

          <!-- body -->
          <div>
            <LoaderView v-if="loading" />

            <div v-else class="card-bg p-4 md:p-8 text-sm md:text-base" id="leave-application">
              
              <div class="flex justify-end">
                <div>Date: {{ formatDate(exchange?.created_at) }}</div>
              </div>

              <div>
                <p class="font-medium">
                  Name: <b>{{ exchange?.user?.name }}</b>
                </p>
                <div class="gap-y-1">
                  <p>Designation: <b>{{ exchange?.user?.designation?.title }}</b></p>
                </div>
                <div class="gap-y-1">
                  <p>Department: <b>{{ exchange?.user?.company?.name }}</b></p>
                </div>
              </div>

              <div class="grid md:grid-cols-2 pt-3">
                <div><b>Holiday Day:</b> {{ getDayName(exchange?.current_date) }}</div>
                <div><b>Date:</b> {{ exchange?.current_date }}</div>

                <div><b>Exchange Day:</b> {{ getDayName(exchange?.exchange_date) }}</div>
                <div><b>Date:</b> {{ exchange?.exchange_date }}</div>

                <div class="col-span-2 pt-2"><b>Reason:</b> {{ exchange?.reason || 'N/A' }}</div>
              </div>

              <div class="grid md:grid-cols-3 gap-x-4 py-1 md:justify-between items-end md:items-start">
                <div class="md:col-span-2 print:col-span-2">
                  <div><b>Works in Hand:</b> {{ exchange?.works_in_hand || 'N/A' }}</div>
                </div>
                <ApprovalItem
                  :application="exchange"
                  type="offday_exchange_applications"
                  item="handover"
                  :onAction="onAction"
                  class="pt-10 ml-auto hidden md:block"
                />
              </div>

              <hr class="my-2" />

              <!-- approvals -->
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
                  type="offday_exchange_applications"
                  item="handover"
                  :onAction="onAction"
                  class="md:hidden"
                />

                <ApprovalItem
                  :application="exchange"
                  type="offday_exchange_applications"
                  item="in_charge"
                  :onAction="onAction"
                />

                <ApprovalItem
                  :application="exchange"
                  type="offday_exchange_applications"
                  item="recommend_by"
                  :onAction="onAction"
                />

                <ApprovalItem
                  :application="exchange"
                  type="offday_exchange_applications"
                  item="approved_by"
                  :onAction="onAction"
                />
              </div>

              <!-- Attachment -->
              <div class="space-y-2 print:hidden">
                <label class="font-medium">Attachment</label>

                <div v-if="exchange?.attachment && typeof exchange?.attachment === 'string'" class="mb-2">
                  <a :href="exchange?.attachment" target="_blank" class="text-blue-500 underline">
                    View Current File
                  </a>
                </div>
                <div v-else class="text-center text-lg italic text-gray-400">No attachment</div>

                <div v-if="authStore?.user?.id === exchange?.user_id">
                  <input type="file" @change="fileUploadLink" class="w-full p-2 border rounded" />
                  <p class="text-sm text-gray-600 mt-1">Selected File</p>
                </div>
              </div>

              <!-- Share / Screenshot -->
              <ShareComponent class="print:hidden">
                <ScreenshotCapture targetId="leave-application" platform="whatsapp" />
              </ShareComponent>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@media print {
  .rounded-lg { border-radius: 0 !important; }
}
</style>
