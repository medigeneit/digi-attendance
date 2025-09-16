<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import CriteriaAssignModal from '@/components/CriteriaAssignModal.vue'
import { useUserMonthlyKpiStore } from '@/stores/user-monthly-kpi'
import { storeToRefs } from 'pinia'
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const toast = useToast()
const router = useRouter()
const route = useRoute()
const id = Number(route.params.id)

const store = useUserMonthlyKpiStore()
const { current, isLoading, isSaving, error } = storeToRefs(store)

/* ---------- Scores local state ---------- */
const target = ref({ max_score: 0, incharge_score: 0, incharge_comment: '', coordinator_score: 0, coordinator_comment: '', final_score: 0 })
const perf   = ref({ max_score: 0, incharge_score: 0, incharge_comment: '', coordinator_score: 0, coordinator_comment: '', final_score: 0 })

const inchargeObs = ref('')
const coordinatorObs = ref('')

const finalized = computed(() => !!current.value?.finalized_at)
const formMeta  = computed(() => current.value?.form ?? {})

const perfMax   = computed(() => Number(perf.value.max_score || formMeta.value?.performance_mark || 0))
const targetMax = computed(() => Number(target.value.max_score || formMeta.value?.target_marks || 0))

// totals
const grandMax         = computed(() => perfMax.value + targetMax.value)
const inchargeTotal    = computed(() =>
  clamp(perf.value.incharge_score, 0, perfMax.value) +
  clamp(target.value.incharge_score, 0, targetMax.value)
)
const coordinatorTotal = computed(() =>
  clamp(perf.value.coordinator_score, 0, perfMax.value) +
  clamp(target.value.coordinator_score, 0, targetMax.value)
)
const finalTotal       = computed(() =>
  Number(perf.value.final_score || 0) + Number(target.value.final_score || 0)
)

function clamp(n, min, max) {
  let v = Number(n ?? 0); if (!Number.isFinite(v)) v = 0
  return v < min ? min : v > max ? max : v
}
function hydrateBlocks(c) {
  const t = c?.target ?? {}
  target.value = {
    max_score: Number(t.max_score || formMeta.value?.target_marks || 0),
    incharge_score: Number(t.incharge_score || 0),
    incharge_comment: String(t.incharge_comment || ''),
    coordinator_score: Number(t.coordinator_score || 0),
    coordinator_comment: String(t.coordinator_comment || ''),
    final_score: Number(t.final_score || 0),
  }
  const p = c?.performance ?? {}
  perf.value = {
    max_score: Number(p.max_score || formMeta.value?.performance_mark || 0),
    incharge_score: Number(p.incharge_score || 0),
    incharge_comment: String(p.incharge_comment || ''),
    coordinator_score: Number(p.coordinator_score || 0),
    coordinator_comment: String(p.coordinator_comment || ''),
    final_score: Number(p.final_score || 0),
  }
}

/* ---------- Assign/Manage (current.user ভিত্তিক) ---------- */
const emptyHtml = '<em class="text-slate-400">কার্যসম্পাদনের বিবরণ নেই</em>'
const u = computed(() => current.value?.user ?? null)
const cAssign = computed(() => u.value?.criteria_assignments ?? null)
// robust count (array / items[] / count / length)
const criteriaCount = computed(() => {
  const ca = cAssign.value
  if (Array.isArray(ca)) return ca.length
  if (Array.isArray(ca?.items)) return ca.items.length
  if (typeof ca?.count === 'number') return ca.count
  if (typeof ca?.length === 'number') return ca.length
  return 0
})
const assignOpen = ref(false)
function openAssign() {
  if (!u.value) return
  assignOpen.value = true
}
async function afterAssigned(payload) {
  assignOpen.value = false
  try {
    await store.show(id)
    hydrateBlocks(current.value)
    toast.success('Criteria updated')
  } catch (_) {
    // fallback local patch if payload provided
    if (payload && current.value?.user) {
      current.value.user.criteria_assignments = payload.criteria_assignments || payload
    }
  }
}

/* ---------- Load / Save handlers ---------- */
async function load() {
  await store.show(id)
  hydrateBlocks(current.value)
  const obs = current.value?.observations ?? []
  inchargeObs.value = obs.find(o => o.role === 'incharge')?.observation || ''
  coordinatorObs.value = obs.find(o => o.role === 'coordinator')?.observation || ''
}
watch(current, hydrateBlocks)

