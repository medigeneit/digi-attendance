<script setup>
import { useNoticeStore } from '@/stores/notice'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const noticeStore = useNoticeStore()

function debounce(func, wait = 300) {
  let timeout
  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      func.apply(this, args)
    }, wait)
  }
}

const props = defineProps({
  noticeId: {
    type: [String, Number],
    required: true,
  },
})

const searchQuery = ref('')
const currentPage = ref(1)
const perPage = ref(20)
const isLoading = ref(false)
const isExporting = ref(false)
const selectedCompany = ref('all')
const selectedDepartment = ref('all')
const startDate = ref('')
const endDate = ref('')
const showOnlyWithComments = ref(false)
const perPageOptions = Object.freeze([10, 20, 50, 100])

const { feedbacks,notice, totalFeedbacks } = storeToRefs(noticeStore)

const noticeId = computed(() => route?.params?.id ?? props.noticeId)
const hasSearchValue = computed(() => searchQuery.value.trim().length > 0)
const serialOffset = computed(() => (currentPage.value - 1) * perPage.value)

const availableCompanies = computed(() => {
  const uniq = new Set()
  feedbacks.value.forEach((entry) => {
    const name = entry?.company?.name
    if (name) uniq.add(name)
  })
  return Array.from(uniq).sort((a, b) => a.localeCompare(b))
})

const availableDepartments = computed(() => {
  const uniq = new Set()
  feedbacks.value.forEach((entry) => {
    const name = entry?.department?.name
    if (name) uniq.add(name)
  })
  return Array.from(uniq).sort((a, b) => a.localeCompare(b))
})

const visibleFeedbacks = computed(() => feedbacks.value)
const displayedCount = computed(() => visibleFeedbacks.value.length)
const showEmptyState = computed(() => !isLoading.value && !visibleFeedbacks.value.length)

const totalPages = computed(() => {
  const total = Math.ceil((totalFeedbacks.value || 0) / perPage.value)
  return total > 0 ? total : 1
})

const paginationRange = computed(() => {
  const range = []
  const delta = 2
  const start = Math.max(1, currentPage.value - delta)
  const end = Math.min(totalPages.value, currentPage.value + delta)
  for (let i = start; i <= end; i += 1) {
    range.push(i)
  }
  return range
})

const isFirstPage = computed(() => currentPage.value <= 1)
const isLastPage = computed(() => currentPage.value >= totalPages.value)

const activeFilterCount = computed(() => {
  let count = 0
  if (selectedCompany.value !== 'all') count += 1
  if (selectedDepartment.value !== 'all') count += 1
  if (startDate.value) count += 1
  if (endDate.value) count += 1
  if (showOnlyWithComments.value) count += 1
  return count
})
const hasActiveFilters = computed(() => activeFilterCount.value > 0)

const buildQueryParams = () => {
  const params = {
    page: currentPage.value,
    per_page: perPage.value,
  }

  const trimmedSearch = searchQuery.value.trim()
  if (trimmedSearch) {
    params.search = trimmedSearch
  }
  if (selectedCompany.value !== 'all') {
    params.company = selectedCompany.value
  }
  if (selectedDepartment.value !== 'all') {
    params.department = selectedDepartment.value
  }
  if (startDate.value) {
    params.start_date = startDate.value
  }
  if (endDate.value) {
    params.end_date = endDate.value
  }
  if (showOnlyWithComments.value) {
    params.has_feedback = true
  }

  return params
}

const fetchFeedbacks = async (reset = false) => {
  try {
    isLoading.value = true

    if (reset) {
      feedbacks.value = []
      currentPage.value = 1
    }

    await noticeStore.fetchFeedbacks(noticeId.value, {
      params: buildQueryParams(),
    })
  } catch (error) {
    console.error('Error fetching feedbacks:', error)
  } finally {
    isLoading.value = false
  }
}

const formatDate = (timestamp) => {
  if (!timestamp) return '--'
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return '--'
  return parsed.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const normalizeReceivers = (raw) => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  return raw.split(',').map((item) => item.trim()).filter(Boolean)
}

