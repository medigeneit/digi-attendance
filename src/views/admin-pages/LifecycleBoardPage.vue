<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BoardFilters from '@/components/BoardFilters.vue'
import LifecycleBoardTable from '@/components/LifecycleBoardTable.vue'
import { useLifecycleStore } from '@/stores/lifecycle'

const store = useLifecycleStore()
const route = useRoute()

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

const filterModel = ref({
  companyId: null,
  departmentId: null,
  employeeId: null,
  lineType: null,
  user_type: store.userType,
  search: '',
  lifecycleStatus: null,
})

function syncStoreFromModel(value = filterModel.value) {
  store.companyId = value.companyId ?? null
  store.departmentId = value.departmentId ?? null
  store.employeeId = value.employeeId ?? null
  store.lineType = value.lineType ?? null
  store.userType = value.user_type ?? 'Probationary'
  store.search = value.search ?? ''
  store.lifecycleStatus = value.lifecycleStatus ?? null
}

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
    syncStoreFromModel(value)
  },
  { deep: true, immediate: true },
)

async function applyFilters() {
  await store.fetchBoard()
}

async function load() {
  const nextModel = fromQuery(route.query)
  Object.assign(filterModel.value, nextModel)
  syncStoreFromModel(nextModel)
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
  <div class="min-h-screen bg-slate-50/70 px-4 py-5 md:px-6">
    <div class="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">{{ title }}</h1>
        <p class="mt-1 text-sm text-slate-500">
          Use the board below to monitor stage-wise movement, progress, and checklist completion.
        </p>
      </div>
      <div class="text-sm text-slate-500">Existing checklist flow remains available.</div>
    </div>

    <div class="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <BoardFilters
        v-model="filterModel"
        :companies="companies"
        :departments="departments"
        :show-lifecycle-status="false"
        :lifecycle-statuses="store.lifecycleStatusOptions"
        @submit="applyFilters"
      />
    </div>

    <div v-if="store.error" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      Failed to load lifecycle board.
    </div>
    <LifecycleBoardTable v-else />
  </div>
</template>

