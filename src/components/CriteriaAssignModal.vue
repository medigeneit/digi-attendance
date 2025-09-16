<script setup>
import { ref, watch, onMounted, computed, nextTick, onBeforeUnmount } from 'vue'
import { useToast } from 'vue-toastification'
import { useKpiAssignmentsStore } from '@/stores/monthly-kpi-assignments'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  userId:     { type: [Number, String], default: '' },
  userLabel:  { type: String, default: '' },
  defaultFrom:{ type: String, default: () => new Date().toISOString().slice(0,10) },
  defaultTo:  { type: String, default: '' },
  // parent থেকে selectedUser.criteria_assignments দিন (array | object | null)
  criteria_assignments: { type: [Object, Array, null], default: null },
})

const emit = defineEmits(['update:modelValue','assigned'])

const toast = useToast()
const open = ref(props.modelValue)
watch(() => props.modelValue, v => (open.value = v))
watch(open, v => emit('update:modelValue', v))

// ----- state -----
const assignStore = useKpiAssignmentsStore()
const isSaving = assignStore.isSaving

const form = ref({
  user_id: String(props.userId || ''),
  criteria_id: '',
  assigned_from: props.defaultFrom,
  assigned_to: props.defaultTo,
  active: true,
})

const criteria = ref([])
const loadingCriteria = ref(false)

function makeLabel(c) {
  const code  = c?.code ? ` ${c.code}` : ''
  const type  = c?.type ? ` — ${c.type}` : ''
  const start = c?.start_month ?? ''
  const end   = c?.end_month ? ` → ${c.end_month}` : ''
  const name  = c?.name || c?.criteria?.name ? ` — ${(c.name || c.criteria?.name)}` : ''
  return `#${c.id}${code}${type} — ${start}${end}${name}`
}

async function loadCriteria() {
  try {
    loadingCriteria.value = true
    const list = await assignStore.fetchAvailableCriteria('')
    criteria.value = Array.isArray(list) ? list : []
  } finally {
    loadingCriteria.value = false
  }
}

const avatarText = computed(() => {
  const label = props.userLabel || String(form.value.user_id || '')
  const parts = label.trim().split(/\s+/)
  const two = (parts[0]?.[0] || '') + (parts[1]?.[0] || '')
  return (two || label[0] || '#').toUpperCase().slice(0,2)
})

function fmt(d) { return d ? String(d).slice(0,10) : '' }

// --- normalize history (array/object → uniform array)
const history = computed(() => {
  const src = props.criteria_assignments
  const arr = Array.isArray(src) ? src.slice() : (src ? [src] : [])
  // প্রত্যেক আইটেম থেকে label/fields normalize
  const norm = arr.map(x => {
    const crit = x.criteria || x // কখনও criteria nested, কখনও flat
    const label = makeLabel({
      id: crit?.id ?? x.criteria_id,
      code: crit?.code,
      type: crit?.type,
      start_month: crit?.start_month ?? x.start_month,
      end_month: crit?.end_month ?? x.end_month,
      name: crit?.name ?? x.criteria_name,
      criteria: crit?.criteria,
    })
    return {
      id: x.id ?? null,
      criteria_id: x.criteria_id ?? crit?.id ?? null,
      label,
      active: !!x.active && (x.assigned_to == null || x.assigned_to === ''),
      assigned_from: fmt(x.assigned_from),
      assigned_to: fmt(x.assigned_to),
      created_at: x.created_at ? new Date(x.created_at).getTime() : 0,
    }
  })
  // sort: active first, then latest from date desc
  return norm.sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    return (b.assigned_from || '').localeCompare(a.assigned_from || '')
  })
})

// pick active/current assignment (for preselect & reassign flow)
const currentAssignment = computed(() => {
  return history.value.find(h => h.active) || history.value[0] || null
})

const hasActiveAssignment = computed(() => !!currentAssignment.value && currentAssignment.value.active)

const isSameCriteria = computed(() => {
  if (!hasActiveAssignment.value) return false
  const cur = Number(currentAssignment.value.criteria_id || 0)
  const sel = Number(form.value.criteria_id || 0)
  return cur > 0 && cur === sel
})

const canSubmit = computed(() =>
  !!form.value.user_id && !!form.value.criteria_id && !isSaving.value && !isSameCriteria.value
)

function close() { open.value = false }

async function submit() {
  try {
    if (!form.value.user_id)     return toast.error('Employee নির্বাচন করুন')
    if (!form.value.criteria_id) return toast.error('Criteria নির্বাচন করুন')

    if (isSameCriteria.value) {
      toast.info('এই criteria আগেই active আছে')
      return
    }

    // if active exists → close it first
    if (hasActiveAssignment.value && currentAssignment.value?.id) {
      try {
        await assignStore.close(currentAssignment.value.id)
        toast.success('Previous assignment closed')
      } catch (e) {
        return toast.error(e?.response?.data?.message || 'Failed to close previous assignment')
      }
    }

    const payload = {
      user_id: Number(form.value.user_id),
      criteria_id: Number(form.value.criteria_id),
      assigned_from: form.value.assigned_from,
      assigned_to: form.value.assigned_to || null,
      active: !!form.value.active,
    }
    const res = await assignStore.create(payload)
    toast.success('Assigned')
    emit('assigned', res?.data || res)
    close()
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed')
  }
}

