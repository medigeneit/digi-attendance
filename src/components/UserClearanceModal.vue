<script setup>
import { computed, onBeforeUnmount, watch, ref, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserClearanceStore } from '@/stores/userClearance'
import UserClearanceSheet from '@/components/UserClearanceSheet.vue'

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
const userDept   = computed(() => currentUserInfo?.value?.department?.name || props.user?.department?.name || '')
const userPost   = computed(() => currentUserInfo?.value?.designation?.title || props.user?.designation?.title  || '')

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

/* Print: show ONLY modal sheet */
async function doPrint(){
  document.body.classList.add('print-modal')
  await nextTick()
  window.print()
  setTimeout(()=> document.body.classList.remove('print-modal'), 0)
}

</script>

<template>
  <!-- Optional trigger -->
  <button v-if="!hideTrigger" :class="buttonClass" @click="openModal">View Clearance</button>

  <!-- Modal -->
  <div v-if="isOpen" class="clearance-modal fixed inset-0 z-50 print:static print:z-auto">
    <div class="clearance-overlay absolute inset-0 bg-black/50 print:hidden" @click="closeModal"></div>

    <div class="clearance-shell absolute inset-0 flex items-start justify-center overflow-y-auto print:static print:inset-auto print:block print:overflow-visible">
      <div class="w-[980px] max-w-[96vw] bg-white rounded-md shadow-2xl
           print:w-[186mm] print:max-w-[186mm] print:rounded-none print:shadow-none print:m-0 print:mt-0">
        <UserClearanceSheet
          class="clearance-print-root"
          :title-user="titleUser"
          :employee-id="employeeId"
          :user-dept="userDept"
          :user-post="userPost"
          :printable-rows="printableRows"
          :loading="loading?.value"
          :error="error?.value"
        />

        <div class="clearance-actions w-[980px] max-w-[96vw] px-2 py-2 flex justify-end gap-2 print:hidden">
          <button class="rounded border px-3 py-1.5 hover:bg-gray-50" @click="doPrint">Print</button>
          <button class="rounded bg-gray-900 px-3 py-1.5 text-white hover:bg-gray-800" @click="closeModal">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- GLOBAL print rules (unscoped) -->
<style>
@media print{
  @page{ size:A4 portrait; margin:10mm 12mm; }
  body.print-modal .clearance-overlay{ display:none !important; }
  body.print-modal .clearance-modal{ position:static !important; inset:auto !important; }
  body.print-modal .clearance-shell{ position:static !important; inset:auto !important; overflow:visible !important; }
  body.print-modal .clearance-print-root{ width:100%; margin:0 auto; }
  body.print-modal .clearance-sheet{
    width:186mm;
    max-width:186mm;
    margin:0 auto;
    box-shadow:none !important;
    border-radius:0 !important;
  }
}
</style>
