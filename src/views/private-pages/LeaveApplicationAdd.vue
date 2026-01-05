<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useAuthStore } from '@/stores/auth'
import { useHolidayStore } from '@/stores/holiday'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const leaveApplicationStore = useLeaveApplicationStore()
const authStore = useAuthStore()
const userStore = useUserStore()
const holidayStore = useHolidayStore()

const selectUser = ref('')
const { userLeaveBalance } = storeToRefs(userStore)

const form = ref({
  last_working_date: '',
  resumption_date: '',
  reason: '',
  works_in_hand: '',
  handover_user_id: '',
  leave_days: [],
})

const selectedLeaveTypes = ref([])

const loading = ref(false)
const error = ref(null)

const currentYear = new Date().getFullYear()

const toYMD = (d) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const yearStart = (year) => toYMD(new Date(year, 0, 1))
const yearEnd = (year) => toYMD(new Date(year, 11, 31))

const minLastWorkingDate = computed(() => {
  return yearStart(currentYear)
})

const maxLastWorkingDate = computed(() => {
  return yearEnd(currentYear)
})


/** leave type usage count */
const typeUsageCounts = computed(() => {
  const counts = {}
  selectedLeaveTypes.value.forEach((val) => {
    if (typeof val === 'number') {
      counts[val] = (counts[val] || 0) + 1
    }
  })
  return counts
})

const normalizedRemaining = (type) => {
  const raw = Number(type?.remaining_days)
  return Number.isFinite(raw) ? raw : Infinity
}

const exceededTypes = computed(() => {
  if (!userLeaveBalance.value?.length) return []
  return userLeaveBalance.value
    .map((type) => {
      const used = typeUsageCounts.value[type.id] || 0
      const remain = normalizedRemaining(type)
      return { id: type.id, name: type.name, used, remain }
    })
    .filter((type) => type.remain !== Infinity && type.used > type.remain)
})

const leaveLimitMessage = computed(() => {
  if (!exceededTypes.value.length) return ''
  const names = exceededTypes.value.map((t) => t.name).join(', ')
  return `You have exceeded remaining days for: ${names}`
})

/** weekends */
const weekends = computed(() => {
  return authStore?.user?.assign_weekend?.weekends || authStore?.user?.weekends || []
})

