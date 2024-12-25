<script setup>
import { ref, watch, reactive } from 'vue';

const props = defineProps({
  show: { type: Boolean, required: true },
  company: { type: Object, default: null },
});

const emit = defineEmits(['close', 'save']);

const isEditMode = ref(false);
const companyForm = reactive({
  id: null,
  name: '',
  short_name: '',
  address: '',
  phone: '',
  email: '',
  status: 'Active',
});

const resetForm = () => {
  isEditMode.value = false;
  companyForm.id = null;
  companyForm.name = '';
  companyForm.short_name = '';
  companyForm.address = '';
  companyForm.phone = '';
  companyForm.email = '';
  companyForm.status = 'Active';
};

watch(
  () => props.company,
  (newCompany) => {
    if (newCompany && typeof newCompany === 'object' && Object.keys(newCompany).length > 0) {
      isEditMode.value = true;
      companyForm.id = newCompany.id || null;
      companyForm.name = newCompany.name || '';
      companyForm.short_name = newCompany.short_name || '';
      companyForm.address = newCompany.address || '';
      companyForm.phone = newCompany.phone || '';
      companyForm.email = newCompany.email || '';
      companyForm.status = newCompany.status || 'Active';
    } else {
      resetForm();
    }
  },
  { immediate: true, deep: true }
);

const handleSubmit = () => {
  emit('save', { ...companyForm }); // Emit the company form data to the parent
  closeModal();
};

const closeModal = () => {
  emit('close'); // Notify parent to close the modal
};
</script>

<template>
  <div v-if="show" class="modal-bg">
    <div class="modal-card">
      <h2 class="text-lg font-semibold mb-4">
        {{ isEditMode ? 'Edit Company' : 'Add Company' }}
      </h2>
      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label for="name" class="block text-sm font-medium mb-2">Name</label>
          <input
            id="name"
            v-model="companyForm.name"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter company name"
            required
          />
        </div>
        <div class="mb-4">
          <label for="short_name" class="block text-sm font-medium mb-2">Short Name</label>
          <input
            id="short_name"
            v-model="companyForm.short_name"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter short name"
            required
          />
        </div>
        <div class="mb-4">
          <label for="address" class="block text-sm font-medium mb-2">Address</label>
          <input
            id="address"
            v-model="companyForm.address"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter address"
            required
          />
        </div>
        <div class="mb-4">
          <label for="phone" class="block text-sm font-medium mb-2">Phone</label>
          <input
            id="phone"
            v-model="companyForm.phone"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter phone number"
            required
          />
        </div>
        <div class="mb-4">
          <label for="email" class="block text-sm font-medium mb-2">Email</label>
          <input
            id="email"
            v-model="companyForm.email"
            type="email"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter email"
            required
          />
        </div>
        <div class="mb-4">
          <label for="status" class="block text-sm font-medium mb-2">Status</label>
          <select
            id="status"
            v-model="companyForm.status"
            class="w-full border rounded px-3 py-2"
            required
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
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
