<script setup>
import { reactive } from 'vue'

const props = defineProps({
  initialOptions: {
    type: Object,
    default: () => ({
      withTasks: true,
      taskOption: 'list', // 'list' or 'countOnly'
      withMessages: true,
      withApprovals: true,
      withAttachments: true,
    }),
  },
})

const emit = defineEmits(['close', 'print'])

const options = reactive({ ...props.initialOptions })
</script>

<template>
  <div class="bg-white p-6 rounded-lg w-full w-full">
    <div class="flex items-center justify-between mb-4 border-b pb-2">
      <h3 class="text-xl font-bold">Print Options</h3>
      <button @click="emit('close')" class="text-gray-500 hover:text-gray-700">
        <i class="fas fa-times text-xl"></i>
      </button>
    </div>

    <div class="space-y-4">
      <!-- Tasks Section -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            v-model="options.withTasks"
            id="withTasks"
            class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <label for="withTasks" class="font-semibold text-gray-700">Print with Tasks</label>
        </div>

        <div v-if="options.withTasks" class="ml-6 space-y-2 p-2 bg-gray-50 rounded-md">
          <div class="flex items-center gap-2">
            <input
              type="radio"
              v-model="options.taskOption"
              value="list"
              id="taskOptionList"
              class="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
            />
            <label for="taskOptionList" class="text-sm text-gray-600">Task list with count</label>
          </div>
          <div class="flex items-center gap-2">
            <input
              type="radio"
              v-model="options.taskOption"
              value="countOnly"
              id="taskOptionCount"
              class="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
            />
            <label for="taskOptionCount" class="text-sm text-gray-600"
              >Only task count (completed/total)</label
            >
          </div>
        </div>
      </div>

      <!-- Messages Section -->
      <div class="flex items-center gap-2">
        <input
          type="checkbox"
          v-model="options.withMessages"
          id="withMessages"
          class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label for="withMessages" class="font-semibold text-gray-700"
          >Print with message list</label
        >
      </div>

      <!-- Approvals Section -->
      <div class="flex items-center gap-2">
        <input
          type="checkbox"
          v-model="options.withApprovals"
          id="withApprovals"
          class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label for="withApprovals" class="font-semibold text-gray-700"
          >Print with Approval list</label
        >
      </div>

      <!-- Attachments Section -->
      <div class="flex items-center gap-2">
        <input
          type="checkbox"
          v-model="options.withAttachments"
          id="withAttachments"
          class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label for="withAttachments" class="font-semibold text-gray-700"
          >Print Attachments (Images on separate page)</label
        >
      </div>
    </div>

    <div class="mt-8 flex justify-end gap-3 border-t pt-4">
      <button
        @click="emit('close')"
        class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
      >
        Cancel
      </button>
      <button
        @click="emit('print', options)"
        class="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition font-semibold"
      >
        <i class="fas fa-print mr-2"></i> Print
      </button>
    </div>
  </div>
</template>