/** leave days between last_working_date and resumption_date (exclusive) */
const leaveDays = computed(() => {
  const startDateStr = form.value.last_working_date
  const endDateStr = form.value.resumption_date
  if (!startDateStr || !endDateStr) return []

  const start = new Date(startDateStr)
  const end = new Date(endDateStr)

  // must be after
  if (end <= start) return []

  const days = []
  let current = new Date(start)
  current.setDate(current.getDate() + 1)

  while (current < end) {
    days.push(toYMD(current))
    current.setDate(current.getDate() + 1)
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
  return null
})

const leaveStats = computed(() => {
  const total = leaveDays.value.length
  if (!total) return { total: 0, weekends: 0, holidays: 0, assigned: 0, pending: 0 }

  let weekendsCount = 0
  let holidaysCount = 0
  let assigned = 0

  selectedLeaveTypes.value.forEach((val) => {
    if (val === 'weekend') weekendsCount += 1
    else if (val === 'holiday') holidaysCount += 1
    else if (val) assigned += 1
  })

  const pending = Math.max(total - (weekendsCount + holidaysCount + assigned), 0)

  return { total, weekends: weekendsCount, holidays: holidaysCount, assigned, pending }
})

const getWeekdayLabel = (day) => new Date(day).toLocaleString('en-us', { weekday: 'long' })

const getLeaveTypeName = (typeId) => {
  const type = userLeaveBalance.value.find((item) => item.id === typeId)
  return type?.name || ''
}

const remainingDaysFor = (type) => {
  const base = normalizedRemaining(type)
  if (base === Infinity) return '∞'
  const used = typeUsageCounts.value[type.id] || 0
  return Math.max(base - used, 0)
}

const isTypeOptionDisabled = (type, currentSelection) => {
  const base = normalizedRemaining(type)
  if (base === Infinity) return false
  if (currentSelection === type.id) return false
  const used = typeUsageCounts.value[type.id] || 0
  return used >= base
}

onMounted(async () => {
  try {
    if (authStore?.user?.id && userStore.userLeaveBalance.length === 0) {
      await userStore.fetchUserLeaveBalances(authStore.user.id)
    }
    await userStore.fetchTypeWiseEmployees({ except: 'auth' })
  } catch (e) {
    console.error('Error while initializing leave form:', e)
  }
})

watch(
  () => authStore.user?.id,
  async (userId) => {
    if (userId && userStore.userLeaveBalance.length === 0) {
      await userStore.fetchUserLeaveBalances(userId)
    }
  }
)

watch(
  () => selectUser.value,
  (newValue) => {
    form.value.handover_user_id = newValue?.id
  }
)

/**
 * ✅ Auto tag weekend/holiday WITHOUT overwriting user manual selection
 * ✅ Avoid async in forEach
 */
watchEffect(async () => {
  if (!leaveDays.value.length || !userLeaveBalance.value.length) return

  const start = leaveDays.value[0]
  const end = leaveDays.value[leaveDays.value.length - 1]

  await holidayStore.fetchHolidays({
    company_id: authStore?.user?.company_id,
    start_date: start,
    end_date: end,
  })

  for (let index = 0; index < leaveDays.value.length; index++) {
    const day = leaveDays.value[index]

    // if user already selected something, don't override
    if (selectedLeaveTypes.value[index]) continue

    const weekdayName = new Date(day).toLocaleString('en-us', { weekday: 'long' })
    const isWeekend = weekends.value.includes(weekdayName)

    if (holidayStore.holidayDates.includes(day)) {
      selectedLeaveTypes.value[index] = 'holiday'
      continue
    }

    if (isWeekend) {
      selectedLeaveTypes.value[index] = 'weekend'
    }
  }
})

const submitLeaveApplication = async () => {
  loading.value = true
  error.value = null

  try {
    // basic date validation (extra safety)
    if (!form.value.last_working_date || !form.value.resumption_date) {
      error.value = 'Please select both Last Working Date and Resumption Date.'
      return
    }
    if (
      form.value.last_working_date < minLastWorkingDate.value ||
      form.value.last_working_date > maxLastWorkingDate.value
    ) {
      error.value = `Last Working Date must be within ${currentYear}.`
      return
    }
    if (new Date(form.value.resumption_date) <= new Date(form.value.last_working_date)) {
      error.value = 'Resumption date must be after Last Working Date.'
      return
    }

    // if exceeded leave types, block submit (optional but recommended)
    if (exceededTypes.value.length) {
      error.value = leaveLimitMessage.value
      return
    }

    const leaveDaysPayload = leaveDays.value
      .map((day, index) => ({
        date: day,
        leave_type_id:
          selectedLeaveTypes.value[index] !== 'weekend' &&
          selectedLeaveTypes.value[index] !== 'holiday'
            ? selectedLeaveTypes.value[index]
            : null,
      }))
      .filter((x) => x.leave_type_id !== null)

    const leaveDaysJson = leaveDays.value.map((day, index) => ({
      date: day,
      leave_type_id: selectedLeaveTypes.value[index] || '',
    }))

    const payload = {
      user_id: authStore?.user?.id,
      last_working_date: form.value.last_working_date,
      resumption_date: form.value.resumption_date,
      reason: form.value.reason,
      works_in_hand: form.value.works_in_hand,
      handover_user_id: form.value.handover_user_id,
      leave_days: leaveDaysPayload,
      json_data: leaveDaysJson,
    }

    const newApplication = await leaveApplicationStore.storeLeaveApplication(payload)
    if (newApplication) {
      router.push({ name: 'LeaveApplicationShow', params: { id: newApplication?.id } })
    }
  } catch (err) {
    error.value = err?.message || 'Failed to submit leave application'
  } finally {
    loading.value = false
  }
}

const goBack = () => router.go(-1)
</script>

<template>
  <div class="my-container max-w-4xl space-y-6">
    <section class="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm md:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <button class="btn-3" @click="goBack">
          <i class="far fa-arrow-left"></i>
          <span class="hidden md:flex">Back</span>
        </button>
        <div class="text-center">
          <h1 class="title-md md:title-lg">Leave Application</h1>
          <p class="text-xs text-slate-500 md:text-sm">
            Pick your dates, assign leave types, and tell us who is covering while you’re away.
          </p>
        </div>
        <RouterLink to="/applications" class="btn-2">Home</RouterLink>
      </div>
    </section>

    <LoaderView v-if="loading" />

    <form
      v-else
      @submit.prevent="submitLeaveApplication"
      class="relative space-y-6 rounded-2xl border border-slate-200 bg-white/80 p-4 pb-24 shadow-lg md:p-8 md:pb-28"
    >
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label for="last-working-date" class="block text-sm font-medium text-slate-600">
            Last Working Date
          </label>
          <input
            type="date"
            id="last-working-date"
            v-model="form.last_working_date"
            class="input-1 mt-1 w-full"
            required
            :min="minLastWorkingDate"
          />
          
        </div>
        <div>
          <label for="resumption-date" class="block text-sm font-medium text-slate-600">
            Resumption Date
          </label>
          <input
            type="date"
            id="resumption-date"
            v-model="form.resumption_date"
            class="input-1 mt-1 w-full"
            required
            :min="form.last_working_date"
          />
        </div>
      </div>

      <div
        v-if="form.last_working_date && form.resumption_date && leaveDaysMessage"
        class="rounded-lg bg-blue-50 p-3 text-sm text-blue-700"
      >
        {{ leaveDaysMessage }}
      </div>

      <div
        v-if="leaveStats.total"
        class="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div class="rounded-lg bg-white p-3 shadow-sm">
          <p class="text-xs uppercase text-slate-400">Total Days</p>
          <p class="text-2xl font-semibold text-slate-800">{{ leaveStats.total }}</p>
        </div>
        <div class="rounded-lg bg-white p-3 shadow-sm">
          <p class="text-xs uppercase text-slate-400">Assigned</p>
          <p class="text-xl font-semibold text-slate-800">{{ leaveStats.assigned }}</p>
        </div>
        <div class="rounded-lg bg-white p-3 shadow-sm">
          <p class="text-xs uppercase text-slate-400">Weekend / Holiday</p>
          <p class="text-xl font-semibold text-slate-800">
            {{ leaveStats.weekends + leaveStats.holidays }}
          </p>
        </div>
        <div class="rounded-lg bg-white p-3 shadow-sm">
          <p class="text-xs uppercase text-slate-400">Still Unassigned</p>
          <p class="text-xl font-semibold text-amber-600">{{ leaveStats.pending }}</p>
        </div>
      </div>

      <div
        v-if="leaveLimitMessage"
        class="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-amber-800 shadow-sm"
      >
        <i class="fas fa-info-circle mt-1 text-amber-500"></i>
        <p class="text-sm">{{ leaveLimitMessage }}</p>
      </div>

      <div v-if="leaveDays.length" class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-lg font-semibold text-slate-700">Leave Days</h2>
          <p class="text-xs text-slate-500">Tap a badge to classify each date</p>
        </div>

        <div class="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
          <div
            v-for="(day, index) in leaveDays"
            :key="index"
            class="rounded-2xl border border-slate-100 bg-white px-3 py-2 shadow-sm transition hover:border-blue-200 hover:shadow-md"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="font-semibold text-slate-900">
                  {{ day }} ({{ getWeekdayLabel(day) }})
                </p>
              </div>

              <span
                v-if="selectedLeaveTypes[index]"
                class="inline-flex items-center rounded-full px-3 text-xs font-semibold"
                :class="{
                  'bg-amber-50 text-amber-700': selectedLeaveTypes[index] === 'weekend',
                  'bg-emerald-50 text-emerald-700': selectedLeaveTypes[index] === 'holiday',
                  'bg-blue-50 text-blue-700':
                    selectedLeaveTypes[index] !== 'weekend' && selectedLeaveTypes[index] !== 'holiday',
                }"
              >
                {{
                  selectedLeaveTypes[index] === 'weekend'
                    ? 'Weekend'
                    : selectedLeaveTypes[index] === 'holiday'
                    ? 'Holiday'
                    : getLeaveTypeName(selectedLeaveTypes[index])
                }}
              </span>
            </div>

            <div class="mt-1 flex flex-wrap gap-2">
              <label
                v-for="type in userLeaveBalance"
                :key="type.id"
                class="cursor-pointer rounded-full border px-3 py-1 text-sm font-medium transition"
                :class="[
                  selectedLeaveTypes[index] === type.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600',
                  isTypeOptionDisabled(type, selectedLeaveTypes[index])
                    ? 'cursor-not-allowed opacity-40'
                    : '',
                ]"
              >
                <input
                  type="radio"
                  class="sr-only"
                  :name="'leaveType-' + index"
                  :value="type.id"
                  v-model="selectedLeaveTypes[index]"
                  :disabled="isTypeOptionDisabled(type, selectedLeaveTypes[index])"
                />
                <span>{{ type.name }} ({{ remainingDaysFor(type) }})</span>
              </label>

              <label
                class="cursor-pointer rounded-full px-3 py-1 text-sm font-medium transition"
                :class="
                  selectedLeaveTypes[index] === 'weekend'
                    ? 'border-amber-400 bg-amber-50 text-amber-700'
                    : 'border-slate-200 text-slate-600 hover:border-amber-200 hover:text-amber-700'
                "
              >
                <input
                  type="radio"
                  class="sr-only"
                  :name="'leaveType-' + index"
                  value="weekend"
                  v-model="selectedLeaveTypes[index]"
                />
                Weekend
              </label>

              <label
                class="cursor-pointer rounded-full px-3 py-1 text-sm font-medium transition"
                :class="
                  selectedLeaveTypes[index] === 'holiday'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-700'
                "
              >
                <input
                  type="radio"
                  class="sr-only"
                  :name="'leaveType-' + index"
                  value="holiday"
                  v-model="selectedLeaveTypes[index]"
                />
                Holiday
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-1">
        <label for="reason" class="text-sm font-medium text-slate-600">Reason</label>
        <textarea
          id="reason"
          v-model="form.reason"
          class="input-1 w-full"
          placeholder="Let approvers know why you need the time off"
          rows="3"
        />
      </div>

      <div class="space-y-1">
        <label for="handover-user" class="text-sm font-medium text-slate-600">Handover User</label>
        <MultiselectDropdown
          v-model="selectUser"
          :options="userStore.users"
          :multiple="false"
          label="label"
          placeholder="Search teammate"
          class="z-50"
          top-label="User"
        />
      </div>

      <div class="space-y-1">
        <label for="works-in-hand" class="text-sm font-medium text-slate-600">Works in Hand</label>
        <textarea
          id="works-in-hand"
          v-model="form.works_in_hand"
          class="input-1 w-full"
          placeholder="Share current deliverables so the team has context"
          rows="6"
        />
      </div>

      <div
        v-if="error"
        class="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm"
      >
        <div class="flex-shrink-0">
          <i class="fas fa-exclamation-triangle text-red-500"></i>
        </div>
        <div class="flex-1 text-sm leading-5">
          <p class="font-medium">Something went wrong!</p>
          <p class="mt-0.5">{{ error }}</p>
        </div>
      </div>

      <div
        class="sticky inset-x-0 bottom-0 -mx-4 flex justify-end border-t border-slate-100 bg-white/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:-mx-8 md:px-8"
      >
        <button type="submit" class="btn-2 inline-flex items-center gap-2 shadow-md">
          <i class="far fa-paper-plane"></i>
          Submit Application
        </button>
      </div>
    </form>
  </div>
</template>
