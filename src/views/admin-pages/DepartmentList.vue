<script setup>
import DepartmentModal from '@/components/DepartmentModal.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useDepartmentStore } from '@/stores/department'
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'

// পিনিয়া স্টোর এবং টোস্ট ইন্সট্যান্স
const departmentStore = useDepartmentStore()
const toast = useToast()

const showDepartmentModal = ref(false)
const showDeleteModal = ref(false)
const selectedDepartment = ref(null)

const openAddModal = () => {
  selectedDepartment.value = null
  showDepartmentModal.value = true
}

const closeDepartmentModal = () => {
  showDepartmentModal.value = false
}

const openEditModal = (department) => {
  selectedDepartment.value = department
  showDepartmentModal.value = true
}

const openDeleteModal = (department) => {
  selectedDepartment.value = department
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
}

// সেভ অপারেশন
const handleSave = async (department) => {
  try {
    if (department.id) {
      await departmentStore.updateDepartment(department.id, department)
      toast.success('Department updated successfully!')
      await departmentStore.fetchDepartments()
    } else {
      await departmentStore.createDepartment(department)
      toast.success('Department added successfully!')
    }
  } catch (error) {
    toast.error('Failed to save department!')
    console.error('Error handling save:', error)
  } finally {
    closeDepartmentModal()
  }
}

// ডিলিট অপারেশন
const handleDelete = async () => {
  if (!selectedDepartment.value?.id) {
    toast.error('Invalid department selected for deletion!')
    return
  }
  try {
    await departmentStore.deleteDepartment(selectedDepartment.value.id)
    toast.success('Department deleted successfully!')
  } catch (error) {
    toast.error('Failed to delete department!')
    console.error('Error deleting department:', error)
  } finally {
    closeDeleteModal()
  }
}

// কোম্পানির ভিত্তিতে ডিপার্টমেন্ট গ্রুপ করা
const groupedDepartments = computed(() => {
  const grouped = {}
  departmentStore.departments.forEach((department) => {
    const companyName = department.company?.name || 'Unknown Company'
    if (!grouped[companyName]) {
      grouped[companyName] = []
    }
    grouped[companyName].push(department)
  })
  return grouped
})

// মাউন্ট হুকে ডেটা লোড
onMounted(async () => {
  try {
    await departmentStore.fetchDepartments()
  } catch (error) {
    toast.error('Failed to fetch departments!')
    console.error('Error fetching departments:', error)
  }
})
</script>
<template>
  <div class="my-container space-y-4">
    <!-- হেডার -->
    <HeaderWithButtons title="Department List" @add="openAddModal" />

    <div v-if="departmentStore.loading" class="text-center py-4">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div v-for="(departments, companyName) in groupedDepartments" :key="companyName">
        <h2 class="title-md">{{ companyName }}</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
            <thead>
              <tr class="bg-gray-200 text-gray-700 text-sm leading-normal">
                <th class="py-3 px-2 text-left">Name</th>
                <th class="py-3 px-2 text-left">Short Name</th>
                <th class="py-3 px-2 text-center">Status</th>
                <th class="py-3 px-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody class="text-gray-600 text-sm">
              <tr
                v-for="department in departments"
                :key="department.id"
                class="border-b border-gray-200 hover:bg-gray-100"
              >
                <td class="py-3 px-2 text-left">{{ department.name }}</td>
                <td class="py-3 px-2 text-left whitespace-nowrap">{{ department.short_name }}</td>
                <td class="py-3 px-2 text-center">{{ department.status }}</td>
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
            </tbody>
          </table>
        </div>
      </div>
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
