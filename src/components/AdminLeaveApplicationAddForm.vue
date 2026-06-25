<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useAuthStore } from '@/stores/auth'
import { useHolidayStore } from '@/stores/holiday'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch, watchEffect } from 'vue'

// Props
const props = defineProps({
  userInfo: Object
})

const emit = defineEmits(['close', 'formSuccessClosed'])

const leaveApplicationStore = useLeaveApplicationStore()
const userStore = useUserStore()
const authStore = useAuthStore()
const holidayStore = useHolidayStore()
const { userLeaveBalance } = storeToRefs(userStore)
const selectUser = ref('')
const isDirectApprove = ref(true)
const skipWplRule = ref(false)

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

const weekends = computed(() => {
  return props?.userInfo?.assign_weekend?.weekends || props?.userInfo?.weekends || []
})

const normalizedRemaining = (type) => {
  const raw = Number(type?.remaining_days)
  return Number.isFinite(raw) ? raw : Infinity
}

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
    const yyyy = current.getFullYear()
    const mm = (current.getMonth() + 1).toString().padStart(2, '0')
    const dd = current.getDate().toString().padStart(2, '0')
    days.push(`${yyyy}-${mm}-${dd}`)
    current.setDate(current.getDate() + 1)
  }

  return days
})

const leaveDaysMessage = computed(() => {
  if (!form.value.last_working_date || !form.value.resumption_date) return ''

  const start = new Date(form.value.last_working_date)
  const end = new Date(form.value.resumption_date)

  if (end <= start) {
    return 'Resumption date must be after Last Working Date.'
  }

  if (leaveDays.value.length === 0) {
    return 'No leave days between the selected dates.'
  }

  return null
})

const isWplTypeId = (typeId) => {
  if (!typeId || typeId === 'weekend' || typeId === 'holiday') return false
  const type = userLeaveBalance.value.find((t) => t.id === typeId)
  return type ? /WPL|WITHOUT\s*PAY/i.test(type.name || type.leave_type || '') : false
}

const getNonWorkingType = (day) => {
  if (holidayStore.holidayDates.includes(day)) return 'holiday'
  const dayName = new Date(day).toLocaleString('en-us', { weekday: 'long' })
  if (weekends.value.includes(dayName)) return 'weekend'
  return ''
}

