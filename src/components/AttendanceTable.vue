<template>
  <div class="att-wrap" :class="{ 'att-wrap--neutral': neutral }">


    <div class="att-scroll">
      <table class="att-table" :class="{ 'att-table--balanced': minimalDecorations }">
        <colgroup v-if="minimalDecorations">
          <col style="width: 7%" />   <!-- Date -->
          <col style="width: 5%" />   <!-- Day -->
          <col style="width: 13%" />  <!-- Shift -->
          <col style="width: 7%" />   <!-- Entry -->
          <col style="width: 7%" />   <!-- Exit -->
          <col style="width: 5%" />   <!-- Hrs -->
          <col style="width: 9%" />   <!-- OT -->
          <col style="width: 6%" />   <!-- Appr OT -->
          <col style="width: 9%" />   <!-- Late ↑ -->
          <col style="width: 9%" />   <!-- Early ↑ -->
          <col style="width: 23%" />  <!-- Status -->
        </colgroup>
        <thead>
          <tr class="att-thead top-0">
            <th class="w-24">Date</th>
            <th class="w-20">Day</th>
            <th>Shift</th>
            <th class="w-24">Entry</th>
            <th class="w-24">Exit</th>
            <th class="w-20">Hrs</th>
            <th class="w-20">OT</th>
            <th class="w-20">Appr OT</th>
            <th class="w-32">Late</th>
            <th class="w-32">Early</th>
            <th class="w-36">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.date" class="att-row" :class="rowMod(log)">

            <!-- Date -->
            <td class="att-cell att-cell--date" :data-s="rowStatus(log)">
              <span>{{ fmtDate(log.date) }}</span>
            </td>

            <!-- Day -->
            <td class="att-cell text-[10px]"
              :class="isStatusWeekend(log) || isStatusHoliday(log) ? 'text-slate-400' : 'text-slate-500'">
              {{ log.weekday }}
            </td>

            <!-- Shift -->
            <td class="att-cell" :title="`${log.shift_start_time} – ${log.shift_end_time}`">
              <div class="flex flex-col items-center gap-0.5">
                <span class="text-slate-700">{{ log.shift_name }}</span>
                <span v-if="!minimalDecorations" class="text-[9px] text-slate-400">{{ log.shift_start_time }} – {{ log.shift_end_time }}</span>
                <router-link
                  v-if="log.shift_exchange_application_status"
                  :to="{ name: 'ExchangeShiftShow', params: { id: log.shift_exchange_application_id } }"
                  class="att-link" :class="linkColor(log.shift_exchange_application_status)"
                >⇄ {{ log.shift_exchange_application_status }}</router-link>
              </div>
            </td>

            <!-- Entry -->
            <td class="att-cell" :class="log.late_duration && log.first_short_leave !== 'Approved' ? 'text-rose-600 font-medium' : 'text-slate-700'">
              <div class="flex items-center justify-center gap-1">
                <span v-if="log?.manual_attendance?.check_in && log.entry_time" class="att-m">M</span>
                {{ log.entry_time || '—' }}
                <router-link v-if="log?.manual_attendance?.id && log?.manual_attendance?.check_in"
                  :to="{ name: 'ManualAttendanceShow', params: { id: log.manual_attendance.id } }"
                  class="text-slate-300 hover:text-slate-500"><i class="far fa-eye text-[9px]"></i></router-link>
              </div>
            </td>

            <!-- Exit -->
            <td class="att-cell" :class="log.early_leave_duration && log.last_short_leave !== 'Approved' ? 'text-rose-600 font-medium' : 'text-slate-700'">
              <div class="flex items-center justify-center gap-1">
                {{ log.exit_time || '—' }}
                <router-link v-if="log?.manual_attendance?.id && log?.manual_attendance?.check_out"
                  :to="{ name: 'ManualAttendanceShow', params: { id: log.manual_attendance.id } }"
                  class="text-slate-300 hover:text-slate-500"><i class="far fa-eye text-[9px]"></i></router-link>
                <router-link
                  v-if="!log.exit_time && new Date(log.date) < new Date() && log.status === 'Present' && applyApplication"
                  :to="{ name: 'ManualAttendanceAdd', query: { type: 'Forget Punch', date: isoDate(log.date), entry_time: log.entry_time } }"
                  class="att-action-btn">Checkout Apply</router-link>
              </div>
            </td>

            <!-- Working Hours -->
            <td class="att-cell text-slate-700">
              {{ log.working_hours || '—' }}
            </td>

            <!-- OT -->
            <td class="att-cell">
              <template v-if="log.over_time_status === 'Approved'">
                <router-link :to="{ name: 'MyOvertimeShow', params: { id: log.over_time_application_id } }"
                  class="att-link text-emerald-600">{{ log.overtime_hours }} ✓</router-link>
              </template>
              <template v-else-if="log.over_time_status === 'Pending'">
                <router-link :to="{ name: 'MyOvertimeShow', params: { id: log.over_time_application_id } }"
                  class="att-link text-amber-600">{{ log.overtime_hours ?? '—' }} ·</router-link>
              </template>
              <template v-else-if="log.over_time_status === 'Rejected'">
                <span class="text-rose-400 text-[10px]">{{ log.overtime_hours }} ✕</span>
              </template>
              <template v-else-if="log.overtime_hours">
                <span class="text-slate-600">{{ log.overtime_hours }}</span>
                <router-link
                  v-if="applyApplication && log._overtime_minutes >= 120"
                  :to="{ name: 'MyOvertimeAdd', query: { date: isoDate(log.date), start_time: log.exit_time, end_time: log.shift_end_time, request_overtime_hours: log.overtime_hours } }"
                  class="att-action-btn ml-1">Apply</router-link>
              </template>
              <template v-else><span class="text-slate-300">—</span></template>
            </td>

            <!-- Approved OT -->
            <td class="att-cell">
              <span v-if="log?.approved_over_times" class="text-emerald-600 font-medium">{{ log.approved_over_times }}h</span>
              <span v-else class="text-slate-300">—</span>
            </td>

            <!-- Late -->
            <td class="att-cell">
              <div v-if="log.late_duration" class="flex flex-col items-center gap-0.5">
                <span class="text-rose-600 font-medium text-[11px]">{{ log.late_duration }}</span>
                <router-link v-if="log.first_short_leave"
                  :to="{ name: 'ShortLeaveShow', params: { id: log.first_short_leave_id } }"
                  class="att-link" :class="linkColor(log.first_short_leave)">{{ log.first_short_leave }}</router-link>
                <router-link v-else-if="applyApplication"
                  :to="{ name: 'ShortLeaveAdd', query: { type: 'Delay', start_time: log.shift_start_time, end_time: log.entry_time } }"
                  class="att-action-btn">Apply</router-link>
              </div>
              <span v-else class="text-slate-300">—</span>
            </td>

            <!-- Early -->
            <td class="att-cell">
              <div v-if="log.early_leave_duration" class="flex flex-col items-center gap-0.5">
                <span class="text-amber-600 font-medium text-[11px]">{{ log.early_leave_duration }}</span>
                <router-link v-if="log.last_short_leave"
                  :to="{ name: 'ShortLeaveShow', params: { id: log.last_short_leave_id } }"
                  class="att-link" :class="linkColor(log.last_short_leave)">{{ log.last_short_leave }}</router-link>
                <router-link v-else-if="applyApplication"
                  :to="{ name: 'ShortLeaveAdd', query: { type: 'Early', start_time: log.exit_time, end_time: log.shift_end_time } }"
                  class="att-action-btn">Apply</router-link>
              </div>
              <span v-else class="text-slate-300">—</span>
            </td>

            <!-- Status -->
            <td class="att-cell">
              <div
                class="flex items-center gap-1"
                :class="minimalDecorations ? 'flex-row flex-wrap justify-center' : 'flex-col'"
              >

                <!-- Absent + pending offday exchange: show status + which day they worked -->
                <template v-if="isStatusAbsent(log) && hasActiveOffdayExchange(log)">
                  <span class="att-status att-status--absent">Absent</span>
                  <router-link
                    :to="{ name: 'ExchangeOffdayShow', params: { id: log.day_exchange_id } }"
                    class="att-exchange-tag"
                    :class="exchangeTagColor(log.day_exchange_status)"
                  >
                    ⇄ Offday
                    <span v-if="log.day_exchange_worked_on">(worked {{ log.day_exchange_worked_on }})</span>
                    · {{ log.day_exchange_status || 'Waiting' }}
                  </router-link>
                </template>

                <!-- Present -->
                <span v-else-if="isStatusPresent(log)" class="att-status att-status--present">Present</span>

                <!-- Absent — with optional Leave Application button -->
                <template v-else-if="isStatusAbsent(log)">
                  <span class="att-status att-status--absent">Absent</span>
                  <!-- Already has leave application -->
                  <router-link v-if="log.leave_application_id"
                    :to="{ name: 'LeaveApplicationShow', params: { id: log.leave_application_id } }"
                    class="att-link" :class="linkColor(log.application_status)">
                    {{ log.leave_application_type ? log.leave_application_type + ' — ' : '' }}{{ log.application_status || 'Waiting' }}
                  </router-link>
                  <!-- No leave yet — offer to apply -->
                  <router-link v-else-if="applyApplication && isPastDate(log.date) && !hasActiveOffdayExchange(log)"
                    :to="{ name: 'LeaveApplicationAdd', query: { date: isoDate(log.date) } }"
                    class="att-leave-btn">
                    <i v-if="!minimalDecorations" class="far fa-file-alt text-[8px]"></i> Leave Apply
                  </router-link>
                </template>

                <!-- Weekend -->
                <span v-else-if="isStatusWeekend(log)" class="att-status att-status--dim">Weekend</span>

                <!-- Holiday -->
                <template v-else-if="isStatusHoliday(log)">
                  <span class="att-status att-status--holiday">Holiday</span>
                </template>

                <!-- Leave types -->
                <template v-else-if="isStatusLeave(log)">
                  <span class="att-status att-status--leave">{{ log.status }}</span>
                  <router-link v-if="log.leave_application_id"
                    :to="{ name: 'LeaveApplicationShow', params: { id: log.leave_application_id } }"
                    class="att-link" :class="linkColor(log.application_status)">{{ log.application_status || 'Waiting' }}</router-link>
                </template>

                <!-- Other -->
                <span v-else class="att-status att-status--dim">{{ log.status || '—' }}</span>

                <!-- Working day for exchange: show AFTER actual status, not override it.
                     Only show if exchange is approved (they actually came in)
                     OR if it's pending (so user knows this day is pledged for exchange) -->
                <router-link
                  v-if="log.day_exchange_off_for"
                  :to="{ name: 'ExchangeOffdayShow', params: { id: log.day_exchange_off_for.id } }"
                  class="att-exchange-tag"
                  :class="exchangeTagColor(log.day_exchange_off_for.status)"
                >
                  ⇄ For {{ log.day_exchange_off_for.exchange_on }} · {{ log.day_exchange_off_for.status || 'Waiting' }}
                </router-link>
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
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

