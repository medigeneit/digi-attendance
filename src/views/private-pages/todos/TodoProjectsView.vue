<script setup>
import CompanyDepartmentSelectInput from '@/components/common/CompanyDepartmentSelectInput.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import OverlyModal from '@/components/common/OverlyModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { useTodoProjectStore } from '@/stores/useTodoProjectStore'
import { computed, onMounted, ref } from 'vue'

const store = useTodoProjectStore()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

const isEditing = ref(false)
const editId = ref(null)
const formTitle = ref('')
const selectedDepartmentId = ref(null)
const showModal = ref(false)
const isSubmitting = ref(false)

onMounted(async () => {
  if (authStore.isAdminMood) {
    await companyStore.fetchMyCompanies({
      with: 'departments',
    })
  }
  store.fetchProjects()
})

const departments = computed(() => {
  const list = []
  companyStore.myCompanies.forEach((company) => {
    company.departments.forEach((dept) => {
      list.push({
        ...dept,
        company_name: company.name,
      })
    })
  })
  return list
})

const publicProjects = computed(() => {
  return store.projects.filter((p) => !p.department_id)
})

const getProjectsByDept = (deptId) => {
  return store.projects.filter((p) => p.department_id === deptId)
}

const openCreateModal = (deptId = null) => {
  isEditing.value = false
  editId.value = null
  formTitle.value = ''
  selectedDepartmentId.value = deptId
  showModal.value = true
}

const startEdit = (project) => {
  isEditing.value = true
  editId.value = project.id
  formTitle.value = project.title
  selectedDepartmentId.value = project.department_id || null
  showModal.value = true
}

const cancelEdit = () => {
  showModal.value = false
  editId.value = null
  formTitle.value = ''
  selectedDepartmentId.value = null
  store.error = null
}

const saveProject = async () => {
  if (!formTitle.value.trim()) return

  try {
    isSubmitting.value = true
    if (isEditing.value) {
      await store.updateProject(editId.value, {
        title: formTitle.value,
        department_id: selectedDepartmentId.value,
      })
    } else {
      await store.createProject({
        title: formTitle.value,
        department_id: selectedDepartmentId.value,
      })
    }
    cancelEdit()
  } catch (e) {
    // handled in store
  } finally {
    isSubmitting.value = false
  }
}

const deleteProject = async (id) => {
  if (confirm('Are you sure you want to delete this project?')) {
    await store.deleteProject(id)
  }
}
</script>

