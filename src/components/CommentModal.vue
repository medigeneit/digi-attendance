<!-- components/CommentModal.vue -->
<script setup>
import { useCommentStore } from "@/stores/useCommentStore";
import { ref, watch } from "vue";

const props = defineProps({
  show: Boolean,
  onClose: Function,
  commentableId: Number,
  commentableType: String,
  userId: Number,
});
const emit = defineEmits(["submitted"]);

const store = useCommentStore();
const message = ref("");
const loading = ref(false);

watch(
  () => props.show,
  (val) => {
    if (val) message.value = ""; // reset on open
  }
);

const submit = async () => {
  loading.value = true;
  await store.createComment({
    commentable_id: props.commentableId,
    commentable_type: props.commentableType,
    user_id: props.userId,
    message: message.value,
  });
  loading.value = false;

  if (!store.error) {
    emit("submitted");
    props.onClose(); // close modal
  }
};
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
  >
    <div class="bg-white p-6 w-full max-w-md rounded-lg shadow-lg relative">
      <button
        @click="onClose"
        class="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-xl"
      >
        ×
      </button>

      <h2 class="text-lg font-semibold mb-4">Add Comment</h2>

      <textarea
        v-model="message"
        placeholder="Write your comment..."
        class="w-full border rounded px-3 py-2 mb-2"
        rows="4"
      ></textarea>

      <div v-if="store.error" class="text-red-500 mb-2">{{ store.error }}</div>

      <button
        @click="submit"
        :disabled="loading || !message"
        class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full"
      >
        {{ loading ? "Saving..." : "Submit Comment" }}
      </button>
    </div>
  </div>
</template>
