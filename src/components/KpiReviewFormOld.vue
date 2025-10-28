<script setup>
import { ref, computed, onMounted } from 'vue'
import { useKpiStore } from '@/stores/kpi'
import { useRoute } from 'vue-router'

const route = useRoute()
const store = useKpiStore()

const marks = ref({})
const strengths = ref(''), gaps = ref(''), suggestions = ref('')
const lanes = ref([])                 // [{key,label,rank,assigned_user_id,can_current_user_review,can_view_marks},...]
const reviewsByLane = ref({})         // { laneKey: [ {marks,obtained,...} ] }
const myLaneKey = ref(null)


const canEdit = computed(() =>
  !!myLaneKey.value &&
  lanes.value.some(l => l.key === myLaneKey.value && l.can_current_user_review)
)


onMounted(async () => {
  if (!store.cycle) await store.fetchActiveCycle()
  const { lanes: L, reviews_by_lane } =
    await store.fetchLanes(store.cycle.id, Number(route.params.employeeId))
  lanes.value = L
  reviewsByLane.value = reviews_by_lane || {}

  // আমার lane
  myLaneKey.value = L.find(x => x.can_current_user_review)?.key || null

  // ডিফল্ট 0
  store.cycle?.groups_json?.forEach(g => g.items.forEach(it => marks.value[it.id] = 0))

  // আমার lane-এ আগের মার্ক থাকলে লোড
  const myExisting = (reviewsByLane.value[myLaneKey.value] || [])[0]
  if (myExisting?.marks) Object.assign(marks.value, myExisting.marks)
})

const totals = computed(() => {
  let max = 0, got = 0
  store.cycle?.groups_json?.forEach(g => g.items.forEach(it => {
    max += Number(it.max||0)
    const v = Number(marks.value[it.id]||0)
    got += Math.min(Math.max(v,0), Number(it.max||0))
  }))
  return { max: max.toFixed(2), got: got.toFixed(2), percent: ((got/max)*100||0).toFixed(2) }
})

// সিরিয়াল (১…N across groups)
const serialMap = computed(() => {
  let i = 1; const map = {}
  store.cycle?.groups_json?.forEach(g => g.items.forEach(it => { map[it.id] = i++ }))
  return map
})

// গ্রুপ টোটাল (আমার lane)
function groupTotal(grp) {
  let max = 0, got = 0
  grp.items.forEach(it => {
    max += Number(it.max||0)
    const v = Number(marks.value[it.id]||0)
    got += Math.min(Math.max(v,0), Number(it.max||0))
  })
  return { max: max.toFixed(2), got: got.toFixed(2) }
}

function cap(id, max) {
  const v = Number(marks.value[id]||0)
  if (v < 0) marks.value[id] = 0
  if (v > max) marks.value[id] = max
}

// read-only সেল—প্রথম রিভিউয়ের মার্ক দেখাই (API array দেয়)
function laneMark(laneKey, itemId) {
  const arr = reviewsByLane.value?.[laneKey] || []
  const first = arr[0]
  return first?.marks?.[itemId] ?? ''
}

async function submit() {
  if (!canEdit.value) { alert('You are not allowed to submit.'); return }
  await store.submitReview({
    cycle_id: store.cycle.id,
    employee_id: Number(route.params.employeeId),
    reviewer_lane: myLaneKey.value,
    marks: marks.value,
    ...(canEdit.value ? {
        strengths: strengths.value, gaps: gaps.value, suggestions: suggestions.value
    } : {} )
  })
  alert('Submitted')
}
</script>

