<template>
  <section class="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
    <div class="sticky top-0 z-30 space-y-4 bg-slate-50/80 pb-3 backdrop-blur">
      <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 class="text-xl font-semibold text-slate-900">Organogram</h1>
            <p class="text-sm text-slate-500">
              Department-wise structure and reporting lines for the selected company.
            </p>
          </div>
          <div class="flex w-full gap-2 md:w-auto">
            <button
              type="button"
              class="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 md:flex-none"
              @click="handleRefresh"
              :disabled="loading || !hasCompany"
            >
              {{ loading ? 'Loading...' : 'Refresh' }}
            </button>
            <button
              type="button"
              class="inline-flex flex-1 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 md:flex-none"
              @click="handleExport"
              :disabled="exporting || !hasCompany"
            >
              {{ exporting ? 'Exporting...' : 'Export Excel' }}
            </button>
          </div>
        </div>

        <div class="p-4">
          <EmployeeFilter
            v-model:company_id="companyIdProxy"
            v-model:department_id="departmentIdProxy"
            v-model:line_type="lineTypeProxy"
            v-model:employee_id="employeeIdProxy"
            :with-type="true"
            :initial-value="$route.query"
            @filter-change="handleFilterChange"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2 px-4 pb-4" v-if="hasCompany">
          <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
            {{ cycleLabel }} · {{ filteredDepartments.length }} Departments
          </span>
          <span
            v-if="search"
            class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
          >
            Search: "{{ search }}"
          </span>
        </div>
      </div>

      <div v-if="error" class="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        <span>{{ error }}</span>
        <button type="button" class="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold" @click="handleRefresh">
          Retry
        </button>
      </div>
    </div>

    <div v-if="loading" class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="skeleton in skeletons" :key="skeleton" class="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
        <div class="h-5 w-1/2 rounded bg-slate-200"></div>
        <div class="mt-2 h-3 w-1/3 rounded bg-slate-100"></div>
        <div class="mt-4 space-y-2">
          <div class="h-8 rounded bg-slate-100"></div>
          <div class="h-8 rounded bg-slate-100"></div>
        </div>
        <div class="mt-4 space-y-2">
          <div class="h-3 w-full rounded bg-slate-100"></div>
          <div class="h-3 w-5/6 rounded bg-slate-100"></div>
          <div class="h-3 w-2/3 rounded bg-slate-100"></div>
        </div>
      </article>
    </div>

    <div v-else-if="!hasCompany" class="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <h3 class="text-lg font-semibold text-slate-900">Select a company to view organogram</h3>
      <p class="mt-2 text-sm text-slate-500">Choose a company to load department-wise organogram data.</p>
    </div>

    <div v-else-if="filteredDepartments.length === 0" class="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <h3 class="text-lg font-semibold text-slate-900">No organogram data found</h3>
      <p class="mt-2 text-sm text-slate-500">Try adjusting the department filter or clearing the search.</p>
      <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button type="button" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold" @click="clearSearch">
          Clear Search
        </button>
        <button type="button" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold" @click="clearDepartment">
          All Departments
        </button>
        <button type="button" class="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white" @click="handleRefresh">
          Refresh
        </button>
      </div>
    </div>

    <div v-else class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="dept in filteredDepartments" :key="dept.department_id" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
        <header class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-slate-900">{{ dept.department_name }}</h3>
            <p class="mt-1 text-xs text-slate-500">Department Overview</p>
          </div>
          <span class="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            {{ dept.members.length }} Members
          </span>
        </header>

        <div class="mt-4 grid gap-2 sm:grid-cols-2">
          <div v-if="dept.director" class="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
            <span class="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Director</span>
            <span class="block font-semibold text-slate-900">{{ dept.director.name }}</span>
          </div>
          <div v-if="dept.coordinator" class="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
            <span class="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Coordinator</span>
            <span class="block font-semibold text-slate-900">{{ dept.coordinator.name }}</span>
          </div>
          <div v-if="dept.incharge" class="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
            <span class="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Incharge</span>
            <span class="block font-semibold text-slate-900">{{ dept.incharge.name }}</span>
          </div>
          <div v-if="dept.op_admin" class="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
            <span class="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Op Admin</span>
            <span class="block font-semibold text-slate-900">{{ dept.op_admin.name }}</span>
          </div>
        </div>

        <div class="mt-4 overflow-x-auto rounded-xl border border-slate-100">
          <table class="min-w-full text-left text-xs">
            <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th class="px-3 py-2">#</th>
                <th class="px-3 py-2">Name</th>
                <!-- <th class="px-3 py-2">Type</th> -->
                <th class="px-3 py-2">Designation</th>
                <!-- <th class="px-3 py-2">Employment Type</th> -->
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(member, index) in dept.displayMembers" :key="member.id" class="text-slate-700">
                <td class="px-3 py-2 text-slate-500">{{ index + 1 }}</td>
                <td class="px-3 py-2 font-semibold text-slate-900">
                  <span class="block max-w-[160px] break-words">{{ member.name }}</span>
                </td>
                <!-- <td class="px-3 py-2 text-slate-600">{{ member.type || '—' }}</td> -->
                <td class="px-3 py-2">
                  <span class="block max-w-[160px] break-words text-slate-700">
                    {{ member.designation_title || '—' }}
                  </span>
                </td>
                <!-- <td class="px-3 py-2 text-slate-600">{{ member.employee_type || '—' }}</td> -->
              </tr>
              <tr v-if="dept.displayMembers.length === 0">
                <td colspan="5" class="px-3 py-4 text-center text-xs text-slate-400">
                  No members match this search.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import { useOrganogramStore } from '@/stores/organogram'

