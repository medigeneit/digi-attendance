<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useAuthStore } from '@/stores/auth'
import { useManualAttendanceStore } from '@/stores/manual-attendance'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const manualAttendanceStore = useManualAttendanceStore()
const authStore = useAuthStore()

/* ---------------- helpers ---------------- */
const formatTime = (timeStr) => {
  if (!timeStr) return null
  const timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!timeParts) return null
  let [, hours, minutes, period] = timeParts
  hours = parseInt(hours, 10)
  if (period.toUpperCase() === 'PM' && hours < 12) hours += 12
  if (period.toUpperCase() === 'AM' && hours === 12) hours = 0
  return `${hours.toString().padStart(2, '0')}:${minutes}`
}

const pad2 = (n) => String(n).padStart(2, '0')
const setNow = (field) => {
  const d = new Date()
  form[field] = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
const clearTime = (field) => (form[field] = '')

const toMinutes = (hhmm) => {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

/* ---------------- init from query ---------------- */
const { date, type, entry_time, exit_time } = router.currentRoute.value.query
const todayDate = date ? date : new Date().toISOString().split('T')[0]

/* ---------------- form state ---------------- */
const form = reactive({
  date: todayDate, // YYYY-MM-DD
  type: type || '',
  check_in: entry_time ? formatTime(entry_time) : '', // HH:mm
  check_out: exit_time ? formatTime(exit_time) : '',
  description: '',
  punch_type: '',
  offsite_type: '',
})

/* ---------------- type flags ---------------- */
const isForgetPunch = computed(() => form.type === 'Forget Punch')
const isOffsiteWork = computed(() => form.type === 'Offsite Work')
const showPunchType = computed(() => isForgetPunch.value)
const showOffsiteType = computed(() => isOffsiteWork.value)

/* ---------------- time enable/required (stable layout) ---------------- */
const entryEnabled = computed(() => {
  if (isForgetPunch.value) return form.punch_type !== 'exit'
  if (isOffsiteWork.value) return form.offsite_type !== 'post'
  return true
})
const exitEnabled = computed(() => {
  if (isForgetPunch.value) return form.punch_type !== 'entry'
  if (isOffsiteWork.value) return form.offsite_type !== 'pre'
  return true
})

const entryRequired = computed(() => {
  if (isForgetPunch.value) return form.punch_type === 'entry' || form.punch_type === 'both'
  if (isOffsiteWork.value) return form.offsite_type === 'pre' || form.offsite_type === 'both'
  return false
})
const exitRequired = computed(() => {
  if (isForgetPunch.value) return form.punch_type === 'exit' || form.punch_type === 'both'
  if (isOffsiteWork.value) return form.offsite_type === 'post' || form.offsite_type === 'both'
  return false
})

const timeOrderInvalid = computed(() => {
  if (!entryEnabled.value || !exitEnabled.value) return false
  if (!form.check_in || !form.check_out) return false
  const a = toMinutes(form.check_in)
  const b = toMinutes(form.check_out)
  if (a === null || b === null) return false
  return b <= a
})

/* ---------------- reset behavior ---------------- */
watch(
  () => form.type,
  (newType) => {
    if (newType !== 'Forget Punch') form.punch_type = ''
    if (newType !== 'isOffsiteWork') form.offsite_type = ''
  },
)

watch(
  () => form.punch_type,
  (val) => {
    if (!isForgetPunch.value) return
    if (val === 'entry') form.check_out = ''
    if (val === 'exit') form.check_in = ''
  },
)

watch(
  () => form.offsite_type,
  (val) => {
    if (!isOffsiteWork.value) return
    if (val === 'pre') form.check_out = ''
    if (val === 'post') form.check_in = ''
  },
)

/* ---------------- validation ---------------- */
const touched = reactive({
  date: false,
  type: false,
  punch_type: false,
  offsite_type: false,
  check_in: false,
  check_out: false,
  description: false,
})
const markTouched = (k) => (touched[k] = true)
const touchAll = () => Object.keys(touched).forEach((k) => (touched[k] = true))

const errors = computed(() => {
  const e = {}

  if (!form.date) e.date = 'Date is required.'
  if (!form.type) e.type = 'Type is required.'

  if (isForgetPunch.value && !form.punch_type) e.punch_type = 'Select Entry / Exit / Both.'
  if (isOffsiteWork.value && !form.offsite_type) e.offsite_type = 'Select Pre / Post / Both.'

  if (entryRequired.value && !form.check_in) e.check_in = 'Entry Time is required.'
  if (exitRequired.value && !form.check_out) e.check_out = 'Exit Time is required.'

  if (['Home Office', 'Remote Work'].includes(form.type)) {
    if (!form.check_in && !form.check_out) e.check_in = 'Entry or Exit time is required.'
  }

  if (timeOrderInvalid.value) e.check_out = 'Exit Time must be after Entry Time.'

  if (!form.description?.trim()) e.description = 'Description is required.'
  if ((form.description || '').length > 500) e.description = 'Max 500 characters.'

  return e
})

const canSubmit = computed(() => Object.keys(errors.value).length === 0)

/* ---------------- submit ---------------- */
const loading = ref(false)
const apiError = ref(null)

const submitManualAttendance = async () => {
  apiError.value = null
  touchAll()
  if (!canSubmit.value) return

  loading.value = true
  try {
    const payload = {
      user_id: authStore?.user?.id,
      ...form,
      check_in: form.check_in ? `${form.date} ${form.check_in}:00` : null,
      check_out: form.check_out ? `${form.date} ${form.check_out}:00` : null,
    }

    const newAttendance = await manualAttendanceStore.createManualAttendance(payload)
    router.push({ name: 'ManualAttendanceShow', params: { id: newAttendance.id } })
  } catch (err) {
    apiError.value = err?.message || 'Failed to submit manual attendance request.'
  } finally {
    loading.value = false
  }
}

const goBack = () => router.go(-1)

const pillClass = (active) =>
  active
    ? 'bg-blue-600 text-white border-blue-600'
    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-4 space-y-4">
    <div class="flex items-center justify-between gap-3">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:inline">Back</span>
      </button>

      <div class="text-center">
        <h1 class="title-md md:title-lg leading-tight">Manual Attendance Request</h1>
        <p class="text-xs md:text-sm text-slate-500">Fill in the details & submit for approval</p>
      </div>

      <RouterLink to="/" class="btn-2">Home</RouterLink>
    </div>

    <div v-if="loading" class="text-center">
      <LoaderView />
    </div>

    <form v-else @submit.prevent="submitManualAttendance" class="card-bg p-4 md:p-8 space-y-6">
      <!-- Date + Type -->
      <div class="grid md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">Date <span class="text-red-500">*</span></label>

          <!-- ✅ Normal date input -->
          <input
            type="date"
            v-model="form.date"
            class="input-1 w-full"
            required
            @blur="markTouched('date')"
          />

          <p v-if="touched.date && errors.date" class="text-xs text-red-600 mt-1">{{ errors.date }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Type <span class="text-red-500">*</span></label>
          <select v-model="form.type" class="input-1 w-full" required @blur="markTouched('type')">
            <option value="">Select Type</option>
            <option value="Home Office">Home Office</option>
            <option value="Remote Work">Remote Work</option>
            <option value="Forget Punch">Forget Punch</option>
            <option value="Offsite Work">Offsite Work</option>
          </select>
          <p v-if="touched.type && errors.type" class="text-xs text-red-600 mt-1">{{ errors.type }}</p>
        </div>
      </div>

      <!-- Forget Punch Type -->
      <div v-if="showPunchType" class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="block text-sm font-medium">Work Schedule <span class="text-red-500">*</span></label>
          <span class="text-xs text-slate-500">Select one</span>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="px-3 py-2 rounded-lg border text-sm"
            :class="pillClass(form.punch_type === 'entry')"
            @click="form.punch_type = 'entry'; markTouched('punch_type')"
          >
            Entry
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-lg border text-sm"
            :class="pillClass(form.punch_type === 'exit')"
            @click="form.punch_type = 'exit'; markTouched('punch_type')"
          >
            Exit
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-lg border text-sm"
            :class="pillClass(form.punch_type === 'both')"
            @click="form.punch_type = 'both'; markTouched('punch_type')"
          >
            Both
          </button>
        </div>

        <p v-if="touched.punch_type && errors.punch_type" class="text-xs text-red-600">{{ errors.punch_type }}</p>
      </div>

      <!-- Offsite Work Type -->
      <div v-if="showOffsiteType" class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="block text-sm font-medium">Work Schedule <span class="text-red-500">*</span></label>
          <span class="text-xs text-slate-500">Select one</span>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="px-3 py-2 rounded-lg border text-sm"
            :class="pillClass(form.offsite_type === 'pre')"
            @click="form.offsite_type = 'pre'; markTouched('offsite_type')"
          >
            Before Office (Pre)
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-lg border text-sm"
            :class="pillClass(form.offsite_type === 'post')"
            @click="form.offsite_type = 'post'; markTouched('offsite_type')"
          >
            After Office (Post)
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-lg border text-sm"
            :class="pillClass(form.offsite_type === 'both')"
            @click="form.offsite_type = 'both'; markTouched('offsite_type')"
          >
            Both
          </button>
        </div>

        <p v-if="touched.offsite_type && errors.offsite_type" class="text-xs text-red-600">{{ errors.offsite_type }}</p>
      </div>

      <!-- Entry/Exit Time always visible -->
      <div class="grid md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium">
              Entry Time <span v-if="entryRequired" class="text-red-500">*</span>
            </label>

            <div class="flex gap-2">
              <button
                type="button"
                class="text-xs px-2 py-1 rounded-md border border-slate-200"
                :disabled="!entryEnabled"
                @click="setNow('check_in'); markTouched('check_in')"
              >
                Now
              </button>
              <button
                type="button"
                class="text-xs px-2 py-1 rounded-md border border-slate-200"
                :disabled="!entryEnabled"
                @click="clearTime('check_in'); markTouched('check_in')"
              >
                Clear
              </button>
            </div>
          </div>

          <input
            type="time"
            v-model="form.check_in"
            class="input-1 w-full"
            :disabled="!entryEnabled"
            @blur="markTouched('check_in')"
          />

          <p v-if="touched.check_in && errors.check_in" class="text-xs text-red-600">{{ errors.check_in }}</p>
          <p v-else-if="!entryEnabled" class="text-xs text-slate-500">Not required for this selection.</p>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium">
              Exit Time <span v-if="exitRequired" class="text-red-500">*</span>
            </label>

            <div class="flex gap-2">
              <button
                type="button"
                class="text-xs px-2 py-1 rounded-md border border-slate-200"
                :disabled="!exitEnabled"
                @click="setNow('check_out'); markTouched('check_out')"
              >
                Now
              </button>
              <button
                type="button"
                class="text-xs px-2 py-1 rounded-md border border-slate-200"
                :disabled="!exitEnabled"
                @click="clearTime('check_out'); markTouched('check_out')"
              >
                Clear
              </button>
            </div>
          </div>

          <input
            type="time"
            v-model="form.check_out"
            class="input-1 w-full"
            :disabled="!exitEnabled"
            @blur="markTouched('check_out')"
          />

          <p v-if="touched.check_out && errors.check_out" class="text-xs text-red-600">{{ errors.check_out }}</p>
          <p v-else-if="!exitEnabled" class="text-xs text-slate-500">Not required for this selection.</p>
        </div>
      </div>

      <!-- Description -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-sm font-medium">Description <span class="text-red-500">*</span></label>
          <span class="text-xs text-slate-500">{{ (form.description || '').length }}/500</span>
        </div>

        <textarea
          v-model="form.description"
          class="input-1 w-full min-h-[110px]"
          placeholder="Example: Worked at client site (ABC), task: deployment & report. Please approve."
          @blur="markTouched('description')"
        ></textarea>

        <p v-if="touched.description && errors.description" class="text-xs text-red-600 mt-1">
          {{ errors.description }}
        </p>
      </div>

      <div v-if="apiError" class="rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">
        {{ apiError }}
      </div>

      <div class="flex items-center justify-between gap-3">
        <button type="button" class="btn-3" @click="goBack">Cancel</button>
        <button type="submit" class="btn-2" :disabled="loading || !canSubmit">Submit</button>
      </div>
    </form>
  </div>
</template>
