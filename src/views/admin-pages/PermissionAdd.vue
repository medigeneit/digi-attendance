<script setup>
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const { companies } = storeToRefs(companyStore)
const { departments } = storeToRefs(departmentStore)
const form = ref({ company_id: '', department_ids: [] })

const onCompanyChange = async () => {
  form.value.department_ids = []
  departmentStore.fetchDepartments(form.value.company_id)
}

const submit = async () => {
  router.push({ name: 'PermissionList' })
}

onMounted(async () => {
  await companyStore.fetchCompanies()
})
</script>

<template>
  <div class="max-w-xl mx-auto mt-10 p-6 bg-white shadow-md rounded-xl space-y-6">
    <h2 class="text-2xl font-bold text-gray-700">Add Permission</h2>

    <div>
      <label class="block font-medium mb-1">Select Company</label>
      <select
        v-model="form.company_id"
        @change="onCompanyChange"
        class="w-full border rounded px-3 py-2"
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

        <div v-if="!form.department_ids.includes('*')" class="grid grid-cols-2 gap-2">
          <label v-for="dept in departments" :key="dept.id" class="flex items-center space-x-2">
            <input type="checkbox" :value="dept.id" v-model="form.department_ids" />
            <span>{{ dept.name }}</span>
          </label>
        </div>
      </div>
    </div>

    <button @click="submit" class="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
      Save Permission
    </button>
  </div>
</template>
