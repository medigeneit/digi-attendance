<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminCareersStore } from '@/stores/adminCareers'
import { useDepartmentStore } from '@/stores/department'
import { storeToRefs } from 'pinia'

const router = useRouter()
const store = useAdminCareersStore()
const departmentStore = useDepartmentStore()

const { departments } = storeToRefs(departmentStore)

const q = ref('')
const department_id = ref(null)
const location_id = ref(null)
const status = ref('')
const employment_type = ref('')
const page = ref(1)
const per_page = ref(12)

async function load() {
  try {
    await store.fetchJobs({
      q: q.value || undefined,
      department_id: department_id.value || undefined,
      location_id: location_id.value || undefined,
      employment_type: employment_type.value || undefined,
      status: status.value || undefined,
      per_page: per_page.value,
      page: page.value
    })
  } catch (e) {
    console.log(e);
    
  }
}

function toCreate() { router.push({ name: 'AdminCareersJobCreate' }) }
function toEdit(id) { router.push({ name: 'AdminCareersJobEdit', params: { id } }) }

async function removeJob(id) {
  if (!confirm('Delete this job?')) return
  try {
    await store.deleteJob(id)
    await load()
  } catch (e) { alert('Failed to delete') }
}

onMounted(load)

onMounted(() => {
    departmentStore.fetchDepartments()
})

watch([page, per_page], load)

</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Jobs (Admin)</h1>
      <button @click="toCreate" class="px-4 py-2 rounded-xl bg-emerald-600 text-white">+ New Job</button>
    </div>

    <!-- Filters -->
    <div class="mt-6 grid md:grid-cols-6 gap-3">
      <input v-model="q" @keyup.enter="load" placeholder="Search title/summary…" class="border rounded-lg px-3 py-2" />
      <select v-model="department_id" class="border rounded-lg px-3 py-2">
        <option :value="null">All Departments</option>
        <option v-for="department in departments" :key="department?.id" :value="department?.id">
            {{ department?.name }}
        </option>
        <!-- optionally fill dynamically -->
      </select>
      <select v-model="location_id" class="border rounded-lg px-3 py-2">
        <option :value="null">All Locations</option>
      </select>
      <select v-model="employment_type" class="border rounded-lg px-3 py-2">
        <option value="">Type</option>
        <option value="full_time">Full Time</option>
        <option value="part_time">Part Time</option>
        <option value="contract">Contract</option>
        <option value="internship">Internship</option>
        <option value="temporary">Temporary</option>
      </select>
      <select v-model="status" class="border rounded-lg px-3 py-2">
        <option value="">Any Status</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="closed">Closed</option>
      </select>
      <div class="flex gap-2">
        <button @click="load" class="px-4 py-2 rounded-lg bg-indigo-600 text-white w-full">Filter</button>
        <button @click="q='';department_id=null;location_id=null;employment_type='';status='';load()" class="px-4 py-2 rounded-lg border w-full">Reset</button>
      </div>
    </div>

    <!-- Table -->
    <div class="mt-6 overflow-x-auto bg-white rounded-2xl border">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="text-left border-b">
            <th class="px-4 py-3">Title</th>
            <th class="px-4 py-3">Dept</th>
            <th class="px-4 py-3">Location</th>
            <th class="px-4 py-3">Type</th>
            <th class="px-4 py-3">Deadline</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in store.jobs" :key="row.id" class="border-b hover:bg-gray-50">
            <td class="px-4 py-3">
              <div class="font-medium">{{ row.title }}</div>
              <div class="text-xs text-gray-500 line-clamp-1">{{ row.summary }}</div>
            </td>
            <td class="px-4 py-3">{{ row.department?.name || '—' }}</td>
            <td class="px-4 py-3">{{ row.location?.name || row.location?.city || '—' }}</td>
            <td class="px-4 py-3 capitalize">{{ (row.employment_type || '').replace('_',' ') }}</td>
            <td class="px-4 py-3">
              <span v-if="row.application_deadline" class="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800">
                {{ row.application_deadline }}
              </span>
              <span v-else class="text-xs text-gray-400">—</span>
            </td>
            <td class="px-4 py-3">
              <span
                class="text-xs px-2 py-1 rounded"
                :class="{
                  'bg-gray-100 text-gray-700': row.status==='draft',
                  'bg-emerald-100 text-emerald-800': row.status==='published',
                  'bg-rose-100 text-rose-800': row.status==='closed'
                }"
              >{{ row.status }}</span>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="inline-flex gap-2">
                <button @click="toEdit(row.id)" class="px-3 py-1 rounded bg-blue-600 text-white">Edit</button>
                <button @click="removeJob(row.id)" class="px-3 py-1 rounded bg-rose-600 text-white">Delete</button>
              </div>
            </td>
          </tr>
          <tr v-if="!store.jobs?.length">
            <td colspan="7" class="px-4 py-8 text-center text-gray-500">No jobs found</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="mt-4 flex items-center justify-between">
      <div class="text-sm text-gray-500">
        Page {{ store.jobsMeta.page }} / {{ store.jobsMeta.last_page }} • {{ store.jobsMeta.total }} total
      </div>
      <div class="flex items-center gap-2">
        <button :disabled="store.jobsMeta.page<=1" @click="page=Math.max(1, store.jobsMeta.page-1)" class="px-3 py-1 rounded border">Prev</button>
        <button :disabled="store.jobsMeta.page>=store.jobsMeta.last_page" @click="page=Math.min(store.jobsMeta.last_page, store.jobsMeta.page+1)" class="px-3 py-1 rounded border">Next</button>
        <select v-model.number="per_page" class="border rounded px-2 py-1">
          <option :value="12">12</option>
          <option :value="24">24</option>
          <option :value="48">48</option>
        </select>
      </div>
    </div>
  </div>
</template>
