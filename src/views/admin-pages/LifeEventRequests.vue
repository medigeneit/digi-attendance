<script setup>
import { onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'
import LoaderView from '@/components/common/LoaderView.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import { useLifeEventsStore } from '@/stores/lifeEvents'

const toast = useToast()
const store = useLifeEventsStore()

const filters = ref({
  search: '',
  event_type: '',
  status: 'pending',
  gift_status: '',
  page: 1,
  per_page: 20,
})

const rejectingId = ref(null)
const rejectionReason = ref('')
const actionLoadingId = ref(null)

const eventLabel = (value) => ({
  marriage: 'Marriage',
  child_birth: 'Child Birth',
}[value] || value || '-')

const giftLabel = (value) => ({
  not_started: 'Not Started',
  processing: 'Processing',
  given: 'Given',
}[value] || '-')

const statusClass = (status) => ({
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-rose-200 bg-rose-50 text-rose-700',
}[status] || 'border-slate-200 bg-slate-50 text-slate-600')

const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-GB') : '-'

const load = () => store.fetchAdmin(filters.value)

const resetFilters = () => {
  filters.value = {
    search: '',
    event_type: '',
    status: 'pending',
    gift_status: '',
    page: 1,
    per_page: 20,
  }
  load()
}

const approve = async (item) => {
  try {
    actionLoadingId.value = item.id
    await store.approve(item.id)
    toast.success('Request approved.')
    await load()
  } catch (err) {
    toast.error(err?.response?.data?.message || 'Approval failed.')
  } finally {
    actionLoadingId.value = null
  }
}

const openReject = (item) => {
  rejectingId.value = item.id
  rejectionReason.value = ''
}

const reject = async () => {
  if (!rejectionReason.value.trim()) {
    toast.error('Rejection reason is required.')
    return
  }

  try {
    actionLoadingId.value = rejectingId.value
    await store.reject(rejectingId.value, rejectionReason.value.trim())
    toast.success('Request rejected.')
    rejectingId.value = null
    rejectionReason.value = ''
    await load()
  } catch (err) {
    toast.error(err?.response?.data?.message || 'Reject failed.')
  } finally {
    actionLoadingId.value = null
  }
}

const updateGiftStatus = async (item, event) => {
  try {
    actionLoadingId.value = item.id
    await store.updateGiftStatus(item.id, event.target.value)
    toast.success('Gift status updated.')
    await load()
  } catch (err) {
    toast.error(err?.response?.data?.message || 'Gift status update failed.')
    event.target.value = item.gift_status
  } finally {
    actionLoadingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="p-4 md:p-5 space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="title-md md:title-lg">Life Event Marriage/Child</h1>
        <p class="mt-1 text-sm text-slate-500">Marriage and child birth information for HR records and gift processing.</p>
      </div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="grid gap-3 md:grid-cols-5">
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-600">Search</label>
          <input v-model.trim="filters.search" type="search" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Name, ID, email" @keyup.enter="() => { filters.page = 1; load() }" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-600">Event</label>
          <select v-model="filters.event_type" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" @change="() => { filters.page = 1; load() }">
            <option value="">All</option>
            <option value="marriage">Marriage</option>
            <option value="child_birth">Child Birth</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-600">Status</label>
          <select v-model="filters.status" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" @change="() => { filters.page = 1; load() }">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-600">Gift</label>
          <select v-model="filters.gift_status" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" @change="() => { filters.page = 1; load() }">
            <option value="">All</option>
            <option value="not_started">Not Started</option>
            <option value="processing">Processing</option>
            <option value="given">Given</option>
          </select>
        </div>
        <div class="flex items-end gap-2">
          <button class="btn-2 h-10" @click="() => { filters.page = 1; load() }">
            <i class="far fa-search"></i> Search
          </button>
          <button class="btn-3 h-10" @click="resetFilters">
            <i class="far fa-undo"></i>
          </button>
        </div>
      </div>
    </div>

    <LoaderView v-if="store.loading" />

    <div v-else-if="store.error" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      {{ store.error }}
    </div>

    <div v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1100px] text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th class="px-3 py-2">Employee</th>
              <th class="px-3 py-2">Event</th>
              <th class="px-3 py-2">Date</th>
              <th class="px-3 py-2">Name</th>
              <th class="px-3 py-2">Status</th>
              <th class="px-3 py-2">Gift</th>
              <th class="px-3 py-2">Previous Gift</th>
              <th class="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="!store.adminItems.length">
              <td colspan="8" class="px-3 py-8 text-center text-slate-500">No requests found.</td>
            </tr>
            <tr v-for="item in store.adminItems" :key="item.id">
              <td class="px-3 py-2">
                <div class="font-semibold text-slate-900">{{ item.user?.name || '-' }}</div>
                <div class="text-xs text-slate-500">
                  {{ item.user?.employee_id || '-' }}
                  <span v-if="item.user?.department?.name"> · {{ item.user.department.name }}</span>
                </div>
              </td>
              <td class="px-3 py-2 font-medium">{{ eventLabel(item.event_type) }}</td>
              <td class="px-3 py-2">{{ formatDate(item.event_date) }}</td>
              <td class="px-3 py-2">{{ item.spouse_name || item.child_name || '-' }}</td>
              <td class="px-3 py-2">
                <span class="rounded-full border px-2 py-0.5 text-xs font-medium capitalize" :class="statusClass(item.status)">
                  {{ item.status }}
                </span>
                <div v-if="item.rejection_reason" class="mt-1 max-w-[220px] truncate text-xs text-rose-600" :title="item.rejection_reason">
                  {{ item.rejection_reason }}
                </div>
              </td>
              <td class="px-3 py-2">
                <select
                  v-if="item.status === 'approved'"
                  :value="item.gift_status"
                  class="rounded-md border border-slate-300 px-2 py-1 text-xs"
                  :disabled="actionLoadingId === item.id"
                  @change="updateGiftStatus(item, $event)"
                >
                  <option value="not_started">Not Started</option>
                  <option value="processing">Processing</option>
                  <option value="given">Given</option>
                </select>
                <span v-else>{{ giftLabel(item.gift_status) }}</span>
              </td>
              <td class="px-3 py-2">
                <span :class="item.gift_received_before ? 'text-emerald-700' : 'text-slate-500'">
                  {{ item.gift_received_before ? 'Yes' : 'No' }}
                </span>
              </td>
              <td class="px-3 py-2">
                <div v-if="item.status === 'pending'" class="flex justify-end gap-2">
                  <button class="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100" :disabled="actionLoadingId === item.id" @click="approve(item)">
                    Approve
                  </button>
                  <button class="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100" :disabled="actionLoadingId === item.id" @click="openReject(item)">
                    Reject
                  </button>
                </div>
                <div v-else class="text-right text-xs text-slate-400">No action</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <PaginationBar
      v-if="store.meta.total > 0"
      :page="store.meta.current_page"
      :per-page="store.meta.per_page"
      :total="store.meta.total"
      :last-page="store.meta.last_page"
      @page-change="(page) => { filters.page = page; load() }"
    />

    <div v-if="rejectingId" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" @click.self="rejectingId = null">
      <div class="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <h2 class="text-base font-semibold text-slate-900">Reject Request</h2>
        <label class="mt-4 block text-xs font-medium text-slate-600">Reason <span class="text-rose-500">*</span></label>
        <textarea v-model.trim="rejectionReason" rows="4" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></textarea>
        <div class="mt-4 flex justify-end gap-2">
          <button class="btn-3" @click="rejectingId = null">Cancel</button>
          <button class="btn-2-red" :disabled="actionLoadingId === rejectingId" @click="reject">Reject</button>
        </div>
      </div>
    </div>
  </div>
</template>
