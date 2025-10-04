<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useAuthStore } from '@/stores/auth'
import { useHolidayStore } from '@/stores/holiday'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useLeaveTypeStore } from '@/stores/leave-type'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/* ---------------- stores ---------------- */
const authStore = useAuthStore()
const leaveApplicationStore = useLeaveApplicationStore()
const leaveTypeStore = useLeaveTypeStore()
const userStore = useUserStore()
const holidayStore = useHolidayStore()

/* ---------------- router ---------------- */
const router = useRouter()
const route = useRoute()

/* --------------- refs/state ------------- */
const { userLeaveBalance } = storeToRefs(userStore)
const leaveApplication = computed(() => leaveApplicationStore.leaveApplication)
const leaveApplicationId = computed(() => route.params.id)

const selectUser = ref(null)
const form = ref({
  user_id: '',
  last_working_date: '',
  resumption_date: '',
  reason: '',
  works_in_hand: '',
  handover_user_id: '',
})

/**
 * date-keyed selections:
 * e.g. selectedLeaveTypes['2025-10-05'] = 12 | 'weekend' | 'holiday'
 */
const selectedLeaveTypes = ref({}) // Record<YYYY-MM-DD, number | 'weekend' | 'holiday'>

const loading = ref(false)
const error = ref(null)
const isEditMode = ref(false)

/* ---------------- helpers ---------------- */
const weekends = computed(() => {
  return (
    leaveApplicationStore?.leaveApplication?.user?.assign_weekend?.weekends ||
    leaveApplicationStore?.leaveApplication?.user?.weekends || []
  )
})

