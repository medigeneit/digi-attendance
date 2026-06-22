<script setup>
import ApplicationMenu from '@/components/ApplicationMenu.vue'
import AttendanceTable from '@/components/AttendanceTable.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useAuthStore } from '@/stores/auth'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const attendanceStore = useAttendanceStore()

const selectedMonth = ref(route.query.date || attendanceStore.selectedMonth)
const showModal = ref(false)

const formattedMonthName = computed(() => {
  if (!selectedMonth.value) return ''
  const [year, month] = selectedMonth.value.split('-')
  return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const monthPickerValue = computed({
  get() {
    const fallback = selectedMonth.value || attendanceStore.selectedMonth || new Date().toISOString().slice(0, 7)
    const [year, month] = fallback.split('-')
    return { year: Number(year), month: Number(month), day: 1 }
  },
  set(value) {
    if (!value?.year || !value?.month) return
    selectedMonth.value = `${value.year}-${String(value.month).padStart(2, '0')}`
  },
})

const fetchAttendance = async () => {
  if (authStore.user?.id && selectedMonth.value) {
    await attendanceStore.getMonthlyAttendanceByShift(authStore.user.id, selectedMonth.value)
  }
}

onMounted(async () => {
  if (!authStore.isAuthenticated) { router.push('/login'); return }
  await authStore.fetchUser()
  fetchAttendance()
})

watch(selectedMonth, async (newMonth) => {
  attendanceStore.selectedMonth = newMonth
  router.replace({ query: { ...route.query, date: newMonth } })
  await fetchAttendance()
})

const s = computed(() => attendanceStore?.summary || {})

const presentRate = computed(() => {
  const w = Number(s.value.total_working_days || 0)
  const p = Number(s.value.total_present_days || 0)
  return w ? Math.round((p / w) * 100) : 0
})

const u = computed(() => authStore.user || {})

const initials = computed(() =>
  String(u.value.name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
)
</script>

<template>
  <div class="my-att">

    <!-- ── Header bar + Summary — sticky under top nav ── -->
    <div class="my-att__sticky">
    <header class="my-att__header">
      <div class="flex min-w-0 items-center gap-2.5">
        <div class="my-att__avatar">
          <img v-if="u.photo" :src="u.photo" :alt="u.name" class="h-full w-full object-cover" />
          <span v-else class="text-xs font-bold text-slate-600">{{ initials }}</span>
        </div>
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-slate-900 leading-tight">{{ u.name || '…' }}</p>
          <p class="truncate text-[10px] text-slate-400">
            {{ u.designation?.title }}<template v-if="u.designation?.title && u.department?.name"> · </template>{{ u.department?.name }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <FlexibleDatePicker
          v-model="monthPickerValue"
          :show-year="false"
          :show-month="true"
          :show-date="false"
          label="Month"
        />
        <button class="my-att__new-btn" @click="showModal = true">
          <i class="fas fa-plus text-[10px]"></i>
          <span class="hidden sm:inline">New Application</span>
        </button>
        <ApplicationMenu v-if="showModal" @close="showModal = false" />
      </div>
    </header>

    <!-- ── Summary strip ── -->
    <div class="my-att__summary">
      <!-- Month label -->
      <div class="my-att__month-label">
        <i class="far fa-calendar-alt text-slate-400 text-[10px]"></i>
        {{ formattedMonthName }}
      </div>

      <!-- Stats -->
      <div class="my-att__stats">
        <div class="my-att__stat">
          <span class="my-att__stat-val">{{ s.total_working_days || 0 }}</span>
          <span class="my-att__stat-lbl">Working</span>
        </div>
        <div class="my-att__stat-divider"></div>
        <div class="my-att__stat">
          <span class="my-att__stat-val text-emerald-700">{{ s.total_present_days || 0 }}</span>
          <span class="my-att__stat-lbl">Present</span>
        </div>
        <div class="my-att__stat-divider"></div>
        <div class="my-att__stat">
          <span class="my-att__stat-val text-rose-600">{{ s.total_absent_days || 0 }}</span>
          <span class="my-att__stat-lbl">Absent</span>
        </div>
        <div class="my-att__stat-divider"></div>
        <div class="my-att__stat">
          <span class="my-att__stat-val text-amber-600">{{ s.actual_late_day || 0 }}</span>
          <span class="my-att__stat-lbl">Late</span>
        </div>
        <div class="my-att__stat-divider"></div>
        <div class="my-att__stat">
          <span class="my-att__stat-val">{{ s.total_working_hours || '—' }}</span>
          <span class="my-att__stat-lbl">Work Hrs</span>
        </div>
        <div class="my-att__stat-divider"></div>
        <div class="my-att__stat">
          <span class="my-att__stat-val text-blue-700">{{ s.total_overtime_hours || '—' }}</span>
          <span class="my-att__stat-lbl">OT Hrs</span>
        </div>
      </div>

      <!-- Attendance rate bar -->
      <div class="my-att__rate">
        <div class="my-att__rate-bar">
          <div class="my-att__rate-fill" :style="{ width: `${Math.min(100, presentRate)}%` }"></div>
        </div>
        <span class="my-att__rate-label">{{ presentRate }}%</span>
      </div>
    </div>

    </div><!-- /my-att__sticky -->

    <!-- ── Employee meta (collapsed, secondary info) ── -->
    <details class="my-att__meta-collapse">
      <summary class="my-att__meta-toggle">
        <i class="far fa-id-card text-[10px]"></i> Employee details
        <i class="far fa-chevron-down text-[9px] ml-auto"></i>
      </summary>
      <div class="my-att__meta-grid">
        <div><span>Employee ID</span><strong>{{ u.employee_id || '—' }}</strong></div>
        <div><span>Phone</span><strong>{{ u.phone || '—' }}</strong></div>
        <div><span>Email</span><strong class="truncate">{{ u.email || '—' }}</strong></div>
        <div><span>Blood Group</span><strong>{{ u.blood || '—' }}</strong></div>
        <div><span>Joining Date</span><strong>{{ u.joining_date || '—' }}</strong></div>
        <div><span>Company</span><strong>{{ u.company?.name || '—' }}</strong></div>
      </div>
    </details>

    <!-- ── Table ── -->
    <LoaderView v-if="attendanceStore.isLoading" />
    <div v-else class="my-att__table-wrap">
      <AttendanceTable
        :logs="attendanceStore?.monthlyLogs || []"
        :applyApplication="true"
        :minimal-decorations="true"
      />
    </div>

  </div>
</template>

<style scoped>
.my-att {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: #f8fafc;
  height: calc(100dvh - 76px);
  min-height: 0;
  overflow: hidden;
}

/* Sticky section — same behavior as admin filter-panel (top-14 = 56px below nav bar) */
.my-att__sticky {
  position: relative;
  top: auto;
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: 6px;
  /* small shadow to show content scrolling underneath */
  filter: drop-shadow(0 2px 4px rgb(0 0 0 / .06));
}

/* Header */
.my-att__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 8px 12px;
  box-shadow: 0 1px 2px rgb(0 0 0 / .04);
}
.my-att__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 8px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}
.my-att__new-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 7px;
  background: #1d4ed8;
  color: white;
  font-size: 11px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: background .15s;
}
.my-att__new-btn:hover { background: #1e40af; }

/* Summary strip */
.my-att__summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 8px 12px;
  box-shadow: 0 1px 2px rgb(0 0 0 / .04);
}
.my-att__month-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: #94a3b8;
}
.my-att__stats {
  display: flex;
  align-items: center;
  gap: 0;
  flex-wrap: wrap;
}
.my-att__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 14px;
}
.my-att__stat-val {
  font-size: 17px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #0f172a;
  line-height: 1.2;
}
.my-att__stat-lbl {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: #94a3b8;
  margin-top: 1px;
}
.my-att__stat-divider {
  width: 1px;
  height: 28px;
  background: #e2e8f0;
  flex-shrink: 0;
}

