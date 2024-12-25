<script setup>
import { ref, watch, reactive } from 'vue';
import { useCompanyStore } from '@/stores/company'; // Import the company store

const props = defineProps({
  show: { type: Boolean, required: true },
  designation: { type: Object, default: null },
});

const emit = defineEmits(['close', 'save']);

const companyStore = useCompanyStore();

const companies = companyStore.companies;

const isEditMode = ref(false);
const isCompaniesFetched = ref(false); // Track if companies are fetched
const designationForm = reactive({
  id: null,
  company_id: '',
  title: '',
  grade: '',
  description: '',
  status: 'Active',
});

const resetForm = () => {
  isEditMode.value = false;
  designationForm.id = null;
  designationForm.company_id = '';
  designationForm.title = '';
  designationForm.grade = '';
  designationForm.description = '';
  designationForm.status = 'Active';
};

watch(
  () => props.designation,
  (newDesignation) => {
    if (
      newDesignation &&
      typeof newDesignation === 'object' &&
      Object.keys(newDesignation).length > 0
    ) {
      isEditMode.value = true;
      designationForm.id = newDesignation.id || null;
      designationForm.company_id = newDesignation.company_id || '';
      designationForm.title = newDesignation.title || '';
      designationForm.grade = newDesignation.grade || '';
      designationForm.description = newDesignation.description || '';
      designationForm.status = newDesignation.status || 'Active';
    } else {
      resetForm();
    }
  },
  { immediate: true, deep: true },
);

watch(
  () => props.show,
  async (isShown) => {
    if (isShown && !isCompaniesFetched.value) {
      await fetchCompanies(); // Fetch companies when the modal is shown
    }
  },
);

const handleSubmit = () => {
  emit('save', { ...designationForm }); // Emit the designation form data to the parent
  resetForm(); // Reset the form after submission
  closeModal();
};

const closeModal = () => {
  resetForm(); // Reset the form when the modal is closed
  emit('close');
};

const fetchCompanies = async () => {
  try {
    await companyStore.fetchCompanies();
    isCompaniesFetched.value = true; // Mark companies as fetched
  } catch (error) {
    console.error('Failed to fetch companies:', error);
  }
};
</script>

<template>
  <div v-if="show" class="modal-bg">
    <div class="modal-card">
      <h2 class="text-lg font-semibold mb-4">
        {{ isEditMode ? 'Edit Designation' : 'Add Designation' }}
      </h2>
      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label for="company_id" class="block text-sm font-medium mb-2">Company</label>
          <select
            id="company_id"
            v-model="designationForm.company_id"
            class="w-full border rounded px-3 py-2"
            required
          >
            <option value="" disabled>Select a company</option>
            <option v-for="company in companies" :key="company.id" :value="company.id">
              {{ company.name }}
            </option>
          </select>
        </div>

        <div class="mb-4">
          <label for="title" class="block text-sm font-medium mb-2">Title</label>
          <input
            id="title"
            v-model="designationForm.title"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter designation title"
            required
          />
        </div>

        <div class="mb-4">
          <label for="grade" class="block text-sm font-medium mb-2">Grade</label>
          <input
            id="grade"
            v-model="designationForm.grade"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter grade (optional)"
          />
        </div>

        <div class="mb-4">
          <label for="description" class="block text-sm font-medium mb-2">Description</label>
          <textarea
            id="description"
            v-model="designationForm.description"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter description"
          ></textarea>
        </div>

        <div class="mb-4">
          <label for="status" class="block text-sm font-medium mb-2">Status</label>
          <select
            id="status"
            v-model="designationForm.status"
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
