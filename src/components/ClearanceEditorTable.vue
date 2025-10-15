<script setup>
import { onBeforeUnmount, computed } from 'vue'
import HandoverSelect from './HandoverSelect.vue'
import StatusSegment from './StatusSegment.vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },       // itemsForTable (already filtered)
  disabled: { type: Boolean, default: false },    // disable all inputs (e.g., while saving)
  maxHeight: { type: String, default: '60vh' },   // table viewport height
})
const emit = defineEmits(['update:row']) // (tid, patch)

/* ---------- Debounced emitter for text inputs ---------- */
const timers = new Map()
const liveEdited = new Set() // keys currently being edited (pre-emit)
const keyFor = (tid, field) => `${tid}::${field}`

function emitDebounced(tid, field, value, delay = 300) {
  const k = keyFor(tid, field)
  if (timers.has(k)) clearTimeout(timers.get(k))
  liveEdited.add(k)
  timers.set(k, setTimeout(() => {
    emit('update:row', tid, { [field]: value })
    timers.delete(k)
    liveEdited.delete(k)
  }, delay))
}
function emitImmediateTrimmed(tid, field, value) {
  const k = keyFor(tid, field)
  if (timers.has(k)) {
    clearTimeout(timers.get(k))
    timers.delete(k)
  }
  liveEdited.delete(k)
  emit('update:row', tid, { [field]: value?.trim?.() ?? value })
}
onBeforeUnmount(() => {
  timers.forEach(t => clearTimeout(t))
  timers.clear()
  liveEdited.clear()
})

/* ---------- Autosize directive for textareas (no libs) ---------- */
function _resize(el, maxRows = 6) {
  if (typeof window === 'undefined') return
  el.style.height = 'auto'
  const styles = window.getComputedStyle(el)
  const lineHeight = parseFloat(styles.lineHeight) || 20
  const border = (parseFloat(styles.borderTopWidth) || 0) + (parseFloat(styles.borderBottomWidth) || 0)
  const padding = (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0)
  const max = lineHeight * maxRows + border + padding
  el.style.height = Math.min(el.scrollHeight, max) + 'px'
  el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden'
}
const vAutosize = {
  mounted(el, binding) {
    const maxRows = Number(binding?.value?.maxRows ?? 6)
    el.__autosize__ = () => _resize(el, maxRows)
    requestAnimationFrame(el.__autosize__)
    el.addEventListener('input', el.__autosize__)
  },
  updated(el) { el.__autosize__ && el.__autosize__() },
  unmounted(el) {
    el.removeEventListener('input', el.__autosize__)
    delete el.__autosize__
  },
}

/* ---------- Field handlers ---------- */
const onSelectChange = (tid, field, value) => emit('update:row', tid, { [field]: value })
const onInput = (tid, field, e) => emitDebounced(tid, field, e.target.value)
const onBlur  = (tid, field, e) => emitImmediateTrimmed(tid, field, e.target.value)

/* ---------- UI helpers ---------- */
const LIMITS = {
  present_condition: 200,
  receiver_name: 120,
  remarks: 255,
}
const isLive = (tid, field) => liveEdited.has(keyFor(tid, field))
const counterClass = (len, limit) => {
  if (len >= limit) return 'text-red-500'
  if (len >= Math.floor(limit * 0.9)) return 'text-amber-600'
  return 'text-gray-400'
}

