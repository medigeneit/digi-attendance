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
  <div class="max-w-3xl mx-auto px-4 py-8 space-y-6">
    <header class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold text-slate-900">Edit Permission</h2>
        <p class="text-xs text-slate-500">Update access scope for a user.</p>
      </div>
      <button class="btn-3" @click="router.push({ name: 'PermissionList' })">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
    </header>

    <div class="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-6">
      <Multiselect
        v-model="selectedUser"
        :options="users"
        :multiple="false"
        label="label"
        topLabel="Select User"
        placeholder="Select employee"
      />

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Company</label>
        <select
          v-model="form.company_id"
          @change="onCompanyChange"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-slate-50 text-slate-600"
          disabled
        >
          <option value="">-- Select Company --</option>
          <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <div v-if="departments.length">
        <label class="block text-sm font-medium text-slate-700 mb-2">Departments</label>

        <div class="space-y-2">
          <label class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <input type="checkbox" value="*" v-model="form.department_ids" class="h-4 w-4" />
            <span class="font-medium">All Departments</span>
          </label>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label v-for="dept in departments" :key="dept.id" class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
              <input type="checkbox" :value="dept.id" v-model="form.department_ids" class="h-4 w-4" />
              <span class="truncate">{{ dept.name }}</span>
            </label>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          class="btn-3"
          @click="router.push({ name: 'PermissionList' })"
        >
          Cancel
        </button>
        <button
          @click="submit"
          :disabled="userPermissionStore.loading"
          class="btn-2"
        >
          <span v-if="userPermissionStore.loading">Updating...</span>
          <span v-else>Update Permission</span>
        </button>
      </div>
    </div>
  </div>
</template>
