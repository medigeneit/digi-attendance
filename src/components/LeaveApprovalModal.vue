<script setup>
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useDepartmentStore } from '@/stores/department'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { onMounted, onUnmounted, reactive, ref, watch, nextTick } from 'vue'

const props = defineProps({
  show: { type: Boolean, required: true },
  leaveApproval: { type: Object, default: null },
  approvalType: { type: String, default: 'leave' },
})

const emit = defineEmits(['close', 'save'])

const userStore = useUserStore()
const departmentStore = useDepartmentStore()
const { departments } = storeToRefs(departmentStore)

const isEditMode = ref(false)

// ✅ Multiselect expects object
const selectedDepartment = ref(null)

const form = reactive({
  id: null,
  name: '',
  department_id: null,
  in_charge_user_id: null,
  coordinator_user_id: null,
  operational_admin_user_id: null,
  recommend_by_user_id: null,
  approved_by_user_id: null,
  type: props.approvalType,
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
    selectedUsers[field] = userStore.users.find((u) => u.id === form[field]) || null
  })
}

// ✅ keep form id in sync with selected user
Object.keys(selectedUsers).forEach((field) => {
  watch(
    () => selectedUsers[field],
    (newVal) => {
      form[field] = newVal ? newVal.id : null
    },
  )
})

const resetForm = () => {
  Object.assign(form, {
    id: null,
    name: '',
    department_id: null,
    in_charge_user_id: null,
    coordinator_user_id: null,
    operational_admin_user_id: null,
    recommend_by_user_id: null,
    approved_by_user_id: null,
    type: props.approvalType,
  })
  Object.assign(selectedUsers, {
    in_charge_user_id: null,
    coordinator_user_id: null,
    operational_admin_user_id: null,
    recommend_by_user_id: null,
    approved_by_user_id: null,
  })
  selectedDepartment.value = null
  isEditMode.value = false
}

// ✅ 핵심: department_id -> department object sync
const syncSelectedDepartment = async () => {
  await nextTick()
  const deptId = form.department_id || props.leaveApproval?.department_id || null
  if (!deptId) {
    selectedDepartment.value = null
    return
  }

  // departments store list থেকে খুঁজে set
  const found = (departments.value || []).find((d) => d.id === deptId)

  // যদি list এখনো না আসে কিন্তু backend response এ `department` object থাকে, সেটা fallback
  selectedDepartment.value = found || props.leaveApproval?.department || null
}

// ✅ when props.leaveApproval changes (edit/open modal)
watch(
  () => props.leaveApproval,
  async (newLeaveApproval) => {
    if (newLeaveApproval) {
      isEditMode.value = true

      Object.assign(form, {
        id: newLeaveApproval.id ?? null,
        name: newLeaveApproval.name ?? '',
        department_id: newLeaveApproval.department_id ?? newLeaveApproval.department?.id ?? null,
        in_charge_user_id: newLeaveApproval.in_charge_user_id ?? null,
        coordinator_user_id: newLeaveApproval.coordinator_user_id ?? null,
        operational_admin_user_id: newLeaveApproval.operational_admin_user_id ?? null,
        recommend_by_user_id: newLeaveApproval.recommend_by_user_id ?? null,
        approved_by_user_id: newLeaveApproval.approved_by_user_id ?? null,
        type: newLeaveApproval.type ?? props.approvalType,
      })

      loadSelectedUsers()
      await syncSelectedDepartment()
    } else {
      resetForm()
    }
  },
  { immediate: true },
)

// ✅ when user changes department dropdown
watch(
  () => selectedDepartment.value,
  (newDepartment) => {
    form.department_id = newDepartment?.id || null
  },
)

// ✅ departments async load হলে আবার sync (edit mode এর জন্য দরকার)
watch(
  () => departments.value,
  async () => {
    if (props.leaveApproval) await syncSelectedDepartment()
  },
  { deep: true },
)

const handleSubmit = () => {
  if (!form.name || !form.approved_by_user_id) {
    alert('Name and Approved By are required!')
    return
  }
  emit('save', { ...form, type: form.type || props.approvalType })
  closeModal()
}

watch(
  () => props.approvalType,
  (newType) => {
    if (!props.leaveApproval) {
      form.type = newType
    }
  },
)

const closeModal = () => {
  resetForm()
  emit('close')
}

onMounted(async () => {
  // যদি action promise return করে, await কাজ করবে
  await Promise.all([userStore.fetchUsers(), departmentStore.fetchDepartments()])
  await syncSelectedDepartment()
})
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50"
  >
    <div class="bg-white rounded-lg shadow-lg w-full max-w-lg">
      <div class="px-6 py-4 border-b">
        <h3 class="text-lg font-bold capitalize">
          {{ isEditMode ? 'Edit' : 'Add' }} {{ approvalType }} Approval
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

        <!-- ✅ Department selected দেখাবে -->
        <MultiselectDropdown
          v-model="selectedDepartment"
          :multiple="false"
          label="name"
          top-label="Select Department"
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
          <div>
            <!-- <label :for="field" class="block text-sm font-medium">{{ label }}</label> -->
            <MultiselectDropdown
              v-model="selectedUsers[field]"
              :multiple="false"
              label="name"
              :top-label="`Select ${label}`"
              label-prefix="employee_id"
              :options="userStore.users"
            />
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
          <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            {{ isEditMode ? 'Update' : 'Create' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
