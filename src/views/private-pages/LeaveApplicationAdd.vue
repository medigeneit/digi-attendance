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

const minLastWorkingDate = computed(() => yearStart(currentYear))
const maxLastWorkingDate = computed(() => yearEnd(currentYear))

const typeUsageCounts = computed(() => {
  const counts = {}
  selectedLeaveTypes.value.forEach((val, index) => {
    const effectiveType = effectiveSelectedLeaveType(index)
    if (typeof effectiveType === 'number') {
      counts[effectiveType] = (counts[effectiveType] || 0) + 1
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

const weekends = computed(() => {
  return authStore?.user?.assign_weekend?.weekends || authStore?.user?.weekends || []
})

const leaveDays = computed(() => {
  const startDateStr = form.value.last_working_date
  const endDateStr = form.value.resumption_date
  if (!startDateStr || !endDateStr) return []

  const start = new Date(startDateStr)
  const end = new Date(endDateStr)
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
  if (!total) {
    return {
      total: 0,
      weekends: 0,
      holidays: 0,
      assigned: 0,
      pending: 0,
      wplPeriod: 0,
      wplDeducted: 0,
      wplIncluded: 0,
    }
  }

  let weekendsCount = 0
  let holidaysCount = 0
  let assigned = 0
  let wplPeriod = 0
  let wplDeducted = 0
  let wplIncluded = 0

  selectedLeaveTypes.value.forEach((val, index) => {
    const day = leaveDays.value[index]
    const nonWorkingType = getNonWorkingType(day)
    const wplMeta = wplPeriodMeta.value[index]

    if (wplMeta?.isPeriod) {
      wplPeriod += 1
      if (wplMeta.nonDeducted) wplIncluded += 1
      wplDeducted += 1
    }

    if (nonWorkingType && (val === nonWorkingType || wplMeta?.nonDeducted)) {
      if (nonWorkingType === 'holiday') holidaysCount += 1
      else weekendsCount += 1
    } else if (val) {
      assigned += 1
    }
  })

  const pending = Math.max(total - (weekendsCount + holidaysCount + assigned), 0)
  return { total, weekends: weekendsCount, holidays: holidaysCount, assigned, pending, wplPeriod, wplDeducted, wplIncluded }
})

const completionPercent = computed(() => {
  if (!leaveStats.value.total) return 0
  return Math.round(((leaveStats.value.total - leaveStats.value.pending) / leaveStats.value.total) * 100)
})

const getWeekdayLabel = (day) => new Date(day).toLocaleString('en-us', { weekday: 'long' })

const getLeaveTypeName = (typeId) => {
  const type = userLeaveBalance.value.find((item) => item.id === typeId)
  return type?.name || ''
}

const remainingDaysFor = (type) => {
  const base = normalizedRemaining(type)
  if (base === Infinity) return 'Unlimited'
  const used = typeUsageCounts.value[type.id] || 0
  return Math.max(base - used, 0)
}

const leaveBalanceCards = computed(() => {
  return (userLeaveBalance.value || []).map((type) => ({
    id: type.id,
    name: type.name || type.leave_type || 'Leave',
    used: typeUsageCounts.value[type.id] || 0,
    remaining: remainingDaysFor(type),
  }))
})

const isWplTypeId = (typeId) => {
  if (!typeId || typeId === 'weekend' || typeId === 'holiday') return false
  const type = userLeaveBalance.value.find((t) => t.id === typeId)
  return type ? /WPL|WITHOUT\s*PAY/i.test(type.name || type.leave_type || '') : false
}

const isTypeOptionDisabled = (type, currentSelection) => {
  const base = normalizedRemaining(type)
  if (base === Infinity) return false
  if (currentSelection === type.id) return false
  const used = typeUsageCounts.value[type.id] || 0
  return used >= base
}

const getNonWorkingType = (day) => {
  if (holidayStore.holidayDates.includes(day)) return 'holiday'
  const dayName = new Date(day).toLocaleString('en-us', { weekday: 'long' })
  if (weekends.value.includes(dayName)) return 'weekend'
  return ''
}

const wplPeriodMeta = computed(() => {
  const meta = {}
  let index = 0

  while (index < leaveDays.value.length) {
    const day = leaveDays.value[index]

    if (getNonWorkingType(day) || !isWplTypeId(selectedLeaveTypes.value[index])) {
      index += 1
      continue
    }

    const blockTypeId = selectedLeaveTypes.value[index]
    const firstWorkingIndex = index
    let lastWorkingIndex = index
    let workingWplCount = 0

    while (index < leaveDays.value.length) {
      const blockDay = leaveDays.value[index]

      if (getNonWorkingType(blockDay)) {
        index += 1
        continue
      }

      if (!isWplTypeId(selectedLeaveTypes.value[index])) break

      workingWplCount += 1
      lastWorkingIndex = index
      index += 1
    }

    if (workingWplCount < 5) continue

    let periodStart = firstWorkingIndex
    while (periodStart > 0 && getNonWorkingType(leaveDays.value[periodStart - 1])) {
      periodStart -= 1
    }

    let periodEnd = lastWorkingIndex
    while (periodEnd < leaveDays.value.length - 1 && getNonWorkingType(leaveDays.value[periodEnd + 1])) {
      periodEnd += 1
    }

    for (let cursor = periodStart; cursor <= periodEnd; cursor += 1) {
      const nonWorkingType = getNonWorkingType(leaveDays.value[cursor])
      meta[cursor] = {
        isPeriod: true,
        typeId: blockTypeId,
        nonDeducted: Boolean(nonWorkingType),
        nonWorkingType,
      }
    }
  }

  return meta
})

const isWplNonDeductedPeriodDay = (index) => Boolean(wplPeriodMeta.value[index]?.nonDeducted)

const effectiveSelectedLeaveType = (index) => wplPeriodMeta.value[index]?.typeId || selectedLeaveTypes.value[index]

const isEffectiveSelected = (index, value) => effectiveSelectedLeaveType(index) === value

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
  },
)

watch(
  () => selectUser.value,
  (newValue) => {
    form.value.handover_user_id = newValue?.id
  },
)

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
    const nonWorkingType = getNonWorkingType(day)
    const wplMeta = wplPeriodMeta.value[index]

    if (nonWorkingType && wplMeta?.typeId) {
      selectedLeaveTypes.value[index] = wplMeta.typeId
      continue
    }

    if (selectedLeaveTypes.value[index]) continue

    if (nonWorkingType) {
      selectedLeaveTypes.value[index] = nonWorkingType
    }
  }
})