const toYMD = (d) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Days between (exclusive of Last Working Date, exclusive of Resumption date’s day) */
const leaveDays = computed(() => {
  const startDateStr = form.value.last_working_date
  const endDateStr = form.value.resumption_date
  if (!startDateStr || !endDateStr) return []

  const start = new Date(startDateStr)
  const end = new Date(endDateStr)
  if (end <= start) return []

  const days = []
  const cur = new Date(start)
  cur.setDate(cur.getDate() + 1)
  while (cur < end) {
    days.push(toYMD(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
})

const leaveDaysMessage = computed(() => {
  const startDateStr = form.value.last_working_date
  const endDateStr = form.value.resumption_date
  if (!startDateStr || !endDateStr) return ''
  const start = new Date(startDateStr)
  const end = new Date(endDateStr)
  if (end <= start) return 'Resumption date must be after Last Working Date.'
  if (leaveDays.value.length === 0) return 'No leave days between the selected dates.'
  return `Total leave days: ${leaveDays.value.length}`
})

/** quick checks */
const isWeekendDate = (day) => {
  const weekdayName = new Date(day).toLocaleString('en-us', { weekday: 'long' }).toLowerCase()
  const cap = weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1)
  return weekends.value.includes(cap)
}
const isHolidayDate = (day) => {
  return (holidayStore?.holidayDates || []).includes(day)
}


/** count usage per numeric type id */
const typeUsageCounts = computed(() => {
  const counts = {}
  for (const [date, val] of Object.entries(selectedLeaveTypes.value || {})) {
    if (typeof val === 'number') {
      counts[val] = (counts[val] || 0) + 1
    }
  }
  return counts
})

/** exceeded types list (to show soft warning) */
const exceededTypes = computed(() => {
  const list = userLeaveBalance.value || []
  const over = []
  for (const t of list) {
    const used = typeUsageCounts.value[t.id] || 0
    if (Number.isFinite(t.remaining_days) && used > t.remaining_days) {
      over.push({ id: t.id, name: t.leave_type || t.name, used, remain: t.remaining_days })
    }
  }
  return over
})

const recalcSelectionsFromRange = () => {
  const old = { ...(selectedLeaveTypes.value || {}) }
  const next = {}

  for (const day of leaveDays.value) {
    if (isWeekendDate(day)) {
      next[day] = 'weekend'
      continue
    }
    if (isHolidayDate(day)) {
      next[day] = 'holiday'
      continue
    }
    const prev = old[day]
    if (typeof prev === 'number') {
      next[day] = prev
      continue
    }
  }

  selectedLeaveTypes.value = next
}

/** fetch holidays for range (company scope) */
const fetchRangeHolidays = async () => {
  const days = leaveDays.value
  if (!days.length) return
  await holidayStore.fetchHolidays({
    company_id: authStore?.user?.company_id,
    start_date: days[0],
    end_date: days[days.length - 1],
  })
}

/* --------------- lifecycle: mounted --------------- */
onMounted(async () => {
  loading.value = true
  try {
    const { id } = route.params
    isEditMode.value = !!id

    // 1) fetch application
    await leaveApplicationStore.fetchLeaveApplicationById(id)
    const application = leaveApplicationStore.leaveApplication
    const user = application?.user
    if (!application || !user) return

    // 2) leave types by company
    const companyId = user?.company?.id
    if (companyId) await leaveTypeStore.fetchLeaveTypes(companyId)

    // 3) user leave balances (edit-mode aware)
    if (application.user_id) {
      await userStore.fetchUserLeaveBalances(application.user_id, {
        applicationId: leaveApplicationId.value,
      })
    }

    // 4) type-wise employees (handover list)
    await userStore.fetchTypeWiseEmployees({
      type: user.type,
      except: [user.id],
    })
    userStore.users = userStore.users.map((_u) => ({ ..._u, label: _u.name }))

    // preselect handover user
    if (userStore.users?.length) {
      const selected = userStore.users.find((u) => u.id === application.handover_user_id)
      if (selected) selectUser.value = selected
    }

    // 5) form fill
    form.value = {
      user_id: application.user_id,
      last_working_date: application.last_working_date,
      resumption_date: application.resumption_date,
      reason: application.reason,
      works_in_hand: application.works_in_hand,
      handover_user_id: application.handover_user_id,
    }

    // 6) seed selections from saved json_data (date-keyed)
    const seed = {}
    if (Array.isArray(application.json_data)) {
      for (const it of application.json_data) {
        const d = it?.date
        const lt = it?.leave_type_id
        if (!d) continue
        if (lt === 'weekend' || lt === 'holiday') seed[d] = lt
        else if (lt != null && lt !== '' && !Number.isNaN(Number(lt))) {
          seed[d] = Number(lt)
        }
      }
    }
    selectedLeaveTypes.value = seed

    // 7) fetch holidays & final recalc (will also auto-CL new working days)
    await fetchRangeHolidays()
    recalcSelectionsFromRange()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

/* ---------- reactive effects ---------- */
/** whenever date range changes -> fetch holidays then recalc */
watch(
  () => [form.value.last_working_date, form.value.resumption_date],
  async () => {
    await fetchRangeHolidays()
    recalcSelectionsFromRange()
  }
)

/** weekends / holidays change -> recalc (keeps previous working-day selections) */
watch(
  () => [weekends.value, holidayStore.holidayDates],
  () => {
    recalcSelectionsFromRange()
  },
  { deep: true }
)

/** keep handover id in sync with dropdown object */
watch(
  () => selectUser.value,
  (v) => {
    form.value.handover_user_id = v?.id || null
  }
)

/* --------------- submit/update --------------- */
const submitLeaveApplication = async () => {
  loading.value = true
  error.value = null
  try {
    // Build arrays from date-keyed selections
    const allDays = leaveDays.value
    const leaveDaysPayload = []
    const leaveDaysJson = []

    for (const day of allDays) {
      const sel = selectedLeaveTypes.value[day]
      // payload for save (null for weekend/holiday so it doesn't consume balance)
      const numericId =
        sel !== 'weekend' && sel !== 'holiday' && sel != null ? Number(sel) : null

      if (numericId != null) {
        leaveDaysPayload.push({ date: day, leave_type_id: numericId })
      }

      leaveDaysJson.push({
        date: day,
        leave_type_id: sel == null ? '' : sel, // keep weekend/holiday strings for UI
      })
    }

    const payload = {
      id: leaveApplicationId.value,
      user_id: leaveApplication?.value?.user_id,
      last_working_date: form.value.last_working_date,
      resumption_date: form.value.resumption_date,
      reason: form.value.reason,
      works_in_hand: form.value.works_in_hand,
      handover_user_id: form.value.handover_user_id,
      leave_days: leaveDaysPayload,
      json_data: leaveDaysJson,
    }

    if (payload.id) {
      const updated = await leaveApplicationStore.updateLeaveApplication(payload.id, payload)
      if (updated) {
        router.push({ name: 'LeaveApplicationShow', params: { id: updated?.id } })
      }
    }
  } catch (err) {
    error.value = err?.message || 'Failed to submit leave application'
  } finally {
    loading.value = false
  }
}

/* --------------- misc --------------- */
const goBack = () => router.go(-1)
</script>

<template>
  <div class="my-container max-w-3xl space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg flex-wrap text-center">Leave Application Edit Form</h1>
      <div>
        <RouterLink to="/applications" class="btn-2">Home</RouterLink>
      </div>
    </div>

    <LoaderView v-if="loading" />

    <form v-else @submit.prevent="submitLeaveApplication" class="space-y-4 card-bg p-4 md:p-8">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="last-working-date" class="block text-sm font-medium">Last Working Date</label>
          <input
            type="date"
            id="last-working-date"
            v-model="form.last_working_date"
            class="input-1 w-full"
            required
          />
        </div>

        <div>
          <label for="resumption-date" class="block text-sm font-medium">Resumption Date</label>
          <input
            type="date"
            id="resumption-date"
            v-model="form.resumption_date"
            class="input-1 w-full"
            required
          />
        </div>
      </div>

      <div v-if="form.last_working_date && form.resumption_date">
        <p class="text-blue-600 font-medium">{{ leaveDaysMessage }}</p>
      </div>

      <!-- Leave days (date-keyed radios) -->
      <div v-if="leaveDays.length" class="bg-gray-100 p-2 rounded-md">
        <h2 class="text-lg font-semibold">Leave Days</h2>

        <div v-for="(day, idx) in leaveDays" :key="day" class="flex gap-4 mb-2 bg-white p-2 rounded-md">
          <div class="font-semibold w-32 shrink-0">{{ day }}</div>

          <div class="flex flex-wrap gap-3">
            <!-- numeric leave types -->
            <label
              v-for="type in userLeaveBalance"
              :key="type.id"
              class="flex items-center space-x-1"
            >
              <input
                type="radio"
                :name="'leaveType-' + day"
                :value="type.id"
                v-model="selectedLeaveTypes[day]"
                :disabled="(typeUsageCounts[type.id] >= (type.remaining_days ?? Infinity)) && selectedLeaveTypes[day] !== type.id"
              />
              <span>{{ type.leave_type }}</span>
            </label>

            <!-- weekend -->
            <label class="flex items-center space-x-1">
              <input
                type="radio"
                :name="'leaveType-' + day"
                value="weekend"
                v-model="selectedLeaveTypes[day]"
              />
              <span>Weekend</span>
            </label>

            <!-- holiday -->
            <label class="flex items-center space-x-1">
              <input
                type="radio"
                :name="'leaveType-' + day"
                value="holiday"
                v-model="selectedLeaveTypes[day]"
              />
              <span>Holiday</span>
            </label>
          </div>
        </div>

        <!-- soft warning if anything exceeded -->
        <p v-if="exceededTypes.length" class="text-red-600 text-sm font-medium mt-2">
          You have exceeded remaining days for:
          {{ exceededTypes.map(t => `${t.name} (used ${t.used}/${t.remain})`).join(', ') }}
        </p>
      </div>

      <div>
        <label for="reason" class="block text-sm font-medium">Reason</label>
        <textarea
          id="reason"
          v-model="form.reason"
          class="input-1 w-full"
          placeholder="Enter your reason for leave"
        ></textarea>
      </div>

      <div>
        <label for="handover-user" class="block text-sm font-medium">Handover User</label>
        <MultiselectDropdown
          v-model="selectUser"
          :options="userStore.users"
          :multiple="false"
          label="label"
          placeholder="Select user"
        />
      </div>

      <div>
        <label for="works-in-hand" class="block text-sm font-medium">Works in Hand</label>
        <textarea
          id="works-in-hand"
          v-model="form.works_in_hand"
          class="input-1 w-full"
          placeholder="Enter details of works in hand"
          rows="6"
        ></textarea>
      </div>

      <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>

      <div class="flex justify-end">
        <button type="submit" class="btn-1">Update</button>
      </div>
    </form>
  </div>
</template>
