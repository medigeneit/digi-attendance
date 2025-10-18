<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useClearanceStore } from '@/stores/clearance'

const props = defineProps({
  user: { type: Object, required: true }, // { id, name, employee_id? }
  buttonClass: {
    type: String,
    default: 'px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700',
  },
  small: { type: Boolean, default: false },
})

const open = ref(false)
const debounceTimer = ref(null)

const s = useClearanceStore()
const { items, loading, error, sort, filters, summary, currentUserInfo } = storeToRefs(s)

const titleUser = computed(() => currentUserInfo.value?.name || props.user?.name || `#${props.user?.id}`)
const employeeId = computed(() => currentUserInfo.value?.employee_id || props.user?.employee_id || null)

function onOpen() {
  open.value = true
  s.setUser(props.user.id)
  s.fetch()
}

function onClose() {
  open.value = false
}

function onSort(col) {
  s.setSort(col)
  s.fetch()
}

function onReset() {
  s.resetFilters()
  s.fetch()
}

/* --- debounce search --- */
watch(() => filters.value.search, () => {
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
  debounceTimer.value = setTimeout(() => s.fetch(), 400)
})

/* --- close on ESC --- */
function onKeydown(e) {
  if (e.key === 'Escape') onClose()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <!-- Trigger button -->
  <button :class="buttonClass" @click="onOpen">
    {{ small ? 'Clearance' : 'View Clearance' }}
  </button>

  <!-- Modal -->
  <div v-if="open" class="fixed inset-0 z-[100]">
    <!-- Overlay -->
    <div class="absolute inset-0 bg-black/50" @click="onClose"></div>

    <!-- Panel -->
    <div class="absolute inset-0 flex items-start justify-center overflow-y-auto">
      <div class="mt-10 mb-10 w-[1100px] max-w-[95vw] rounded-2xl bg-white shadow-2xl">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 class="text-lg font-semibold">
              Clearance — {{ titleUser }}
              <span v-if="employeeId" class="text-sm text-gray-500 font-normal"> ({{ employeeId }}) </span>
            </h3>
            <p class="text-xs text-gray-500">
              Total: <span class="font-medium">{{ summary.total }}</span>
              <span v-for="(c, k) in summary.by_status" :key="k" class="ml-3">
                <span class="uppercase">{{ k }}</span>: <span class="font-medium">{{ c }}</span>
              </span>
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button class="px-3 py-1.5 rounded-md border hover:bg-gray-50" @click="onReset">Reset</button>
            <button class="px-3 py-1.5 rounded-md bg-gray-800 text-white hover:bg-black" @click="onClose">Close</button>
          </div>
        </div>

        <!-- Filters -->
        <div class="px-5 py-4 border-b grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            v-model="filters.search"
            type="search"
            placeholder="Search (dept, item, remarks, receiver)"
            class="col-span-2 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <select
            v-model="filters.status"
            class="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @change="s.fetch()"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="cleared">Cleared</option>
            <option value="rejected">Rejected</option>
          </select>

          <input
            v-model="filters.department_id"
            type="number"
            min="1"
            placeholder="Department ID"
            class="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @keyup.enter="s.fetch()"
          />
          <input
            v-model="filters.template_item_id"
            type="number"
            min="1"
            placeholder="Template Item ID"
            class="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @keyup.enter="s.fetch()"
          />
        </div>

        <!-- Table -->
        <div class="px-5 py-2 overflow-x-auto">
          <table class="min-w-[900px] w-full">
            <thead>
              <tr class="text-left text-sm border-b">
                <th class="py-2 pr-4">
                  <button class="inline-flex items-center gap-1" @click="onSort('department_id')">
                    Department
                    <span v-if="sort.by === 'department_id'">({{ sort.dir }})</span>
                  </button>
                </th>
                <th class="py-2 pr-4">
                  <button class="inline-flex items-center gap-1" @click="onSort('template_item_id')">
                    Item
                    <span v-if="sort.by === 'template_item_id'">({{ sort.dir }})</span>
                  </button>
                </th>
                <th class="py-2 pr-4">
                  <button class="inline-flex items-center gap-1" @click="onSort('status')">
                    Status
                    <span v-if="sort.by === 'status'">({{ sort.dir }})</span>
                  </button>
                </th>
                <th class="py-2 pr-4">Handover</th>
                <th class="py-2 pr-4">Present Condition</th>
                <th class="py-2 pr-4">Receiver</th>
                <th class="py-2 pr-4">
                  <button class="inline-flex items-center gap-1" @click="onSort('cleared_at')">
                    Cleared By / At
                    <span v-if="sort.by === 'cleared_at'">({{ sort.dir }})</span>
                  </button>
                </th>
                <th class="py-2 pr-2">Remarks</th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="loading">
                <td colspan="8" class="py-8 text-center text-gray-500">Loading…</td>
              </tr>
              <tr v-else-if="error">
                <td colspan="8" class="py-8 text-center text-red-600">{{ error }}</td>
              </tr>
              <tr v-else-if="!items.length">
                <td colspan="8" class="py-8 text-center text-gray-500">No items found</td>
              </tr>

              <tr v-for="row in items" :key="row.id" class="border-b hover:bg-gray-50">
                <td class="py-2 pr-4">
                  <div class="font-medium">
                    {{ row.department_name || `#${row.department_id}` }}
                  </div>
                </td>
                <td class="py-2 pr-4">
                  <div class="font-medium">
                    {{ row.template_item_name || `#${row.template_item_id}` }}
                  </div>
                </td>
                <td class="py-2 pr-4">
                  <span
                    class="px-2 py-0.5 rounded-full text-xs font-semibold"
                    :class="{
                      'bg-yellow-100 text-yellow-800': row.status === 'pending',
                      'bg-green-100 text-green-700': row.status === 'cleared',
                      'bg-red-100 text-red-700': row.status === 'rejected',
                      'bg-gray-100 text-gray-700': !['pending','cleared','rejected'].includes(row.status)
                    }"
                  >
                    {{ row.status || '—' }}
                  </span>
                </td>
                <td class="py-2 pr-4">
                  <span class="text-xs rounded-full px-2 py-0.5 bg-gray-100 text-gray-700">
                    {{ row.handover_status || '—' }}
                  </span>
                </td>
                <td class="py-2 pr-4">
                  <div class="text-sm text-gray-800 line-clamp-2">
                    {{ row.present_condition || '—' }}
                  </div>
                </td>
                <td class="py-2 pr-4">
                  <div class="text-sm text-gray-800">
                    {{ row.receiver_name || '—' }}
                  </div>
                </td>
                <td class="py-2 pr-4">
                  <div class="text-sm">
                    <div class="text-gray-800">
                      {{ row.cleared_by_user?.name || (row.cleared_by ? `#${row.cleared_by}` : '—') }}
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ row.cleared_at ? new Date(row.cleared_at).toLocaleString() : '' }}
                    </div>
                  </div>
                </td>
                <td class="py-2 pr-2 text-sm text-gray-700">
                  <div class="max-w-[280px] line-clamp-2" :title="row.remarks || ''">
                    {{ row.remarks || '—' }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
/* If Tailwind's line-clamp plugin isn't enabled */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
