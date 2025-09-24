<script setup>
import dayjs from 'dayjs'
import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useToast } from 'vue-toastification'
import { useShiftStore } from '@/stores/shift'

const props = defineProps({
  /* new: v-model */
  modelValue: { type: Boolean, default: false },
  /* legacy support */
  isOpen: { type: Boolean, default: false },

  /* inputs */
  employee: { type: Object, default: () => ({ id: 0, name: '' }) },
  shifts:   { type: [Array, Object], default: () => [] }, // array or object-of-arrays

  /* legacy current */
  hasShift: { type: Object, default: null },
  current_shift: { type: Object, default: null },

  /* ✅ NEW: server object { employee_id, count, history: [...] } */
  shift_history: { type: [Object, Array, null], default: null },
})

const emit = defineEmits(['update:modelValue','saved','close'])

const toast = useToast()
const shiftStore = useShiftStore()

/* ---------- open state (one-way sync) ---------- */
const open = ref(false)
watch(() => props.modelValue, v => { if (v !== open.value) open.value = v })
watch(() => props.isOpen,     v => { if (v !== open.value) open.value = v })
onMounted(() => { open.value = !!(props.modelValue || props.isOpen) })

function close() {
  if (!open.value) return
  open.value = false
  emit('update:modelValue', false)
  emit('close', false)
}

/* ---------- form ---------- */
const form = ref({
  shift_id: '',
  employee_id: props.employee?.id || 0,
  start_date: '',
  end_date: '',
})

watch(() => props.employee, (nv) => {
  form.value.employee_id = nv?.id || 0
}, { immediate: true, deep: true })

/* ---------- helpers ---------- */
const avatarText = computed(() => {
  const label = props.employee?.name || String(props.employee?.id || '')
  const parts = label.trim().split(/\s+/)
  const two = (parts[0]?.[0] || '') + (parts[1]?.[0] || '')
  return (two || label[0] || '#').toUpperCase().slice(0,2)
})

function toYMD(d) {
  if (!d) return ''
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  const s = dayjs(d).isValid() ? dayjs(d).format('YYYY-MM-DD') : ''
  return s
}

const shiftOptions = computed(() => {
  const src = props.shifts
  if (Array.isArray(src)) return src
  if (src && typeof src === 'object') return Object.values(src).flat().filter(Boolean)
  return []
})

/* ---------- history normalize (supports {history:[...]} shape) ---------- */
const rawHistory = computed(() => {
  const h = props.shift_history
  if (h && typeof h === 'object' && Array.isArray(h.history)) return h.history
  if (Array.isArray(h)) return h
  if (h) return [h]
  return []
})

const history = computed(() => {
  return rawHistory.value.map(x => ({
    id: x.id ?? null,
    name: x?.shift?.name || x?.name || `#${x?.shift_id || x?.id || '—'}`,
    shift_id: x?.shift?.id ?? x?.shift_id ?? null,
    start_date: toYMD(x.start_date),
    end_date: toYMD(x.end_date),
    status: x.status || (x.end_date ? 'ended' : 'active'),
    days: x.days ?? null,
    active: !x.end_date || x.status === 'active',
    created_at: x.created_at ? new Date(x.created_at).getTime() : 0,
  })).sort((a,b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    return (b.start_date || '').localeCompare(a.start_date || '')
  })
})

const historyCount = computed(() => {
  const h = props.shift_history
  if (h && typeof h === 'object' && typeof h.count === 'number') return h.count
  return history.value.length
})

/* ---------- current (prefer active from history, fallback to props) ---------- */
const current = computed(() => {
  const fromHist = history.value.find(h => h.active)
  if (fromHist) return fromHist
  const cur = props.current_shift || props.hasShift
  if (cur) {
    return {
      id: cur.id ?? null,
      name: cur?.shift?.name || cur?.name || `#${cur?.shift_id || cur?.id || '—'}`,
      shift_id: cur?.shift?.id ?? cur?.shift_id ?? null,
      start_date: toYMD(cur.start_date),
      end_date: toYMD(cur.end_date),
      active: !cur.end_date,
    }
  }
  return null
})

/* ---------- prefill on open ---------- */
async function prefill() {
  const cur = current.value
  if (cur) {
    form.value.shift_id   = String(cur.shift_id || '')
    form.value.start_date = toYMD(cur.start_date) || ''
    form.value.end_date   = toYMD(cur.end_date)   || ''
  } else {
    form.value.shift_id = ''
    form.value.start_date = ''
    form.value.end_date = ''
  }
}
watch(open, (v, ov) => { if (v && !ov) nextTick(prefill) })
watch([current, () => props.shift_history], () => { if (open.value) nextTick(prefill) })