const store = useOrganogramStore()
const route = useRoute()
const router = useRouter()

const search = ref('')
const isReady = ref(false)
const skeletons = [1, 2, 3]
const employeeIdProxy = ref('')

const loading = computed(() => store.loading)
const error = computed(() => store.error)
const exporting = computed(() => store.exporting)

const companyIdProxy = computed({
  get: () => store.filters.company_id ?? '',
  set: (value) => {
    store.setFilters({ company_id: value, department_id: null })
  },
})

const lineTypeProxy = computed({
  get: () => (store.filters.cycle_slug === 'support_staff' ? 'support_staff' : 'executive'),
  set: (value) => {
    const cycle = value === 'support_staff' ? 'support_staff' : 'executives'
    store.setFilters({ cycle_slug: cycle })
  },
})

const cycleLabel = computed(() =>
  store.filters.cycle_slug === 'support_staff' ? 'Staff' : 'Executives'
)

const departmentIdProxy = computed({
  get: () => store.filters.department_id ?? '',
  set: (value) => {
    store.setFilters({ department_id: value })
  },
})

const hasCompany = computed(() => !!store.filters.company_id)

const filteredDepartments = computed(() => {
  const query = search.value.trim().toLowerCase()

  return store.departments
    .map((dept) => {
      const members = Array.isArray(dept.members) ? dept.members : []
      const directorName = dept.director?.name?.toLowerCase() || ''
      const inchargeName = dept.incharge?.name?.toLowerCase() || ''
      const departmentName = dept.department_name?.toLowerCase() || ''

      const directMatch =
        query &&
        (departmentName.includes(query) ||
          directorName.includes(query) ||
          inchargeName.includes(query))

      const memberMatches = !query
        ? members
        : members.filter((member) => member.name?.toLowerCase().includes(query))

      const displayMembers = directMatch ? members : memberMatches

      return {
        ...dept,
        members,
        displayMembers,
        matches: directMatch || memberMatches.length > 0,
      }
    })
    .filter((dept) => dept.members.length > 0 && (!query ? true : dept.matches))
})

const buildQuery = () => {
  const query = {}
  if (store.filters.company_id) query.company_id = store.filters.company_id
  if (store.filters.cycle_slug) query.cycle_slug = store.filters.cycle_slug
  if (store.filters.department_id) query.department_id = store.filters.department_id
  return query
}

const applyRouteFilters = () => {
  const { company_id, cycle_slug, department_id } = route.query
  if (company_id || cycle_slug || department_id) {
    store.setFilters({ company_id, cycle_slug, department_id })
  }
}

const syncRoute = async () => {
  await router.replace({ query: buildQuery() })
}

const handleRefresh = async () => {
  if (!hasCompany.value) return
  await store.fetchOrganogram()
}

const handleExport = async () => {
  await store.exportExcel()
}

const handleFilterChange = () => {
  syncRoute()
}

const clearDepartment = () => {
  store.setFilters({ department_id: null })
}

const clearSearch = () => {
  search.value = ''
}

onMounted(async () => {
  store.hydrateFilters()
  applyRouteFilters()

  await store.fetchCompanies()

  if (!store.filters.company_id && store.companies.length > 0) {
    store.setFilters({ company_id: store.companies[0].id })
  }

  if (store.filters.company_id) {
    await store.fetchOrganogram()
  }

  isReady.value = true
  await syncRoute()
})

watch(
  () => [store.filters.company_id, store.filters.cycle_slug, store.filters.department_id],
  async () => {
    if (!isReady.value) return
    await syncRoute()
    if (store.filters.company_id) {
      await store.fetchOrganogram()
    }
  }
)
</script>
