<script setup>
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'

const notificationStore = useNotificationStore()
const { total_notifications, count_notifications } = storeToRefs(notificationStore)

onMounted(() => notificationStore.fetchCountNotifications())

const loading = computed(() => notificationStore.loading)
const error   = computed(() => notificationStore.error)
const c = (key) => count_notifications.value?.[key] || 0

const totalUnread = computed(() =>
  c('leave_applications') + c('short_leave_applications') +
  c('shift_exchange_applications') + c('offday_exchange_applications') +
  c('manual_attendance_applications') + c('overtime_applications') +
  c('probation') + c('application_feedback') +
  c('payroll_advance_deductions') + c('payroll_adjustments')
)

const modules = computed(() => [
  {
    group: 'HR & Attendance',
    groupKey: 'hr',
    items: [
      { key: 'leave_applications',            label: 'Leave Applications', sub: 'Leave mgmt',    icon: 'far fa-calendar-check',   count: c('leave_applications'),            color: 'green',  route: { name: 'MySpecificNotificationList', params: { type: 'leave_applications' } } },
      { key: 'short_leave_applications',       label: 'Short Leave',        sub: 'Time off',      icon: 'far fa-clock',            count: c('short_leave_applications'),       color: 'amber',  route: { name: 'MySpecificNotificationList', params: { type: 'short_leave_applications' } } },
      { key: 'shift_exchange_applications',    label: 'Shift Exchange',     sub: 'Scheduling',    icon: 'far fa-exchange-alt',     count: c('shift_exchange_applications'),    color: 'sky',    route: { name: 'MySpecificNotificationList', params: { type: 'shift_exchange_applications' } } },
      { key: 'offday_exchange_applications',   label: 'Offday Exchange',    sub: 'Scheduling',    icon: 'far fa-calendar-times',   count: c('offday_exchange_applications'),   color: 'violet', route: { name: 'MySpecificNotificationList', params: { type: 'offday_exchange_applications' } } },
      { key: 'manual_attendance_applications', label: 'Manual Attendance',  sub: 'Attendance',    icon: 'far fa-user-check',       count: c('manual_attendance_applications'), color: 'rose',   route: { name: 'MySpecificNotificationList', params: { type: 'manual_attendance_applications' } } },
      { key: 'overtime_applications',          label: 'Overtime',           sub: 'Work hours',    icon: 'far fa-hourglass-half',   count: c('overtime_applications'),          color: 'orange', route: { name: 'MySpecificNotificationList', params: { type: 'overtime_applications' } } },
      { key: 'probation',                      label: 'Probation Review',   sub: 'HR lifecycle',  icon: 'far fa-user-graduate',    count: c('probation'),                      color: 'amber',  route: { name: 'MySpecificNotificationList', params: { type: 'probation' } } },
      { key: 'application_feedback',           label: 'App Feedback',       sub: 'Communication', icon: 'far fa-comment-dots',     count: c('application_feedback'),           color: 'indigo', route: { name: 'MyApplicationFeedbackNotifications' } },
    ],
  },
  {
    group: 'Payroll',
    groupKey: 'payroll',
    items: [
      { key: 'payroll_advance_deductions', label: 'Advance Deductions',  sub: 'Payroll deductions', icon: 'far fa-hand-holding-usd', count: c('payroll_advance_deductions'), color: 'rose', route: { name: 'MyPayrollNotifications', query: { type: 'payroll_advance_deductions' } } },
      { key: 'payroll_adjustments',        label: 'Post-Payroll Adjust', sub: 'Adjustments',        icon: 'far fa-sliders-h',        count: c('payroll_adjustments'),        color: 'blue', route: { name: 'MyPayrollNotifications', query: { type: 'payroll_adjustments' } } },
    ],
  },
])

// Active = has pending. Sorted: pending first.
const sortedItems = (items) => [...items].sort((a, b) => b.count - a.count)

