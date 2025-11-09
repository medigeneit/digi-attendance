<template>
  <div v-if="files.length" class="mt-3 space-y-2">
    <div
      v-for="(file, index) in previews"
      :key="index"
      class="flex items-center gap-3 border rounded-md p-2 bg-gray-50"
    >
      <!-- Image preview -->
      <img
        v-if="file.type === 'image'"
        :src="file.url"
        alt="Preview"
        class="w-16 h-16 object-cover rounded-md border"
      />

      <!-- PDF preview -->
      <div v-else-if="file.type === 'pdf'" class="flex items-center gap-2">
        <span class="text-red-500 text-lg">📄</span>
        <a :href="file.url" target="_blank" class="text-blue-600 hover:underline text-sm truncate">
          {{ file.name }}
        </a>
      </div>

      <!-- Remove button -->
      <button
        type="button"
        class="ml-auto text-gray-500 hover:text-red-600 text-xs"
        @click="$emit('remove', index)"
      >
        ✕ Remove
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  files: {
    type: Array,
    default: () => [],
  },
})

const previews = ref([])

watch(
  () => props.files,
  (files) => {
    // Clean up old URLs
    previews.value.forEach((p) => URL.revokeObjectURL(p.url))
    previews.value = files.map((file) => {
      if (file.type.startsWith('image/')) {
        return {
          type: 'image',
          url: URL.createObjectURL(file),
          name: file.name,
        }
      } else if (file.type === 'application/pdf') {
        return {
          type: 'pdf',
          url: URL.createObjectURL(file),
          name: file.name,
        }
      }
    })
  },
  { immediate: true, deep: true },
)
</script>
