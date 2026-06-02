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

const positiveIntFromQuery = (value) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const fromQuery = (query = {}) => ({
  companyId: positiveIntFromQuery(query.company_id),
  departmentId: positiveIntFromQuery(query.department_id),
  employeeId: positiveIntFromQuery(query.employee_id),
  lineType: query.line_type ?? null,
  user_type: query.user_type ?? store.userType,
  search: query.search ?? store.search,
  lifecycleStatus: null,
})

function cleanInvalidQuery() {
  const query = { ...route.query }
  let changed = false

  for (const key of ['company_id', 'department_id', 'employee_id']) {
    if (query[key] != null && positiveIntFromQuery(query[key]) === null) {
      delete query[key]
      changed = true
    }
  }

  if (changed) router.replace({ query })
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

function syncStoreFromModel(value = filterModel.value) {
  store.companyId = value.companyId ?? null
  store.departmentId = value.departmentId ?? null
  store.employeeId = value.employeeId ?? null
  store.lineType = value.lineType ?? null
  store.userType = value.user_type ?? 'Probationary'
  store.search = value.search ?? ''
  store.lifecycleStatus = null
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
  cleanInvalidQuery()
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
  <div class="min-h-screen bg-slate-50 px-3 py-4 text-[12px] md:px-5">
    <div class="mb-4 rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            EmpManage
          </div>
          <h1 class="mt-1 text-lg font-semibold text-slate-950 md:text-xl">{{ title }}</h1>
          <p class="mt-1 text-xs text-slate-500">
            Monitor the whole employee journey, open quick detail in a drawer, and keep the table context intact.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <RouterLink
            :to="{ name: 'lifecycle.board', params: { flowType: 'onboarding' } }"
            class="rounded-md border px-3 py-2 text-xs font-semibold"
            :class="flowType === 'onboarding'
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'"
          >
            Onboarding
          </RouterLink>
          <RouterLink
            :to="{ name: 'lifecycle.board', params: { flowType: 'offboarding' } }"
            class="rounded-md border px-3 py-2 text-xs font-semibold"
            :class="flowType === 'offboarding'
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'"
          >
            Offboarding
          </RouterLink>
        </div>
      </div>

      <div class="p-3">
      <BoardFilters
        v-model="filterModel"
        :companies="companies"
        :departments="departments"
        :show-lifecycle-status="false"
        :lifecycle-statuses="store.lifecycleStatusOptions"
        @submit="applyFilters"
      />
      </div>
    </div>

    <div v-if="store.error" class="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      Failed to load lifecycle board.
    </div>
    <LifecycleBoardTable v-else />
  </div>
</template>

