<script setup>
import axios from 'axios'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const companies = ref([])
const departments = ref([])
const form = ref({ company_id: '', department_ids: [] })

const loadPermission = async () => {
  const res = await axios.get(`/api/permissions/${route.params.id}`)
  form.value = res.data
  await loadDepartments()
}

const loadCompanies = async () => {
  const res = await axios.get('/api/companies')
  companies.value = res.data
}

const loadDepartments = async () => {
  const res = await axios.get(`/api/companies/${form.value.company_id}/departments`)
  departments.value = res.data
}

const update = async () => {
  await axios.put(`/api/permissions/${route.params.id}`, form.value)
  router.push({ name: 'PermissionList' })
}

onMounted(() => {
  loadCompanies()
  loadPermission()
})
</script>

<template>
  <div class="max-w-xl mx-auto mt-10 p-6 bg-white shadow-md rounded-xl space-y-6">
    <h2 class="text-2xl font-bold text-gray-700">Edit Permission</h2>

    <div>
      <label class="block font-medium mb-1">Select Company</label>
      <select
        v-model="form.company_id"
        @change="loadDepartments"
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

    <button @click="update" class="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700">
      Update Permission
    </button>
  </div>
</template>
