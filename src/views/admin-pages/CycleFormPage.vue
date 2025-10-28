<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useKpiCycleAdmin } from '@/stores/kpiCycleAdmin'

const route = useRoute()
const router = useRouter()
const s = useKpiCycleAdmin()

const editingId = ref(route.params.id ? Number(route.params.id) : null)

// ----- state -----
const title = ref('KPI 2025')
const year  = ref(new Date().getFullYear())

const groups = ref([
  { id:'personal', label:'Personal Attributes (25)', items:[
    {id:'attitude', label:'ব্যক্তিত্ব ও আচরণ', max:2.5},
    {id:'punctual', label:'সময়নিষ্ঠতা', max:2.5},
    {id:'teamwork', label:'সহযোগিতা ও আচরণ', max:5},
    {id:'discipline', label:'শৃঙ্খলা', max:5},
    {id:'communication', label:'কমিউনিকেশন', max:5},
    {id:'ethics', label:'নৈতিকতা', max:5},
  ]},
  { id:'training', label:'Training (15)', items:[
    {id:'tech_training', label:'প্রযুক্তিগত প্রশিক্ষণ', max:5},
    {id:'cert', label:'সার্টিফিকেশন/সেমিনার', max:5},
    {id:'onjob', label:'অন জব লার্নিং', max:5},
  ]},
  { id:'performance', label:'কাজের কার্যসম্পাদন (25)', items:[
    {id:'quality', label:'কাজের মান', max:10},
    {id:'planning', label:'পরিকল্পনা/ম্যানেজমেন্ট', max:7},
    {id:'report', label:'রিপোর্টিং/ডকুমেন্টেশন', max:8},
  ]},
  { id:'target', label:'Monthly Target (25)', items:[
    {id:'target', label:'টার্গেট এচিভমেন্ট', max:25},
  ]},
])

const lanes = ref([
  { key:'incharge',      label:'Incharge',              rank:10, source:{type:'department_field', field:'incharge_id'} },
  { key:'op_admin',      label:'Op. Admin',             rank:20, source:{type:'department_field', field:'operational_admin_user_id'} },
  { key:'hr',            label:'HR',                    rank:25, source:{type:'manual', permission:'kpi.review.lane.hr'} },
  { key:'coordinator',   label:'Coordinator / AD / DD', rank:30, source:{type:'department_field', field:'coordinator_id'} },
  { key:'cc',            label:'CC',                    rank:40, source:{type:'department_field', field:'recommend_by_user_id'} },
  { key:'supv_director', label:'Supv. Director',        rank:50, source:{type:'department_field', field:'approved_by_user_id'} },
  { key:'da',            label:'DA',                    rank:60, source:{type:'manual', permission:'kpi.da'} },
])

const grading = ref({
  excellent:    [91,100],
  good:         [81,90],
  satisfactory: [71,80],
  average:      [51,70],
  below:        [0,50],
})

// ----- helpers -----
const totalMax = computed(() => {
  let t = 0
  groups.value.forEach(g => g.items.forEach(it => t += Number(it.max||0)))
  return Number(t.toFixed(2))
})
function move(arr, i, dir){ const j = i+dir; if (j<0||j>=arr.length) return; [arr[i],arr[j]]=[arr[j],arr[i]] }
function addGroup(){ const id = prompt('Group ID (slug):'); if(!id) return; groups.value.push({id,label:id,items:[]}) }
function addItem(g){ g.items.push({id:'item_'+(g.items.length+1), label:'New Item', max:1}) }
function removeGroup(i){ groups.value.splice(i,1) }
function removeItem(g,i){ g.items.splice(i,1) }

// ----- lane helpers -----
const laneDefaults = {
  incharge: 'incharge_id',
  op_admin: 'operational_admin_user_id',
  coordinator: 'coordinator_id',
  cc: 'recommend_by_user_id',
  supv_director: 'approved_by_user_id',
  hr: 'approved_by_user_id',
  // da/hr → manual
}

function normalizeLane(ln, idx = 0) {
  const key = ln.key || `lane_${idx+1}`
  const type = ln.source?.type || 'manual'
  const out = {
    key,
    label: ln.label || key,
    rank: ln.rank ?? (idx+1)*10,
    source: { type }
  }
  if (type === 'department_field') {
    out.source.field = ln.source?.field || laneDefaults[key] || ''
  } else {
    out.source.permission = ln.source?.permission || `kpi.review.lane.${key}`
  }
  return out
}

function addLane() {
  lanes.value.push({
    key: '',
    label: 'New Lane',
    rank: (lanes.value.length + 1) * 10,
    source: { type: 'manual', permission: '' }
  })
}

function removeLaneAt(i) {
  lanes.value.splice(i, 1)
}

