<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
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

// local states for score blocks
const target = ref({ max_score: 0, incharge_score: 0, incharge_comment: '', coordinator_score: 0, coordinator_comment: '', final_score: 0 })
const perf   = ref({ max_score: 0, incharge_score: 0, incharge_comment: '', coordinator_score: 0, coordinator_comment: '', final_score: 0 })

const inchargeObs = ref('')
const coordinatorObs = ref('')

const finalized = computed(() => !!current.value?.finalized_at)
const formMeta  = computed(() => current.value?.form ?? {})

const perfMax   = computed(() => Number(perf.value.max_score || formMeta.value?.performance_mark || 0))
const targetMax = computed(() => Number(target.value.max_score || formMeta.value?.target_marks || 0))

const grandMax   = computed(() =>  perfMax.value + targetMax.value)
const grandObt   = computed(() =>  Number(perf.value.final_score || 0) + Number(target.value.final_score || 0))

function clamp(n, min, max) {
  let v = Number(n ?? 0); if (!Number.isFinite(v)) v = 0
  return v < min ? min : v > max ? max : v
}

function hydrateBlocks(c) {
  // target from API resource
  const t = c?.target ?? {}
  target.value = {
    max_score: Number(t.max_score || formMeta.value?.target_marks || 0),
    incharge_score: Number(t.incharge_score || 0),
    incharge_comment: String(t.incharge_comment || ''),
    coordinator_score: Number(t.coordinator_score || 0),
    coordinator_comment: String(t.coordinator_comment || ''),
    final_score: Number(t.final_score || 0),
  }
  // performance from API resource
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

async function load() {
  await store.show(id)
  hydrateBlocks(current.value)
  const obs = current.value?.observations ?? []
  inchargeObs.value = obs.find(o => o.role === 'incharge')?.observation || ''
  coordinatorObs.value = obs.find(o => o.role === 'coordinator')?.observation || ''
}
watch(current, hydrateBlocks)

// save handlers
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
</script>

<template>
  <div class="space-y-4 px-4 print:px-0">
    <!-- Actions -->
    <div class="flex items-center justify-between gap-2 sticky top-0 z-10 bg-white/80 backdrop-blur p-2 rounded-b-lg border-b print:hidden">
      <div class="flex items-center gap-2">
        <button class="btn-3" @click="backToList"><i class="far fa-arrow-left"></i><span class="hidden md:flex">Back</span></button>
        <h1 class="title-md md:title-lg">KPI Sheet</h1>
      </div>
      <div class="flex gap-2">
        <button class="btn-2" :disabled="isSaving || finalized || !current" @click="finalize">{{ finalized ? 'Finalized' : 'Finalize' }}</button>
        <button class="btn-3" @click="() => window.print()"><i class="far fa-print mr-1"></i>Print</button>
      </div>
    </div>

    <div v-if="isLoading" class="py-8 text-center"><LoaderView /></div>
    <div v-else-if="error" class="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{{ error }}</div>

    <div v-else-if="current" class="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
      <!-- Header -->
      <div class="text-center">
        <h2 class="text-xl font-semibold">Key Performance Indicator (KPI)</h2>
        <p class="text-sm text-gray-600">
          Bi-monthly: {{ current.form?.start_month }}{{ current.form?.end_month ? ` – ${current.form.end_month}` : '' }}
        </p>
      </div>

      <!-- Meta -->
      <div class="grid grid-cols-12 gap-2 text-sm">
        <div class="col-span-6 border p-2 rounded">NAME: <span class="font-medium">#{{ current.user_id }}</span></div>
        <div class="col-span-3 border p-2 rounded">DESIGNATION:</div>
        <div class="col-span-3 border p-2 rounded">DATE OF JOINING:</div>
        <div class="col-span-6 border p-2 rounded">DEPARTMENT:</div>
        <div class="col-span-3 border p-2 rounded"></div>
        <div class="col-span-3 border p-2 rounded"></div>
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
            <!-- ১) Performance (criteria.description) -->
            <tr>
              <td class="border px-2 py-2 align-top text-center">১</td>
              <td class="border px-2 py-2 align-top">
                <div class="prose prose-sm max-w-none" v-html="current.form?.criteria?.description || '<em>কার্যসম্পাদনের বিবরণ নেই</em>'"></div>
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
              <td class="border px-2 py-2 text-right" colspan="2">{{ grandObt }}</td>
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
  </div>
</template>

<style scoped>
@media print {
  .print\:hidden { display: none !important; }
  .rounded-2xl { border-radius: 0 !important; }
  .btn-2, .btn-3, .btn-4 { display: none !important; }
}
</style>
