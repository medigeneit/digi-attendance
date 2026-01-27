<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDisciplineReportStore } from '@/stores/useDisciplineReportStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  attachments: { type: Array, default: () => [] },
  user: { type: Object, default: null },
  monthStart: { type: String, default: '' },
  year: { type: Number, default: new Date().getFullYear() },
})

const emit = defineEmits(['close'])

const authStore = useAuthStore()
const reportStore = useDisciplineReportStore()

const canManage = computed(() => {
  const role = String(authStore.user?.role || '').toLowerCase()
  const roles = (authStore.user?.roles || []).map((r) => String(r).toLowerCase())
  return ['admin', 'super_admin', 'developer', 'hr'].includes(role) || roles.includes('hr')
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

const isLetter = (item) => {
  const type = String(item?.type || item?.attachment_type || '').toLowerCase()
  return type === 'letter' || type === 'text'
}

const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, '').trim()

const deleteAttachment = async (item) => {
  if (!canManage.value) return
  if (!confirm('Delete this attachment?')) return
  await reportStore.deleteAttachment(item.id, { month_start: props.monthStart })
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/40">
    <div class="w-full max-w-3xl rounded-2xl border border-slate-100 bg-white shadow-xl">
      <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Attachments</p>
          <h3 class="text-lg font-semibold text-slate-800">
            {{ user?.name || user?.user || 'Employee' }}
          </h3>
          <p class="text-xs text-slate-500">{{ monthStart }}</p>
        </div>
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
          @click="emit('close')"
        >
          <i class="far fa-times"></i>
        </button>
      </div>

      <div class="max-h-[60vh] space-y-3 overflow-auto px-5 py-4">
        <div
          v-for="item in attachments"
          :key="item?.id || attachmentLabel(item)"
          class="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-slate-800">{{ attachmentLabel(item) }}</p>
              <p class="text-[11px] uppercase tracking-wide text-slate-400">
                {{ isLetter(item) ? 'Letter' : 'File' }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <a
                v-if="!isLetter(item) && attachmentUrl(item)"
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
          <p v-if="isLetter(item)" class="mt-2 text-xs text-slate-600">
            {{ stripHtml(item?.body_html || item?.body || item?.content).slice(0, 180) }}
          </p>
        </div>

        <p v-if="attachments.length === 0" class="text-sm text-slate-500">
          No attachments yet.
        </p>
      </div>

      <div class="flex items-center justify-end border-t border-slate-100 px-5 py-3">
        <router-link
          :to="{
            name: 'DisciplineAttachments',
            query: { user_id: user?.id || user?.user_id, month_start: monthStart, year }
          }"
          class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
        >
          Open Full Page
          <i class="far fa-arrow-up-right-from-square text-[10px]"></i>
        </router-link>
      </div>
    </div>
  </div>
</template>