// Muted, professional ERP palette — no loud/bright colors
const palette = {
  green:  { tile: 'bg-[#2d7a4f]', badge: 'bg-white text-[#2d7a4f]', num: 'text-white', sub: 'text-green-200',  foot: 'bg-[#236040] text-white' },
  amber:  { tile: 'bg-[#b45309]', badge: 'bg-white text-[#b45309]', num: 'text-white', sub: 'text-amber-200',  foot: 'bg-[#92400e] text-white' },
  sky:    { tile: 'bg-[#0369a1]', badge: 'bg-white text-[#0369a1]', num: 'text-white', sub: 'text-sky-200',    foot: 'bg-[#075985] text-white' },
  violet: { tile: 'bg-[#5b21b6]', badge: 'bg-white text-[#5b21b6]', num: 'text-white', sub: 'text-violet-200', foot: 'bg-[#4c1d95] text-white' },
  rose:   { tile: 'bg-[#9f1239]', badge: 'bg-white text-[#9f1239]', num: 'text-white', sub: 'text-rose-200',   foot: 'bg-[#881337] text-white' },
  orange: { tile: 'bg-[#c2410c]', badge: 'bg-white text-[#c2410c]', num: 'text-white', sub: 'text-orange-200', foot: 'bg-[#9a3412] text-white' },
  indigo: { tile: 'bg-[#3730a3]', badge: 'bg-white text-[#3730a3]', num: 'text-white', sub: 'text-indigo-200', foot: 'bg-[#312e81] text-white' },
  blue:   { tile: 'bg-[#1d4ed8]', badge: 'bg-white text-[#1d4ed8]', num: 'text-white', sub: 'text-blue-200',   foot: 'bg-[#1e40af] text-white' },
}

const p = (color, key) => palette[color]?.[key] ?? ''

const now = new Date().toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
</script>

