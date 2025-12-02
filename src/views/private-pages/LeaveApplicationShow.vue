<script setup>
import ApprovalItem from '@/components/applications/ApprovalItem.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import { useAuthStore } from '@/stores/auth'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/* stores */
const authStore = useAuthStore()
const leaveApplicationStore = useLeaveApplicationStore()

/* router */
const router = useRouter()
const route = useRoute()
const appId = computed(() => route.params.id)

/* ui state */
const loading = ref(true)

/* attachment state */
const isUploading = ref(false)
const uploadMsg = ref('')
const uploadError = ref('')

const fileInput = ref(null)
const isDragging = ref(false)
const attachmentUrl = ref(null)

/* file constraints */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const ALLOWED_LABEL = 'JPG, PNG, WEBP, PDF'
const MAX_SIZE_MB = 10

/* data */
const leaveApplication = computed(() => leaveApplicationStore.leaveApplication)
const hasAttachment = computed(
  () => typeof leaveApplication.value?.attachment === 'string' && leaveApplication.value.attachment.length > 0
)
const canEditAttachment = computed(
  () => leaveApplication.value?.user_id === authStore?.user?.id
)

/* lifecycle */
onMounted(async () => {
  try {
    await leaveApplicationStore.fetchLeaveApplicationById(appId.value)
  } catch (error) {
    console.error('Failed to load leave application:', error)
  } finally {
    loading.value = false
  }
})

/* navigation */
const goBack = () => router.go(-1)
const print = () => window.print()

