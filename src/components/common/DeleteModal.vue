<script setup>
const props = defineProps({
  title: { type: String, default: 'Confirm Delete' },
  message: { type: String, default: 'Are you sure you want to delete this item?' },
  show: { type: Boolean, required: true },
})

const emit = defineEmits(['close', 'confirm'])

const handleConfirm = () => {
  emit('confirm')
  emit('close')
}
</script>

<template>
  <div v-if="show" class="modal-bg">
    <div class="modal-card">
      <h2 class="text-xl font-bold mb-4 capitalize">{{ title }}</h2>
      <p>{{ message }}</p>
      <div class="flex justify-end mt-4">
        <button
          @click="emit('close')"
          class="bg-gray-500 text-white px-4 py-2 rounded mr-2 hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          @click="handleConfirm"
          class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
</template>
