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
  <div class="max-w-4xl mx-auto px-4 py-8 space-y-6">
    <header class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold text-slate-900">Add Permission</h2>
        <p class="text-xs text-slate-500">Assign user access by company and department.</p>
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
        top-label="Select User"
        placeholder="Select employee"
      />

      <div class="flex items-center justify-between">
        <div class="text-sm font-semibold text-slate-800">Companies</div>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
          @click="addCompany"
        >
          + Add Company
        </button>
      </div>

      <div class="space-y-4">
        <div
          v-for="(company, index) in form.companies"
          :key="index"
          class="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"
        >
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-slate-700">Company</label>
            <button @click="removeCompany(index)" class="text-xs text-red-600 hover:text-red-700">Remove</button>
          </div>
          <select
            v-model="company.company_id"
            @change="onCompanyChange(company)"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
          >
            <option value="">-- Select Company --</option>
            <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>

          <div
            v-if="company.company_id && companyDepartments[company.company_id] && companyDepartments[company.company_id].length"
          >
            <label class="block text-sm font-medium text-slate-700 mb-2 mt-3">Departments</label>

            <div class="space-y-2">
              <label class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white">
                <input type="checkbox" value="*" v-model="company.department_ids" class="h-4 w-4" />
                <span class="font-medium">All Departments</span>
              </label>

              <div v-if="!company.department_ids.includes('*')" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  v-for="dept in companyDepartments[company.company_id]"
                  :key="dept.id"
                  class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white hover:bg-slate-50"
                >
                  <input type="checkbox" :value="dept.id" v-model="company.department_ids" class="h-4 w-4" />
                  <span class="truncate">{{ dept.name }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2">
        <button type="button" class="btn-3" @click="router.push({ name: 'PermissionList' })">Cancel</button>
        <button
          @click="submit"
          :disabled="userPermissionStore.loading"
          class="btn-2"
        >
          <span v-if="userPermissionStore.loading">Saving...</span>
          <span v-else>Save Permission</span>
        </button>
      </div>
    </div>
  </div>
</template>
