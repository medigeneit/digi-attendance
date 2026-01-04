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
 * selectedLeaveTypes['2025-10-05'] = 12 | 'weekend' | 'holiday'
 * ✅ এডিট ডাটাই truth; কোনো অটো-ডিফল্ট বসবে না
 */
const selectedLeaveTypes = ref({}) // Record<YYYY-MM-DD, number | 'weekend' | 'holiday'>

const loading = ref(false)
const error = ref(null)
const isEditMode = ref(false)

/* ---------------- helpers ---------------- */
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
  return null
})

const leaveStats = computed(() => {
  const total = leaveDays.value.length
  if (!total) {
    return { total: 0, weekends: 0, holidays: 0, assigned: 0, pending: 0 }
  }

  let weekends = 0
  let holidays = 0
  let assigned = 0
  leaveDays.value.forEach((day) => {
    const val = selectedLeaveTypes.value?.[day]
    if (val === 'weekend') weekends += 1
    else if (val === 'holiday') holidays += 1
    else if (val) assigned += 1
  })

  const pending = Math.max(total - (weekends + holidays + assigned), 0)
  return { total, weekends, holidays, assigned, pending }
})

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

/** exceeded types list (soft warning) */
const normalizedRemaining = (type) => {
  const raw = Number(type?.remaining_days)
  return Number.isFinite(raw) ? raw : Infinity
}

const exceededTypes = computed(() => {
  const list = userLeaveBalance.value || []
  const over = []
  for (const t of list) {
    const used = typeUsageCounts.value[t.id] || 0
    const remain = normalizedRemaining(t)
    if (remain !== Infinity && used > remain) {
      over.push({ id: t.id, name: t.leave_type || t.name, used, remain })
    }
  }
  return over
})

const leaveLimitMessage = computed(() => {
  if (!exceededTypes.value.length) return ''
  const first = exceededTypes.value[0]
  return `You requested ${first.used} ${first.name} day(s) but only ${first.remain} remaining.`
})

const getWeekdayLabel = (day) => {
  return new Date(day).toLocaleString('en-us', { weekday: 'long' })
}

