<script setup>
import { ref, onMounted } from 'vue';
import { useDepartmentStore } from '@/stores/department';
import { useToast } from 'vue-toastification';
import DepartmentModal from '@/components/DepartmentModal.vue';
import DeleteModal from '@/components/common/DeleteModal.vue';
import LoaderView from '@/components/common/LoaderView.vue';
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue';

const departmentStore = useDepartmentStore();
const toast = useToast();

const showDepartmentModal = ref(false);
const showDeleteModal = ref(false);
const selectedDepartment = ref(null);

const openAddModal = () => {
  selectedDepartment.value = null;
  showDepartmentModal.value = true;
};

const closeDepartmentModal = () => {
  showDepartmentModal.value = false;
};

const openEditModal = (department) => {
  selectedDepartment.value = department;
  showDepartmentModal.value = true;
};

const openDeleteModal = (department) => {
  selectedDepartment.value = department;
  showDeleteModal.value = true;
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
};

const handleSave = async (department) => {
  try {
    if (department.id) {
      await departmentStore.updateDepartment(department.id, department);
      toast.success('Department updated successfully!');
    } else {
      await departmentStore.createDepartment(department);
      toast.success('Department added successfully!');
    }
  } catch (error) {
    toast.error('Failed to save department!');
    console.error('Error handling save:', error);
  } finally {
    closeDepartmentModal();
  }
};

const handleDelete = async () => {
  if (!selectedDepartment.value?.id) {
    toast.error('Invalid department selected for deletion!');
    return;
  }
  try {
    await departmentStore.deleteDepartment(selectedDepartment.value.id);
    toast.success('Department deleted successfully!');
  } catch (error) {
    toast.error('Failed to delete department!');
    console.error('Error deleting department:', error);
  } finally {
    closeDeleteModal();
  }
};

onMounted(async () => {
  try {
    await departmentStore.fetchDepartments();
  } catch (error) {
    toast.error('Failed to fetch departments!');
    console.error('Error fetching departments:', error);
  }
});
</script>

<template>
  <div class="my-container space-y-2">
    <HeaderWithButtons title="Department List" @add="openAddModal" />

    <div class="overflow-x-auto">
      <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
        <thead>
          <tr class="bg-gray-200 text-gray-700 text-sm leading-normal">
            <th class="py-3 px-2 text-left">Name</th>
            <th class="py-3 px-2 text-left">Short Name</th>
            <th class="py-3 px-2 text-center">Company</th>
            <th class="py-3 px-2 text-center">Status</th>
            <th class="py-3 px-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody class="text-gray-600 text-sm font-light">
          <tr v-if="departmentStore.loading">
            <td colspan="5">
              <LoaderView />
            </td>
          </tr>
          <template v-else-if="departmentStore.departments.length">
            <tr
              v-for="department in departmentStore.departments"
              :key="department.id"
              class="border-b border-gray-200 hover:bg-gray-100"
            >
              <td class="py-3 px-2 text-left">
                <p class="font-medium">{{ department.name }}</p>
              </td>
              <td class="py-3 px-2 text-left whitespace-nowrap">
                <p class="font-medium">{{ department.short_name }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <p class="font-medium">{{ department.company?.name }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <p class="font-medium">{{ department.status }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <div class="flex item-center justify-center gap-4">
                  <button
                    @click="openEditModal(department)"
                    class="text-blue-600 hover:text-blue-800"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    @click="openDeleteModal(department)"
                    class="text-red-600 hover:text-red-800"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </template>
          <tr v-else>
            <td colspan="5" class="text-center text-red-500 py-4">No departments found</td>
          </tr>
        </tbody>
      </table>
    </div>

    <DepartmentModal
      :show="showDepartmentModal"
      :department="selectedDepartment"
      @close="closeDepartmentModal"
      @save="handleSave"
    />

    <DeleteModal
      :show="showDeleteModal"
      :title="'Delete Department'"
      :message="`Are you sure you want to delete ${selectedDepartment?.name}?`"
      @close="closeDeleteModal"
      @confirm="handleDelete"
    />
  </div>
</template>
