<template>
  <div class="w-full">
    <!-- Color Legend -->
    <div class="flex flex-wrap gap-x-4 gap-y-1 mb-2 px-1 text-[11px] text-slate-600 items-center">
      <span class="font-medium text-slate-500">Legend:</span>
      <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded bg-emerald-200 border border-emerald-400"></span>Present</span>
      <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded bg-red-200 border border-red-400"></span>Absent</span>
      <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded bg-purple-200 border border-purple-400"></span>Weekend</span>
      <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded bg-lime-200 border border-lime-400"></span>Holiday</span>
      <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded bg-amber-200 border border-amber-400"></span>Leave</span>
      <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded bg-sky-200 border border-sky-400"></span>Today</span>
    </div>

    <div class="w-full max-h-[90vh] overflow-auto md:max-h-none md:overflow-x-visible md:overflow-y-visible">
      <table
        class="min-w-[900px] md:min-w-full table-auto border-collapse border border-gray-300 bg-white"
      >
        <thead>
          <tr
            class="bg-gray-100 text-xs sticky z-20"
            :class="authStore.isAdminMood ? 'md:top-28 top-0' : 'md:top-14 top-0'"
          >
            <th class="border p-1.5 text-slate-700">Date</th>
            <th class="border p-1.5 text-slate-700">Day</th>
            <th class="border p-1.5 text-slate-700">Shift</th>
            <th class="border p-1.5 text-slate-700">Entry Time</th>
            <th class="border p-1.5 text-slate-700">Exit Time</th>
            <th class="border p-1.5 text-slate-700">Working Hours</th>
            <th class="border p-1.5 text-slate-700">Over Time</th>
            <th class="border p-1.5 text-slate-700">Approved OT</th>
            <th class="border p-1.5 text-slate-700">Late Entry</th>
            <th class="border p-1.5 text-slate-700">Early Leave</th>
            <th class="border p-1.5 text-slate-700 min-w-[120px]">Status</th>
          </tr>
        </thead>

        <tbody class="text-center text-xs">
          <tr
            v-for="log in logs"
            :key="log.date"
            class="hover:z-50 border-b transition-colors"
            :class="{
              // Today — highest priority
              'bg-sky-100 border-y-2 border-sky-400 hover:bg-sky-200': isToday(log.date),
              // Status-based row colors (only when not today)
              'bg-emerald-50 hover:bg-emerald-100': !isToday(log.date) && isStatusPresent(log),
              'bg-red-50 hover:bg-red-100':         !isToday(log.date) && isStatusAbsent(log),
              'bg-purple-50 hover:bg-purple-100':   !isToday(log.date) && isStatusWeekend(log),
              'bg-lime-50 hover:bg-lime-100':        !isToday(log.date) && isStatusHoliday(log),
              'bg-amber-50 hover:bg-amber-100':      !isToday(log.date) && isStatusLeave(log),
              'bg-white hover:bg-slate-50':          !isToday(log.date) && isStatusOther(log),
            }"
          >
          <!-- Date & Day -->
          <td class="border px-1.5 py-1 font-medium whitespace-nowrap">{{ log.date }}</td>
          <td class="border px-1.5 py-1 whitespace-nowrap"
              :class="['Fri','Sat','Sun'].some(d => log.weekday?.startsWith(d)) ? 'text-red-600 font-semibold' : 'text-slate-600'"
          >{{ log.weekday }}</td>

          <!-- Shift Name + Exchange Status -->
          <td
            class="border px-2 py-1 text-sm whitespace-nowrap"
            :title="`${log.shift_start_time} to ${log.shift_end_time}`"
          >
            <div class="flex flex-col">
              <div class="font-semibold text-gray-800 text-xs">{{ log.shift_name }}</div>
              <div v-if="log.shift_exchange_application_status" class="text-xs">
                <router-link
                  :to="{
                    name: 'ExchangeShiftShow',
                    params: { id: log.shift_exchange_application_id },
                  }"
                  class="inline-flex items-center gap-1 px-2 py-0.5 font-medium transition hover:underline hover:opacity-90"
                  :class="{
                    'text-yellow-800': log.shift_exchange_application_status === 'Pending',
                    'text-green-800':  log.shift_exchange_application_status === 'Approved',
                    'text-red-800':    log.shift_exchange_application_status === 'Rejected',
                  }"
                >
                  {{ log.shift_exchange_application_status }}
                </router-link>
              </div>
            </div>
          </td>

          <!-- Entry Time -->
          <td
            class="border px-2 py-1 text-sm whitespace-nowrap"
            :class="{
              'bg-red-100 text-red-800': log.late_duration && log.first_short_leave !== 'Approved',
              'bg-blue-100 text-blue-800': log?.manual_attendance?.check_in && log.entry_time,
            }"
          >
            <div class="flex items-center justify-center gap-1" :title="`Device: ${log.entry_device}`">
              <span v-if="log?.manual_attendance?.check_in && log.entry_time" class="font-semibold text-blue-700">M:</span>
              <span>{{ log.entry_time || '—' }}</span>
              <router-link
                v-if="log?.manual_attendance?.id && log?.manual_attendance?.check_in"
                :to="{ name: 'ManualAttendanceShow', params: { id: log.manual_attendance.id } }"
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
              'bg-red-100 text-red-800': log.early_leave_duration && log.last_short_leave !== 'Approved',
              'bg-blue-100 text-blue-800': log?.manual_attendance?.check_out && log.exit_time,
            }"
          >
            <div class="flex items-center justify-center gap-1" :title="`Device: ${log.exit_device}`">
              <span>{{ log.exit_time || '—' }}</span>
              <router-link
                v-if="log?.manual_attendance?.id && log?.manual_attendance?.check_out"
                :to="{ name: 'ManualAttendanceShow', params: { id: log.manual_attendance.id } }"
                class="text-blue-600 hover:text-blue-800"
              >
                <i class="far fa-eye ml-1"></i>
              </router-link>
              <router-link
                v-if="
                  !log.exit_time &&
                  new Date(log.date) < new Date() &&
                  log.status === 'Present' &&
                  applyApplication
                "
                :to="{
                  name: 'ManualAttendanceAdd',
                  query: {
                    type: 'Forget Punch',
                    date: new Date(log.date + ' UTC').toISOString().split('T')[0],
                    entry_time: log.entry_time,
                    exit_time: log.exit_time,
                  },
                }"
                class="btn-link text-red-600"
              >
                (Check Out Apply)
              </router-link>
            </div>
          </td>

          <!-- Working Hours -->
          <td class="border px-1.5 py-1">
            <span :class="log.working_hours ? 'text-slate-800 font-medium' : 'text-slate-400'">
              {{ log.working_hours || '—' }}
            </span>
          </td>

          <!-- Overtime -->
          <td class="border px-1.5 py-1">
            <template v-if="log.over_time_status === 'Approved'">
              <router-link
                :to="{ name: 'MyOvertimeShow', params: { id: log.over_time_application_id } }"
                class="inline-flex items-center gap-1 font-medium text-green-600 transition hover:underline hover:opacity-90"
              >
                {{ log.overtime_hours }} <span class="text-[10px] bg-green-100 text-green-700 rounded px-1">✓ Approved</span>
              </router-link>
            </template>
            <template v-else-if="log.over_time_status === 'Pending'">
              <router-link
                :to="{ name: 'MyOvertimeShow', params: { id: log.over_time_application_id } }"
                class="inline-flex items-center gap-1 py-0.5 font-medium transition hover:underline hover:opacity-90 text-amber-700"
              >
                {{ log.overtime_hours ?? '—' }} <span class="text-[10px] bg-amber-100 rounded px-1">Pending</span>
              </router-link>
            </template>
            <template v-else-if="log.over_time_status === 'Rejected'">
              <span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-semibold">Rejected</span>
            </template>
            <template v-else-if="log.over_time_status && log.overtime_hours">
              <span>{{ log.overtime_hours }}</span>
              <router-link
                v-if="applyApplication && log.overtime_hours && log._overtime_minutes >= 120"
                :to="{
                  name: 'MyOvertimeAdd',
                  query: {
                    date: new Date(log.date + ' UTC').toISOString().split('T')[0],
                    start_time: log.exit_time,
                    end_time: log.shift_end_time,
                    request_overtime_hours: log.overtime_hours
                  },
                }"
                class="btn-link text-red-600"
              >
                (Apply)
              </router-link>
            </template>
            <template v-else><span class="text-slate-300">—</span></template>
          </td>

          <!-- Approved OT -->
          <td class="border px-1.5 py-1">
            <span v-if="log?.approved_over_times" class="font-medium text-emerald-700">
              {{ log.approved_over_times }}h
            </span>
            <span v-else class="text-slate-300">—</span>
          </td>

          <!-- Late Entry -->
          <td class="border px-1.5 py-1">
            <div v-if="log.late_duration" class="flex items-center justify-center gap-1 flex-wrap">
              <span class="text-red-700 font-medium">{{ log.late_duration }}</span>
              <router-link
                v-if="log.first_short_leave"
                :to="{ name: 'ShortLeaveShow', params: { id: log.first_short_leave_id } }"
                class="hover:underline text-[10px] rounded px-1"
                :class="{
                  'bg-green-100 text-green-700': log.first_short_leave === 'Approved',
                  'bg-yellow-100 text-yellow-700': log.first_short_leave === 'Pending',
                  'bg-red-100 text-red-700': log.first_short_leave === 'Rejected',
                }"
              >
                {{ log.first_short_leave }}
              </router-link>
              <router-link
                v-if="applyApplication && log.late_duration && !log.first_short_leave"
                :to="{
                  name: 'ShortLeaveAdd',
                  query: { type: 'Delay', start_time: log.shift_start_time, end_time: log.entry_time },
                }"
                class="btn-link text-red-600 text-[10px]"
              >
                (Apply)
              </router-link>
            </div>
            <span v-else class="text-slate-300">—</span>
          </td>

          <!-- Early Leave -->
          <td class="border px-1.5 py-1">
            <div v-if="log.early_leave_duration" class="flex items-center justify-center gap-1 flex-wrap">
              <span class="text-orange-700 font-medium">{{ log.early_leave_duration }}</span>
              <router-link
                v-if="log.last_short_leave"
                :to="{ name: 'ShortLeaveShow', params: { id: log.last_short_leave_id } }"
                class="hover:underline text-[10px] rounded px-1"
                :class="{
                  'bg-green-100 text-green-700': log.last_short_leave === 'Approved',
                  'bg-yellow-100 text-yellow-700': log.last_short_leave === 'Pending',
                  'bg-red-100 text-red-700': log.last_short_leave === 'Rejected',
                }"
              >
                {{ log.last_short_leave }}
              </router-link>
              <router-link
                v-if="applyApplication && log.early_leave_duration && !log.last_short_leave"
                :to="{
                  name: 'ShortLeaveAdd',
                  query: { type: 'Early', start_time: log.exit_time, end_time: log.shift_end_time },
                }"
                class="btn-link text-red-600 text-[10px]"
              >
                (Apply)
              </router-link>
            </div>
            <span v-else class="text-slate-300">—</span>
          </td>

          <!-- Final Status -->
          <td class="border py-1 px-1">
            <div class="flex justify-center items-center gap-1 flex-wrap">
              <StatusBadge :status="log.status" />

              <!-- Leave Application Link -->
              <div v-if="log.leave_application_id">
                <router-link
                  :to="{ name: 'LeaveApplicationShow', params: { id: log.leave_application_id } }"
                  class="text-blue-600 text-xs inline-flex items-center gap-1 hover:underline hover:text-blue-800"
                  title="View Leave Application"
                >
                  <span
                    class="text-[10px] font-medium rounded px-1"
                    :class="{
                      'bg-green-100 text-green-700':  log.application_status === 'Approved',
                      'bg-yellow-100 text-yellow-700': log.application_status === 'Pending',
                      'bg-red-100 text-red-700':       log.application_status === 'Rejected',
                    }"
                  >
                    {{ log.status === 'Absent' ? log.leave_application_type : '' }}
                    ({{ log.application_status || 'Waiting' }})
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
                    class="text-[10px] font-medium rounded px-1"
                    :class="{
                      'bg-green-100 text-green-700':  log.day_exchange_status === 'Approved',
                      'bg-yellow-100 text-yellow-700': log.day_exchange_status === 'Pending',
                      'bg-red-100 text-red-700':       log.day_exchange_status === 'Rejected',
                    }"
                  >
                    <template v-if="['Absent', 'Present'].includes(log.status)">
                      Offday ({{ log.day_exchange_status || 'Waiting' }})
                    </template>
                    <template v-else>
                      {{ log.day_exchange_status || 'Waiting' }}
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
  </div>
</template>

<script setup>
import { dateIsToday } from '@/libs/datetime'
import StatusBadge from './common/StatusBadge.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

defineProps({
  logs: {
    type: Array,
    required: true,
  },
  applyApplication: {
    type: Boolean,
    default: false,
  },
})

function isToday(date) {
  try {
    return dateIsToday(new Date(date))
  } catch {
    return false
  }
}

function _norm(log) {
  return (log.status || '').toLowerCase().trim()
}

function isStatusPresent(log)  { return _norm(log).startsWith('present') }
function isStatusAbsent(log)   { return _norm(log) === 'absent' }
function isStatusWeekend(log)  { return _norm(log).startsWith('weekend') }
function isStatusHoliday(log)  {
  const s = _norm(log)
  return s.includes('holiday') || !!log.isHoliday || !!log._is_holiday
}
function isStatusLeave(log)    {
  const s = _norm(log)
  return ['cl', 'ml', 'sl', 'wpl'].includes(s) || s.includes('leave')
}
function isStatusOther(log)    {
  return !isStatusPresent(log) && !isStatusAbsent(log) && !isStatusWeekend(log)
      && !isStatusHoliday(log) && !isStatusLeave(log)
}
</script>