async function saveTargetText() {
  try {
    await store.updateTarget(id, current.value?.monthly_target || '')
    toast.success('Target text saved')
    await store.show(id)
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to save target')
  }
}
async function saveScore(kind, role) {
  const state = kind === 'target' ? target.value : perf.value
  const max   = kind === 'target' ? targetMax.value : perfMax.value
  const score = role === 'incharge'
    ? clamp(state.incharge_score, 0, max)
    : clamp(state.coordinator_score, 0, max)
  const comment = role === 'incharge' ? state.incharge_comment : state.coordinator_comment

  try {
    await store.rateScore(id, kind, role, score, comment || '')
    toast.success(`${kind} score saved`)
    await store.show(id)
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to save score')
  }
}
async function saveObs(role) {
  try {
    const text = role === 'incharge' ? inchargeObs.value : coordinatorObs.value
    await store.saveObservation(id, role, text)
    toast.success('Observation saved')
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to save')
  }
}
async function finalize() {
  if (!confirm('Finalize this evaluation?')) return
  try {
    await store.finalize(id)
    toast.success('Finalized')
    await store.show(id)
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to finalize')
  }
}

function backToList() { router.push({ name: 'EvaluationList' }) }
onMounted(load)

function printPage() {
  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.print()
  }
}
</script>

