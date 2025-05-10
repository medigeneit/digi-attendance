<script setup>
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useDepartmentStore } from '@/stores/department'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { onMounted, reactive, ref, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, required: true },
  leaveApproval: { type: Object, default: null },
  approvalType: { type: String, default: 'leave' },
})

const emit = defineEmits(['close', 'save'])
const selectedDepartment = ref(null)
const userStore = useUserStore()
const departmentStore = useDepartmentStore()
const { departments } = storeToRefs(departmentStore)

const isEditMode = ref(false)

const form = reactive({
  id: null,
  name: '',
  department_id: '',
  in_charge_user_id: '',
  coordinator_user_id: '',
  operational_admin_user_id: '',
  recommend_by_user_id: '',
  approved_by_user_id: '',
})

const selectedUsers = reactive({
  in_charge_user_id: null,
  coordinator_user_id: null,
  operational_admin_user_id: null,
  recommend_by_user_id: null,
  approved_by_user_id: null,
})

const loadSelectedUsers = () => {
  Object.keys(selectedUsers).forEach((field) => {
    selectedUsers[field] = userStore.users.find((user) => user.id === form[field]) || null
  })
}

Object.keys(selectedUsers).forEach((field) => {
  watch(
    () => selectedUsers[field],
    (newVal) => {
      console.log(newVal)

      form[field] = newVal ? newVal.id : null
    },
  )
})

const resetForm = () => {
  Object.assign(form, {
    id: null,
    name: '',
    department_id: '',
    in_charge_user_id: '',
    coordinator_user_id: '',
    operational_admin_user_id: '',
    recommend_by_user_id: '',
    approved_by_user_id: '',
  })
  isEditMode.value = false
}

const selectvalueResetForm = () => {
  Object.assign(selectedUsers, {
    in_charge_user_id: '',
    coordinator_user_id: '',
    operational_admin_user_id: '',
    recommend_by_user_id: '',
    approved_by_user_id: '',
  })
  isEditMode.value = false
}

watch(
  () => props.leaveApproval,
  (newLeaveApproval) => {
    if (newLeaveApproval) {
      isEditMode.value = true
      Object.assign(form, newLeaveApproval)
      loadSelectedUsers()
    } else {
      resetForm()
      selectvalueResetForm()
    }
  },
  { immediate: true, deep: true },
)

watch(
  () => selectedDepartment.value,
  (newDepartment) => {
    form.department_id = newDepartment?.id || null
  },
)

const handleSubmit = () => {
  if (!form.name || !form.approved_by_user_id) {
    alert('Name and Approved By are required!')
    return
  }
  emit('save', { ...form })
  closeModal()
}

const closeModal = () => {
  resetForm()
  emit('close')
}

onMounted(() => {
  userStore.fetchUsers()
  departmentStore.fetchDepartments()
})
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50"
  >
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
        <MultiselectDropdown
          v-model="selectedDepartment"
          :multiple="false"
          label="name"
          :options="departments"
          placeholder="Choose department"
        />

        <template
          v-for="(label, field) in {
            in_charge_user_id: 'In-Charge',
            coordinator_user_id: 'Coordinator',
            operational_admin_user_id: 'Operational Admin',
            recommend_by_user_id: 'Recommend By',
            approved_by_user_id: 'Approved By',
          }"
          :key="field"
        >
          <div
            v-if="
              approvalType === 'leave' ||
              !['coordinator_user_id', 'operational_admin_user_id'].includes(field)
            "
          >
            <label :for="field" class="block text-sm font-medium">{{ label }}</label>
            <MultiselectDropdown
              v-model="selectedUsers[field]"
              :multiple="false"
              label="name"
              :options="userStore.users"
            />
          </div>
        </template>

        <!-- <select
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
        </select> -->

        <div class="flex justify-end space-x-4">
          <button
            type="button"
            @click="closeModal"
            class="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            {{ isEditMode ? 'Update' : 'Create' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
