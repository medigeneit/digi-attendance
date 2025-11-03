<script setup>
import { ref, reactive, watch, onBeforeUnmount, nextTick } from 'vue'
import HandoverSelect from './HandoverSelect.vue'
import StatusSegment from './StatusSegment.vue'

/* ---------- Props & Emits ---------- */
const props = defineProps({
  rows: { type: Array, default: () => [] },   // itemsForTable
  maxHeight: { type: String, default: '60vh' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:row'])       // (tid, patch)

/* ---------- Local (optimistic) copy ---------- */
const internalRows = ref([])
const byId = (r) => r?.template_item_id ?? r?.id
const cloneRows = (list = []) => list.map(r => ({ ...r }))
watch(() => props.rows, (v) => { internalRows.value = cloneRows(v ?? []) }, { immediate: true })

/* ---------- UI helpers ---------- */
const STATUS_META = {
  PENDING:   { label: 'Pending',   dot: 'bg-amber-500',   pill: 'bg-amber-50 text-amber-800 border-amber-200' },
  WORKING:   { label: 'Working',   dot: 'bg-sky-500',     pill: 'bg-sky-50 text-sky-800 border-sky-200' },
  COMPLETED: { label: 'Completed', dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
}

const H_META = {
  YES: { label: 'Yes', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  NO:  { label: 'No',  pill: 'bg-rose-50 text-rose-700 border-rose-200' },
  NA:  { label: 'N/A', pill: 'bg-slate-50 text-slate-700 border-slate-200' },
}

const rowAccent = (s) =>
  s === 'COMPLETED' ? 'border-l-4 border-emerald-400'
: s === 'WORKING'   ? 'border-l-4 border-sky-400'
: s === 'PENDING'   ? 'border-l-4 border-amber-400' : ''

// Receiver field visibility control (no badges/text shown)
const showReceiver = (r) =>
  typeof r?.show_receiver !== 'undefined' ? !!r.show_receiver : (r?.handover_to !== 'departmental_incharge')

/* ---------- Edit Modal ---------- */
const LIMITS = { present_condition: 200, receiver_name: 120, remarks: 255 }
const editOpen  = ref(false)
const editIndex = ref(-1)
const editForm  = reactive({
  handover_status: 'NA',
  present_condition: '',
  receiver_name: '',
  remarks: '',
  status: 'PENDING',
  show_receiver: true,
})
const editErrors = reactive({})

function openEditByRow(row, index) {
  editIndex.value = index
  editForm.handover_status   = row.handover_status ?? 'NA'
  editForm.present_condition = row.present_condition ?? ''
  editForm.receiver_name     = row.receiver_name ?? ''
  editForm.remarks           = row.remarks ?? ''
  editForm.status            = row.status ?? 'PENDING'
  editForm.show_receiver     = showReceiver(row)
  Object.keys(editErrors).forEach(k => delete editErrors[k])
  editOpen.value = true
  nextTick(() => {/* focus if needed */})
}

function validateEdit() {
  Object.keys(editErrors).forEach(k => delete editErrors[k])
  if (!['YES','NO','NA'].includes(editForm.handover_status)) editErrors.handover_status = 'Select YES / NO / NA'
  if ((editForm.present_condition?.length || 0) > LIMITS.present_condition) editErrors.present_condition = `Max ${LIMITS.present_condition} chars`
  if (editForm.show_receiver && (editForm.receiver_name?.length || 0) > LIMITS.receiver_name) editErrors.receiver_name = `Max ${LIMITS.receiver_name} chars`
  if ((editForm.remarks?.length || 0) > LIMITS.remarks) editErrors.remarks = `Max ${LIMITS.remarks} chars`
  if (!['PENDING','WORKING','COMPLETED'].includes(editForm.status)) editErrors.status = 'Invalid status'
  return Object.keys(editErrors).length === 0
}

function saveEdit() {
  if (!validateEdit()) return
  const idx = editIndex.value
  if (idx < 0) return
  const row = internalRows.value[idx]
  const id  = Number(byId(row))

  const patch = {
    handover_status: editForm.handover_status,
    present_condition: editForm.present_condition?.trim?.() ?? editForm.present_condition,
    receiver_name: editForm.show_receiver ? (editForm.receiver_name?.trim?.() ?? editForm.receiver_name) : '',
    remarks: editForm.remarks?.trim?.() ?? editForm.remarks,
    status: editForm.status,
  }

  // optimistic local update
  internalRows.value[idx] = { ...row, ...patch }

  // notify parent
  emit('update:row', id, { id, template_item_id: id, ...patch })

  editOpen.value = false
}
function closeEdit(){ editOpen.value = false }

/* Keyboard shortcuts in modal */
function onKey(e) {
  if (!editOpen.value) return
  if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); closeEdit() }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter') { e.preventDefault(); saveEdit() }
}
if (typeof window !== 'undefined') window.addEventListener('keydown', onKey)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="card overflow-hidden border rounded-xl bg-white shadow-sm">
    <!-- Header -->
    <div class="px-4 py-3 border-b bg-white/85 backdrop-blur flex items-center justify-between gap-3">
      <div class="text-sm text-gray-700">
        <span class="font-medium">Assigned items:</span>
        <span class="ml-1 font-semibold tabular-nums">{{ internalRows.length }}</span>
      </div>
      <button
        class="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
        :disabled="!internalRows.length"
        @click="openEditByRow(internalRows[0], 0)"
        title="Add/Update clearance"
      >
        ➕ Add/Update clearance
      </button>
    </div>

    <!-- Table (read-only) -->
    <div class="overflow-auto" :style="{ maxHeight: maxHeight }">
      <table class="w-full text-sm min-w-[1020px]">
        <thead class="bg-gray-50 sticky top-0 z-10 backdrop-blur border-b">
          <tr class="text-left text-gray-600">
            <th class="px-3 py-2 w-10">#</th>
            <th class="px-3 py-2">Item</th>
            <th class="px-3 py-2 w-40">Handover</th>
            <th class="px-3 py-2 w-[18rem]">Present Condition</th>
            <th class="px-3 py-2 w-[18rem]">Receiver</th>
            <th class="px-3 py-2 w-[18rem]">Remarks</th>
            <th class="px-3 py-2 w-40">Status</th>
            <th class="px-3 py-2 w-16"></th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(r, i) in internalRows"
            :key="byId(r)"
            class="border-t hover:bg-gray-50 transition-colors cursor-pointer"
            :class="rowAccent(r.status)"
            @click="openEditByRow(r, i)"
          >
            <td class="px-3 py-2 align-top text-gray-500 tabular-nums">{{ i + 1 }}</td>

            <td class="px-3 py-2 align-top">
              <div class="font-medium text-gray-900">{{ r.label }}</div>
              <div class="text-[11px] text-gray-500">#{{ byId(r) }}</div>
            </td>

            <!-- Handover (badge only) -->
            <td class="px-3 py-2 align-top">
              <span
                class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
                :class="(H_META[r.handover_status]?.pill) || 'bg-slate-50 text-slate-700 border-slate-200'"
              >
                <span class="font-medium">{{ H_META[r.handover_status]?.label || r.handover_status || 'N/A' }}</span>
              </span>
            </td>

            <td class="px-3 py-2 align-top">
              <div class="whitespace-pre-wrap text-gray-900">{{ r.present_condition || '—' }}</div>
            </td>

            <!-- Receiver: no auto text; just hide => show em dash -->
            <td class="px-3 py-2 align-top">
              <template v-if="showReceiver(r)">
                <div class="whitespace-pre-wrap text-gray-900">{{ r.receiver_name || '—' }}</div>
              </template>
              <template v-else>
                <div class="text-gray-400">—</div>
              </template>
            </td>

            <td class="px-3 py-2 align-top">
              <div class="whitespace-pre-wrap text-gray-900">{{ r.remarks || '—' }}</div>
            </td>

            <td class="px-3 py-2 align-top">
              <span
                class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
                :class="(STATUS_META[r.status]?.pill) || 'bg-slate-50 text-slate-700 border-slate-200'"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="STATUS_META[r.status]?.dot || 'bg-slate-400'"></span>
                <span class="font-medium">{{ STATUS_META[r.status]?.label || r.status || '—' }}</span>
              </span>
            </td>

            <td class="px-3 py-2 align-top" @click.stop>
              <button
                class="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs hover:bg-gray-50"
                @click="openEditByRow(r, i)"
                title="Edit"
              >✎ Edit</button>
            </td>
          </tr>

          <tr v-if="internalRows.length === 0">
            <td colspan="8" class="px-3 py-12">
              <div class="flex flex-col items-center justify-center text-center border border-dashed rounded-xl p-8 bg-slate-50">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7h18M3 12h18M3 17h18M7 3v18" />
                </svg>
                <div class="text-sm text-gray-700 font-medium">No items to show</div>
                <p class="text-xs text-gray-500 mt-1">Choose a department & template to load assigned clearance items.</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Edit & Submit Modal -->
    <transition enter-active-class="transition ease-out duration-150" enter-from-class="opacity-0" enter-to-class="opacity-100"
                leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="editOpen" class="fixed inset-0 z-[60] flex items-start md:items-center justify-center bg-black/40 p-4" @click.self="closeEdit" role="dialog" aria-modal="true">
        <div class="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-2xl ring-1 ring-black/5">
          <!-- Header -->
          <div class="sticky top-0 flex items-center justify-between border-b px-5 py-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur">
            <h3 class="text-base font-semibold">Add / Update Clearance</h3>
            <button class="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" @click="closeEdit" title="Close">✕</button>
          </div>

          <!-- Body -->
          <div class="px-5 py-4 space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">Handover</label>
              <HandoverSelect :model-value="editForm.handover_status" @update:model-value="v => (editForm.handover_status = v)" />
              <p v-if="editErrors.handover_status" class="text-xs text-rose-600 mt-1">{{ editErrors.handover_status }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Present Condition</label>
              <textarea
                class="w-full resize-none bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 leading-6 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                v-model="editForm.present_condition"
                :maxlength="LIMITS.present_condition"
                rows="3"
                placeholder="e.g., OK / minor scratches / N/A"
              ></textarea>
              <p v-if="editErrors.present_condition" class="text-xs text-rose-600 mt-1">{{ editErrors.present_condition }}</p>
            </div>

            
            <div>
              <label class="block text-sm font-medium mb-1">Receiver</label>
              <textarea
                class="w-full resize-none bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 leading-6 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                v-model="editForm.receiver_name"
                :maxlength="LIMITS.receiver_name"
                rows="2"
                placeholder="Receiver name(s), designation — one per line"
              ></textarea>
              <p v-if="editErrors.receiver_name" class="text-xs text-rose-600 mt-1">{{ editErrors.receiver_name }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Remarks</label>
              <textarea
                class="w-full resize-none bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 leading-6 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                v-model="editForm.remarks"
                :maxlength="LIMITS.remarks"
                rows="3"
                placeholder="Remarks (optional)"
              ></textarea>
              <p v-if="editErrors.remarks" class="text-xs text-rose-600 mt-1">{{ editErrors.remarks }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Status</label>
              <StatusSegment :model-value="editForm.status" @update:model-value="v => (editForm.status = v)" />
              <p v-if="editErrors.status" class="text-xs text-rose-600 mt-1">{{ editErrors.status }}</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="sticky bottom-0 flex items-center justify-end gap-2 border-t px-5 py-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur">
            <button class="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800" @click="closeEdit">Cancel</button>
            <button class="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white hover:bg-gray-800" @click="saveEdit" title="Save (Ctrl+Enter)">
              Save
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
@media print {
  .card { box-shadow: none; border: none; }
}
</style>
