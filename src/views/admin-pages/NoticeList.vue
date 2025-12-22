<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useNoticeStore } from '@/stores/notice'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const noticeStore = useNoticeStore()
const { notices } = storeToRefs(noticeStore)

onMounted(() => {
  noticeStore.fetchNotices()
})

const goBack = () => router.go(-1)

/* =========================
 * UI State
 * ========================= */
const q = ref('')
const receiverFilter = ref('all')  // normalized key
const typeFilter = ref('all')      // 1/2/all
const showExpired = ref(true)
const sortBy = ref('published_at') // published_at | expired_at | title
const sortDir = ref('desc')        // asc | desc
const perPage = ref(15)
const page = ref(1)

/* Modal */
const previewOpen = ref(false)
const previewNotice = ref(null)
const openPreview = (notice) => {
  previewNotice.value = notice
  previewOpen.value = true
}
const closePreview = () => {
  previewOpen.value = false
  previewNotice.value = null
}

/* =========================
 * Helpers
 * ========================= */
const receiverKey = (value) => (value || '').toLowerCase().trim().replace(/\s+/g, '_')

const receiverDisplay = (value) => {
  if (!value || value === 'all') return 'All employees'
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function parseReceiverType(raw) {
  // raw can be null, "executive", ["executive","support_staff"], or JSON string '["executive", ...]'
  if (raw == null) return ['all']

  // already array
  if (Array.isArray(raw)) {
    const norm = raw.map((x) => receiverKey(String(x))).filter(Boolean)
    return norm.length ? norm : ['all']
  }

  // string
  const s = String(raw).trim()
  if (!s) return ['all']

  // try JSON parse for strings like '["executive","support_staff"]'
  if (s.startsWith('[') && s.endsWith(']')) {
    try {
      const arr = JSON.parse(s)
      if (Array.isArray(arr)) {
        const norm = arr.map((x) => receiverKey(String(x))).filter(Boolean)
        return norm.length ? norm : ['all']
      }
    } catch (e) {
      // fallback
    }
  }

  // normal single value
  return [receiverKey(s)].filter(Boolean).length ? [receiverKey(s)] : ['all']
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric', day: 'numeric' })
}

const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

const stripHtml = (html) => {
  if (!html) return ''
  // simple strip for search/index (UI only)
  return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

const typeBadge = (type) => {
  if (Number(type) === 1) return { label: 'General', classes: 'bg-sky-100 text-sky-700 border-sky-200' }
  if (Number(type) === 2) return { label: 'Policy', classes: 'bg-amber-100 text-amber-700 border-amber-200' }
  return { label: 'Other', classes: 'bg-slate-100 text-slate-700 border-slate-200' }
}

const isExpired = (notice) => {
  const exp = notice?.expired_at
  if (!exp) return false
  const d = new Date(exp)
  if (Number.isNaN(d.getTime())) return false
  return d.getTime() < Date.now()
}

/* =========================
 * Normalize notices for UI
 * ========================= */
const normalizedNotices = computed(() => {
  const arr = Array.isArray(notices.value) ? notices.value : []
    return arr.map((n) => {
      const receivers = parseReceiverType(n?.receiver_type)
      const companies = Array.isArray(n?.companies_notice) ? n.companies_notice : []
      const companyLabel =
        companies.length > 0
          ? companies.map((company) => company.name).join(', ')
          : n?.company?.name || 'Multiple Companies'
      return {
        ...n,
        _companyName: companyLabel,
        _typeMeta: typeBadge(n?.type),
        _receivers: receivers,
        _receiversLabel: receivers.map(receiverDisplay).join(', '),
        _plainDesc: stripHtml(n?.description),
      _expired: isExpired(n),
    }
  })
})

/* Receiver filter options + counts */
const receiverFilters = computed(() => {
  const map = new Map()
  map.set('all', 0)

  normalizedNotices.value.forEach((n) => {
    n._receivers.forEach((k) => {
      map.set(k, (map.get(k) || 0) + 1)
    })
  })

  // "all" count = total notices
  map.set('all', normalizedNotices.value.length)

  // sort by count desc (all first)
  const entries = Array.from(map.entries())
    .sort((a, b) => {
      if (a[0] === 'all') return -1
      if (b[0] === 'all') return 1
      return (b[1] || 0) - (a[1] || 0)
    })

  return entries.map(([key, count]) => ({ key, count }))
})

/* =========================
 * Filtering
 * ========================= */
const filteredNotices = computed(() => {
  const keyword = q.value.trim().toLowerCase()

  return normalizedNotices.value
    .filter((n) => {
      // receiver filter
      if (receiverFilter.value !== 'all') {
        if (!n._receivers.includes(receiverFilter.value)) return false
      }

      // type filter
      if (typeFilter.value !== 'all') {
        if (String(n?.type) !== String(typeFilter.value)) return false
      }

      // expired filter
      if (!showExpired.value && n._expired) return false

      // search
      if (keyword) {
        const hay = [
          n?.title || '',
          n?._companyName || '',
          n?._receiversLabel || '',
          n?._plainDesc || '',
        ].join(' ').toLowerCase()
        if (!hay.includes(keyword)) return false
      }

      return true
    })
})

/* Sorting */
const sortedNotices = computed(() => {
  const arr = [...filteredNotices.value]
  const dir = sortDir.value === 'asc' ? 1 : -1

  const getVal = (n) => {
    if (sortBy.value === 'title') return (n?.title || '').toLowerCase()
    if (sortBy.value === 'expired_at') return new Date(n?.expired_at || 0).getTime()
    // published_at default
    return new Date(n?.published_at || 0).getTime()
  }

  arr.sort((a, b) => {
    const va = getVal(a)
    const vb = getVal(b)
    if (va < vb) return -1 * dir
    if (va > vb) return 1 * dir
    return 0
  })

  return arr
})

/* Pagination */
const total = computed(() => sortedNotices.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / Number(perPage.value || 15))))
const currentPage = computed(() => Math.min(Math.max(1, page.value), totalPages.value))

