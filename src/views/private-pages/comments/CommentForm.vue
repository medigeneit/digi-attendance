<script setup>
import { ref } from "vue";

const props = defineProps({
  formData: Object,
  loading: Boolean,
  error: String,
  onSubmit: Function,
});

const localForm = ref({ ...props.formData });

const emitSubmit = () => {
  props.onSubmit({ ...localForm.value });
};
</script>

<template>
  <form @submit.prevent="emitSubmit" class="space-y-4">
    <div>
      <label class="block font-medium">Commentable Type</label>
      <select
        v-model="localForm.commentable_type"
        required
        class="w-full border px-3 py-2 rounded"
      >
        <option value="" disabled>Select type</option>
        <option value="task">Task</option>
        <option value="bug">Bug</option>
        <option value="meeting">Meeting</option>
      </select>
    </div>

    <div>
      <label class="block font-medium">Commentable ID</label>
      <input
        type="number"
        v-model="localForm.commentable_id"
        required
        class="w-full border px-3 py-2 rounded"
      />
    </div>

    <div>
      <label class="block font-medium">User ID</label>
      <input
        type="number"
        v-model="localForm.user_id"
        required
        class="w-full border px-3 py-2 rounded"
      />
    </div>

    <div>
      <label class="block font-medium">Message</label>
      <textarea
        v-model="localForm.message"
        required
        class="w-full border px-3 py-2 rounded"
      ></textarea>
    </div>

    <div v-if="error" class="text-red-500">{{ error }}</div>

    <button
      :disabled="loading"
      type="submit"
      class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
    >
      {{ loading ? "Saving..." : "Submit Comment" }}
    </button>
  </form>
</template>
