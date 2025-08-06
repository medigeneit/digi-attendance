<template>
  <div class="overflow-x-auto card-bg">
    <table class="min-w-full table-auto border-collapse border border-gray-300 bg-white">
      <thead>
        <tr class="bg-gray-200 text-xs">
          <th class="border p-1">Date</th>
          <th class="border p-1">Day</th>
          <th class="border p-1">Shift</th>
          <th class="border p-1">Entry Time</th>
          <th class="border p-1">Exit Time</th>
          <th class="border p-1">Working Hours</th>
          <th class="border p-1">Over Time</th>
          <th class="border p-1">Approved OT</th>
          <th class="border p-1">Late Entry</th>
          <th class="border p-1">Early Leave</th>
          <th class="border p-1">Status</th>
        </tr>
      </thead>

      <tbody class="text-center text-xs">
        <tr
          v-for="log in logs"
          :key="log.date"
          class="hover:border-b-2 hover:border-gray-200 hover:z-50 hover:bg-blue-200"
        >
          <!-- Date & Day -->
          <td class="border px-1 py-0.5">{{ log.date }}</td>
          <td class="border px-1 py-0.5">{{ log.weekday }}</td>

          <!-- Shift Name + Exchange Status -->
          <td class="border px-2 py-1 text-sm whitespace-nowrap" :title="`${log.shift_start_time} to ${log.shift_end_time}`">
            <div class="flex flex-col gap-1">
              <div class="font-semibold text-gray-800">{{ log.shift_name }}</div>
              <div v-if="log.shift_exchange_application_status" class="text-xs">
                <router-link
                  :to="{ name: 'ExchangeShiftShow', params: { id: log.shift_exchange_application_id } }"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium transition hover:opacity-90"
                  :class="{
                    'bg-yellow-100 text-yellow-800': log.shift_exchange_application_status === 'Pending',
                    'bg-green-100 text-green-800': log.shift_exchange_application_status === 'Approved',
                    'bg-red-100 text-red-800': log.shift_exchange_application_status === 'Rejected',
                  }"
                >
                  <i class="far fa-eye"></i>
                  {{ log.shift_exchange_application_status }}
                </router-link>
              </div>
            </div>
          </td>

          <!-- Entry Time -->
          <td
            class="border px-2 py-1 text-sm whitespace-nowrap"
            :class="{
              'bg-red-50 text-red-800': log.late_duration,
              'bg-blue-50 text-blue-800': log?.manual_attendance?.check_in && log.entry_time,
            }"
          >
            <div class="flex items-center gap-1" :title="`Device: ${log.entry_device}`">
              <span v-if="log?.manual_attendance?.check_in && log.entry_time" class="font-semibold">M:</span>
              <span>{{ log.entry_time || '--' }}</span>
              <router-link
                v-if="log?.manual_attendance?.id && log?.manual_attendance?.check_in"
                :to="{ name: 'ManualAttendanceShow', params: { id: log.manual_attendance.id }}"
                class="text-blue-600 hover:text-blue-800"
              >
                <i class="far fa-eye ml-1"></i>
              </router-link>
            </div>
          </td>

          <!-- Exit Time -->
          <td
            class="border px-2 py-1 text-sm whitespace-nowrap"
            :class="{
              'bg-red-50 text-red-800': log.early_leave_duration,
              'bg-blue-50 text-blue-800': log?.manual_attendance?.check_out && log.exit_time,
            }"
          >
            <div class="flex items-center gap-1" :title="`Device: ${log.exit_device}`">
              <span>{{ log.exit_time || '--' }}</span>
              <router-link
                v-if="log?.manual_attendance?.id && log?.manual_attendance?.check_out"
                :to="{ name: 'ManualAttendanceShow', params: { id: log.manual_attendance.id }}"
                class="text-blue-600 hover:text-blue-800"
              >
                <i class="far fa-eye ml-1"></i>
              </router-link>
            </div>
          </td>

          <!-- Working Hours -->
          <td class="border px-1 py-0.5">{{ log.working_hours }}</td>

          <!-- Overtime -->
          <td class="border px-1 py-0.5">
            <template v-if="log.over_time_status === 'Approved'">
              <router-link
                :to="{ name: 'MyOvertimeShow', params: { id: log.over_time_application_id } }"
                class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold"
              >
                {{ log.overtime_hours }} | Approved
              </router-link>
            </template>
            <template v-else-if="log.over_time_status === 'Pending'">
              <router-link
                :to="{ name: 'MyOvertimeShow', params: { id: log.over_time_application_id } }"
                class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-semibold animate-pulse"
              >
                {{ log.overtime_hours ?? '--' }} | Pending
              </router-link>
            </template>
            <template v-else-if="log.over_time_status === 'Rejected'">
              <span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">Rejected</span>
            </template>
            <template v-else-if="log.over_time_status && log.overtime_hours">
              <span>{{ log.overtime_hours }}</span>
            </template>
          </td>

          <!-- Approved OT -->
          <td class="border px-1 py-0.5">
            {{ log?.approved_over_times ? log.approved_over_times + ' H' : '' }}
          </td>

          <!-- Late Entry -->
          <td class="border px-1 py-0.5">
            <div v-if="log.late_duration">
              {{ log.late_duration }}
              <router-link
                v-if="log.first_short_leave"
                :to="{ name: 'ShortLeaveShow', params: { id: log.first_short_leave_id } }"
                :class="{
                  'text-green-500': log.first_short_leave === 'Approved',
                  'text-yellow-500': log.first_short_leave === 'Pending',
                  'text-red-500': log.first_short_leave === 'Rejected',
                }"
              >
                ({{ log.first_short_leave }})
              </router-link>
            </div>
          </td>

          <!-- Early Leave -->
          <td class="border px-1 py-0.5">
            <div v-if="log.early_leave_duration">
              {{ log.early_leave_duration }}
              <router-link
                v-if="log.last_short_leave"
                :to="{ name: 'ShortLeaveShow', params: { id: log.last_short_leave_id } }"
                class="px-1"
                :class="{
                  'text-green-500': log.last_short_leave === 'Approved',
                  'text-yellow-500': log.last_short_leave === 'Pending',
                  'text-red-500': log.last_short_leave === 'Rejected',
                }"
              >
                ({{ log.last_short_leave }})
              </router-link>
            </div>
          </td>

          <!-- Final Status -->
          <td class="border py-0.5">
            <div class="flex justify-center items-center gap-1">
              <StatusBadge :status="log.status" />

              <!-- Leave Application Link -->
              <div v-if="log.leave_application_id">
                <router-link
                  :to="{ name: 'LeaveApplicationShow', params: { id: log.leave_application_id } }"
                  class="text-blue-600 text-xs inline-flex items-center gap-1 hover:underline hover:text-blue-800"
                  title="View Leave Application"
                >
                  <span
                    class="text-xs font-medium"
                    :class="{
                      'text-green-700': log.application_status === 'Approved',
                      'text-yellow-700': log.application_status === 'Pending',
                      'text-red-700': log.application_status === 'Rejected',
                    }"
                  >
                    {{ log.status === 'Absent' ? log.leave_application_type : '' }}
                    ({{ log.application_status || 'Waiting Handover' }})
                  </span>
                </router-link>
              </div>

              <!-- Exchange Offday Link -->
              <div v-if="log.day_exchange_id">
                <router-link
                  :to="{ name: 'ExchangeOffdayShow', params: { id: log.day_exchange_id } }"
                  class="text-blue-600 text-xs hover:underline hover:text-blue-800"
                  title="View Exchange Offday Application"
                >
                  <span
                    class="text-xs font-medium"
                    :class="{
                      'text-green-700': log.day_exchange_status === 'Approved',
                      'text-yellow-700': log.day_exchange_status === 'Pending',
                      'text-red-700': log.day_exchange_status === 'Rejected',
                    }"
                  >
                    <template v-if="['Absent', 'Present'].includes(log.status)">
                      Offday ({{ log.day_exchange_status || 'Waiting Handover' }})
                    </template>
                    <template v-else>
                      {{ log.day_exchange_status || 'Waiting Handover' }}
                    </template>
                  </span>
                </router-link>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import StatusBadge from './common/StatusBadge.vue';

defineProps({
  logs: {
    type: Array,
    required: true,
  },
});
</script>
