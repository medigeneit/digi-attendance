<script setup>
import { onMounted, watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BoardFilters from '@/components/BoardFilters.vue'
import ChecklistBoardTable from '@/components/ChecklistBoardTable.vue'
import { useChecklistBoardStore } from '@/stores/checklistBoard'

const store = useChecklistBoardStore()
const route = useRoute()
const router = useRouter()

const companies = ref([])
const departments = ref([])

// ---- query <-> model mappers
const fromQuery = (q = {}) => ({
  type: q.type ?? store.type,
  companyId: q.company_id ? Number(q.company_id) : null,
  departmentId: q.department_id ? Number(q.department_id) : null,
  employeeId: q.employee_id ? Number(q.employee_id) : null,
  lineType: q.line_type ?? null,
  search: q.search ?? store.search,
})
const toQuery = (m = {}) => {
  const q = {
    type: m.type || undefined,
    company_id: m.companyId || undefined,
    department_id: m.departmentId || undefined,
    employee_id: m.employeeId || undefined,
    line_type: m.lineType || undefined,
    search: m.search || undefined,
  }
  // strip null/undefined
  Object.keys(q).forEach(k => (q[k] == null || q[k] === '') && delete q[k])
  return q
}

// the model the child binds to (camelCase)
const filterModel = ref({
  type: store.type,
  companyId: store.companyId,
  departmentId: store.departmentId,
  employeeId: null,
  lineType: null,
  search: store.search,
})

// keep store in sync with model (one direction)
watch(
  filterModel,
  (v) => {
    store.type = v.type
    store.companyId = v.companyId ?? null
    store.departmentId = v.departmentId ?? null
    store.search = v.search ?? ''
    // reflect into URL
    router.replace({ query: { ...route.query, ...toQuery(v) } })
  },
  { deep: true, immediate: true }
)

async function applyFilters() {
  await store.loadUsers({
    type: filterModel.value.type,
    company_id: filterModel.value.companyId,
    department_id: filterModel.value.departmentId,
    employee_id: filterModel.value.employeeId,
    line_type: filterModel.value.lineType,
    search: filterModel.value.search,
  })
}

onMounted(async () => {
  Object.assign(filterModel.value, fromQuery(route.query))
  await store.loadBoard({ withUsers: true, userParams: toQuery(filterModel.value) })
})
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold"><b>{{ store.templateByType?.name || '—' }}</b> Board</h1>
      <div class="text-gray-500">
        Template: <b>{{ store.templateByType?.name || '—' }}</b>
      </div>
    </div>

    <BoardFilters
      v-model="filterModel"
      :companies="companies"
      :departments="departments"
      @submit="applyFilters"
    />

    <div v-if="store.loading" class="text-gray-600">Loading…</div>
    <div v-else-if="store.error" class="text-red-600">Failed to load.</div>
    <ChecklistBoardTable v-else />
  </div>
</template>
