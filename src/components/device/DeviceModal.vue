<script setup>
import { ref, watch, reactive } from 'vue';

const props = defineProps({
  show: { type: Boolean, required: true },
  device: { type: Object, default: null },
});

const emit = defineEmits(['close', 'save']);

const isEditMode = ref(false);
const deviceForm = reactive({
  id: null,
  name: '',
  ip_address: '',
  port: '',
  serial_number: '',
  firmware: '',
  status: 'active',
});

const resetForm = () => {
  isEditMode.value = false;
  deviceForm.id = null;
  deviceForm.name = '';
  deviceForm.ip_address = '';
  deviceForm.port = '';
  deviceForm.serial_number = '';
  deviceForm.firmware = '';
  deviceForm.status = 'active';
};

watch(
  () => props.device,
  (newDevice) => {
    if (newDevice && typeof newDevice === 'object' && Object.keys(newDevice).length > 0) {
      isEditMode.value = true;
      deviceForm.id = newDevice.id || null;
      deviceForm.name = newDevice.name || '';
      deviceForm.ip_address = newDevice.ip_address || '';
      deviceForm.port = newDevice.port || '';
      deviceForm.serial_number = newDevice.serial_number || '';
      deviceForm.firmware = newDevice.firmware || '';
      deviceForm.status = newDevice.status || 'active';
    } else {
      resetForm();
    }
  },
  { immediate: true, deep: true }
);

const handleSubmit = () => {
  emit('save', { ...deviceForm }); 
  closeModal();
};

const closeModal = () => {
  emit('close');
};
</script>


<template>
  <div v-if="show" class="modal-bg">
    <div class="modal-card">
      <h2 class="text-lg font-semibold mb-4">
        {{ isEditMode ? 'Edit Device' : 'Add Device' }}
      </h2>
      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label for="name" class="block text-sm font-medium mb-2">Name</label>
          <input
            id="name"
            v-model="deviceForm.name"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter device name"
            required
          />
        </div>
        <div class="mb-4">
          <label for="ip_address" class="block text-sm font-medium mb-2">IP Address</label>
          <input
            id="ip_address"
            v-model="deviceForm.ip_address"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter IP address"
            required
          />
        </div>
        <div class="mb-4">
          <label for="port" class="block text-sm font-medium mb-2">Port</label>
          <input
            id="port"
            v-model="deviceForm.port"
            type="number"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter port"
            required
          />
        </div>
        <div class="mb-4">
          <label for="serial_number" class="block text-sm font-medium mb-2">Serial Number</label>
          <input
            id="serial_number"
            v-model="deviceForm.serial_number"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter serial number (optional)"
          />
        </div>
        <div class="mb-4">
          <label for="firmware" class="block text-sm font-medium mb-2">Firmware</label>
          <input
            id="firmware"
            v-model="deviceForm.firmware"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter firmware version (optional)"
          />
        </div>
        <div class="mb-4">
          <label for="status" class="block text-sm font-medium mb-2">Status</label>
          <select
            id="status"
            v-model="deviceForm.status"
            class="w-full border rounded px-3 py-2"
            required
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="error">Error</option>
          </select>
        </div>
        <div class="flex justify-end">
          <button
            type="button"
            @click="closeModal"
            class="bg-gray-300 text-gray-700 px-4 py-2 rounded mr-2"
          >
            Cancel
          </button>
          <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded">
            {{ isEditMode ? 'Update' : 'Create' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