/* ---------- Status meta + header summary (colored pills) ---------- */
const STATUS_ORDER = ['PENDING', 'WORKING', 'COMPLETED']
const STATUS_META = {
  PENDING:   { label: 'Pending',   dot: 'bg-amber-500',   pill: 'bg-amber-50 text-amber-800 border-amber-200' },
  WORKING:   { label: 'Working',   dot: 'bg-sky-500',     pill: 'bg-sky-50 text-sky-800 border-sky-200' },
  COMPLETED: { label: 'Completed', dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
}

const statusCounts = computed(() => {
  const acc = { PENDING: 0, WORKING: 0, COMPLETED: 0 }
  for (const r of props.rows) {
    const k = r?.status
    if (k && acc[k] !== undefined) acc[k] += 1
  }
  return acc
})
const statusEntries = computed(() =>
  STATUS_ORDER.map(k => [k, statusCounts.value[k], STATUS_META[k]])
)

/* ---------- Row accent based on status (active feel) ---------- */
const rowAccent = (s) => {
  if (s === 'COMPLETED') return 'border-l-4 border-emerald-400'
  if (s === 'WORKING')   return 'border-l-4 border-sky-400'
  if (s === 'PENDING')   return 'border-l-4 border-amber-400'
  return ''
}
</script>

<template>
  <div class="card overflow-hidden border rounded-xl bg-white shadow-sm print:shadow-none">
    <!-- Header -->
    <div
      class="px-4 py-3 border-b bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70 flex flex-wrap items-center justify-between gap-3"
      aria-live="polite"
    >
      <div class="text-sm text-gray-700">
        <span class="font-medium">Assigned items:</span>
        <span class="ml-1 font-semibold tabular-nums">{{ rows.length }}</span>
      </div>

      <!-- Dynamic status summary with status colors -->
      <div class="flex items-center gap-2 text-xs">
        <template v-for="[key, count, meta] in statusEntries" :key="key">
          <span
            class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1"
            :class="meta.pill"
          >
            <span class="h-1.5 w-1.5 rounded-full" :class="meta.dot" />
            <span class="font-medium">{{ meta.label }}</span>
            <span class="ml-1.5 px-1.5 py-0.5 rounded bg-white/70 border text-[10px] tabular-nums">{{ count }}</span>
          </span>
        </template>
      </div>
    </div>

    <!-- Scroll container with sticky thead -->
    <div class="overflow-auto" :style="{ maxHeight: maxHeight }">
      <table class="w-full text-sm min-w-[980px]">
        <thead class="bg-gray-50 sticky top-0 z-10 backdrop-blur border-b">
          <tr class="text-left text-gray-600">
            <th class="px-3 py-2 w-10">#</th>
            <th class="px-3 py-2">Item</th>
            <th class="px-3 py-2 w-44">Handover</th>
            <th class="px-3 py-2 w-[20rem]">Present Condition</th>
            <th class="px-3 py-2 w-[18rem]">Receiver</th>
            <th class="px-3 py-2 w-[20rem]">Remarks</th>
            <th class="px-3 py-2 w-44">Status</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(r, i) in rows"
            :key="r.template_item_id"
            class="border-t hover:bg-gray-50/70 transition-colors odd:bg-white even:bg-slate-50/40"
            :class="rowAccent(r.status)"
          >
            <!-- Index -->
            <td class="px-3 py-2 align-top text-gray-500 tabular-nums">{{ i + 1 }}</td>

            <!-- Item -->
            <td class="px-3 py-2 align-top">
              <div class="font-medium leading-tight text-gray-900">{{ r.label }}</div>
              <!-- Live editing hint pills -->
              <div class="mt-1 flex flex-wrap gap-1.5 text-[11px] text-amber-700">
                <template v-if="isLive(r.template_item_id, 'present_condition')">
                  <span class="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                    <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span> editing condition…
                  </span>
                </template>
                <template v-if="isLive(r.template_item_id, 'receiver_name')">
                  <span class="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                    <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span> editing receiver…
                  </span>
                </template>
                <template v-if="isLive(r.template_item_id, 'remarks')">
                  <span class="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                    <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span> editing remarks…
                  </span>
                </template>
              </div>
            </td>

            <!-- Handover -->
            <td class="px-3 py-2 align-top print:text-gray-900 print:font-medium">
              <div class="print:hidden">
                <HandoverSelect
                  :disabled="disabled"
                  :model-value="r.handover_status"
                  @update:model-value="v => onSelectChange(r.template_item_id, 'handover_status', v)"
                />
              </div>
              <div class="hidden print:block">
                {{ r.handover_status || '—' }}
              </div>
            </td>

            <!-- Present Condition -->
            <td class="px-3 py-2 align-top">
              <div class="relative group">
                <textarea
                  v-autosize="{ maxRows: 6 }"
                  :disabled="disabled"
                  class="w-full resize-none bg-white border border-gray-300 rounded-lg px-3 py-2 leading-6 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 disabled:bg-gray-50"
                  :value="r.present_condition"
                  :placeholder="`e.g., OK / minor scratches / not applicable`"
                  :maxlength="LIMITS.present_condition"
                  rows="2"
                  spellcheck="true"
                  aria-label="Present condition"
                  :aria-describedby="`pcounter-${r.template_item_id}`"
                  @input="e => onInput(r.template_item_id, 'present_condition', e)"
                  @blur="e => onBlur(r.template_item_id, 'present_condition', e)"
                />
                <div
                  class="absolute bottom-1 right-2 text-[10px] select-none"
                  :id="`pcounter-${r.template_item_id}`"
                  :class="counterClass(r.present_condition?.length || 0, LIMITS.present_condition)"
                >
                  {{ (r.present_condition?.length || 0) }}/{{ LIMITS.present_condition }}
                </div>
              </div>
              <!-- Print value -->
              <div class="hidden print:block text-gray-900 whitespace-pre-wrap">{{ r.present_condition || '—' }}</div>
            </td>

            <!-- Receiver -->
            <td class="px-3 py-2 align-top">
              <div class="relative">
                <textarea
                  v-autosize="{ maxRows: 4 }"
                  :disabled="disabled"
                  class="w-full resize-none bg-white border border-gray-300 rounded-lg px-3 py-2 leading-6 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 disabled:bg-gray-50"
                  :value="r.receiver_name"
                  placeholder="Receiver name(s), designation — one per line if multiple"
                  :maxlength="LIMITS.receiver_name"
                  rows="2"
                  spellcheck="true"
                  aria-label="Receiver name"
                  :aria-describedby="`rcounter-${r.template_item_id}`"
                  @input="e => onInput(r.template_item_id, 'receiver_name', e)"
                  @blur="e => onBlur(r.template_item_id, 'receiver_name', e)"
                />
                <div
                  class="absolute bottom-1 right-2 text-[10px] select-none"
                  :id="`rcounter-${r.template_item_id}`"
                  :class="counterClass(r.receiver_name?.length || 0, LIMITS.receiver_name)"
                >
                  {{ (r.receiver_name?.length || 0) }}/{{ LIMITS.receiver_name }}
                </div>
              </div>
              <div class="hidden print:block text-gray-900 whitespace-pre-wrap">{{ r.receiver_name || '—' }}</div>
            </td>

            <!-- Remarks -->
            <td class="px-3 py-2 align-top">
              <div class="relative">
                <textarea
                  v-autosize="{ maxRows: 6 }"
                  :disabled="disabled"
                  class="w-full resize-none bg-white border border-gray-300 rounded-lg px-3 py-2 leading-6 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 disabled:bg-gray-50"
                  :value="r.remarks"
                  placeholder="Remarks (optional)"
                  :maxlength="LIMITS.remarks"
                  rows="2"
                  spellcheck="true"
                  aria-label="Remarks"
                  :aria-describedby="`rmcounter-${r.template_item_id}`"
                  @input="e => onInput(r.template_item_id, 'remarks', e)"
                  @blur="e => onBlur(r.template_item_id, 'remarks', e)"
                />
                <div
                  class="absolute bottom-1 right-2 text-[10px] select-none"
                  :id="`rmcounter-${r.template_item_id}`"
                  :class="counterClass(r.remarks?.length || 0, LIMITS.remarks)"
                >
                  {{ (r.remarks?.length || 0) }}/{{ LIMITS.remarks }}
                </div>
              </div>
              <div class="hidden print:block text-gray-900 whitespace-pre-wrap">{{ r.remarks || '—' }}</div>
            </td>

            <!-- Status -->
            <td class="px-3 py-2 align-top">
              <div class="print:hidden">
               <StatusSegment
                  :disabled="disabled"
                  :model-value="r.status"
                  @update:model-value="v => onSelectChange(r.template_item_id, 'status', v)"
                />

              </div>
              <div class="hidden print:block text-gray-900 font-medium">
                {{ r.status || '—' }}
              </div>
            </td>
          </tr>

          <!-- Empty state -->
          <tr v-if="rows.length === 0">
            <td colspan="7" class="px-3 py-12">
              <div class="flex flex-col items-center justify-center text-center border border-dashed rounded-xl p-8 bg-slate-50">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M3 7h18M3 12h18M3 17h18M7 3v18" />
                </svg>
                <div class="text-sm text-gray-700 font-medium">No items to show</div>
                <p class="text-xs text-gray-500 mt-1">Choose a department & template to load assigned clearance items.</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
textarea::-webkit-scrollbar { width: 6px; height: 6px; }
textarea::-webkit-scrollbar-thumb { background-color: rgb(203 213 225); border-radius: 8px; }

@media print {
  .card { box-shadow: none; border: none; }
  textarea { display: none !important; }
}
</style>
