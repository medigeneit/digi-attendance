<script setup>
import TextEditor from '@/components/TextEditor.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { stripTags } from '@/libs/string'
import { useCommentStore } from '@/stores/useCommentStore' // path adjust as your project
import { computed, onMounted, ref, watch } from 'vue'
import OverlyModal from './common/OverlyModal.vue'
import HTMLTextBody from './HTMLTextBody.vue'

// ✅ Props: page থেকে এগুলো পাঠাবে
const props = defineProps({
  commentableType: { type: String, required: true }, // e.g. "task", "bug", "meeting"
  commentableId: { type: [Number, String], required: true },
  currentUser: { type: Object, required: true },
  mentionableUsers: { type: Array, default: () => [] },
  mentionableTasks: { type: Array, default: () => [] },
  // currentUser: {id, name, ...} --> user_id পাঠাতে লাগবে
})

// delete modal state
const deleteOpen = ref(false)
const deleteTarget = ref(null) // comment object

const openDeleteModal = (c) => {
  deleteTarget.value = c
  deleteOpen.value = true
}

const closeDeleteModal = () => {
  deleteOpen.value = false
  deleteTarget.value = null
}

// confirm delete
const confirmDelete = async () => {
  if (!deleteTarget.value) return

  const id = deleteTarget.value.id

  // modal close first (optional)
  closeDeleteModal()

  // then delete
  await removeComment(id)
}

const globalErrors = ref([]) // ✅ multiple overall errors
const commentErrors = ref({}) // ✅ per-comment error map { [id]: [msg1,msg2] }

// helper: add global error (duplicates avoid optional)
const pushGlobalError = (msg) => {
  if (!msg) return
  globalErrors.value.push({
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    message: msg,
    time: new Date().toISOString(),
  })
}

// helper: add per-comment error
const pushCommentError = (commentId, msg) => {
  if (!commentId || !msg) return
  if (!commentErrors.value[commentId]) {
    commentErrors.value[commentId] = []
  }
  commentErrors.value[commentId].push(msg)
}

// clear a specific comment’s errors (optional)
const clearCommentErrors = (commentId) => {
  commentErrors.value[commentId] = []
}

const commentStore = useCommentStore()

const comments = computed(() => commentStore.comments)
const loading = computed(() => commentStore.loading)
const error = computed(() => commentStore.error)

// ✅ New comment message (TextEditor v-model)
const message = ref('')
const isSubmitting = ref(false)
const replyTo = ref(null)
const commentBoxRef = ref(null)
const textEditorRef = ref(null)

const setReplyTo = (c) => {
  replyTo.value = c
  commentBoxRef.value?.scrollIntoView({ behavior: 'smooth' })
  setTimeout(() => {
    textEditorRef.value?.focus()
  }, 100)
}

const cancelReply = () => {
  replyTo.value = null
}