const paginatedNotices = computed(() => {
  const pp = Number(perPage.value || 15)
  const start = (currentPage.value - 1) * pp
  return sortedNotices.value.slice(start, start + pp)
})

function resetToFirstPage() {
  page.value = 1
}

/* When filters change => reset page */
const filtersKey = computed(() => [
  q.value,
  receiverFilter.value,
  typeFilter.value,
  showExpired.value,
  sortBy.value,
  sortDir.value,
  perPage.value,
].join('|'))

watchEffect(() => {
  // when filtersKey changes => page reset
  filtersKey.value
  resetToFirstPage()
})

/* Stats */
const hasNotices = computed(() => total.value > 0)
</script>

<template>
  <div class="space-y-4 px-4 pb-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="space-y-1">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Notice management</p>
        <h1 class="text-2xl font-semibold text-slate-900">Notice List</h1>
        <p class="text-sm text-slate-500">
          Search, filter by receiver/type, preview notice, and manage quickly.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <!-- <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
          <p class="text-xs text-slate-500">Showing</p>
          <p class="text-2xl font-semibold text-slate-800">{{ total }}</p>
        </div> -->

        <div class="flex gap-2">
          <button class="btn-3" @click="goBack">
            <i class="far fa-arrow-left"></i>
            <span class="hidden md:flex">Back</span>
          </button>

          <RouterLink :to="{ name: 'NoticeAdd' }" class="btn-2">
            <span class="hidden md:flex">Add New</span>
            <i class="far fa-plus"></i>
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Sticky Filters -->
    <div class="sticky top-14 z-10 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-3 print:hidden">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <!-- Search -->
        <div class="flex-1">
          <div class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <i class="far fa-search text-slate-400"></i>
            <input
              v-model="q"
              type="text"
              placeholder="Search title, company, receivers, description..."
              class="w-full bg-transparent text-sm outline-none"
            />
            <button
              v-if="q"
              type="button"
              class="text-xs font-semibold text-slate-500 hover:text-slate-900"
              @click="q = ''"
            >
              Clear
            </button>
          </div>
        </div>

        <!-- Selects -->
        <div class="flex flex-wrap items-center gap-2">
          <select
            v-model="typeFilter"
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
          >
            <option value="all">All types</option>
            <option value="1">General</option>
            <option value="2">Policy</option>
          </select>

          <select
            v-model="sortBy"
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
          >
            <option value="published_at">Sort: Published</option>
            <option value="expired_at">Sort: Expiry</option>
            <option value="title">Sort: Title</option>
          </select>

          <button
            type="button"
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            @click="sortDir = sortDir === 'asc' ? 'desc' : 'asc'"
            :title="sortDir === 'asc' ? 'Ascending' : 'Descending'"
          >
            <i class="far" :class="sortDir === 'asc' ? 'fa-sort-amount-up' : 'fa-sort-amount-down'"></i>
          </button>

          <label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <input v-model="showExpired" type="checkbox" class="h-4 w-4 accent-sky-600" />
            Show expired
          </label>

          <select
            v-model.number="perPage"
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
          >
            <option :value="10">10</option>
            <option :value="15">15</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </div>
      </div>

      <!-- Receiver chips (scrollable) -->
      <div class="mt-3">
        <div class="flex items-center gap-2">
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Receivers</p>
          <div class="h-px flex-1 bg-slate-100"></div>
        </div>

        <div class="mt-2 flex gap-2 overflow-x-auto pb-1">
          <button
            v-for="opt in receiverFilters"
            :key="opt.key"
            type="button"
            class="shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition"
            :class="opt.key === receiverFilter
              ? 'border-sky-600 bg-sky-600 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'"
            @click="receiverFilter = opt.key"
          >
            {{ receiverDisplay(opt.key) }}
            <span class="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
              {{ opt.count }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Loader -->
    <div v-if="noticeStore.isLoading" class="flex justify-center py-12">
      <LoaderView />
    </div>

    <template v-else>
      <template v-if="!hasNotices">
        <div
          class="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500"
        >
          No notices found for current filters.
        </div>
      </template>

      <template v-else>
        <!-- Mobile Cards -->
        <div class="space-y-3 md:hidden">
          <div
            v-for="n in paginatedNotices"
            :key="'m-'+n.id"
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="text-sm font-semibold text-slate-900 truncate" :title="n.title">
                  {{ n.title || 'Untitled' }}
                </div>
                <div class="mt-1 text-[11px] text-slate-500">
                  {{ n._companyName }} • Published {{ formatDate(n.published_at) }}
                  <span v-if="n.expired_at"> • Expires {{ formatDate(n.expired_at) }}</span>
                </div>
              </div>

              <span
                class="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                :class="n._typeMeta.classes"
              >
                {{ n._typeMeta.label }}
              </span>
            </div>

            <div class="mt-2 flex flex-wrap gap-1">
              <span
                v-for="r in n._receivers"
                :key="n.id+'-'+r"
                class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600"
              >
                {{ receiverDisplay(r) }}
              </span>
            </div>

            <p v-if="n._plainDesc" class="mt-3 text-sm text-slate-600 line-clamp-3">
              {{ n._plainDesc }}
            </p>

            <div class="mt-3 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span v-if="n._expired" class="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                  Expired
                </span>
                <span v-if="n.file" class="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Attachment
                </span>
              </div>

              <div class="flex gap-2">
                <button class="btn-4 gap-2" type="button" @click="openPreview(n)">
                  <i class="far fa-eye"></i>
                  Preview
                </button>

                <RouterLink :to="{ name: 'NoticeEdit', params: { id: n.id } }" class="btn-4 gap-2">
                  <i class="far fa-edit"></i>
                  Edit
                </RouterLink>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop Table -->
        <div class="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table class="min-w-full table-auto divide-y divide-slate-200 text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-widest text-slate-500 sticky top-44 z-50 bg-slate-50">
                <th class="px-4 py-3 font-medium">#</th>
                <th class="px-4 py-3 font-medium">Title</th>
                <!-- <th class="px-4 py-3 font-medium w-36">Company</th> -->
                <th class="px-4 py-3 font-medium">Type</th>
                <th class="px-4 py-3 font-medium">Receivers</th>
                <th class="px-4 py-3 font-medium">Published</th>
                <th class="px-4 py-3 font-medium">Expires</th>
                <th class="px-4 py-3 font-medium text-center">Feedback</th>
                <th class="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="(n, index) in paginatedNotices"
                :key="n.id"
                class="hover:bg-slate-50"
              >
                <td class="px-4 py-3 font-medium text-slate-600">
                  {{ (currentPage - 1) * Number(perPage) + index + 1 }}
                </td>

                <td class="px-4 py-3">
                  <div class="flex items-start gap-2">
                    <div class="min-w-0">
                      <div class="font-semibold text-slate-900 truncate max-w-[22rem]" :title="n.title">
                        {{ n.title || 'Untitled' }}
                      </div>
                      <div class="truncate block max-w-[15rem] mt-1 text-xs" :title="n._companyName">
                        {{ n._companyName }}
                      </div>
                      <div class="mt-0.5 text-[11px] text-slate-500">
                        <span v-if="n._expired" class="mr-2 rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">Expired</span>
                        <span v-if="n.file" class="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">Attachment</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      class="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      @click="openPreview(n)"
                      title="Preview"
                    >
                      <i class="far fa-eye"></i>
                    </button>
                  </div>
                </td>

                <!-- <td class="px-4 py-3 text-slate-700 max-w-xs" :title="n._companyName">
                  <span class="truncate block max-w-[15rem]">
                    {{ n._companyName }}
                  </span>
                </td> -->

                <td class="px-4 py-3">
                  <span class="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold"
                        :class="n._typeMeta.classes">
                    {{ n._typeMeta.label }}
                  </span>
                </td>

                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-1 max-w-[22rem]">
                    <span
                      v-for="r in n._receivers"
                      :key="n.id+'-'+r"
                      class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600"
                    >
                      {{ receiverDisplay(r) }}
                    </span>
                  </div>
                </td>

                <td class="px-4 py-3 text-slate-600">
                  
                  {{ formatDate(n.published_at) }}
                </td>
                <td class="px-4 py-3 text-slate-600">
                  {{ formatDate(n.expired_at) }}
                </td>

                <td class="px-4 py-3 text-center">
                  <RouterLink
                    :to="{ name: 'NoticeFeedbackShow', params: { id: n.id } }"
                    class="btn-4 gap-2"
                  >
                    <i class="far fa-comments"></i>
                    <span>{{ n?.user_feedback_count || 0 }}</span>
                  </RouterLink>
                </td>

                <td class="px-4 py-3 text-center">
                  <div class="flex items-center justify-center gap-2">
                    <RouterLink :to="{ name: 'MyNoticeDetails', params: { id: n.id } }" class="btn-icon" title="View details">
                      <i class="far fa-eye"></i>
                    </RouterLink>
                    <RouterLink :to="{ name: 'NoticeEdit', params: { id: n.id } }" class="btn-icon" title="Edit">
                      <i class="far fa-edit"></i>
                    </RouterLink>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="hasNotices" class="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div class="text-xs text-slate-500">
            Page <b class="text-slate-800">{{ currentPage }}</b> of <b class="text-slate-800">{{ totalPages }}</b>
            • Total <b class="text-slate-800">{{ total }}</b>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              :disabled="currentPage <= 1"
              @click="page = Math.max(1, currentPage - 1)"
            >
              Prev
            </button>

            <button
              type="button"
              class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              :disabled="currentPage >= totalPages"
              @click="page = Math.min(totalPages, currentPage + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </template>
    </template>

    <!-- Preview Modal -->
    <transition name="fade-scale">
      <div
        v-if="previewOpen && previewNotice"
        class="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
        @keydown.escape.window="closePreview"
      >
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="closePreview"></div>

        <div class="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div class="border-b border-slate-200 p-5">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <h3 class="text-lg font-semibold text-slate-900 truncate">
                  {{ previewNotice.title || 'Untitled' }}
                </h3>
                <p class="mt-1 text-xs text-slate-500">
                  {{ previewNotice._companyName }}
                  • Published {{ formatDateTime(previewNotice.published_at) }}
                  <span v-if="previewNotice.expired_at"> • Expires {{ formatDateTime(previewNotice.expired_at) }}</span>
                </p>

                <div class="mt-2 flex flex-wrap gap-2">
                  <span class="rounded-full border px-3 py-1 text-[11px] font-semibold" :class="previewNotice._typeMeta.classes">
                    {{ previewNotice._typeMeta.label }}
                  </span>
                  <span v-if="previewNotice._expired" class="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700">
                    Expired
                  </span>
                  <span v-if="previewNotice.file" class="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                    Attachment available
                  </span>
                </div>

                <div class="mt-2 flex flex-wrap gap-1">
                  <span
                    v-for="r in previewNotice._receivers"
                    :key="'pv-'+previewNotice.id+'-'+r"
                    class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600"
                  >
                    {{ receiverDisplay(r) }}
                  </span>
                </div>
              </div>

              <button
                type="button"
                class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                @click="closePreview"
              >
                Close
              </button>
            </div>
          </div>

          <div class="max-h-[70vh] overflow-y-auto p-5">
            <div v-if="previewNotice.description" class="prose prose-sm max-w-none text-slate-700">
              <!-- NOTE: description contains HTML from DB -->
              <div v-html="previewNotice.description"></div>
            </div>
            <div v-else class="text-sm text-slate-500">No description.</div>

            <div v-if="previewNotice.file" class="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-xs font-semibold text-slate-700">Attachment</div>
              <a
                class="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-900"
                :href="previewNotice.file"
                target="_blank"
                rel="noopener"
              >
                <i class="far fa-paperclip"></i>
                Open file
              </a>
            </div>
          </div>

          <div class="border-t border-slate-200 p-4 flex items-center justify-end gap-2">
            <RouterLink
              :to="{ name: 'MyNoticeDetails', params: { id: previewNotice.id } }"
              class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              @click="closePreview"
            >
              Open details
            </RouterLink>
            <RouterLink
              :to="{ name: 'NoticeEdit', params: { id: previewNotice.id } }"
              class="btn-2"
              @click="closePreview"
            >
              Edit
            </RouterLink>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.985);
}

/* Optional: nicer scrollbars (safe) */
::-webkit-scrollbar { height: 10px; width: 10px; }
::-webkit-scrollbar-thumb { background: rgba(100,116,139,.25); border-radius: 999px; }
</style>
