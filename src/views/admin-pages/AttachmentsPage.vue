<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LoaderView from '@/components/common/LoaderView.vue'
import LetterEditor from '@/components/discipline/LetterEditor.vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useDisciplineReportStore } from '@/stores/useDisciplineReportStore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const reportStore = useDisciplineReportStore()
const { users, loading } = storeToRefs(reportStore)

const mode = ref('file')
const attachmentTitle = ref('')
const attachmentFile = ref(null)
const letterForm = ref({ title: '', body_html: '' })
const isSaving = ref(false)

const userId = computed(() => Number(route.query.user_id) || route.query.user_id)
const monthStart = computed(() => route.query.month_start || '')
const year = computed(() => Number(route.query.year) || new Date().getFullYear())

const canManage = computed(() => {
  const role = String(authStore.user?.role || '').toLowerCase()
  const roles = (authStore.user?.roles || []).map((r) => String(r).toLowerCase())
  return ['admin', 'super_admin', 'developer', 'hr'].includes(role) || roles.includes('hr')
})

const getUserId = (user) => user?.id || user?.user_id
const getUserName = (user) =>
  user?.name || user?.user || user?.employee_name || user?.full_name || 'Employee'

const getRecord = (user, monthStartValue) => user?._monthMap?.[monthStartValue] || null

const activeUser = computed(() =>
  users.value.find((user) => Number(getUserId(user)) === Number(userId.value))
)

const record = computed(() => getRecord(activeUser.value, monthStart.value))

const attachments = computed(() => {
  const files = record.value?.attachments || record.value?.attachment_files || record.value?.files || []
  const letters =
    record.value?.letters || record.value?.text_letters || record.value?.letter_attachments || []
  return [
    ...files.map((item) => ({ ...item, _type: 'file' })),
    ...letters.map((item) => ({ ...item, _type: 'letter' })),
  ]
})

const attachmentLabel = (item) =>
  item?.title ||
  item?.name ||
  item?.file_name ||
  item?.original_name ||
  item?.filename ||
  'Attachment'

const attachmentUrl = (item) =>
  item?.url || item?.file_url || item?.download_url || item?.path || ''

const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, '').trim()

const onFileChange = (event) => {
  attachmentFile.value = event.target.files?.[0] || null
}

const refreshMonth = async () => {
  if (!monthStart.value) return
  reportStore.setFilters({ year: year.value })
  await reportStore.refreshMonth(monthStart.value)
}

const uploadAttachment = async () => {
  if (!attachmentFile.value || !userId.value || !monthStart.value) return
  isSaving.value = true
  try {
    await reportStore.uploadAttachment({
      file: attachmentFile.value,
      title: attachmentTitle.value,
      user_id: userId.value,
      month_start: monthStart.value,
      year: year.value,
    })
    attachmentTitle.value = ''
    attachmentFile.value = null
  } catch (err) {
    console.error('Failed to upload attachment:', err)
  } finally {
    isSaving.value = false
  }
}

const saveLetter = async () => {
  if (!letterForm.value.title || !letterForm.value.body_html) return
  isSaving.value = true
  try {
    await reportStore.createLetter({
      title: letterForm.value.title,
      body_html: letterForm.value.body_html,
      user_id: userId.value,
      month_start: monthStart.value,
      year: year.value,
    })
    letterForm.value = { title: '', body_html: '' }
  } catch (err) {
    console.error('Failed to save letter:', err)
  } finally {
    isSaving.value = false
  }
}

const deleteAttachment = async (item) => {
  if (!canManage.value) return
  if (!confirm('Delete this attachment?')) return
  await reportStore.deleteAttachment(item.id, { month_start: monthStart.value })
}

const goBack = () => router.push({ name: 'DisciplineReport' })

watch([userId, monthStart, year], refreshMonth, { immediate: true })
</script>

<template>
  <div class="px-4 space-y-5">
    <div class="glass-panel flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Attachments
        </p>
        <h1 class="text-2xl font-semibold text-slate-900">
          {{ getUserName(activeUser) }}
        </h1>
        <p class="text-sm text-slate-500">{{ monthStart || 'Month not selected' }}</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
        @click="goBack"
      >
        <i class="far fa-arrow-left"></i>
        Back to Report
      </button>
    </div>

    <div class="glass-panel space-y-4 px-5 py-4">
      <div class="flex flex-wrap items-center gap-4">
        <label class="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input type="radio" value="file" v-model="mode" />
          File Upload
        </label>
        <label class="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input type="radio" value="letter" v-model="mode" />
          Write Letter
        </label>
      </div>

      <div v-if="mode === 'file'" class="grid gap-3 md:grid-cols-[1fr_auto]">
        <div class="space-y-2">
          <input
            v-model="attachmentTitle"
            type="text"
            placeholder="Attachment title (optional)"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          <input
            type="file"
            class="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm"
            @change="onFileChange"
          />
        </div>
        <button
          type="button"
          class="h-10 rounded-full bg-slate-900 px-4 text-xs font-semibold text-white"
          :disabled="isSaving || !attachmentFile"
          @click="uploadAttachment"
        >
          Upload
        </button>
      </div>

      <div v-else class="space-y-3">
        <input
          v-model="letterForm.title"
          type="text"
          placeholder="Letter title"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
        <LetterEditor v-model="letterForm.body_html" />
        <div class="flex justify-end">
          <button
            type="button"
            class="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
            :disabled="isSaving || !letterForm.title || !letterForm.body_html"
            @click="saveLetter"
          >
            Save Letter
          </button>
        </div>
      </div>
    </div>

    <LoaderView v-if="loading" />

    <div v-else class="glass-panel px-5 py-4">
      <div v-if="attachments.length === 0" class="empty-state">
        <p class="text-base font-semibold text-slate-700">No attachments found</p>
        <p class="text-sm text-slate-500">Upload a file or write a letter to get started.</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="item in attachments"
          :key="item?.id || attachmentLabel(item)"
          class="rounded-xl border border-slate-100 bg-slate-50/70 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-slate-800">{{ attachmentLabel(item) }}</p>
              <p class="text-[11px] uppercase tracking-wide text-slate-400">
                {{ item._type === 'letter' ? 'Letter' : 'File' }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <a
                v-if="item._type !== 'letter' && attachmentUrl(item)"
                :href="attachmentUrl(item)"
                target="_blank"
                class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:text-slate-800"
              >
                <i class="far fa-arrow-up-right-from-square"></i>
                Open
              </a>
              <button
                v-if="canManage"
                type="button"
                class="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 hover:text-rose-700"
                @click="deleteAttachment(item)"
              >
                <i class="far fa-trash"></i>
                Delete
              </button>
            </div>
          </div>
          <p v-if="item._type === 'letter'" class="mt-2 text-xs text-slate-600">
            {{ stripHtml(item?.body_html || item?.body || item?.content).slice(0, 220) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-panel { @apply rounded-2xl border border-slate-100 bg-white/80 shadow-sm; }
.empty-state { @apply flex min-h-[160px] flex-col items-center justify-center gap-1 text-center; }
</style>
