<script setup>
import { useCommentStore } from '@/stores/useCommentStore' // path adjust as your project
import { computed, onMounted, ref, watch } from 'vue'
import TextEditor from '@/components/TextEditor.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { stripTags } from '@/libs/string'
import OverlyModal from './common/OverlyModal.vue'
import HTMLTextBody from './HTMLTextBody.vue'

// ✅ Props: page থেকে এগুলো পাঠাবে
const props = defineProps({
  commentableType: { type: String, required: true }, // e.g. "task", "bug", "meeting"
  commentableId: { type: [Number, String], required: true },
  currentUser: { type: Object, required: true },
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
    id: crypto.randomUUID(),
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
    await commentStore.createComment({
      commentable_type: props.commentableType,
      commentable_id: Number(props.commentableId),
      user_id: props.currentUser.id,
      message: message.value,
    })

    message.value = ''
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
        class="flex gap-3"
        :class="isMine(c) ? 'justify-end' : 'justify-start'"
      >
        <!-- Left avatar for others -->
        <div v-if="!isMine(c)" class="shrink-0">
          <UserAvatar :user="c.user" />
        </div>

        <!-- Bubble -->
        <div
          class="group relative min-w-[50%] max-w-[90%] rounded-md px-4 py-3 shadow-sm border"
          :class="isMine(c) ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-gray-100'"
        >
          <!-- Header -->
          <div
            class="flex items-center gap-2 mb-1"
            :class="isMine(c) ? 'justify-end' : 'justify-start'"
          >
            <p class="text-sm font-semibold text-gray-800">
              {{ isMine(c) ? 'You' : c.user?.name || 'Unknown' }}
            </p>
            <span class="text-xs text-gray-400">•</span>
            <p class="text-xs text-gray-400">
              {{ formatDate(c.created_at) }}
            </p>
          </div>

          <!-- Message -->
          <HTMLTextBody :message="c.message" />

          <!-- Actions (visible on hover) -->
          <div
            v-if="canDelete(c)"
            class="mt-2 flex"
            :class="isMine(c) ? 'justify-end' : 'justify-start'"
          >
            <button
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

        <!-- Right avatar for mine -->
        <div v-if="isMine(c)" class="shrink-0">
          <UserAvatar :user="c.user || currentUser" />
        </div>
      </div>
    </div>

    <!-- Add Comment Box -->
    <div class="bg-white rounded-xl shadow-sm border p-4 space-y-3">
      <div class="flex items-center gap-2">
        <UserAvatar :user="currentUser" />
        <div class="text-sm font-semibold text-gray-700">
          {{ currentUser?.name || 'You' }}
        </div>
      </div>

      <TextEditor v-model="message" />

      <div class="flex items-center justify-end gap-2">
        <button
          class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-60"
          :disabled="isSubmitting || !stripTags(String(message)).trim()"
          @click="submitComment"
        >
          {{ isSubmitting ? 'Posting...' : 'Post Comment' }}
        </button>
      </div>

      <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
    </div>

    <!-- ✅ Delete Confirmation Modal -->
    <OverlyModal v-if="deleteOpen">
      <div class="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
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
