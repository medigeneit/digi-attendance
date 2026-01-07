<script setup>
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { useOvertimeStore } from '@/stores/overtime'
import { computed } from 'vue'

import AcceptAndRejectHandler from '../applications/AcceptAndRejectHandler.vue'
import DeleteOvertime from './DeleteOvertime.vue'
import DisplayFormattedWorkingHours from './DisplayFormattedWorkingHours.vue'
import UpdateApprovalTime from './UpdateApprovalTime.vue'

const authStore = useAuthStore()
const overtimeStore = useOvertimeStore()
const notificationStore = useNotificationStore()

const props = defineProps({
  user: Object,
  onUpdate: { type: Function, default: null },
})

const rows = computed(() => overtimeStore.overtimes || [])

const onSuccess = async () => {
  if (props.onUpdate) await props.onUpdate()
  else await notificationStore.fetchCountNotifications()
}

/* ---------- UI helpers ---------- */
const formatDate = (value) => {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return '—'
  }
}

const initials = computed(() => {
  const n = props.user?.name?.trim() || ''
  if (!n) return 'U'
  const parts = n.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join('')
})

const statusLabel = (s) => (s ? String(s) : 'Pending')

const statusClass = (s) => {
  const v = String(s || 'pending').toLowerCase()
  if (v.includes('approved') || v.includes('accept')) return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (v.includes('reject') || v.includes('decline')) return 'bg-rose-50 text-rose-700 ring-rose-200'
  if (v.includes('pending')) return 'bg-amber-50 text-amber-700 ring-amber-200'
  return 'bg-gray-50 text-gray-700 ring-gray-200'
}

const typeClass = (t) => {
  const v = String(t || '').toLowerCase()
  if (v.includes('holiday')) return 'bg-indigo-50 text-indigo-700 ring-indigo-200'
  if (v.includes('weekend')) return 'bg-violet-50 text-violet-700 ring-violet-200'
  if (v.includes('off')) return 'bg-sky-50 text-sky-700 ring-sky-200'
  return 'bg-gray-50 text-gray-700 ring-gray-200'
}

const canSetApprovalTime = (o) =>
  o?.recommend_by_user_id === authStore.user?.id ||
  !!notificationStore.applicationApprovalPermissions?.[o?.id]?.allow_recommend_by

const needsApprovalTime = (o) => !o?.approval_overtime_hours && canSetApprovalTime(o)

const canTakeAction = (o) => {
  const perms = notificationStore.applicationApprovalPermissions?.[o?.id] || {}
  const anyPerm = Object.values(perms).some(Boolean)
  if (o?.recommend_by_user_id === authStore.user?.id) {
    return (o?.approval_overtime_hours ?? null) && anyPerm
  }
  return anyPerm
}

/* ---------- Totals (MINUTES) ---------- */
const totalWorkingMinutes = computed(() =>
  rows.value.reduce((sum, o) => sum + (Number(o?.working_hours) || 0), 0),
)
const totalRequestedMinutes = computed(() =>
  rows.value.reduce((sum, o) => sum + (Number(o?.request_overtime_hours) || 0), 0),
)
const totalApprovedMinutes = computed(() =>
  rows.value.reduce((sum, o) => sum + (Number(o?.approval_overtime_hours) || 0), 0),
)
</script>

