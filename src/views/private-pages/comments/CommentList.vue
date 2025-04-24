<script setup>
import { useCommentStore } from "@/stores/useCommentStore";
import { onMounted } from "vue";
import { useRouter } from "vue-router";

const store = useCommentStore();
const router = useRouter();

onMounted(() => {
  store.fetchComments();
});

const goToAdd = () => {
  router.push({ name: "CommentAdd" });
};

const goToEdit = (id) => {
  router.push({ name: "CommentEdit", params: { id } });
};
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Comments</h2>
      <button @click="goToAdd" class="btn-1">Add Comment</button>
    </div>

    <div v-if="store.loading" class="text-center py-4 text-gray-500">
      Loading comments...
    </div>

    <div v-else-if="store.error" class="text-center py-4 text-red-500">
      {{ store.error }}
    </div>

    <table v-else class="min-w-full bg-white shadow rounded-lg overflow-hidden">
      <thead class="bg-gray-100">
        <tr>
          <th class="px-4 py-2 text-left">#</th>
          <th class="px-4 py-2 text-left">Message</th>
          <th class="px-4 py-2 text-left">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(comment, index) in store.comments"
          :key="comment.id"
          class="border-t hover:bg-gray-50"
        >
          <td class="px-4 py-2">{{ index + 1 }}</td>
          <td class="px-4 py-2 text-gray-700">
            {{
              comment.message.length > 50
                ? comment.message.slice(0, 50) + "..."
                : comment.message
            }}
          </td>
          <td class="px-4 py-2">
            <button @click="goToEdit(comment.id)" class="btn-2">Edit</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
