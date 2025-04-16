<script setup>
import { useCommentStore } from "@/stores/useCommentStore";
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const store = useCommentStore();
const router = useRouter();
const route = useRoute();
const id = route.params.id;
const loading = ref(false);

// Editable form
const form = ref({
  commentable_type: "",
  commentable_id: "",
  user_id: "",
  message: "",
});

onMounted(async () => {
  await store.fetchComment(id);

  if (store.comment) {
    form.value = {
      commentable_type: store.comment.commentable_type
        .split("\\")
        .pop()
        .toLowerCase(), // "App\\Models\\Task" -> "task"
      commentable_id: store.comment.commentable_id,
      user_id: store.comment.user_id,
      message: store.comment.message,
    };
  }
});

const update = async () => {
  loading.value = true;
  await store.updateComment(id, { ...form.value });
  loading.value = false;

  if (!store.error) {
    router.push({ name: "CommentList" });
  }
};
</script>

<template>
  <div class="max-w-xl mx-auto p-6 mt-10 bg-white shadow-md rounded">
    <h2 class="text-xl font-semibold mb-4">Edit Comment</h2>

    <form @submit.prevent="update" class="space-y-4">
      <div>
        <label class="block font-medium">Commentable Type</label>
        <select
          v-model="form.commentable_type"
          required
          class="w-full border px-3 py-2 rounded"
        >
          <option value="task">Task</option>
          <option value="bug">Bug</option>
          <option value="meeting">Meeting</option>
        </select>
      </div>

      <div>
        <label class="block font-medium">Commentable ID</label>
        <input
          type="number"
          v-model="form.commentable_id"
          required
          class="w-full border px-3 py-2 rounded"
        />
      </div>

      <div>
        <label class="block font-medium">User ID</label>
        <input
          type="number"
          v-model="form.user_id"
          required
          class="w-full border px-3 py-2 rounded"
        />
      </div>

      <div>
        <label class="block font-medium">Message</label>
        <textarea
          v-model="form.message"
          required
          class="w-full border px-3 py-2 rounded"
        ></textarea>
      </div>

      <div v-if="store.error" class="text-red-500 font-medium">
        {{ store.error }}
      </div>

      <button
        :disabled="loading"
        class="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded"
      >
        {{ loading ? "Updating..." : "Update Comment" }}
      </button>
    </form>
  </div>
</template>
