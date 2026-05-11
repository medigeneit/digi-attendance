<script setup>
import { computed, ref, watch } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/axios'

const props = defineProps({
  userId: {
    type: [Number, String],
    required: true,
  },
  userName: {
    type: String,
    default: 'Employee',
  },
  defaultMessage: {
    type: String,
    default: '',
  },
  context: {
    type: Object,
    default: () => ({}),
  },
  endpoint: {
    type: String,
    default: '/user-messages/send',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  disabledTitle: {
    type: String,
    default: 'Message cannot be sent',
  },
  buttonLabel: {
    type: String,
    default: 'Message',
  },
  modalTitle: {
    type: String,
    default: 'Send message',
  },
  helperText: {
    type: String,
    default: 'Chat and phone SMS will be sent together.',
  },
  recentMessages: {
    type: Array,
    default: () => [],
  },
  recentTitle: {
    type: String,
    default: 'Recent message history',
  },
  showRecentMessages: {
    type: Boolean,
    default: false,
  },
  maxLength: {
    type: Number,
    default: 480,
  },
})

const emit = defineEmits(['sent', 'partial', 'error'])

const toast = useToast()
const open = ref(false)
const message = ref('')
const sending = ref(false)
const localRecentMessages = ref([])

const canSend = computed(() => {
  return Boolean(props.userId) && String(message.value || '').trim() && !sending.value
})

const historyItems = computed(() => {
  return [...localRecentMessages.value, ...(props.recentMessages || [])]
})

const formatHistoryDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

const historyMessageText = (item) => {
  return item?.message || item?.body || item?.text || ''
}

const historyMeta = (item) => {
  const parts = []
  const kind = item?.kind || item?.context?.source
  const refId = item?.ref_id || item?.context?.ref_id || item?.context?.item_ref_id

  if (kind) parts.push(refId ? `${kind} #${refId}` : kind)
  if (item?.send_status || item?.status) parts.push(item.send_status || item.status)

  return parts.join(' | ')
}

const resetMessage = () => {
  message.value = props.defaultMessage || ''
}

const openModal = () => {
  if (props.disabled || !props.userId) return
  resetMessage()
  open.value = true
}

const closeModal = () => {
  if (sending.value) return
  open.value = false
}

const send = async () => {
  const body = String(message.value || '').trim()

  if (!props.userId) return toast.error('Employee user id missing')
  if (!body) return toast.error('Message is required')

  sending.value = true

  try {
    const response = await apiClient.post(props.endpoint, {
      user_id: props.userId,
      message: body,
      context: props.context,
      date: props.context?.date,
    })

    const result = response.data
    localRecentMessages.value = [
      {
        id: `local-${Date.now()}`,
        message: body,
        kind: props.context?.source || 'message',
        ref_id: props.context?.ref_id || props.context?.item_ref_id || '',
        send_status: result?.sms?.success ? 'SENT' : 'CHAT_SENT',
        created_at: new Date().toISOString(),
      },
      ...localRecentMessages.value,
    ].slice(0, 10)

    if (result?.sms?.success) {
      toast.success('Chat and SMS sent')
      emit('sent', result)
    } else {
      toast.warning(result?.sms?.message || 'Chat sent, SMS failed')
      emit('partial', result)
    }

    sending.value = false
    closeModal()
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Message sending failed')
    emit('error', error)
  } finally {
    sending.value = false
  }
}

watch(
  () => props.defaultMessage,
  () => {
    if (open.value) resetMessage()
  }
)
</script>

<template>
  <span class="inline-flex">
    <slot
      name="trigger"
      :open="openModal"
      :disabled="disabled || !userId"
      :sending="sending"
    >
      <button
        type="button"
        class="user-message-trigger"
        :disabled="disabled || !userId"
        :title="disabled ? disabledTitle : 'Send message and SMS'"
        @click="openModal"
      >
        <i class="far fa-comment-alt"></i>
        <span>{{ buttonLabel }}</span>
      </button>
    </slot>

    <Teleport to="body">
      <div
        v-if="open"
        class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4"
      >
        <div class="user-message-modal">
          <div class="user-message-modal__header">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {{ modalTitle }}
              </p>
              <h2 class="text-base font-semibold text-slate-800">
                {{ userName || 'Employee' }}
              </h2>
            </div>
            <button type="button" class="btn-3 !h-9 !w-9 rounded-full" @click="closeModal">
              <i class="far fa-times"></i>
            </button>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-semibold text-slate-500">Message</label>
            <textarea
              v-model="message"
              rows="5"
              :maxlength="maxLength"
              class="user-message-textarea"
            ></textarea>
            <div class="flex items-center justify-between gap-3 text-xs text-slate-400">
              <span>{{ helperText }}</span>
              <span>{{ (message || '').length }}/{{ maxLength }}</span>
            </div>
          </div>

          <div
            v-if="showRecentMessages || historyItems.length"
            class="user-message-history"
          >
            <div class="user-message-history__header">
              <span>{{ recentTitle }}</span>
              <span>{{ historyItems.length }} entries</span>
            </div>
            <div v-if="historyItems.length" class="user-message-history__list">
              <div
                v-for="item in historyItems"
                :key="item.id || `${item.created_at}-${historyMessageText(item)}`"
                class="user-message-history__item"
              >
                <div class="user-message-history__message">
                  {{ historyMessageText(item) }}
                </div>
                <div class="user-message-history__meta">
                  <span>{{ historyMeta(item) }}</span>
                  <span>{{ formatHistoryDate(item.created_at || item.sent_at || item.createdAt) }}</span>
                </div>
              </div>
            </div>
            <div v-else class="user-message-history__empty">
              No recent message history found.
            </div>
          </div>

          <div class="user-message-modal__actions">
            <button type="button" class="btn-3 px-4 py-1.5" @click="closeModal">
              Cancel
            </button>
            <button
              type="button"
              class="btn-2 px-4 py-1.5"
              :disabled="!canSend"
              @click="send"
            >
              <i class="far fa-paper-plane"></i>
              <span>{{ sending ? 'Sending...' : 'Send' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </span>
</template>

<style scoped>
.user-message-trigger {
  @apply inline-flex items-center justify-center gap-1 rounded border border-sky-200 px-2 py-1 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300 disabled:hover:bg-transparent;
}
.user-message-modal {
  @apply max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-100 bg-white p-4 shadow-xl;
}
.user-message-modal__header {
  @apply mb-4 flex items-start justify-between gap-3;
}
.user-message-textarea {
  @apply w-full resize-none rounded-xl border border-slate-200 p-3 text-sm text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100;
}
.user-message-modal__actions {
  @apply mt-5 flex items-center justify-end gap-2;
}
.user-message-history {
  @apply mt-4 rounded-2xl bg-slate-50 p-3 text-sm;
}
.user-message-history__header {
  @apply mb-3 flex items-center justify-between gap-3 text-xs font-semibold text-slate-600;
}
.user-message-history__list {
  @apply max-h-60 space-y-2 overflow-y-auto pr-1;
}
.user-message-history__item {
  @apply rounded-2xl border border-slate-200 bg-white p-3 text-[11px] text-slate-700;
}
.user-message-history__message {
  @apply mb-2 whitespace-normal break-words font-semibold text-slate-800;
}
.user-message-history__meta {
  @apply flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-[10px] text-slate-500;
}
.user-message-history__empty {
  @apply rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-500;
}
</style>
