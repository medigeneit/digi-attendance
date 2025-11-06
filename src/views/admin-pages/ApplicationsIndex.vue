<script setup>
import { ref, onMounted, watch } from 'vue'
import { useAdminCareersStore } from '@/stores/adminCareers'

const store = useAdminCareersStore()

const q = ref('')
const status = ref('')
const job_id = ref(null)
const page = ref(1)
const per_page = ref(15)

const showDrawer = ref(false)
const current = ref(null)

async function load() {
  try {
    await store.fetchApplications({
      q: q.value || undefined,
      status: status.value || undefined,
      job_id: job_id.value || undefined,
      per_page: per_page.value,
      page: page.value
    })
  } catch (e) {}
}

function openDrawer(row) { current.value = row; showDrawer.value = true }
function closeDrawer() { showDrawer.value = false; current.value = null }

async function setStatus(row, next) {
  try {
    await store.updateApplicationStatus(row.id, { status: next, rating: row.rating || null })
  } catch (e) { alert('Update failed') }
}

onMounted(load)
watch([page, per_page], load)
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <h1 class="text-2xl font-semibold">Applications</h1>

    <!-- Filters -->
    <div class="mt-6 grid md:grid-cols-5 gap-3">
      <input v-model="q" @keyup.enter="load" placeholder="Search applicant name/email…" class="border rounded-lg px-3 py-2" />
      <select v-model="job_id" class="border rounded-lg px-3 py-2">
        <option :value="null">All Jobs</option>
        <!-- optionally hydrate from a jobs lookup -->
      </select>
      <select v-model="status" class="border rounded-lg px-3 py-2">
        <option value="">Any Status</option>
        <option value="new">New</option>
        <option value="shortlisted">Shortlisted</option>
        <option value="interviewed">Interviewed</option>
        <option value="offered">Offered</option>
        <option value="hired">Hired</option>
        <option value="rejected">Rejected</option>
      </select>
      <div class="flex gap-2">
        <button @click="load" class="px-4 py-2 rounded-lg bg-indigo-600 text-white w-full">Filter</button>
        <button @click="q='';job_id=null;status='';load()" class="px-4 py-2 rounded-lg border w-full">Reset</button>
      </div>
    </div>

    <!-- Table -->
    <div class="mt-6 overflow-x-auto bg-white rounded-2xl border">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="text-left border-b">
            <th class="px-4 py-3">Applicant</th>
            <th class="px-4 py-3">Job</th>
            <th class="px-4 py-3">Applied</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Rating</th>
            <th class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in store.applications" :key="row.id" class="border-b hover:bg-gray-50">
            <td class="px-4 py-3">
              <div class="font-medium">{{ row.full_name }}</div>
              <div class="text-xs text-gray-500">{{ row.email }}</div>
            </td>
            <td class="px-4 py-3">
              <div class="font-medium">{{ row.career?.title || '—' }}</div>
              <div class="text-xs text-gray-500">{{ row.career?.slug }}</div>
            </td>
            <td class="px-4 py-3">{{ (row.applied_at || '').toString().slice(0,19).replace('T',' ') }}</td>
            <td class="px-4 py-3">
              <select class="border rounded px-2 py-1 text-xs"
                      :value="row.status"
                      @change="setStatus(row, $event.target.value)">
                <option value="new">New</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interviewed">Interviewed</option>
                <option value="offered">Offered</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </td>
            <td class="px-4 py-3">
              <span class="text-xs">{{ row.rating || '—' }}</span>
            </td>
            <td class="px-4 py-3 text-right">
              <button @click="openDrawer(row)" class="px-3 py-1 rounded bg-blue-600 text-white">View</button>
            </td>
          </tr>
          <tr v-if="!store.applications?.length">
            <td colspan="6" class="px-4 py-8 text-center text-gray-500">No applications found</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="mt-4 flex items-center justify-between">
      <div class="text-sm text-gray-500">
        Page {{ store.appsMeta.page }} / {{ store.appsMeta.last_page }} • {{ store.appsMeta.total }} total
      </div>
      <div class="flex items-center gap-2">
        <button :disabled="store.appsMeta.page<=1" @click="page=Math.max(1, store.appsMeta.page-1)" class="px-3 py-1 rounded border">Prev</button>
        <button :disabled="store.appsMeta.page>=store.appsMeta.last_page" @click="page=Math.min(store.appsMeta.last_page, store.appsMeta.page+1)" class="px-3 py-1 rounded border">Next</button>
        <select v-model.number="per_page" class="border rounded px-2 py-1">
          <option :value="15">15</option>
          <option :value="30">30</option>
          <option :value="60">60</option>
        </select>
      </div>
    </div>

    <!-- Drawer -->
    <div v-if="showDrawer" class="fixed inset-0 bg-black/40 z-50 flex">
      <div class="ml-auto h-full w-full max-w-xl bg-white shadow-xl p-6 overflow-y-auto">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-semibold">Application Details</h3>
          <button @click="closeDrawer" class="text-gray-500 hover:text-black">✕</button>
        </div>

        <div v-if="current" class="mt-4 space-y-3 text-sm">
          <div>
            <div class="text-gray-500">Applicant</div>
            <div class="font-medium">{{ current.full_name }}</div>
            <div class="text-gray-500">{{ current.email }} <span v-if="current.phone">• {{ current.phone }}</span></div>
          </div>

          <div>
            <div class="text-gray-500">Job</div>
            <div class="font-medium">{{ current.job?.title }}</div>
            <div class="text-gray-500">{{ current.job?.slug }}</div>
          </div>

          <div v-if="current.cover_letter">
            <div class="text-gray-500">Cover Letter</div>
            <div class="whitespace-pre-wrap">{{ current.cover_letter }}</div>
          </div>

          <div>
            <div class="text-gray-500">Resume</div>
            <a :href="`https://hrm-file.s3.ap-southeast-1.amazonaws.com/${current.resume_path}`" target="_blank" class="text-indigo-600 underline">Download resume</a>
          </div>

          <div v-if="current.answers">
            <div class="text-gray-500">Answers</div>
            <pre class="bg-gray-50 border rounded p-3 overflow-x-auto">{{ current.answers }}</pre>
          </div>

          <div class="flex items-center gap-3">
            <label class="text-gray-500">Status</label>
            <select class="border rounded px-2 py-1"
                    :value="current.status"
                    @change="setStatus(current, $event.target.value)">
              <option value="new">New</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interviewed">Interviewed</option>
              <option value="offered">Offered</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div class="mt-6 text-right">
          <button @click="closeDrawer" class="px-4 py-2 rounded-lg bg-emerald-600 text-white">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>
