<script setup>
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { useOvertimeStore } from '@/stores/overtime'
import { useRoute, useRouter } from 'vue-router'
import AcceptAndRejectHandler from '../applications/AcceptAndRejectHandler.vue'
import DeleteOvertime from './DeleteOvertime.vue'
import DisplayFormattedWorkingHours from './DisplayFormattedWorkingHours.vue'
import UpdateApprovalTime from './UpdateApprovalTime.vue'
import { computed } from 'vue'

const route = useRoute()
const router = useRouter()

const authStore = useAuthStore()
const overtimeStore = useOvertimeStore()
const notificationStore = useNotificationStore()

const props = defineProps({ user: Object, onUpdate: { type: Function, default: null } })

const onSuccess = async () => {
  if (props.onUpdate) {
    await props.onUpdate()
  } else {
    await notificationStore.fetchCountNotifications()
  }
}

// Totals in MINUTES
const totalRequestedMinutes = computed(() => {
  const list = overtimeStore.overtimes || []
  return list.reduce((sum, o) => sum + (Number(o?.request_overtime_hours) || 0), 0)
})

const totalApprovedMinutes = computed(() => {
  const list = overtimeStore.overtimes || []
  return list.reduce((sum, o) => sum + (Number(o?.approval_overtime_hours) || 0), 0)
})

</script>

<template>
  <div class="space-y-4">
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
    <div class="overflow-x-auto">
      <table
        class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md text-sm"
      >
        <thead>
          <tr class="bg-gray-200 *:py-1">
            <th class="border border-gray-300 px-2 text-center">#</th>
            <th class="border border-gray-300 px-2 text-center">Date</th>
            <th class="border border-gray-300 px-2 text-center">Type</th>
            <th class="border border-gray-300 px-2 text-center">Shift</th>
            <th class="border border-gray-300 px-2 text-center">Check-In</th>
            <th class="border border-gray-300 px-2 text-center">Check-Out</th>
            <th class="border border-gray-300 px-2 text-center">Working (hour)</th>
            <th class="border border-gray-300 px-2 text-center">Request (hour)</th>
            <th class="border border-gray-300 px-2 text-center">Approved (hour)</th>
            <th class="border border-gray-300 px-2 text-center">Details</th>
            <th class="border border-gray-300 px-2 text-center">Status</th>
            <th class="border border-gray-300 px-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(overtime, index) in overtimeStore.overtimes"
            :key="overtime?.id"
            class="border-b border-gray-200 hover:bg-blue-200 *:py-2"
          >
            <td class="border border-gray-300 px-2 text-center">{{ index + 1 }}</td>
            <td class="border border-gray-300 px-2 text-center">
              {{
                new Date(overtime.date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })
              }}
            </td>
            <td class="border border-gray-300 px-2 text-center">
              {{ overtime.duty_type }}
            </td>
            <td class="border border-gray-300 px-2 text-center">
              {{ overtime.shift }}
            </td>
            <td class="border border-gray-300 px-2 text-center">
              {{ overtime.check_in || '- : -' }}
            </td>
            <td class="border border-gray-300 px-2 text-center">
              {{ overtime.check_out || '- : -' }}
            </td>
            <td class="border border-gray-300 px-2 text-center">
              <DisplayFormattedWorkingHours :workingHours="overtime.working_hours" />
            </td>
            <td class="border border-gray-300 px-2 text-center">
              <DisplayFormattedWorkingHours :workingHours="overtime.request_overtime_hours" />
            </td>
            <td
              class="border border-gray-300 px-2 text-center"
              :class="{
                'bg-red-500/50':
                  !overtime.approval_overtime_hours &&
                  (overtime.recommend_by_user_id === authStore.user?.id ||
                    notificationStore.applicationApprovalPermissions?.[overtime.id]
                      ?.allow_recommend_by),
              }"
            >
              <div class="flex items-center justify-center gap-4">
                <DisplayFormattedWorkingHours :workingHours="overtime.approval_overtime_hours" />
                <UpdateApprovalTime
                  v-if="
                    overtime.recommend_by_user_id === authStore.user?.id ||
                    notificationStore.applicationApprovalPermissions?.[overtime.id]
                      ?.allow_recommend_by
                  "
                  :overtime="overtime"
                  :onSuccess="onSuccess"
                />
              </div>
            </td>
            <td class="border border-gray-300 px-2 text-center">
              {{ overtime.work_details || '' }}
            </td>
            <td class="border border-gray-300 px-2 text-center">
              {{ overtime.status || 'Pending' }}
            </td>
            <td class="border border-gray-300 px-2 text-center !py-0.5">
              <div class="flex items-center justify-center gap-x-4">
                <div
                  v-if="
                    overtime.approval_overtime_hours &&
                    Object.values(
                      notificationStore.applicationApprovalPermissions?.[overtime.id] || {},
                    ).some((val) => val)
                  "
                  class="border border-dashed px-4 rounded-xl"
                >
                  <AcceptAndRejectHandler
                    class="ml-auto"
                    notificationType="overtime_applications"
                    :applicationId="overtime.id"
                    :onSuccess="onSuccess"
                    :variant="1"
                  />
                </div>
                <RouterLink
                  :to="{ name: 'MyOvertimeShow', params: { id: overtime.id } }"
                  class="text-blue-800"
                >
                  <i class="far fa-eye text-lg"></i>
                </RouterLink>
                <DeleteOvertime :overtime="overtime" :onSuccess="onSuccess" />
              </div>
            </td>
          </tr>
          <tr v-if="overtimeStore.overtimes?.length === 0">
            <td colspan="100" class="p-2 text-center text-red-500">No overtimes found</td>
          </tr>
        </tbody>
        <tfoot v-if="overtimeStore.overtimes?.length" class="bg-gray-50">
          <tr class="*:py-2 font-semibold">
            <td class="border border-gray-300 px-2 text-right" colspan="7">Totals</td>

            <!-- Requested total -->
            <td class="border border-gray-300 px-2 text-center">
              <DisplayFormattedWorkingHours :workingHours="totalRequestedMinutes" />
            </td>

            <!-- Approved total -->
            <td class="border border-gray-300 px-2 text-center">
              <DisplayFormattedWorkingHours :workingHours="totalApprovedMinutes" />
            </td>

            <td class="border border-gray-300 px-2 text-center">—</td>
            <td class="border border-gray-300 px-2 text-center">—</td>
            <td class="border border-gray-300 px-2 text-center">—</td>
          </tr>
        </tfoot>

      </table>
    </div>
  </div>
</template>