const scrollToComment = (commentId) => {
  if (!commentId) return
  const el = document.getElementById(`comment-${commentId}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Optional: Brief highlight effect
    el.classList.add('ring-2', 'ring-indigo-400', 'ring-offset-2')
    setTimeout(() => {
      el.classList.remove('ring-2', 'ring-indigo-400', 'ring-offset-2')
    }, 2000)
  }
}

// Fetch comments for this model
const loadComments = async () => {
  await commentStore.fetchComments({
    commentable_type: props.commentableType,
    commentable_id: props.commentableId,
  })
}

const submitComment = async () => {
  if (!message.value || !stripTags(String(message.value)).trim()) return

  isSubmitting.value = true
  try {
    const parentComment = replyTo.value
    await commentStore.createComment({
      commentable_type: props.commentableType,
      commentable_id: Number(props.commentableId),
      user_id: props.currentUser.id,
      message: message.value,
      parent_id: parentComment?.id || null,
    })

    // ✅ Auto-acknowledge if replying to a mention that isn't acknowledged yet
    if (parentComment && mentionedInComment(parentComment) && !isAcknowledged(parentComment)) {
      try {
        await commentStore.acknowledgeComment(parentComment.id)
      } catch (err) {
        console.error('Auto-acknowledge error:', err)
      }
    }

    message.value = ''
    replyTo.value = null
  } catch (e) {
    pushGlobalError(e.message)
  } finally {
    isSubmitting.value = false
  }
}

const removeComment = async (id) => {
  clearCommentErrors(id)

  try {
    await commentStore.deleteComment(id)
  } catch (e) {
    pushCommentError(id, e.response?.data?.message)
  }
}

onMounted(loadComments)

// commentable change হলে re-fetch
watch(
  () => [props.commentableType, props.commentableId],
  () => loadComments(),
)

// helper for date
const formatDate = (dt) => {
  if (!dt) return ''
  const d = new Date(dt)
  return d.toLocaleString() // simple
}

// optional: only show delete for own comment
const canDelete = (c) => {
  return c?.user_id === props.currentUser.id
}

const isMine = (c) => c?.user_id === props.currentUser.id

const mentionedInComment = (c) => {
  return c.mentions?.find((m) => m.user_id == props.currentUser.id)
}

const isAcknowledged = (c) => {
  const mention = mentionedInComment(c)
  return mention && mention.acknowledged_at
}
</script>

<template>
  <div class="space-y-4">
    <!-- ✅ Global Errors -->
    <div v-if="globalErrors.length" class="space-y-2">
      <div
        v-for="err in globalErrors"
        :key="err.id"
        class="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start justify-between gap-3"
      >
        <div>
          <p class="font-semibold">Error</p>
          <p class="text-xs opacity-80">{{ err.message }}</p>
        </div>

        <button
          class="text-xs text-red-500 hover:underline"
          @click="globalErrors = globalErrors.filter((e) => e.id !== err.id)"
        >
          Dismiss
        </button>
      </div>
    </div>

    <!-- Comment List -->
    <div class="space-y-4">
      <div v-if="loading && commentStore.action == 'fetching'" class="text-sm text-gray-500">
        Loading comments...
      </div>

      <div v-else-if="!comments.length" class="text-sm text-gray-500">No comments yet.</div>

      <div
        v-for="c in comments"
        :key="c.id"
        :id="`comment-${c.id}`"
        class="flex gap-3 transition-all duration-500 rounded-lg"
        :class="isMine(c) ? 'justify-end' : 'justify-start'"
      >
        <!-- Left avatar for others -->
        <div v-if="!isMine(c)" class="shrink-0 mt-2">
          <UserAvatar :user="c.user" />
        </div>

        <!-- Bubble -->
        <div
          class="group relative min-w-[25%] max-w-[90%] rounded-md shadow border bubble-arrow"
          :class="
            isMine(c)
              ? 'bubble-right bg-indigo-50 border-indigo-100'
              : 'bubble-left bg-white border-gray-100'
          "
        >
          <div class="bg-inherit bubble-inner px-4 py-3 rounded-md">
            <!-- Parent Reference (Quote) -->
            <div
              v-if="c.parent"
              class="mb-3 p-2 bg-black/5 rounded border-l-4 border-indigo-300 text-xs opacity-70 cursor-pointer hover:bg-black/10 transition-colors"
              title="Click to see original message"
              @click="scrollToComment(c.parent_id)"
            >
              <div class="flex items-center gap-1 mb-1 font-bold text-gray-600">
                <i class="fas fa-reply scale-x-[-1] mr-1"></i>
                Replying to {{ c.parent.user?.name || 'Deleted User' }}
              </div>
              <div class="line-clamp-2 italic" v-html="c.parent.message"></div>
            </div>

            <!-- Header -->
            <div
              class="flex items-center gap-2 mb-2 pb-1 border-b border-dashed"
              :class="isMine(c) ? 'justify-end' : 'justify-start'"
            >
              <p class="text-sm font-bold text-gray-800">
                {{ isMine(c) ? 'You' : c.user?.name || 'Unknown' }}
              </p>
              <span class="text-xs text-gray-400">•</span>
              <p class="text-xs text-gray-400">
                {{ formatDate(c.created_at) }}
              </p>
            </div>

            <!-- Message -->
            <HTMLTextBody :message="c.message" />

            <!-- Mentions & Acknowledgments -->
            <div v-if="c.mentions?.length" class="mt-3 pt-2 border-t border-dashed border-gray-200">
              <div class="flex flex-wrap gap-2 items-center">
                <span class="text-[10px] text-gray-400 uppercase font-semibold">Mentions:</span>
                <div
                  v-for="m in c.mentions"
                  :key="m.id"
                  class="flex items-center gap-1 group/mention"
                >
                  <div
                    class="flex items-center gap-1.5 px-1 py-0.5 rounded-full text-xs box-border border transition cursor-default"
                    :class="
                      m.acknowledged_at
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-gray-50 border-gray-200 text-gray-500'
                    "
                    :title="
                      m.acknowledged_at
                        ? `Acknowledged at ${formatDate(m.acknowledged_at)}`
                        : 'Not acknowledged yet'
                    "
                  >
                    <UserAvatar :user="m.user" size="2xsmall" />
                    <span>{{ m.user?.name }}</span>
                    <i v-if="m.acknowledged_at" class="fas fa-check-circle text-[10px]"></i>
                  </div>
                </div>
              </div>

              <!-- Acknowledge via Reply for mentioned user -->
              <div
                v-if="mentionedInComment(c) && !isAcknowledged(c)"
                class="mt-2 border rounded border-dashed p-2 text-center flex flex-col items-center gap-2 bg-yellow-50"
              >
                <div class="flex items-center gap-2 text-sm text-gray-700 font-medium font-bengali">
                  <i class="fas fa-info-circle text-orange-400"></i>
                  <span>আপনাকে মেনশন করা হয়েছে</span>
                </div>

                <button
                  @click="setReplyTo(c)"
                  class="flex items-center gap-2 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition shadow-sm"
                >
                  <i class="fas fa-reply"></i>
                  <span>Reply</span>
                </button>
              </div>
            </div>

            <!-- Actions (visible on hover) -->
            <div class="mt-2 flex gap-3" :class="isMine(c) ? 'justify-end' : 'justify-start'">
              <button
                v-if="!replyTo || replyTo.id !== c.id"
                class="text-[11px] text-gray-400 hover:text-indigo-600 transition opacity-0 group-hover:opacity-100"
                @click="setReplyTo(c)"
              >
                Reply
              </button>
              <button
                v-if="canDelete(c)"
                class="text-[11px] text-gray-400 hover:text-red-600 transition opacity-0 group-hover:opacity-100"
                @click="openDeleteModal(c)"
              >
                Delete
              </button>
            </div>
            <div v-if="commentErrors[c.id]?.length" class="mt-2 space-y-1">
              <p
                v-for="(msg, i) in commentErrors[c.id]"
                :key="i"
                class="text-xs text-red-600"
                :class="isMine(c) ? 'text-right' : 'text-left'"
              >
                {{ msg }}
              </p>
            </div>
          </div>
        </div>

        <!-- Right avatar for mine -->
        <div v-if="isMine(c)" class="shrink-0 mt-2">
          <UserAvatar :user="c.user || currentUser" />
        </div>
      </div>
    </div>

    <!-- Add Comment Box -->
    <div ref="commentBoxRef" class="bg-white rounded-xl shadow-sm border p-4 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <UserAvatar :user="currentUser" />
          <div class="text-sm font-semibold text-gray-700">
            {{ currentUser?.name || 'You' }}
          </div>
        </div>

        <div
          v-if="replyTo"
          class="flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full animate-pulse"
        >
          <span class="text-[11px] text-indigo-700 font-medium">
            Replying to
            <span class="font-bold underline">{{ replyTo.user?.name || 'Unknown' }}</span>
          </span>
          <button @click="cancelReply" class="text-indigo-400 hover:text-indigo-600 transition">
            <i class="fas fa-times-circle text-xs"></i>
          </button>
        </div>
      </div>

      <TextEditor
        ref="textEditorRef"
        v-model="message"
        :mentionable-users="mentionableUsers"
        :mentionable-tasks="mentionableTasks"
        :current-user="currentUser"
      />

      <div class="flex items-center justify-end gap-2">
        <button
          class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-60"
          :disabled="isSubmitting || !stripTags(String(message)).trim()"
          @click="submitComment"
        >
          {{ isSubmitting ? 'Posting...' : replyTo ? 'Post Reply' : 'Post Comment' }}
        </button>
      </div>

      <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
    </div>

    <!-- ✅ Delete Confirmation Modal -->
    <OverlyModal v-if="deleteOpen">
      <div class="bg-white rounded-2xl w-full p-5 space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">Delete comment?</h3>

        <p class="text-sm text-gray-600 leading-relaxed">
          আপনি কি নিশ্চিত যে এই কমেন্টটি মুছে ফেলতে চান? মুছে ফেলা কমেন্ট পুনরুদ্ধার করা যাবে না।
        </p>

        <!-- preview -->
        <div
          class="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm text-gray-700 max-h-40 overflow-auto"
        >
          <div v-html="deleteTarget?.message"></div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            class="px-4 py-2 rounded-lg border text-sm text-gray-700 hover:bg-gray-50"
            @click="closeDeleteModal"
          >
            Cancel
          </button>

          <button
            class="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
            @click="confirmDelete"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </OverlyModal>
  </div>
</template>

<style scoped>
.bubble-inner {
  z-index: 4;
  position: relative;
}

.bubble-arrow.bubble-right::before {
  content: '';
  position: absolute;
  top: 12px;
  right: -8px;
  height: 14px;
  width: 14px;
  background-color: inherit;
  border-color: inherit;
  box-shadow: inherit;
  transform: rotate(-45deg);
  z-index: 1;
  border-width: 0;
  border-bottom-width: 1px;
  border-bottom-style: solid;
  border-right-width: 1px;
  border-right-style: solid;
}

.bubble-arrow.bubble-left::before {
  content: '';
  position: absolute;
  top: 12px;
  left: -8px;
  height: 14px;
  width: 14px;
  background-color: inherit;
  border-color: inherit;
  box-shadow: inherit;
  transform: rotate(45deg);
  z-index: 1;
  border-width: 0;
  border-bottom-width: 1px;
  border-bottom-style: solid;
  border-left-width: 1px;
  border-left-style: solid;
}
</style>
