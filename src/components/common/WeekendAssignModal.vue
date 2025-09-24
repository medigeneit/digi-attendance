<script setup>
import dayjs from 'dayjs'
import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useToast } from 'vue-toastification'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  /* v-model style (new) */
  modelValue: { type: Boolean, default: false },
  /* legacy (back-compat) */
  isOpen: { type: Boolean, default: false },

  userId: { type: [Number, String], default: '' },
  userLabel: { type: String, default: '' },

  /* month range defaults (YYYY-MM) */
  defaultFrom: { type: String, default: () => new Date().toISOString().slice(0,7) },
  defaultTo:   { type: String, default: '' },

  /* single assignment (legacy) */
  assign_weekend: { type: Object, default: null },

  /* full history (array/object) - legacy */
  weekend_assignments: { type: [Object, Array, null], default: null },

  /* ✅ NEW: API object shape { history: [...], current: {...} } */
  assign_weekends: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue','saved','close','update'])

const toast = useToast()
const userStore = useUserStore()

/* ------------ open state (one-way sync from props) ------------ */
const open = ref(false)
watch(() => props.modelValue, v => { if (v !== open.value) open.value = v })
watch(() => props.isOpen,     v => { if (v !== open.value) open.value = v })
onMounted(() => { open.value = !!(props.modelValue || props.isOpen) })

/* --------------------------- form --------------------------- */
const isSaving = ref(false)
const form = ref({
  weekends: [],
  start_month: props.defaultFrom,
  end_month: props.defaultTo,
  active: true,
})

/* ----------------------- helpers/labels ---------------------- */
const avatarText = computed(() => {
  const label = props.userLabel || String(props.userId || '')
  const parts = label.trim().split(/\s+/)
  const two = (parts[0]?.[0] || '') + (parts[1]?.[0] || '')
  return (two || label[0] || '#').toUpperCase().slice(0,2)
})

function fmtMonth(m) {
  if (!m) return ''
  const s = typeof m === 'string' && /^\d{4}-\d{2}$/.test(m) ? m : dayjs(m).format('YYYY-MM')
  return s || ''
}

function makeWeekendLabel(item) {
  const days  = Array.isArray(item?.weekends) ? item.weekends.join(',') : ''
  const start = fmtMonth(item?.start_month)
  const end   = fmtMonth(item?.end_month)
  return `${days || '—'} — ${start || '—'} → ${end || 'present'}`
}

/* ------------------- normalize/history ------------------- */
// Prefer NEW API: assign_weekends.history; fallback to legacy props.
const historySource = computed(() => {
  if (props.assign_weekends?.history && Array.isArray(props.assign_weekends.history)) {
    return props.assign_weekends.history
  }
  const src = props.weekend_assignments ?? (props.assign_weekend ? [props.assign_weekend] : [])
  return Array.isArray(src) ? src : (src ? [src] : [])
})

const history = computed(() => {
  const norm = historySource.value.map(x => {
    const start = fmtMonth(x.start_month)
    const end   = fmtMonth(x.end_month)
    const active = x.active // end null/blank হলে active
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
  // active first, then latest start desc
  return norm.sort((a,b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    return (b.start_month || '').localeCompare(a.start_month || '')
  })
})

// Prefer NEW API: assign_weekends.current; fallback to history active/first
const currentAssignment = computed(() => {
  const cur = props.assign_weekends?.current || null
  if (cur) {
    return {
      id: cur.id ?? null,
      weekends: Array.isArray(cur.weekends) ? cur.weekends : [],
      start_month: fmtMonth(cur.start_month),
      end_month: fmtMonth(cur.end_month),
      active: !!cur.active || !fmtMonth(cur.end_month),
      label: makeWeekendLabel(cur),
      created_at: cur.created_at ? new Date(cur.created_at).getTime() : 0,
    }
  }
  return history.value.find(h => h.active) || history.value[0] || null
})

const hasActiveAssignment = computed(() => !!currentAssignment.value && currentAssignment.value.active)

/* same assignment? (days + start/end all equal) */
const isSameAssignment = computed(() => {
  if (!hasActiveAssignment.value) return false
  const cur = currentAssignment.value
  const selDays = (form.value.weekends || []).slice().sort().join(',')
  const curDays = (cur.weekends || []).slice().sort().join(',')
  return (
    selDays === curDays &&
    fmtMonth(form.value.start_month) === fmtMonth(cur.start_month) &&
    fmtMonth(form.value.end_month)   === fmtMonth(cur.end_month)
  )
})

const canSubmit = computed(() => {
  const hasDays = Array.isArray(form.value.weekends) && form.value.weekends.length > 0
  const hasStart = !!fmtMonth(form.value.start_month)
  return !!props.userId && hasDays && hasStart && !isSaving.value && !isSameAssignment.value
})

/* -------------------- init/preselect behaviours -------------------- */
function preselectFromCurrent() {
  const cur = currentAssignment.value
  if (!cur) return
  form.value.weekends = Array.isArray(cur.weekends) ? cur.weekends.slice() : []
  form.value.start_month = fmtMonth(cur.start_month) || props.defaultFrom
  form.value.end_month   = fmtMonth(cur.end_month)   || ''
}

watch(open, (v, ov) => { if (v && !ov) nextTick(preselectFromCurrent) })
watch(() => props.assign_weekends, () => { if (open.value) nextTick(preselectFromCurrent) }, { deep: true })

// live update to parent (compat with your old API)
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

    // Backend should accept selected_weekend shape
    const res = await userStore.updateOrCreateWeekend(props.userId, payload)

    toast.success(hasActiveAssignment.value ? 'Reassigned' : 'Assigned')
    emit('saved', res) // parent refresh করে assign_weekends আপডেট পাঠাবে
    close()
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || 'Failed'
    toast.error(msg)
  } finally {
    isSaving.value = false
  }
}