<template>
  <div class="p-6 max-w-6xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Manage Todo Projects</h1>
      <button
        v-if="authStore.isAdminMood"
        @click="openCreateModal(null)"
        class="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
      >
        <i class="fad fa-plus-circle mr-1"></i> Add Project
      </button>
    </div>

    <div v-if="store.error" class="mb-4 text-red-600 bg-red-100 p-3 rounded">
      {{ store.error }}
    </div>

    <!-- Loader -->
    <div v-if="store.loading && !store.projects.length" class="py-20 text-center">
      <LoaderView />
      <p class="mt-4 text-gray-500">Loading projects...</p>
    </div>

    <div v-else class="space-y-10 pb-20">
      <!-- Public Section -->
      <section>
        <div class="flex items-center gap-2 mb-4 border-b pb-2">
          <h2 class="text-lg font-bold text-gray-700 uppercase tracking-wide">
            Global / All Departments
          </h2>
          <span class="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full font-bold">{{
            publicProjects.length
          }}</span>
        </div>

        <div class="bg-white rounded-lg shadow-sm overflow-hidden border">
          <table class="w-full text-left text-sm">
            <thead>
              <tr
                class="bg-gray-50 border-b text-gray-600 font-semibold uppercase text-[10px] tracking-wider"
              >
                <th class="px-6 py-3">Project Title</th>
                <th class="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 uppercase text-[12px]">
              <tr
                v-for="p in publicProjects"
                :key="p.id"
                class="hover:bg-gray-50 transition-colors group"
              >
                <td class="px-6 py-4 font-medium text-gray-800">{{ p.title }}</td>
                <td
                  class="px-6 py-4 text-right space-x-3 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <button @click="startEdit(p)" class="text-blue-600 hover:underline">Edit</button>
                  <button @click="deleteProject(p.id)" class="text-red-500 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
              <tr v-if="publicProjects.length === 0">
                <td colspan="2" class="px-6 py-8 text-center text-gray-400 italic">
                  No global projects found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Department Sections -->
      <section v-for="dept in departments" :key="dept.id">
        <div class="flex justify-between items-center mb-4 border-b pb-2">
          <div class="flex items-center gap-3">
            <h2 class="text-lg font-bold text-blue-900 uppercase tracking-tight">
              {{ dept.name }}
            </h2>
            <span class="text-gray-400 text-xs font-medium px-2 py-0.5 border rounded uppercase">{{
              dept.company_name
            }}</span>
            <span class="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-full font-bold">
              {{ getProjectsByDept(dept.id).length }} Projects
            </span>
          </div>
          <button
            @click="openCreateModal(dept.id)"
            class="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-blue-100 shadow-sm"
          >
            <i class="fad fa-plus-circle"></i> Add To Dept
          </button>
        </div>

        <div class="bg-white rounded-lg shadow-sm overflow-hidden border">
          <table class="w-full text-left text-sm">
            <thead>
              <tr
                class="bg-gray-50 border-b text-gray-600 font-semibold uppercase text-[10px] tracking-wider"
              >
                <th class="px-6 py-3">Project Title</th>
                <th class="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 uppercase text-[12px]">
              <tr
                v-for="p in getProjectsByDept(dept.id)"
                :key="p.id"
                class="hover:bg-blue-50/30 transition-colors group"
              >
                <td class="px-6 py-4 font-medium text-gray-800">{{ p.title }}</td>
                <td
                  class="px-6 py-4 text-right space-x-3 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <button @click="startEdit(p)" class="text-blue-600 hover:underline">Edit</button>
                  <button @click="deleteProject(p.id)" class="text-red-500 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
              <tr v-if="getProjectsByDept(dept.id).length === 0">
                <td colspan="2" class="px-6 py-8 text-center text-gray-400 italic">
                  No project assigned.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- Create/Edit Modal -->
    <OverlyModal v-if="showModal" @click.self="cancelEdit">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto overflow-hidden">
        <div class="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
          <h2 class="text-lg font-bold text-gray-800">
            {{ isEditing ? 'Edit Project' : 'New Project' }}
          </h2>
          <button @click="cancelEdit" class="text-gray-400 hover:text-gray-600 text-3xl font-light">
            &times;
          </button>
        </div>

        <div class="p-6 space-y-5">
          <div v-if="authStore.isAdminMood">
            <CompanyDepartmentSelectInput
              v-model="selectedDepartmentId"
              :companies="companyStore?.myCompanies || []"
            >
              <template #label>
                <label class="text-sm font-bold text-gray-700 block mb-2 uppercase tracking-wide"
                  >Target Department</label
                >
              </template>
            </CompanyDepartmentSelectInput>
            <p class="text-[10px] text-gray-400 mt-2 uppercase">
              Leave empty to make accessible for all departments.
            </p>
          </div>

          <div>
            <label class="text-sm font-bold text-gray-700 block mb-2 uppercase tracking-wide"
              >Project Title</label
            >
            <input
              v-model="formTitle"
              class="w-full border-2 border-gray-100 px-4 py-3 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              placeholder="e.g. Website Maintenance"
              @keyup.enter="saveProject"
              autoFocus
            />
          </div>
        </div>

        <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
          <button
            @click="cancelEdit"
            class="text-gray-500 hover:text-gray-700 px-4 py-2 font-medium transition"
          >
            Cancel
          </button>
          <button
            @click="saveProject"
            class="bg-blue-600 text-white px-8 py-2 rounded-lg font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2 min-w-[140px]"
            :disabled="isSubmitting || !formTitle.trim()"
          >
            <LoaderView v-if="isSubmitting" />
            <span>{{ isEditing ? 'Update' : 'Create' }}</span>
          </button>
        </div>
      </div>
    </OverlyModal>
  </div>
</template>

<style scoped>
/* Ensure modal content is scrollable if title is long */
.max-h-screen-70 {
  max-height: 70vh;
  overflow-y: auto;
}
</style>
