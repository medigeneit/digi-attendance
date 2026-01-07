<script setup>
import dayjs from 'dayjs'
import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useToast } from 'vue-toastification'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  isOpen: { type: Boolean, default: false },

  userId: { type: [Number, String], default: '' },
  userLabel: { type: String, default: '' },

  defaultFrom: { type: String, default: () => new Date().toISOString().slice(0, 7) },
  defaultTo: { type: String, default: '' },

  assign_weekend: { type: Object, default: null },
  weekend_assignments: { type: [Object, Array, null], default: null },

  // ✅ NEW: { history: [...], current: {...} }
  assign_weekends: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'saved', 'close', 'update'])

const toast = useToast()
const userStore = useUserStore()

/* ------------ open state ------------ */
const open = ref(false)
watch(() => props.modelValue, (v) => { if (v !== open.value) open.value = v })
watch(() => props.isOpen, (v) => { if (v !== open.value) open.value = v })
onMounted(() => { open.value = !!(props.modelValue || props.isOpen) }),

/* Body scroll lock (nice UX) */
watch(open, (v) => {
  document.documentElement.style.overflow = v ? 'hidden' : ''
})

/* --------------------------- form --------------------------- */
const isSaving = ref(false)
const showEndMonth = ref(false)

const form = ref({
  weekends: [],
  start_month: props.defaultFrom,
  end_month: props.defaultTo,
  active: true,
})

/* ----------------------- helpers ---------------------- */
const avatarText = computed(() => {
  const label = props.userLabel || String(props.userId || '')
  const parts = label.trim().split(/\s+/)
  const two = (parts[0]?.[0] || '') + (parts[1]?.[0] || '')
  return (two || label[0] || '#').toUpperCase().slice(0, 2)
})

function fmtMonth(m) {
  if (!m) return ''
  const s = typeof m === 'string' && /^\d{4}-\d{2}$/.test(m) ? m : dayjs(m).format('YYYY-MM')
  return s || ''
}

function makeWeekendLabel(item) {
  const days = Array.isArray(item?.weekends) ? item.weekends.join(', ') : ''
  const start = fmtMonth(item?.start_month)
  const end = fmtMonth(item?.end_month)
  return `${days || '—'} • ${start || '—'} → ${end || 'present'}`
}

/* ------------------- normalize/history ------------------- */
const historySource = computed(() => {
  if (props.assign_weekends?.history && Array.isArray(props.assign_weekends.history)) {
    return props.assign_weekends.history
  }
  const src = props.weekend_assignments ?? (props.assign_weekend ? [props.assign_weekend] : [])
  return Array.isArray(src) ? src : (src ? [src] : [])
})

const history = computed(() => {
  const norm = historySource.value.map((x) => {
    const start = fmtMonth(x.start_month)
    const end = fmtMonth(x.end_month)
    const active = typeof x.active === 'boolean' ? x.active : !end

    return {
      id: x.id ?? null,
      weekends: Array.isArray(x.weekends) ? x.weekends : [],
      start_month: start,
      end_month: end,
      active,
      label: makeWeekendLabel(x),
      created_at: x.created_at ? new Date(x.created_at).getTime() : 0,
    }
  })

  return norm.sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    return (b.start_month || '').localeCompare(a.start_month || '')
  })
})

const currentAssignment = computed(() => {
  const cur = props.assign_weekends?.current || null
  if (cur) {
    const end = fmtMonth(cur.end_month)
    return {
      id: cur.id ?? null,
      weekends: Array.isArray(cur.weekends) ? cur.weekends : [],
      start_month: fmtMonth(cur.start_month),
      end_month: end,
      active: typeof cur.active === 'boolean' ? cur.active : !end,
      label: makeWeekendLabel(cur),
      created_at: cur.created_at ? new Date(cur.created_at).getTime() : 0,
    }
  }
  return history.value.find((h) => h.active) || history.value[0] || null
})

const hasActiveAssignment = computed(() => !!currentAssignment.value && currentAssignment.value.active)

const isSameAssignment = computed(() => {
  if (!hasActiveAssignment.value) return false
  const cur = currentAssignment.value
  const selDays = (form.value.weekends || []).slice().sort().join(',')
  const curDays = (cur.weekends || []).slice().sort().join(',')
  return (
    selDays === curDays &&
    fmtMonth(form.value.start_month) === fmtMonth(cur.start_month) &&
    fmtMonth(form.value.end_month) === fmtMonth(cur.end_month)
  )
})

const canSubmit = computed(() => {
  const hasDays = Array.isArray(form.value.weekends) && form.value.weekends.length > 0
  const hasStart = !!fmtMonth(form.value.start_month)
  return !!props.userId && hasDays && hasStart && !isSaving.value && !isSameAssignment.value
})

const selectedDaysLabel = computed(() => {
  const arr = form.value.weekends || []
  return arr.length ? arr.join(', ') : '—'
})

