<script setup>
import Multiselect from '@/components/MultiselectDropdown.vue'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useUserStore } from '@/stores/user'
import { useUserPermissionStore } from '@/stores/userPermissionStore'
import { storeToRefs } from 'pinia'
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const userPermissionStore = useUserPermissionStore()
const router = useRouter()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()

const { users } = storeToRefs(userStore)
const { companies } = storeToRefs(companyStore)

const selectedUser = ref(null)

const form = ref({
  user_id: '',
  companies: []
})

const companyDepartments = ref({}) // { company_id: [departments...] }

watch(selectedUser, (newVal) => {
  form.value.user_id = newVal?.id || ''
})

const onCompanyChange = async (company) => {
  company.department_ids = []
  await departmentStore.fetchDepartments(company.company_id)
  companyDepartments.value[company.company_id] = departmentStore.departments
}

const addCompany = () => {
  form.value.companies.push({
    company_id: '',
    department_ids: []
  })
}

const removeCompany = (index) => {
  form.value.companies.splice(index, 1)
}

const submit = async () => {
  try {
    await userPermissionStore.createPermission(form.value)
    router.push({ name: 'PermissionList' })
  } catch (err) {
    alert(userPermissionStore.error)
  }
}

onMounted(() => {
  userStore.fetchUsers({ type: 'admin' })
  companyStore.fetchCompanies()
})
</script>

<template>
  <div class="max-w-4xl mx-auto mt-10 p-6 bg-white shadow-md rounded-xl space-y-6">
    <h2 class="text-2xl font-bold text-gray-700">Add Permission</h2>
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

    <div class="space-y-4">
      <div
        v-for="(company, index) in form.companies"
        :key="index"
        class="p-4 border rounded space-y-3 bg-gray-50"
      >
        <div class="flex items-center justify-between">
          <label class="font-medium">Select Company</label>
          <button @click="removeCompany(index)" class="text-red-500">Remove</button>
        </div>
        <select
          v-model="company.company_id"
          @change="onCompanyChange(company)"
          class="w-full border rounded px-3 py-2 mt-1"
        >
          <option value="">-- Select Company --</option>
          <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>

        <div
          v-if="company.company_id && companyDepartments[company.company_id] && companyDepartments[company.company_id].length"
        >
          <label class="block font-medium mb-1 mt-3">Select Departments</label>

          <div class="space-y-1 mt-2">
            <label class="flex items-center space-x-2">
              <input type="checkbox" value="*" v-model="company.department_ids" />
              <span>All Departments</span>
            </label>

            <div v-if="!company.department_ids.includes('*')" class="grid grid-cols-2 gap-2">
              <label
                v-for="dept in companyDepartments[company.company_id]"
                :key="dept.id"
                class="flex items-center space-x-2"
              >
                <input type="checkbox" :value="dept.id" v-model="company.department_ids" />
                <span>{{ dept.name }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button
      @click="addCompany"
      class="py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700"
    >
      + Add Company
    </button>

    <button
      @click="submit"
      :disabled="userPermissionStore.loading"
      class="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mt-4"
    >
      <span v-if="userPermissionStore.loading">Saving...</span>
      <span v-else>Save Permission</span>
    </button>
  </div>
</template>
