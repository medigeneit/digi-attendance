<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import TimePickerAsFloatHour from '@/components/common/TimePickerAsFloatHour.vue'
import TodoItemCard from '@/components/todo/TodoItemCard.vue'
import { getDisplayDate } from '@/libs/datetime'
import { useAttendanceStore } from '@/stores/attendance'
import { useAuthStore } from '@/stores/auth'
import { useDepartmentStore } from '@/stores/department'
import { useOvertimeStore } from '@/stores/overtime'
import { useTodoDateStore } from '@/stores/useTodoDateStore'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const departmentStore = useDepartmentStore()
const overtimeStore = useOvertimeStore()
const attendanceStore = useAttendanceStore()
const authStore = useAuthStore()
const todoDateStore = useTodoDateStore()

const loading = ref(false)
const attendanceLog = ref({})

const HOUR_MIN = 1
const HOUR_MAX = 24

const form = ref({
  date: '', // will be prefixed from route.query
  duty_type: '',
  request_overtime_hours: '',
  assigned_in_charge_user_id: '',
  work_details: '',
})

/* ---------------- helpers ---------------- */
const qClean = (v) => (typeof v === 'string' ? v.replace(/\+/g, ' ').trim() : '')
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

// "14h 14m", "14h", "14m", "14:14", "14.25" -> float hours
const parseFloatHours = (raw) => {
  const s = qClean(raw)
  if (!s) return null

  // 1) 14h 14m / 14h / 14m
  const h = s.match(/(\d+)\s*h/i)
  const m = s.match(/(\d+)\s*m/i)
  if (h || m) {
    const hh = h ? parseInt(h[1], 10) : 0
    const mm = m ? parseInt(m[1], 10) : 0
    return hh + mm / 60
  }

  // 2) 14:14
  if (/^\d{1,2}:\d{1,2}$/.test(s)) {
    const [hh, mm] = s.split(':').map((x) => parseInt(x, 10))
    if (Number.isFinite(hh) && Number.isFinite(mm)) return hh + mm / 60
  }

  // 3) 14.25
  const n = Number(s)
  if (Number.isFinite(n)) return n

  return null
}

// "03:47 PM" | "2025-08-04 07:00 PM" -> minutes since midnight
const parse12hToMinutes = (raw) => {
  const s = qClean(raw)
  if (!s) return null

  // tolerate optional date prefix
  const parts = s.split(/\s+/)
  const timeToken = parts.length >= 2 ? `${parts[parts.length - 2]} ${parts[parts.length - 1]}` : s

  const m = timeToken.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i)
  if (!m) return null
  let hh = parseInt(m[1], 10)
  const mm = parseInt(m[2], 10)
  const ampm = m[3].toUpperCase()
  if (ampm === 'PM' && hh !== 12) hh += 12
  if (ampm === 'AM' && hh === 12) hh = 0
  return hh * 60 + mm
}

// If request_overtime_hours missing/invalid, compute from start/end (wrap across midnight if needed)
const deriveHoursFromTimes = (startRaw, endRaw) => {
  const sm = parse12hToMinutes(startRaw)
  const em = parse12hToMinutes(endRaw)
  if (sm == null || em == null) return null
  let diff = em - sm
  if (diff < 0) diff += 24 * 60 // crossed midnight
  return diff / 60
}

const getMonthFromDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/* ---------------- data fetchers ---------------- */
const fetchAttendance = async () => {
  if (!form.value.date) return
  const userId = authStore.user?.id
  if (!userId) return

  const month = getMonthFromDate(form.value.date)
  loading.value = true
  try {
    await attendanceStore.getMonthlyAttendanceByShift(userId, month)
    attendanceLog.value = await attendanceStore.getUserDailyLogsByDate(userId, form.value.date)
  } finally {
    loading.value = false
  }

  /** Fetch todo on that date for */
  try {
    await todoDateStore.fetchMyTodoDates({
      'start-date': form.value.date,
      'end-date': form.value.date,
    })
  } catch (err) {
    console.error(err.response?.date?.message)
  }
}

/* ---------------- route prefill ---------------- */
const prefillFromQuery = async () => {
  const q = route.query || {}
  const qDate = qClean(q.date)
  const qStart = qClean(q.start_time)
  const qEnd = qClean(q.end_time)
  const qReq = qClean(q.request_overtime_hours)

  // Date
  if (qDate) {
    form.value.date = qDate
    await fetchAttendance()
  }

  // Hours
  let hours = parseFloatHours(qReq)
  if (hours == null && (qStart || qEnd)) {
    hours = deriveHoursFromTimes(qStart, qEnd)
  }
  if (Number.isFinite(hours)) {
    form.value.request_overtime_hours = clamp(Math.round(hours * 100) / 100, HOUR_MIN, HOUR_MAX)
  }
}