<template>
  <div class="space-y-4">
    <!-- Header: User + Totals -->
    <div class="card-bg p-4 gap-1"> 
      <div class="flex flex-wrap gap-x-8 gap-y-2"> 
        <p v-if="user?.employee_id" class="text-gray-700"> 
          <span class="text-gray-400">Employee ID:</span> 
          <strong class="ml-1">{{ user?.employee_id || 'N/A' }}</strong> 
        </p> 
        <p v-if="user?.name" class="text-gray-700"> 
          <span class="text-gray-400">Name:</span> 
          <strong class="ml-1">{{ user?.name }}</strong> 
        </p> 
        <p v-if="user?.designation?.title" class="text-gray-700"> 
          <span class="text-gray-400">Designation:</span> 
          <strong class="ml-1">{{ user?.designation?.title || 'N/A' }}</strong> 
        </p> 
        <p v-if="user?.department?.name" class="text-gray-700"> 
          <span class="text-gray-400">Department:</span> 
          <strong class="ml-1">{{ user?.department?.name || 'N/A' }}</strong> 
        </p> 
        <p v-if="user?.phone" class="text-gray-700"> 
          <span class="text-gray-400">Phone:</span> 
          <strong class="ml-1">{{ user?.phone }}</strong> 
        </p> 
      </div> 
    </div>

    <!-- Table card -->
    <div class="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      
      <div class="overflow-x-auto">
        <!-- min width so table doesn't look crushed -->
        <table class="min-w-[1200px] w-full text-sm">
          <thead class="sticky top-0 z-10 bg-gray-50 text-gray-600">
            <tr class="border-b border-gray-200">
              <th class="px-3 py-2 text-left font-semibold">#</th>
              <th class="px-3 py-2 text-left font-semibold">Applied</th>
              <th class="px-3 py-2 text-left font-semibold">Date</th>
              <th class="px-3 py-2 text-left font-semibold">Type</th>
              <th class="px-3 py-2 text-left font-semibold">Shift</th>
              <th class="px-3 py-2 text-left font-semibold">In</th>
              <th class="px-3 py-2 text-left font-semibold">Out</th>
              <th class="px-3 py-2 text-center font-semibold">Working</th>
              <th class="px-3 py-2 text-center font-semibold">Request</th>
              <th class="px-3 py-2 text-center font-semibold">Approved</th>
              <th class="px-3 py-2 text-left font-semibold">Details</th>
              <th class="px-3 py-2 text-center font-semibold">Status</th>
              <th class="px-3 py-2 text-center font-semibold">Action</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="(overtime, index) in rows"
              :key="overtime?.id"
              class="hover:bg-gray-50"
            >
              <td class="px-3 py-2 text-gray-600">{{ index + 1 }}</td>

              <td class="px-3 py-2">
                <span class="text-gray-900">{{ formatDate(overtime?.created_at) }}</span>
              </td>

              <td class="px-3 py-2">
                <span class="text-gray-900">{{ formatDate(overtime?.date) }}</span>
              </td>

              <td class="px-3 py-2">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
                  :class="typeClass(overtime?.duty_type)"
                >
                  {{ overtime?.duty_type || '—' }}
                </span>
              </td>

              <td class="px-3 py-2 text-gray-900">{{ overtime?.shift || '—' }}</td>

              <td class="px-3 py-2 text-gray-900">{{ overtime?.check_in || '—' }}</td>

              <td class="px-3 py-2 text-gray-900">{{ overtime?.check_out || '—' }}</td>

              <td class="px-3 py-2 text-center">
                <DisplayFormattedWorkingHours :workingHours="overtime?.working_hours" />
              </td>

              <td class="px-3 py-2 text-center">
                <DisplayFormattedWorkingHours :workingHours="overtime?.request_overtime_hours" />
              </td>

              <td class="px-3 py-2 text-center">
                <div
                  class="inline-flex items-center justify-center gap-2 rounded-xl px-2 py-1"
                  :class="needsApprovalTime(overtime) ? 'bg-amber-50 ring-1 ring-inset ring-amber-200' : ''"
                >
                  <DisplayFormattedWorkingHours :workingHours="overtime?.approval_overtime_hours" />

                  <UpdateApprovalTime
                    v-if="canSetApprovalTime(overtime)"
                    :overtime="overtime"
                    :onSuccess="onSuccess"
                  />
                </div>
              </td>

              <td class="px-3 py-2 text-gray-900">
                <span class="line-clamp-2">
                  {{ overtime?.work_details || '—' }}
                </span>
              </td>

              <td class="px-3 py-2 text-center">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
                  :class="statusClass(overtime?.status)"
                >
                  {{ statusLabel(overtime?.status) }}
                </span>
              </td>

              <td class="px-3 py-2">
                <div class="flex items-center justify-center gap-2">
                  <div
                    v-if="canTakeAction(overtime)"
                    class="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-2 py-1"
                  >
                    <AcceptAndRejectHandler
                      notificationType="overtime_applications"
                      :applicationId="overtime.id"
                      :onSuccess="onSuccess"
                      :variant="1"
                    />
                  </div>

                  <RouterLink
                    :to="{ name: 'MyOvertimeShow', params: { id: overtime.id } }"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                    title="View"
                  >
                    <i class="far fa-eye text-base"></i>
                  </RouterLink>

                  <!-- Keep your existing delete component -->
                  <DeleteOvertime :overtime="overtime" :onSuccess="onSuccess" />
                </div>
              </td>
            </tr>

            <tr v-if="rows.length === 0">
              <td colspan="100" class="px-4 py-10 text-center">
                <p class="text-sm font-semibold text-gray-900">No overtimes found</p>
                <p class="mt-1 text-xs text-gray-500">Try changing filters or date range.</p>
              </td>
            </tr>
          </tbody>

          <tfoot v-if="rows.length" class="bg-gray-50">
            <tr class="border-t border-gray-200 font-semibold">
              <td class="px-3 py-2 text-right text-gray-700" colspan="7">Totals</td>

              <td class="px-3 py-2 text-center">
                <DisplayFormattedWorkingHours :workingHours="totalWorkingMinutes" />
              </td>

              <td class="px-3 py-2 text-center">
                <DisplayFormattedWorkingHours :workingHours="totalRequestedMinutes" />
              </td>

              <td class="px-3 py-2 text-center">
                <DisplayFormattedWorkingHours :workingHours="totalApprovedMinutes" />
              </td>

              <td class="px-3 py-2 text-center text-gray-500">—</td>
              <td class="px-3 py-2 text-center text-gray-500">—</td>
              <td class="px-3 py-2 text-center text-gray-500">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>