<template>
  <div class="max-w-6xl mx-auto py-6 px-4">
    <header class="mb-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold">KPI — {{ store.cycle?.title }}</h2>
          <p class="text-sm text-slate-600">
            Employee: <strong>#{{ $route.params.employeeId }}</strong> •
            Reviewing as: <strong>{{ myLaneKey || 'No lane' }}</strong>
          </p>
        </div>
        <div class="text-right">
          <div class="text-xs text-slate-500">Total (My lane)</div>
          <div class="text-lg font-bold">{{ totals.got }} / {{ totals.max }} ({{ totals.percent }}%)</div>
        </div>
      </div>
    </header>

    <!-- Paper-style grid -->
    <div v-if="store.cycle" class="overflow-auto border rounded-2xl">
      <table class="min-w-[980px] w-full text-sm">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-3 py-2 w-[60px] text-center">SL</th>
            <th class="text-left px-3 py-2 w-[34%]">মূল্যায়নের বিষয়</th>
            <th class="px-3 py-2 text-center">Max</th>
            <th v-for="ln in lanes" :key="ln.key" class="px-3 py-2 text-center">
              {{ ln.label }}
              <div class="text-[11px] text-slate-500">
                <span v-if="ln.assigned_user_name">{{ ln.assigned_user_name }}</span>
                <span v-else>-</span>
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          <template v-for="(grp, gIdx) in store.cycle.groups_json" :key="grp.id">
            <!-- Group header -->
            <tr class="bg-slate-100/80 border-t">
              <td :colspan="3 + lanes.length" class="px-3 py-2 font-medium">
                {{ gIdx+1 }}. {{ grp.label }}
              </td>
            </tr>

            <!-- Items -->
            <tr v-for="it in grp.items" :key="it.id" class="border-t">
              <td class="px-3 py-2 text-center">{{ serialMap[it.id] }}</td>
              <td class="px-3 py-2">{{ it.label }}</td>
              <td class="px-3 py-2 text-center">{{ it.max }}</td>

              <td v-for="ln in lanes" :key="ln.key" class="px-3 py-2">
                <!-- editable: my lane -->
                <div v-if="ln.key === myLaneKey && ln.can_current_user_review" class="flex items-center gap-2 justify-center">
                  <input type="number" step="0.1" min="0" :max="it.max"
                         v-model.number="marks[it.id]" @change="cap(it.id, it.max)"
                         class="w-24 text-right rounded-lg border px-2 py-1" />
                </div>
                


                <!-- readonly: allowed by hierarchy -->
                <div v-else-if="ln.can_view_marks" class="text-center text-slate-700">
                  {{ laneMark(ln.key, it.id) }}
                </div>

                 <div v-if="ln.key === myLaneKey && ln.can_current_user_review" class="flex items-center gap-2 justify-center">
                  <input type="number" step="0.1" min="0" :max="it.max"
                         v-model.number="marks[it.id]" @change="cap(it.id, it.max)"
                         class="w-24 text-right rounded-lg border px-2 py-1" />
                </div>

                <!-- not allowed to view -->
                <!-- <div v-else class="text-center text-slate-400">—</div> -->
              </td>
            </tr>

            <!-- Group subtotal -->
            <tr class="bg-slate-50 border-t">
              <td></td>
              <td class="px-3 py-2 text-right font-medium">Group Total</td>
              <td class="px-3 py-2 text-center font-medium">
                {{ groupTotal(grp).max }}
              </td>
              <td :colspan="lanes.length" class="px-3 py-2 text-center">
                <template v-if="myLaneKey">
                  <span class="font-semibold">{{ groupTotal(grp).got }}</span>
                  <span class="text-slate-500"> / {{ groupTotal(grp).max }}</span>
                </template>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    

    <div v-if="canEdit" class="grid md:grid-cols-3 gap-4 mt-4">
      <textarea v-model="strengths" placeholder="Key Strength(s)" class="rounded-xl border p-3 min-h-28"></textarea>
      <textarea v-model="gaps" placeholder="GAP(s)" class="rounded-xl border p-3 min-h-28"></textarea>
      <textarea v-model="suggestions" placeholder="Suggestions / Training" class="rounded-xl border p-3 min-h-28"></textarea>
    </div>

    <div class="mt-6 flex items-center justify-between">
      <div class="text-sm">My Lane Total: <b>{{ totals.got }}</b> / {{ totals.max }}</div>
      <button @click="submit" :disabled="!myLaneKey"
        class="px-5 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40">
        Submit
      </button>
    </div>
  </div>
</template>
