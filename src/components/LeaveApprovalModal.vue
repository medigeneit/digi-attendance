<script setup>
import { ref, reactive, watch, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';

const props = defineProps({
  show: { type: Boolean, required: true },
  leaveApproval: { type: Object, default: null },
});

const emit = defineEmits(['close', 'save']);
const userStore = useUserStore();

const isEditMode = ref(false);
const form = reactive({
  id: null,
  name: '',
  in_charge_user_id: '',
  coordinator_user_id: '',
  operational_admin_user_id: '',
  recommend_by_user_id: '',
  approved_by_user_id: '',
});

const resetForm = () => {
  Object.assign(form, {
    id: null,
    name: '',
    in_charge_user_id: '',
    coordinator_user_id: '',
    operational_admin_user_id: '',
    recommend_by_user_id: '',
    approved_by_user_id: '',
  });
  isEditMode.value = false;
};

watch(
  () => props.leaveApproval,
  (newLeaveApproval) => {
    if (newLeaveApproval) {
      isEditMode.value = true;
      Object.assign(form, newLeaveApproval);
    } else {
      resetForm();
    }
  },
  { immediate: true, deep: true },
);

const handleSubmit = () => {
  if (!form.name || !form.approved_by_user_id) {
    alert('Name and Approved By are required!');
    return;
  }
  emit('save', { ...form });
  closeModal();
};

const closeModal = () => {
  resetForm();
  emit('close');
};

onMounted(() => {
  userStore.fetchUsers();
});
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-lg w-full max-w-lg">
      <div class="px-6 py-4 border-b">
        <h3 class="text-lg font-bold">
          {{ isEditMode ? 'Edit Leave Approval' : 'Add Leave Approval' }}
        </h3>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium">Approval Name</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter approval name"
            required
          />
        </div>

        <template v-for="(label, field) in {
          in_charge_user_id: 'In-Charge',
          coordinator_user_id: 'Coordinator',
          operational_admin_user_id: 'Operational Admin',
          recommend_by_user_id: 'Recommend By',
          approved_by_user_id: 'Approved By'
        }" :key="field">
          <div>
            <label :for="field" class="block text-sm font-medium">{{ label }}</label>
            <select
              :id="field"
              v-model="form[field]"
              class="w-full border rounded px-3 py-2"
            >
              <option value="">-- N/A --</option>
              <option
                v-for="user in userStore.users || []"
                :key="user.id"
                :value="user.id"
              >
                {{ user.name }}
              </option>
            </select>
          </div>
        </template>

        <div class="flex justify-end space-x-4">
          <button
            type="button"
            @click="closeModal"
            class="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            {{ isEditMode ? 'Update' : 'Create' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
