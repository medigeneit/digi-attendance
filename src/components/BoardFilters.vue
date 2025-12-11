<script setup>
import { reactive, watch, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmployeeFilter from './common/EmployeeFilter.vue'

const props = defineProps({
  modelValue: { type: Object, required: true }, // { type, companyId, departmentId, employeeId, lineType, user_type }
  companies: { type: Array, default: () => [] },
  departments: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'submit'])

const route = useRoute()
const router = useRouter()

const DEFAULTS = { type: null, user_type: 'Probationary' }

const toLocal = (v = {}) => ({
  type: v.type ?? DEFAULTS.type,
  company_id: v.companyId ?? null,
  department_id: v.departmentId ?? null,
  employee_id: v.employeeId ?? null,
  line_type: v.lineType ?? null,
  user_type: v.user_type ?? DEFAULTS.user_type,
})
const toModel = (l = {}) => ({
  type: l.type ?? DEFAULTS.type,
  companyId: l.company_id ?? null,
  departmentId: l.department_id ?? null,
  employeeId: l.employee_id ?? null,
  lineType: l.line_type ?? null,
  user_type: l.user_type ?? DEFAULTS.user_type,
})

// one local copy for the UI
const local = reactive(toLocal(props.modelValue))

let syncing = false
function emitUpdate() {
  if (syncing) return
  emit('update:modelValue', { ...toModel(local) })
}

// ======== Route query sync (debounced) ========
// ⬇️ user_type এখানে যোগ করা হলো
const FILTER_KEYS = ['type', 'company_id', 'department_id', 'employee_id', 'line_type', 'user_type']
// '' | null | undefined | 'all' => treat as blank for URL
const isBlank = (v) => v === '' || v === null || v === undefined || v === 'all'

function pickFiltersFromLocal() {
  const q = {}

  // include type only if not default (keeps URL clean)
  if (!isBlank(local.type) && String(local.type) !== String(DEFAULTS.type)) q.type = String(local.type)

  if (!isBlank(local.company_id)) q.company_id = String(local.company_id)
  if (!isBlank(local.department_id)) q.department_id = String(local.department_id)
  if (!isBlank(local.employee_id)) q.employee_id = String(local.employee_id)
  if (!isBlank(local.line_type)) q.line_type = String(local.line_type)

  // ⬇️ user_type শুধু তখনই URL এ যাবে যখন ডিফল্ট ('probationary') নয়
  if (!isBlank(local.user_type) && String(local.user_type) !== DEFAULTS.user_type) {
    q.user_type = String(local.user_type)
  }
  return q
}

function buildNextQuery(partial = {}) {
  // keep other non-filter params
  const others = { ...route.query }
  for (const k of FILTER_KEYS) delete others[k]

  const next = { ...others, ...pickFiltersFromLocal(), ...partial }

  // remove truly blank keys for a clean URL
  for (const k of Object.keys(next)) {
    const v = next[k]
    if (v === '' || v === null || v === undefined) delete next[k]
  }
  return next
}

let qTimer = null
function syncRouteQuery({ replace = true, partial = {}, debounce = 150 } = {}) {
  if (qTimer) clearTimeout(qTimer)
  qTimer = setTimeout(() => {
    const next = buildNextQuery(partial)
    const nav = () => (replace ? router.replace({ query: next }) : router.push({ query: next }))
    nav().catch(() => {})
  }, debounce)
}
// =============================================

// Apply button
function submit() {
  const payload = { ...toModel(local) }
  emit('submit', payload)
  syncRouteQuery({ replace: true, debounce: 0 }) // immediate on Apply
}

// parent -> local sync (guarded)
watch(
  () => props.modelValue,
  (v) => {
    const next = toLocal(v || {})
    let changed = false
    for (const k of Object.keys(next)) {
      if (local[k] !== next[k]) { changed = true; break }
    }
    if (changed) {
      syncing = true
      Object.assign(local, next)
      nextTick(() => { syncing = false })
    }
  },
  { deep: true }
)

// local changes -> parent model + URL (debounced)
watch(
  () => [local.type, local.company_id, local.department_id, local.employee_id, local.line_type, local.user_type],
  () => {
    emitUpdate()
    syncRouteQuery({ replace: true, debounce: 150 })
  }
)

// ✅ initial load এবং browser back/forward এ query → state sync
onMounted(() => {
  if (route.query.user_type) {
    local.user_type = String(route.query.user_type)
  }
})
watch(() => route.query.user_type, (v) => {
  if (v !== undefined && v !== null) local.user_type = String(v)
})


</script>


<template>
  <div class="flex flex-wrap items-end gap-3">
    <div>
      <label class="block text-xs text-gray-500 mb-1">User Type</label>
      <select v-model="local.user_type" class="border rounded px-2 py-1">
        <option value="Probationary">Probationary</option>
        <option value="Permanent">Permanent</option>
        <option value="Contract">Contract</option>
      </select>
    </div>

    <EmployeeFilter
      v-model:company_id="local.company_id"
      v-model:department_id="local.department_id"
      v-model:employee_id="local.employee_id"
      v-model:line_type="local.line_type"
      :with-type="true"
      :initial-value="route.query"
      :companies="companies"
      :departments="departments"
      @filter-change="(p) => { Object.assign(local, p) }"
    >
    <button class="btn-2 py-1" @click="submit">
      Apply
    </button>
    </EmployeeFilter>

  </div>
</template>