const resolveTypeLabel = (type) => {
  if (Number(type) === 1) return 'General'
  if (Number(type) === 2) return 'Policy'
  return 'Other'
}

const noticeSummary = computed(() => {
  if (!notice.value || !notice.value.id) return null
  return {
    title: notice.value.title,
    type: notice.value.type ? resolveTypeLabel(notice.value.type) : 'Notice',
    receivers:
      notice.value.receiver_label && !Array.isArray(notice.value.receiver_type)
        ? normalizeReceivers(notice.value.receiver_label)
        : normalizeReceivers(notice.value.receiver_type),
    companies: notice.value.companies_notice ?? [],
    departments: notice.value.departments ?? [],
    publishedAt: notice.value.published_at,
    expiredAt: notice.value.expired_at,
    feedbackCount: notice.value.user_feedback_count ?? totalFeedbacks.value,
  }
})

watch(noticeId, (id) => {
  if (id) {
    noticeStore.fetchNotice(id)
  }
}, { immediate: true })

const clearSearch = () => {
  if (!searchQuery.value) return
  searchQuery.value = ''
  fetchFeedbacks(true)
}

const goToPage = (page) => {
  const nextPage = Math.min(Math.max(1, page), totalPages.value)
  if (nextPage === currentPage.value) return
  currentPage.value = nextPage
  fetchFeedbacks()
}

const changePage = (direction) => {
  goToPage(currentPage.value + direction)
}

const clearFilters = () => {
  selectedCompany.value = 'all'
  selectedDepartment.value = 'all'
  startDate.value = ''
  endDate.value = ''
  showOnlyWithComments.value = false
}

const debouncedFetchFeedbacks = debounce(() => {
  fetchFeedbacks(true)
}, 400)

watch(searchQuery, () => {
  debouncedFetchFeedbacks()
})

watch([selectedCompany, selectedDepartment, startDate, endDate, showOnlyWithComments], () => {
  fetchFeedbacks(true)
})

watch(perPage, () => {
  fetchFeedbacks(true)
})

onMounted(() => {
  fetchFeedbacks()
})

