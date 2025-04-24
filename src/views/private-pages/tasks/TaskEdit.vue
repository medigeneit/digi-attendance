<script setup>
import { onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTaskStore } from "@/stores/useTaskStore";

const store = useTaskStore();
const route = useRoute();
const router = useRouter();

const taskId = route.params.id;
const loading = ref(false);

const form = ref({
  title: "",
  requirement_id: "",
  user_ids: "",
  priority: "MEDIUM",
  status: "PENDING",
  description: "",
});

onMounted(async () => {
  await store.fetchTask(taskId);
  form.value = {
    title: store.task.title,
    requirement_id: store.task.requirement_id,
    user_ids: store.task.users.map((u) => u.id).join(","),
    priority: store.task.priority,
    status: store.task.status,
    description: store.task.description,
  };
});

watch(
  () => store.task,
  (newTask) => {
    form.value = {
      title: newTask.title,
      requirement_id: newTask.requirement_id,
      user_ids: newTask.users.map((u) => u.id).join(","),
      priority: newTask.priority,
      status: newTask.status,
      description: newTask.description,
    };
  }
);

const update = async () => {
  loading.value = true;

  const payload = {
    ...form.value,
    user_ids: form.value.user_ids.split(",").map(Number),
  };

  await store.updateTask(taskId, payload);
  loading.value = false;

  if (!store.error) {
    router.push({ name: "TaskList" });
  }
};
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="max-w-xl mx-auto bg-white shadow-lg rounded-lg p-6">
      <h2 class="text-2xl font-semibold text-gray-800 mb-4">Edit Task</h2>

      <div v-if="store.loading" class="text-center py-4 text-gray-500">
        Loading task details...
      </div>

      <form v-else-if="store.task" @submit.prevent="update">
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Task Title</label>
          <input
            v-model="form.title"
            required
            placeholder="Enter task title"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2"
            >Requirement ID</label
          >
          <input
            v-model="form.requirement_id"
            type="number"
            required
            placeholder="Enter requirement ID"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">User IDs</label>
          <input
            v-model="form.user_ids"
            required
            placeholder="1,2,3"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <small class="text-gray-500">Comma-separated user IDs.</small>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-gray-700 font-medium mb-2">Priority</label>
            <select
              v-model="form.priority"
              class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option>LOW</option>
              <option>MEDIUM</option>
              <option>HIGH</option>
              <option>CRITICAL</option>
            </select>
          </div>

          <div>
            <label class="block text-gray-700 font-medium mb-2">Status</label>
            <select
              v-model="form.status"
              class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option>PENDING</option>
              <option>IN_PROGRESS</option>
              <option>COMPLETED</option>
              <option>BLOCKED</option>
            </select>
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2"
            >Description</label
          >
          <textarea
            v-model="form.description"
            rows="4"
            placeholder="Enter task description"
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
            class="bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2 rounded transition"
          >
            {{ loading ? "Updating..." : "Update Task" }}
          </button>

          <button
            type="button"
            @click="router.push({ name: 'TaskList' })"
            class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded transition"
          >
            Cancel
          </button>
        </div>
      </form>

      <div v-else class="text-center py-4 text-red-500">
        {{ store.error || "Task not found." }}
      </div>
    </div>
  </div>
</template>