/* utilities */
const formatDateTime = (timestamp) => {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${date} , ${time}`
}
const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const isImageUrl = (url) => /\.(png|jpe?g|webp|gif)$/i.test(url || '')

const filenameFromUrl = (url) => {
  try {
    const u = new URL(url)
    return decodeURIComponent(u.pathname.split('/').pop() || 'attachment')
  } catch {
    return (url || '').split('/').pop() || 'attachment'
  }
}

const showSuccess = (msg) => {
  uploadMsg.value = msg
  uploadError.value = ''
  setTimeout(() => (uploadMsg.value = ''), 2500)
}
const showError = (msg) => {
  uploadError.value = msg
  uploadMsg.value = ''
  setTimeout(() => (uploadError.value = ''), 3500)
}

/* computed */
const totalWithWeekendDays = computed(() => {
  const a = leaveApplication.value
  if (!a || !a.last_working_date || !a.resumption_date) return 0
  const lastWorkingDate = new Date(a.last_working_date)
  const resumptionDate = new Date(a.resumption_date)
  const diffDays = Math.ceil((resumptionDate - lastWorkingDate) / (1000 * 60 * 60 * 24))
  return diffDays - 1
})

/* data refresh (after actions) */
const refreshApplication = async () => {
  await leaveApplicationStore.fetchLeaveApplicationById(appId.value)
}

/* validation + upload */
const validateFile = (file) => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    showError(`Only ${ALLOWED_LABEL} allowed`)
    return false
  }
  const sizeMb = file.size / (1024 * 1024)
  if (sizeMb > MAX_SIZE_MB) {
    showError(`Max file size ${MAX_SIZE_MB} MB`)
    return false
  }
  return true
}

const persistAttachment = async (url) => {
  await leaveApplicationStore.uploadLeaveApplicationAttachment(appId.value, { attachment: url })
  await refreshApplication()
}

const handleFile = async (file) => {
  if (!file || !validateFile(file)) return
  isUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'leave-application')

    const response = await leaveApplicationStore.fetchFileUpload(formData)
    attachmentUrl.value = response?.url

    await persistAttachment(attachmentUrl.value)
    showSuccess('Attachment uploaded')
  } catch (e) {
    console.error('Upload failed:', e)
    showError('Upload failed. Try again.')
  } finally {
    isUploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

const handleFileSelect = async (event) => {
  const file = event.target.files?.[0]
  if (file) await handleFile(file)
}

/* drag & drop */
const onDragOver = (e) => { e.preventDefault(); isDragging.value = true }
const onDragLeave = (e) => { e.preventDefault(); isDragging.value = false }
const onDrop = async (e) => {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) await handleFile(file)
}

const browseFiles = () => fileInput.value?.click()

/* actions */
const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(leaveApplication.value?.attachment || '')
    showSuccess('Link copied')
  } catch {
    showError('Copy failed')
  }
}

const removeAttachment = async () => {
  if (!hasAttachment.value) return
  if (!confirm('Remove current attachment?')) return
  isUploading.value = true
  try {
    await persistAttachment(null)
    showSuccess('Attachment removed')
  } catch (e) {
    console.error('Remove failed:', e)
    showError('Failed to remove attachment')
  } finally {
    isUploading.value = false
  }
}
</script>

<template>
  <div class="my-container max-w-3xl space-y-6">
    <!-- header -->
    <div class="flex items-center justify-between gap-2 print:hidden">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i><span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-xl flex-wrap text-center">Leave Application</h1>
      <button class="btn-2" @click="print"><i class="far fa-print"></i> Print</button>
    </div>

    <LoaderView v-if="loading" />

    <div v-else class="card-bg p-4 md:p-8 print:text-black">
      <!-- company -->
      <div>
        <h1 class="title-lg text-center">{{ leaveApplication?.user?.company?.name }}</h1>
        <p class="text-center text-sm">{{ leaveApplication?.user?.company.address }}</p>
      </div>

      <div class="space-y-4">
        <!-- subject + summary + last leave -->
        <div class="grid md:grid-cols-2 print:grid-cols-2 gap-8">
          <div>
            <p>To</p>
            <p class="font-bold">Managing Director</p>
            <p>{{ leaveApplication?.user?.company?.name }}</p>
            <p class="text-sm">{{ leaveApplication?.user?.company.address }}</p>
            <p class="pt-6">
              <b>Subject:</b> Leave Application for
              <template v-for="(leave, i) in leaveApplication?.leave_types" :key="i">
                <span v-if="i && leave.days">,&nbsp;</span>
                <span v-if="leave.days" class="font-semibold">{{ leave.type }}</span>
              </template>
            </p>
          </div>

          <div class="flex justify-end gap-4">
            <!-- summary -->
            <div>
              <h1 class="font-semibold">Summary</h1>
              <table class="table-auto border border-black bg-white text-xs">
                <thead>
                  <tr class="bg-gray-200 border border-black">
                    <th class="border border-black px-2">Type</th>
                    <th class="border border-black px-2">Days</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(leave, i) in leaveApplication?.leave_types" :key="i" class="border border-black">
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
                    <td class="border border-black px-2">{{ totalWithWeekendDays }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- last leave -->
            <div>
              <h1 class="font-semibold">Last Leave</h1>
              <table class="table-auto border border-black bg-white text-xs">
                <thead>
                  <tr class="bg-gray-200 border border-black">
                    <th colspan="2" class="border border-black px-2">Date</th>
                  </tr>
                  <tr class="border border-black">
                    <td colspan="2" class="border border-black px-2 w-32">
                      {{ formatDate(leaveApplication?.last_leave?.date) || 'N/A' }}
                    </td>
                  </tr>
                  <tr class="bg-gray-200 border border-black">
                    <th class="border border-black px-2">Type</th>
                    <th class="border border-black px-2">Days</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(leave, i) in leaveApplication?.last_leave?.types" :key="i" class="border border-black">
                    <td class="border border-black px-2">{{ leave?.type }}</td>
                    <td class="border border-black px-2">{{ leave?.days }}</td>
                  </tr>
                  <tr class="font-bold">
                    <td class="border border-black px-2">Total</td>
                    <td class="border border-black px-2">
                      {{
                        leaveApplication?.last_leave?.types
                          ? leaveApplication.last_leave.types.reduce((sum, l) => sum + l.days, 0)
                          : 0
                      }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- details -->
        <div>
          <h3 class="font-bold">Leave Details:</h3>
          <div class="grid print:grid-cols-2 md:grid-cols-2 text-sm list-none px-2">
            <li><strong>Reason: </strong>{{ leaveApplication?.reason || 'No reason provided' }}</li>
            <li><strong>Leave Days:</strong> {{ leaveApplication?.leave_period }}</li>
            <li><strong>Total Days:</strong> {{ leaveApplication?.total_leave_days }}</li>
            <li><strong>Weekends:</strong> {{ leaveApplication?.user?.assign_weekend?.weekends?.join(', ') }}</li>
            <li><strong>Last Working Date:</strong> {{ formatDate(leaveApplication?.last_working_date) }}</li>
            <li><strong>Resumption Date:</strong> {{ formatDate(leaveApplication?.resumption_date) }}</li>
            <li><strong>Create Date:</strong> {{ formatDateTime(leaveApplication?.created_at) }}</li>
          </div>
        </div>

        <!-- works in hand -->
        <div class="text-sm">
          <p class="whitespace-pre-line">
            <strong>Works in Hand: </strong>{{ leaveApplication?.works_in_hand || 'No details provided' }}
          </p>
        </div>

        <!-- handover block -->
        <div class="pt-8 grid grid-cols-2">
          <div class="text-sm">
            <hr class="w-44 border-black hidden print:block my-1" />
            <p class="font-bold">
              <strong>Applicant: </strong>
              <span class="text-blue-700 print:text-black">{{ leaveApplication?.user?.name }}</span>
            </p>
            <p><strong>Designation:</strong> {{ leaveApplication?.user?.designation?.title }}</p>
            <p><strong>Department:</strong> {{ leaveApplication?.user?.department?.name }}</p>
            <p><strong>Phone:</strong> {{ leaveApplication?.user?.phone }}</p>
            <p><strong>Joining Date:</strong> {{ formatDate(leaveApplication?.user?.joining_date) }}</p>
          </div>

          <ApprovalItem
            :application="leaveApplication"
            type="leave_applications"
            item="handover"
            :date="formatDateTime(leaveApplication.handover_set_at)"
            :onAction="refreshApplication"
          />
        </div>

        <!-- balance -->
        <div>
          <h1 class="font-bold">Leave Balance</h1>
          <div class="overflow-x-auto">
            <table class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md text-sm">
              <thead>
                <tr class="bg-gray-200">
                  <th class="border border-gray-500 px-4 py-0.5 text-left">Leave Type</th>
                  <th class="border border-gray-500 px-4 py-0.5 text-center">Total Days</th>
                  <th class="border border-gray-500 px-4 py-0.5 text-center">Used Days</th>
                  <th class="border border-gray-500 px-4 py-0.5 text-center">Pending Days</th>
                  <th class="border border-gray-500 px-4 py-0.5 text-center">Remaining Days</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(b, i) in leaveApplication?.leave_balance" :key="i" class="hover:bg-blue-200">
                  <td class="border border-gray-500 px-4 py-0.5 text-left">{{ b.name }}</td>
                  <td class="border border-gray-500 px-4 py-0.5 text-center">{{ b?.annual_quota }}</td>
                  <td class="border border-gray-500 px-4 py-0.5 text-center">{{ b.used_days }}</td>
                  <td class="border border-gray-500 px-4 py-0.5 text-center">{{ b.pending_days }}</td>
                  <td
                    class="border border-gray-500 px-4 py-0.5 text-center"
                    :class="{ 'text-green-600 font-bold': b.remaining_days > 0, 'text-red-600 font-bold': b.remaining_days === 0 }"
                  >
                    {{ b.remaining_days }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- status + approval sections -->
      <div class="space-y-14">
            <div class="flex items-center gap-4 justify-center">
              <span class="text-sm font-semibold">Leave Application Status : </span>
                  <span
                    class="inline-flex items-center gap-2 px-3 py-1.5 font-semibold rounded-full text-xs  ring-1"
                    :class="{
                      'bg-yellow-50  text-yellow-800 ring-yellow-200': leaveApplication?.status === 'Pending',
                      'bg-green-50 text-green-700 ring-green-200': leaveApplication?.status === 'Approved',
                      'bg-red-50 text-red-700 ring-red-200': leaveApplication?.status === 'Rejected',
                    }"
                  >
                    <span class="h-1.5 w-1.5 rounded-full"
                          :class="{
                            'bg-yellow-500': leaveApplication?.status === 'Pending',
                            'bg-green-600': leaveApplication?.status === 'Approved',
                            'bg-red-600': leaveApplication?.status === 'Rejected',
                          }"></span>
                    {{ leaveApplication?.status || 'N/A' }}
                  </span>
            </div>
        <!-- <p class="font-bold text-center text-lg">
          Leave Approval:
          <b :class="{
              'text-yellow-600': leaveApplication?.status === 'Pending',
              'text-green-600': leaveApplication?.status === 'Approved',
              'text-red-600': leaveApplication?.status === 'Rejected',
            }">
            {{ leaveApplication?.status || 'N/A' }}
          </b>
        </p> -->

        <div v-if="leaveApplication?.status === 'Rejected'">
          <p><b>Rejected by: </b> {{ leaveApplication?.rejected_by_user?.name }}</p>
          <p><b>Rejection Reason: </b> {{ leaveApplication.rejection_reason }}</p>
          <p v-if="leaveApplication?.rejected_at" class="text-xs text-slate-600">
            <i class="far fa-clock"></i> {{ formatDateTime(leaveApplication.rejected_at) }}
          </p>
        </div>

        <div class="grid md:grid-cols-3 print:grid-cols-3 gap-4 text-sm items-end">
          <ApprovalItem
            :application="leaveApplication"
            type="leave_applications"
            item="in_charge"
            :date="formatDateTime(leaveApplication.in_charge_set_at)"
            :onAction="refreshApplication"
          />
          <ApprovalItem
            :application="leaveApplication"
            type="leave_applications"
            item="coordinator"
            :date="formatDateTime(leaveApplication.coordinator_set_at)"
            :onAction="refreshApplication"
          />
          <ApprovalItem
            :application="leaveApplication"
            type="leave_applications"
            item="operational_admin"
            :date="formatDateTime(leaveApplication.operational_admin_set_at)"
            :onAction="refreshApplication"
          />
        </div>

        <div class="flex justify-evenly text-sm items-end">
          <ApprovalItem
            :application="leaveApplication"
            type="leave_applications"
            item="recommend_by"
            :date="formatDateTime(leaveApplication.recommended_at)"
            :onAction="refreshApplication"
          />
          <ApprovalItem
            :application="leaveApplication"
            type="leave_applications"
            item="approved_by"
            :date="formatDateTime(leaveApplication.approved_at)"
            :onAction="refreshApplication"
          />
        </div>
      </div>
    </div>

    <!-- Attachment Upload -->
    <section class="mt-10 print:hidden space-y-3">
      <!-- current file -->
      <div v-if="hasAttachment" class="border rounded-lg bg-white p-3 flex items-center gap-3">
        <div class="shrink-0">
          <img
            v-if="isImageUrl(leaveApplication.attachment)"
            :src="leaveApplication.attachment"
            alt="Attachment preview"
            class="h-16 w-16 object-cover rounded-md border"
          />
          <div v-else class="h-16 w-16 grid place-items-center rounded-md border text-slate-500">
            <i class="far fa-file text-2xl"></i>
          </div>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium truncate">{{ filenameFromUrl(leaveApplication.attachment) }}</p>
          <a :href="leaveApplication.attachment" target="_blank" class="text-blue-600 underline text-xs">Open link</a>
        </div>
        <div class="flex gap-2" v-if="canEditAttachment">
          <button class="px-3 py-1.5 rounded-md border text-sm" @click="copyLink" :disabled="isUploading">Copy link</button>
          <button class="px-3 py-1.5 rounded-md border text-sm" @click="browseFiles" :disabled="isUploading">Replace</button>
          <button class="px-3 py-1.5 rounded-md border text-sm text-red-600" @click="removeAttachment" :disabled="isUploading">Remove</button>
        </div>
      </div>

      <!-- dropzone -->
      <div
        v-if="canEditAttachment"
        class="rounded-xl border-2 border-dashed p-6 transition grid place-items-center text-center"
        :class="[
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400',
          isUploading ? 'opacity-60 pointer-events-none' : ''
        ]"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <div class="space-y-2">
          <i class="far fa-cloud-upload-alt text-3xl"></i>
          <p class="text-sm text-slate-600">
            Drag & drop your file here, or
            <button class="text-blue-700 underline font-medium" type="button" @click="browseFiles">browse</button>
          </p>
          <p class="text-xs text-slate-500">
            Allowed: {{ ALLOWED_LABEL }} • Max {{ MAX_SIZE_MB }} MB
          </p>
        </div>
        <input
          ref="fileInput"
          class="hidden"
          type="file"
          :accept="ALLOWED_TYPES.join(',')"
          @change="handleFileSelect"
        />
        <div v-if="isUploading" class="mt-3 text-sm inline-flex items-center gap-2">
          <i class="far fa-circle-notch fa-spin"></i> Uploading…
        </div>
      </div>

      <!-- feedback -->
      <p v-if="uploadMsg" class="text-green-600 text-sm">{{ uploadMsg }}</p>
      <p v-if="uploadError" class="text-red-600 text-sm">{{ uploadError }}</p>
    </section>

    <ShareComponent />
  </div>
</template>
