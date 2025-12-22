<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useMonthlyKpiFormsStore } from '@/stores/monthly-kpi-forms'
import { storeToRefs } from 'pinia'
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'

const router = useRouter()
const route = useRoute()
const store = useMonthlyKpiFormsStore()
const { items, meta, isLoading, error, hasNextPage, hasPrevPage } = storeToRefs(store)

const type = ref(route.query.type ?? '')
const month = ref(route.query.month ?? '')
const date_from = ref(route.query.date_from ?? '')
const date_to = ref(route.query.date_to ?? '')
const sort_by = ref(route.query.sort_by ?? 'created_at')
const sort_dir = ref(route.query.sort_dir ?? 'desc')
const per_page = ref(Number(route.query.per_page ?? 15))
const page = ref(Number(route.query.page ?? 1))

const pad = (value) => String(value ?? '').padStart(2, '0')

const parsePeriod = (value) => {
  const current = new Date()
  if (!value) {
    return { year: current.getFullYear(), month: current.getMonth() + 1, day: 1 }
  }
  const [year = '', monthValue = ''] = String(value).split('-')
  return {
    year: Number(year) || current.getFullYear(),
    month: Number(monthValue) || current.getMonth() + 1,
    day: 1,
  }
}

const formatMonth = (value) => `${value.year}-${pad(value.month)}`

const monthPeriod = computed({
  get() {
    return parsePeriod(month.value)
  },
  set(value) {
    if (!value) return
    month.value = formatMonth(value)
  },
})

const fromPeriod = computed({
  get() {
    return parsePeriod(date_from.value)
  },
  set(value) {
    if (!value) return
    date_from.value = formatMonth(value)
  },
})

const toPeriod = computed({
  get() {
    return parsePeriod(date_to.value)
  },
  set(value) {
    if (!value) return
    date_to.value = formatMonth(value)
  },
})

function syncUrl() {
  router.replace({
    query: {
      type: type.value || undefined,
      month: month.value || undefined,
      date_from: date_from.value || undefined,
      date_to: date_to.value || undefined,
      sort_by: sort_by.value !== 'created_at' ? sort_by.value : undefined,
      sort_dir: sort_dir.value !== 'desc' ? sort_dir.value : undefined,
      per_page: per_page.value !== 15 ? String(per_page.value) : undefined,
      page: store.meta.current_page > 1 ? String(store.meta.current_page) : undefined,
    },
  })
}

async function fetchList(extra = {}) {
  await store.fetchList({
    type: type.value || '',
    month: month.value || '',
    date_from: date_from.value || '',
    date_to: date_to.value || '',
    sort_by: sort_by.value,
    sort_dir: sort_dir.value,
    per_page: per_page.value,
    page: page.value,
    ...extra,
  })
  page.value = store.meta.current_page
  syncUrl()
}

function toggleSort(col) {
  if (sort_by.value === col) sort_dir.value = sort_dir.value === 'asc' ? 'desc' : 'asc'
  else { sort_by.value = col; sort_dir.value = 'asc' }
  fetchList({ page: 1 })
}

function goBack() { router.go(-1) }
function setPage(p) { page.value = Number(p); fetchList({ page: page.value }) }

function periodText(row) {
  return row.end_month ? `${row.start_month} → ${row.end_month}` : row.start_month
}

watch([month, date_from, date_to], () => {
  fetchList({ page: 1 })
})

onMounted(() => fetchList())
</script>