const exportToExcel = async () => {
  try {
    isExporting.value = true
    await noticeStore.downloadFeedbackUserExcel(noticeId.value, buildQueryParams())
  } catch (error) {
    console.error('Error exporting feedbacks:', error)
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">

    <section
      v-if="noticeSummary"
      class="mx-auto max-w-7xl rounded-3xl border border-gray-100 bg-white/90 p-6 shadow"
    >
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-widest text-indigo-500">Current notice</p>
          <h2 class="text-xl font-semibold text-gray-900">{{ noticeSummary.title || 'Untitled notice' }}</h2>
          <p class="text-sm text-gray-500">Type: {{ noticeSummary.type }}</p>
        </div>
        <div class="text-sm text-gray-500">
          Feedbacks: <span class="font-semibold text-gray-900">{{ noticeSummary.feedbackCount || 0 }}</span>
        </div>
      </div>

      <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Receivers</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="receiver in noticeSummary.receivers"
              :key="receiver"
              class="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700"
            >
              {{ receiver }}
            </span>
            <span v-if="!noticeSummary.receivers.length" class="text-xs text-gray-400">All employees</span>
          </div>
        </div>

        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Companies</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="company in noticeSummary.companies"
              :key="company.id"
              class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600"
            >
              {{ company.name }}
            </span>
            <span v-if="!noticeSummary.companies.length" class="text-xs text-gray-400">Multiple companies</span>
          </div>
        </div>

        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Departments</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="department in noticeSummary.departments"
              :key="department.id"
              class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600"
            >
              {{ department.name }}
            </span>
            <span v-if="!noticeSummary.departments.length" class="text-xs text-gray-400">All departments</span>
          </div>
        </div>

        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Publish window</p>
          <p class="text-sm text-gray-700">
            {{ formatDate(noticeSummary.publishedAt) }} –
            <span class="text-gray-500">{{ formatDate(noticeSummary.expiredAt) }}</span>
          </p>
        </div>
      </div>
    </section>

    <!-- Filters -->
    <section class="max-w-7xl mx-auto rounded-3xl border border-gray-100 bg-white/80 p-6 shadow">
      <div class="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-widest text-indigo-500">Smart Filters</p>
          <h4 class="text-lg font-semibold text-gray-900">Refine by metadata & time</h4>
        </div>
        <div>
          <button
          @click="exportToExcel"
          :disabled="isExporting"
          class="group inline-flex items-center justify-center rounded-2xl bg-green-600 px-5 py-3 font-medium text-white shadow-lg shadow-green-200 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <svg
            v-if="!isExporting"
            class="mr-2 h-5 w-5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M8 7V3h8v4m-4 7V5m-5 7 5 5 5-5M4 19h16"
            />
          </svg>
          <svg v-else class="mr-2 h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 0 1 8-8v4l3-3-3-3v4a8 8 0 0 0-8 8h3Z"
            />
          </svg>
          <span>{{ isExporting ? 'Generating…' : 'Export Excel' }}</span>
          </button>
          <button
            v-if="hasActiveFilters"
            @click="clearFilters"
            class="inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200"
          >
            Clear filters ({{ activeFilterCount }})
          </button>
        </div>
      </div>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label class="flex flex-col gap-2 text-sm text-gray-600">
          Company
          <select
            v-model="selectedCompany"
            class="rounded-2xl border border-gray-200 px-4 py-2.5 text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All companies</option>
            <option v-for="company in availableCompanies" :key="company" :value="company">
              {{ company }}
            </option>
          </select>
        </label>
        <label class="flex flex-col gap-2 text-sm text-gray-600">
          Department
          <select
            v-model="selectedDepartment"
            class="rounded-2xl border border-gray-200 px-4 py-2.5 text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All departments</option>
            <option v-for="department in availableDepartments" :key="department" :value="department">
              {{ department }}
            </option>
          </select>
        </label>
        <label class="flex flex-col gap-2 text-sm text-gray-600">
          From date
          <input
            v-model="startDate"
            type="date"
            class="rounded-2xl border border-gray-200 px-4 py-2.5 text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label class="flex flex-col gap-2 text-sm text-gray-600">
          To date
          <input
            v-model="endDate"
            type="date"
            class="rounded-2xl border border-gray-200 px-4 py-2.5 text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>
      <div class="mt-4 flex flex-wrap gap-3">
         <div class="relative flex-1">
          <span
            class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400"
            aria-hidden="true"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m21 21-4.35-4.35M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
              />
            </svg>
          </span>
          <input
            v-model="searchQuery"
            type="search"
            class="w-full rounded-2xl border  bg-white/80 px-10 py-3 text-base shadow-inner outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-200"
            placeholder="Search employees, departments, or companies..."
          />
          <button
            v-if="hasSearchValue"
            @click="clearSearch"
            class="absolute inset-y-0 right-3 flex items-center rounded-full bg-gray-100 px-3 text-xs font-medium text-gray-500 shadow-sm transition hover:bg-gray-200"
          >
            Clear
          </button>
        </div>
        <button
          type="button"
          @click="showOnlyWithComments = !showOnlyWithComments"
          :class="[
            'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
            showOnlyWithComments
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          ]"
        >
          <span
            class="flex h-5 w-5 items-center justify-center rounded-full border"
            :class="showOnlyWithComments ? 'border-white bg-white/20 text-white' : 'border-gray-400 bg-white text-gray-500'"
          >
            <svg
              v-if="showOnlyWithComments"
              class="h-3 w-3"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M16.704 4.153a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06L8.5 11.06l6.97-6.908a.75.75 0 0 1 1.06 0Z"
                clip-rule="evenodd"
              />
            </svg>
          </span>
          Only entries with written feedback
        </button>
      </div>
    </section>

    <!-- Feedback List -->
    <section class="mx-auto max-w-7xl space-y-6 rounded-3xl bg-white p-6 shadow-xl">
      <header class="flex flex-col gap-2 border-b border-gray-100 pb-4 sm:flex-row sm:items-end">
        <div>
          <p class="text-sm font-semibold uppercase tracking-widest text-blue-500">Feedback</p>
          <h3 class="title-md text-2xl font-semibold text-gray-900">Employee Feedbacks</h3>
          <p class="text-sm text-gray-500">
            {{ displayedCount }} of {{ totalFeedbacks }} entries • Updated automatically
          </p>
        </div>
        <div class="sm:ml-auto flex flex-col gap-2 sm:items-end">
          <span
            class="inline-flex items-center justify-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase text-blue-600"
          >
            Live Table
          </span>
          <label class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Rows per page
            <select
              v-model.number="perPage"
              class="rounded-full border border-gray-200 px-3 py-1 text-sm font-medium text-gray-700 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-200"
            >
              <option v-for="size in perPageOptions" :key="size" :value="size">{{ size }}</option>
            </select>
          </label>
        </div>
      </header>

      <div v-if="isLoading" class="space-y-4" role="status" aria-live="polite">
        <div class="h-4 w-1/3 animate-pulse rounded-full bg-gray-100"></div>
        <div class="grid gap-3">
          <div v-for="n in 5" :key="`skeleton-${n}`" class="h-16 animate-pulse rounded-2xl bg-gray-100" />
        </div>
        <p class="text-center text-sm text-gray-400">Fetching the latest feedback…</p>
      </div>

      <div v-else>
        <div
          v-if="visibleFeedbacks.length"
          class="overflow-hidden rounded-3xl border border-gray-100 shadow-sm ring-1 ring-black/5"
        >
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-100 text-left text-sm text-gray-700">
              <thead class="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th scope="col" class="px-6 py-4">#</th>
                  <th scope="col" class="px-6 py-4">User</th>
                  <th scope="col" class="px-6 py-4">Company</th>
                  <th scope="col" class="px-6 py-4">Department</th>
                  <th scope="col" class="px-6 py-4">Feedback</th>
                  <th scope="col" class="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 bg-white">
                <tr
                  v-for="(user, index) in visibleFeedbacks"
                  :key="user.id"
                  class="transition hover:bg-blue-50/60"
                >
                  <td class="px-6 py-4 font-semibold text-gray-900">
                    {{ serialOffset + index + 1 }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <p class="font-medium text-gray-900">{{ user?.name || '--' }}</p>
                    <p class="text-xs text-gray-500">{{ user?.email }}</p>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    {{ user?.company?.name || 'N/A' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    {{ user?.department?.name || 'N/A' }}
                  </td>
                  <td class="px-6 py-4">
                    <p class="text-sm leading-relaxed text-gray-700">
                      {{ user?.feedback?.feedback || 'No feedback submitted.' }}
                    </p>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-gray-600">
                    {{ formatDate(user?.feedback?.submitted_at) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div
          v-else-if="showEmptyState"
          class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center"
        >
          <svg class="mb-4 h-14 w-14 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M7 8h10M7 12h6m3.5 8H7a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4h6l6 6v6"
            />
          </svg>
          <p class="text-lg font-semibold text-gray-700">No feedback yet</p>
          <p class="text-sm text-gray-500">
            Try adjusting your search or check back again after more submissions.
          </p>
        </div>

        <div
          v-if="totalPages > 1"
          class="flex flex-col gap-4 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="text-sm text-gray-500">
            Page {{ currentPage }} of {{ totalPages }} • {{ perPage }} per page
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              @click="changePage(-1)"
              :disabled="isFirstPage || isLoading"
              class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Prev
            </button>
            <button
              v-for="page in paginationRange"
              :key="page"
              @click="goToPage(page)"
              :disabled="page === currentPage"
              :class="[
                'inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold transition',
                page === currentPage ? 'bg-blue-600 text-white shadow' : 'border border-gray-200 text-gray-600 hover:bg-gray-50',
              ]"
            >
              {{ page }}
            </button>
            <button
              @click="changePage(1)"
              :disabled="isLastPage || isLoading"
              class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