// sync user id
watch(() => props.userId, v => { form.value.user_id = String(v || '') })

// preselect on open/prop change
watch([open, history], () => {
  if (!open.value) return
  const curId = currentAssignment.value?.criteria_id
  if (curId) form.value.criteria_id = String(curId)
})

onMounted(async () => {
  form.value.user_id = String(props.userId || '')
  await loadCriteria()
})

// keyboard UX
function onKey(e) {
  if (!open.value) return
  if (e.key === 'Escape') close()
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter' && canSubmit.value) submit()
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
          <div class="relative w-full max-w-4xl rounded-2xl bg-white shadow-xl ring-1 ring-black/5 p-5">
            <!-- header -->
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold">
                  {{ avatarText }}
                </div>
                <div>
                  <h3 class="text-base font-semibold text-gray-900">Assign KPI Criteria</h3>
                  <p class="text-xs text-gray-500">{{ userLabel || ('#' + form.user_id) }}</p>
                </div>
              </div>
              <button class="btn-icon" @click="close" aria-label="Close">✕</button>
            </div>

            <div class="grid gap-5 md:grid-cols-12">
              <!-- left: assign -->
              <div class="md:col-span-7">
                <div class="rounded-lg border bg-white p-4">
                  <div class="grid gap-4 md:grid-cols-12">
                    <div class="md:col-span-12">
                      <label class="block text-sm font-medium text-gray-700">Criteria</label>
                      <select
                        v-model="form.criteria_id"
                        class="mt-1 w-full rounded-md border px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        :disabled="loadingCriteria || !criteria.length"
                      >
                        <option value="">Select a criteria…</option>
                        <option v-for="c in criteria" :key="c.id" :value="c.id">
                          {{ makeLabel(c) }}
                        </option>
                      </select>
                      <p class="mt-1 text-xs text-gray-500" v-if="loadingCriteria">Loading criteria…</p>
                      <p class="mt-1 text-xs text-gray-500" v-else-if="!criteria.length">No criteria found</p>

                      <div class="mt-2">
                        <p v-if="isSameCriteria" class="text-xs text-blue-600">
                          এই criteria আগেই active আছে।
                        </p>
                        <p v-else-if="hasActiveAssignment && form.criteria_id" class="text-xs text-amber-600">
                          Reassign করলে আগের assignment close হবে এবং নতুনটি তৈরি হবে।
                        </p>
                      </div>
                    </div>

                    <div class="md:col-span-5">
                      <label class="block text-sm font-medium text-gray-700">From</label>
                      <input v-model="form.assigned_from" type="month" class="mt-1 w-full rounded-md border px-3 py-2">
                    </div>
                    <div class="md:col-span-5">
                      <label class="block text-sm font-medium text-gray-700">To (optional)</label>
                      <input v-model="form.assigned_to" type="month" class="mt-1 w-full rounded-md border px-3 py-2">
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
                      <span v-if="!isSaving">{{ hasActiveAssignment ? (isSameCriteria ? 'Assigned' : 'Reassign') : 'Assign' }}</span>
                      <span v-else>Processing…</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- right: history -->
              <div class="md:col-span-5">
                <div class="rounded-lg border bg-white p-4">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="text-sm font-semibold text-gray-800">Criteria history</h4>
                    <span class="text-xs text-gray-500">{{ history.length }} item(s)</span>
                  </div>

                  <div v-if="!history.length" class="text-sm text-gray-500">
                    No assignment history
                  </div>

                  <ul v-else class="divide-y">
                    <li v-for="(h, idx) in history" :key="h.id ?? idx" class="py-3 flex items-start gap-3">
                      <!-- readonly active checkbox -->
                      <input type="checkbox" class="mt-1 rounded border-gray-300" :checked="h.active" disabled>

                      <div class="flex-1">
                        <div class="flex items-center gap-2">
                          <span class="text-sm text-gray-900">{{ h.label }}</span>
                          <span
                            v-if="h.active"
                            class="inline-flex items-center text-xs font-medium rounded-full bg-green-100 text-green-700 px-2 py-0.5"
                          >
                            Active
                          </span>
                          <span
                            v-else
                            class="inline-flex items-center text-xs font-medium rounded-full bg-gray-100 text-gray-700 px-2 py-0.5"
                          >
                            Closed
                          </span>
                        </div>
                        <div class="mt-0.5 text-xs text-gray-600">
                          Period: {{ h.assigned_from || '—' }} → {{ h.assigned_to || 'present' }}
                        </div>
                        <div class="mt-0.5 text-[11px] text-gray-400">
                          ID: {{ h.id || '—' }}, CID: {{ h.criteria_id || '—' }}
                        </div>
                      </div>
                    </li>
                  </ul>

                  <p class="mt-3 text-[11px] text-gray-500">
                    টিপ: Active পরিবর্তন করতে বাম পাশের ফর্ম থেকে নতুন criteria নির্বাচন করে "Assign/Reassign" করুন।
                  </p>
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
