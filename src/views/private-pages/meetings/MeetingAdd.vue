<script setup>
import { useMeetingStore } from "@/stores/useMeetingStore";
import { ref } from "vue";
import { useRouter } from "vue-router";

const store = useMeetingStore();
const router = useRouter();

const title = ref("");
const meeting_time = ref("");
const notes = ref("");
const loading = ref(false);

const submit = async () => {
  loading.value = true;
  await store.createMeeting({
    title: title.value,
    meeting_time: meeting_time.value,
    notes: notes.value,
  });
  loading.value = false;

  if (!store.error) {
    router.push({ name: "MeetingList" });
  }
};
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="max-w-xl mx-auto bg-white shadow-lg rounded-lg p-6">
      <h2 class="text-2xl font-semibold text-gray-800 mb-4">Add New Meeting</h2>

      <form @submit.prevent="submit">
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2"
            >Meeting Title</label
          >
          <input
            v-model="title"
            required
            placeholder="Enter meeting title"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2"
            >Meeting Time</label
          >
          <input
            v-model="meeting_time"
            required
            type="datetime-local"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2"
            >Notes (Optional)</label
          >
          <textarea
            v-model="notes"
            rows="4"
            placeholder="Add meeting notes"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          ></textarea>
        </div>

        <div v-if="store.error" class="mb-4 text-red-500 font-medium">
          {{ store.error }}
        </div>

        <div class="flex items-center gap-4">
          <button
            :disabled="loading"
            type="submit"
            class="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded transition"
          >
            {{ loading ? "Saving..." : "Save Meeting" }}
          </button>

          <button
            type="button"
            @click="router.push({ name: 'MeetingList' })"
            class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