function ensureLaneShape(ln) {
  if (!ln.source) ln.source = { type: 'manual' }
  if (ln.source.type === 'department_field') {
    if (!('field' in ln.source)) ln.source.field = laneDefaults[ln.key] || ''
    delete ln.source.permission
  } else {
    if (!('permission' in ln.source)) {
      ln.source.permission = `kpi.review.lane.${ln.key || 'new'}`
    }
    delete ln.source.field
  }
}

function assertUniqueLaneKeys(list) {
  const seen = new Set()
  for (const ln of list) {
    if (!ln.key || !/^[A-Za-z0-9_]+$/.test(ln.key)) {
      throw new Error(`Invalid lane key "${ln.key || '(empty)'}". Use letters/numbers/underscore only.`)
    }
    if (seen.has(ln.key)) {
      throw new Error(`Duplicate lane key "${ln.key}".`)
    }
    seen.add(ln.key)
  }
}

// ----- load if editing -----
onMounted(async () => {
  if (editingId.value) {
    const cy = await s.load(editingId.value)
    title.value   = cy.title
    year.value    = cy.year
    groups.value  = cy.groups_json || []
    lanes.value   = (cy.reviewer_lanes_json || []).map((ln, i) => normalizeLane(ln, i))
    grading.value = cy.grading_json || grading.value
  } else {
    // ensure initial shape for in-memory defaults
    lanes.value = lanes.value.map((ln, i) => normalizeLane(ln, i))
  }
})

// ----- save/activate -----
function sanitizeLanes(list) {
  return list.map((ln, i) => {
    const out = { ...ln, rank: ln.rank ?? (i+1)*10, source: { ...(ln.source || {}) } }
    if (out.source.type === 'department_field') {
      out.source.field = out.source.field || laneDefaults[out.key] || ''
      if (!out.source.field) {
        throw new Error(`Missing department field for lane '${out.key}'. Please set source.field.`)
      }
      delete out.source.permission
    } else {
      out.source.permission = out.source.permission || `kpi.review.lane.${out.key}`
      delete out.source.field
    }
    return out
  })
}

async function saveDraft() {
  try {
    assertUniqueLaneKeys(lanes.value)
    const payload = {
      title: title.value,
      year: year.value,
      groups: groups.value,
      lanes: sanitizeLanes(lanes.value),
      grading: grading.value,
    }
    if (editingId.value) await s.update(editingId.value, payload)
    else editingId.value = (await s.create(payload)).id
    alert('Saved!')
  } catch (e) {
    console.error(e)
    alert(e?.message || 'Failed to save')
  }
}

async function makeActive() {
  if (!editingId.value) { alert('Save first'); return }
  await s.activate(editingId.value)
  alert('Activated!')
}
</script>