defineProps({
  logs:             { type: Array,   required: true },
  applyApplication: { type: Boolean, default: false },
  neutral:          { type: Boolean, default: false },
  minimalDecorations: { type: Boolean, default: false },
})

/* ── date helpers ── */
const isoDate  = (d) => { try { return new Date(d + ' UTC').toISOString().split('T')[0] } catch { return d } }
const isPastDate = (d) => { try { return new Date(d) < new Date() } catch { return false } }
const fmtDate  = (d) => {
  try {
    return new Date(d + ' UTC').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  } catch { return d }
}

/* ── status helpers ── */
const _norm = (log) => (log.status || '').toLowerCase().trim()
const isToday        = (d) => { try { return dateIsToday(new Date(d)) } catch { return false } }
const isStatusPresent  = (log) => _norm(log).startsWith('present')
const isStatusAbsent   = (log) => _norm(log) === 'absent'
const isStatusWeekend  = (log) => _norm(log).startsWith('weekend')
const isStatusHoliday  = (log) => { const s = _norm(log); return s.includes('holiday') || !!log.isHoliday || !!log._is_holiday }
const isStatusLeave    = (log) => { const s = _norm(log); return ['cl','ml','sl','wpl'].includes(s) || s.includes('leave') }
const hasActiveOffdayExchange = (log) => {
  if (!log?.day_exchange_id) return false
  const status = String(log.day_exchange_status || '').toLowerCase().trim()
  return !['rejected', 'cancelled', 'canceled'].includes(status)
}

