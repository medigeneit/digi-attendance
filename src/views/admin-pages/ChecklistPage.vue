<script setup>
import { onMounted, watch, computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useChecklistStore } from '@/stores/checklist'
import ChecklistTable from '@/components/ChecklistTable.vue'

const route = useRoute()
const store = useChecklistStore()

const userId = computed(() => Number(route.params.userId))
const checklistId = computed(() => route.params.checklistId ? Number(route.params.checklistId) : null)
const templateId = computed(() => route.params.templateId ? Number(route.params.templateId) : null)

const pageLoading = ref(false)

// --- progress clamp
function clamp(v, min = 0, max = 100) {
  const n = Number(v || 0)
  return Math.min(Math.max(n, min), max)
}
const completionPct = computed(() => clamp(store.completion))

// --- load by route
async function loadFromRoute() {
  if (!userId.value) return
  pageLoading.value = true
  try {
    if (checklistId.value) {
      await store.fetchChecklist(userId.value, checklistId.value)
    } else if (templateId.value) {
      await store.ensureChecklist(userId.value, templateId.value)
    } else {
      await store.reset()
    }
  } finally {
    pageLoading.value = false
  }
}

onMounted(loadFromRoute)
watch([userId, checklistId, templateId], loadFromRoute)

// --- print helpers
const printMode = ref('blank') // 'blank' | 'filled'
function printNow() { window.print() }

const sortedItems = computed(() =>
  (store.items || []).slice().sort((a, b) => (a.order_no ?? 0) - (b.order_no ?? 0))
)

// item completed?
function isCompleted(item) {
  // support multiple shapes: status === 'COMPLETED' OR boolean flags  
  return item?.status === 'done' 
}

// org header (customize if you have brand data)
const ORG = {
  name: 'GENESIS PG ORIENTATION CENTRE',
  address: '230, New Elephant Road, Katabon Mor, Dhaka-1205',
  title: 'Joining Check List',
  copy: 'Office Copy',
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- screen header -->
    <div class="flex items-start justify-between gap-4 print:hidden">
      <div>
        <h1 class="text-2xl font-semibold">
          {{ store.checklist?.template?.name || 'Checklist' }}
        </h1>
        <p class="text-sm text-gray-500">
          Type: {{ store.checklist?.template?.type || '-' }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-600">Completion</span>
        <div class="w-48 bg-gray-200 rounded-full h-2 overflow-hidden" aria-label="Completion progress">
          <div class="bg-green-500 h-2" :style="{ width: completionPct + '%' }"></div>
        </div>
        <span class="text-sm font-medium">{{ completionPct }}%</span>
      </div>
    </div>

    <!-- screen controls -->
    <div class="flex items-center justify-between print:hidden">
      <div class="text-sm text-gray-600">
        User: <span class="font-medium">{{ store.checklist?.employee?.name || '-' }}</span>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="printMode" class="rounded border px-2 py-1 text-sm">
          <option value="blank">Print: Blank</option>
          <option value="filled">Print: Use current status</option>
        </select>
        <button @click="printNow" class="rounded bg-gray-900 px-3 py-2 text-sm text-white hover:bg-gray-800">
          Print
        </button>
      </div>
    </div>

    <!-- data state -->
    <div v-if="pageLoading || store.loading" class="text-gray-500 print:hidden">Loading…</div>
    <div v-else-if="store.error" class="text-red-600 print:hidden">Failed to load.</div>

    <!-- screen table (interactive) -->
    <ChecklistTable v-else-if="store.checklist" class="print:hidden" :items="store.items" />
    <div v-else class="text-gray-500 print:hidden">No checklist found.</div>

    <!-- PRINT LAYOUT (A4) -->
    <section
      v-if="store.checklist"
      class="hidden print:block print-a4 bg-white text-gray-900"
    >
      <!-- header -->
      <div class="text-center">
        <div class="text-xl font-bold tracking-wide">{{ ORG.name }}</div>
        <div class="text-sm">{{ ORG.address }}</div>
        <div class="mt-2 text-base font-semibold underline">{{ store.checklist?.template?.name || 'Checklist' }}</div>
      </div>
      <div class="text-right text-sm mt-1">( {{ ORG.copy }} )</div>

      <!-- meta fields -->
      <div class="mt-3 grid grid-cols-12 gap-2 text-[12px] leading-5">
        <div class="col-span-4">
          <span class="font-medium">নাম:</span>
          <span class="inline-block min-w-[150px] border-b border-gray-700 ml-2">
            &nbsp;{{ store.checklist?.employee?.name || ' ' }}
          </span>
        </div>
        <div class="col-span-3">
          <span class="font-medium">বিভাগ:</span>
          <span class="inline-block min-w-[120px] border-b border-gray-700 ml-2">
            &nbsp;{{ store.checklist?.employee?.department?.name || ' ' }}
          </span>
        </div>
        <div class="col-span-4">
          <span class="font-medium">যোগদানের তারিখ:</span>
          <span class="inline-block min-w-[110px] border-b border-gray-700 ml-2">
            &nbsp;{{ store.checklist?.employee?.joining_date || ' ' }}
          </span>
        </div>
      </div>

      <!-- table -->
      <table class="mt-3 w-full border border-gray-800 text-[12px] leading-5 print-table">
        <thead>
          <tr class="bg-gray-100">
            <th class="w-12 border border-gray-800 px-2 py-1 text-center">ক্রম.</th>
            <th class="border border-gray-800 px-2 py-1 text-left">বিষয়</th>
            <th class="w-40 border border-gray-800 px-2 py-1 text-center">সম্পন্ন হলে টিক চিহ্ন দিন</th>
            <th class="w-52 border border-gray-800 px-2 py-1 text-left">মন্তব্য</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(it, i) in sortedItems"
            :key="it.id ?? i"
            class="align-top print-row"
          >
            <td class="border border-gray-800 px-2 py-1 text-center">{{ i + 1 }}</td>
            <td class="border border-gray-800 px-2 py-1">
              {{ it._label }}
            </td>
            <td class="border border-gray-800 px-2 py-1 text-center">
              <span class="inline-flex items-center justify-center align-middle border border-gray-900 w-4 h-4">
                <span v-if="it.status == 'done'" class="leading-none text-[12px] font-bold">✓</span>
              </span>
            </td>
            <td class="border border-gray-800 px-2 py-1">&nbsp;</td>
          </tr>
        </tbody>
      </table>

      <!-- footer/signature -->
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

      <div class="mt-12 text-right text-[12px]">
        হেড অব এইচআর
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Print page setup */
@page { size: A4 portrait; margin: 12mm; }

/* Container width tuned for A4 inner area */
.print-a4 { width: 100%; }

/* Prevent row breaking across pages */
.print-row { break-inside: avoid; page-break-inside: avoid; }

/* Make table borders dense on print */
@media print {
  .print-table th, .print-table td { border-color: #111 !important; }
  /* Hide everything else already covered by Tailwind's print:hidden */
}
</style>