/* -------------------- init/preselect -------------------- */
function preselectFromCurrent() {
  const cur = currentAssignment.value
  if (!cur) return
  form.value.weekends = Array.isArray(cur.weekends) ? cur.weekends.slice() : []
  form.value.start_month = fmtMonth(cur.start_month) || props.defaultFrom
  form.value.end_month = fmtMonth(cur.end_month) || ''
  form.value.active = !!cur.active
  showEndMonth.value = !!fmtMonth(cur.end_month)
}

watch(open, (v, ov) => { if (v && !ov) nextTick(preselectFromCurrent) })
watch(() => props.assign_weekends, () => { if (open.value) nextTick(preselectFromCurrent) }, { deep: true })

watch(form, (v) => { emit('update', { ...v }) }, { deep: true })

/* -------------------------- actions -------------------------- */
function close() {
  if (!open.value) return
  open.value = false
  emit('update:modelValue', false)
  emit('close', false)
}

async function submit() {
  try {
    if (!props.userId) return toast.error('Employee নির্বাচন করুন')
    if (!Array.isArray(form.value.weekends) || form.value.weekends.length === 0)
      return toast.error('কমপক্ষে একদিন নির্বাচন করুন')
    if (!fmtMonth(form.value.start_month))
      return toast.error('Start month নির্বাচন করুন')

    if (isSameAssignment.value) {
      toast.info('এটা ইতিমধ্যেই Active কনফিগের মতোই আছে')
      return
    }

    isSaving.value = true

    const payload = {
      weekends: form.value.weekends,
      start_month: fmtMonth(form.value.start_month),
      end_month: fmtMonth(form.value.end_month) || '',
      active: !!form.value.active,
    }

    const res = await userStore.updateOrCreateWeekend(props.userId, payload)

    open.value = false
    emit('update:modelValue', false)
    emit('close', false)

    toast.success(hasActiveAssignment.value ? 'Reassigned' : 'Assigned')
    emit('saved', res)
    close()
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || 'Failed'
    toast.error(msg)
  } finally {
    isSaving.value = false
  }
}

/* keyboard UX */
function onKey(e) {
  if (!open.value) return
  if (e.key === 'Escape') close()
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter' && canSubmit.value) submit()
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.documentElement.style.overflow = ''
})

/* ---------------------- day helpers ---------------------- */
const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const short = (d) => d.slice(0, 3).toUpperCase()

function toggleAll() {
  if ((form.value.weekends || []).length === DAYS.length) form.value.weekends = []
  else form.value.weekends = DAYS.slice()
}

watch(showEndMonth, (v) => {
  if (!v) form.value.end_month = ''
})

/* ---------------------- Tailwind classes ---------------------- */
const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ' +
  'placeholder:text-slate-400 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20'

const iconBtn =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 ' +
  'transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10'
</script>