const rowStatus = (log) => {
  if (isToday(log.date))     return 'today'
  if (isStatusPresent(log))  return 'present'
  if (isStatusAbsent(log))   return 'absent'
  if (isStatusWeekend(log))  return 'weekend'
  if (isStatusHoliday(log))  return 'holiday'
  if (isStatusLeave(log))    return 'leave'
  return ''
}

const rowMod = (log) => ({
  'att-row--today':   isToday(log.date),
  'att-row--weekend': !isToday(log.date) && isStatusWeekend(log),
  'att-row--holiday': !isToday(log.date) && isStatusHoliday(log),
})

const linkColor = (s) => ({
  'text-emerald-600': s === 'Approved',
  'text-amber-600':   s === 'Pending',
  'text-rose-500':    s === 'Rejected',
  'text-slate-500':   !s || !['Approved','Pending','Rejected'].includes(s),
})

const exchangeTagColor = (s) => ({
  'att-exchange-tag--approved': s === 'Approved',
  'att-exchange-tag--pending':  s === 'Pending',
  'att-exchange-tag--rejected': s === 'Rejected',
  'att-exchange-tag--waiting':  !s || !['Approved','Pending','Rejected'].includes(s),
})
</script>

<style scoped>
/* ── Container ── */
.att-wrap   { width: 100%; }
.att-scroll { width: 100%; overflow: auto; max-height: 72vh; }
.att-wrap--neutral .att-scroll { max-height: 62vh; }

