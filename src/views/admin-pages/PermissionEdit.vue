<script setup>
import Multiselect from '@/components/MultiselectDropdown.vue'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useUserStore } from '@/stores/user'
import { useUserPermissionStore } from '@/stores/userPermissionStore'
import { storeToRefs } from 'pinia'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const userStore = useUserStore()
const userPermissionStore = useUserPermissionStore()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()

const { users } = storeToRefs(userStore)
const { companies } = storeToRefs(companyStore)
const { departments } = storeToRefs(departmentStore)

const route = useRoute()
const router = useRouter()

const selectedUser = ref(null)
const form = ref({
  user_id: '',
  company_id: '',
  department_ids: [],
})

const fetchPermission = async () => {
  try {
    const permission = await userPermissionStore.fetchPermission(route.params.id)

    form.value.user_id = permission.user_id
    form.value.company_id = permission.company_id
    form.value.department_ids = permission.department_ids.includes('*')
      ? ['*']
      : permission.department_ids

    selectedUser.value = users.value.find((u) => u.id === permission.user_id) || null

    await departmentStore.fetchDepartments(permission.company_id)
  } catch (err) {
    alert(userPermissionStore.error || 'Failed to load permission')
    router.push({ name: 'PermissionList' })
  }
}

watch(selectedUser, (newVal) => {
  form.value.user_id = newVal?.id || ''
})

const onCompanyChange = async () => {
  form.value.department_ids = []
  await departmentStore.fetchDepartments(form.value.company_id)
}

const submit = async () => {
  try {
    await userPermissionStore.updatePermission(route.params.id, form.value)
    router.push({ name: 'PermissionList' })
  } catch (err) {
    alert(userPermissionStore.error || 'Update failed')
  }
}

onMounted(async () => {
  await Promise.all([userStore.fetchUsers(), companyStore.fetchCompanies()])
  await fetchPermission()
})
</script>

<template>
  <div class="max-w-xl mx-auto mt-10 p-6 bg-white shadow-md rounded-xl space-y-6">
    <h2 class="text-2xl font-bold text-gray-700">Edit Permission</h2>

    <div>
      <label class="block font-medium mb-1">Select User</label>
      <Multiselect
        v-model="selectedUser"
        :options="users"
        :multiple="false"
        label="label"
        placeholder="Select employee"
      />
    </div>

    <div>
      <label class="block font-medium mb-1">Select Company</label>
      <select
        v-model="form.company_id"
        @change="onCompanyChange"
        class="w-full border rounded px-3 py-2"
        disabled
      >
        <option value="">-- Select Company --</option>
        <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div v-if="departments.length">
      <label class="block font-medium mb-1">Select Departments</label>

      <div class="space-y-1 mt-2">
        <label class="flex items-center space-x-2">
          <input type="checkbox" value="*" v-model="form.department_ids" />
          <span>All Departments</span>
        </label>

        <div class="grid grid-cols-2 gap-2">
          <label v-for="dept in departments" :key="dept.id" class="flex items-center space-x-2">
            <input type="checkbox" :value="dept.id" v-model="form.department_ids" />
            <span>{{ dept.name }}</span>
          </label>
        </div>
      </div>
    </div>

    <button
      @click="submit"
      :disabled="userPermissionStore.loading"
      class="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      <span v-if="userPermissionStore.loading">Updating...</span>
      <span v-else>Update Permission</span>
    </button>
  </div>
</template>