/* ---------- submit ---------- */
const isSaving = ref(false)
const canSubmit = computed(() =>
  !!form.value.employee_id && !!form.value.shift_id && !!form.value.start_date && !isSaving.value
)

async function handleAction() {
  try {
    if (!canSubmit.value) {
      toast.error('All required fields must be filled')
      return
    }
    isSaving.value = true
    const payload = {
      employee_id: Number(form.value.employee_id),
      shift_id: Number(form.value.shift_id),
      start_date: form.value.start_date,
      end_date: form.value.end_date || null,
    }
    const res = await shiftStore.shiftAssign(payload)
    toast.success(current.value ? 'Shift updated' : 'Shift assigned')
    emit('saved', res)
    close()
  } catch (err) {
    const msg = err?.response?.data?.message || 'Failed to assign shift'
    toast.error(msg)
  } finally {
    isSaving.value = false
  }
}

/* ---------- keyboard UX ---------- */
function onKey(e) {
  if (!open.value) return
  if (e.key === 'Escape') close()
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter' && canSubmit.value) handleAction()
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
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
                  <h3 class="text-base font-semibold text-gray-900">
                    {{ current ? 'Update Shift' : 'Assign Shift' }}
                  </h3>
                  <p class="text-xs text-gray-500">{{ employee?.name || ('#' + (employee?.id || '')) }}</p>
                </div>
              </div>
              <button class="btn-icon" @click="close" aria-label="Close">✕</button>
            </div>

            <div class="flex flex-col gap-2">
              <!-- right: history -->
              <div class="md:col-span-5">
                <div class="rounded-lg border bg-white p-2">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="text-sm font-semibold text-gray-800">Shift history</h4>
                    <span class="text-xs text-gray-500">{{ historyCount }} item(s)</span>
                  </div>

                  <div v-if="!history.length" class="text-sm text-gray-500">
                    No history found
                  </div>

                  <ul v-else>
                    <li v-for="(h, idx) in history" :key="h.id ?? idx" class="flex items-start gap-3">
                      <input type="checkbox" class="mt-1 rounded border-gray-300" :checked="h.active" disabled>
                      <div class="flex-1">
                        <div class="flex items-center gap-2">
                          <span class="text-sm text-gray-900">{{ h.name }}</span>
                          <span
                            v-if="h.active"
                            class="inline-flex items-center text-xs font-medium rounded-full bg-green-100 text-green-700 px-2 py-0.5"
                          >Active</span>
                          <span
                            v-else
                            class="inline-flex items-center text-xs font-medium rounded-full bg-gray-100 text-gray-700 px-2 py-0.5"
                          >Closed</span>
                        </div>
                        <div class="mt-0.5 text-xs text-gray-600">
                          Period: {{ h.start_date || '—' }} → {{ h.end_date || 'present' }}
                          <span v-if="h.days" class="ml-2 text-gray-400">({{ h.days }} days)</span>
                        </div>
                        
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <!-- left: form -->
              <div class="rounded-lg border bg-white p-4">
                <div class="grid gap-4 md:grid-cols-12">
                  <div class="md:col-span-12">
                    <label class="block text-sm font-medium text-gray-700">Select Shift</label>
                    <select
                      v-model="form.shift_id"
                      class="mt-1 w-full rounded-md border px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      :disabled="!shiftOptions.length"
                    >
                      <option value="">Choose a shift…</option>
                      <option v-for="s in shiftOptions" :key="s?.id" :value="s?.id">
                        {{ s?.name }}
                      </option>
                    </select>
                    <p class="mt-1 text-xs text-gray-500" v-if="!shiftOptions.length">No shifts found</p>
                  </div>

                  <div class="md:col-span-6">
                    <label class="block text-sm font-medium text-gray-700">Start Date</label>
                    <input v-model="form.start_date" type="date" class="mt-1 w-full rounded-md border px-3 py-2">
                  </div>

                  <!-- <div class="md:col-span-6">
                    <label class="block text-sm font-medium text-gray-700">End Date (optional)</label>
                    <input v-model="form.end_date" type="date" class="mt-1 w-full rounded-md border px-3 py-2">
                  </div> -->
                </div>

                <div class="mt-4 flex justify-end gap-2">
                  <button class="btn-3" @click="close" :disabled="isSaving">Cancel</button>
                  <button class="btn-2" @click="handleAction" :disabled="!canSubmit">
                    <span v-if="!isSaving">{{ current ? 'Update' : 'Assign' }}</span>
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

