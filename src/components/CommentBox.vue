<script setup>
import { useCommentStore } from '@/stores/useCommentStore' // path adjust as your project
import { computed, onMounted, ref, watch } from 'vue'
// তোমার existing components (create কোরো না)
import TextEditor from '@/components/TextEditor.vue'
import UserAvatar from '@/components/UserAvatar.vue'

// ✅ Props: page থেকে এগুলো পাঠাবে
const props = defineProps({
  commentableType: { type: String, required: true }, // e.g. "task", "bug", "meeting"
  commentableId: { type: [Number, String], required: true },
  currentUser: { type: Object, required: true },
  // currentUser: {id, name, ...} --> user_id পাঠাতে লাগবে
})

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

// Add new comment
const submitComment = async () => {
  if (!message.value || !message.value.trim()) return

  isSubmitting.value = true
  try {
    await commentStore.createComment({
      commentable_type: props.commentableType,
      commentable_id: Number(props.commentableId),
      user_id: props.currentUser.id,
      message: message.value,
    })
    message.value = '' // reset editor
  } finally {
    isSubmitting.value = false
  }
}

// Delete comment
const removeComment = async (id) => {
  await commentStore.deleteComment(id)
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
    <!-- Comment List -->
    <!-- Comment List -->
    <div class="space-y-4">
      <div v-if="loading" class="text-sm text-gray-500">Loading comments...</div>

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
          <div
            class="prose prose-sm max-w-none text-gray-700 leading-relaxed text-sm"
            v-html="c.message"
          />

          <!-- Actions (visible on hover) -->
          <div
            v-if="canDelete(c)"
            class="mt-2 flex"
            :class="isMine(c) ? 'justify-end' : 'justify-start'"
          >
            <button
              class="text-[11px] text-gray-400 hover:text-red-600 transition opacity-0 group-hover:opacity-100"
              @click="removeComment(c.id)"
            >
              Delete
            </button>
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
          :disabled="isSubmitting || !message.trim()"
          @click="submitComment"
        >
          {{ isSubmitting ? 'Posting...' : 'Post Comment' }}
        </button>
      </div>

      <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
    </div>
  </div>
</template>