const submitLeaveApplication = async () => {
  loading.value = true
  error.value = null

  try {
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
            ? effectiveSelectedLeaveType(index)
            : null,
      }))
      .filter((x) => x.leave_type_id !== null)

    const leaveDaysJson = leaveDays.value.map((day, index) => ({
      date: day,
      leave_type_id: effectiveSelectedLeaveType(index) || '',
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
  <div class="min-h-screen bg-slate-50">
    <div class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4">
        <div class="flex min-w-0 items-center gap-2">
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            title="Back"
            @click="goBack"
          >
            <i class="far fa-arrow-left text-xs"></i>
          </button>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Applications</span>
              <span class="text-slate-300">/</span>
              <h1 class="truncate text-sm font-bold text-slate-800">Leave Application</h1>
            </div>
            <div class="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span>{{ authStore?.user?.name || 'Employee' }}</span>
              <span class="text-slate-300">|</span>
              <span>{{ leaveStats.total }} day range</span>
              <span v-if="leaveStats.total" class="text-slate-300">|</span>
              <span v-if="leaveStats.total" :class="leaveStats.pending ? 'text-amber-600' : 'text-emerald-600'">
                {{ completionPercent }}% classified
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <RouterLink
            to="/applications"
            class="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <i class="far fa-folder-open text-[10px]"></i>
            Applications
          </RouterLink>
          <button
            type="submit"
            form="leave-application-form"
            class="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            :disabled="loading"
          >
            <i class="far text-[10px]" :class="loading ? 'fa-spinner fa-spin' : 'fa-paper-plane'"></i>
            Submit
          </button>
        </div>
      </div>
    </div>

    <LoaderView v-if="loading" />

    <form
      v-else
      id="leave-application-form"
      class="mx-auto grid max-w-7xl gap-3 px-3 py-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start"
      @submit.prevent="submitLeaveApplication"
    >
      <main class="space-y-3">
        <section class="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-100 px-3 py-2">
            <h2 class="text-xs font-bold uppercase tracking-wide text-slate-600">Leave Period</h2>
          </div>
          <div class="grid gap-3 p-3 md:grid-cols-2">
            <div>
              <label for="last-working-date" class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Last Working Date
              </label>
              <input
                id="last-working-date"
                v-model="form.last_working_date"
                type="date"
                class="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
                :min="minLastWorkingDate"
              />
            </div>
            <div>
              <label for="resumption-date" class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Resumption Date
              </label>
              <input
                id="resumption-date"
                v-model="form.resumption_date"
                type="date"
                class="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
                :min="form.last_working_date"
              />
            </div>
          </div>
          <div
            v-if="form.last_working_date && form.resumption_date && leaveDaysMessage"
            class="mx-3 mb-3 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700"
          >
            <i class="far fa-info-circle mr-1"></i>{{ leaveDaysMessage }}
          </div>
        </section>

        <section v-if="leaveDays.length" class="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
            <div>
              <h2 class="text-xs font-bold uppercase tracking-wide text-slate-600">Day Classification</h2>
              <p class="mt-0.5 text-[11px] text-slate-400">Select one type for each leave day.</p>
            </div>
            <div class="flex items-center gap-2 text-[11px]">
              <span class="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-600">
                {{ leaveStats.assigned }} assigned
              </span>
              <span class="rounded bg-amber-50 px-2 py-1 font-semibold text-amber-700">
                {{ leaveStats.pending }} pending
              </span>
            </div>
          </div>

          <div
            v-if="leaveStats.wplIncluded"
            class="border-b border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-medium text-blue-800"
          >
            <i class="far fa-info-circle mr-1 text-blue-600"></i>
            WPL rule applied: {{ leaveStats.wplPeriod }} days are in the WPL period.
            {{ leaveStats.wplDeducted }} days deduct from WPL balance,
            including {{ leaveStats.wplIncluded }} weekend/holiday days.
          </div>

          <div class="max-h-[calc(100vh-260px)] overflow-auto">
            <table class="w-full min-w-[760px] border-collapse text-xs">
              <thead class="sticky top-0 z-10 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th class="w-10 border-b border-slate-200 px-3 py-2 text-center">#</th>
                  <th class="w-44 border-b border-slate-200 px-3 py-2 text-left">Date</th>
                  <th class="border-b border-slate-200 px-3 py-2 text-left">Type</th>
                  <th class="w-36 border-b border-slate-200 px-3 py-2 text-left">Selected</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(day, index) in leaveDays"
                  :key="day"
                  class="border-b border-slate-100 transition hover:bg-blue-50/30"
                >
                  <td class="px-3 py-2 text-center font-mono text-[11px] text-slate-400">{{ index + 1 }}</td>
                  <td class="px-3 py-2">
                    <div class="font-mono text-[12px] font-semibold text-slate-800">{{ day }}</div>
                    <div class="text-[10px] text-slate-400">{{ getWeekdayLabel(day) }}</div>
                  </td>
                  <td class="px-3 py-2">
                    <div class="flex flex-wrap gap-1.5">
                      <label
                        v-for="type in userLeaveBalance"
                        :key="type.id"
                        class="inline-flex cursor-pointer items-center rounded border px-2 py-1 text-[11px] font-semibold transition"
                        :class="[
                          isEffectiveSelected(index, type.id)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700',
                          isTypeOptionDisabled(type, selectedLeaveTypes[index])
                            ? 'cursor-not-allowed opacity-40'
                            : '',
                        ]"
                      >
                        <input
                          v-model="selectedLeaveTypes[index]"
                          type="radio"
                          class="sr-only"
                          :name="'leaveType-' + index"
                          :value="type.id"
                          :disabled="isTypeOptionDisabled(type, selectedLeaveTypes[index])"
                        />
                        {{ type.name }}
                        <span class="ml-1 font-mono text-[10px]">({{ remainingDaysFor(type) }})</span>
                      </label>

                      <label
                        class="inline-flex cursor-pointer items-center rounded border px-2 py-1 text-[11px] font-semibold transition"
                        :class="isEffectiveSelected(index, 'weekend')
                          ? 'border-amber-400 bg-amber-50 text-amber-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:text-amber-700'"
                      >
                        <input
                          v-model="selectedLeaveTypes[index]"
                          type="radio"
                          class="sr-only"
                          :name="'leaveType-' + index"
                          value="weekend"
                        />
                        Weekend
                      </label>

                      <label
                        class="inline-flex cursor-pointer items-center rounded border px-2 py-1 text-[11px] font-semibold transition"
                        :class="isEffectiveSelected(index, 'holiday')
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700'"
                      >
                        <input
                          v-model="selectedLeaveTypes[index]"
                          type="radio"
                          class="sr-only"
                          :name="'leaveType-' + index"
                          value="holiday"
                        />
                        Holiday
                      </label>
                    </div>
                  </td>
                  <td class="px-3 py-2">
                    <span
                      v-if="effectiveSelectedLeaveType(index)"
                      class="inline-flex rounded px-2 py-1 text-[11px] font-bold"
                      :class="{
                        'bg-amber-50 text-amber-700': effectiveSelectedLeaveType(index) === 'weekend',
                        'bg-emerald-50 text-emerald-700': effectiveSelectedLeaveType(index) === 'holiday',
                        'bg-blue-50 text-blue-700': effectiveSelectedLeaveType(index) !== 'weekend' && effectiveSelectedLeaveType(index) !== 'holiday',
                      }"
                    >
                      {{
                        effectiveSelectedLeaveType(index) === 'weekend'
                          ? 'Weekend'
                          : effectiveSelectedLeaveType(index) === 'holiday'
                          ? 'Holiday'
                          : isWplNonDeductedPeriodDay(index)
                          ? `${getLeaveTypeName(effectiveSelectedLeaveType(index))} Included`
                          : getLeaveTypeName(effectiveSelectedLeaveType(index))
                      }}
                    </span>
                    <span v-else class="text-[11px] font-semibold text-amber-600">Pending</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-100 px-3 py-2">
            <h2 class="text-xs font-bold uppercase tracking-wide text-slate-600">Handover Details</h2>
          </div>
          <div class="grid gap-3 p-3 lg:grid-cols-2">
            <div class="relative z-10 min-w-0 lg:col-span-2 lg:max-w-md">
              <label for="handover-user" class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Handover User</label>
              <MultiselectDropdown
                v-model="selectUser"
                :options="userStore.users"
                :multiple="false"
                label="label"
                placeholder="Search teammate"
                top-label=""
              />
            </div>

            <div class="min-w-0">
              <label for="reason" class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reason</label>
              <textarea
                id="reason"
                v-model="form.reason"
                class="min-h-[92px] w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Short reason for leave"
                rows="4"
              />
            </div>

            <div class="relative z-0 min-w-0">
              <label for="works-in-hand" class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Works in Hand</label>
              <textarea
                id="works-in-hand"
                v-model="form.works_in_hand"
                class="min-h-[92px] w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Current deliverables and handover notes"
                rows="4"
              />
            </div>
          </div>
        </section>

        <div
          v-if="error"
          class="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm"
        >
          <i class="fas fa-exclamation-triangle mt-0.5 text-red-500"></i>
          <div>
            <p class="font-semibold">Submission failed</p>
            <p class="text-xs">{{ error }}</p>
          </div>
        </div>
      </main>

      <aside class="space-y-3 lg:sticky lg:top-16">
        <section class="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-100 px-3 py-2">
            <h2 class="text-xs font-bold uppercase tracking-wide text-slate-600">Summary</h2>
          </div>
          <div class="grid grid-cols-2 gap-px bg-slate-100 text-center">
            <div class="bg-white p-3">
              <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total</p>
              <p class="mt-1 font-mono text-2xl font-bold text-slate-800">{{ leaveStats.total }}</p>
            </div>
            <div class="bg-white p-3">
              <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Assigned</p>
              <p class="mt-1 font-mono text-2xl font-bold text-blue-700">{{ leaveStats.assigned }}</p>
            </div>
            <div class="bg-white p-3">
              <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Off Days</p>
              <p class="mt-1 font-mono text-2xl font-bold text-emerald-700">{{ leaveStats.weekends + leaveStats.holidays }}</p>
            </div>
            <div class="bg-white p-3">
              <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Pending</p>
              <p class="mt-1 font-mono text-2xl font-bold text-amber-600">{{ leaveStats.pending }}</p>
            </div>
          </div>
          <div v-if="leaveStats.wplPeriod" class="grid grid-cols-3 gap-px border-t border-slate-100 bg-slate-100 text-center">
            <div class="bg-white p-2">
              <p class="text-[9px] font-bold uppercase tracking-wide text-slate-400">WPL Period</p>
              <p class="mt-1 font-mono text-lg font-bold text-blue-700">{{ leaveStats.wplPeriod }}</p>
            </div>
            <div class="bg-white p-2">
              <p class="text-[9px] font-bold uppercase tracking-wide text-slate-400">Deducted</p>
              <p class="mt-1 font-mono text-lg font-bold text-slate-800">{{ leaveStats.wplDeducted }}</p>
            </div>
            <div class="bg-white p-2">
              <p class="text-[9px] font-bold uppercase tracking-wide text-slate-400">Included</p>
              <p class="mt-1 font-mono text-lg font-bold text-emerald-700">{{ leaveStats.wplIncluded }}</p>
            </div>
          </div>
          <div class="p-3">
            <div class="h-2 overflow-hidden rounded bg-slate-100">
              <div class="h-full rounded bg-blue-600 transition-all" :style="{ width: `${completionPercent}%` }"></div>
            </div>
            <p class="mt-2 text-[11px] font-medium text-slate-500">{{ completionPercent }}% of selected days classified</p>
          </div>
        </section>

        <section class="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div class="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <h2 class="text-xs font-bold uppercase tracking-wide text-slate-600">Leave Balance</h2>
            <span class="text-[11px] text-slate-400">{{ currentYear }}</span>
          </div>
          <div class="divide-y divide-slate-100">
            <div
              v-for="type in leaveBalanceCards"
              :key="type.id"
              class="flex items-center justify-between gap-3 px-3 py-2"
            >
              <div class="min-w-0">
                <p class="truncate text-xs font-semibold text-slate-700">{{ type.name }}</p>
                <p class="text-[10px] text-slate-400">Selected {{ type.used }}</p>
              </div>
              <span class="rounded bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-700">
                {{ type.remaining }}
              </span>
            </div>
            <div v-if="!leaveBalanceCards.length" class="px-3 py-4 text-center text-xs text-slate-400">
              No leave balance found
            </div>
          </div>
        </section>

        <div
          v-if="leaveLimitMessage"
          class="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 shadow-sm"
        >
          <i class="fas fa-info-circle mr-1 text-amber-500"></i>{{ leaveLimitMessage }}
        </div>

        <section class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <button
            type="submit"
            class="inline-flex w-full items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            :disabled="loading"
          >
            <i class="far" :class="loading ? 'fa-spinner fa-spin' : 'fa-paper-plane'"></i>
            Submit Application
          </button>
        </section>
      </aside>
    </form>
  </div>
</template>
