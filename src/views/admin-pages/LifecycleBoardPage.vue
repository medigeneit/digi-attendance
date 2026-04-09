<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BoardFilters from '@/components/BoardFilters.vue'
import LifecycleBoardTable from '@/components/LifecycleBoardTable.vue'
import { useLifecycleStore } from '@/stores/lifecycle'

const store = useLifecycleStore()
const route = useRoute()
const router = useRouter()

const companies = ref([])
const departments = ref([])

const flowType = computed(() => (route.params.flowType === 'offboarding' ? 'offboarding' : 'onboarding'))

const fromQuery = (query = {}) => ({
  companyId: query.company_id ? Number(query.company_id) : null,
  departmentId: query.department_id ? Number(query.department_id) : null,
  employeeId: query.employee_id ? Number(query.employee_id) : null,
  lineType: query.line_type ?? null,
  user_type: query.user_type ?? store.userType,
  search: query.search ?? store.search,
  lifecycleStatus: query.lifecycle_status ?? null,
})

const toQuery = (model = {}) => {
  const query = {
    company_id: model.companyId || undefined,
    department_id: model.departmentId || undefined,
    employee_id: model.employeeId || undefined,
    line_type: model.lineType || undefined,
    user_type: model.user_type || undefined,
    search: model.search || undefined,
    lifecycle_status: model.lifecycleStatus || undefined,
  }

  Object.keys(query).forEach((key) => {
    if (query[key] == null || query[key] === '') delete query[key]
  })

  return query
}

const filterModel = ref({
  companyId: null,
  departmentId: null,
  employeeId: null,
  lineType: null,
  user_type: store.userType,
  search: '',
  lifecycleStatus: null,
})

watch(
  flowType,
  (value) => {
    store.setFlowType(value)
  },
  { immediate: true },
)

watch(
  filterModel,
  (value) => {
    store.companyId = value.companyId ?? null
    store.departmentId = value.departmentId ?? null
    store.employeeId = value.employeeId ?? null
    store.lineType = value.lineType ?? null
    store.userType = value.user_type ?? 'Probationary'
    store.search = value.search ?? ''
    store.lifecycleStatus = value.lifecycleStatus ?? null

    router.replace({ query: toQuery(value) })
  },
  { deep: true, immediate: true },
)

async function applyFilters() {
  await store.fetchBoard()
}

async function load() {
  Object.assign(filterModel.value, fromQuery(route.query))
  await store.fetchBoard()
}

watch(
  () => route.fullPath,
  () => {
    load()
  },
  { immediate: true },
)

const title = computed(() => `${store.flowLabel} Lifecycle Board`)
</script>

<template>
  <div class="space-y-6 p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">{{ title }}</h1>
      <div class="text-gray-500">Existing checklist flow remains available.</div>
    </div>

    <BoardFilters
      v-model="filterModel"
      :companies="companies"
      :departments="departments"
      :show-lifecycle-status="true"
      :lifecycle-statuses="store.lifecycleStatusOptions"
      @submit="applyFilters"
    />

    <div v-if="store.loading" class="text-gray-600">Loading...</div>
    <div v-else-if="store.error" class="text-red-600">Failed to load lifecycle board.</div>
    <LifecycleBoardTable v-else />
  </div>
</template>