<template>
  <div class="max-w-6xl mx-auto p-4 space-y-5">
    <header class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button class="px-3 py-1.5 rounded-lg border" @click="$router.push({name:'KpiCycles'})">← Back</button>
        <h1 class="text-xl font-semibold">
          {{ editingId ? 'Edit KPI Cycle' : 'Create KPI Cycle' }}
        </h1>
      </div>
      <div class="flex gap-2">
        <button @click="saveDraft" class="btn-2">Save Draft</button>
        <button @click="makeActive" class="btn-1">Activate</button>
      </div>
    </header>

    <!-- Basics -->
    <div class="grid md:grid-cols-3 gap-3">
      <div class="rounded-xl border p-3">
        <div class="text-sm font-medium mb-2">Basic</div>
        <div class="space-y-2">
          <input v-model="title" class="border rounded-lg px-3 py-2 w-full" placeholder="Title e.g., KPI 2025" />
          <input v-model="year" type="number" class="border rounded-lg px-3 py-2 w-full" placeholder="Year" />
          <div class="text-xs text-slate-600">Total Max: <b>{{ totalMax }}</b></div>
        </div>
      </div>

      <!-- Grading -->
      <div class="rounded-xl border p-3 md:col-span-2">
        <div class="text-sm font-medium mb-2">Grading (0–100)</div>
        <div class="grid md:grid-cols-3 gap-2">
          <div v-for="(range, key) in grading" :key="key" class="border rounded-lg p-2">
            <div class="text-xs text-slate-600 mb-1 capitalize">{{ key }}</div>
            <div class="flex items-center gap-1">
              <input type="number" v-model.number="grading[key][0]" class="border rounded px-2 py-1 w-20 text-right" />
              <span>–</span>
              <input type="number" v-model.number="grading[key][1]" class="border rounded px-2 py-1 w-20 text-right" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lanes -->
    <div class="rounded-xl border p-3">
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm font-medium">Reviewer Lanes & Hierarchy</div>
        <button class="px-3 py-1.5 border rounded" @click="addLane">Add Lane</button>
      </div>

      <div class="overflow-auto">
        <table class="w-full text-sm min-w-[760px]">
          <thead class="bg-slate-50">
            <tr>
              <th class="text-left px-2 py-1">Order</th>
              <th class="text-left px-2 py-1">Key</th>
              <th class="text-left px-2 py-1">Label</th>
              <th class="text-left px-2 py-1">Source</th>
              <th class="text-left px-2 py-1">Field / Permission</th>
              <th class="text-left px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(ln,i) in lanes" :key="i" class="border-t">
              <td class="px-2 py-1">
                <button class="border rounded px-2 text-xs mr-1" @click="move(lanes,i,-1)">↑</button>
                <button class="border rounded px-2 text-xs" @click="move(lanes,i,1)">↓</button>
              </td>
              <td class="px-2 py-1">
                <input v-model="ln.key" class="border rounded px-2 py-1 w-32" />
              </td>
              <td class="px-2 py-1">
                <input v-model="ln.label" class="border rounded px-2 py-1 w-56" />
              </td>
              <td class="px-2 py-1">
                <select v-model="ln.source.type" class="border rounded px-2 py-1" @change="ensureLaneShape(ln)">
                  <option value="department_field">department_field</option>
                  <option value="manual">manual</option>
                </select>
              </td>
              <td class="px-2 py-1">
                <template v-if="ln.source.type==='department_field'">
                  <input v-model="ln.source.field" class="border rounded px-2 py-1 w-64" placeholder="e.g., incharge_id" />
                </template>
                <template v-else>
                  <input v-model="ln.source.permission" class="border rounded px-2 py-1 w-64" placeholder="permission e.g., kpi.review.lane.hr" />
                </template>
              </td>
              <td class="px-2 py-1">
                <button class="border rounded px-2 text-xs" @click="removeLaneAt(i)">Remove</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="text-xs text-slate-500 mt-2">Order (top→bottom) ই হল hierarchy rank।</div>
    </div>

    <!-- Groups & Items -->
    <div class="rounded-xl border p-3">
      <div class="flex items-center justify-between">
        <div class="text-sm font-medium">Groups & Items</div>
        <button @click="addGroup" class="px-3 py-1.5 rounded-lg border">Add Group</button>
      </div>

      <div class="space-y-4 mt-3">
        <div v-for="(g, gi) in groups" :key="g.id" class="rounded-lg border">
          <div class="flex items-center justify-between bg-slate-50 px-3 py-2">
            <div class="font-medium">{{ gi+1 }}. {{ g.label }}</div>
            <div class="flex items-center gap-2">
              <button class="px-2 py-1 text-xs border rounded" @click="move(groups, gi, -1)">↑</button>
              <button class="px-2 py-1 text-xs border rounded" @click="move(groups, gi, 1)">↓</button>
              <button class="px-2 py-1 text-xs border rounded" @click="removeGroup(gi)">Remove</button>
            </div>
          </div>

          <div class="p-3 overflow-auto">
            <table class="w-full text-sm min-w-[720px]">
              <thead>
                <tr class="text-left bg-slate-50">
                  <th class="px-2 py-1 w-14">SL</th>
                  <th class="px-2 py-1">Item ID</th>
                  <th class="px-2 py-1">Label</th>
                  <th class="px-2 py-1 w-24">Max</th>
                  <th class="px-2 py-1 w-40"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(it, ii) in g.items" :key="it.id" class="border-t bg-white">
                  <td class="px-2 py-1">{{ ii+1 }}</td>
                  <td class="px-2 py-1"><input v-model="it.id" class="border rounded px-2 py-1 w-40" /></td>
                  <td class="px-2 py-1"><input v-model="it.label" class="border rounded px-2 py-1 w-full" /></td>
                  <td class="px-2 py-1"><input v-model.number="it.max" type="number" min="0" step="0.5" class="border rounded px-2 py-1 w-24 text-right" /></td>
                  <td class="px-2 py-1">
                    <button class="px-2 py-1 text-xs border rounded mr-1" @click="move(g.items, ii, -1)">↑</button>
                    <button class="px-2 py-1 text-xs border rounded mr-1" @click="move(g.items, ii, 1)">↓</button>
                    <button class="px-2 py-1 text-xs border rounded" @click="removeItem(g, ii)">Remove</button>
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="mt-2">
              <button @click="addItem(g)" class="px-3 py-1.5 border rounded">Add Item</button>
              <span class="text-xs text-slate-600 ml-3">Group total: {{ g.items.reduce((a,b)=>a+Number(b.max||0),0) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between mt-3">
        <div class="text-sm text-slate-700">Overall Total Max: <b>{{ totalMax }}</b></div>
        <button @click="saveDraft" class="btn-2">Save Draft</button>
      </div>
    </div>
  </div>
</template>
