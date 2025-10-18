<script setup>
import { onMounted, watch, computed, ref, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useChecklistStore } from '@/stores/checklist'
import ChecklistTable from '@/components/ChecklistTable.vue'
import UserClearanceModal from '@/components/UserClearanceModal.vue'

const route = useRoute()
const store = useChecklistStore()

const userId      = computed(() => Number(route.params.userId))
const checklistId = computed(() => route.params.checklistId ? Number(route.params.checklistId) : null)
const templateId  = computed(() => route.params.templateId  ? Number(route.params.templateId)  : null)

const clearanceOpen = ref(false)
const pageLoading   = ref(false)

/* ---- progress ---- */
function clamp(v, min = 0, max = 100) { const n = Number(v || 0); return Math.min(Math.max(n, min), max) }
const completionPct = computed(() => clamp(store.completion))

/* ---- employee/meta ---- */
const emp = computed(() => store.checklist?.employee || {})
const clearanceUser = computed(() => ({
  id: userId.value,
  name: emp.value?.name ?? `#${userId.value}`,
  department_name: emp.value?.department?.name ?? null,
  post: emp.value?.designation?.title ?? null,
}))

/* ---- boot & data load ---- */
onMounted(() => { if (route.query.open === 'clearance') clearanceOpen.value = true })
async function loadFromRoute() {
  if (!userId.value) return
  pageLoading.value = true
  try {
    if (checklistId.value)      await store.fetchChecklist(userId.value, checklistId.value)
    else if (templateId.value)  await store.ensureChecklist(userId.value, templateId.value)
    else                        await store.reset()
  } finally { pageLoading.value = false }
}
onMounted(loadFromRoute)
watch([userId, checklistId, templateId], loadFromRoute)

/* ---- print controls ---- */
const printMode = ref('blank') // 'blank' | 'filled'
async function printNow(){ await nextTick(); window.print() }

/* ---- table derivations ---- */
const sortedItems = computed(() =>
  (store.items || []).slice().sort((a, b) => (a.order_no ?? 0) - (b.order_no ?? 0))
)
function isChecked(it){
  if (printMode.value === 'blank') return false
  return it?.status === 'done' || it?.status === 'COMPLETED' || it?.done === true
}

/* ---- org header (print) ---- */
const ORG = {
  name: 'GENESIS PG ORIENTATION CENTRE',
  address: '230, New Elephant Road, Katabon Mor, Dhaka-1205',
}
</script>

