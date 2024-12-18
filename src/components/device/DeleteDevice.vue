<script setup>
import { useDeviceStore } from '../../stores/device'

// Define the emit function
const emit = defineEmits(['close', 'deleted'])

const props = defineProps({
  device: {
    type: Object,
    required: true
  }
})

const store = useDeviceStore()

const confirmDelete = async () => {
  await store.deleteDevice(props.device.id)
  emit('deleted')
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
    <div class="card-bg p-4 md:p-8">
      <h2 class="text-xl font-bold mb-4">ডিলেট অঞ্চল</h2>
      <p>
        আপনি কি (<b>{{ device.name }}</b
        >) ডিলিট করতে চান?
      </p>
      <div class="flex justify-end mt-4">
        <button
          @click="emit('close')"
          class="bg-gray-500 text-white px-4 py-2 rounded mr-2 hover:bg-gray-600"
        >
          না
        </button>
        <button
          @click="confirmDelete"
          class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          ডিলেট
        </button>
      </div>
    </div>
  </div>
</template>