/* ---------------- actions ---------------- */
const goBack = () => {
  router.go(-1)
}

const submit = async () => {
  await overtimeStore.createOvertime(form.value)
  router.push({ name: 'MyOvertimeList' })
}

/* ---------------- lifecycle ---------------- */
onMounted(async () => {
  if (!authStore.user?.id) {
    await authStore.fetchUser()
  }

  // Prefill from route
  await prefillFromQuery()

  // If date still not set but query had date, set & fetch (safety)
  if (!form.value.date && route.query?.date) {
    form.value.date = qClean(route.query.date)
    await fetchAttendance()
  }

  await departmentStore.fetchDepartments('all')
})

// React if query changes in-place (no remount)
watch(
  () => route.query,
  async () => {
    await prefillFromQuery()
  },
  { deep: true },
)
</script>

<template>
  <div class="max-w-xl mx-auto p-4 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Overtime Request Form</h1>
    </div>

    <div v-if="loading" class="text-center">
      <LoaderView />
    </div>

    <form v-else @submit.prevent="submit" class="space-y-4 card-bg md:p-8 p-4 text-sm md:text-base">
      <div class="grid grid-cols-2 gap-2 md:gap-4">
        <div>
          <label for="date" class="block text-sm font-medium">Date</label>
          <input
            @change="fetchAttendance"
            type="date"
            id="date"
            v-model="form.date"
            class="input-1 w-full"
            required
            :max="new Date(Date.now() - 86400000).toISOString().split('T')[0]"
          />
        </div>

        <div>
          <label for="duty_type" class="block text-sm font-medium">Duty Type</label>
          <select id="duty_type" v-model="form.duty_type" class="input-1 w-full" required>
            <option value="" selected disabled>--Duty Type--</option>
            <option value="WL">WL</option>
            <option value="HD">HD</option>
            <option value="OVT">OVT</option>
          </select>
        </div>

        <div>
          <span class="block text-sm font-medium">Check In</span>
          <div class="input-1 w-full text-center px-1 bg-gray-300">
            {{ attendanceLog.entry_time || '--:--' }}
          </div>
        </div>

        <div>
          <span class="block text-sm font-medium">Check Out</span>
          <div class="input-1 w-full text-center px-1 bg-gray-300">
            {{ attendanceLog.exit_time || '--:--' }}
          </div>
        </div>

        <div>
          <span class="block text-sm font-medium">Working Hour</span>
          <div class="input-1 w-full text-center px-1 bg-gray-300">
            {{ attendanceLog.working_hours || '-' }}
          </div>
        </div>

        <div>
          <label for="request_overtime_hours" class="block text-sm font-medium">
            Request Overtime
          </label>
          <div class="flex items-center">
            <TimePickerAsFloatHour
              v-model="form.request_overtime_hours"
              :minute-interval="5"
              :required="true"
              :hour-min="1"
              :hour-max="24"
            />
          </div>
        </div>

        <div class="col-span-full">
          <label for="assigned_in_charge_user_id" class="block text-sm font-medium">
            In-Charge
          </label>
          <select
            id="assigned_in_charge_user_id"
            v-model="form.assigned_in_charge_user_id"
            class="input-1 w-full"
            required
          >
            <option value="" selected disabled>--In-Charge--</option>
            <template v-for="department in departmentStore.departments" :key="department.id">
              <optgroup v-if="department.in_charge" :label="department.name">
                <option :value="department.in_charge.id">{{ department.in_charge.name }}</option>
              </optgroup>
            </template>
          </select>
        </div>
      </div>

      <div>
        <label for="assigned_in_charge_user_id" class="block text-sm font-medium">
          Details (Reason / Work description)
        </label>
        <textarea rows="6" v-model="form.work_details" class="input-1 w-full" required></textarea>
      </div>

      <div v-if="todoDateStore.todo_dates?.length && form.date">
        <h4 class="text-gray-700 mb-2 border-b">
          Todos on
          <span class="font-semibold text-sky-800 ml-2">
            <i class="fas fa-calendar-day"></i>
            <span class="ml-1">
              {{ getDisplayDate(form.date, { weekDay: 'long' }) }}
            </span>
          </span>
        </h4>

        <div class="max-h-[150px] overflow-y-auto">
          <TodoItemCard
            v-for="todoDate in todoDateStore.todo_dates"
            :key="todoDate.id"
            :todo-date="todoDate"
            hide-department
            hide-user
            hide-btns
          />
        </div>
        <!-- {{ todoDateStore.todo_dates }} -->
      </div>

      <hr />

      <div v-if="overtimeStore.error" class="text-red-500 text-sm">{{ overtimeStore.error }}</div>

      <div class="flex justify-center">
        <button type="submit" class="btn-2">Submit</button>
      </div>
    </form>
  </div>
</template>