<template>
  <div >
    <!-- Sticky toolbar -->
    <header class="print:hidden sticky top-0 z-10 -mx-4 md:-mx-6 bg-white/80 backdrop-blur border-b">
      <div class="mx-auto max-w-7xl px-4 md:px-6">
        <div class="py-3 flex flex-wrap items-center gap-3">
          <!-- Left: title + chips -->
          <div class="min-w-0">
            <div class="text-xs uppercase tracking-wide text-gray-500">
              {{ store.checklist?.template?.type || 'Checklist' }}
            </div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg md:text-xl font-semibold leading-tight truncate">
                {{ store.checklist?.template?.name || 'Checklist' }}
              </h1>
              <span v-if="emp?.employee_id"
                    class="hidden sm:inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                ID: {{ emp.employee_id }}
              </span>
            </div>
          </div>

          <!-- Right: progress + actions -->
          <div class="ml-auto flex items-center gap-4">
            <div class="flex items-center gap-2" title="Completion">
              <div class="w-44 h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  class="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500"
                  :style="{ width: completionPct + '%' }"
                />
              </div>
              <span class="text-sm font-medium tabular-nums">{{ completionPct }}%</span>
            </div>

            <button
              v-if="templateId === 2"
              type="button"
              class="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-xs md:text-sm font-medium text-white hover:bg-indigo-700"
              @click="clearanceOpen = true"
            >
              View Clearance
            </button>

            <div class="flex items-center gap-2">
              <div class="inline-flex rounded-md border overflow-hidden">
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs md:text-sm"
                  :class="printMode==='blank' ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'"
                  @click="printMode='blank'">Blank</button>
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs md:text-sm border-l"
                  :class="printMode==='filled' ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'"
                  @click="printMode='filled'">Filled</button>
              </div>
              <button
                class="rounded-md bg-gray-900 px-3 py-2 text-xs md:text-sm font-medium text-white hover:bg-black"
                @click="printNow">Print</button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Page card -->
    <section class="mx-auto max-w-7xl print:hidden">
      <div class="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <!-- Meta strip -->
        <div class="px-4 md:px-6 py-4 border-b bg-gradient-to-b from-white to-gray-50">
          <div class="flex flex-wrap items-end gap-3 text-sm">
            <div class="flex-1 min-w-[220px] form-line">
              <span class="label">Name</span>
              <span class="value">
                {{ emp?.name || '-' }}
                <span v-if="emp?.employee_id" class="muted"> ({{ emp.employee_id }})</span>
              </span>
            </div>
            <div class="flex-1 min-w-[220px] form-line">
              <span class="label">Department</span>
              <span class="value">{{ emp?.department?.name || '—' }}</span>
            </div>
            <div class="flex-1 min-w-[220px] form-line">
              <span class="label">Designation</span>
              <span class="value">{{ emp?.designation?.title || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div class="px-4 md:px-6 py-5">
          <!-- Loading -->
          <div v-if="pageLoading || store.loading" class="space-y-3">
            <div class="h-4 w-40 rounded bg-gray-100 animate-pulse"></div>
            <div class="h-10 w-full rounded bg-gray-100 animate-pulse"></div>
            <div class="h-10 w-full rounded bg-gray-100 animate-pulse"></div>
            <div class="h-10 w-full rounded bg-gray-100 animate-pulse"></div>
          </div>

          <!-- Error -->
          <div v-else-if="store.error" class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">
            Failed to load.
          </div>

          <!-- Content -->
          <ChecklistTable v-else-if="store.checklist" :items="store.items" />
          <div v-else class="rounded-lg border bg-gray-50 p-6 text-gray-600">
            No checklist found.
          </div>
        </div>
      </div>
    </section>

    <!-- Clearance Modal (unchanged behaviour) -->
    <UserClearanceModal
      v-model:open="clearanceOpen"
      :user="clearanceUser"
      :hide-trigger="true"
    />

    <!-- PRINT (A4) -->
    <section v-if="store.checklist" class="hidden print:block bg-white text-gray-900 print-a4">
      <div class="text-center">
        <div class="text-xl font-bold tracking-wide">{{ ORG.name }}</div>
        <div class="text-sm">{{ ORG.address }}</div>
        <div class="mt-2 text-base font-semibold underline">{{ store.checklist?.template?.name || 'Checklist' }}</div>
      </div>
      <div class="text-right text-sm mt-1">( Office Copy )</div>

      <div class="mt-3 grid grid-cols-12 gap-2 text-[12px] leading-5">
        <div class="col-span-4">
          <span class="font-medium">নাম:</span>
          <span class="inline-block min-w-[150px] border-b border-gray-800 ml-2">
            &nbsp;{{ emp?.name || ' ' }}
          </span>
        </div>
        <div class="col-span-4">
          <span class="font-medium">বিভাগ:</span>
          <span class="inline-block min-w-[150px] border-b border-gray-800 ml-2">
            &nbsp;{{ emp?.department?.name || ' ' }}
          </span>
        </div>
        <div class="col-span-4">
          <span class="font-medium">যোগদানের তারিখ:</span>
          <span class="inline-block min-w-[150px] border-b border-gray-800 ml-2">
            &nbsp;{{ emp?.joining_date || ' ' }}
          </span>
        </div>
      </div>

      <table class="mt-3 w-full border border-gray-900 text-[12px] leading-5 print-table">
        <thead class="bg-gray-100">
          <tr>
            <th class="w-12 border border-gray-900 px-2 py-1 text-center">ক্রম.</th>
            <th class="border border-gray-900 px-2 py-1 text-left">বিষয়</th>
            <th class="w-40 border border-gray-900 px-2 py-1 text-center">সম্পন্ন হলে টিক চিহ্ন দিন</th>
            <th class="w-52 border border-gray-900 px-2 py-1 text-left">মন্তব্য</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(it, i) in sortedItems" :key="it.id ?? i" class="align-top print-row">
            <td class="border border-gray-900 px-2 py-1 text-center">{{ i + 1 }}</td>
            <td class="border border-gray-900 px-2 py-1">{{ it._label || it.label }}</td>
            <td class="border border-gray-900 px-2 py-1 text-center">
              <span class="inline-flex items-center justify-center align-middle border border-gray-900 w-4 h-4">
                <span v-if="it.status == 'done'" class="leading-none text-[12px] font-bold">✓</span>
              </span>
            </td>
            <td class="border border-gray-900 px-2 py-1">&nbsp;</td>
          </tr>
        </tbody>
      </table>

      <div class="mt-8 grid grid-cols-2 gap-4 text-[12px]">
        <div>
          <div>কর্মীর স্বাক্ষর: ______________________________</div>
          <div class="mt-2">তারিখ: _____________</div>
        </div>
        <div class="text-right">
          <div>পরীক্ষণকারী: ______________________________</div>
          <div class="mt-2">পদবি: __________________</div>
        </div>
      </div>

      <div class="mt-12 text-right text-[12px]" v-if="!clearanceOpen">হেড অব এইচআর</div>
    </section>
  </div>
</template>

<style scoped>
/* Meta strip form-lines */
.form-line{ display:flex; align-items:flex-end; gap:.5rem; }
.form-line .label{ width:7rem; color:#6b7280; }
.form-line .value{
  flex:1; min-height:28px; border-bottom:1px solid #e5e7eb; padding-bottom:2px;
}
.form-line .muted{ color:#6b7280; font-size:11px; }

/* Print page setup */
@page { size: A4 portrait; margin: 12mm; }
.print-a4{ width:100%; }
.print-row{ break-inside: avoid; page-break-inside: avoid; }
@media print { .print-table th, .print-table td { border-color:#111 !important; } }
</style>
