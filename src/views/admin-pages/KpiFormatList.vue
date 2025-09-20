<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useMonthlyAssessmentCriteriaStore } from '@/stores/monthly-assessment-criteria'
import { storeToRefs } from 'pinia'
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const store = useMonthlyAssessmentCriteriaStore()

const { items, meta, isLoading, error, hasNextPage, hasPrevPage } = storeToRefs(store)

// ----- UI filters (sync with URL) -----
const q = ref(route.query.q ?? '')
const is_active = ref(route.query.is_active ?? '')          // '' | '0' | '1'
const sort_by = ref(route.query.sort_by ?? 'created_at')
const sort_dir = ref(route.query.sort_dir ?? 'desc')
const per_page = ref(Number(route.query.per_page ?? 15))
const page = ref(Number(route.query.page ?? 1))

// Debounce helper
let t = null
function debouncedFetch() {
  if (t) clearTimeout(t)
  t = setTimeout(() => fetchList(), 300)
}

// Fetch + sync URL
async function fetchList(extra = {}) {
  const params = {
    q: q.value || '',
    sort_by: sort_by.value,
    sort_dir: sort_dir.value,
    per_page: per_page.value,
    page: page.value,
    ...extra,
  }
  await store.fetchList(params)

  // sync URL (omit defaults/empties)
  router.replace({
    query: {
      q: q.value || undefined,
      sort_by: sort_by.value !== 'created_at' ? sort_by.value : undefined,
      sort_dir: sort_dir.value !== 'desc' ? sort_dir.value : undefined,
      per_page: per_page.value !== 15 ? String(per_page.value) : undefined,
      page: store.meta.current_page > 1 ? String(store.meta.current_page) : undefined,
    },
  })
  page.value = store.meta.current_page
}

onMounted(() => fetchList())

// Actions
function goBack() {
  router.go(-1)
}

function toggleSort(column) {
  if (sort_by.value === column) {
    sort_dir.value = sort_dir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sort_by.value = column
    sort_dir.value = 'asc'
  }
  fetchList({ page: 1 })
}

function formatDate(s) {
  if (!s) return ''
  const d = new Date(s)
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

async function confirmDelete(row) {
  const ok = window.confirm(`Delete "${row.name}"?`)
  if (!ok) return
  await store.deleteCriteria(row.id)
  // store handles previous-page refill if page emptied; still refresh to be safe
  await fetchList()
}

function setPage(p) {
  page.value = Number(p)
  fetchList({ page: page.value })
}
</script>

<template>
  <div class="space-y-4 px-4 max-w-7xl mx-auto my-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Monthly Assessment Criteria</h1>

      <RouterLink :to="{ name: 'KpiMonthlyAdd' }" class="btn-2">
        <span class="hidden md:flex">Add New</span>
        <i class="far fa-plus"></i>
      </RouterLink>
    </div>

    <!-- Filters -->
    <div class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="grid gap-3 md:grid-cols-12 items-end">
        <div class="md:col-span-4">
          <label class="block text-sm font-medium text-gray-700">Search</label>
          <input
            v-model="q"
            @input="debouncedFetch"
            type="text"
            placeholder="Search by title/description…"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700">Status</label>
          <select
            v-model="is_active"
            @change="fetchList({ page: 1 })"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">All</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700">Per Page</label>
          <select
            v-model.number="per_page"
            @change="fetchList({ page: 1 })"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            <option :value="10">10</option>
            <option :value="15">15</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700">Sort By</label>
          <select
            v-model="sort_by"
            @change="fetchList({ page: 1 })"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            <option value="created_at">Created</option>
            <option value="updated_at">Updated</option>
          </select>
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700">Direction</label>
          <select
            v-model="sort_dir"
            @change="fetchList({ page: 1 })"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loader -->
    <div v-if="isLoading" class="py-8 text-center">
      <LoaderView />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
      {{ error }}
    </div>

    <!-- Empty -->
    <div v-else-if="items.length === 0" class="rounded-xl border bg-white p-8 text-center text-gray-600">
      No criteria found.
      <RouterLink :to="{ name: 'KpiMonthlyAdd' }" class="ml-2 text-indigo-600 underline">Create one</RouterLink>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto rounded-xl border bg-white shadow-sm">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="bg-gray-100 text-left text-gray-700">
            <th class="px-3 py-2 w-12">#</th>
            <th class="px-3 py-2 cursor-pointer" @click="toggleSort('name')">
              Title
              <i v-if="sort_by==='name'" :class="sort_dir==='asc' ? 'far fa-arrow-up' : 'far fa-arrow-down'"></i>
            </th>
            <th class="px-3 py-2 w-28">Status</th>
            <th class="px-3 py-2 cursor-pointer w-48" @click="toggleSort('updated_at')">
              Updated
              <i v-if="sort_by==='updated_at'" :class="sort_dir==='asc' ? 'far fa-arrow-up' : 'far fa-arrow-down'"></i>
            </th>
            <th class="px-3 py-2 w-28 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in items"
            :key="row.id"
            class="border-t hover:bg-gray-50"
          >
            <td class="px-3 py-2 align-top">{{ (meta.current_page - 1) * meta.per_page + idx + 1 }}</td>
            <td class="px-3 py-2">
              <div class="font-medium text-gray-900">{{ row.name }}</div>
              <div v-if="row.description" class="mt-0.5 line-clamp-6 text-gray-500">
                <p v-html="row.description"></p>
              </div>
            </td>
            <td class="px-3 py-2">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="row.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'"
              >
                {{ row.is_active ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="px-3 py-2">{{ formatDate(row.updated_at || row.created_at) }}</td>
            <td class="px-3 py-2 text-right">
              <div class="inline-flex gap-1">
                <RouterLink
                  :to="{ name: 'KpiMonthlyEdit', params: { id: row.id } }"
                  class="btn-icon"
                  title="Edit"
                >
                  <i class="far fa-edit"></i>
                </RouterLink>
                <button class="btn-icon text-red-600 hover:text-red-700" @click="confirmDelete(row)" title="Delete">
                  <i class="far fa-trash-alt"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Footer: Pagination -->
      <div class="flex items-center justify-between gap-3 border-t px-3 py-2 text-sm">
        <div class="text-gray-600">
          Showing
          <span class="font-medium">{{ (meta.current_page - 1) * meta.per_page + 1 }}</span>
          –
          <span class="font-medium">
            {{ Math.min(meta.current_page * meta.per_page, meta.total) }}
          </span>
          of <span class="font-medium">{{ meta.total }}</span>
        </div>

        <div class="flex items-center gap-1">
          <button
            class="rounded-md border px-3 py-1 disabled:opacity-50"
            :disabled="!hasPrevPage"
            @click="setPage(meta.current_page - 1)"
          >
            Prev
          </button>
          <span class="px-2">Page {{ meta.current_page }} / {{ meta.last_page }}</span>
          <button
            class="rounded-md border px-3 py-1 disabled:opacity-50"
            :disabled="!hasNextPage"
            @click="setPage(meta.current_page + 1)"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
