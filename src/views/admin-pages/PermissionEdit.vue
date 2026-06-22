<script setup>
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useUserStore } from '@/stores/user'
import { useUserPermissionStore } from '@/stores/userPermissionStore'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const userStore = useUserStore()
const userPermissionStore = useUserPermissionStore()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()

const { companies } = storeToRefs(companyStore)
const { loading } = storeToRefs(userPermissionStore)

const route = useRoute()
const router = useRouter()

const userId = Number(route.params.id)

const targetUser = ref(null)
const companies_form = ref([]) // [{ company_id, department_ids: [] }]
const companyDepartments = ref({}) // { company_id: [dept...] }

const loadDepartments = async (companyId) => {
  if (!companyDepartments.value[companyId]) {
    await departmentStore.fetchDepartments(companyId)
    companyDepartments.value[companyId] = [...departmentStore.departments]
  }
}

const fetchData = async () => {
  const [, , existingPerms] = await Promise.all([
    companyStore.fetchCompanies(),
    userStore.fetchUsers(),
    userPermissionStore.fetchPermissionsByUser(userId),
  ])

  targetUser.value = userStore.users.find((u) => u.id === userId) || null

  if (existingPerms.length) {
    companies_form.value = existingPerms.map((p) => ({
      company_id: p.company_id,
      department_ids: Array.isArray(p.department_ids) ? [...p.department_ids] : [],
    }))
    await Promise.all(companies_form.value.map((c) => loadDepartments(c.company_id)))
  } else {
    companies_form.value = [{ company_id: '', department_ids: [] }]
  }
}

const onCompanyChange = async (entry) => {
  entry.department_ids = []
  if (entry.company_id) await loadDepartments(entry.company_id)
}

const addCompany = () => {
  companies_form.value.push({ company_id: '', department_ids: [] })
}

const removeCompany = (index) => {
  companies_form.value.splice(index, 1)
}

const alreadySelected = (companyId, currentIndex) =>
  companies_form.value.some((c, i) => i !== currentIndex && String(c.company_id) === String(companyId))

const submit = async () => {
  const valid = companies_form.value.filter((c) => c.company_id)
  if (!valid.length) {
    alert('At least one company must be selected.')
    return
  }
  try {
    await userPermissionStore.syncUserPermissions(userId, valid)
    router.push({ name: 'PermissionList' })
  } catch {
    alert(userPermissionStore.error || 'Update failed')
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8 space-y-6">
    <header class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold text-slate-900">Edit Permissions</h2>
        <p class="text-xs text-slate-500">
          Update company & department access for
          <span class="font-semibold text-slate-700">{{ targetUser?.name || `User #${userId}` }}</span>
        </p>
      </div>
      <button class="btn-3" @click="router.push({ name: 'PermissionList' })">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
    </header>

    <div class="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-6">

      <!-- Company rows -->
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
          v-for="(entry, index) in companies_form"
          :key="index"
          class="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"
        >
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-slate-700">Company {{ index + 1 }}</label>
            <button
              v-if="companies_form.length > 1"
              type="button"
              class="text-xs text-red-600 hover:text-red-700"
              @click="removeCompany(index)"
            >
              Remove
            </button>
          </div>

          <select
            v-model="entry.company_id"
            @change="onCompanyChange(entry)"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
          >
            <option value="">-- Select Company --</option>
            <option
              v-for="c in companies"
              :key="c.id"
              :value="c.id"
              :disabled="alreadySelected(c.id, index)"
            >
              {{ c.name }}
            </option>
          </select>

          <div v-if="entry.company_id && companyDepartments[entry.company_id]?.length">
            <label class="block text-sm font-medium text-slate-700 mb-2">Departments</label>

            <div class="space-y-2">
              <label class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white">
                <input type="checkbox" value="*" v-model="entry.department_ids" class="h-4 w-4" />
                <span class="font-medium">All Departments</span>
              </label>

              <div v-if="!entry.department_ids.includes('*')" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  v-for="dept in companyDepartments[entry.company_id]"
                  :key="dept.id"
                  class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white hover:bg-slate-50"
                >
                  <input type="checkbox" :value="dept.id" v-model="entry.department_ids" class="h-4 w-4" />
                  <span class="truncate">{{ dept.name }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2">
        <button type="button" class="btn-3" @click="router.push({ name: 'PermissionList' })">
          Cancel
        </button>
        <button @click="submit" :disabled="loading" class="btn-2">
          <span v-if="loading">Saving...</span>
          <span v-else>Save Permissions</span>
        </button>
      </div>
    </div>
  </div>
</template>
