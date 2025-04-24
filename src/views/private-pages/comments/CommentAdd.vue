<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import CommentForm from "./CommentForm.vue";
import { useCommentStore } from "@/stores/useCommentStore";

const store = useCommentStore();
const router = useRouter();

const form = ref({
  commentable_type: "task",
  commentable_id: "",
  user_id: 1, // get from auth or userStore
  message: "",
});

const loading = ref(false);

const handleSubmit = async (data) => {
  loading.value = true;
  await store.createComment(data);
  loading.value = false;

  if (!store.error) {
    router.push({ name: "CommentList" });
  }
};
</script>

<template>
  <div class="max-w-xl mx-auto p-6">
    <h2 class="text-xl font-semibold mb-4">Add Comment</h2>
    <CommentForm
      :form-data="form"
      :on-submit="handleSubmit"
      :loading="loading"
      :error="store.error"
    />
  </div>
</template>