/* Present rate bar */
.my-att__rate {
  display: flex;
  align-items: center;
  gap: 8px;
}
.my-att__rate-bar {
  flex: 1;
  height: 4px;
  background: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
}
.my-att__rate-fill {
  height: 100%;
  background: #334155;
  border-radius: 9999px;
  transition: width .4s ease;
}
.my-att__rate-label {
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #64748b;
  white-space: nowrap;
}

/* Employee meta collapse */
.my-att__meta-collapse {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}
.my-att__meta-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  list-style: none;
  user-select: none;
}
.my-att__meta-toggle::-webkit-details-marker { display: none; }
.my-att__meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  background: #f1f5f9;
  border-top: 1px solid #e2e8f0;
  padding: 1px;
}
.my-att__meta-grid > div {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: white;
  padding: 6px 10px;
}
.my-att__meta-grid span {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: #94a3b8;
}
.my-att__meta-grid strong {
  font-size: 11px;
  font-weight: 600;
  color: #334155;
}

/* Table wrapper */
.my-att__table-wrap {
  display: flex;
  flex: 1 1 0%;
  min-height: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgb(0 0 0 / .04);
}
/* Override AttendanceTable scroll height for this page
   (sticky header takes more vertical space here) */
.my-att__table-wrap :deep(.att-scroll) {
  flex: 1 1 0%;
  min-height: 0;
  max-height: none;
}
.my-att__table-wrap :deep(.att-wrap) {
  display: flex;
  flex: 1 1 0%;
  min-height: 0;
  height: 100%;
  flex-direction: column;
}

@media (min-width: 640px) {
  .my-att { height: calc(100dvh - 88px); padding: 12px; gap: 8px; }
  .my-att__meta-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>