const wplPeriodMeta = computed(() => {
  if (skipWplRule.value) return {}

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

const remainingDaysFor = (type) => {
  const base = normalizedRemaining(type)
  if (base === Infinity) return 'Unlimited'
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

const getLeaveTypeName = (typeId) => {
  const type = userLeaveBalance.value.find((item) => item.id === typeId)
  return type?.name || ''
}

const leaveStats = computed(() => {
  const total = leaveDays.value.length
  if (!total) {
    return { total: 0, assigned: 0, pending: 0, offDays: 0, wplPeriod: 0, wplDeducted: 0, wplIncluded: 0 }
  }

  let assigned = 0
  let offDays = 0
  let wplPeriod = 0
  let wplDeducted = 0
  let wplIncluded = 0

  leaveDays.value.forEach((day, index) => {
    const selected = selectedLeaveTypes.value[index]
    const nonWorkingType = getNonWorkingType(day)
    const wplMeta = wplPeriodMeta.value[index]

    if (wplMeta?.isPeriod) {
      wplPeriod += 1
      if (wplMeta.nonDeducted) wplIncluded += 1
      wplDeducted += 1
    }

    if (nonWorkingType && (selected === nonWorkingType || wplMeta?.nonDeducted)) {
      offDays += 1
    } else if (selected) {
      assigned += 1
    }
  })

  return {
    total,
    assigned,
    pending: Math.max(total - assigned - offDays, 0),
    offDays,
    wplPeriod,
    wplDeducted,
    wplIncluded,
  }
})

const completionPercent = computed(() => {
  if (!leaveStats.value.total) return 0
  return Math.round(((leaveStats.value.total - leaveStats.value.pending) / leaveStats.value.total) * 100)
})

const leaveBalanceCards = computed(() => {
  return (userLeaveBalance.value || []).map((type) => ({
    id: type.id,
    name: type.name || type.leave_type || 'Leave',
    used: typeUsageCounts.value[type.id] || 0,
    remaining: remainingDaysFor(type),
    quota: type.annual_quota ?? type.total_leave_days ?? '-',
  }))
})

watchEffect(async () => {
  if (leaveDays.value.length && userLeaveBalance.value.length) {
    await holidayStore.fetchHolidays({
      company_id: props?.userInfo?.company_id || authStore?.user?.company_id,
      start_date: leaveDays.value[0],
      end_date: leaveDays.value[leaveDays.value.length - 1],
    })

    leaveDays.value.forEach((day, index) => {
      const nonWorkingType = getNonWorkingType(day)
      const wplMeta = wplPeriodMeta.value[index]

      if (skipWplRule.value && nonWorkingType) {
        selectedLeaveTypes.value[index] = nonWorkingType
        return
      }

      if (nonWorkingType && wplMeta?.typeId) {
        selectedLeaveTypes.value[index] = wplMeta.typeId
        return
      }

      if (!selectedLeaveTypes.value[index] && nonWorkingType) {
        selectedLeaveTypes.value[index] = nonWorkingType
      }
    })
  }
})

watch(
  () => selectUser.value,
  (newValue) => {
    form.value.handover_user_id = newValue?.id
  },
)

const submitLeaveApplication = async () => {
  loading.value = true
  error.value = null

  try {
    const leaveDaysPayload = leaveDays.value
      .map((day, index) => {
        return {
          date: day,
          leave_type_id:
            selectedLeaveTypes.value[index] !== 'weekend' &&
            selectedLeaveTypes.value[index] !== 'holiday'
              ? effectiveSelectedLeaveType(index)
              : null,
        }
      })
      .filter((leaveDay) => leaveDay.leave_type_id !== null)

    const leaveDaysJson = leaveDays.value
      .map((day, index) => {
        return {
          date: day,
          leave_type_id: effectiveSelectedLeaveType(index) || '',
        }
      })
      .filter((leaveDay) => leaveDay.leave_type_id !== null)

    const payload = {
      user_id: props?.userInfo?.id,
      last_working_date: form.value.last_working_date,
      resumption_date: form.value.resumption_date,
      reason: form.value.reason,
      works_in_hand: form.value.works_in_hand,
      handover_user_id: isDirectApprove.value ? null : form.value.handover_user_id,
      leave_days: leaveDaysPayload,
      json_data: leaveDaysJson,
      is_direct_approve: isDirectApprove.value,
      skip_wpl_rule: skipWplRule.value,
    }

    const newApplication = await leaveApplicationStore.storeAdminLeaveApplication(payload)
    if (newApplication) {
      emit('formSuccessClosed')
    }
  } catch (err) {
    error.value = err.message || 'Failed to submit leave application'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  watchEffect(() => {
    const userId = props?.userInfo?.id
    if (userId) {
      userStore.fetchUserLeaveBalances(userId)
    }
  })


  await userStore.fetchTypeWiseEmployees({ except: 'auth' })
})

const goBack = () => {
  emit('close')
}
</script>

<template>
  <div class="flex max-h-[92vh] flex-col bg-slate-50">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-600">Admin Panel</span>
          <span class="text-slate-300">/</span>
          <h1 class="truncate text-base font-bold text-slate-800">Leave Application Form</h1>
        </div>
        <div class="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
          <span>{{ props?.userInfo?.name || 'Selected employee' }}</span>
          <span v-if="props?.userInfo?.employee_id" class="text-slate-300">|</span>
          <span v-if="props?.userInfo?.employee_id">{{ props.userInfo.employee_id }}</span>
          <span v-if="leaveStats.total" class="text-slate-300">|</span>
          <span v-if="leaveStats.total">{{ leaveStats.total }} day range</span>
          <span v-if="leaveStats.total" :class="leaveStats.pending ? 'text-amber-600' : 'text-emerald-600'">
            {{ completionPercent }}% classified
          </span>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-red-600"
        title="Close"
        @click="goBack"
      >
        <i class="far fa-times text-xs"></i>
      </button>
    </header>

    <LoaderView v-if="loading" />

    <form v-else class="flex min-h-0 flex-1 flex-col" @submit.prevent="submitLeaveApplication">
      <div class="grid min-h-0 flex-1 gap-3 overflow-auto p-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <main class="space-y-3">
          <section class="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-100 px-3 py-2">
              <h2 class="text-xs font-bold uppercase tracking-wide text-slate-600">Leave Period</h2>
            </div>
            <div class="grid gap-3 p-3 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Last Working Date</label>
                <input
                  v-model="form.last_working_date"
                  type="date"
                  class="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
              <div>
                <label class="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Resumption Date</label>
                <input
                  v-model="form.resumption_date"
                  type="date"
                  class="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-3 py-2">
              <div>
                <p class="text-xs font-bold text-slate-700">Approval Preference</p>
                <p class="text-[11px] text-slate-500">Turn off direct approval to assign handover ownership.</p>
              </div>
              <label class="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm">
                <input v-model="isDirectApprove" type="checkbox" class="h-4 w-4 text-blue-600" />
                Direct approve
              </label>
            </div>

            <div
              v-if="form.last_working_date && form.resumption_date && leaveDaysMessage"
              class="mx-3 mb-3 mt-3 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700"
            >
              <i class="far fa-info-circle mr-1"></i>{{ leaveDaysMessage }}
            </div>
          </section>

          <section class="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
              <div>
                <h2 class="text-xs font-bold uppercase tracking-wide text-slate-600">Day Classification</h2>
                <p class="mt-0.5 text-[11px] text-slate-400">
                  {{ skipWplRule
                    ? 'Admin override active: weekend/holiday will not be converted to WPL.'
                    : 'WPL 5+ working-day period includes adjacent weekend/holiday in the same WPL period.' }}
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2 text-[11px]">
                <label
                  class="inline-flex cursor-pointer items-center gap-2 rounded border px-2.5 py-1 font-bold transition"
                  :class="skipWplRule
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-amber-200'"
                  title="Admin override: do not include adjacent weekends or holidays in a 5+ day WPL period"
                >
                  <input v-model="skipWplRule" type="checkbox" class="h-3.5 w-3.5 rounded text-amber-600" />
                  Skip WPL rule
                </label>
                <span class="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-600">{{ leaveStats.assigned }} assigned</span>
                <span class="rounded bg-amber-50 px-2 py-1 font-semibold text-amber-700">{{ leaveStats.pending }} pending</span>
              </div>
            </div>

            <div
              v-if="skipWplRule"
              class="border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800"
            >
              <i class="far fa-exclamation-triangle mr-1 text-amber-600"></i>
              Admin override enabled. Only explicitly selected WPL working days will be deducted.
            </div>

            <div
              v-if="leaveStats.wplIncluded"
              class="border-b border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-medium text-blue-800"
            >
              <i class="far fa-info-circle mr-1 text-blue-600"></i>
              WPL rule applied: {{ leaveStats.wplPeriod }} days in period,
              {{ leaveStats.wplDeducted }} deducted from WPL,
              including {{ leaveStats.wplIncluded }} weekend/holiday days.
            </div>

            <div v-if="!leaveDays.length" class="p-6 text-center text-sm text-slate-500">
              Pick a last working date and resumption date to configure the breakdown.
            </div>

            <div v-else class="max-h-[42vh] overflow-auto">
              <table class="w-full min-w-[820px] border-collapse text-xs">
                <thead class="sticky top-0 z-10 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="w-10 border-b border-slate-200 px-3 py-2 text-center">#</th>
                    <th class="w-40 border-b border-slate-200 px-3 py-2 text-left">Date</th>
                    <th class="border-b border-slate-200 px-3 py-2 text-left">Type</th>
                    <th class="w-40 border-b border-slate-200 px-3 py-2 text-left">Selected</th>
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
                      <div class="text-[10px] text-slate-400">{{ new Date(day).toLocaleString('en-us', { weekday: 'long' }) }}</div>
                    </td>
                    <td class="px-3 py-2">
                      <div class="flex flex-wrap gap-1.5">
                        <label
                          v-for="type in userLeaveBalance"
                          :key="type.id"
                          class="cursor-pointer"
                          :title="remainingDaysFor(type) === 0 ? 'No balance remaining' : ''"
                        >
                          <input
                            v-model="selectedLeaveTypes[index]"
                            type="radio"
                            class="sr-only"
                            :name="'leaveType-' + index"
                            :value="type.id"
                            :disabled="isTypeOptionDisabled(type, selectedLeaveTypes[index])"
                          />
                          <span
                            class="inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-semibold transition"
                            :class="[
                              isEffectiveSelected(index, type.id)
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700',
                              isTypeOptionDisabled(type, selectedLeaveTypes[index]) ? 'cursor-not-allowed opacity-40' : '',
                            ]"
                          >
                            {{ type.name }}
                            <span class="font-mono text-[10px] text-slate-400">({{ remainingDaysFor(type) }})</span>
                          </span>
                        </label>

                        <label class="cursor-pointer">
                          <input v-model="selectedLeaveTypes[index]" type="radio" class="sr-only" :name="'leaveType-' + index" value="weekend" />
                          <span
                            class="inline-flex items-center rounded border px-2 py-1 text-[11px] font-semibold transition"
                            :class="isEffectiveSelected(index, 'weekend')
                              ? 'border-amber-400 bg-amber-50 text-amber-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:text-amber-700'"
                          >
                            Weekend
                          </span>
                        </label>

                        <label class="cursor-pointer">
                          <input v-model="selectedLeaveTypes[index]" type="radio" class="sr-only" :name="'leaveType-' + index" value="holiday" />
                          <span
                            class="inline-flex items-center rounded border px-2 py-1 text-[11px] font-semibold transition"
                            :class="isEffectiveSelected(index, 'holiday')
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700'"
                          >
                            Holiday
                          </span>
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
              <div v-if="!isDirectApprove" class="relative z-10 min-w-0 lg:col-span-2 lg:max-w-md">
                <label class="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Handover User</label>
                <MultiselectDropdown
                  v-model="selectUser"
                  :options="userStore.users"
                  :multiple="false"
                  label="label"
                  placeholder="Select teammate"
                  top-label=""
                />
              </div>

              <div>
                <label class="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Reason</label>
                <textarea
                  v-model="form.reason"
                  class="min-h-[88px] w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Summarize why the leave is required"
                ></textarea>
              </div>

              <div>
                <label for="works-in-hand" class="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Works in Hand</label>
                <textarea
                  id="works-in-hand"
                  v-model="form.works_in_hand"
                  class="min-h-[88px] w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Current deliverables and handover notes"
                ></textarea>
              </div>
            </div>
          </section>

          <div v-if="error" class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {{ error }}
          </div>
        </main>

        <aside class="space-y-3 lg:sticky lg:top-3 lg:self-start">
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
                <p class="mt-1 font-mono text-2xl font-bold text-emerald-700">{{ leaveStats.offDays }}</p>
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
            <div class="border-b border-slate-100 px-3 py-2">
              <h2 class="text-xs font-bold uppercase tracking-wide text-slate-600">Leave Balance</h2>
            </div>
            <div class="max-h-72 divide-y divide-slate-100 overflow-auto">
              <div v-for="type in leaveBalanceCards" :key="type.id" class="flex items-center justify-between gap-3 px-3 py-2">
                <div class="min-w-0">
                  <p class="truncate text-xs font-semibold text-slate-700">{{ type.name }}</p>
                  <p class="text-[10px] text-slate-400">Selected {{ type.used }} | Quota {{ type.quota }}</p>
                </div>
                <span class="rounded bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-700">{{ type.remaining }}</span>
              </div>
              <div v-if="!leaveBalanceCards.length" class="px-3 py-4 text-center text-xs text-slate-400">
                No leave balance found
              </div>
            </div>
          </section>
        </aside>
      </div>

      <footer class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3">
        <p class="text-[11px] font-medium text-slate-500">
          {{ leaveStats.pending ? `${leaveStats.pending} day(s) still pending` : 'Ready to submit' }}
        </p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            @click="goBack"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="inline-flex items-center gap-2 rounded bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            :disabled="loading"
          >
            <i class="far" :class="loading ? 'fa-spinner fa-spin' : 'fa-paper-plane'"></i>
            Submit Application
          </button>
        </div>
      </footer>
    </form>
  </div>
</template>
