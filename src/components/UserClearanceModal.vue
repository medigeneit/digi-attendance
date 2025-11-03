<script setup>
import { computed, onBeforeUnmount, watch, ref, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserClearanceStore } from '@/stores/userClearance'

const props = defineProps({
  user: { type: Object, required: true },
  open: { type: Boolean, default: false }, // v-model:open
  buttonClass: { type: String, default: 'px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700' },
  hideTrigger: { type: Boolean, default: false },
})
const emit = defineEmits(['update:open'])
const isOpen = computed({ get: () => props.open, set: v => emit('update:open', v) })

/* Store */
const s = useUserClearanceStore()
const { items, loading, error, currentUserInfo } = storeToRefs(s)

/* Header fields */
const titleUser  = computed(() => currentUserInfo?.value?.name || props.user?.name || `#${props.user?.id}`)
const employeeId = computed(() => currentUserInfo?.value?.employee_id || props.user?.employee_id || '')
const userDept   = computed(() => currentUserInfo?.value?.department_name || props.user?.department_name || '')
const userPost   = computed(() => currentUserInfo?.value?.post || currentUserInfo?.value?.designation || props.user?.post || '')

/* Open/Close */
function openModal(){ isOpen.value = true }
function closeModal(){ isOpen.value = false }
function onKeydown(e){ if (e.key === 'Escape') closeModal() }

/* Load on open / user change */
const load = async () => { if (!props.user?.id) return; s.setUser?.(props.user.id); await s.fetch?.() }
watch(isOpen, (v)=>{ if (v){ load(); window.addEventListener('keydown', onKeydown) } else { window.removeEventListener('keydown', onKeydown) } }, { immediate:true })
watch(()=>props.user?.id, (id, old)=>{ if (id && id!==old && isOpen.value) load() })
onBeforeUnmount(()=> window.removeEventListener('keydown', onKeydown))

/* ---------- View-model mapper (robust to missing fields) ---------- */
function toVM(row = {}) {
  const latest = row.latest || null
  const clearedBy = latest?.cleared_by || null

  return {
    id: row.template_item_id ?? row.id,
    template_item_id: row.template_item_id ?? row.id,
    label: row.label || row.template_item_name || row.item_key || `#${row.template_item_id ?? row.id}`,
    order_no: row.order_no ?? row.template_order_no ?? 0,
    handover_to: row.handover_to || 'departmental_incharge',
    handover_by: row.handover_user || 'departmental_incharge',
    show_receiver: !!row.show_receiver,
    is_cleared: !!row.is_cleared,
    missing: !!row.missing,

    // flattened from latest clearance (if any)
    status: latest?.status ?? null,
    handover_status: latest?.handover_status ?? null,
    present_condition: latest?.present_condition ?? '',
    receiver_name: row.show_receiver ? (latest?.receiver_name ?? '') : '', // hidden -> blank
    remarks: latest?.remarks ?? '',
    cleared_by_user: clearedBy ? { id: clearedBy.id, name: clearedBy.name } : null,
    cleared_at: latest?.cleared_at || null,
  }
}

/* Grouping by handover_to (rowspan) */
const LABELS = {
  departmental_incharge:  'Departmental In-charge',
  technical_support_team: 'Technical Support Team',
  it_incharge:            'IT In-charge',
  hr_department:          'HR Department',
  inventory_incharge:     'Inventory In-charge',
}
const ORDER = [
  'Departmental In-charge',
  'Technical Support Team',
  'IT In-charge',
  'HR Department',
  'Inventory In-charge',
]
function mapGroupKey(row){
  const k = String(row?.handover_to||'').toLowerCase()
  return LABELS[k] || 'Departmental In-charge'
}

/* Items -> VM -> grouped printable rows */
const rowsVM = computed(() => {
  const arr = Array.isArray(items?.value) ? items.value : []
  return arr.map(toVM)
})

const printableRows = computed(()=>{
  const buckets = new Map(ORDER.map(k=>[k,[]]))
  for (const r of rowsVM.value) {
    buckets.get(mapGroupKey(r))?.push(r)
  }
  for (const [,arr] of buckets.entries()){
    arr.sort((a,b)=> (a.order_no ?? a.template_item_id ?? a.id ?? 0) - (b.order_no ?? b.template_item_id ?? b.id ?? 0))
  }
  const out=[]; let sl=1
  for (const name of ORDER){
    const rows=buckets.get(name)||[]
    if (!rows.length) continue
    rows.forEach((row,idx)=> out.push({ sl:sl++, group:name, isGroupFirst:idx===0, groupSpan:rows.length, row }))
  }
  return out
})

/* Helpers */
function prettyYesNo(v){
  const t = String(v ?? '').trim().toLowerCase()
  if (['y','yes','true','1','done','cleared','complete','completed','yes.','yes,'].includes(t)) return 'Yes'
  if (['n','no','false','0','pending','not done','incomplete','no.','no,','rejected'].includes(t)) return 'No'
  return '—'
}