<template>
  <div class="min-h-screen" style="background:#eef0f4">

    <!-- ══ HEADER BAR ════════════════════════════════════════════════════════ -->
    <div class="border-b border-slate-200 bg-white">
      <div class="mx-auto max-w-7xl px-6">

        <!-- Breadcrumb -->
        <div class="flex items-center gap-1.5 pt-3 text-[11px] text-slate-400">
          <i class="far fa-home text-[10px]"></i>
          <span class="text-slate-300">/</span>
          <span class="font-medium text-slate-500">Notification Center</span>
        </div>

        <!-- Title + actions -->
        <div class="flex items-center justify-between gap-4 py-3">
          <div class="flex items-center gap-3">
            <h1 class="text-xl font-bold tracking-tight text-slate-800">Notification Center</h1>
            <span
              v-if="!loading && totalUnread > 0"
              class="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600"
            >
              <span class="h-1.5 w-1.5 animate-ping rounded-full bg-rose-500"></span>
              {{ totalUnread }} pending
            </span>
            <span
              v-else-if="!loading"
              class="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600"
            >
              <i class="fas fa-check text-[9px]"></i> All reviewed
            </span>
          </div>

          <div class="flex items-center gap-2 text-xs text-slate-400">
            <span class="hidden sm:block"><i class="far fa-clock mr-1"></i>{{ now }}</span>
            <button
              :disabled="loading"
              class="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
              @click="notificationStore.fetchCountNotifications()"
            >
              <i :class="['far fa-sync-alt text-[11px]', loading ? 'animate-spin' : '']"></i>
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ SUMMARY STRIP ═════════════════════════════════════════════════════ -->
    <div class="border-b border-slate-200 bg-white shadow-sm">
      <div class="mx-auto max-w-7xl px-6">
        <div class="flex items-stretch divide-x divide-slate-100 overflow-x-auto">

          <!-- Total -->
          <div class="flex min-w-[120px] items-center gap-3 py-4 pr-6">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <i class="far fa-bell text-slate-500"></i>
            </div>
            <div>
              <div class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</div>
              <div class="text-2xl font-extrabold leading-none text-slate-800">{{ total_notifications }}</div>
            </div>
          </div>

          <!-- Pending -->
          <div class="flex min-w-[130px] items-center gap-3 px-6 py-4">
            <div :class="totalUnread > 0 ? 'bg-rose-100' : 'bg-emerald-100'" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <i :class="totalUnread > 0 ? 'far fa-exclamation-circle text-rose-600' : 'fas fa-check text-emerald-600'"></i>
            </div>
            <div>
              <div class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Action Req.</div>
              <div class="text-2xl font-extrabold leading-none" :class="totalUnread > 0 ? 'text-rose-600' : 'text-emerald-600'">
                {{ totalUnread }}
              </div>
            </div>
          </div>

          <!-- Per group -->
          <div
            v-for="mod in modules"
            :key="mod.groupKey"
            class="flex min-w-[120px] items-center gap-3 px-6 py-4"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <i :class="mod.groupKey === 'hr' ? 'far fa-id-badge text-slate-500' : 'far fa-money-check-alt text-slate-500'"></i>
            </div>
            <div>
              <div class="text-[10px] font-bold uppercase tracking-widest text-slate-400">{{ mod.group }}</div>
              <div class="text-2xl font-extrabold leading-none text-slate-800">
                {{ mod.items.reduce((s, i) => s + i.count, 0) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ TILE GRID ══════════════════════════════════════════════════════════ -->
    <div class="mx-auto max-w-7xl px-6 py-6 space-y-8">

      <!-- Loading -->
      <template v-if="loading">
        <div v-for="g in 2" :key="g" class="space-y-3">
          <div class="h-4 w-48 animate-pulse rounded bg-slate-200"></div>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div v-for="i in 4" :key="i" class="h-36 animate-pulse rounded-xl bg-white"></div>
          </div>
        </div>
      </template>

      <!-- Error -->
      <div
        v-else-if="error"
        class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
      >
        <i class="far fa-exclamation-circle mr-1.5"></i>{{ error }}
      </div>

      <template v-else>
        <section v-for="mod in modules" :key="mod.groupKey" class="space-y-3">

          <!-- Section label -->
          <div class="flex items-center gap-3">
            <span class="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">{{ mod.group }}</span>
            <div class="h-px flex-1 bg-slate-200"></div>
            <span class="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              {{ mod.items.reduce((s, i) => s + i.count, 0) }} pending
            </span>
          </div>

          <!-- Tiles -->
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <RouterLink
              v-for="item in sortedItems(mod.items)"
              :key="item.key"
              :to="item.route"
              :class="[
                'group relative flex flex-col rounded-xl transition-all duration-200 hover:-translate-y-1',
                item.count > 0
                  ? [p(item.color, 'tile'), 'shadow-md hover:shadow-xl']
                  : 'border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300',
              ]"
            >
              <!-- Body -->
              <div class="relative flex flex-1 flex-col p-4 pb-3">

                <!-- Top row: icon box + count badge -->
                <div class="flex items-start justify-between">
                  <!-- Icon box -->
                  <div
                    :class="[
                      'flex h-11 w-11 items-center justify-center rounded-xl text-lg transition-transform duration-200 group-hover:scale-110',
                      item.count > 0 ? 'bg-white/20' : 'bg-slate-100',
                    ]"
                  >
                    <i
                      :class="[
                        item.icon,
                        item.count > 0 ? 'text-white' : 'text-slate-400',
                      ]"
                    ></i>
                  </div>

                  <!-- Count badge -->
                  <span
                    v-if="item.count > 0"
                    :class="['flex h-7 min-w-[28px] items-center justify-center rounded-full px-1.5 text-sm font-extrabold', p(item.color, 'badge')]"
                  >
                    {{ item.count }}
                  </span>
                  <span v-else class="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100">
                    <i class="far fa-check text-[10px] text-slate-400"></i>
                  </span>
                </div>

                <!-- Label + sub -->
                <div class="mt-3">
                  <p :class="['text-sm font-bold leading-tight', item.count > 0 ? 'text-white' : 'text-slate-600']">
                    {{ item.label }}
                  </p>
                  <p :class="['mt-0.5 text-[11px]', item.count > 0 ? p(item.color, 'sub') : 'text-slate-400']">
                    {{ item.sub }}
                  </p>
                </div>
              </div>

              <!-- Footer -->
              <div
                :class="[
                  'flex items-center justify-between rounded-b-xl px-4 py-2.5 text-[11px] font-bold',
                  item.count > 0 ? p(item.color, 'foot') : 'border-t border-slate-100 text-slate-400',
                ]"
              >
                <span>{{ item.count > 0 ? 'Review now' : 'View' }}</span>
                <i class="far fa-arrow-right text-[10px] transition-transform duration-150 group-hover:translate-x-1"></i>
              </div>
            </RouterLink>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>