<template>
  <Teleport to="body">
    <!-- container stays, we use v-show so transitions work + no eslint warning -->
    <div class="fixed inset-0 z-50" :class="open ? 'pointer-events-auto' : 'pointer-events-none'">
      <!-- Overlay -->
      <Transition
        enter-active-class="transition-opacity duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-120 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-show="open"
          class="absolute inset-0 backdrop-blur-sm"
          @click="close"
        />
      </Transition>

      <!-- Dialog -->
      <div class="relative flex min-h-full items-center justify-center p-4 sm:p-6">
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 translate-y-2 scale-[0.98]"
          enter-to-class="opacity-100 translate-y-0 scale-100"
          leave-active-class="transition duration-120 ease-in"
          leave-from-class="opacity-100 translate-y-0 scale-100"
          leave-to-class="opacity-0 translate-y-2 scale-[0.98]"
        >
          <div
            v-show="open"
            class="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
            role="dialog"
            aria-modal="true"
          >
            <!-- Header -->
            <div class="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-br from-white to-slate-50 px-6 py-5">
              <div class="flex items-center gap-3 min-w-0">
                <div class="h-11 w-11 rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 flex items-center justify-center font-bold">
                  {{ avatarText }}
                </div>

                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="text-base font-semibold text-slate-900">Assign Weekends</h3>
                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1"
                      :class="hasActiveAssignment ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-slate-100 text-slate-700 ring-slate-200'"
                    >
                      {{ hasActiveAssignment ? 'Active config exists' : 'No active config' }}
                    </span>
                  </div>
                  <p class="mt-0.5 truncate text-xs text-slate-500">
                    {{ userLabel || ('#' + userId) }}
                    <span class="mx-2 text-slate-300">•</span>
                    <span class="text-slate-400">Esc</span>
                    <span class="mx-1 text-slate-300">/</span>
                    <span class="text-slate-400">Ctrl/⌘ + Enter</span>
                  </p>
                </div>
              </div>

              <button :class="iconBtn" @click="close" aria-label="Close">
                <span class="text-lg leading-none">✕</span>
              </button>
            </div>

            <!-- Content -->
            <div class="grid gap-6 px-6 py-6 lg:grid-cols-2">
              <!-- History -->
              <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div class="flex items-center justify-between px-4 py-4">
                  <div>
                    <p class="text-sm font-semibold text-slate-900">History</p>
                    <p class="text-xs text-slate-500">Latest assignments at top</p>
                  </div>
                  <span class="text-xs font-semibold text-slate-500">{{ history.length }} item(s)</span>
                </div>

                <div class="h-px bg-slate-200" />

                <div class="max-h-[340px] overflow-auto px-4 py-4">
                  <div
                    v-if="!history.length"
                    class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center"
                  >
                    <p class="text-sm font-medium text-slate-700">No assignment history</p>
                    <p class="mt-1 text-xs text-slate-500">Create the first weekend configuration.</p>
                  </div>

                  <ol v-else class="space-y-3">
                    <li
                      v-for="(h, idx) in history"
                      :key="h.id ?? idx"
                      class="rounded-2xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                    >
                      <div class="flex items-start gap-3">
                        <div class="mt-1 h-3 w-3 rounded-full" :class="h.active ? 'bg-emerald-500' : 'bg-slate-300'" />
                        <div class="min-w-0 flex-1">
                          <div class="flex flex-wrap items-center gap-2">
                            <p class="truncate text-sm font-semibold text-slate-900">{{ h.label }}</p>
                            <span
                              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1"
                              :class="h.active ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-slate-100 text-slate-700 ring-slate-200'"
                            >
                              {{ h.active ? 'Active' : 'Closed' }}
                            </span>
                          </div>

                          <p class="mt-1 text-xs text-slate-500">
                            Period:
                            <span class="font-semibold text-slate-700">{{ h.start_month || '—' }}</span>
                            →
                            <span class="font-semibold text-slate-700">{{ h.end_month || 'present' }}</span>
                          </p>
                        </div>
                      </div>
                    </li>
                  </ol>
                </div>
              </section>

              <!-- Form -->
              <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div class="px-4 py-4">
                  <p class="text-sm font-semibold text-slate-900">Configure</p>
                  <p class="text-xs text-slate-500">Pick weekend days & effective month</p>
                </div>
                <div class="h-px bg-slate-200" />

                <div class="space-y-5 px-4 py-4">
                  <!-- Day chips -->
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <label class="text-sm font-semibold text-slate-800">Weekend Days</label>
                      <button
                        type="button"
                        class="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                        @click="toggleAll"
                      >
                        {{ (form.weekends || []).length === DAYS.length ? 'Clear all' : 'Select all' }}
                      </button>
                    </div>

                    <div class="grid grid-cols-4 gap-2">
                      <label v-for="d in DAYS" :key="d" class="relative">
                        <input class="peer sr-only" type="checkbox" :value="d" v-model="form.weekends" />
                        <span
                          class="flex cursor-pointer items-center justify-center rounded-xl border px-2 py-2 text-xs font-semibold transition
                                 border-slate-200 bg-white text-slate-700 hover:bg-slate-50
                                 peer-checked:border-indigo-200 peer-checked:bg-indigo-50 peer-checked:text-indigo-700"
                        >
                          {{ short(d) }}
                        </span>
                      </label>
                    </div>

                    <p class="text-xs text-slate-500">
                      Selected: <span class="font-semibold text-slate-700">{{ selectedDaysLabel }}</span>
                    </p>
                  </div>

                  <!-- Callouts -->
                  <div v-if="isSameAssignment" class="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-700">
                    This configuration already matches the active assignment.
                  </div>
                  <div
                    v-else-if="hasActiveAssignment && (form.weekends?.length || 0) > 0"
                    class="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
                  >
                    Saving will close the current configuration and apply the new one.
                  </div>

                  <!-- Dates -->
                  <div class="grid gap-4 sm:grid-cols-2">
                    <div class="space-y-1">
                      <label class="text-sm font-semibold text-slate-800">Effective From</label>
                      <input v-model="form.start_month" type="month" :class="inputCls" />
                    </div>

                    <div class="space-y-1">
                      <div class="flex items-center justify-between">
                        <label class="text-sm font-semibold text-slate-800">End Month</label>
                        <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
                          <input type="checkbox" class="rounded border-slate-300" v-model="showEndMonth" />
                          Set end
                        </label>
                      </div>

                      <input v-if="showEndMonth" v-model="form.end_month" type="month" :class="inputCls" />
                      <div v-else class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        No end month (present)
                      </div>
                    </div>
                  </div>

                  <!-- Active toggle -->
                  <label class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div>
                      <p class="text-sm font-semibold text-slate-800">Active</p>
                      <p class="text-xs text-slate-500">Keep this configuration active</p>
                    </div>
                    <input type="checkbox" v-model="form.active" class="h-5 w-5 rounded border-slate-300" />
                  </label>
                </div>

                <!-- Footer -->
                <div class="flex items-end justify-end gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4">
                 
                  <div class="flex items-center gap-2">
                    <button class="btn-2-red" @click="close" :disabled="isSaving">Cancel</button>
                    <button class="btn-2" @click="submit" :disabled="!canSubmit || isSaving">
                      <span v-if="!isSaving">
                        {{ hasActiveAssignment ? (isSameAssignment ? 'Assigned' : 'Reassign') : 'Assign' }}
                      </span>
                      <span v-else>Processing…</span>
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </Teleport>
</template>