/* Print: show ONLY modal sheet */
async function doPrint(){
  document.body.classList.add('print-modal')
  await nextTick()
  window.print()
  setTimeout(()=> document.body.classList.remove('print-modal'), 0)
}

const STATUS_META = {
  PENDING:   { label: 'Pending',   pill: 'bg-amber-50 text-amber-800 border-amber-200',   dot: 'bg-amber-500' },
  WORKING:   { label: 'Working',   pill: 'bg-sky-50 text-sky-800 border-sky-200',         dot: 'bg-sky-500' },
  COMPLETED: { label: 'Completed', pill: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
}

function statusLabel(row){
  if (row?.missing) return 'Pending'
  const k = String(row?.status || '').toUpperCase()
  return STATUS_META[k]?.label || (row?.status || '—')
}
function statusPillClass(row){
  if (row?.missing) return STATUS_META.PENDING.pill
  const k = String(row?.status || '').toUpperCase()
  return STATUS_META[k]?.pill || 'bg-slate-50 text-slate-700 border-slate-200'
}
function statusDotClass(row){
  if (row?.missing) return STATUS_META.PENDING.dot
  const k = String(row?.status || '').toUpperCase()
  return STATUS_META[k]?.dot || 'bg-slate-400'
}
</script>

<template>
  <!-- Optional trigger -->
  <button v-if="!hideTrigger" :class="buttonClass" @click="openModal">View Clearance</button>

  <!-- Modal -->
  <div v-if="isOpen" class="fixed inset-0 z-50 print:static print:z-auto">
    <div class="absolute inset-0 bg-black/50 print:hidden" @click="closeModal"></div>

    <div class="absolute inset-0 flex items-start justify-center overflow-y-auto print:block print:overflow-visible">
      <!-- Printable Sheet -->
      <div class="modal-print mt-6 mb-10 w-[1150px] max-w-[96vw] rounded-2xl bg-white shadow-2xl
                  print:w-[210mm] print:max-w-[210mm] print:rounded-none print:shadow-none print:m-0 print:mt-0">
        <!-- Header -->
        <div class="px-6 pt-6 pb-4 border-b print:px-[12mm] print:pt-[10mm] print:pb-[4mm]">
          <div class="text-center">
            <h1 class="text-2xl font-extrabold tracking-wide print:text-[20px]">GENESIS PG ORIENTATION CENTRE</h1>
            <p class="text-sm text-gray-600 print:text-[12px]">230, New Elephant Road, Katabon Mor, Dhaka-1205</p>
          </div>

          <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm print:text-[12px]">
            <div class="flex gap-2">
              <span class="label">Name:</span>
              <span>
                <span class="font-medium">{{ titleUser }}</span>
                <span v-if="employeeId" class="value-extra">(ID: {{ employeeId }})</span>
              </span>
            </div>
            <div class="flex gap-2">
              <span class="label">Department:</span>
              <span class="value"><span class="value-text">{{ userDept || '—' }}</span></span>
            </div>
            <div class="flex gap-2">
              <span class="label">Post:</span>
              <span class="value"><span class="value-text">{{ userPost || '—' }}</span></span>
            </div>
          </div>

          <div class="mt-4 text-center">
            <h2 class="inline-block text-base font-semibold px-4 py-1 border rounded print:text-[13px]">
              Employment Resignation Checklist
            </h2>
          </div>
        </div>

        <!-- Actions (screen only) -->
        <div class="px-6 py-3 flex justify-end gap-2 print:hidden">
          <button class="rounded border px-3 py-1.5 hover:bg-gray-50" @click="doPrint">Print</button>
          <button class="rounded bg-gray-900 px-3 py-1.5 text-white hover:bg-gray-800" @click="closeModal">Close</button>
        </div>

        <!-- Table -->
        <div class="px-6 pb-6 print:px-[12mm] print:pb-[12mm] overflow-x-auto print:overflow-visible">
          <table class="w-full border border-gray-800 text-[13px] print:text-[12px]" style="border-collapse:collapse">
            <thead>
              <tr class="bg-gray-100">
                <th class="border border-gray-800 text-left px-2 py-1 w-[14mm]">S. L.</th>
                <th class="border border-gray-800 text-left px-2 py-1 w-[30mm]">Handover To</th>
                <th class="border border-gray-800 text-left px-2 py-1 w-[70mm]">
                  Particulars
                  <span class="block text-[11px] text-gray-600">Cleared by</span>
                </th>
                <th class="border border-gray-800 text-left px-2 py-1 w-[30mm]">Handed over (Yes/No)</th>
                <th class="border border-gray-800 text-left px-2 py-1">Present Conditions (note please)</th>
                <th class="border border-gray-800 text-left px-2 py-1 w-[42mm]">Receiver’s Name</th>
                <th class="border border-gray-800 text-left px-2 py-1 print:hidden">Status</th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="loading?.value">
                <td colspan="6" class="border border-gray-800 text-center py-6 text-gray-600">Loading…</td>
              </tr>
              <tr v-else-if="error?.value">
                <td colspan="6" class="border border-gray-800 text-center py-6 text-red-600">{{ error.value }}</td>
              </tr>
              <tr v-else-if="!printableRows.length">
                <td colspan="6" class="border border-gray-800 text-center py-6 text-gray-600">No items found</td>
              </tr>

              <tr v-for="item in printableRows" :key="item.row.template_item_id" class="align-top">
                <td class="border border-gray-800 px-2 py-1 align-top tabular-nums">{{ item.sl }}.</td>

                <td v-if="item.isGroupFirst" :rowspan="item.groupSpan" class="border border-gray-800 px-2 py-1 align-top font-medium">
                  <span class="text-xs">{{ item.group }}</span>
                </td>

                <!-- Particulars + cleared-by -->
                <td class="border border-gray-800 px-2 py-1">
                  <div class="font-medium">
                    {{ item.row.label }}
                  </div>

                  <!-- Cleared-by line (from latest) -->
                 
                  <div class="text-[11px] text-gray-700 mt-0.5">
                    Cleared by:
                    <strong>
                      {{ item.row.cleared_by_user?.name || (item.row.cleared_by_user?.id ? ('#'+item.row.cleared_by_user.id) : '—') }}
                    </strong>
                    <span v-if="item.row.cleared_at" class="text-gray-500 print:hidden">
                      ({{ new Date(item.row.cleared_at).toLocaleString() }})
                    </span>
                    <span v-if="item.row.missing" class="ml-2 text-amber-700">(pending)</span>
                  </div>
                </td>

                <!-- Handover (Yes/No) -->
                <td class="border border-gray-800 px-2 py-1">
                  <span class="inline-block min-w-[22mm] text-center font-semibold">
                    {{ prettyYesNo(item.row.handover_status) }}
                  </span>
                </td>

                <!-- Present Condition -->
                <td class="border border-gray-800 px-2 py-1">
                  <div class="whitespace-pre-line">{{ item.row.present_condition || '—' }}</div>
                </td>

                <!-- Receiver (hidden when show_receiver=false → em dash) -->
                <td class="border border-gray-800 px-2 py-1">
                  <div>{{ item.row.show_receiver ? (item.row.receiver_name || '—') : '—' }}</div>
                  <div v-if="item.row.remarks" class="text-[11px] text-gray-600 mt-0.5">{{ item.row.remarks }}</div>
                </td>

                <td class="border border-gray-800 px-2 py-1 print:hidden">
                  <span
                        class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium
                              print:bg-white print:text-black print:border-black"
                        :class="statusPillClass(item.row)"
                        :title="item.row.missing ? 'Not cleared yet' : ('Status: ' + statusLabel(item.row))"
                        :aria-label="statusLabel(item.row)"
                      >
                        <span class="h-1.5 w-1.5 rounded-full" :class="statusDotClass(item.row)"></span>
                        {{ statusLabel(item.row) }}
                      </span>
                </td>

              </tr>
            </tbody>
          </table>

          <!-- Signatures -->
          <div class="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm print:text-[12px]">
            <div class="border-gray-800 pt-6 text-center"><div class="font-medium">User Signature</div></div>
            <div class="border-gray-800 pt-6 text-center"><div class="font-medium">Received by Head of HR</div></div>
            <div class="border-gray-800 pt-6 text-center"><div class="font-medium">Verified by ACC/CC</div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- Header form-lines -->
<style scoped>
.form-row{ display:flex; align-items:flex-end; gap:.5rem; }
.form-row .label{ width:6.5rem; color:#6b7280; }
.form-row .value{
  flex:1; min-height:26px; border-bottom:1px solid #d1d5db;
  display:flex; align-items:flex-end; justify-content:space-between; padding-bottom:2px;
}
.form-row .value-text{ line-height:1.1; }
.form-row .value-extra{ font-size:11px; color:#6b7280; margin-left:.5rem; }
@media print{ .form-row .value{ border-bottom-color:#999; min-height:22px; padding-bottom:1px; } }
</style>

<!-- GLOBAL print rules (unscoped) -->
<style>
@media print{
  @page{ size:A4 portrait; margin:10mm 12mm; }
  .modal-print{ display:none !important; }
  body.print-modal .modal-print{ display:block !important; }
  body.print-modal .page-print{ display:none !important; }
  .modal-print .fixed, .modal-print .absolute{ position:static !important; inset:auto !important; }
}
</style>