<template>
  <div class="space-y-4 px-4 print:px-0 max-w-7xl mx-auto">
    <!-- Actions -->
    <div class="flex items-center justify-between gap-2 sticky top-0 z-10 bg-white/80 backdrop-blur p-2 rounded-b-lg border-b print:hidden">
      <div class="flex items-center gap-2">
        <button class="btn-3" @click="backToList"><i class="far fa-arrow-left"></i><span class="hidden md:flex">Back</span></button>
        <h1 class="title-md md:title-lg">KPI Sheet</h1>
      </div>
      <div class="flex gap-2">
        <button class="btn-2" :disabled="isSaving || finalized || !current" @click="finalize">{{ finalized ? 'Finalized' : 'Finalize' }}</button>
        <button class="btn-3" @click="printPage"><i class="far fa-print mr-1"></i>Print</button>
      </div>
    </div>

    <div v-if="isLoading" class="py-8 text-center"><LoaderView /></div>
    <div v-else-if="error" class="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{{ error }}</div>

    <div v-else-if="current" class="rounded-2xl bg-white p-5 shadow-sm space-y-4">
      <!-- Header -->
      <div class="text-center">
        <h2 class="text-xl font-semibold">Key Performance Indicator (KPI)</h2>
        <p class="text-sm text-gray-600">
          Bi-monthly: {{ current.form?.start_month }}{{ current.form?.end_month ? ` – ${current.form.end_month}` : '' }}
        </p>
      </div>

      <!-- Meta -->
      <div class="grid grid-cols-12 gap-2 text-sm">
        <div class="col-span-6 border p-2 rounded">NAME: <span class="font-medium">{{ current?.user?.name }}</span></div>
        <div class="col-span-3 border p-2 rounded">DESIGNATION: <span class="font-medium">{{ current?.user?.designation }}</span></div>
        <div class="col-span-3 border p-2 rounded">DATE OF JOINING: {{ current?.user?.joining_date }}</div>
        <div class="col-span-6 border p-2 rounded">DEPARTMENT: {{ current?.user?.department }}</div>
        <div class="col-span-3 border p-2 rounded">COMPANY:<span class="font-medium">{{ current?.user?.company }}</span></div>
      </div>

      <!-- Live totals -->
      <div class="grid grid-cols-1 print:grid-cols-3 md:grid-cols-3 gap-2 text-sm">
        <div class="rounded-lg border p-2 text-center">
          <div class="text-gray-500">In-charge total</div>
          <div class="font-semibold">{{ inchargeTotal }} / {{ grandMax }}</div>
        </div>
        <div class="rounded-lg border p-2 text-center">
          <div class="text-gray-500">Coordinator total</div>
          <div class="font-semibold">{{ coordinatorTotal }} / {{ grandMax }}</div>
        </div>
        <div class="rounded-lg border p-2 text-center">
          <div class="text-gray-500">Final (server)</div>
          <div class="font-semibold">{{ finalTotal }} / {{ grandMax }}</div>
        </div>
      </div>

      <!-- Main table -->
      <div class="overflow-x-auto">
        <table class="min-w-full border text-sm">
          <thead>
            <tr class="bg-gray-100 text-gray-800">
              <th class="border px-2 py-2 w-10">ক্রম</th>
              <th class="border px-2 py-2">কার্যসম্পাদন বিষয়</th>
              <th class="border px-2 py-2 w-32 text-right">সর্বোচ্চ</th>
              <th class="border px-2 py-2 w-32 text-right">In-charge</th>
              <th class="border px-2 py-2 w-36 text-right">Coordinator/AD/DD</th>
            </tr>
          </thead>
          <tbody>
            <!-- ১) Performance -->
            <tr>
              <td class="border px-2 py-2 align-top text-center">১</td>
              <td class="border px-2 py-2 align-top">
                <div class="prose prose-sm max-w-none text-slate-700 line-clamp-3" v-if="u?.criteria_assignments?.description"
                     v-html="u?.criteria_assignments?.description"></div>
                <div class="mt-2" v-else>
                  <button
                    @click="openAssign"
                    title="Assign KPI criteria"
                   class="btn-4"
                  >
                    <svg v-if="criteriaCount > 0" viewBox="0 0 24 24" class="h-4 w-4 opacity-90">
                      <path fill="currentColor" d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z"/>
                    </svg>
                    <svg v-else viewBox="0 0 24 24" class="h-4 w-4 opacity-80">
                      <path fill="currentColor" d="M11 11V6h2v5h5v2h-5v5h-2v-5H6v-2z"/>
                    </svg>

                    <span class="ml-1 hidden lg:inline">
                      Assign
                    </span>
                  </button>
                </div>
              </td>
              <td class="border px-2 py-2 align-top text-right">{{ perfMax }}</td>
              <td class="border px-2 py-2 align-top">
                <div class="flex items-center justify-end gap-2">
                  <input type="number" min="0" :max="perfMax" :readonly="finalized"
                         v-model.number="perf.incharge_score"
                         class="w-20 rounded-md border px-2 py-1 text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" />
                  <button class="btn-4 print:hidden" :disabled="isSaving || finalized || !perfMax" @click="saveScore('performance','incharge')">Save</button>
                </div>
              </td>
              <td class="border px-2 py-2 align-top">
                <div class="flex items-center justify-end gap-2">
                  <input type="number" min="0" :max="perfMax" :readonly="finalized"
                         v-model.number="perf.coordinator_score"
                         class="w-20 rounded-md border px-2 py-1 text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" />
                  <button class="btn-4 print:hidden" :disabled="isSaving || finalized || !perfMax" @click="saveScore('performance','coordinator')">Save</button>
                </div>
              </td>
            </tr>

            <!-- ২) Target (text + score) -->
            <tr>
              <td class="border px-2 py-2 align-top text-center">২</td>
              <td class="border px-2 py-2">
                <label class="block text-xs text-gray-600 mb-1">Target (মাসিক লক্ষ্য)</label>
                <textarea rows="3" v-model="current.monthly_target" :readonly="finalized"
                          class="w-full rounded-md border px-2 py-1 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
                          placeholder="এই মাসের স্পষ্ট টার্গেট লিখুন…"></textarea>
                <div class="mt-2 flex justify-end gap-2 print:hidden">
                  <button class="btn-4" :disabled="isSaving || finalized" @click="saveTargetText">Save Target</button>
                </div>
              </td>
              <td class="border px-2 py-2 align-top text-right">{{ targetMax }}</td>
              <td class="border px-2 py-2 align-top">
                <div class="flex items-center justify-end gap-2">
                  <input type="number" min="0" :max="targetMax" :readonly="finalized"
                         v-model.number="target.incharge_score"
                         class="w-20 rounded-md border px-2 py-1 text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" />
                  <button class="btn-4 print:hidden" :disabled="isSaving || finalized || !targetMax" @click="saveScore('target','incharge')">Save</button>
                </div>
              </td>
              <td class="border px-2 py-2 align-top">
                <div class="flex items-center justify-end gap-2">
                  <input type="number" min="0" :max="targetMax" :readonly="finalized"
                         v-model.number="target.coordinator_score"
                         class="w-20 rounded-md border px-2 py-1 text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" />
                  <button class="btn-4 print:hidden" :disabled="isSaving || finalized || !targetMax" @click="saveScore('target','coordinator')">Save</button>
                </div>
              </td>
            </tr>

            <!-- Totals -->
            <tr class="bg-gray-50 font-medium">
              <td class="border px-2 py-2 text-right" colspan="2">সর্বমোট</td>
              <td class="border px-2 py-2 text-right">{{ grandMax }}</td>
              <td class="border px-2 py-2 text-right">{{ inchargeTotal }}</td>
              <td class="border px-2 py-2 text-right">{{ coordinatorTotal }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Observation -->
      <div class="mt-4">
        <div class="text-sm font-semibold mb-2">Observation:</div>
        <div class="grid grid-cols-12 gap-2 text-sm">
          <div class="col-span-2 border p-2 bg-gray-50 rounded">ইনচার্জ</div>
          <div class="col-span-10 border p-2 rounded">
            <textarea rows="3" v-model="inchargeObs" :readonly="finalized"
                      class="w-full rounded-md border px-2 py-1 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"></textarea>
            <div class="mt-2 flex justify-end print:hidden">
              <button class="btn-4" :disabled="isSaving || finalized" @click="saveObs('incharge')">Save</button>
            </div>
          </div>

          <div class="col-span-2 border p-2 bg-gray-50 rounded">বিভাগীয় কো-অর্ডিনেটর</div>
          <div class="col-span-10 border p-2 rounded">
            <textarea rows="3" v-model="coordinatorObs" :readonly="finalized"
                      class="w-full rounded-md border px-2 py-1 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"></textarea>
            <div class="mt-2 flex justify-end print:hidden">
              <button class="btn-4" :disabled="isSaving || finalized" @click="saveObs('coordinator')">Save</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Signature -->
      <div class="grid grid-cols-12 gap-2 pt-4 text-sm">
        <div class="col-span-6 border p-3 rounded">মূল্যায়নকারীর নাম:</div>
        <div class="col-span-6 border p-3 rounded">স্বাক্ষর:</div>
      </div>
    </div>

    <div v-else class="rounded-md border bg-white p-4 text-gray-600">Data not available.</div>

    <!-- Criteria modal: current.user ভিত্তিক, একবারই মাউন্ট -->
    <CriteriaAssignModal
      v-model="assignOpen"
      :user-id="u?.id"
      :user-label="u?.name"
      :criteria_assignments="u?.criteria_assignments"
      @assigned="afterAssigned"
    />
  </div>
</template>

<style scoped>
/* ===== Print-only cleanup (inside this component) ===== */
@media print {
  /* Layout cleanup */
  .print\:hidden { display: none !important; }
  .rounded-2xl, .rounded-lg, .rounded, .rounded-md { border-radius: 0 !important; }
  .shadow, .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl { box-shadow: none !important; }
  .backdrop-blur, .backdrop-blur-sm, .backdrop-blur-md { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }

  /* Table look: crisp B/W */
  thead tr, .bg-gray-50, .bg-gray-100 { background: transparent !important; }
  th, td { padding: 6px 8px !important; }
  th { border-bottom: 1px solid #000 !important; }
  .border { border-color: #555 !important; } /* হালকা ধূসর লাইনের বদলে শার্প */
  .text-gray-500, .text-gray-600, .text-slate-600 { color: #000 !important; }

  /* Description: print-এ clamp খুলে দিন */
  .line-clamp-3 {
    display: block !important;
    -webkit-line-clamp: unset !important;
    overflow: visible !important;
  }

  /* Inputs/textarea/select → Plain text look */
  input, textarea, select {
    appearance: none !important;
    -webkit-appearance: none !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    outline: none !important;
    padding: 0 !important;
  }
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  textarea {
    height: auto !important;
    overflow: visible !important;
    white-space: pre-wrap !important; /* লাইন ব্রেক প্রিজার্ভ */
  }
  /* Placeholder গুলো লুকান */
  ::-webkit-input-placeholder { color: transparent !important; }
  :-ms-input-placeholder { color: transparent !important; }
  ::placeholder { color: transparent !important; }

  /* Action/UI elements */
  .btn-2, .btn-3, .btn-4, button, [role="button"] { display: none !important; }
  a { color: inherit !important; text-decoration: none !important; }

  /* টেবিল/কার্ড পেজ ব্রেক এভয়েড */
  table, .avoid-break { page-break-inside: auto; }
  tr, .card, .rounded-2xl, .rounded-lg { page-break-inside: avoid; }
}

/* Optional: signature line look (screen + print) */
.signature-line {
  position: relative;
  min-height: 36px;
}
@media print {
  .signature-line {
    border: 0 !important; padding: 0 !important;
  }
  .signature-line::after {
    content: "";
    display: block;
    margin-top: 18px;      /* লাইনের উপরে একটু স্পেস */
    border-bottom: 1px solid #000;
    width: 100%;
  }
}
</style>