<template>
  <div class="space-y-4 px-4">
    <!-- Header -->
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg">Monthly KPI Forms</h1>

      <RouterLink :to="{ name: 'MonthlyKpiFormCreate' }" class="btn-2">
        <span class="hidden md:flex">Add New</span>
        <i class="far fa-plus"></i>
      </RouterLink>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2 p-3 rounded border border-white/20
         bg-white/60 backdrop-blur-md shadow-sm
         supports-[backdrop-filter]:bg-white/50 sticky top-14">
      <div class="flex flex-wrap justify-start items-center gap-4">
        <div class="md:col-span-3 relative">
          <label class="top-label top-0">Type</label>
          <select v-model="type" @change="fetchList({ page: 1 })"
            class="mt-1 w-full rounded-md border px-3 py-1 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200">
            <option value="">All</option>
            <option value="admin">Admin</option>
            <option value="exchange">Exchange</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        <div class="md:col-span-3">
          <FlexibleDatePicker
            v-model="monthPeriod"
            :show-year="false"
            :show-month="true"
            :show-date="false"
            label="Covers Month"
          />
        </div>
        <div class="md:col-span-3">
          <FlexibleDatePicker
            v-model="fromPeriod"
            :show-year="false"
            :show-month="true"
            :show-date="false"
            label="From (period)"
          />
        </div>
        <div class="md:col-span-3">
          <FlexibleDatePicker
            v-model="toPeriod"
            :show-year="false"
            :show-month="true"
            :show-date="false"
            label="To (period)"
          />
        </div>

        <div class="relative">
          <label class="top-label top-0">Sort By</label>
          <select v-model="sort_by" @change="fetchList({ page: 1 })"
            class="mt-1 w-full rounded-md border px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200">
            <option value="created_at">Created Date</option>
            <option value="updated_at">Updated</option>
            <option value="start_month">Start</option>
            <option value="end_month">End</option>
            <option value="type">Type</option>
            <option value="performance_max_mark">Perf. Max</option>
            <option value="monthly_target_marks">Target</option>
          </select>
        </div>
        <div class="relative">
          <label class="top-label top-0">Direction</label>
          <select v-model="sort_dir" @change="fetchList({ page: 1 })"
            class="mt-1 w-full rounded-md border px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200">
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
        <div class="relative">
          <label class="top-label top-0">Per Page</label>
          <select v-model.number="per_page" @change="fetchList({ page: 1 })"
            class="mt-1 w-full rounded-md border px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200">
            <option :value="10">10</option>
            <option :value="15">15</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loader / Error / Empty -->
    <div v-if="isLoading" class="py-8 text-center"><LoaderView /></div>
    <div v-else-if="error" class="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{{ error }}</div>
    <div v-else-if="items.length === 0" class="rounded-xl border bg-white p-8 text-center text-gray-600">
      No forms found.
      <RouterLink :to="{ name: 'MonthlyKpiFormCreate' }" class="ml-2 text-indigo-600 underline">Create one</RouterLink>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto rounded-xl border bg-white shadow-sm">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="bg-gray-100 text-left text-gray-700">
            <th class="px-3 py-2 w-12">#</th>
            <th class="px-3 py-2 cursor-pointer" @click="toggleSort('type')">Type</th>
            <th class="px-3 py-2 cursor-pointer" @click="toggleSort('start_month')">Period</th>
            <th class="px-3 py-2">Perf.Max</th>
            <th class="px-3 py-2">Target</th>
            <th class="px-3 py-2 cursor-pointer" @click="toggleSort('updated_at')">Updated</th>
            <th class="px-3 py-2 text-right w-28">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in items" :key="row.id" class="border-t hover:bg-gray-50">
            <td class="px-3 py-2">{{ (meta.current_page - 1) * meta.per_page + idx + 1 }}</td>
            <td class="px-3 py-2 capitalize">{{ row.type }}</td>
            <td class="px-3 py-2">{{ periodText(row) }}</td>
            <td class="px-3 py-2">{{ row.performance_mark }}</td>
            <td class="px-3 py-2">{{ row.target_marks }}</td>
            <td class="px-3 py-2">{{ new Date(row.updated_at || row.created_at).toLocaleString() }}</td>
            <td class="px-3 py-2 text-right">
              <div class="inline-flex gap-1">
                <RouterLink :to="{ name: 'MonthlyKpiFormEdit', params: { id: row.id } }" class="btn-icon" title="Edit">
                  <i class="far fa-edit"></i>
                </RouterLink>
                <button class="btn-icon text-red-600 hover:text-red-700" title="Delete"
                        @click="async () => { if (confirm(`Delete form ${row.id}?`)) { await store.deleteForm(row.id); await fetchList(); } }">
                  <i class="far fa-trash-alt"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="flex items-center justify-between gap-3 border-t px-3 py-2 text-sm">
        <div class="text-gray-600">
          Showing <span class="font-medium">{{ (meta.current_page - 1) * meta.per_page + 1 }}</span> –
          <span class="font-medium">{{ Math.min(meta.current_page * meta.per_page, meta.total) }}</span>
          of <span class="font-medium">{{ meta.total }}</span>
        </div>
        <div class="flex items-center gap-1">
          <button class="rounded-md border px-3 py-1 disabled:opacity-50" :disabled="!hasPrevPage" @click="setPage(meta.current_page - 1)">Prev</button>
          <span class="px-2">Page {{ meta.current_page }} / {{ meta.last_page }}</span>
          <button class="rounded-md border px-3 py-1 disabled:opacity-50" :disabled="!hasNextPage" @click="setPage(meta.current_page + 1)">Next</button>
        </div>
      </div>
    </div>
  </div>
</template>
