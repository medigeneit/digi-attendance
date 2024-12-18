<script setup>
import { reactive } from 'vue'
import { useDeviceStore } from '../../stores/device'

const emit = defineEmits(['close', 'saved'])

const form = reactive({
  name: '',
  ip_address: '',
  port: '4370',
  serial_number: '',
  firmware: '',
  status: 'inactive',
})

const store = useDeviceStore()

const saveDevice = async () => {
  await store.createDevice(form)
  emit('saved')
  emit('close')
}
</script>

<template>
  <div class="modal-bg">
    <div class="modal-card">
      <h2 class="text-xl font-bold mb-4">Add New Device</h2>
      <form @submit.prevent="saveDevice">
        <div class="mb-4">
          <label class="block mb-2">Name</label>
          <input v-model="form.name" type="text" class="w-full p-2 border rounded" required />
        </div>
        <div class="mb-4">
          <label class="block mb-2">IP Address</label>
          <input v-model="form.ip_address" type="text" class="w-full p-2 border rounded" required />
        </div>
        <div class="mb-4">
          <label class="block mb-2">Port</label>
          <input v-model="form.port" type="number" class="w-full p-2 border rounded" required />
        </div>
        <div class="mb-4">
          <label class="block mb-2">Serial Number</label>
          <input v-model="form.serial_number" type="text" class="w-full p-2 border rounded" />
        </div>
        <div class="mb-4">
          <label class="block mb-2">Firmware</label>
          <input v-model="form.firmware" type="text" class="w-full p-2 border rounded" />
        </div>
        <div class="mb-4">
          <label class="block mb-2">Status</label>
          <select v-model="form.status" class="w-full p-2 border rounded">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="error">Error</option>
          </select>
        </div>
        <div class="flex justify-center gap-4">
          <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Save
          </button>
          <button
            type="button"
            @click="emit('close')"
            class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