const getLeaveTypeName = (typeId) => {
  const type = userLeaveBalance.value?.find((item) => item.id === typeId)
  return type?.name || type?.leave_type || ''
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

/** ✅ Range change হলে শুধু পুরোনো সিলেকশনগুলো রাখি; নতুন দিন -> খালি */
const alignSelectionsToRange = () => {
  const current = selectedLeaveTypes.value || {}
  const next = {}
  for (const day of leaveDays.value) {
    if (Object.prototype.hasOwnProperty.call(current, day)) {
      next[day] = current[day]
    }
  }
  selectedLeaveTypes.value = next
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

    // 4) handover dropdown
    await userStore.fetchTypeWiseEmployees({
      type: user.type,
      except: [user.id],
    })
    userStore.users = userStore.users.map((_u) => ({ ..._u, label: _u.name }))
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

    // 6) ✅ seed from saved json_data ONLY (no auto weekend/holiday/defaults)
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

    // 7) ✅ শুধু রেঞ্জ অনুযায়ী align — কোনো অটো-ফিল নয়
    alignSelectionsToRange()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

/* ---------- reactive effects ---------- */
/** date range change -> শুধু align (no auto weekend/holiday) */
watch(
  () => [form.value.last_working_date, form.value.resumption_date],
  () => {
    alignSelectionsToRange()
  }
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
    // Build arrays from date-keyed selections (only current range)
    const allDays = leaveDays.value
    const leaveDaysPayload = []
    const leaveDaysJson = []

    for (const day of allDays) {
      const sel = selectedLeaveTypes.value[day]
      // payload for save (null/empty for non-numeric so it doesn't consume balance)
      const numericId =
        sel !== 'weekend' && sel !== 'holiday' && sel != null ? Number(sel) : null

      if (numericId != null) {
        leaveDaysPayload.push({ date: day, leave_type_id: numericId })
      }

      // ✅ json_data exactly as edited (empty string if unset)
      leaveDaysJson.push({
        date: day,
        leave_type_id: sel == null ? '' : sel,
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
      leave_days: leaveDaysPayload, // numeric only
      json_data: leaveDaysJson,     // as edited (can include 'weekend'/'holiday'/'')
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
  <div class="my-container max-w-4xl space-y-6">
    <section class="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm md:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <button class="btn-3" @click="goBack">
          <i class="far fa-arrow-left"></i>
          <span class="hidden md:flex">Back</span>
        </button>
        <div class="text-center">
          <h1 class="title-md md:title-lg">Update Leave Plan</h1>
          <p class="text-xs text-slate-500 md:text-sm">
            Adjust your dates, reassign types, and keep approvers in the loop.
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
          <label for="last-working-date" class="block text-sm font-medium text-slate-600">Last Working Date</label>
          <input
            type="date"
            id="last-working-date"
            v-model="form.last_working_date"
            class="input-1 mt-1 w-full"
            required
          />
        </div>

        <div>
          <label for="resumption-date" class="block text-sm font-medium text-slate-600">Resumption Date</label>
          <input
            type="date"
            id="resumption-date"
            v-model="form.resumption_date"
            class="input-1 mt-1 w-full"
            required
          />
        </div>
      </div>

      <div v-if="form.last_working_date && form.resumption_date && leaveDaysMessage" class="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
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
          <p class="text-xs text-slate-500">Leave types selected</p>
        </div>
        <div class="rounded-lg bg-white p-3 shadow-sm">
          <p class="text-xs uppercase text-slate-400">Weekend / Holiday</p>
          <p class="text-xl font-semibold text-slate-800">{{ leaveStats.weekends + leaveStats.holidays }}</p>
          <p class="text-xs text-slate-500">Auto-excluded</p>
        </div>
        <div class="rounded-lg bg-white p-3 shadow-sm">
          <p class="text-xs uppercase text-slate-400">Still Unassigned</p>
          <p class="text-xl font-semibold text-amber-600">{{ leaveStats.pending }}</p>
          <p class="text-xs text-slate-500">Select a leave type below</p>
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
            v-for="day in leaveDays"
            :key="day"
            class="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="font-semibold text-slate-900">{{ day }} ({{ getWeekdayLabel(day) }})</p>
              </div>
              <span
                v-if="selectedLeaveTypes[day]"
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                :class="{
                  'bg-amber-50 text-amber-700': selectedLeaveTypes[day] === 'weekend',
                  'bg-emerald-50 text-emerald-700': selectedLeaveTypes[day] === 'holiday',
                  'bg-blue-50 text-blue-700': selectedLeaveTypes[day] !== 'weekend' && selectedLeaveTypes[day] !== 'holiday',
                }"
              >
                {{
                  selectedLeaveTypes[day] === 'weekend'
                    ? 'Weekend'
                    : selectedLeaveTypes[day] === 'holiday'
                    ? 'Holiday'
                    : getLeaveTypeName(selectedLeaveTypes[day])
                }}
              </span>
            </div>

            <div class="mt-3 flex flex-wrap gap-2">
              <label
                v-for="type in userLeaveBalance"
                :key="type.id"
                class="cursor-pointer rounded-full border px-3 py-1 text-sm font-medium transition"
                :class="[
                  selectedLeaveTypes[day] === type.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600',
                  isTypeOptionDisabled(type, selectedLeaveTypes[day])
                    ? 'cursor-not-allowed opacity-40'
                    : '',
                ]"
              >
                <input
                  type="radio"
                  class="sr-only"
                  :name="'leaveType-' + day"
                  :value="type.id"
                  v-model="selectedLeaveTypes[day]"
                  :disabled="isTypeOptionDisabled(type, selectedLeaveTypes[day])"
                />
                <span>{{ type.name }} ({{ remainingDaysFor(type) }})</span>
              </label>

              <label
                class="cursor-pointer rounded-full px-3 py-1 text-sm font-medium transition"
                :class="selectedLeaveTypes[day] === 'weekend'
                  ? 'border-amber-400 bg-amber-50 text-amber-700'
                  : 'border-slate-200 text-slate-600 hover:border-amber-200 hover:text-amber-700'"
              >
                <input
                  type="radio"
                  class="sr-only"
                  :name="'leaveType-' + day"
                  value="weekend"
                  v-model="selectedLeaveTypes[day]"
                />
                Weekend
              </label>

              <label
                class="cursor-pointer rounded-full px-3 py-1 text-sm font-medium transition"
                :class="selectedLeaveTypes[day] === 'holiday'
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-700'"
              >
                <input
                  type="radio"
                  class="sr-only"
                  :name="'leaveType-' + day"
                  value="holiday"
                  v-model="selectedLeaveTypes[day]"
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
        ></textarea>
      </div>

      <div class="space-y-1">
        <label for="handover-user" class="text-sm font-medium text-slate-600">Handover User</label>
        <MultiselectDropdown
          v-model="selectUser"
          :options="userStore.users"
          :multiple="false"
          label="label"
          placeholder="Search teammate"
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
        ></textarea>
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
          <i class="far fa-save"></i>
          Update Application
        </button>
      </div>
    </form>
  </div>
</template>