/* ----------------------- keyboard UX ----------------------- */
function onKey(e) {
  if (!open.value) return
  if (e.key === 'Escape') close()
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter' && canSubmit.value) submit()
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

/* ---------------------- checkbox helpers ---------------------- */
const DAYS = ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday']
function toggleAll() {
  if ((form.value.weekends || []).length === DAYS.length) {
    form.value.weekends = []
  } else {
    form.value.weekends = DAYS.slice()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- overlay -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="close"></div>
        <!-- card -->
        <Transition name="pop">
          <div class="relative w-full max-w-xl rounded-2xl bg-white shadow-xl ring-1 ring-black/5 p-5">
            <!-- header -->
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold">
                  {{ avatarText }}
                </div>
                <div>
                  <h3 class="text-base font-semibold text-gray-900">Assign Weekends</h3>
                  <p class="text-xs text-gray-500">{{ userLabel || ('#' + userId) }}</p>
                </div>
              </div>
              <button class="btn-icon" @click="close" aria-label="Close">✕</button>
            </div>

            <div class=" flex flex-col gap-2">
              <!-- right: history -->
              <div class="rounded-lg border bg-white p-2">
                <div class="flex items-center justify-between">
                  <h4 class="text-sm font-semibold text-gray-800">Weekend history</h4>
                  <span class="text-xs text-gray-500">{{ history.length }} item(s)</span>
                </div>

                <div v-if="!history.length" class="text-sm text-gray-500">
                  No assignment history
                </div>

                <ul v-else class="divide-y">
                  <li v-for="(h, idx) in history" :key="h.id ?? idx" class="py-2 flex items-start gap-3">
                    <input type="checkbox" class="mt-1 rounded border-gray-300" :checked="h.active" disabled>
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <span class="text-sm text-gray-900">{{ h.label }}</span>
                        
                        <span v-if="h.active" class="inline-flex items-center text-xs font-medium rounded-full bg-green-100 text-green-700 px-2 py-0.5">
                          Active
                        </span>
                        <span v-else class="inline-flex items-center text-xs font-medium rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">
                          Closed
                        </span>
                      </div>
                      <div class="mt-0.5 text-xs text-gray-600">
                        Period: {{ h.start_month || '—' }} → {{ h.end_month || 'present' }}
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
              <!-- left: form -->
              <div class="rounded-lg border bg-white p-4">
                <div class="grid gap-4 md:grid-cols-12">
                  <div class="md:col-span-12">
                    <label class="block text-sm font-medium text-gray-700">Weekend Days</label>

                    <div class="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <label v-for="d in DAYS" :key="d" class="flex items-center gap-2 text-sm">
                        <input class="rounded border-gray-300" type="checkbox" :value="d" v-model="form.weekends">
                        <span class="text-gray-700">{{ d.slice(0,3).toUpperCase() }}</span>
                      </label>
                    </div>

                    <div class="mt-2 flex items-center gap-3">
                      <button type="button" class="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                              @click="toggleAll">
                        {{ (form.weekends || []).length === DAYS.length ? 'Clear all' : 'Select all' }}
                      </button>
                      <span class="text-xs text-gray-500">
                        Selected: {{ (form.weekends || []).join(', ') || '—' }}
                      </span>
                    </div>

                    <div class="mt-2">
                      <p v-if="isSameAssignment" class="text-xs text-blue-600">
                        এই কনফিগ ইতিমধ্যেই active আছে।
                      </p>
                      <p v-else-if="hasActiveAssignment && (form.weekends?.length || 0) > 0" class="text-xs text-amber-600">
                        Reassign করলে আগের assignment close/update হয়ে নতুনটি save হবে।
                      </p>
                    </div>
                  </div>

                  <div class="md:col-span-5">
                    <label class="block text-sm font-medium text-gray-700">From</label>
                    <input v-model="form.start_month" type="month" class="mt-1 w-full rounded-md border px-3 py-2">
                  </div>

                  <div class="md:col-span-2 flex items-end">
                    <label class="inline-flex items-center gap-2 select-none mt-1">
                      <input type="checkbox" v-model="form.active" class="rounded border-gray-300">
                      <span class="text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>

                <div class="mt-4 flex justify-end gap-2">
                  <button class="btn-3" @click="close" :disabled="isSaving">Cancel</button>
                  <button class="btn-2" @click="submit" :disabled="!canSubmit">
                    <span v-if="!isSaving">{{ hasActiveAssignment ? (isSameAssignment ? 'Assigned' : 'Reassign') : 'Assign' }}</span>
                    <span v-else>Processing…</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .12s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.pop-enter-active, .pop-leave-active { transition: transform .15s ease, opacity .15s ease; }
.pop-enter-from, .pop-leave-to { transform: scale(.96); opacity: 0; }
</style>