/* ── Legend ── */
.att-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 0 4px 8px;
  font-size: 10px;
  color: #64748b;
}
.att-legend > span { display: flex; align-items: center; gap: 4px; }
.att-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

/* ── Table ── */
.att-table {
  width: 100%;
  min-width: 920px;
  border-collapse: collapse;
  font-size: 11px;
}
.att-table--balanced { table-layout: fixed; }

/* ── Head ── */
.att-thead {
  position: sticky;
  z-index: 20;
  background: #f8fafc;
}
.att-thead th {
  padding: 7px 8px;
  text-align: center;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: #94a3b8;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}

/* ── Rows — NO background colors, clean white ── */
.att-row {
  background: white;
  border-bottom: 1px solid #f1f5f9;
  transition: background .1s;
}
.att-row:hover        { background: #f8fafc; }
.att-row--today       { background: #eff6ff; border-bottom-color: #bfdbfe; }
.att-row--today:hover { background: #dbeafe; }
/* Weekend / Holiday: only the text changes, no row color */
.att-row--weekend td { color: #94a3b8; }
.att-row--holiday td { color: #7c3aed22; }

/* ── Cells ── */
.att-cell {
  padding: 5px 8px;
  text-align: center;
  color: #475569;
  border-right: 1px solid #f1f5f9;
  vertical-align: middle;
}
.att-cell:last-child { border-right: none; }

/* Date cell — left accent bar only, no background */
.att-cell--date {
  text-align: left;
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #334155;
  padding-left: 10px;
  border-left: 3px solid transparent;
  white-space: nowrap;
}
.att-cell--date[data-s="present"]  { border-left-color: #10b981; }
.att-cell--date[data-s="absent"]   { border-left-color: #f43f5e; }
.att-cell--date[data-s="today"]    { border-left-color: #3b82f6; }
.att-cell--date[data-s="weekend"]  { border-left-color: #cbd5e1; }
.att-cell--date[data-s="holiday"]  { border-left-color: #8b5cf6; }
.att-cell--date[data-s="leave"]    { border-left-color: #f59e0b; }

/* ── Status text — no pill/badge, just colored text ── */
.att-status {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .03em;
}
.att-status--present { color: #059669; }
.att-status--absent  { color: #e11d48; }
.att-status--dim     { color: #94a3b8; font-weight: 500; }
.att-status--holiday { color: #7c3aed; font-weight: 500; }
.att-status--leave   { color: #d97706; font-weight: 600; }

/* ── Leave Application button (Absent rows) ── */
.att-leave-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 5px;
  border-radius: 3px;
  background: #eff6ff;
  border: 0;
  color: #1d4ed8;
  font-size: 9px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: background .15s;
}
.att-leave-btn:hover { background: #dbeafe; }

/* Exchange tag — looks like a status indicator, not an action button */
.att-exchange-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 9px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  opacity: .85;
}
.att-exchange-tag:hover { opacity: 1; text-decoration: underline; }
.att-exchange-tag--approved { color: #059669; }
.att-exchange-tag--pending  { color: #d97706; }
.att-exchange-tag--waiting  { color: #64748b; }
.att-exchange-tag--rejected { color: #e11d48; }

/* ── Inline action links ── */
.att-link {
  font-size: 9px;
  font-weight: 600;
  text-decoration: none;
  transition: opacity .1s;
}
.att-link:hover { opacity: .75; text-decoration: underline; }

/* Small apply button */
.att-action-btn {
  font-size: 9px;
  font-weight: 600;
  color: #2563eb;
  text-decoration: none;
  padding: 1px 5px;
  border-radius: 3px;
  background: #eff6ff;
  white-space: nowrap;
}
.att-action-btn:hover { background: #dbeafe; }

/* Manual badge */
.att-m {
  font-size: 8px;
  font-weight: 800;
  color: #1d4ed8;
  background: #dbeafe;
  border-radius: 2px;
  padding: 0 3px;
  line-height: 1.4;
}

/* ── Neutral (admin) mode: all rows truly white ── */
.att-wrap--neutral .att-row         { background: white !important; }
.att-wrap--neutral .att-row--today  { background: #eff6ff !important; }
.att-wrap--neutral .att-row:hover   { background: #f8fafc !important; }
.att-wrap--neutral .att-row--weekend td { color: inherit; }
</style>
