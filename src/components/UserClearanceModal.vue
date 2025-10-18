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

/* Load */
const load = async () => { if (!props.user?.id) return; s.setUser?.(props.user.id); await s.fetch?.() }

/* Open/Close */
function openModal(){ isOpen.value = true }
function closeModal(){ isOpen.value = false }
function onKeydown(e){ if (e.key === 'Escape') closeModal() }

/* Effects */
watch(isOpen, (v)=>{ if (v){ load(); window.addEventListener('keydown', onKeydown) } else { window.removeEventListener('keydown', onKeydown) } }, { immediate:true })
watch(()=>props.user?.id, (id, old)=>{ if (id && id!==old && isOpen.value) load() })
onBeforeUnmount(()=> window.removeEventListener('keydown', onKeydown))

/* Grouping by handover_to (rowspan) */
const LABELS = {
  departmental_incharge:  'Departmental In-charge',
  technical_support_team: 'Technical Support Team',
  it_incharge:            'IT In-charge',
  hr_department:          'HR Department',
}
const ORDER = ['Departmental In-charge','Technical Support Team','IT In-charge','HR Department']
function mapGroup(row){ const k = String(row?.handover_to||'').toLowerCase(); return LABELS[k] || 'Departmental In-charge' }

const printableRows = computed(()=>{
  const list = Array.isArray(items?.value) ? items.value : []
  const buckets = new Map(ORDER.map(k=>[k,[]]))
  for (const row of list) buckets.get(mapGroup(row))?.push(row)
  for (const [,arr] of buckets.entries()){
    arr.sort((a,b)=>{
      const ao = a.template_order_no ?? a.order_no ?? a.template_item_id ?? a.id ?? 0
      const bo = b.template_order_no ?? b.order_no ?? b.template_item_id ?? b.id ?? 0
      return ao-bo
    })
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
  document.body.classList.add('print-modal')   // <- key
  await nextTick()
  window.print()
  setTimeout(()=> document.body.classList.remove('print-modal'), 0)
}
</script>

<template>
  <!-- Optional trigger -->
  <button v-if="!hideTrigger" :class="buttonClass" @click="openModal">View Clearance</button>

  <!-- Modal -->
  <div v-if="isOpen" class="fixed inset-0 z-50 print:static print:z-auto">
    <div class="absolute inset-0 bg-black/50 print:hidden" @click="closeModal"></div>

    <div class="absolute inset-0 flex items-start justify-center overflow-y-auto print:block print:overflow-visible">
      <!-- Printable Sheet (tagged => modal-print) -->
      <div class="modal-print mt-6 mb-10 w-[1150px] max-w-[96vw] rounded-2xl bg-white shadow-2xl
                  print:w-[210mm] print:max-w-[210mm] print:rounded-none print:shadow-none print:m-0 print:mt-0">
        <!-- Header -->
        <div class="px-6 pt-6 pb-4 border-b print:px-[12mm] print:pt-[10mm] print:pb-[4mm]">
          <div class="text-center">
            <h1 class="text-2xl font-extrabold tracking-wide print:text-[20px]">GENESIS PG ORIENTATION CENTRE</h1>
            <p class="text-sm text-gray-600 print:text-[12px]">230, New Elephant Road, Katabon Mor, Dhaka-1205</p>
          </div>

          <!-- Better form lines -->
          <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm print:text-[12px]">
            <div class="form-row">
              <span class="label">Name:</span>
              <span class="value">
                <span class="value-text font-medium">{{ titleUser }}</span>
                <span v-if="employeeId" class="value-extra">(ID: {{ employeeId }})</span>
              </span>
            </div>
            <div class="form-row">
              <span class="label">Department:</span>
              <span class="value"><span class="value-text">{{ userDept || '—' }}</span></span>
            </div>
            <div class="form-row">
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
                <th class="border border-gray-800 text-left px-2 py-1 w-[28mm]">Handover To</th>
                <th class="border border-gray-800 text-left px-2 py-1 w-[70mm]">
                  Particulars <span class="block text-[11px] text-gray-600">Cleared by</span>
                </th>
                <th class="border border-gray-800 text-left px-2 py-1 w-[28mm]">Handed over (Yes/No)</th>
                <th class="border border-gray-800 text-left px-2 py-1">Present Conditions (note please)</th>
                <th class="border border-gray-800 text-left px-2 py-1 w-[42mm]">Receiver’s Name</th>
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

              <tr v-for="item in printableRows" :key="item.row.id" class="align-top">
                <td class="border border-gray-800 px-2 py-1 align-top tabular-nums">{{ item.sl }}.</td>
                <td v-if="item.isGroupFirst" :rowspan="item.groupSpan" class="border border-gray-800 px-2 py-1 align-top font-medium">
                  {{ item.group }}
                </td>
                <td class="border border-gray-800 px-2 py-1">
                  <div class="font-medium">
                    {{ item.row.template_item_name || `#${item.row.template_item_id}` }}
                  </div>
                  <div class="text-[11px] text-gray-700 mt-0.5">
                    Cleared by: <strong>{{ item.row.cleared_by_user?.name || (item.row.cleared_by ? `#${item.row.cleared_by}` : '—') }}</strong>
                    <span v-if="item.row.cleared_at" class="text-gray-500">
                      ({{ new Date(item.row.cleared_at).toLocaleString() }})
                    </span>
                  </div>
                </td>
                <td class="border border-gray-800 px-2 py-1">
                  <span class="inline-block min-w-[22mm] text-center font-semibold">{{ prettyYesNo(item.row.handover_status) }}</span>
                </td>
                <td class="border border-gray-800 px-2 py-1">
                  <div class="whitespace-pre-line">{{ item.row.present_condition || '—' }}</div>
                </td>
                <td class="border border-gray-800 px-2 py-1">
                  <div>{{ item.row.receiver_name || '—' }}</div>
                  <div v-if="item.row.remarks" class="text-[11px] text-gray-600 mt-0.5">{{ item.row.remarks }}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Signatures -->
          <div class="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm print:text-[12px]">
            <div class="border-t border-gray-800 pt-6 text-center"><div class="font-medium">User Signature</div></div>
            <div class="border-t border-gray-800 pt-6 text-center"><div class="font-medium">Received by Head of HR</div></div>
            <div class="border-t border-gray-800 pt-6 text-center"><div class="font-medium">Verified by ACC/CC</div></div>
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
  /* ডিফল্টে modal print-section হাইড থাকবে */
  .modal-print{ display:none !important; }
  /* শুধু modal থেকে Print দিলে (body.print-modal) সেটি দেখাও, এবং page-print লুকাও */
  body.print-modal .modal-print{ display:block !important; }
  body.print-modal .page-print{ display:none !important; }
  /* modal layout normal flow */
  .modal-print .fixed, .modal-print .absolute{ position:static !important; inset:auto !important; }
}
</style>
